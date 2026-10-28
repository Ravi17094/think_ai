import { useCallback, useEffect, useMemo, useState } from 'react';

import { toErrorMessage } from './useAsyncResource';
import { useApiClient } from './useApiClient';
import type {
  AuditLogEntry,
  ContentTarget,
  FlagQueueItem,
  FlagQueueRow,
  FlagReport,
  FlagSeverity,
  ModerationPolicy,
  ModerationUser,
  UserPostSummary,
} from '@/types/community';

export type ModerationTab = 'queue' | 'users' | 'audit';

/**
 * Fallback thresholds used only when `GET /moderation/policy` itself fails —
 * mirrors the backend defaults so severity badges still render.
 */
export const DEFAULT_MODERATION_POLICY: ModerationPolicy = {
  autoFlagReports: 1,
  hideReports: 3,
  hideWindowMs: 24 * 60 * 60 * 1000,
  autoHideIsPermanent: false,
  windowLabel: '24h',
};

/** Severity derived from report counts vs the policy thresholds. */
export function deriveSeverity(
  reportCount: number,
  policy: ModerationPolicy
): FlagSeverity {
  if (reportCount >= policy.hideReports) {
    return 'high';
  }
  if (reportCount >= policy.autoFlagReports) {
    return 'medium';
  }
  return 'low';
}

/** Joins the flagged queue with its reports and the derived severity. */
export function buildFlagRows(
  queue: FlagQueueItem[],
  reports: FlagReport[],
  policy: ModerationPolicy
): FlagQueueRow[] {
  return queue.map((item) => {
    const matched = reports.filter(
      (report) => report.contentId === item.id && report.contentType === item.type
    );
    return {
      ...item,
      reportCount: matched.length,
      reports: matched,
      severity: deriveSeverity(matched.length, policy),
    };
  });
}

/**
 * Page 9 — Moderation Dashboard data source.
 *
 * Loads the flagged queue, reports, policy, users and audit log together and
 * owns every moderation mutation: hide/show, soft delete, dismiss flag and
 * the warn/ban/unban user actions.
 */
export function useModeration() {
  const client = useApiClient();

  const [queue, setQueue] = useState<FlagQueueItem[]>([]);
  const [reports, setReports] = useState<FlagReport[]>([]);
  const [policy, setPolicy] = useState<ModerationPolicy>(DEFAULT_MODERATION_POLICY);
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const [tab, setTab] = useState<ModerationTab>('queue');
  const [userQuery, setUserQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<UserPostSummary[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [arePostsLoading, setArePostsLoading] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setError(null);
      }
      try {
        const [nextQueue, nextReports, nextPolicy, nextUsers, nextAudit] =
          await Promise.all([
            client.fetchFlaggedQueue(),
            client.fetchFlagReports(),
            client.fetchModerationPolicy(),
            client.fetchModerationUsers(),
            client.fetchAuditLog(),
          ]);
        setQueue(nextQueue);
        setReports(nextReports);
        setPolicy(nextPolicy ?? DEFAULT_MODERATION_POLICY);
        setUsers(nextUsers);
        setAudit(nextAudit);
        setError(null);
      } catch (cause) {
        setError(toErrorMessage(cause));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [client]
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const refresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  const rows = useMemo(
    () => buildFlagRows(queue, reports, policy),
    [queue, reports, policy]
  );

  const filteredUsers = useMemo(() => {
    const needle = userQuery.trim().toLowerCase();
    if (needle === '') {
      return users;
    }
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        user.username.toLowerCase().includes(needle) ||
        (user.email ?? '').toLowerCase().includes(needle)
    );
  }, [userQuery, users]);

  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? null;

  /** Optimistic hide/show with rollback when the PATCH fails. */
  const setVisibility = useCallback(
    async (target: ContentTarget, hidden: boolean): Promise<boolean> => {
      const snapshot = queue;
      setQueue((prev) =>
        prev.map((item) =>
          item.id === target.id && item.type === target.type
            ? { ...item, hidden }
            : item
        )
      );
      setIsActing(true);
      setActionError(null);
      try {
        await client.setManagedContentVisibility(target, hidden);
        void load('refresh');
        return true;
      } catch (cause) {
        setQueue(snapshot);
        setActionError(toErrorMessage(cause));
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [client, load, queue]
  );

  /** Resolves the flag (keeps content) and drops the row from the queue. */
  const dismissFlag = useCallback(
    async (target: ContentTarget): Promise<boolean> => {
      setIsActing(true);
      setActionError(null);
      try {
        await client.dismissFlag(target);
        setQueue((prev) =>
          prev.filter(
            (item) => !(item.id === target.id && item.type === target.type)
          )
        );
        void load('refresh');
        return true;
      } catch (cause) {
        setActionError(toErrorMessage(cause));
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [client, load]
  );

  /** Soft delete — hide + resolve composite (see TEST_REPORT decision). */
  const deleteContent = useCallback(
    async (target: ContentTarget): Promise<boolean> => {
      setIsActing(true);
      setActionError(null);
      try {
        await client.deleteManagedContent(target);
        setQueue((prev) =>
          prev.filter(
            (item) => !(item.id === target.id && item.type === target.type)
          )
        );
        void load('refresh');
        return true;
      } catch (cause) {
        setActionError(toErrorMessage(cause));
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [client, load]
  );

  /** Warn / ban / unban — updates the user list from the server response. */
  const moderateUser = useCallback(
    async (
      action: 'warn' | 'ban' | 'unban',
      userId: string
    ): Promise<boolean> => {
      setIsActing(true);
      setActionError(null);
      try {
        const updated =
          action === 'warn'
            ? await client.warnModerationUser(userId)
            : action === 'ban'
              ? await client.banModerationUser(userId)
              : await client.unbanModerationUser(userId);
        setUsers((prev) =>
          prev.map((user) => (user.id === updated.id ? updated : user))
        );
        void load('refresh');
        return true;
      } catch (cause) {
        setActionError(toErrorMessage(cause));
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [client, load]
  );

  const selectUser = useCallback(
    async (userId: string | null) => {
      setSelectedUserId(userId);
      setPosts([]);
      setPostsError(null);
      const user = users.find((entry) => entry.id === userId);
      if (!user) {
        return;
      }
      setArePostsLoading(true);
      try {
        setPosts(await client.fetchUserPosts(user.username));
      } catch (cause) {
        setPostsError(toErrorMessage(cause));
      } finally {
        setArePostsLoading(false);
      }
    },
    [client, users]
  );

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    tab,
    setTab,
    rows,
    reports,
    policy,
    audit,
    users: filteredUsers,
    allUserCount: users.length,
    userQuery,
    setUserQuery,
    selectedUser,
    posts,
    postsError,
    arePostsLoading,
    isLoading,
    isRefreshing,
    hasError: error !== null,
    error,
    actionError,
    isActing,
    load,
    refresh,
    setVisibility,
    dismissFlag,
    deleteContent,
    moderateUser,
    selectUser,
    clearActionError,
  };
}

export default useModeration;

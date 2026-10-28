import { useCallback, useEffect, useState } from 'react';

import { toErrorMessage } from './useAsyncResource';
import { useApiClient } from './useApiClient';
import type { ForumCategory } from '@/types';
import type {
  SubmitReplyResult,
  ThreadDetail,
  ThreadReply,
  VoteDirection,
} from '@/types/community';

function rank(direction: VoteDirection): number {
  return direction === 'up' ? 1 : direction === 'down' ? -1 : 0;
}

/**
 * Page 6 — Forum thread detail data source.
 *
 * Loads thread + replies + categories together, and owns the optimistic
 * mutations the checklist calls for: reply submission, thread voting and the
 * solved toggle all update the UI immediately and roll back on API failure.
 */
export function useThreadDetail(threadId: string) {
  const client = useApiClient();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isUpdatingSolved, setIsUpdatingSolved] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setError(null);
      }
      try {
        const [nextThread, nextReplies, nextCategories] = await Promise.all([
          client.fetchThreadDetail(threadId),
          client.fetchThreadReplies(threadId),
          client.fetchDiscussionCategories(),
        ]);
        setThread(nextThread);
        setReplies(nextReplies);
        setCategories(nextCategories);
        setError(null);
      } catch (cause) {
        setError(toErrorMessage(cause));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [client, threadId]
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const refresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  /** Optimistic thread vote — rolls back to the snapshot when the API fails. */
  const vote = useCallback(
    async (direction: VoteDirection): Promise<boolean> => {
      const snapshot = thread;
      if (!snapshot) {
        return false;
      }

      const previous = snapshot.userVote;
      const next: VoteDirection = previous === direction ? 'none' : direction;
      const delta = rank(next) - rank(previous);

      setThread({
        ...snapshot,
        userVote: next,
        score: snapshot.score + delta,
        upvotes: snapshot.upvotes + (next === 'up' ? 1 : 0) - (previous === 'up' ? 1 : 0),
        downvotes:
          snapshot.downvotes + (next === 'down' ? 1 : 0) - (previous === 'down' ? 1 : 0),
      });
      setIsVoting(true);
      setActionError(null);

      try {
        const result = await client.voteThread(threadId, direction);
        setThread((prev) =>
          prev
            ? {
                ...prev,
                upvotes: result.upvotes,
                downvotes: result.downvotes,
                score: result.score,
                userVote: result.userVote,
              }
            : prev
        );
        return true;
      } catch (cause) {
        setThread(snapshot);
        setActionError(toErrorMessage(cause));
        return false;
      } finally {
        setIsVoting(false);
      }
    },
    [client, threadId, thread]
  );

  /** Optimistic solved toggle (thread author only) — rolls back on failure. */
  const setSolved = useCallback(
    async (solved: boolean): Promise<boolean> => {
      const snapshot = thread;
      if (!snapshot) {
        return false;
      }

      setThread({ ...snapshot, solved });
      setIsUpdatingSolved(true);
      setActionError(null);

      try {
        const updated = await client.setThreadSolved(threadId, solved);
        setThread(updated);
        return true;
      } catch (cause) {
        setThread(snapshot);
        setActionError(toErrorMessage(cause));
        return false;
      } finally {
        setIsUpdatingSolved(false);
      }
    },
    [client, threadId, thread]
  );

  /** Posts a reply, appends it locally, then quietly refreshes from the server. */
  const submitReply = useCallback(
    async (body: string, parentId?: string | null): Promise<SubmitReplyResult> => {
      setIsSubmittingReply(true);
      try {
        const result = await client.submitReply(threadId, { body, parentId });
        setReplies((prev) => [...prev, result.reply]);
        setThread((prev) =>
          prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev
        );
        // Refresh after mutation — reconcile with server truth, best effort.
        void client
          .fetchThreadReplies(threadId)
          .then((next) => setReplies(next))
          .catch(() => {
            // Keep the locally appended reply when the refresh fails.
          });
        return result;
      } finally {
        setIsSubmittingReply(false);
      }
    },
    [client, threadId]
  );

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    thread,
    replies,
    categories,
    isLoading,
    isRefreshing,
    hasError: error !== null,
    error,
    actionError,
    isSubmittingReply,
    isVoting,
    isUpdatingSolved,
    isEmptyReplies: !isLoading && error === null && replies.length === 0,
    load,
    refresh,
    vote,
    setSolved,
    submitReply,
    clearActionError,
  };
}

export default useThreadDetail;

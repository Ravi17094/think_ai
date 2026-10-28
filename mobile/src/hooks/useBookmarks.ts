import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api/http';
import { subscribeToSession } from '@/api/session';
import {
  enqueueBookmarkAction,
  getQueuedBookmarkActions,
  syncQueuedBookmarkActions,
  type BookmarkActionType,
} from '@/offline/bookmarkQueue';
import { toErrorMessage } from './useAsyncResource';
import { useApiClient } from './useApiClient';
import { useConnectivity } from './useConnectivity';
import { useSession } from './useSession';
import type { BookmarkRecord } from '@/types/community';

/**
 * Page 8 — Bookmarks data source.
 *
 * Loads the signed-in user's bookmark list plus the `syncedAt` stamp the
 * backend returns for the sync indicator, keeps the list in step with
 * sign-in / sign-out events, and removes bookmarks optimistically with a
 * rollback when `DELETE /bookmarks/:userId/:discussionId` fails.
 *
 * Offline module: add/remove actions made while offline are queued in
 * AsyncStorage and replayed automatically once connectivity returns.
 */
export function useBookmarks() {
  const client = useApiClient();
  const session = useSession();
  const { isOnline } = useConnectivity();

  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadedForUser = useRef<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const queued = await getQueuedBookmarkActions();
    setPendingCount(queued.length);
  }, []);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setError(null);
      }
      try {
        const page = await client.fetchBookmarks();
        setBookmarks(page.bookmarks);
        setSyncedAt(page.syncedAt);
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

  // Initial load, then re-sync whenever the signed-in user changes.
  useEffect(() => {
    if (loadedForUser.current === session.userId) {
      return;
    }
    const isFirstLoad = loadedForUser.current === null;
    loadedForUser.current = session.userId;
    void load(isFirstLoad ? 'initial' : 'refresh');
  }, [load, session.userId]);

  // Belt-and-braces: explicit session events (sign-in/out mid-lifetime).
  useEffect(() => {
    return subscribeToSession((next) => {
      if (loadedForUser.current !== next.userId) {
        loadedForUser.current = next.userId;
        void load('refresh');
      }
    });
  }, [load]);

  // Surface any actions persisted from a previous session.
  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  // Flush the queue when connectivity returns (or on mount while online).
  const previousOnline = useRef<boolean | null>(null);
  useEffect(() => {
    const previous = previousOnline.current;
    previousOnline.current = isOnline;
    if (!isOnline || previous === true) {
      return;
    }
    void (async () => {
      const queued = await getQueuedBookmarkActions();
      if (queued.length === 0) {
        setPendingCount(0);
        return;
      }
      setIsSyncing(true);
      try {
        const result = await syncQueuedBookmarkActions(client);
        setPendingCount(result.remaining.length);
        if (result.synced > 0) {
          void load('refresh');
        }
      } finally {
        setIsSyncing(false);
      }
    })();
  }, [client, isOnline, load]);

  const enqueue = useCallback(
    async (type: BookmarkActionType, discussionId: string) => {
      await enqueueBookmarkAction({
        type,
        userId: session.userId,
        discussionId,
      });
      await refreshPendingCount();
    },
    [refreshPendingCount, session.userId]
  );

  /** Adds a bookmark, queueing the action when offline. */
  const addBookmark = useCallback(
    async (discussionId: string): Promise<boolean> => {
      if (!isOnline) {
        await enqueue('add', discussionId);
        return true;
      }
      setError(null);
      try {
        await client.addBookmark(session.userId, discussionId);
        return true;
      } catch (cause) {
        if (isConnectivityError(cause)) {
          await enqueue('add', discussionId);
          return true;
        }
        setError(toErrorMessage(cause));
        return false;
      }
    },
    [client, enqueue, isOnline, session.userId]
  );

  /**
   * Optimistic removal — restores the row if the DELETE call fails while
   * online, or queues the removal locally when offline.
   */
  const removeBookmark = useCallback(
    async (discussionId: string): Promise<boolean> => {
      const snapshot = bookmarks;
      setBookmarks((prev) =>
        prev.filter((record) => record.discussionId !== discussionId)
      );
      setError(null);

      if (!isOnline) {
        await enqueue('remove', discussionId);
        return true;
      }

      setIsRemovingId(discussionId);
      try {
        await client.removeBookmark(session.userId, discussionId);
        return true;
      } catch (cause) {
        if (isConnectivityError(cause)) {
          await enqueue('remove', discussionId);
          return true;
        }
        setBookmarks(snapshot);
        setError(toErrorMessage(cause));
        return false;
      } finally {
        setIsRemovingId(null);
      }
    },
    [bookmarks, client, enqueue, isOnline, session.userId]
  );

  const refresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  return {
    bookmarks,
    syncedAt,
    isLoading,
    isRefreshing,
    hasError: error !== null,
    error,
    isRemovingId,
    pendingCount,
    isSyncing,
    isOffline: !isOnline,
    isEmpty: !isLoading && error === null && bookmarks.length === 0,
    load,
    refresh,
    addBookmark,
    removeBookmark,
  };
}

/** A status-0 `ApiError` is the transport's "network unreachable" signal. */
function isConnectivityError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

export default useBookmarks;

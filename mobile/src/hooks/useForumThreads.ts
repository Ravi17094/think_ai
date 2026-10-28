import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useApiClient } from './useApiClient';
import { toErrorMessage } from './useAsyncResource';
import { useConnectivity } from './useConnectivity';
import { readThreadCache, writeThreadCache } from '@/offline/threadCache';
import { FORUM_PAGE_SIZE, INFINITE_SCROLL_THRESHOLD } from '@/theme/tokens';
import type {
  CreateThreadInput,
  ForumCategory,
  ForumThread,
  ForumSort,
} from '@/types';

export interface UseForumThreadsOptions {
  pageSize?: number;
  /** 0–1 fraction of the list that triggers the next page. Spec: 0.8. */
  threshold?: number;
}

export interface ForumFilters {
  categoryId: string | null;
  tags: string[];
  sort: ForumSort;
}

/**
 * Page 5 — Forum Home data source.
 *
 * Owns pagination, the category/tag/sort filter state and the
 * "next page is requested when the user has scrolled past the threshold"
 * decision. The screen only reports how much of the list is visible.
 */
export function useForumThreads(options: UseForumThreadsOptions = {}) {
  const {
    pageSize = FORUM_PAGE_SIZE,
    threshold = INFINITE_SCROLL_THRESHOLD,
  } = options;

  const client = useApiClient();
  const { isOffline } = useConnectivity();

  const [threads, setThreads] = useState<ForumThread[]>([]);
  // True while the visible threads came from the offline cache, not the API.
  const [isFromCache, setIsFromCache] = useState(false);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<ForumFilters>({
    categoryId: null,
    tags: [],
    sort: 'newest',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by refresh()/createThread(). `setPage(1)` alone is a no-op when the
  // list already sits on page 1, so this nonce is what actually re-runs the
  // fetch for those two actions.
  const [reloadNonce, setReloadNonce] = useState(0);

  // Guards against duplicate in-flight requests from rapid scroll events.
  const isFetchingRef = useRef(false);

  const setCategoryId = useCallback((categoryId: string | null) => {
    setFilters((prev) => ({ ...prev, categoryId }));
  }, []);

  const setTags = useCallback((tags: string[]) => {
    setFilters((prev) => ({ ...prev, tags }));
  }, []);

  const setSort = useCallback((sort: ForumSort) => {
    setFilters((prev) => ({ ...prev, sort }));
  }, []);

  // Load reference data (categories + tag taxonomy) once.
  useEffect(() => {
    let active = true;
    void Promise.all([client.fetchForumCategories(), client.fetchAllTags()])
      .then(([nextCategories, nextTags]) => {
        if (active) {
          setCategories(nextCategories);
          setAvailableTags(nextTags);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(toErrorMessage(cause));
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  // Any filter change resets to page 1.
  const filterKey = useMemo(
    () => `${filters.categoryId ?? 'all'}|${filters.sort}|${[...filters.tags].sort().join(',')}`,
    [filters]
  );

  useEffect(() => {
    setPage(1);
    setThreads([]);
    setHasMore(false);
  }, [filterKey]);

  // Fetch the current page whenever page or filters change.
  useEffect(() => {
    let active = true;
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    client
      .fetchForumThreads({
        page,
        pageSize,
        categoryId: filters.categoryId,
        tags: filters.tags,
        sort: filters.sort,
      })
      .then((result) => {
        if (!active) {
          return;
        }
        setThreads((prev) =>
          page === 1 ? result.threads : dedupe([...prev, ...result.threads])
        );
        setTotal(result.total);
        setHasMore(result.hasMore);
        setIsFromCache(false);
        // Page 1 is the offline snapshot: keep it fresh for the 15-minute TTL.
        if (page === 1) {
          void writeThreadCache(result.threads);
        }
        setIsLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
      })
      .catch(async (cause: unknown) => {
        if (!active) {
          return;
        }
        // Offline read mode: fall back to the cached first page when the live
        // request fails and the cache is still within its TTL.
        if (page === 1) {
          const cached = await readThreadCache();
          if (!active) {
            return;
          }
          if (cached) {
            setThreads(cached.threads);
            setTotal(cached.threads.length);
            setHasMore(false);
            setIsFromCache(true);
            setError(null);
            setIsLoading(false);
            setIsRefreshing(false);
            isFetchingRef.current = false;
            return;
          }
        }
        setError(toErrorMessage(cause));
        setIsLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [client, page, pageSize, filters.categoryId, filters.sort, filters.tags, reloadNonce]);

  const loadMore = useCallback(() => {
    if (isFetchingRef.current || !hasMore) {
      return;
    }
    // Claim the slot synchronously. The fetch effect only flips this ref after
    // React re-renders, so without this several scroll events landing in the
    // same tick would each queue their own page increment.
    isFetchingRef.current = true;
    setPage((current) => current + 1);
  }, [hasMore]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setThreads([]);
    setHasMore(false);
    setPage(1);
    setReloadNonce((nonce) => nonce + 1);
  }, []);

  /**
   * `visibleRatio` is how much of the list is currently on screen.
   * Once it crosses `threshold` (80%) the next page is requested.
   */
  const onScrollProgress = useCallback(
    (visibleRatio: number) => {
      if (shouldLoadNextPage(visibleRatio, threshold)) {
        loadMore();
      }
    },
    [loadMore, threshold]
  );

  const createThread = useCallback(
    async (input: CreateThreadInput) => {
      const { id } = await client.createThread(input);
      setThreads([]);
      setHasMore(false);
      setPage(1);
      setReloadNonce((nonce) => nonce + 1);
      return id;
    },
    [client]
  );

  return {
    threads,
    categories,
    availableTags,
    filters,
    page,
    total,
    hasMore,
    isLoading,
    isRefreshing,
    hasError: error !== null,
    error,
    isEmpty: !isLoading && error === null && threads.length === 0,
    isOffline,
    isFromCache,
    threshold,
    setCategoryId,
    setTags,
    setSort,
    loadMore,
    refresh,
    onScrollProgress,
    createThread,
  };
}

/**
 * Pure pagination policy: the next page is requested once this fraction of the
 * list is visible. Extracted so the 80% rule is unit-testable without a list.
 */
export function shouldLoadNextPage(
  visibleRatio: number,
  threshold = INFINITE_SCROLL_THRESHOLD
): boolean {
  return visibleRatio >= threshold;
}

function dedupe(threads: ForumThread[]): ForumThread[] {
  const seen = new Set<string>();
  const result: ForumThread[] = [];
  for (const thread of threads) {
    if (!seen.has(thread.id)) {
      seen.add(thread.id);
      result.push(thread);
    }
  }
  return result;
}

export default useForumThreads;

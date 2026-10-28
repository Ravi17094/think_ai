import { useCallback, useEffect, useState } from 'react';

import { Thread, ThreadsPage } from '../types';

export function useForumThreadsOptimized(pageSize = 50) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setIsLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/forum/threads?page=${nextPage}&limit=${pageSize}`);
        const json: ThreadsPage = await res.json();
        const newThreads = json.threads || [];
        setThreads((prev) => {
          if (!append) return newThreads;
          const seen = new Set(prev.map((t) => t.id));
          const dedup = newThreads.filter((t) => !seen.has(t.id));
          return [...prev, ...dedup];
        });
        setHasMore(newThreads.length === pageSize && json.hasMore !== false);
        setPage(nextPage);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        if (append) setIsLoadingMore(false);
        else setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || isLoadingMore || !hasMore) return;
    fetchPage(page + 1, true);
  }, [loading, isLoadingMore, hasMore, page, fetchPage]);

  return {
    threads,
    loading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh: () => fetchPage(1, false),
  };
}

export default useForumThreadsOptimized;

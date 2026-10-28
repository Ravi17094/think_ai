import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiClient } from './useApiClient';
import { toErrorMessage } from './useAsyncResource';
import type { GlobalSearchResponse, SearchResult, SearchResultType } from '@/types';

/** Tabs shown by Global Search, in display order. */
export const SEARCH_RESULT_TABS: readonly SearchResultType[] = [
  'course',
  'lesson',
  'forum',
  'assessment',
];

export const SEARCH_TAB_LABELS: Record<SearchResultType, string> = {
  course: 'Courses',
  lesson: 'Lessons',
  forum: 'Forum',
  assessment: 'Assessments',
};

/**
 * Page 4 — Global Search data source.
 *
 * Takes the already-debounced query. Responses are cached per
 * (query, type) pair so switching tabs re-renders from cache instead of
 * re-fetching, which the spec requires ("tabs switch without unnecessary
 * refetch"). `clearCache` backs pull-to-refresh semantics.
 */
export function useGlobalSearch(debouncedQuery: string) {
  const client = useApiClient();
  const [activeType, setActiveType] = useState<SearchResultType>('course');
  const [activeResults, setActiveResults] = useState<SearchResult[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);
  const [totals, setTotals] = useState<Partial<Record<SearchResultType, number>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef(new Map<string, GlobalSearchResponse>());
  const activeTypeRef = useRef(activeType);
  activeTypeRef.current = activeType;

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (query === '') {
      setActiveResults([]);
      setActiveTotal(0);
      setTotals({});
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    const cacheKey = `${query.toLowerCase()}:${activeType}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      // Cache hit — no request issued.
      setActiveResults(cached.results[activeType]);
      setActiveTotal(cached.totals[activeType]);
      setTotals(cached.totals);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    client
      .searchGlobal(query, activeType)
      .then((payload) => {
        cacheRef.current.set(cacheKey, payload);
        if (!active || activeTypeRef.current !== activeType) {
          return;
        }
        setActiveResults(payload.results[activeType]);
        setActiveTotal(payload.totals[activeType]);
        setTotals(payload.totals);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(toErrorMessage(cause));
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [client, debouncedQuery, activeType]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    activeResults,
    activeTotal,
    totals,
    activeType,
    setActiveType,
    isLoading,
    hasError: error !== null,
    error,
    clearCache,
  };
}

export default useGlobalSearch;

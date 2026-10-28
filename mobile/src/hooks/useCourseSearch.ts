import { useCallback, useEffect, useMemo, useState } from 'react';

import { useApiClient } from './useApiClient';
import { toErrorMessage } from './useAsyncResource';
import type { CourseSearchParams, CourseSearchResult } from '@/types';

const EMPTY_RESULT: CourseSearchResult = { courses: [], total: 0 };

/**
 * Page 2 — My Courses data source.
 *
 * Takes the *already debounced* query so the 300 ms window is owned by a single
 * hook (`useDebouncedValue`) and reused verbatim by Global Search.
 */
export function useCourseSearch(params: CourseSearchParams) {
  const client = useApiClient();
  const [result, setResult] = useState<CourseSearchResult>(EMPTY_RESULT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const { query, status } = params;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    client
      .searchCourses({ query, status })
      .then((data) => {
        if (active) {
          setResult(data);
          setIsLoading(false);
        }
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
  }, [client, query, status, reloadToken]);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const isEmpty = !isLoading && error === null && result.courses.length === 0;

  const requestKey = useMemo(
    () => `${status}:${query.trim().toLowerCase()}`,
    [status, query]
  );

  return {
    courses: result.courses,
    total: result.total,
    isLoading,
    error,
    hasError: error !== null,
    isEmpty,
    refresh,
    /** Stable identity that changes only when the effective query changes. */
    requestKey,
  };
}

export default useCourseSearch;

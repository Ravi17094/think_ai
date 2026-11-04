import { useCallback, useEffect, useState } from 'react';

import { useApiClient } from './useApiClient';
import { toErrorMessage } from './useAsyncResource';
import type { Course } from '@/types';

/**
 * Resolves saved course ids into full course payloads for the Wishlist screen.
 * Ids come from the on-device wishlist, so this is the only place that needs to
 * bridge storage and the catalogue API.
 */
export function useWishlistCourses(courseIds: readonly string[]) {
  const client = useApiClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(courseIds.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    if (courseIds.length === 0) {
      setCourses([]);
      setIsLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setError(null);

    Promise.all(courseIds.map((courseId) => client.fetchCourse(courseId)))
      .then((result) => {
        if (active) {
          setCourses(result);
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
  }, [client, courseIds, reloadToken]);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    courses,
    isLoading,
    error,
    hasError: error !== null,
    isEmpty: !isLoading && error === null && courseIds.length === 0,
    refresh,
  };
}

export default useWishlistCourses;

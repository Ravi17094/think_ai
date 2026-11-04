import { useCallback } from 'react';

import { useApiClient } from './useApiClient';
import { useAsyncResource } from './useAsyncResource';
import type { Enrollment, UpdateLessonProgressInput } from '@/types';

/**
 * Page 1 — Learner Dashboard data source.
 *
 * Exposes the loading / error / refreshing / empty state machine plus an
 * imperative `refresh()` for pull-to-refresh, enrollment lookup for the course
 * detail screen, and the two mutations the learner flow needs.
 */
export function useEnrollments() {
  const client = useApiClient();

  const loader = useCallback(() => client.fetchEnrollments(), [client]);
  const resource = useAsyncResource<Enrollment[]>(loader, [], []);
  const { setData } = resource;

  const getEnrollment = useCallback(
    (courseId: string): Enrollment | undefined =>
      resource.data.find((enrollment) => enrollment.courseId === courseId),
    [resource.data]
  );

  const enrollCourse = useCallback(
    async (courseId: string): Promise<Enrollment> => {
      const enrollment = await client.enrollCourse(courseId);
      setData((prev) =>
        prev.some((item) => item.courseId === courseId)
          ? prev.map((item) =>
              item.courseId === courseId ? enrollment : item
            )
          : [...prev, enrollment]
      );
      return enrollment;
    },
    [client, setData]
  );

  const updateLessonProgress = useCallback(
    async (input: UpdateLessonProgressInput): Promise<Enrollment> => {
      const updated = await client.updateLessonProgress(input);
      setData((prev) =>
        prev.map((item) =>
          item.courseId === updated.courseId ? updated : item
        )
      );
      return updated;
    },
    [client, setData]
  );

  return {
    enrollments: resource.data,
    isLoading: resource.status === 'loading',
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    hasError: resource.status === 'error',
    isEmpty: resource.status === 'success' && resource.data.length === 0,
    refresh: resource.refresh,
    reload: resource.reload,
    getEnrollment,
    enrollCourse,
    updateLessonProgress,
  };
}

export default useEnrollments;

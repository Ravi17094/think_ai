import { useCallback, useState } from 'react';

import { useApiClient } from './useApiClient';
import { useAsyncResource } from './useAsyncResource';
import type { Course } from '@/types';

export interface CourseDetailState {
  course: Course | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasError: boolean;
  /** Module targeted by a deep link, e.g. `thinkzai://learner/courses/c-1?module=m-2`. */
  initialModuleId: string | null;
  setInitialModuleId: (moduleId: string | null) => void;
  refresh: () => Promise<void>;
}

/**
 * Page 3 — Course Detail data source.
 *
 * Accepts the raw route `params` object (not just the id) so deep links that
 * carry `courseId` + `moduleId` can auto-expand the requested module.
 */
export function useCourseDetail(
  courseId: string | undefined,
  moduleId?: string
): CourseDetailState {
  const client = useApiClient();
  const [initialModuleId, setInitialModuleId] = useState<string | null>(
    moduleId ?? null
  );

  const loader = useCallback(async () => {
    if (!courseId) {
      throw new Error('This course link is missing a course id.');
    }
    return client.fetchCourse(courseId);
  }, [client, courseId]);

  const resource = useAsyncResource<Course | null>(loader, null, [courseId]);

  return {
    course: resource.data,
    isLoading: resource.status === 'loading',
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    hasError: resource.status === 'error',
    initialModuleId,
    setInitialModuleId,
    refresh: resource.refresh,
  };
}

export default useCourseDetail;

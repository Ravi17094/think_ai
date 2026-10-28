import { useCallback } from 'react';

import { useApiClient } from './useApiClient';
import { useAsyncResource } from './useAsyncResource';
import type { Enrollment } from '@/types';

/**
 * Page 1 — Learner Dashboard data source.
 *
 * Exposes the loading / error / refreshing / empty state machine plus an
 * imperative `refresh()` for pull-to-refresh.
 */
export function useEnrollments() {
  const client = useApiClient();

  const loader = useCallback(() => client.fetchEnrollments(), [client]);
  const resource = useAsyncResource<Enrollment[]>(loader, [], []);

  return {
    enrollments: resource.data,
    isLoading: resource.status === 'loading',
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    hasError: resource.status === 'error',
    isEmpty: resource.status === 'success' && resource.data.length === 0,
    refresh: resource.refresh,
    reload: resource.reload,
  };
}

export default useEnrollments;

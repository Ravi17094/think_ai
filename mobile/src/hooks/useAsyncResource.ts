import { useCallback, useEffect, useRef, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/theme/tokens';
import { toUserMessage } from '@/api/errors';
import type { AsyncState } from '@/types';

export function createInitialAsyncState<T>(data: T): AsyncState<T> {
  return { data, status: 'idle', error: null, isRefreshing: false };
}

export function toErrorMessage(error: unknown): string {
  return toUserMessage(error);
}

/**
 * Debounces a rapidly-changing value. Used by every search field in the app —
 * the spec mandates a 300 ms window for My Courses and Global Search.
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = SEARCH_DEBOUNCE_MS
): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value);
      return undefined;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Wraps a cancellable async loader and exposes the four states every data hook
 * in this app must provide: loading, error, refreshing and success.
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  initialData: T,
  deps: readonly unknown[]
) {
  const [state, setState] = useState<AsyncState<T>>(() =>
    createInitialAsyncState(initialData)
  );

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (isRefresh: boolean) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((prev) => ({
      ...prev,
      status: isRefresh && prev.data !== undefined ? prev.status : 'loading',
      error: null,
      isRefreshing: isRefresh,
    }));

    try {
      const data = await loaderRef.current();
      if (!mountedRef.current || requestIdRef.current !== requestId) {
        return;
      }
      setState({
        data,
        status: 'success',
        error: null,
        isRefreshing: false,
      });
    } catch (error) {
      if (!mountedRef.current || requestIdRef.current !== requestId) {
        return;
      }
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: toErrorMessage(error),
        isRefreshing: false,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = useCallback(() => run(true), [run]);
  const reload = useCallback(() => run(false), [run]);

  return {
    ...state,
    refresh,
    reload,
    setData: useCallback((updater: (prev: T) => T) => {
      setState((prev) => ({ ...prev, data: updater(prev.data) }));
    }, []),
  };
}

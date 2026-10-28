import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createMockApiClient } from '@/api/mockClient';
import { ApiClientProvider } from '@/hooks/useApiClient';
import {
  SEARCH_RESULT_TABS,
  SEARCH_TAB_LABELS,
  useGlobalSearch,
} from '@/hooks/useGlobalSearch';
import type { SearchResultType } from '@/types';
import { PropsWithChildren } from 'react';

function wrapperFor(client: ReturnType<typeof createMockApiClient>) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
  };
}

describe('useGlobalSearch', () => {
  it('exposes the four result tabs in display order', () => {
    expect(SEARCH_RESULT_TABS).toEqual(['course', 'lesson', 'forum', 'assessment']);
    expect(Object.values(SEARCH_TAB_LABELS)).toEqual([
      'Courses',
      'Lessons',
      'Forum',
      'Assessments',
    ]);
  });

  it('stays idle for a blank query without calling the client', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const searchGlobal = jest.spyOn(client, 'searchGlobal');

    const { result } = renderHook(() => useGlobalSearch('   '), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchGlobal).not.toHaveBeenCalled();
    expect(result.current.activeResults).toEqual([]);
    expect(result.current.activeTotal).toBe(0);
  });

  it('defaults to the course tab and reports the trimmed total', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const searchGlobal = jest.spyOn(client, 'searchGlobal');

    const { result } = renderHook(() => useGlobalSearch('  react  '), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeType).toBe('course');
    expect(searchGlobal).toHaveBeenCalledWith('react', 'course');
    expect(result.current.activeTotal).toBe(result.current.activeResults.length);
    expect(
      result.current.activeResults.every((row) => row.type === 'course')
    ).toBe(true);
  });

  it('re-requests for an uncached tab and caches it afterwards', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const searchGlobal = jest.spyOn(client, 'searchGlobal');

    const { result } = renderHook(() => useGlobalSearch('react'), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setActiveType('forum' as SearchResultType);
    });
    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(2));
    expect(searchGlobal).toHaveBeenLastCalledWith('react', 'forum');

    // Switching back to a cached tab must not hit the network again.
    act(() => {
      result.current.setActiveType('course' as SearchResultType);
    });
    await waitFor(() =>
      expect(result.current.activeType).toBe<SearchResultType>('course')
    );
    expect(searchGlobal).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('treats the cache key as case-insensitive', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const searchGlobal = jest.spyOn(client, 'searchGlobal');

    const { rerender } = renderHook(
      ({ query }: { query: string }) => useGlobalSearch(query),
      { wrapper: wrapperFor(client), initialProps: { query: 'react' } }
    );

    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(1));

    rerender({ query: 'React' });
    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(1));

    rerender({ query: 'native' });
    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(2));
  });

  it('re-requests evicted tabs after clearCache', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const searchGlobal = jest.spyOn(client, 'searchGlobal');

    const { result } = renderHook(() => useGlobalSearch('react'), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.clearCache();
      result.current.setActiveType('lesson' as SearchResultType);
    });
    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(2));

    // The Courses entry was evicted, so returning to it must hit the client again.
    act(() => {
      result.current.setActiveType('course' as SearchResultType);
    });
    await waitFor(() => expect(searchGlobal).toHaveBeenCalledTimes(3));
    expect(searchGlobal).toHaveBeenLastCalledWith('react', 'course');
  });

  it('surfaces client errors and clears the loading flag', async () => {
    const client = createMockApiClient({ forceError: 'Search offline' });
    const { result } = renderHook(() => useGlobalSearch('react'), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.error).toBe('Search offline');
    expect(result.current.isLoading).toBe(false);
  });

  it('drops a stale response when the tab changed mid-flight', async () => {
    const client = createMockApiClient({ latencyMs: 50 });
    const { result } = renderHook(() => useGlobalSearch('react'), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      result.current.setActiveType('assessment' as SearchResultType);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.activeType).toBe<SearchResultType>('assessment');
    expect(
      result.current.activeResults.every((row) => row.type === 'assessment')
    ).toBe(true);
  });
});
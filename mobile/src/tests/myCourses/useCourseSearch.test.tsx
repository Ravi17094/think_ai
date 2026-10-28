import { act, renderHook, waitFor } from '@testing-library/react-native';
import { PropsWithChildren } from 'react';

import { ApiClientProvider } from '@/hooks/useApiClient';
import { useCourseSearch } from '@/hooks/useCourseSearch';
import { createMockApiClient } from '@/api/mockClient';
import type { CourseStatusFilter } from '@/types';

function wrapperFor(client: ReturnType<typeof createMockApiClient>) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
  };
}

describe('useCourseSearch', () => {
  it('loads courses for the default "all" filter', async () => {
    const client = createMockApiClient({ courseCount: 8, latencyMs: 0 });
    const { result } = renderHook(() => useCourseSearch({ query: '', status: 'all' }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.courses.length).toBeGreaterThan(0);
    expect(result.current.total).toBe(result.current.courses.length);
  });

  it('sends the status filter through to the client', async () => {
    const client = createMockApiClient({ courseCount: 8, latencyMs: 0 });
    const searchCourses = jest.spyOn(client, 'searchCourses');

    const { result } = renderHook(
      () => useCourseSearch({ query: '', status: 'completed' }),
      { wrapper: wrapperFor(client) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchCourses).toHaveBeenCalledWith({ query: '', status: 'completed' });
    expect(
      result.current.courses.every((course) => course.isEnrolled)
    ).toBe(true);
  });

  it('narrows results when the query changes', async () => {
    const client = createMockApiClient({ courseCount: 8, latencyMs: 0 });
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useCourseSearch({ query, status: 'all' }),
      { wrapper: wrapperFor(client), initialProps: { query: '' } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const unfilteredTotal = result.current.total;
    expect(unfilteredTotal).toBeGreaterThan(1);

    rerender({ query: 'React Native' });

    await waitFor(() => expect(result.current.total).toBeLessThan(unfilteredTotal));
    expect(
      result.current.courses.every((course) =>
        `${course.title} ${course.subtitle} ${course.tags.join(' ')}`
          .toLowerCase()
          .includes('react native')
      )
    ).toBe(true);
  });

  it('re-issues a request only when the effective query changes', async () => {
    const client = createMockApiClient({ courseCount: 6, latencyMs: 0 });
    const searchCourses = jest.spyOn(client, 'searchCourses');

    const { rerender } = renderHook(
      ({ query }: { query: string }) =>
        useCourseSearch({ query, status: 'all' }),
      { wrapper: wrapperFor(client), initialProps: { query: '' } }
    );

    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(1));

    // The hook receives the *debounced* query, so re-rendering with an
    // equivalent value must not trigger another request.
    rerender({ query: '' });
    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(1));

    rerender({ query: 'react' });

    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(2));
    expect(searchCourses).toHaveBeenLastCalledWith({
      query: 'react',
      status: 'all',
    });
  });

  it('re-issues a request when only the status filter changes', async () => {
    const client = createMockApiClient({ courseCount: 6, latencyMs: 0 });
    const searchCourses = jest.spyOn(client, 'searchCourses');

    const { rerender } = renderHook(
      ({ status }: { status: CourseStatusFilter }) =>
        useCourseSearch({ query: '', status }),
      { wrapper: wrapperFor(client), initialProps: { status: 'all' as CourseStatusFilter } }
    );

    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(1));

    rerender({ status: 'in-progress' });
    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(2));

    rerender({ status: 'completed' });
    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(3));

    expect(searchCourses).toHaveBeenLastCalledWith({
      query: '',
      status: 'completed',
    });
  });

  it('reports an empty state when nothing matches', async () => {
    const client = createMockApiClient({ courseCount: 6, latencyMs: 0 });
    const { result } = renderHook(
      () => useCourseSearch({ query: 'zzzzzzz-no-such-course', status: 'all' }),
      { wrapper: wrapperFor(client) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.courses).toEqual([]);
  });

  it('surfaces client errors', async () => {
    const client = createMockApiClient({ forceError: 'Service unavailable' });
    const { result } = renderHook(() => useCourseSearch({ query: '', status: 'all' }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.error).toBe('Service unavailable');
  });

  it('re-issues the request when refresh() is called', async () => {
    const client = createMockApiClient({ courseCount: 6, latencyMs: 0 });
    const searchCourses = jest.spyOn(client, 'searchCourses');

    const { result } = renderHook(() => useCourseSearch({ query: '', status: 'all' }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchCourses).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(2));
  });

  it('exposes a stable request key per filter + query pair', async () => {
    const client = createMockApiClient({ courseCount: 6, latencyMs: 0 });
    const { result } = renderHook(() => useCourseSearch({ query: '  React ', status: 'all' }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requestKey).toBe('all:react');
  });
});

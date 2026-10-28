import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from '@/api/http';
import { ApiClientProvider } from '@/hooks/useApiClient';
import { useBookmarks } from '@/hooks/useBookmarks';
import { getQueuedBookmarkActions } from '@/offline/bookmarkQueue';
import { BookmarksScreen } from '@/screens/forum/BookmarksScreen';
import { buildBookmark } from '@/tests/communityFixtures';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';
import { __setOnlineForTests } from '@/utils/connectivity';

const BOOKMARKS = [
  buildBookmark({
    id: 'bm-1',
    discussionId: 't-1',
    discussion: {
      id: 't-1',
      title: 'Saved thread',
      excerpt: 'A saved discussion excerpt',
      author: { id: 'u2', name: 'Janadeep K' },
      replyCount: 3,
      score: 7,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  }),
];

function buildClient(
  overrides: Parameters<typeof createCommunityTestClient>[0] = {}
) {
  return createCommunityTestClient({
    fetchBookmarks: jest
      .fn()
      .mockResolvedValue({ bookmarks: BOOKMARKS, syncedAt: null }),
    addBookmark: jest.fn().mockResolvedValue(undefined),
    removeBookmark: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

describe('Bookmarks offline sync', () => {
  it('queues a removal offline and replays it when connectivity returns', async () => {
    __setOnlineForTests(false);
    const client = buildClient();
    renderScreen(BookmarksScreen, { client, name: 'Bookmarks' });
    await flushAllPendingWork();

    expect(screen.getByTestId('offline-banner')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('bookmark-list-row-0-t-1-remove'));
    });
    await flushAllPendingWork();

    expect(client.removeBookmark).not.toHaveBeenCalled();
    expect(screen.getByTestId('bookmarks-pending-banner')).toHaveTextContent(
      /pending sync/
    );
    await expect(getQueuedBookmarkActions()).resolves.toHaveLength(1);

    await act(async () => {
      __setOnlineForTests(true);
    });
    await flushAllPendingWork();

    expect(client.removeBookmark).toHaveBeenCalledWith('u1', 't-1');
    expect(screen.queryByTestId('bookmarks-pending-banner')).toBeNull();
    await expect(getQueuedBookmarkActions()).resolves.toEqual([]);
  });

  it('queues an offline add instead of hitting the API', async () => {
    __setOnlineForTests(false);
    const client = buildClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiClientProvider client={client}>{children}</ApiClientProvider>
    );
    const { result } = renderHook(() => useBookmarks(), { wrapper });

    await flushAllPendingWork();
    await act(async () => {
      await result.current.addBookmark('t-9');
    });

    expect(client.addBookmark).not.toHaveBeenCalled();
    const queued = await getQueuedBookmarkActions();
    expect(queued.map((a) => [a.type, a.discussionId])).toEqual([
      ['add', 't-9'],
    ]);
  });

  it('queues an add when the request fails because the network is down', async () => {
    const client = buildClient({
      addBookmark: jest
        .fn()
        .mockRejectedValue(new ApiError('Network request failed', 0, null)),
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiClientProvider client={client}>{children}</ApiClientProvider>
    );
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await flushAllPendingWork();

    await act(async () => {
      await result.current.addBookmark('t-9');
    });

    await expect(getQueuedBookmarkActions()).resolves.toHaveLength(1);
  });
});

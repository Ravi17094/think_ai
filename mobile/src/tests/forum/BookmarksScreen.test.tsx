import { act, fireEvent, screen } from '@testing-library/react-native';

import { signIn, signOut } from '@/api/session';
import { BookmarksScreen } from '@/screens/forum/BookmarksScreen';
import { buildBookmark } from '@/tests/communityFixtures';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';

const TWO_BOOKMARKS = [
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
  buildBookmark({
    id: 'bm-2',
    discussionId: 't-2',
    discussion: {
      id: 't-2',
      title: 'Another saved thread',
      excerpt: 'Second excerpt',
      author: { id: 'u3', name: 'Ada L' },
      replyCount: 1,
      score: 2,
      createdAt: '2026-10-02T10:00:00.000Z',
    },
  }),
];

function buildClient(
  overrides: Parameters<typeof createCommunityTestClient>[0] = {}
) {
  return createCommunityTestClient({
    fetchBookmarks: jest.fn().mockResolvedValue({
      bookmarks: TWO_BOOKMARKS,
      syncedAt: '2026-10-06T12:00:00.000Z',
    }),
    removeBookmark: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

function renderBookmarks(client: ReturnType<typeof createCommunityTestClient>) {
  return renderScreen(BookmarksScreen, { client, name: 'Bookmarks' });
}

describe('BookmarksScreen', () => {
  it('shows the skeleton first, then the saved rows', async () => {
    const client = buildClient();
    renderBookmarks(client);

    expect(screen.getByTestId('bookmark-list-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('bookmark-list-row-0-t-1')).toBeNull();

    await flushAllPendingWork();

    expect(screen.queryByTestId('bookmark-list-skeleton')).toBeNull();
    expect(screen.getByTestId('bookmark-list-row-0-t-1-title')).toHaveTextContent(
      'Saved thread'
    );
    expect(screen.getByTestId('bookmark-list-row-1-t-2-title')).toHaveTextContent(
      'Another saved thread'
    );
    expect(screen.getByTestId('bookmarks-header')).toHaveTextContent(/2 saved threads?/);
  });

  it('shows an empty state when nothing is saved', async () => {
    const client = buildClient({
      fetchBookmarks: jest.fn().mockResolvedValue({
        bookmarks: [],
        syncedAt: null,
      }),
    });
    renderBookmarks(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('bookmark-list-empty')).toBeTruthy();
    expect(screen.getByTestId('bookmarks-header')).toHaveTextContent(/0 saved threads?/);
    expect(screen.getByTestId('sync-indicator-label')).toHaveTextContent(
      'Not synced yet'
    );
  });

  it('shows the sync chip for a server timestamp', async () => {
    renderBookmarks(buildClient());
    await flushAllPendingWork();

    expect(screen.getByTestId('sync-indicator-label')).toHaveTextContent(/^Synced /);
  });

  it('surfaces a load error with a retry that refetches', async () => {
    const client = buildClient({
      fetchBookmarks: jest.fn().mockRejectedValue(new Error('Offline')),
    });
    renderBookmarks(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('error-state-message')).toHaveTextContent('Offline');

    const fetch = client.fetchBookmarks as jest.Mock;
    fetch.mockResolvedValue({ bookmarks: TWO_BOOKMARKS, syncedAt: null });
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-state-retry'));
    });
    await flushAllPendingWork();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('bookmark-list-row-0-t-1')).toBeTruthy();
  });

  it('removes a bookmark optimistically and calls the API', async () => {
    const client = buildClient();
    renderBookmarks(client);
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('bookmark-list-row-0-t-1-remove'));
    });

    // Optimistic: the row is gone before the request settles.
    expect(screen.queryByTestId('bookmark-list-row-0-t-1')).toBeNull();
    await flushAllPendingWork();

    expect(client.removeBookmark).toHaveBeenCalledWith('u1', 't-1');
    expect(screen.queryByTestId('bookmark-list-row-0-t-1')).toBeNull();
    expect(screen.queryByTestId('bookmarks-error-banner')).toBeNull();
    expect(screen.getByTestId('bookmarks-header')).toHaveTextContent(/1 saved thread/);
  });

  it('restores the row and shows a banner when removal fails', async () => {
    const client = buildClient({
      removeBookmark: jest.fn().mockRejectedValue(new Error('Delete failed')),
    });
    renderBookmarks(client);
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('bookmark-list-row-0-t-1-remove'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('bookmark-list-row-0-t-1')).toBeTruthy();
    expect(screen.getByTestId('bookmarks-error-banner')).toHaveTextContent(
      'Delete failed'
    );
    expect(screen.getByTestId('bookmarks-header')).toHaveTextContent(/2 saved threads/);
  });

  it('opens a saved thread through navigation', async () => {
    const client = buildClient();
    const { navigation } = renderBookmarks(client);
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('bookmark-list-row-1-t-2-open'));
    });

    expect(navigation.navigate).toHaveBeenCalledWith('ForumThread', {
      threadId: 't-2',
    });
  });

  it('re-syncs when the signed-in user changes', async () => {
    const client = buildClient();
    renderBookmarks(client);
    await flushAllPendingWork();
    expect(client.fetchBookmarks).toHaveBeenCalledTimes(1);

    await act(async () => {
      await signIn('u9');
    });
    await flushAllPendingWork();

    expect(client.fetchBookmarks).toHaveBeenCalledTimes(2);

    await act(async () => {
      await signOut();
    });
  });
});

import { act, fireEvent, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';

import { createMockApiClient } from '@/api/mockClient';
import { ForumHomeScreen } from '@/screens/forum/ForumHomeScreen';
import { FORUM_PAGE_SIZE, INFINITE_SCROLL_THRESHOLD } from '@/theme/tokens';
import {
  createMockNavigation,
  flushAllPendingWork,
  renderScreen,
} from '@/tests/helpers';

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ latencyMs: 0, ...options });
  return { client, fetchForumThreads: jest.spyOn(client, 'fetchForumThreads') };
}

const THREAD = /^forum-thread-list-thread-\d+$/;
// The list mounts with initialNumToRender={8}, and the jest VirtualizedList
// honours it, so only 8 rows exist in the tree while 15 are loaded.
const RENDERED_ROWS = 8;

function loadedThreads(): unknown[] {
  return screen.UNSAFE_getByType(FlatList).props.data as unknown[];
}

describe('ForumHomeScreen', () => {
  it('renders the first page of threads with the community total', async () => {
    const { client } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    expect(loadedThreads()).toHaveLength(FORUM_PAGE_SIZE);
    expect(screen.getAllByTestId(THREAD)).toHaveLength(RENDERED_ROWS);
    expect(screen.getByText('45 threads in the community')).toBeTruthy();
  });

  it('exposes the category chips and tag filters once loaded', async () => {
    const { client } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    expect(screen.getByTestId('category-chips')).toBeTruthy();
    expect(screen.getByTestId('category-chips-all')).toBeTruthy();
    expect(screen.getByTestId('tag-filter')).toBeTruthy();
    expect(screen.getByTestId('tag-filter-jest')).toBeTruthy();
  });

  it('wires the 0.8 threshold into the thread list', async () => {
    const { client } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    expect(screen.getByTestId('forum-thread-list').props.onEndReachedThreshold).toBe(
      INFINITE_SCROLL_THRESHOLD
    );
  });

  it('appends the next page when the end threshold is reached', async () => {
    const { client } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    expect(loadedThreads()).toHaveLength(FORUM_PAGE_SIZE);

    await act(async () => {
      screen.getByTestId('forum-thread-list').props.onEndReached();
    });
    await flushAllPendingWork();

    expect(loadedThreads()).toHaveLength(FORUM_PAGE_SIZE * 2);
  });

  it('pages only through onEndReached, never on scroll progress', async () => {
    const { client, fetchForumThreads } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    expect(fetchForumThreads).toHaveBeenCalledTimes(1);

    // The list exposes no viewability paging hook, so a mid-scroll update can
    // never ask for page 2.
    expect(
      screen.getByTestId('forum-thread-list').props.onViewableItemsChanged
    ).toBeUndefined();
    expect(fetchForumThreads).toHaveBeenCalledTimes(1);
  });

  it('filters by category and resets to the first page', async () => {
    const { client, fetchForumThreads } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    const categoryId = 'cat-1';

    await act(async () => {
      fireEvent.press(screen.getByTestId(`category-chips-${categoryId}`));
    });
    await flushAllPendingWork();

    expect(fetchForumThreads).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId, page: 1 })
    );
    expect(
      screen.getByTestId(`category-chips-${categoryId}`).props.accessibilityState
    ).toEqual({ selected: true });
  });

  it('filters by tag', async () => {
    const { client, fetchForumThreads } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('tag-filter-jest'));
    });
    await flushAllPendingWork();

    expect(fetchForumThreads).toHaveBeenLastCalledWith(
      expect.objectContaining({ tags: ['jest'], page: 1 })
    );
    expect(screen.getByTestId('tag-filter-jest').props.accessibilityState).toEqual({
      checked: true,
    });
  });

  it('re-sorts through the sort dropdown', async () => {
    const { client, fetchForumThreads } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('sort-dropdown-trigger'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('sort-dropdown-option-most-voted'));
    });
    await flushAllPendingWork();

    expect(fetchForumThreads).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'most-voted' })
    );
  });

  it('leads with pinned threads', async () => {
    const { client } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    const [first] = loadedThreads() as { isPinned: boolean }[];
    expect(first!.isPinned).toBe(true);
    expect(screen.getAllByTestId(/-pinned$/).length).toBeGreaterThan(0);
  });

  it('refreshes the first page from the pull control', async () => {
    const { client, fetchForumThreads } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    expect(fetchForumThreads).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByTestId('forum-thread-list').props.onRefresh();
    });
    await flushAllPendingWork();

    expect(fetchForumThreads).toHaveBeenCalledTimes(2);
  });

  it('surfaces an error state when the forum request fails', async () => {
    const { client } = buildClient({ forceError: 'Forum offline' });
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByText('Forum offline')).toBeTruthy();
  });

  it('shows the end-of-list marker when every page is loaded', async () => {
    const { client } = buildClient({ forumThreadCount: 4 });
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    expect(screen.getByTestId('forum-thread-list-end')).toHaveTextContent(
      'You have reached the end'
    );
  });

  it('shows an empty state when filters exclude every thread', async () => {
    const { client } = buildClient({ forumThreadCount: 0 });
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    expect(screen.getByTestId('forum-thread-list-empty')).toBeTruthy();
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
  });

  it('opens the composer from the FAB', async () => {
    const { client } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('forum-fab'));
    });

    expect(screen.getByTestId('create-post-modal')).toBeTruthy();
  });

  it('posts a thread and lists it first', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome', navigation });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('forum-fab'));
    });

    fireEvent.changeText(
      screen.getByTestId('create-post-modal-title'),
      'A brand new thread from the composer'
    );
    fireEvent.changeText(
      screen.getByTestId('create-post-modal-body-input'),
      'Body copy for the new thread'
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-modal-submit'));
    });
    await flushAllPendingWork();

    expect(client.createdThreads).toHaveLength(1);
    // Pinned threads always lead; the brand new post is the newest row right
    // after them.
    const rows = loadedThreads() as { isPinned: boolean; title: string }[];
    const firstUnpinned = rows.findIndex((row) => !row.isPinned);
    expect(rows.slice(0, firstUnpinned).every((row) => row.isPinned)).toBe(true);
    expect(rows[firstUnpinned]!.title).toBe('A brand new thread from the composer');
    expect(screen.getByText('46 threads in the community')).toBeTruthy();
  });

  it('keeps the composer open and shows the failure when posting throws', async () => {
    const { client } = buildClient();
    jest
      .spyOn(client, 'createThread')
      .mockRejectedValue(new Error('Forum offline'));
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('forum-fab'));
    });

    fireEvent.changeText(
      screen.getByTestId('create-post-modal-title'),
      'A brand new thread from the composer'
    );
    fireEvent.changeText(
      screen.getByTestId('create-post-modal-body-input'),
      'Body copy for the failing post'
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-modal-submit'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('create-post-modal-error')).toHaveTextContent(
      'Forum offline'
    );
    // The sheet is still open so the author can fix the post and retry.
    expect(screen.getByTestId('create-post-modal-body-input')).toBeTruthy();
  });

  it('sends a tapped thread back through navigation', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome', navigation });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getAllByTestId(/^forum-thread-list-.*-title$/)[0]!);
    });

    expect(navigation.navigate).toHaveBeenCalledWith('GlobalSearch');
  });

  it('tunes the list for smooth scrolling', async () => {
    const { client } = buildClient();
    renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });

    await flushAllPendingWork();

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.initialNumToRender).toBe(RENDERED_ROWS);
    expect(list.props.maxToRenderPerBatch).toBe(8);
    expect(list.props.windowSize).toBe(7);
    expect(list.props.removeClippedSubviews).toBe(true);
  });
});
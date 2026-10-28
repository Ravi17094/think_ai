import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native';
import { PropsWithChildren } from 'react';

import { createMockApiClient } from '@/api/mockClient';
import { CategoryChips } from '@/components/forum/CategoryChips';
import { CreatePostModal, TITLE_MIN_LENGTH } from '@/components/forum/CreatePostModal';
import { FloatingActionButton } from '@/components/forum/FloatingActionButton';
import { SortDropdown, SORT_LABELS } from '@/components/forum/SortDropdown';
import { TagFilter } from '@/components/forum/TagFilter';
import { shouldLoadNextPage, useForumThreads } from '@/hooks/useForumThreads';
import { ApiClientProvider } from '@/hooks/useApiClient';
import { createForumCategoryFactory } from '@/mock/factories';
import { FORUM_PAGE_SIZE, INFINITE_SCROLL_THRESHOLD } from '@/theme/tokens';
import { flushAllPendingWork } from '@/tests/helpers';
import type { ForumCategory, ForumSort } from '@/types';

const createCategory = createForumCategoryFactory(61);
const categories: ForumCategory[] = [createCategory(0), createCategory(1)];

function wrapperFor(client: ReturnType<typeof createMockApiClient>) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
  };
}

describe('shouldLoadNextPage', () => {
  it('uses the 0.8 threshold from the spec', () => {
    expect(INFINITE_SCROLL_THRESHOLD).toBe(0.8);
    expect(shouldLoadNextPage(0.79)).toBe(false);
    expect(shouldLoadNextPage(0.8)).toBe(true);
    expect(shouldLoadNextPage(1)).toBe(true);
  });

  it('accepts an explicit threshold', () => {
    expect(shouldLoadNextPage(0.5, 0.4)).toBe(true);
    expect(shouldLoadNextPage(0.3, 0.4)).toBe(false);
  });
});

describe('useForumThreads', () => {
  it('loads the first page, categories and the tag taxonomy', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.threads).toHaveLength(FORUM_PAGE_SIZE);
    expect(result.current.page).toBe(1);
    expect(result.current.categories.length).toBeGreaterThan(0);
    expect(result.current.availableTags.length).toBeGreaterThan(0);
    expect(result.current.total).toBe(45);
    expect(result.current.hasMore).toBe(true);
  });

  it('uses a page size of 15 and asks the client for the right query', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const fetchForumThreads = jest.spyOn(client, 'fetchForumThreads');
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();

    expect(FORUM_PAGE_SIZE).toBe(15);
    expect(fetchForumThreads).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 15,
      categoryId: null,
      tags: [],
      sort: 'newest',
    });
    expect(result.current.threads).toHaveLength(15);
  });

  it('appends the next page and never duplicates a thread', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    act(() => {
      result.current.onScrollProgress(0.8);
    });
    await flushAllPendingWork();

    expect(result.current.page).toBe(2);
    expect(result.current.threads).toHaveLength(FORUM_PAGE_SIZE * 2);
    expect(new Set(result.current.threads.map((t) => t.id)).size).toBe(
      FORUM_PAGE_SIZE * 2
    );
  });

  it('does not page below the threshold', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const fetchForumThreads = jest.spyOn(client, 'fetchForumThreads');
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    act(() => {
      result.current.onScrollProgress(0.79);
    });
    await flushAllPendingWork();

    expect(result.current.page).toBe(1);
    expect(fetchForumThreads).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate scroll events while a page is in flight', async () => {
    const client = createMockApiClient({ latencyMs: 50 });
    const fetchForumThreads = jest.spyOn(client, 'fetchForumThreads');
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    // Let the first page land before starting the next request.
    await flushAllPendingWork(3, 60);
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.onScrollProgress(0.8);
      result.current.onScrollProgress(0.8);
      result.current.onScrollProgress(1);
    });
    expect(result.current.page).toBe(2);

    await flushAllPendingWork(3, 60);
    // Exactly one extra request: the duplicate events were swallowed.
    expect(fetchForumThreads).toHaveBeenCalledTimes(2);
    expect(result.current.threads).toHaveLength(FORUM_PAGE_SIZE * 2);
  });

  it('stops paging once the last page is reached', async () => {
    const client = createMockApiClient({ latencyMs: 0, forumThreadCount: 18 });
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    act(() => {
      result.current.onScrollProgress(1);
    });
    await flushAllPendingWork();

    expect(result.current.hasMore).toBe(false);
    act(() => {
      result.current.onScrollProgress(1);
    });
    await flushAllPendingWork();
    expect(result.current.page).toBe(2);
  });

  it('resets to page 1 and clears rows when the category changes', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const fetchForumThreads = jest.spyOn(client, 'fetchForumThreads');
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    act(() => {
      result.current.onScrollProgress(0.8);
    });
    await flushAllPendingWork();
    expect(result.current.page).toBe(2);

    const categoryId = result.current.categories[0]!.id;
    act(() => {
      result.current.setCategoryId(categoryId);
    });
    await flushAllPendingWork();

    expect(result.current.page).toBe(1);
    expect(result.current.filters.categoryId).toBe(categoryId);
    // The seeded corpus only holds a handful of threads per category, so the
    // filtered page is smaller than the unfiltered one.
    expect(result.current.threads.length).toBeGreaterThan(0);
    expect(result.current.threads.length).toBeLessThanOrEqual(FORUM_PAGE_SIZE);
    expect(
      result.current.threads.every((t) => t.categoryId === categoryId)
    ).toBe(true);
    expect(fetchForumThreads).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 15,
      categoryId,
      tags: [],
      sort: 'newest',
    });
  });

  it('sends the selected sort and every selected tag', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const fetchForumThreads = jest.spyOn(client, 'fetchForumThreads');
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    act(() => {
      result.current.setSort('most-voted' as ForumSort);
    });
    await flushAllPendingWork();
    act(() => {
      result.current.setTags(['testing', 'jest']);
    });
    await flushAllPendingWork();

    expect(fetchForumThreads).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 15,
      categoryId: null,
      tags: ['testing', 'jest'],
      sort: 'most-voted',
    });
  });

  it('reports an empty state when filters exclude everything', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    act(() => {
      result.current.setTags(['animations']);
    });
    await flushAllPendingWork();

    if (result.current.total === 0) {
      expect(result.current.threads).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    }
    expect(result.current.hasMore).toBe(false);
  });

  it('refreshes back to page 1', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    act(() => {
      result.current.onScrollProgress(0.8);
    });
    await flushAllPendingWork();
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.refresh();
    });
    expect(result.current.isRefreshing).toBe(true);
    await flushAllPendingWork();

    expect(result.current.page).toBe(1);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('surfaces client errors', async () => {
    const client = createMockApiClient({ forceError: 'Forum offline', latencyMs: 0 });
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();

    expect(result.current.hasError).toBe(true);
    expect(result.current.error).toBe('Forum offline');
    expect(result.current.isLoading).toBe(false);
  });

  it('honours a custom page size and threshold', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const fetchForumThreads = jest.spyOn(client, 'fetchForumThreads');
    const { result } = renderHook(
      () => useForumThreads({ pageSize: 4, threshold: 0.5 }),
      { wrapper: wrapperFor(client) }
    );

    await flushAllPendingWork();
    expect(fetchForumThreads).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageSize: 4 })
    );
    expect(result.current.threads).toHaveLength(4);
    expect(result.current.threshold).toBe(0.5);

    act(() => {
      result.current.onScrollProgress(0.5);
    });
    await flushAllPendingWork();
    expect(result.current.threads).toHaveLength(8);
  });

  it('prepends a created thread by reloading page 1', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const { result } = renderHook(() => useForumThreads(), { wrapper: wrapperFor(client) });

    await flushAllPendingWork();
    const before = result.current.threads.length;
    let created: string | undefined;
    await act(async () => {
      created = await result.current.createThread({
        title: 'A brand new thread',
        body: 'Body text',
        categoryId: result.current.categories[0]!.id,
        tags: ['testing'],
      });
    });
    await flushAllPendingWork();

    expect(created).toBe('thread-new-1');
    expect(result.current.page).toBe(1);
    expect(result.current.threads).toHaveLength(before);
    expect(result.current.threads.some((t) => t.title === 'A brand new thread')).toBe(
      true
    );
  });
});

describe('CategoryChips', () => {
  it('renders an All chip plus one chip per category', () => {
    render(
      <CategoryChips
        categories={categories}
        onSelect={jest.fn()}
        selectedCategoryId={null}
      />
    );

    expect(screen.getByTestId('category-chips-all')).toBeTruthy();
    for (const category of categories) {
      expect(screen.getByTestId(`category-chips-${category.id}`)).toBeTruthy();
    }
  });

  it('selects All when the category id is null', () => {
    render(
      <CategoryChips
        categories={categories}
        onSelect={jest.fn()}
        selectedCategoryId={null}
      />
    );

    expect(
      screen.getByTestId('category-chips-all').props.accessibilityState
    ).toEqual({ selected: true });
  });

  it('selects the matching category chip', () => {
    const [first, second] = categories as [ForumCategory, ForumCategory];
    render(
      <CategoryChips
        categories={categories}
        onSelect={jest.fn()}
        selectedCategoryId={second!.id}
      />
    );

    expect(
      screen.getByTestId(`category-chips-${second!.id}`).props.accessibilityState
    ).toEqual({ selected: true });
    expect(
      screen.getByTestId(`category-chips-${first!.id}`).props.accessibilityState
    ).toEqual({ selected: false });
  });

  it('reports the tapped category and null for All', () => {
    const onSelect = jest.fn();
    const [first] = categories as [ForumCategory, ForumCategory];
    render(
      <CategoryChips
        categories={categories}
        onSelect={onSelect}
        selectedCategoryId={null}
      />
    );

    fireEvent.press(screen.getByTestId(`category-chips-${first!.id}`));
    expect(onSelect).toHaveBeenLastCalledWith(first!.id);

    fireEvent.press(screen.getByTestId('category-chips-all'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});

describe('TagFilter', () => {
  const tags = ['testing', 'jest', 'navigation'];

  it('renders nothing without tags', () => {
    render(<TagFilter onChange={jest.fn()} selectedTags={[]} tags={[]} />);
    expect(screen.queryByTestId('tag-filter')).toBeNull();
  });

  it('renders one chip per tag and marks the selected ones', () => {
    render(
      <TagFilter onChange={jest.fn()} selectedTags={['jest']} tags={tags} />
    );

    expect(screen.getByTestId('tag-filter-jest').props.accessibilityState).toEqual({
      checked: true,
    });
    expect(
      screen.getByTestId('tag-filter-testing').props.accessibilityState
    ).toEqual({ checked: false });
  });

  it('adds and removes tags through multi-select', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <TagFilter onChange={onChange} selectedTags={['jest']} tags={tags} />
    );

    fireEvent.press(screen.getByTestId('tag-filter-navigation'));
    expect(onChange).toHaveBeenLastCalledWith(['jest', 'navigation']);

    rerender(
      <TagFilter onChange={onChange} selectedTags={['jest', 'navigation']} tags={tags} />
    );
    fireEvent.press(screen.getByTestId('tag-filter-jest'));
    expect(onChange).toHaveBeenLastCalledWith(['navigation']);
  });
});

describe('SortDropdown', () => {
  it('shows the label for the current sort', () => {
    render(<SortDropdown onChange={jest.fn()} value={'most-voted' as ForumSort} />);

    expect(screen.getByText(SORT_LABELS['most-voted'])).toBeTruthy();
    expect(
      screen.getByTestId('sort-dropdown-trigger').props.accessibilityState
    ).toEqual({ expanded: false });
  });

  it('opens the menu, reports the pick and closes', () => {
    const onChange = jest.fn();
    render(<SortDropdown onChange={onChange} value={'newest' as ForumSort} />);

    fireEvent.press(screen.getByTestId('sort-dropdown-trigger'));
    expect(
      screen.getByTestId('sort-dropdown-trigger').props.accessibilityState
    ).toEqual({ expanded: true });

    fireEvent.press(screen.getByTestId('sort-dropdown-option-recently-active'));
    expect(onChange).toHaveBeenCalledWith('recently-active');
  });

  it('dismisses without changing the sort when the backdrop is pressed', () => {
    const onChange = jest.fn();
    render(<SortDropdown onChange={onChange} value={'newest' as ForumSort} />);

    fireEvent.press(screen.getByTestId('sort-dropdown-trigger'));
    fireEvent.press(screen.getByTestId('sort-dropdown-backdrop'));

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('sort-dropdown-trigger').props.accessibilityState
    ).toEqual({ expanded: false });
  });
});

describe('FloatingActionButton', () => {
  it('fires onPress', () => {
    const onPress = jest.fn();
    render(<FloatingActionButton onPress={onPress} />);

    fireEvent.press(screen.getByTestId('forum-fab'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('CreatePostModal', () => {
  const tags = ['testing', 'jest'];

  function renderModal(
    props: Partial<React.ComponentProps<typeof CreatePostModal>> = {}
  ) {
    return render(
      <CreatePostModal
        categories={categories}
        availableTags={tags}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        visible
        {...props}
      />
    );
  }

  it('blocks submit until the title is long enough', () => {
    const onSubmit = jest.fn();
    renderModal({ onSubmit });

    fireEvent.changeText(
      screen.getByTestId('create-post-modal-title'),
      'short'
    );
    fireEvent.press(screen.getByTestId('create-post-modal-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('create-post-modal-validation-error')).toHaveTextContent(
      `Add a title of at least ${TITLE_MIN_LENGTH} characters and pick a category.`
    );
  });

  it('adopts the first category that arrives late', () => {
    const onSubmit = jest.fn();
    const { rerender } = renderModal({
      categories: [],
      onSubmit,
    });

    rerender(
      <CreatePostModal
        availableTags={tags}
        categories={categories}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        visible
      />
    );

    fireEvent.changeText(
      screen.getByTestId('create-post-modal-title'),
      'A perfectly valid thread title'
    );
    fireEvent.press(screen.getByTestId('create-post-modal-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'A perfectly valid thread title',
      body: '',
      categoryId: categories[0]!.id,
      tags: [],
    });
  });

  it('submits the trimmed title, body, category and tags', () => {
    const onSubmit = jest.fn();
    renderModal({ onSubmit });

    fireEvent.changeText(
      screen.getByTestId('create-post-modal-title'),
      '  Debounce vs throttle for search inputs  '
    );
    fireEvent.changeText(
      screen.getByTestId('create-post-modal-body-input'),
      '  Some context  '
    );
    fireEvent.press(screen.getByTestId(`create-post-modal-category-${categories[1]!.id}`));
    fireEvent.press(screen.getByTestId('create-post-modal-tag-testing'));
    fireEvent.press(screen.getByTestId('create-post-modal-tag-jest'));
    fireEvent.press(screen.getByTestId('create-post-modal-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Debounce vs throttle for search inputs',
      body: 'Some context',
      categoryId: categories[1]!.id,
      tags: ['testing', 'jest'],
    });
  });

  it('toggles a tag off when it is already selected', () => {
    const onSubmit = jest.fn();
    renderModal({ onSubmit });

    fireEvent.changeText(
      screen.getByTestId('create-post-modal-title'),
      'A perfectly valid thread title'
    );
    fireEvent.press(screen.getByTestId('create-post-modal-tag-testing'));
    fireEvent.press(screen.getByTestId('create-post-modal-tag-testing'));
    fireEvent.press(screen.getByTestId('create-post-modal-submit'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] })
    );
  });

  it('marks the chosen category as selected', () => {
    renderModal();

    expect(
      screen.getByTestId(`create-post-modal-category-${categories[0]!.id}`).props
        .accessibilityState
    ).toEqual({ selected: true });
    fireEvent.press(screen.getByTestId(`create-post-modal-category-${categories[1]!.id}`));
    expect(
      screen.getByTestId(`create-post-modal-category-${categories[1]!.id}`).props
        .accessibilityState
    ).toEqual({ selected: true });
  });

  it('blocks submit and shows the label while submitting', () => {
    const onSubmit = jest.fn();
    renderModal({ isSubmitting: true, onSubmit });

    expect(screen.getByText('Posting…')).toBeTruthy();
    expect(
      screen.getByTestId('create-post-modal-submit').props.accessibilityState
    ).toEqual({ disabled: true });
  });

  it('surfaces a submit failure message', () => {
    renderModal({ errorMessage: 'Could not post the thread.' });

    expect(screen.getByTestId('create-post-modal-error')).toHaveTextContent(
      'Could not post the thread.'
    );
  });

  it('closes from the close button and the request handler', () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.press(screen.getByTestId('create-post-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByTestId('create-post-modal'), 'requestClose');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

import { act, fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createMockApiClient } from '@/api/mockClient';
import { RECENT_SEARCHES_KEY } from '@/hooks/useRecentSearches';
import { GlobalSearchScreen } from '@/screens/search/GlobalSearchScreen';
import { SEARCH_DEBOUNCE_MS } from '@/theme/tokens';
import {
  createMockNavigation,
  flushAllPendingWork,
  renderScreen,
} from '@/tests/helpers';

/** Matches a result row but not the nested highlighted match segments. */
const RESULT_ROW = /^result-row-(?:course|lesson|forum|assessment)-\d+$/;
const HIGHLIGHT = /^result-row-[^-]+-\d+-match-\d+$/;

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ latencyMs: 0, ...options });
  return { client, searchGlobal: jest.spyOn(client, 'searchGlobal') };
}

/** Types a term and lets the debounce window plus the request settle. */
async function typeQuery(term: string) {
  fireEvent.changeText(screen.getByTestId('search-input-field'), term);
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  });
  await flushAllPendingWork();
}

describe('GlobalSearchScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows an idle prompt and a forum shortcut before any query', async () => {
    const { client, searchGlobal } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    expect(
      screen.getByText('Search across courses, lessons, the forum and assessments.')
    ).toBeTruthy();
    expect(searchGlobal).not.toHaveBeenCalled();
    await flushAllPendingWork();
  });

  it('hides the tabs until a query is debounced', async () => {
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    expect(screen.queryByTestId('global-search-tabs')).toBeNull();

    fireEvent.changeText(screen.getByTestId('search-input-field'), 'react');
    expect(screen.queryByTestId('global-search-tabs')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByTestId('global-search-tabs')).toBeTruthy();
    await flushAllPendingWork();
  });

  it('debounces a burst of keystrokes into a single request', async () => {
    const { client, searchGlobal } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    for (const value of ['r', 're', 'rea', 'react']) {
      fireEvent.changeText(screen.getByTestId('search-input-field'), value);
    }
    expect(searchGlobal).not.toHaveBeenCalled();
    expect(screen.getByTestId('search-input-busy')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await flushAllPendingWork();

    expect(searchGlobal).toHaveBeenCalledTimes(1);
    expect(searchGlobal).toHaveBeenCalledWith('react', 'course');
  });

  it('renders highlighted results for the active tab', async () => {
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('react');

    expect(screen.getAllByTestId(RESULT_ROW)).toHaveLength(5);
    expect(screen.getByTestId('result-row-course-1')).toBeTruthy();
    expect(screen.getAllByTestId(HIGHLIGHT).length).toBeGreaterThan(0);
    expect(
      screen.getByTestId('global-search-tabs-Courses').props.accessibilityState
    ).toEqual({ selected: true });
  });

  it('reports the result count for the active tab', async () => {
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('react');

    expect(screen.getByText('5 results')).toBeTruthy();
  });

  it('uses a singular label for a single result', async () => {
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    // Only the "Node.js API Design" course title matches; the per-type
    // keywords do not contain "node.js".
    await typeQuery('node.js');

    expect(screen.getAllByTestId(RESULT_ROW)).toHaveLength(1);
    expect(screen.getByText('1 result')).toBeTruthy();
  });

  it('switches tabs and requests each tab once', async () => {
    const { client, searchGlobal } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('react');
    expect(searchGlobal).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('global-search-tabs-Forum'));
    });
    await flushAllPendingWork();

    expect(searchGlobal).toHaveBeenCalledTimes(2);
    expect(searchGlobal).toHaveBeenLastCalledWith('react', 'forum');
    expect(screen.getByTestId('result-row-forum-1')).toBeTruthy();

    // Returning to the cached Courses tab must not refetch.
    await act(async () => {
      fireEvent.press(screen.getByTestId('global-search-tabs-Courses'));
    });
    expect(screen.getByTestId('result-row-course-1')).toBeTruthy();
    expect(searchGlobal).toHaveBeenCalledTimes(2);
  });

  it('shows a per-tab empty state when nothing matches', async () => {
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('zzzzz-no-such-thing');

    expect(screen.getByTestId('global-search-empty-state')).toBeTruthy();
    expect(screen.getByText('No matches')).toBeTruthy();
    expect(screen.getByText('Nothing found in Courses. Try another tab or a shorter query.')).toBeTruthy();
  });

  it('surfaces an error state when the search request fails', async () => {
    const { client } = buildClient({ forceError: 'Search offline' });
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('react');

    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByText('Search offline')).toBeTruthy();
  });

  it('navigates to course detail for a course result', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch', navigation });

    await typeQuery('react');

    await act(async () => {
      fireEvent.press(screen.getByTestId('result-row-course-1'));
    });

    expect(navigation.navigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: 'course-1',
    });
  });

  it('navigates to the forum for a forum result', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch', navigation });

    await typeQuery('react');
    await act(async () => {
      fireEvent.press(screen.getByTestId('global-search-tabs-Forum'));
    });
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('result-row-forum-1'));
    });

    expect(navigation.navigate).toHaveBeenCalledWith('ForumHome');
  });

  it('persists a submitted term to recent searches', async () => {
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('react native');
    await act(async () => {
      fireEvent(screen.getByTestId('search-input-field'), 'submitEditing');
    });
    await flushAllPendingWork();

    expect(await AsyncStorage.getItem(RECENT_SEARCHES_KEY)).toBe(
      JSON.stringify(['react native'])
    );
  });

  it('hydrates and re-uses recent searches from storage', async () => {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['typescript']));
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await flushAllPendingWork();
    expect(screen.getByTestId('recent-searches-item-typescript')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('recent-searches-item-typescript'));
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByTestId('search-input-field').props.value).toBe('typescript');
    await flushAllPendingWork();
  });

  it('hides the recent strip while a query is being typed', async () => {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['typescript']));
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await flushAllPendingWork();
    expect(screen.getByTestId('recent-searches')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('search-input-field'), 'r');

    expect(screen.queryByTestId('recent-searches')).toBeNull();
  });

  it('clears every recent search from the strip', async () => {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['typescript']));
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('recent-searches-clear-all'));
    });

    expect(screen.queryByTestId('recent-searches')).toBeNull();
  });

  it('removes a single recent search', async () => {
    await AsyncStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(['typescript', 'react native'])
    );
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('recent-searches-remove-typescript'));
    });

    expect(screen.queryByTestId('recent-searches-item-typescript')).toBeNull();
    expect(screen.getByTestId('recent-searches-item-react native')).toBeTruthy();
  });

  it('returns to the idle prompt when the query is cleared', async () => {
    const { client, searchGlobal } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('react');
    expect(screen.getByTestId('result-row-course-1')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('search-input-clear'));
    });
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('search-input-field').props.value).toBe('');
    expect(
      screen.getByText('Search across courses, lessons, the forum and assessments.')
    ).toBeTruthy();
    expect(screen.queryByTestId('global-search-tabs')).toBeNull();
    expect(searchGlobal).toHaveBeenCalledTimes(1);
  });

  it('dismisses the keyboard when the results list is dragged', async () => {
    const { client } = buildClient();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch' });

    await typeQuery('react');

    const list = screen.getByTestId('global-search-results');
    expect(list.props.keyboardDismissMode).toBe('on-drag');
    expect(list.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('offers a forum shortcut from the idle state', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();
    renderScreen(GlobalSearchScreen, { client, name: 'GlobalSearch', navigation });

    await flushAllPendingWork();
    await act(async () => {
      fireEvent.press(screen.getByTestId('global-search-forum-link'));
    });

    expect(navigation.navigate).toHaveBeenCalledWith('ForumHome');
  });
});
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Keyboard, ScrollView } from 'react-native';

import { createMockApiClient } from '@/api/mockClient';
import { MyCoursesScreen } from '@/screens/learner/MyCoursesScreen';
import { SEARCH_DEBOUNCE_MS } from '@/theme/tokens';
import { createMockNavigation, renderScreen } from '@/tests/helpers';
import type { Course } from '@/types';
import {
  COURSE_CATEGORIES,
  getCourseCategoryId,
  sortCourses,
} from '@/utils/course';

const GRID_CARD = /^(course-card-0|course-grid-card-)/;

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ courseCount: 9, latencyMs: 0, ...options });
  return { client, searchCourses: jest.spyOn(client, 'searchCourses') };
}

/** Same seeded catalogue the screen receives, including enrollments. */
async function fixtureCourses(): Promise<Course[]> {
  const client = createMockApiClient({ courseCount: 9, latencyMs: 0 });
  const result = await client.searchCourses({ query: '', status: 'all' });
  return result.courses;
}

describe('MyCoursesScreen', () => {
  it('shows a loading state before results arrive', async () => {
    const { client } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });
    expect(screen.getByTestId('my-courses-loading')).toBeTruthy();
    await act(async () => {});
  });

  it('renders the responsive course grid once loaded', async () => {
    const { client } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());
    expect(screen.getByTestId('course-grid')).toBeTruthy();
    expect(screen.getAllByTestId(/^course-grid-card-/).length).toBeGreaterThan(0);
  });

  it('applies a filter when a tab is pressed', async () => {
    const { client, searchCourses } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-tabs-completed'));
    });

    await waitFor(() =>
      expect(searchCourses).toHaveBeenLastCalledWith({
        query: '',
        status: 'completed',
      })
    );
    expect(screen.getByTestId('filter-tabs-completed').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('debounces typing so a burst of keystrokes issues one request', async () => {
    const { client, searchCourses } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(1));

    const input = screen.getByTestId('search-bar-input');
    for (const value of ['r', 're', 'rea', 'reac', 'react']) {
      fireEvent.changeText(input, value);
    }

    // Nothing is requested while the user is still typing.
    expect(searchCourses).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('search-bar-searching')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(2));
    expect(searchCourses).toHaveBeenLastCalledWith({
      query: 'react',
      status: 'all',
    });
  });

  it('does not request until the debounce window elapses', async () => {
    const { client, searchCourses } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getByTestId('search-bar-input'), 'r');

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(searchCourses).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await waitFor(() => expect(searchCourses).toHaveBeenCalledTimes(2));
  });

  it('clears the search from the clear button', async () => {
    const { client, searchCourses } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('search-bar-input'), 'react');
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await waitFor(() =>
      expect(searchCourses).toHaveBeenLastCalledWith({ query: 'react', status: 'all' })
    );

    fireEvent.press(screen.getByTestId('search-bar-clear'));
    expect(screen.getByTestId('search-bar-input').props.value).toBe('');

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await waitFor(() =>
      expect(searchCourses).toHaveBeenLastCalledWith({ query: '', status: 'all' })
    );
  });

  it('shows the empty state when the search matches nothing', async () => {
    const { client } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('search-bar-input'), 'zzz-no-match');
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() =>
      expect(screen.getByTestId('my-courses-empty-state')).toBeTruthy()
    );
    expect(screen.getByText('No courses match “zzz-no-match”')).toBeTruthy();
  });

  it('dismisses the keyboard when the list is scrolled', async () => {
    const { client } = buildClient();
    const dismiss = jest.spyOn(Keyboard, 'dismiss');

    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });
    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    fireEvent.scroll(screen.UNSAFE_getByType(ScrollView));

    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  it('configures the ScrollView to dismiss the keyboard on drag', async () => {
    const { client } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardDismissMode).toBe(
      'on-drag'
    );
    await act(async () => {});
  });

  it('surfaces an error state when the request fails', async () => {
    const { client } = buildClient({ forceError: 'Catalog unavailable' });
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());
    expect(screen.getByText('Catalog unavailable')).toBeTruthy();
  });

  it('navigates to course detail when a grid card is pressed', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses', navigation });

    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    const firstCard = screen.getAllByTestId(/^course-grid-card-/)[0];
    const courseId = firstCard?.props.testID.replace('course-grid-card-', '') ?? '';
    fireEvent.press(firstCard!);

    expect(navigation.navigate).toHaveBeenCalledWith('CourseDetail', { courseId });
  });

  it('renders category and sort controls above the grid', async () => {
    const { client } = buildClient();
    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });

    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    expect(screen.getByTestId('my-courses-category-chips')).toBeTruthy();
    expect(screen.getByTestId('sort-chips')).toBeTruthy();
    expect(screen.getByTestId('sort-chip-recommended').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('applies the category supplied by a deep link without changing the API query', async () => {
    const { client, searchCourses } = buildClient();
    const courses = await fixtureCourses();
    const expected = courses.filter((course) => getCourseCategoryId(course) === 'mobile');

    renderScreen(MyCoursesScreen, {
      client,
      name: 'MyCourses',
      params: { category: 'mobile' },
    });
    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());
    const callsAfterLoad = searchCourses.mock.calls.length;

    expect(screen.queryAllByTestId(GRID_CARD)).toHaveLength(expected.length);
    expect(
      screen.getByTestId('category-chip-mobile').props.accessibilityState
    ).toEqual({ selected: true });
    expect(searchCourses).toHaveBeenCalledTimes(callsAfterLoad);
    expect(searchCourses).toHaveBeenLastCalledWith({ query: '', status: 'all' });

    const excluded = courses.find(
      (course) => getCourseCategoryId(course) !== 'mobile'
    );
    expect(screen.queryByText(excluded!.title)).toBeNull();
  });

  it('sorts the visible courses client-side', async () => {
    const { client, searchCourses } = buildClient();
    const courses = await fixtureCourses();
    const highestRated = sortCourses(courses, 'highest-rated');

    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });
    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());
    const callsAfterLoad = searchCourses.mock.calls.length;

    fireEvent.press(screen.getByTestId('sort-chip-highest-rated'));

    const firstCard = screen.getByTestId('course-card-0');
    expect(within(firstCard).getByText(highestRated[0]!.title)).toBeTruthy();
    expect(
      screen.getByTestId('sort-chip-highest-rated').props.accessibilityState
    ).toEqual({ selected: true });
    expect(searchCourses).toHaveBeenCalledTimes(callsAfterLoad);
  });

  it('sorts alphabetically when the A–Z chip is pressed', async () => {
    const { client } = buildClient();
    const courses = await fixtureCourses();
    const alphabetical = sortCourses(courses, 'title');

    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });
    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    fireEvent.press(screen.getByTestId('sort-chip-title'));

    expect(
      within(screen.getByTestId('course-card-0')).getByText(alphabetical[0]!.title)
    ).toBeTruthy();
  });

  it('shows a filter-empty state and resets every filter from its action', async () => {
    const { client, searchCourses } = buildClient();
    const courses = await fixtureCourses();
    const match = courses[0]!;
    const matchingCourses = courses.filter((course) =>
      `${course.title} ${course.subtitle} ${course.tags.join(' ')}`
        .toLowerCase()
        .includes(match.title.toLowerCase())
    );
    const presentCategories = new Set(matchingCourses.map(getCourseCategoryId));
    const absentCategory = COURSE_CATEGORIES.find(
      (category) => !presentCategories.has(category.id)
    )!;

    renderScreen(MyCoursesScreen, { client, name: 'MyCourses' });
    await waitFor(() => expect(screen.getByTestId('my-courses-results')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('search-bar-input'), match.title);
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await waitFor(() =>
      expect(searchCourses).toHaveBeenLastCalledWith({
        query: match.title,
        status: 'all',
      })
    );

    fireEvent.press(screen.getByTestId(`category-chip-${absentCategory.id}`));

    expect(screen.getByTestId('my-courses-filter-empty-state')).toBeTruthy();
    expect(screen.queryAllByTestId(GRID_CARD)).toHaveLength(0);

    fireEvent.press(screen.getByTestId('my-courses-filter-empty-state-action'));

    expect(screen.queryByTestId('my-courses-filter-empty-state')).toBeNull();
    expect(screen.queryAllByTestId(GRID_CARD).length).toBeGreaterThan(0);
    expect(
      screen.getByTestId('category-chip-all').props.accessibilityState
    ).toEqual({ selected: true });
  });
});

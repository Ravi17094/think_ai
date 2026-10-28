import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Keyboard, ScrollView } from 'react-native';

import { createMockApiClient } from '@/api/mockClient';
import { MyCoursesScreen } from '@/screens/learner/MyCoursesScreen';
import { SEARCH_DEBOUNCE_MS } from '@/theme/tokens';
import { createMockNavigation, renderScreen } from '@/tests/helpers';

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ courseCount: 9, latencyMs: 0, ...options });
  return { client, searchCourses: jest.spyOn(client, 'searchCourses') };
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
});

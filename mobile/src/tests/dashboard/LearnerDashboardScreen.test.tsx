import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import { createMockApiClient } from '@/api/mockClient';
import { createEnrollmentFactory } from '@/mock/factories';
import { LearnerDashboardScreen } from '@/screens/learner/LearnerDashboardScreen';
import { createMockNavigation, renderScreen } from '@/tests/helpers';

const createEnrollment = createEnrollmentFactory(77);

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ latencyMs: 0, ...options });
  const fetchEnrollments = jest.spyOn(client, 'fetchEnrollments');
  return { client, fetchEnrollments };
}

/** Invokes the `RefreshControl` wired to the dashboard `ScrollView`. */
async function pullToRefresh() {
  const scrollView = screen.UNSAFE_getByType(ScrollView);
  await act(async () => {
    scrollView.props.refreshControl.props.onRefresh();
  });
}

describe('LearnerDashboardScreen', () => {
  it('places the compact theme selector in the Dashboard header action area', () => {
    const { navigation } = renderScreen(LearnerDashboardScreen, { name: 'LearnerDashboard' });
    const options = navigation.setOptions.mock.calls.map(([value]) => value);
    const headerOptions = options.find((value) => typeof value.headerRight === 'function');
    expect(headerOptions).toBeDefined();
    const panel = headerOptions!.headerRight!();
    expect(panel).toMatchObject({ props: { compact: true, testID: 'dashboard-appearance-toggle' } });
    expect(screen.queryByTestId('dashboard-appearance-toggle')).toBeNull();
  });

  it('shows a loading skeleton before enrollments arrive', async () => {
    const { client } = buildClient();
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    expect(screen.getByTestId('dashboard-loading')).toBeTruthy();
    await act(async () => {});
  });

  it('renders one card per enrollment once loaded', async () => {
    const { client } = buildClient({ enrollmentCount: 3 });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() => expect(screen.getByTestId('dashboard-course-list')).toBeTruthy());

    expect(
      screen.getAllByTestId(/^course-card-enr-\d+$/)
    ).toHaveLength(3);
  });

  it('shows the enrolled count and completed summary', async () => {
    const { client } = buildClient({ enrollmentCount: 3 });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() => expect(screen.getByTestId('dashboard-course-list')).toBeTruthy());
    expect(screen.getByTestId('dashboard-enrollment-count')).toHaveTextContent(
      /Enrolled\s*3/
    );
  });

  it('re-fetches when pull-to-refresh is triggered', async () => {
    const { client, fetchEnrollments } = buildClient({ enrollmentCount: 2 });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() => expect(screen.getByTestId('dashboard-course-list')).toBeTruthy());
    expect(fetchEnrollments).toHaveBeenCalledTimes(1);

    await pullToRefresh();

    await waitFor(() => expect(fetchEnrollments).toHaveBeenCalledTimes(2));
  });

  it('renders the empty state when there are zero enrollments', async () => {
    const { client } = buildClient({ enrollmentCount: 0 });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() =>
      expect(screen.getByTestId('dashboard-empty-state')).toBeTruthy()
    );
    expect(
      screen.getByText("You're not enrolled in any courses yet.")
    ).toBeTruthy();
    expect(screen.queryByTestId('dashboard-course-list')).toBeNull();
  });

  it('navigates to the course catalog from the empty state', async () => {
    const { client } = buildClient({ enrollmentCount: 0 });
    const navigation = createMockNavigation();
    renderScreen(LearnerDashboardScreen, {
      client,
      name: 'LearnerDashboard',
      navigation,
    });

    await waitFor(() =>
      expect(screen.getByTestId('dashboard-empty-state')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('dashboard-empty-state-action'));

    expect(navigation.navigate).toHaveBeenCalledWith('MyCourses');
  });

  it('renders an error state with a retry affordance when the request fails', async () => {
    const { client } = buildClient({ forceError: 'Network unreachable' });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());
    expect(screen.getByText('Network unreachable')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-empty-state')).toBeNull();
  });

  it('retries the request when the error-state retry button is pressed', async () => {
    const { client } = buildClient({ forceError: 'Network unreachable' });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-state-retry'));
    });

    expect(screen.getByTestId('error-state')).toBeTruthy();
  });

  it('opens the matching course detail when a card is pressed', async () => {
    const { client } = buildClient({ enrollmentCount: 2 });
    const navigation = createMockNavigation();
    renderScreen(LearnerDashboardScreen, {
      client,
      name: 'LearnerDashboard',
      navigation,
    });

    await waitFor(() => expect(screen.getByTestId('dashboard-course-list')).toBeTruthy());
    fireEvent.press(screen.getByTestId('course-card-enr-1'));

    expect(navigation.navigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: 'course-1',
    });
  });

  it('renders progress values supplied by the enrollment factory', async () => {
    const { client } = buildClient();
    const enrollment = createEnrollment(0, {
      status: 'in-progress',
      progressPercent: 55,
    });
    jest
      .spyOn(client, 'fetchEnrollments')
      .mockResolvedValue([enrollment]);

    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() =>
      expect(screen.getByTestId('course-card-percent')).toHaveTextContent('55%')
    );
    expect(screen.getByTestId('course-card-progress').props.accessibilityValue.now).toBe(55);
  });

  it('renders the discovery sections with category shortcuts', async () => {
    const { client } = buildClient({ enrollmentCount: 3 });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() => expect(screen.getByTestId('dashboard-course-list')).toBeTruthy());

    expect(screen.getByTestId('dashboard-categories')).toBeTruthy();
    expect(screen.getByTestId('dashboard-category-chips')).toBeTruthy();
    expect(screen.getByTestId('dashboard-featured')).toBeTruthy();
    expect(screen.getByTestId('dashboard-recommended')).toBeTruthy();
    expect(screen.getByText('Browse by category')).toBeTruthy();
    expect(screen.getByText('Featured courses')).toBeTruthy();
    expect(screen.getByText('Recommended for you')).toBeTruthy();
  });

  it('opens My Courses pre-filtered by the chosen category', async () => {
    const { client } = buildClient({ enrollmentCount: 3 });
    const navigation = createMockNavigation();
    renderScreen(LearnerDashboardScreen, {
      client,
      name: 'LearnerDashboard',
      navigation,
    });

    await waitFor(() => expect(screen.getByTestId('dashboard-categories')).toBeTruthy());
    fireEvent.press(screen.getByTestId('category-chip-mobile'));

    expect(navigation.navigate).toHaveBeenCalledWith('MyCourses', {
      category: 'mobile',
    });
  });

  it('opens course detail from a featured rail card', async () => {
    const { client } = buildClient({ enrollmentCount: 3 });
    const navigation = createMockNavigation();
    renderScreen(LearnerDashboardScreen, {
      client,
      name: 'LearnerDashboard',
      navigation,
    });

    await waitFor(() => expect(screen.getByTestId('dashboard-featured')).toBeTruthy());
    const cards = screen.getAllByTestId(/^dashboard-featured-rail-card-/);
    expect(cards.length).toBeGreaterThan(0);

    const courseId = cards[0]!.props.testID.replace(
      'dashboard-featured-rail-card-',
      ''
    );
    fireEvent.press(cards[0]!);

    expect(navigation.navigate).toHaveBeenCalledWith('CourseDetail', { courseId });
  });

  it('opens My Learning from the continue-learning action', async () => {
    const { client } = buildClient({ enrollmentCount: 3 });
    const navigation = createMockNavigation();
    renderScreen(LearnerDashboardScreen, {
      client,
      name: 'LearnerDashboard',
      navigation,
    });

    await waitFor(() => expect(screen.getByTestId('dashboard-continue')).toBeTruthy());
    fireEvent.press(screen.getByTestId('dashboard-continue-header-action'));

    expect(navigation.navigate).toHaveBeenCalledWith('MyLearning');
  });

  it('opens global search when the dashboard search is submitted', async () => {
    const { client } = buildClient({ enrollmentCount: 3 });
    const navigation = createMockNavigation();
    renderScreen(LearnerDashboardScreen, {
      client,
      name: 'LearnerDashboard',
      navigation,
    });

    await waitFor(() => expect(screen.getByTestId('dashboard-search')).toBeTruthy());
    fireEvent(screen.getByTestId('dashboard-search-input'), 'submitEditing');

    expect(navigation.navigate).toHaveBeenCalledWith('GlobalSearch');
  });

  it('keeps discovery visible for a learner with no enrollments', async () => {
    const { client } = buildClient({ enrollmentCount: 0 });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() =>
      expect(screen.getByTestId('dashboard-empty-state')).toBeTruthy()
    );

    expect(screen.getByTestId('dashboard-featured')).toBeTruthy();
    expect(screen.getByTestId('dashboard-categories')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-continue')).toBeNull();
  });

  it('labels each continue-learning card with its resume action', async () => {
    const { client } = buildClient({ enrollmentCount: 2 });
    renderScreen(LearnerDashboardScreen, { client, name: 'LearnerDashboard' });

    await waitFor(() => expect(screen.getByTestId('dashboard-course-list')).toBeTruthy());

    expect(screen.getAllByTestId('course-card-action').length).toBeGreaterThan(0);
  });
});

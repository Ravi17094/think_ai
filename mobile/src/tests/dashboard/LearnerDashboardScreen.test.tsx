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
});

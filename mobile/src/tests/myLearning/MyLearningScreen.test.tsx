import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import { createMockApiClient } from '@/api/mockClient';
import { MyLearningScreen } from '@/screens/learner/MyLearningScreen';
import { createMockNavigation, renderScreen } from '@/tests/helpers';
import type { Enrollment } from '@/types';
import { getCourseCategoryId, getResumeLesson } from '@/utils/course';

const CARD_ID = /^my-learning-card-enr-\d+$/;

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ latencyMs: 0, ...options });
  return { client, fetchEnrollments: jest.spyOn(client, 'fetchEnrollments') };
}

/** Same seeded fixtures the screen will see for the given options. */
async function fixtureEnrollments(
  options: Parameters<typeof createMockApiClient>[0] = {}
): Promise<Enrollment[]> {
  const client = createMockApiClient({ latencyMs: 0, ...options });
  return client.fetchEnrollments();
}

async function pullToRefresh() {
  const scrollView = screen.UNSAFE_getByType(ScrollView);
  await act(async () => {
    scrollView.props.refreshControl.props.onRefresh();
  });
}

describe('MyLearningScreen', () => {
  it('shows a loading state before the shelf arrives', async () => {
    const { client } = buildClient();
    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });

    expect(screen.getByTestId('my-learning-loading')).toBeTruthy();
    await act(async () => {});
  });

  it('renders one resume card per enrollment with progress details', async () => {
    const { client } = buildClient();
    const enrollments = await fixtureEnrollments();

    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());

    expect(screen.queryAllByTestId(CARD_ID)).toHaveLength(enrollments.length);
    const first = enrollments[0]!;
    expect(screen.getAllByTestId('my-learning-card-title')[0]).toHaveTextContent(
      first.course.title
    );
    expect(
      screen.getAllByTestId('my-learning-card-instructor')[0]
    ).toHaveTextContent(first.course.instructor.name);
  });

  it('summarises enrolled, completed and finished lessons', async () => {
    const { client } = buildClient();
    const enrollments = await fixtureEnrollments();
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const lessonsDone = enrollments.reduce(
      (sum, enrollment) => sum + enrollment.completedLessons,
      0
    );

    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });
    await waitFor(() => expect(screen.getByTestId('my-learning-stats')).toBeTruthy());

    expect(screen.getByTestId('my-learning-stat-enrolled')).toHaveTextContent(
      String(enrollments.length)
    );
    expect(screen.getByTestId('my-learning-stat-lessons')).toHaveTextContent(
      String(lessonsDone)
    );
    expect(screen.getByTestId('my-learning-stat-completed')).toHaveTextContent(
      String(completed)
    );
    expect(
      screen.getByTestId('my-learning-header')
    ).toHaveTextContent(new RegExp(`${enrollments.length - completed} in progress`));
  });

  it('resumes the first incomplete lesson when a card is pressed', async () => {
    const { client } = buildClient();
    const enrollments = await fixtureEnrollments();
    const target = enrollments[0]!;
    const resumeLesson = getResumeLesson(target.course, target);
    const navigation = createMockNavigation();

    renderScreen(MyLearningScreen, { client, name: 'MyLearning', navigation });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());

    fireEvent.press(screen.getByTestId(`my-learning-card-${target.id}`));

    expect(navigation.navigate).toHaveBeenCalledWith('VideoPlayer', {
      courseId: target.courseId,
      lessonId: resumeLesson?.id,
    });
  });

  it('filters the shelf by title without another API request', async () => {
    const { client, fetchEnrollments } = buildClient();
    const enrollments = await fixtureEnrollments();
    const target = enrollments[0]!;

    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());
    expect(fetchEnrollments).toHaveBeenCalledTimes(1);

    fireEvent.changeText(
      screen.getByTestId('my-learning-search-input'),
      target.course.title
    );

    expect(screen.queryAllByTestId(CARD_ID)).toHaveLength(1);
    expect(screen.getByTestId('my-learning-card-title')).toHaveTextContent(
      target.course.title
    );
    expect(fetchEnrollments).toHaveBeenCalledTimes(1);
  });

  it('filters by completion status', async () => {
    const { client } = buildClient();
    const enrollments = await fixtureEnrollments();
    const completed = enrollments.filter((e) => e.status === 'completed');

    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());

    fireEvent.press(screen.getByTestId('my-learning-filter-tabs-completed'));

    expect(screen.queryAllByTestId(CARD_ID)).toHaveLength(completed.length);
    expect(
      screen.getByTestId('my-learning-filter-tabs-completed').props
        .accessibilityState
    ).toEqual({ selected: true });
  });

  it('filters by the category derived from course tags', async () => {
    const { client } = buildClient();
    const enrollments = await fixtureEnrollments();
    const category = getCourseCategoryId(enrollments[0]!.course);
    const expected = enrollments.filter(
      (enrollment) => getCourseCategoryId(enrollment.course) === category
    );

    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());

    fireEvent.press(screen.getByTestId(`category-chip-${category}`));

    expect(screen.queryAllByTestId(CARD_ID)).toHaveLength(expected.length);
    expect(
      screen.getByTestId(`category-chip-${category}`).props.accessibilityState
    ).toEqual({ selected: true });
  });

  it('shows a no-results state that keeps the shelf filters visible', async () => {
    const { client } = buildClient();
    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());

    fireEvent.changeText(
      screen.getByTestId('my-learning-search-input'),
      'zzz-no-such-course'
    );

    expect(screen.getByTestId('my-learning-no-results')).toBeTruthy();
    expect(screen.getByTestId('my-learning-filter-tabs')).toBeTruthy();
  });

  it('shows the empty state and links to the catalogue', async () => {
    const { client } = buildClient({ enrollmentCount: 0 });
    const navigation = createMockNavigation();
    renderScreen(MyLearningScreen, { client, name: 'MyLearning', navigation });

    await waitFor(() =>
      expect(screen.getByTestId('my-learning-empty-state')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('my-learning-empty-state-action'));

    expect(navigation.navigate).toHaveBeenCalledWith('MyCourses');
  });

  it('links to the catalogue from the header action', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();
    renderScreen(MyLearningScreen, { client, name: 'MyLearning', navigation });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());

    fireEvent.press(screen.getByTestId('my-learning-browse'));

    expect(navigation.navigate).toHaveBeenCalledWith('MyCourses');
  });

  it('re-fetches when pull-to-refresh is triggered', async () => {
    const { client, fetchEnrollments } = buildClient();
    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });
    await waitFor(() => expect(screen.getByTestId('my-learning-list')).toBeTruthy());
    expect(fetchEnrollments).toHaveBeenCalledTimes(1);

    await pullToRefresh();

    await waitFor(() => expect(fetchEnrollments).toHaveBeenCalledTimes(2));
  });

  it('surfaces an error state with retry', async () => {
    const { client } = buildClient({ forceError: 'Learning sync failed' });
    renderScreen(MyLearningScreen, { client, name: 'MyLearning' });

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());
    expect(screen.getByText('Learning sync failed')).toBeTruthy();
    expect(screen.queryByTestId('my-learning-list')).toBeNull();
  });
});

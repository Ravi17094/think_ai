import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createMockApiClient } from '@/api/mockClient';
import { VideoPlayerScreen } from '@/screens/learning/VideoPlayerScreen';
import { createMockNavigation, flushAllPendingWork, renderScreen } from '@/tests/helpers';
import type { Enrollment } from '@/types';
import { flattenLessons } from '@/utils/course';

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ latencyMs: 0, ...options });
  return { client };
}

/** First seeded enrollment, identical to what the screen will fetch. */
async function fixtureEnrollment(): Promise<Enrollment> {
  const client = createMockApiClient({ latencyMs: 0 });
  const enrollments = await client.fetchEnrollments();
  return enrollments[0]!;
}

function incompleteLesson(enrollment: Enrollment) {
  const completed = new Set(enrollment.completedLessonIds ?? []);
  return flattenLessons(enrollment.course).find(
    (lesson) => !completed.has(lesson.id)
  )!;
}

describe('VideoPlayerScreen', () => {
  it('shows a loading state before the course arrives', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId },
    });

    expect(screen.getByTestId('video-player-loading')).toBeTruthy();
    await act(async () => {});
  });

  it('renders the active lesson, course progress and full curriculum', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const lessons = flattenLessons(enrollment.course);
    const firstLesson = lessons[0]!;

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: firstLesson.id },
    });

    await waitFor(() => expect(screen.getByTestId('lesson-title')).toBeTruthy());

    expect(screen.getByTestId('lesson-title')).toHaveTextContent(firstLesson.title);
    expect(screen.getByTestId('lesson-description')).toHaveTextContent(
      firstLesson.description!
    );
    expect(
      screen.getByText(new RegExp(`Lesson 1 of ${lessons.length}`))
    ).toBeTruthy();
    expect(screen.getByTestId('course-progress')).toHaveTextContent(
      `${Math.round(enrollment.progressPercent)}%`
    );
    expect(screen.getByTestId('curriculum')).toBeTruthy();

    for (const lesson of lessons) {
      expect(screen.getByTestId(`curriculum-lesson-${lesson.id}`)).toBeTruthy();
    }
  });

  it('switches the active lesson from a curriculum row', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const lessons = flattenLessons(enrollment.course);
    const second = lessons[1]!;

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: lessons[0]!.id },
    });

    await waitFor(() => expect(screen.getByTestId('lesson-title')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId(`curriculum-lesson-${second.id}`));
    });

    expect(screen.getByTestId('lesson-title')).toHaveTextContent(second.title);
    expect(
      screen.getByTestId(`curriculum-lesson-${second.id}`).props.accessibilityState
    ).toEqual({ selected: true });
  });

  it('disables Previous on the first lesson and Next on the last', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const lessons = flattenLessons(enrollment.course);
    const first = lessons[0]!;
    const last = lessons[lessons.length - 1]!;

    const { unmount } = renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: first.id },
    });
    await waitFor(() => expect(screen.getByTestId('lesson-title')).toBeTruthy());

    expect(screen.getByTestId('previous-lesson').props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(screen.getByTestId('next-lesson').props.accessibilityState).toEqual({
      disabled: false,
    });

    unmount();
    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: last.id },
    });
    await waitFor(() => expect(screen.getByTestId('lesson-title')).toBeTruthy());

    expect(screen.getByTestId('previous-lesson').props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(screen.getByTestId('next-lesson').props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('moves to the next lesson and reports the new position', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const lessons = flattenLessons(enrollment.course);

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: lessons[0]!.id },
    });
    await waitFor(() => expect(screen.getByTestId('lesson-title')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('next-lesson'));
    });

    expect(screen.getByTestId('lesson-title')).toHaveTextContent(lessons[1]!.title);
    expect(
      screen.getByText(new RegExp(`Lesson 2 of ${lessons.length}`))
    ).toBeTruthy();
  });

  it('marks a lesson complete and recalculates course progress', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const target = incompleteLesson(enrollment);
    const total = flattenLessons(enrollment.course).length;
    const beforeCompleted = (enrollment.completedLessonIds ?? []).length;

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: target.id },
    });
    await waitFor(() => expect(screen.getByTestId('lesson-title')).toBeTruthy());
    expect(screen.queryByTestId('lesson-completed-badge')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('mark-complete'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('lesson-completed-badge')).toBeTruthy();
    const expected = Math.round(((beforeCompleted + 1) / total) * 100);
    expect(screen.getByTestId('course-progress')).toHaveTextContent(`${expected}%`);
    expect(screen.getByTestId('mark-complete')).toHaveTextContent(
      'Mark as incomplete'
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('mark-complete'));
    });
    await flushAllPendingWork();

    expect(screen.queryByTestId('lesson-completed-badge')).toBeNull();
    expect(screen.getByTestId('course-progress')).toHaveTextContent(
      `${Math.round(enrollment.progressPercent)}%`
    );
  });

  it('surfaces a lesson-progress save failure without losing the lesson', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const target = incompleteLesson(enrollment);
    jest
      .spyOn(client, 'updateLessonProgress')
      .mockRejectedValue(new Error('Progress save failed'));

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: target.id },
    });
    await waitFor(() => expect(screen.getByTestId('lesson-title')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('mark-complete'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('lesson-progress-error')).toHaveTextContent(
      'Progress save failed'
    );
    expect(screen.getByTestId('lesson-title')).toHaveTextContent(target.title);
    expect(screen.queryByTestId('lesson-completed-badge')).toBeNull();
  });

  it('toggles the preview play state with an accessible label', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId },
    });
    await waitFor(() => expect(screen.getByTestId('play-toggle')).toBeTruthy());

    expect(screen.getByTestId('play-toggle').props.accessibilityLabel).toBe(
      'Play preview'
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('play-toggle'));
    });
    expect(screen.getByTestId('play-toggle').props.accessibilityLabel).toBe(
      'Pause preview'
    );
  });

  it('shows the certificate link once the course is complete', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const lessonIds = flattenLessons(enrollment.course).map((lesson) => lesson.id);
    const completed: Enrollment = {
      ...enrollment,
      status: 'completed',
      progressPercent: 100,
      completedLessons: lessonIds.length,
      totalLessons: lessonIds.length,
      completedLessonIds: lessonIds,
    };
    jest.spyOn(client, 'fetchEnrollments').mockResolvedValue([completed]);
    const navigation = createMockNavigation();

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId },
      navigation,
    });
    await waitFor(() => expect(screen.getByTestId('view-certificate')).toBeTruthy());

    fireEvent.press(screen.getByTestId('view-certificate'));

    expect(navigation.navigate).toHaveBeenCalledWith('Certificate', {
      courseId: enrollment.courseId,
    });
    expect(screen.getByTestId('course-progress')).toHaveTextContent('100%');
  });

  it('opens the assessment from the player', async () => {
    const { client } = buildClient();
    const enrollment = await fixtureEnrollment();
    const navigation = createMockNavigation();

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId },
      navigation,
    });
    await waitFor(() => expect(screen.getByTestId('take-assessment')).toBeTruthy());

    fireEvent.press(screen.getByTestId('take-assessment'));

    expect(navigation.navigate).toHaveBeenCalledWith('Assessment', {
      assessmentId: enrollment.courseId,
    });
  });

  it('surfaces a course load error with a retry action', async () => {
    const { client } = buildClient({ forceError: 'Player offline' });

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: 'course-1' },
    });

    await waitFor(() =>
      expect(screen.getByTestId('video-player-error')).toBeTruthy()
    );
    expect(screen.getByText('Player offline')).toBeTruthy();
  });
});

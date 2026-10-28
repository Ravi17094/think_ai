import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createMockApiClient, type MockApiClient } from '@/api/mockClient';
import { CourseDetailScreen } from '@/screens/course/CourseDetailScreen';
import { createMockNavigation, renderScreen } from '@/tests/helpers';
import type { Course } from '@/types';

/** Ids handed out by the deterministic mock client. */
const ENROLLED_COURSE_ID = 'course-1';
const CATALOG_COURSE_ID = 'catalog-1';

function buildClient(options: Parameters<typeof createMockApiClient>[0] = {}) {
  const client = createMockApiClient({ latencyMs: 0, ...options });
  return { client, fetchCourse: jest.spyOn(client, 'fetchCourse') };
}

/**
 * Resolves the payload the screen will receive. A second, unspied client returns
 * identical data because the mock factories are seeded.
 */
async function courseFixture(courseId: string): Promise<Course> {
  const plain: MockApiClient = createMockApiClient({ latencyMs: 0 });
  return plain.fetchCourse(courseId);
}

describe('CourseDetailScreen', () => {
  it('shows a loading state before the course arrives', async () => {
    const { client } = buildClient();
    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
    });

    expect(screen.getByTestId('course-detail-loading')).toBeTruthy();
    await act(async () => {});
  });

  it('renders the hero banner with level, title and metadata', async () => {
    const { client } = buildClient();
    const course = await courseFixture(ENROLLED_COURSE_ID);

    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
    });

    await waitFor(() => expect(screen.getByTestId('hero-banner')).toBeTruthy());

    expect(screen.getByTestId('hero-banner-title')).toHaveTextContent(course.title);
    expect(screen.getByTestId('hero-banner-level')).toHaveTextContent(
      course.level.toUpperCase()
    );
    expect(screen.getByTestId('hero-banner-subtitle')).toHaveTextContent(
      course.subtitle
    );
    expect(
      screen.getByText(`${course.enrolledCount.toLocaleString()} learners`)
    ).toBeTruthy();
  });

  it('renders the description, tags, curriculum and instructor', async () => {
    const { client } = buildClient();
    const course = await courseFixture(ENROLLED_COURSE_ID);

    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
    });

    await waitFor(() => expect(screen.getByTestId('module-accordion')).toBeTruthy());

    expect(screen.getByText(course.description)).toBeTruthy();
    for (const tag of course.tags) {
      expect(screen.getByText(tag)).toBeTruthy();
    }
    expect(screen.getAllByTestId(/^module-accordion-header-\d$/)).toHaveLength(
      course.modules.length
    );
    expect(screen.getByTestId('instructor-card-name')).toHaveTextContent(
      course.instructor.name
    );
    expect(screen.getByTestId('instructor-card-bio')).toHaveTextContent(
      course.instructor.bio
    );
  });

  it('shows the enrolled state as a disabled button', async () => {
    const { client } = buildClient();
    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
    });

    await waitFor(() => expect(screen.getByTestId('course-detail-footer')).toBeTruthy());

    expect(screen.getByTestId('enroll-button-label')).toHaveTextContent('Enrolled');
    expect(screen.getByTestId('enroll-button').props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('exposes an active enroll button for a catalogue course', async () => {
    const { client } = buildClient();
    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: CATALOG_COURSE_ID },
    });

    await waitFor(() => expect(screen.getByTestId('course-detail-footer')).toBeTruthy());

    expect(screen.getByTestId('enroll-button-label')).toHaveTextContent('Enroll now');
    expect(screen.getByTestId('enroll-button').props.accessibilityState).toEqual({
      disabled: false,
    });
  });

  it('enters and leaves the submitting state when enrolling', async () => {
    const { client } = buildClient();
    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: CATALOG_COURSE_ID },
    });

    await waitFor(() => expect(screen.getByTestId('enroll-button')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('enroll-button'));
    });
    expect(screen.getByTestId('enroll-button-label')).toHaveTextContent('Enrolling…');

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('enroll-button-label')).toHaveTextContent('Enrolled');
    expect(screen.getByTestId('enrollment-confirmed')).toBeTruthy();
    expect(screen.getByTestId('play-video')).toBeTruthy();
  });

  it('auto-expands the module supplied by a deep link', async () => {
    const { client, fetchCourse } = buildClient();
    const course = await courseFixture(ENROLLED_COURSE_ID);
    const moduleId = course.modules[1]!.id;

    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID, moduleId },
    });

    await waitFor(() =>
      expect(screen.getByTestId('module-accordion-header-1')).toBeTruthy()
    );
    expect(fetchCourse).toHaveBeenCalledWith(ENROLLED_COURSE_ID);
    expect(
      screen.getByTestId('module-accordion-header-1').props.accessibilityState
    ).toEqual({ expanded: true });
  });

  it('leaves every module collapsed when the deep link omits moduleId', async () => {
    const { client } = buildClient();
    const course = await courseFixture(ENROLLED_COURSE_ID);

    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
    });

    await waitFor(() =>
      expect(screen.getAllByTestId(/^module-accordion-header-\d$/)).toHaveLength(
        course.modules.length
      )
    );
    for (const header of screen.getAllByTestId(/^module-accordion-header-\d$/)) {
      expect(header.props.accessibilityState).toEqual({ expanded: false });
    }
  });

  it('expands a module when its header is pressed', async () => {
    const { client } = buildClient();
    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
    });

    await waitFor(() =>
      expect(screen.getByTestId('module-accordion-header-0')).toBeTruthy()
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('module-accordion-header-0'));
      jest.advanceTimersByTime(220);
    });

    expect(
      screen.getByTestId('module-accordion-header-0').props.accessibilityState
    ).toEqual({ expanded: true });
  });

  it('surfaces an error state when the course cannot be loaded', async () => {
    const { client } = buildClient({ forceError: 'Course service unavailable' });
    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
    });

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());
    expect(screen.getByText('Course service unavailable')).toBeTruthy();
  });

  it('reports a missing course id instead of rendering silently', async () => {
    const { client } = buildClient();
    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: '' },
    });

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());
    expect(screen.getByText('This course link is missing a course id.')).toBeTruthy();
  });

  it('links onward to global search', async () => {
    const { client } = buildClient();
    const navigation = createMockNavigation();

    renderScreen(CourseDetailScreen, {
      client,
      name: 'CourseDetail',
      params: { courseId: ENROLLED_COURSE_ID },
      navigation,
    });

    await waitFor(() =>
      expect(screen.getByTestId('course-detail-search-link')).toBeTruthy()
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('course-detail-search-link'));
    });

    expect(navigation.navigate).toHaveBeenCalledWith('GlobalSearch');
  });
});
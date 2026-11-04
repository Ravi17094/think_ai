import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createMockApiClient } from '@/api/mockClient';
import { ModuleAccordion } from '@/components/course/ModuleAccordion';
import {
  CategoryChips,
  CourseRail,
  SectionHeader,
  SortChips,
} from '@/components/learner';
import { VideoPlayerScreen } from '@/screens/learning/VideoPlayerScreen';
import { minTouchTarget } from '@/theme/tokens';
import { createCourseFactory } from '@/mock/factories';
import { renderScreen } from '@/tests/helpers';
import { flattenLessons } from '@/utils/course';

const noop = () => undefined;
const createCourse = createCourseFactory(411);

/** Resolves a Pressable's `style` prop (object, array or callback) to one object. */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) {
    return {};
  }
  if (typeof style === 'function') {
    return flattenStyle(
      (style as (s: { pressed: boolean }) => unknown)({ pressed: false })
    );
  }
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return style as Record<string, unknown>;
}

describe('learner section accessibility', () => {
  it('headers the section title and labels its action', () => {
    const onAction = jest.fn();
    render(
      <SectionHeader
        actionLabel="View all"
        onAction={onAction}
        subtitle="Keep the streak going"
        title="Continue learning"
      />
    );

    expect(
      screen.getByText('Continue learning').props.accessibilityRole
    ).toBe('header');

    const action = screen.getByRole('button', { name: 'View all' });
    expect(action.props.accessibilityLabel).toBe('View all');
    expect(
      flattenStyle(action.props.style).minHeight
    ).toBeGreaterThanOrEqual(minTouchTarget);

    fireEvent.press(action);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('announces the selected category and hides the decorative glyph', () => {
    const onChange = jest.fn();
    render(
      <CategoryChips
        counts={{ all: 9 }}
        onChange={onChange}
        value="mobile"
      />
    );

    const selected = screen.getByTestId('category-chip-mobile');
    expect(selected.props.accessibilityState).toEqual({ selected: true });
    expect(selected.props.accessibilityLabel).toBe('Mobile Development');
    expect(
      flattenStyle(selected.props.style).minHeight
    ).toBeGreaterThanOrEqual(minTouchTarget);

    const all = screen.getByTestId('category-chip-all');
    expect(all.props.accessibilityLabel).toBe('All courses, 9 courses');
    const [icon] = within(all).UNSAFE_getAllByType(Text);
    expect(icon?.props.accessibilityElementsHidden).toBe(true);

    fireEvent.press(all);
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('groups the sort controls and marks the active option', () => {
    const onChange = jest.fn();
    render(<SortChips onChange={onChange} value="shortest" />);

    expect(screen.getByTestId('sort-chips').props.accessibilityLabel).toBe(
      'Sort courses'
    );

    const active = screen.getByTestId('sort-chip-shortest');
    expect(active.props.accessibilityState).toEqual({ selected: true });
    expect(
      flattenStyle(active.props.style).minHeight
    ).toBeGreaterThanOrEqual(minTouchTarget);

    fireEvent.press(screen.getByTestId('sort-chip-title'));
    expect(onChange).toHaveBeenCalledWith('title');
  });
});

describe('course card accessibility', () => {
  it('summarises each rail card and keeps the next card peeking at 375px', () => {
    const courses = [createCourse(0), createCourse(1)];
    const onSelect = jest.fn();
    render(<CourseRail courses={courses} onSelect={onSelect} />);

    const card = screen.getByTestId(`course-rail-card-${courses[0]!.id}`);
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toMatch(
      new RegExp(`${courses[0]!.title} by .+, rated \\d\\.\\d`)
    );

    const width = flattenStyle(card.props.style).width as number;
    expect(width).toBe(248);
    // At 375px the card leaves room for the next one to signal horizontal scroll.
    expect(width).toBeLessThan(375 - 32);

    fireEvent.press(card);
    expect(onSelect).toHaveBeenCalledWith(courses[0]);
  });

  it('labels completed lessons in the curriculum accordion', () => {
    const course = createCourse(0);
    const module = course.modules[0]!;
    const done = module.lessons[0]!;

    render(
      <ModuleAccordion
        completedLessonIds={[done.id]}
        modules={course.modules}
        onSelectLesson={noop}
      />
    );

    fireEvent.press(screen.getByTestId('module-accordion-header-0'));

    const completed = screen.getByTestId('module-accordion-lesson-0-0');
    expect(completed.props.accessibilityLabel).toBe(
      `${done.title}, ${done.durationMinutes} minutes, completed`
    );
    expect(within(completed).getByText(`✓ ${done.title}`)).toBeTruthy();
  });
});

describe('video player accessibility', () => {
  it('labels playback and lesson navigation controls', async () => {
    const client = createMockApiClient({ latencyMs: 0 });
    const enrollments = await client.fetchEnrollments();
    const enrollment = enrollments[0]!;
    const firstLesson = flattenLessons(enrollment.course)[0]!;

    renderScreen(VideoPlayerScreen, {
      client,
      name: 'VideoPlayer',
      params: { courseId: enrollment.courseId, lessonId: firstLesson.id },
    });

    await waitFor(() =>
      expect(screen.getByTestId('play-toggle')).toBeTruthy()
    );
    expect(screen.getByTestId('lesson-title')).toHaveTextContent(
      firstLesson.title
    );

    const playToggle = screen.getByTestId('play-toggle');
    expect(playToggle.props.accessibilityLabel).toBe('Play preview');
    expect(playToggle.props.accessibilityRole).toBe('button');
    const playStyle = flattenStyle(playToggle.props.style);
    expect(playStyle.width).toBeGreaterThanOrEqual(minTouchTarget);
    expect(playStyle.height).toBeGreaterThanOrEqual(minTouchTarget);

    const previous = screen.getByTestId('previous-lesson');
    expect(previous.props.accessibilityLabel).toBe('No previous lesson');
    expect(previous.props.accessibilityState).toEqual({ disabled: true });
    expect(previous.props.accessibilityRole).toBe('button');

    const next = screen.getByTestId('next-lesson');
    expect(next.props.accessibilityLabel).toMatch(/^Next lesson: .+/);
    expect(next.props.accessibilityState).toEqual({ disabled: false });

    const row = screen.getByTestId(`curriculum-lesson-${firstLesson.id}`);
    expect(row.props.accessibilityLabel).toMatch(
      new RegExp(`^${firstLesson.title}`)
    );
    expect(row.props.accessibilityState).toEqual({ selected: true });
  });
});

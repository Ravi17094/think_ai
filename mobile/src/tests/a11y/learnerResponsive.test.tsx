import { render, screen, within } from '@testing-library/react-native';

import {
  CategoryChips,
  CourseGrid,
  CourseRail,
  SectionHeader,
  SortChips,
} from '@/components/learner';
import { createCourseFactory } from '@/mock/factories';
import { hitSlop, minTouchTarget } from '@/theme/tokens';

const createCourse = createCourseFactory(505);
const noop = () => undefined;

const ANDROID_WIDTHS = [375, 390] as const;

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

describe.each(ANDROID_WIDTHS)('learner layout at %ipx', (width) => {
  it('keeps two readable grid columns with the expected card width', () => {
    const courses = Array.from({ length: 4 }, (_, index) => createCourse(index));
    render(<CourseGrid courses={courses} width={width} />);

    const firstRow = screen.getByTestId('course-grid-row-0');
    expect(within(firstRow).getAllByTestId(/^course-grid-card-/)).toHaveLength(2);

    const card = screen.getByTestId(`course-grid-card-${courses[0]!.id}`);
    expect(flattenStyle(card.props.style).width).toBe((width - 12) / 2);
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.hitSlop).toEqual(hitSlop);
  });

  it('leaves the next rail card peeking in from the right edge', () => {
    const courses = [createCourse(0), createCourse(1)];
    render(<CourseRail courses={courses} />);

    const card = screen.getByTestId(`course-rail-card-${courses[0]!.id}`);
    expect(flattenStyle(card.props.style).width).toBe(248);

    // Screen gutter (16px each side) + card must still leave space on a 375px
    // device, so the horizontal rail advertises that it scrolls.
    const visibleCardWidth = 248 + 16 * 2;
    expect(visibleCardWidth).toBeLessThan(width);
    expect(width - visibleCardWidth).toBeGreaterThanOrEqual(60);
  });

  it('keeps every learner chip and section action at a 44px target', () => {
    render(
      <>
        <SectionHeader actionLabel="View all" onAction={noop} title="Featured" />
        <CategoryChips onChange={noop} value="all" />
        <SortChips onChange={noop} value="recommended" />
      </>
    );

    expect(
      flattenStyle(screen.getByTestId('section-header-action').props.style)
        .minHeight
    ).toBeGreaterThanOrEqual(minTouchTarget);

    for (const testID of ['category-chip-all', 'category-chip-mobile']) {
      expect(
        flattenStyle(screen.getByTestId(testID).props.style).minHeight
      ).toBeGreaterThanOrEqual(minTouchTarget);
    }

    for (const option of ['recommended', 'highest-rated', 'shortest', 'title']) {
      expect(
        flattenStyle(screen.getByTestId(`sort-chip-${option}`).props.style)
          .minHeight
      ).toBeGreaterThanOrEqual(minTouchTarget);
    }
  });
});

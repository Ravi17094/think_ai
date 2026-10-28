import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { CourseGrid } from '@/components/learner/CourseGrid';
import { createCourseFactory } from '@/mock/factories';

const createCourse = createCourseFactory(303);

function renderGrid(width: number, count = 6) {
  const courses = Array.from({ length: count }, (_, i) => createCourse(i));
  const onSelect = jest.fn();
  const utils = render(
    <CourseGrid courses={courses} onSelect={onSelect} width={width} />
  );
  return { courses, onSelect, ...utils };
}

describe('CourseGrid', () => {
  it('renders every supplied course', () => {
    const { courses } = renderGrid(700, 6);
    courses.forEach((course) => {
      expect(screen.getByTestId(`course-grid-card-${course.id}`)).toBeTruthy();
    });
  });

  it('adapts the column count to the available width', () => {
    const { rerender, courses } = renderGrid(360, 6);

    const countCardsInFirstRow = () =>
      within(screen.getByTestId('course-grid-row-0')).getAllByTestId(
        /^course-grid-card-/
      ).length;

    // 360pt fits two 160pt columns.
    expect(countCardsInFirstRow()).toBe(2);

    rerender(<CourseGrid courses={courses} width={700} />);
    // 700pt hits the four-column cap.
    expect(countCardsInFirstRow()).toBe(4);

    rerender(<CourseGrid courses={courses} width={2000} maxColumns={2} />);
    // maxColumns is respected on very wide screens.
    expect(countCardsInFirstRow()).toBe(2);
  });

  it('keeps card widths consistent with the resolved column count', () => {
    const { courses } = renderGrid(700, 6);
    const width = screen
      .getByTestId(`course-grid-card-${courses[0]?.id}`)
      .props.style.find(
        (entry: { width?: number }) => typeof entry?.width === 'number'
      )?.width;

    // (700 - 3 gutters) / 4 columns
    expect(width).toBe((700 - 3 * 12) / 4);
  });

  it('uses a single column when the container is very narrow', () => {
    const { courses } = renderGrid(100, 2);
    const width = screen
      .getByTestId(`course-grid-card-${courses[0]?.id}`)
      .props.style.find((entry: { width?: number }) => typeof entry?.width === 'number')
      ?.width;
    expect(width).toBe(100);
  });

  it('reports the tapped course', () => {
    const { courses, onSelect } = renderGrid(700, 3);
    fireEvent.press(screen.getByTestId(`course-grid-card-${courses[1]?.id}`));
    expect(onSelect).toHaveBeenCalledWith(courses[1]);
  });

  it('renders nothing but the container for an empty list', () => {
    render(<CourseGrid courses={[]} width={700} />);
    expect(screen.getByTestId('course-grid')).toBeTruthy();
    expect(screen.queryByTestId(/^course-grid-card-/)).toBeNull();
  });
});

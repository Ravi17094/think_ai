import { fireEvent, render, screen } from '@testing-library/react-native';

import { CourseCard } from '@/components/learner/CourseCard';
import { createEnrollmentFactory } from '@/mock/factories';

const createEnrollment = createEnrollmentFactory(101);

type Overrides = Parameters<typeof createEnrollment>[1];

function setup(overrides: Overrides = {}) {
  const enrollment = createEnrollment(0, overrides);
  const onPress = jest.fn();
  render(<CourseCard enrollment={enrollment} onPress={onPress} />);
  return { enrollment, onPress };
}

describe('CourseCard', () => {
  it('renders the thumbnail and course title', () => {
    const { enrollment } = setup();

    expect(screen.getByTestId('course-card-thumbnail')).toBeTruthy();
    expect(screen.getByText(enrollment.course.title)).toBeTruthy();
  });

  it('renders a progress indicator reflecting progressPercent', () => {
    setup({ progressPercent: 42 });
    expect(screen.getByTestId('course-card-percent')).toHaveTextContent('42%');
  });

  it('renders a progress bar with the accessible completion value', () => {
    setup({ progressPercent: 60 });

    expect(screen.getByTestId('course-card-progress').props.accessibilityValue).toEqual({
      now: 60,
      min: 0,
      max: 100,
    });
  });

  it('labels completed enrollments as Completed', () => {
    setup({ status: 'completed', progressPercent: 100 });
    expect(screen.getByTestId('course-card-status')).toHaveTextContent('Completed');
  });

  it('labels not-started enrollments as Not started', () => {
    setup({ status: 'not-started', progressPercent: 0 });
    expect(screen.getByTestId('course-card-status')).toHaveTextContent('Not started');
  });

  it('labels in-progress enrollments as In progress', () => {
    setup({ status: 'in-progress', progressPercent: 30 });
    expect(screen.getByTestId('course-card-status')).toHaveTextContent('In progress');
  });

  it('shows lesson counts when the course has lessons', () => {
    const { enrollment } = setup();
    expect(
      screen.getByText(
        `${enrollment.completedLessons} of ${enrollment.totalLessons} lessons completed`
      )
    ).toBeTruthy();
  });

  it('falls back to a first-launch message when there are no lessons', () => {
    setup({ totalLessons: 0, completedLessons: 0 });
    expect(screen.getByText('Awaiting first lesson launch')).toBeTruthy();
  });

  it('invokes onPress with the enrollment when tapped', () => {
    const { enrollment, onPress } = setup();
    fireEvent.press(screen.getByTestId(`course-card-${enrollment.id}`));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(enrollment);
  });

  it('exposes an accessible label including the completion percentage', () => {
    const { enrollment } = setup({ progressPercent: 65 });
    expect(
      screen.getByLabelText(`${enrollment.course.title}, 65% complete`)
    ).toBeTruthy();
  });
});

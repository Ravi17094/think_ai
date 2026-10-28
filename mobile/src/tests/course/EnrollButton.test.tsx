import { fireEvent, render, screen } from '@testing-library/react-native';

import { EnrollButton } from '@/components/course/EnrollButton';

describe('EnrollButton', () => {
  it('offers enrollment when the learner is not enrolled', () => {
    render(<EnrollButton isEnrolled={false} />);

    expect(screen.getByTestId('enroll-button-label')).toHaveTextContent('Enroll now');
    expect(screen.getByTestId('enroll-button').props.accessibilityState).toEqual({
      disabled: false,
    });
  });

  it('calls onEnroll when pressed', () => {
    const onEnroll = jest.fn();
    render(<EnrollButton isEnrolled={false} onEnroll={onEnroll} />);

    fireEvent.press(screen.getByTestId('enroll-button'));

    expect(onEnroll).toHaveBeenCalledTimes(1);
  });

  it('is disabled with an explanatory label once enrolled', () => {
    const onEnroll = jest.fn();
    render(<EnrollButton isEnrolled onEnroll={onEnroll} />);

    const button = screen.getByTestId('enroll-button');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByTestId('enroll-button-label')).toHaveTextContent('Enrolled');

    fireEvent.press(button);
    expect(onEnroll).not.toHaveBeenCalled();
  });

  it('shows a busy state and blocks re-entry while submitting', () => {
    const onEnroll = jest.fn();
    render(<EnrollButton isEnrolled={false} isSubmitting onEnroll={onEnroll} />);

    expect(screen.getByTestId('enroll-button-label')).toHaveTextContent('Enrolling…');
    expect(screen.getByTestId('enroll-button').props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    fireEvent.press(screen.getByTestId('enroll-button'));
    expect(onEnroll).not.toHaveBeenCalled();
  });

  it('renders a spinner only while submitting an unenrolled course', () => {
    const { UNSAFE_getAllByType } = render(
      <EnrollButton isEnrolled={false} isSubmitting />
    );
    expect(UNSAFE_getAllByType(require('react-native').ActivityIndicator)).toHaveLength(1);

    const { UNSAFE_queryAllByType } = render(<EnrollButton isEnrolled isSubmitting />);
    expect(UNSAFE_queryAllByType(require('react-native').ActivityIndicator)).toHaveLength(0);
  });

  it('honours an explicit disabled prop', () => {
    render(<EnrollButton isEnrolled={false} disabled />);

    expect(screen.getByTestId('enroll-button').props.accessibilityState).toEqual({
      disabled: true,
    });
  });
});
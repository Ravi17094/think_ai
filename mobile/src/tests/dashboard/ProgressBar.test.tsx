import { Animated } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { ProgressBar } from '@/components/common/ProgressBar';

describe('ProgressBar', () => {
  it('renders the track with a progressbar role', () => {
    render(<ProgressBar progress={45} testID="bar" />);

    const bar = screen.getByTestId('bar');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ now: 45, min: 0, max: 100 });
  });

  it('clamps progress above 100', () => {
    render(<ProgressBar progress={140} testID="bar" />);
    expect(screen.getByTestId('bar').props.accessibilityValue.now).toBe(100);
  });

  it('clamps progress below 0', () => {
    render(<ProgressBar progress={-20} testID="bar" />);
    expect(screen.getByTestId('bar').props.accessibilityValue.now).toBe(0);
  });

  it('treats a non-finite progress value as 0', () => {
    render(<ProgressBar progress={Number.NaN} testID="bar" />);
    expect(screen.getByTestId('bar').props.accessibilityValue.now).toBe(0);
  });

  it('renders a rounded fill that maps 0–100 onto 0%–100% width', () => {
    render(<ProgressBar animated={false} height={10} progress={60} testID="bar" />);

    const fill = screen.getByTestId('bar-fill');
    // height/2 keeps the fill pill-shaped, matching the track.
    expect(fill).toHaveStyle({ borderRadius: 5 });
  });

  it('drives the fill with Animated.timing when animated', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');

    render(<ProgressBar durationMs={600} progress={75} testID="bar" />);

    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 75,
        duration: 600,
        useNativeDriver: false,
      })
    );

    timingSpy.mockRestore();
  });

  it('uses a custom accessibility label when supplied', () => {
    render(<ProgressBar accessibilityLabel="Course A" progress={10} />);
    expect(screen.getByLabelText('Course A')).toBeTruthy();
  });

  it('defaults the accessibility label to a rounded percentage', () => {
    render(<ProgressBar progress={33.4} />);
    expect(screen.getByLabelText('33% complete')).toBeTruthy();
  });
});

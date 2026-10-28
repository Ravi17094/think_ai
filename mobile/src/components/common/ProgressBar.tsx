import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { palette, radii } from '@/theme/tokens';

export interface ProgressBarProps {
  /** Clamped to 0–100 internally. */
  progress: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  animated?: boolean;
  durationMs?: number;
  testID?: string;
  accessibilityLabel?: string;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

/**
 * Progress bar with an animated fill. When `animated` is false the fill is set
 * directly, which keeps list scrolling cheap and makes assertions deterministic.
 */
export function ProgressBar({
  progress,
  height = 8,
  trackColor = palette.surfaceMuted,
  fillColor = palette.brand,
  animated = true,
  durationMs = 600,
  testID = 'progress-bar',
  accessibilityLabel,
}: ProgressBarProps) {
  const target = clampPercent(progress);
  const width = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    if (!animated) {
      width.setValue(target);
      return undefined;
    }
    const animation = Animated.timing(width, {
      toValue: target,
      duration: durationMs,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animated, durationMs, target, width]);

  return (
    <View
      accessibilityLabel={
        accessibilityLabel ?? `${Math.round(target)}% complete`
      }
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(target), min: 0, max: 100 }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor },
      ]}
      testID={testID}>
      <Animated.View
        testID={`${testID}-fill`}
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            borderRadius: height / 2,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  fill: {
    height: '100%',
  },
});

export default ProgressBar;

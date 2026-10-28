import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export interface LoadingStateProps {
  /** Number of shimmer placeholders to render. */
  rows?: number;
  label?: string;
  testID?: string;
}

export function LoadingState({
  rows = 3,
  label = 'Loading…',
  testID = 'loading-state',
}: LoadingStateProps) {
  const shimmer = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View accessibilityLabel={label} testID={testID}>
      {Array.from({ length: rows }, (_, index) => (
        <Animated.View
          key={index}
          style={[styles.row, { opacity: shimmer }]}
          testID={`${testID}-row-${index + 1}`}>
          <View style={styles.thumb} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: '70%' }]} />
            <View style={[styles.line, { width: '45%' }]} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
        </Animated.View>
      ))}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  thumb: {
    width: 72,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
    marginRight: spacing.md,
  },
  lines: {
    flex: 1,
    gap: spacing.xs,
  },
  line: {
    height: 10,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceMuted,
  },
  lineShort: {
    width: '30%',
  },
  label: {
    ...typography.caption,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default LoadingState;

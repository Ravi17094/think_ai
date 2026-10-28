import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radii } from '@/theme/tokens';

export interface SkeletonProps {
  /** Fixed width, or a percentage string such as `'70%'`. Defaults to `'100%'`. */
  width?: number | `${number}%`;
  height?: number;
  /** Corner radius. Defaults to the small token radius. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Shimmering placeholder block. Page-level skeletons compose these to mirror
 * the layout that is loading, so content swaps in without a jump.
 */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = radii.sm,
  style,
  testID = 'skeleton',
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View
      accessibilityElementsHidden
      testID={testID}
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity: shimmer },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: palette.surfaceMuted,
  },
});

export default Skeleton;

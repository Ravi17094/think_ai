import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typography } from '@/theme/tokens';
import type { Course } from '@/types';

export interface HeroBannerProps {
  course: Course;
  height?: number;
  testID?: string;
}

export function HeroBanner({
  course,
  height = 220,
  testID = 'hero-banner',
}: HeroBannerProps) {
  const hours = Math.round(course.durationMinutes / 60);

  return (
    <ImageBackground
      accessibilityIgnoresInvertColors
      imageStyle={styles.image}
      source={{ uri: course.thumbnailUrl }}
      style={[styles.container, { height }]}
      testID={`${testID}-image`}>
      <View style={styles.scrim} />
      <View style={styles.content} testID={testID}>
        <Text style={styles.level} testID={`${testID}-level`}>
          {course.level.toUpperCase()}
        </Text>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID={`${testID}-title`}>
          {course.title}
        </Text>
        <Text style={styles.subtitle} testID={`${testID}-subtitle`}>
          {course.subtitle}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            ⏱ {hours}h {course.durationMinutes % 60}m
          </Text>
          <Text style={styles.meta}>★ {course.rating.toFixed(1)}</Text>
          <Text style={styles.meta}>
            {course.enrolledCount.toLocaleString()} learners
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: palette.surfaceMuted,
  },
  image: {
    resizeMode: 'cover',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 16, 32, 0.72)',
  },
  content: {
    padding: spacing.md,
    gap: spacing.xxs,
  },
  level: {
    ...typography.caption,
    color: palette.accent,
    letterSpacing: 1,
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: palette.textMuted,
  },
});

export default HeroBanner;

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/common';
import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { Enrollment } from '@/types';

export interface CourseCardProps {
  enrollment: Enrollment;
  onPress?: (enrollment: Enrollment) => void;
  testID?: string;
}

const THUMB_HEIGHT = 140;

function statusLabel(enrollment: Enrollment): string {
  if (enrollment.status === 'completed') {
    return 'Completed';
  }
  if (enrollment.status === 'not-started') {
    return 'Not started';
  }
  return 'In progress';
}

export function CourseCard({
  enrollment,
  onPress,
  testID = 'course-card',
}: CourseCardProps) {
  const { course } = enrollment;
  const progress = enrollment.progressPercent;

  const subtitle =
    enrollment.totalLessons > 0
      ? `${enrollment.completedLessons} of ${enrollment.totalLessons} lessons completed`
      : 'Awaiting first lesson launch';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, ${Math.round(progress)}% complete`}
      hitSlop={hitSlop}
      onPress={() => onPress?.(enrollment)}
      style={styles.card}
      testID={`${testID}-${enrollment.id}`}>
      <View style={styles.thumbWrap}>
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: course.thumbnailUrl }}
          style={styles.thumb}
          testID={`${testID}-thumbnail`}
        />
        <View style={styles.statusBadge} testID={`${testID}-status`}>
          <Text style={styles.statusBadgeText}>{statusLabel(enrollment)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title} testID={`${testID}-title`}>
          {course.title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {course.subtitle}
        </Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressPercent} testID={`${testID}-percent`}>
            {Math.round(progress)}%
          </Text>
          <Text style={styles.progressMeta} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <ProgressBar
          accessibilityLabel={`${course.title} progress`}
          progress={progress}
          testID={`${testID}-progress`}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  thumbWrap: {
    height: THUMB_HEIGHT,
    backgroundColor: palette.surfaceMuted,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(11, 16, 32, 0.82)',
  },
  statusBadgeText: {
    ...typography.caption,
    color: palette.textPrimary,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: palette.textMuted,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  progressPercent: {
    ...typography.mono,
    color: palette.accent,
  },
  progressMeta: {
    ...typography.caption,
    color: palette.textSecondary,
    flexShrink: 1,
  },
});

export default CourseCard;

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/common';
import type { Palette } from '@/theme/tokens';
import { hitSlop, radii, spacing, typography } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Enrollment } from '@/types';
import { formatRating } from '@/utils/course';

export interface CourseCardProps {
  enrollment: Enrollment;
  onPress?: (enrollment: Enrollment) => void;
  /** Visible call to action under the progress bar. */
  actionLabel?: string;
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
  actionLabel,
  testID = 'course-card',
}: CourseCardProps) {
  const styles = useThemedStyles(createStyles);
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
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.instructor} testID={`${testID}-instructor`}>
            {course.instructor.name}
          </Text>
          <Text style={styles.rating} testID={`${testID}-rating`}>
            ★ {formatRating(course.rating)}
          </Text>
        </View>

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
        {actionLabel ? (
          <Text style={styles.actionLabel} testID={`${testID}-action`}>
            {actionLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
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
    color: '#F1F3F9',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  instructor: {
    ...typography.caption,
    color: palette.textSecondary,
    flexShrink: 1,
  },
  rating: {
    ...typography.caption,
    color: palette.warning,
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
  actionLabel: {
    ...typography.caption,
    color: palette.accent,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
});

export default CourseCard;

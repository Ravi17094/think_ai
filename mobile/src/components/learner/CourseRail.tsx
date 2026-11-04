import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { radii, spacing, typography } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Course } from '@/types';
import {
  formatDuration,
  formatLevel,
  formatRating,
  getCourseCategory,
} from '@/utils/course';

export interface CourseRailProps {
  courses: Course[];
  onSelect?: (course: Course) => void;
  testID?: string;
}

const CARD_WIDTH = 248;

/**
 * Horizontally scrollable course cards used for the featured row.
 * Card width is deliberately capped so a 375px device shows the next card
 * peeking in, signalling that the rail scrolls.
 */
export function CourseRail({
  courses,
  onSelect,
  testID = 'course-rail',
}: CourseRailProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}>
      {courses.map((course) => (
        <Pressable
          accessibilityLabel={`${course.title} by ${course.instructor.name}, rated ${formatRating(
            course.rating
          )}`}
          accessibilityRole="button"
          key={course.id}
          onPress={() => onSelect?.(course)}
          style={styles.card}
          testID={`${testID}-card-${course.id}`}>
          <View style={styles.imageWrap}>
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: course.thumbnailUrl }}
              style={styles.image}
              testID={`${testID}-thumbnail-${course.id}`}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>
                {getCourseCategory(course).label}
              </Text>
            </View>
          </View>
          <View style={styles.body}>
            <Text numberOfLines={2} style={styles.title}>
              {course.title}
            </Text>
            <Text numberOfLines={1} style={styles.instructor}>
              {course.instructor.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.rating}>★ {formatRating(course.rating)}</Text>
              <Text style={styles.meta}>
                {formatLevel(course.level)} · {formatDuration(course.durationMinutes)}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    overflow: 'hidden',
  },
  imageWrap: {
    height: 128,
    backgroundColor: palette.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    left: spacing.xs,
    top: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(11, 16, 32, 0.82)',
  },
  badgeLabel: {
    ...typography.caption,
    color: '#F1F3F9',
  },
  body: {
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  title: {
    ...typography.label,
    color: palette.textPrimary,
  },
  instructor: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  rating: {
    ...typography.caption,
    color: palette.warning,
  },
  meta: {
    ...typography.caption,
    color: palette.textMuted,
  },
});

export default CourseRail;

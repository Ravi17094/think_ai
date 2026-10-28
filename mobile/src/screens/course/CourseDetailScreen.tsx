import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState, ScreenHeader } from '@/components/common';
import {
  EnrollButton,
  HeroBanner,
  InstructorCard,
  ModuleAccordion,
} from '@/components/course';
import { useCourseDetail } from '@/hooks/useCourseDetail';
import type { ScreenProps } from '@/navigation/types';
import { palette, spacing, typography } from '@/theme/tokens';

export function CourseDetailScreen({
  route,
  navigation,
}: ScreenProps<'CourseDetail'>) {
  const { courseId, moduleId } = route.params;
  const {
    course,
    isLoading,
    hasError,
    error,
    initialModuleId,
    setInitialModuleId,
    refresh,
  } = useCourseDetail(courseId, moduleId);

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [justEnrolled, setJustEnrolled] = useState(false);

  const handleEnroll = useCallback(() => {
    setIsEnrolling(true);
    // Enrollment mutation lands with the OpenAPI contract; the button state
    // machine is already complete so wiring the call is a one-line change.
    setTimeout(() => {
      setIsEnrolling(false);
      setJustEnrolled(true);
    }, 400);
  }, []);

  const enrolled = course?.isEnrolled === true || justEnrolled;

  if (hasError) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea} testID="course-detail">
        <ScreenHeader title="Course" />
        <View style={styles.section}>
          <ErrorState message={error ?? 'Unable to load this course.'} onRetry={refresh} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !course) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea} testID="course-detail">
        <ScreenHeader title="Course" />
        <View style={styles.section}>
          <LoadingState rows={4} testID="course-detail-loading" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea} testID="course-detail">
      <ScrollView contentContainerStyle={styles.content} testID="course-detail-scroll-view">
        <HeroBanner course={course} />

        <View style={styles.section}>
          <Text style={styles.aboutLabel}>About this course</Text>
          <Text style={styles.about}>{course.description}</Text>
          <View style={styles.tagRow}>
            {course.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Curriculum</Text>
          <ModuleAccordion
            initiallyExpandedId={initialModuleId}
            modules={course.modules}
            onToggle={(id) => setInitialModuleId(id)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructor</Text>
          <InstructorCard instructor={course.instructor} />
        </View>
      </ScrollView>

      <View style={styles.footer} testID="course-detail-footer">
        <EnrollButton
          isEnrolled={enrolled}
          isSubmitting={isEnrolling}
          onEnroll={handleEnroll}
        />
        {justEnrolled ? (
          <Text style={styles.confirmed} testID="enrollment-confirmed">
            You&apos;re enrolled. Start with the first lesson.
          </Text>
        ) : null}
        {enrolled ? (
          <View style={styles.learningActions}>
            <Text
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('VideoPlayer', { courseId: course.id })
              }
              style={styles.learningLink}
              testID="play-video">
              Play first lesson
            </Text>
            <Text
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('Assessment', { assessmentId: course.id })
              }
              style={styles.learningLink}
              testID="take-assessment">
              Take assessment
            </Text>
          </View>
        ) : null}
        <Text
          accessibilityRole="button"
          onPress={() => navigation.navigate('Checkout', { courseId: course.id })}
          style={styles.relatedLink}
          testID="go-to-checkout">
          Buy this course
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() => navigation.navigate('GlobalSearch')}
          style={styles.relatedLink}
          testID="course-detail-search-link">
          Search related lessons
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  aboutLabel: {
    ...typography.label,
    color: palette.accent,
  },
  about: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: spacing.xxs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
    backgroundColor: palette.surfaceMuted,
  },
  tagText: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: palette.textPrimary,
    marginBottom: spacing.sm,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
    gap: spacing.xs,
  },
  relatedLink: {
    ...typography.caption,
    color: palette.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  confirmed: {
    ...typography.caption,
    color: palette.success,
    textAlign: 'center',
  },
  learningActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  learningLink: {
    ...typography.label,
    color: palette.accent,
    paddingVertical: spacing.xs,
  },
});

export default CourseDetailScreen;

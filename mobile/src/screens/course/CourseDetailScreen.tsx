import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ErrorState,
  LoadingState,
  ProgressBar,
  ScreenHeader,
} from '@/components/common';
import {
  EnrollButton,
  HeroBanner,
  InstructorCard,
  ModuleAccordion,
} from '@/components/course';
import { useCourseDetail } from '@/hooks/useCourseDetail';
import { useEnrollments } from '@/hooks/useEnrollments';
import { toErrorMessage } from '@/hooks/useAsyncResource';
import type { ScreenProps } from '@/navigation/types';
import {radii, spacing, typography} from '@/theme/tokens';
import type { Enrollment, Lesson } from '@/types';
import {
  formatDuration,
  formatLevel,
  formatRating,
  getLearningObjectives,
  getResumeLesson,
} from '@/utils/course';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';

/** Keeps the existing 400 ms enrolling transition (and its tests) intact. */
export const ENROLL_TRANSITION_MS = 400;

export function CourseDetailScreen({
  route,
  navigation,
}: ScreenProps<'CourseDetail'>) {
  const styles = useThemedStyles(createStyles);
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

  const { getEnrollment, enrollCourse } = useEnrollments();
  const enrollment = getEnrollment(courseId);

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [justEnrolled, setJustEnrolled] = useState(false);
  const [localEnrollment, setLocalEnrollment] = useState<Enrollment | null>(
    null
  );
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const pendingEnrollment = useRef<Enrollment | null>(null);
  const enrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (enrollTimer.current) {
        clearTimeout(enrollTimer.current);
      }
    },
    []
  );

  const effectiveEnrollment = localEnrollment ?? enrollment;
  const enrolled =
    course?.isEnrolled === true || justEnrolled || localEnrollment !== null;

  const handleEnroll = useCallback(async () => {
    if (isEnrolling || enrolled) {
      return;
    }
    setIsEnrolling(true);
    setEnrollError(null);

    try {
      const result = await enrollCourse(courseId);
      pendingEnrollment.current = result;
      // Hold the submitting state for the same window the previous stub used
      // so the transition is visible and the button cannot double-submit.
      enrollTimer.current = setTimeout(() => {
        setLocalEnrollment(pendingEnrollment.current);
        setJustEnrolled(true);
        setIsEnrolling(false);
      }, ENROLL_TRANSITION_MS);
    } catch (enrollFailure) {
      setEnrollError(toErrorMessage(enrollFailure));
      setIsEnrolling(false);
    }
  }, [courseId, enrolled, enrollCourse, isEnrolling]);

  const objectives = useMemo(
    () => (course ? getLearningObjectives(course) : []),
    [course]
  );

  const resumeLesson = useMemo(
    () => (course ? getResumeLesson(course, effectiveEnrollment ?? undefined) : null),
    [course, effectiveEnrollment]
  );

  const openLesson = useCallback(
    (lesson: Lesson) => {
      navigation.navigate('VideoPlayer', {
        courseId,
        lessonId: lesson.id,
      });
    },
    [courseId, navigation]
  );

  const progressPercent = effectiveEnrollment?.progressPercent ?? 0;
  const completedLessons = effectiveEnrollment?.completedLessons ?? 0;
  const totalLessons = effectiveEnrollment?.totalLessons ?? 0;

  if (hasError) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.safeArea}
        testID="course-detail">
        <ScreenHeader title="Course" />
        <View style={styles.section}>
          <ErrorState
            message={error ?? 'Unable to load this course.'}
            onRetry={refresh}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !course) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.safeArea}
        testID="course-detail">
        <ScreenHeader title="Course" />
        <View style={styles.section}>
          <LoadingState rows={4} testID="course-detail-loading" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="course-detail">
      <ScrollView
        contentContainerStyle={styles.content}
        testID="course-detail-scroll-view">
        <HeroBanner course={course} />

        <View style={styles.metaRow} testID="course-detail-meta">
          <Text style={styles.meta} testID="course-detail-rating">
            ★ {formatRating(course.rating)}
          </Text>
          <Text style={styles.meta}>{formatLevel(course.level)}</Text>
          <Text style={styles.meta}>{formatDuration(course.durationMinutes)}</Text>
        </View>

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

        <View style={styles.section} testID="course-objectives">
          <Text style={styles.sectionTitle}>What you'll learn</Text>
          {objectives.map((objective) => (
            <View key={objective} style={styles.objective}>
              <Text style={styles.objectiveBullet}>✓</Text>
              <Text style={styles.objectiveText}>{objective}</Text>
            </View>
          ))}
        </View>

        {enrolled ? (
          <View style={styles.section} testID="course-progress">
            <View style={styles.progressHeader}>
              <Text style={styles.sectionTitle}>Your progress</Text>
              <Text style={styles.progressPercent} testID="course-progress-percent">
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <ProgressBar
              accessibilityLabel={`${course.title} progress`}
              progress={progressPercent}
              testID="course-progress-bar"
            />
            <Text style={styles.progressMeta} testID="course-progress-meta">
              {completedLessons} of {totalLessons} lessons completed
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Curriculum</Text>
          <ModuleAccordion
            completedLessonIds={effectiveEnrollment?.completedLessonIds ?? []}
            initiallyExpandedId={initialModuleId}
            modules={course.modules}
            onSelectLesson={openLesson}
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
        {enrollError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.enrollError}
            testID="enrollment-error">
            {enrollError}
          </Text>
        ) : null}
        {justEnrolled ? (
          <Text style={styles.confirmed} testID="enrollment-confirmed">
            You&apos;re enrolled. Start with the first lesson.
          </Text>
        ) : null}
        {enrolled ? (
          <View style={styles.learningActions}>
            <Pressable
              accessibilityLabel={
                resumeLesson
                  ? `Continue with ${resumeLesson.title}`
                  : 'Continue learning'
              }
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('VideoPlayer', {
                  courseId: course.id,
                  lessonId: resumeLesson?.id,
                })
              }
              style={styles.continueButton}
              testID="continue-learning">
              <Text style={styles.continueLabel}>Continue learning</Text>
            </Pressable>
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
          onPress={() =>
            navigation.navigate('Checkout', { courseId: course.id })
          }
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

const createStyles = (palette: Palette) => StyleSheet.create({
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  meta: {
    ...typography.caption,
    color: palette.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
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
  objective: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  objectiveBullet: {
    ...typography.body,
    color: palette.success,
  },
  objectiveText: {
    ...typography.body,
    color: palette.textSecondary,
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPercent: {
    ...typography.subtitle,
    color: palette.accent,
    marginBottom: spacing.sm,
  },
  progressMeta: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: spacing.xxs,
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
  enrollError: {
    ...typography.caption,
    color: palette.danger,
    textAlign: 'center',
  },
  learningActions: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  continueButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  continueLabel: {
    ...typography.label,
    color: palette.accent,
  },
  learningLink: {
    ...typography.label,
    color: palette.accent,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});

export default CourseDetailScreen;

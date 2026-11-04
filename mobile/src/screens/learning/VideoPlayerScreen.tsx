import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ErrorState,
  LoadingState,
  ProgressBar,
  ScreenHeader,
} from '@/components/common';
import { useCourseDetail } from '@/hooks/useCourseDetail';
import { useEnrollments } from '@/hooks/useEnrollments';
import { toErrorMessage } from '@/hooks/useAsyncResource';
import type { ScreenProps } from '@/navigation/types';
import {hitSlop, radii, spacing, typography} from '@/theme/tokens';
import type { Lesson } from '@/types';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { useTheme } from '@/theme/ThemeProvider';
import {
  findLesson,
  findLessonModule,
  flattenLessons,
  getAdjacentLessons,
  getResumeLesson,
} from '@/utils/course';

export function VideoPlayerScreen({
  navigation,
  route,
}: ScreenProps<'VideoPlayer'>) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useTheme();
  const { courseId } = route.params;
  const {
    course,
    isLoading,
    hasError,
    error,
    refresh,
  } = useCourseDetail(courseId);

  const { getEnrollment, updateLessonProgress } = useEnrollments();
  const enrollment = getEnrollment(courseId);

  const [activeLessonId, setActiveLessonId] = useState<string | undefined>(
    route.params.lessonId
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setUpdateError(null);
  }, [activeLessonId]);

  const lessons = useMemo(() => (course ? flattenLessons(course) : []), [course]);

  const currentLesson = useMemo<Lesson | null>(() => {
    if (!course) {
      return null;
    }
    return (
      findLesson(course, activeLessonId) ??
      getResumeLesson(course, enrollment ?? undefined) ??
      lessons[0] ??
      null
    );
  }, [activeLessonId, course, enrollment, lessons]);

  const currentModule = useMemo(
    () =>
      course && currentLesson
        ? findLessonModule(course, currentLesson.id)
        : null,
    [course, currentLesson]
  );

  const adjacency = useMemo(
    () =>
      course && currentLesson
        ? getAdjacentLessons(course, currentLesson.id)
        : { previous: null, next: null },
    [course, currentLesson]
  );

  const completedLessonIds = useMemo(
    () => new Set(enrollment?.completedLessonIds ?? []),
    [enrollment]
  );

  const completedCount = completedLessonIds.size;
  const totalLessons = lessons.length;
  const courseProgress =
    enrollment?.progressPercent ??
    (totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0);

  const isCurrentComplete = currentLesson
    ? completedLessonIds.has(currentLesson.id)
    : false;

  const selectLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
  }, []);

  const toggleComplete = useCallback(async () => {
    if (!currentLesson || isUpdating) {
      return;
    }
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await updateLessonProgress({
        courseId,
        lessonId: currentLesson.id,
        completed: !isCurrentComplete,
      });
    } catch (updateFailure) {
      setUpdateError(toErrorMessage(updateFailure));
    } finally {
      setIsUpdating(false);
    }
  }, [
    courseId,
    currentLesson,
    isCurrentComplete,
    isUpdating,
    updateLessonProgress,
  ]);

  if (hasError) {
    return (
      <SafeAreaView style={styles.safeArea} testID="video-player">
        <View style={styles.section}>
          <ErrorState
            message={error ?? 'Unable to load this lesson.'}
            onRetry={refresh}
            testID="video-player-error"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !course || !currentLesson) {
    return (
      <SafeAreaView style={styles.safeArea} testID="video-player">
        <View style={styles.section}>
          <LoadingState rows={4} testID="video-player-loading" />
        </View>
      </SafeAreaView>
    );
  }

  const currentIndex = lessons.findIndex(
    (lesson) => lesson.id === currentLesson.id
  );

  return (
    <SafeAreaView style={styles.safeArea} testID="video-player">
      <ScrollView
        contentContainerStyle={styles.content}
        testID="video-player-scroll-view">
        <ScreenHeader
          subtitle={`${
            currentModule ? `${currentModule.title} · ` : ''
          }Lesson ${currentIndex + 1} of ${totalLessons}`}
          title={course.title}
          testID="video-player-header"
        />

        <View style={styles.progressWrap}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Course progress</Text>
            <Text style={styles.progressValue} testID="course-progress">
              {Math.round(courseProgress)}%
            </Text>
          </View>
          <ProgressBar
            accessibilityLabel={`${course.title} progress`}
            progress={courseProgress}
            testID="course-progress-bar"
          />
        </View>

        <View style={styles.stage} testID="lesson-stage">
          <Text style={styles.stageType}>
            {currentLesson.type.toUpperCase()} LESSON
          </Text>
          <Pressable
            accessibilityLabel={isPlaying ? 'Pause preview' : 'Play preview'}
            accessibilityRole="button"
            onPress={() => setIsPlaying((playing) => !playing)}
            style={styles.playButton}
            testID="play-toggle">
            <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
          </Pressable>
          <Text style={styles.stageMeta} testID="lesson-duration">
            {currentLesson.durationMinutes} min
            {isCurrentComplete ? ' · Completed' : ''}
          </Text>
          <View style={styles.lessonProgressWrap}>
            <ProgressBar
              animated={false}
              fillColor={palette.success}
              progress={isCurrentComplete ? 100 : isPlaying ? 40 : 0}
              testID="lesson-progress"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.lessonTitle} testID="lesson-title">
            {currentLesson.title}
          </Text>
          <Text style={styles.lessonDescription} testID="lesson-description">
            {currentLesson.description ??
              'Work through this lesson at your own pace, then mark it complete to update your course progress.'}
          </Text>

          {isCurrentComplete ? (
            <View style={styles.completedBadge} testID="lesson-completed-badge">
              <Text style={styles.completedLabel}>✓ Lesson completed</Text>
            </View>
          ) : null}

          {updateError ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.errorText}
              testID="lesson-progress-error">
              {updateError}
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel={
              isUpdating
                ? 'Saving lesson progress'
                : isCurrentComplete
                  ? 'Mark lesson incomplete'
                  : 'Mark lesson complete'
            }
            accessibilityRole="button"
            accessibilityState={{ busy: isUpdating || undefined }}
            disabled={isUpdating}
            onPress={toggleComplete}
            style={[
              styles.completeButton,
              isCurrentComplete && styles.completeButtonDone,
            ]}
            testID="mark-complete">
            <Text
              style={[
                styles.completeLabel,
                isCurrentComplete && styles.completeLabelDone,
              ]}>
              {isUpdating
                ? 'Saving…'
                : isCurrentComplete
                  ? 'Mark as incomplete'
                  : 'Mark lesson complete'}
            </Text>
          </Pressable>

          <View style={styles.navRow}>
            <Pressable
              accessibilityLabel={
                adjacency.previous
                  ? `Previous lesson: ${adjacency.previous.title}`
                  : 'No previous lesson'
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !adjacency.previous }}
              disabled={!adjacency.previous}
              onPress={() =>
                adjacency.previous && selectLesson(adjacency.previous.id)
              }
              style={[
                styles.navButton,
                !adjacency.previous && styles.navButtonDisabled,
              ]}
              testID="previous-lesson">
              <Text style={styles.navLabel}>← Previous</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={
                adjacency.next
                  ? `Next lesson: ${adjacency.next.title}`
                  : 'No next lesson'
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !adjacency.next }}
              disabled={!adjacency.next}
              onPress={() => adjacency.next && selectLesson(adjacency.next.id)}
              style={[
                styles.navButton,
                !adjacency.next && styles.navButtonDisabled,
              ]}
              testID="next-lesson">
              <Text style={styles.navLabel}>Next →</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section} testID="curriculum">
          <Text style={styles.sectionTitle}>Course curriculum</Text>
          {course.modules.map((module, moduleIndex) => (
            <View key={module.id} style={styles.module}>
              <Text style={styles.moduleTitle}>
                Module {moduleIndex + 1} · {module.title}
              </Text>
              {module.lessons.map((lesson) => {
                const active = lesson.id === currentLesson.id;
                const complete = completedLessonIds.has(lesson.id);
                return (
                  <Pressable
                    accessibilityLabel={`${lesson.title}${
                      complete ? ', completed' : ''
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    hitSlop={hitSlop}
                    key={lesson.id}
                    onPress={() => selectLesson(lesson.id)}
                    style={[styles.lessonRow, active && styles.lessonRowActive]}
                    testID={`curriculum-lesson-${lesson.id}`}>
                    <Text style={styles.lessonMarker}>
                      {complete ? '✓' : lesson.type === 'video' ? '▷' : '•'}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[styles.lessonRowTitle, active && styles.lessonRowTitleActive]}>
                      {lesson.title}
                    </Text>
                    <Text style={styles.lessonRowDuration}>
                      {lesson.durationMinutes} min
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.footerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('Assessment', { assessmentId: courseId })
            }
            style={styles.action}
            testID="take-assessment">
            <Text style={styles.actionLabel}>Take assessment</Text>
          </Pressable>
          {courseProgress >= 100 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Certificate', { courseId })}
              style={[styles.action, styles.actionSecondary]}
              testID="view-certificate">
              <Text style={[styles.actionLabel, styles.actionLabelSecondary]}>
                View certificate
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  progressWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...typography.caption,
    color: palette.textMuted,
  },
  progressValue: {
    ...typography.caption,
    color: palette.accent,
  },
  stage: {
    margin: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: '#000000',
    minHeight: 200,
  },
  stageType: {
    ...typography.caption,
    letterSpacing: 2,
    color: palette.textMuted,
  },
  playButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: palette.brand,
  },
  playIcon: {
    fontSize: 22,
    color: palette.textInverse,
  },
  stageMeta: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  lessonProgressWrap: {
    width: '100%',
    marginTop: spacing.xs,
  },
  lessonTitle: {
    ...typography.title,
    color: palette.textPrimary,
  },
  lessonDescription: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
  completedBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
  },
  completedLabel: {
    ...typography.caption,
    color: palette.success,
  },
  errorText: {
    ...typography.caption,
    color: palette.danger,
    marginTop: spacing.sm,
  },
  completeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
  },
  completeButtonDone: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.success,
  },
  completeLabel: {
    ...typography.label,
    color: palette.textInverse,
  },
  completeLabelDone: {
    color: palette.success,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  navButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navLabel: {
    ...typography.label,
    color: palette.textPrimary,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: palette.textPrimary,
    marginBottom: spacing.sm,
  },
  module: {
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    overflow: 'hidden',
  },
  moduleTitle: {
    ...typography.label,
    color: palette.accent,
    padding: spacing.sm,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  lessonRowActive: {
    backgroundColor: palette.surfaceMuted,
  },
  lessonMarker: {
    ...typography.caption,
    color: palette.brand,
    width: 16,
  },
  lessonRowTitle: {
    ...typography.caption,
    color: palette.textPrimary,
    flex: 1,
  },
  lessonRowTitleActive: {
    color: palette.accent,
  },
  lessonRowDuration: {
    ...typography.caption,
    color: palette.textMuted,
  },
  footerActions: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  action: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
  },
  actionSecondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  actionLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  actionLabelSecondary: {
    color: palette.textPrimary,
  },
});

export default VideoPlayerScreen;

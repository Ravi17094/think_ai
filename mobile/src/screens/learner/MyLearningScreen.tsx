import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from '@/components/common';
import { CategoryChips } from '@/components/learner/CategoryChips';
import { CourseCard } from '@/components/learner/CourseCard';
import { FilterTabs } from '@/components/learner/FilterTabs';
import { SearchBar } from '@/components/learner/SearchBar';
import { LearnerTabBar } from '@/components/learner';
import type { LearnerTabKey } from '@/components/learner';
import { LEARNER_TAB_ROUTES } from '@/components/learner/LearnerTabBar';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useWishlist } from '@/hooks/useWishlist';
import type { ScreenProps } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type {
  CourseCategoryId,
  CourseStatusFilter,
  Enrollment,
} from '@/types';
import {
  getCourseCategoryId,
  getResumeLesson,
  isCategoryMatch,
} from '@/utils/course';

export function MyLearningScreen({
  navigation,
}: ScreenProps<'MyLearning'>) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useTheme();
  const { count: wishlistCount } = useWishlist();
  const {
    enrollments,
    isLoading,
    isRefreshing,
    hasError,
    error,
    isEmpty,
    refresh,
  } = useEnrollments();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CourseStatusFilter>('all');
  const [category, setCategory] = useState<CourseCategoryId | 'all'>('all');
  const handleTabSelect = useCallback(
    (key: LearnerTabKey) => navigation.navigate(LEARNER_TAB_ROUTES[key] as never),
    [navigation]
  );

  const openCourse = useCallback(
    (enrollment: Enrollment) => {
      const resumeLesson = getResumeLesson(enrollment.course, enrollment);
      navigation.navigate('VideoPlayer', {
        courseId: enrollment.courseId,
        lessonId: resumeLesson?.id,
      });
    },
    [navigation]
  );

  const stats = useMemo(() => {
    const completed = enrollments.filter(
      (enrollment) => enrollment.status === 'completed'
    ).length;
    const lessons = enrollments.reduce(
      (sum, enrollment) => sum + enrollment.completedLessons,
      0
    );
    return {
      completed,
      inProgress: enrollments.length - completed,
      lessons,
    };
  }, [enrollments]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<CourseCategoryId | 'all', number>> = {
      all: enrollments.length,
    };
    for (const enrollment of enrollments) {
      const id = getCourseCategoryId(enrollment.course);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [enrollments]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return enrollments.filter((enrollment) => {
      if (status !== 'all' && enrollment.status !== status) {
        return false;
      }
      if (!isCategoryMatch(enrollment.course, category)) {
        return false;
      }
      if (term === '') {
        return true;
      }
      const haystack = `${enrollment.course.title} ${enrollment.course.subtitle} ${enrollment.course.instructor.name}`;
      return haystack.toLowerCase().includes(term);
    });
  }, [category, enrollments, query, status]);

  const isInitialLoading = isLoading && enrollments.length === 0;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="my-learning">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={isRefreshing}
            tintColor={palette.brand}
            testID="my-learning-refresh-control"
          />
        }
        testID="my-learning-scroll-view">
        <ScreenHeader
          right={
            <View style={styles.headerAction}>
              <Text
                accessibilityRole="button"
                onPress={() => navigation.navigate('MyCourses')}
                style={styles.headerActionLabel}
                testID="my-learning-browse">
                Browse
              </Text>
            </View>
          }
          subtitle={`${stats.inProgress} in progress · ${stats.completed} completed`}
          title="My Learning"
          testID="my-learning-header"
        />

        <View style={styles.statsRow} testID="my-learning-stats">
          <View style={styles.statCard}>
            <Text style={styles.statValue} testID="my-learning-stat-enrolled">
              {enrollments.length}
            </Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} testID="my-learning-stat-lessons">
              {stats.lessons}
            </Text>
            <Text style={styles.statLabel}>Lessons done</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} testID="my-learning-stat-completed">
              {stats.completed}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <SearchBar
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Search your courses…"
          testID="my-learning-search"
          value={query}
        />

        <View style={styles.categories}>
          <CategoryChips
            counts={categoryCounts}
            onChange={setCategory}
            testID="my-learning-category-chips"
            value={category}
          />
        </View>

        <View style={styles.tabs}>
          <FilterTabs
            counts={{
              all: enrollments.length,
              'in-progress': stats.inProgress,
              completed: stats.completed,
            }}
            onChange={setStatus}
            testID="my-learning-filter-tabs"
            value={status}
          />
        </View>

        {isInitialLoading ? (
          <View style={styles.section}>
            <LoadingState rows={4} testID="my-learning-loading" />
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.section}>
            <ErrorState
              message={error ?? 'Unable to load your learning.'}
              onRetry={refresh}
            />
          </View>
        ) : null}

        {!isInitialLoading && !hasError && isEmpty ? (
          <EmptyState
            actionLabel="Browse courses"
            icon="📚"
            message="Enroll in a course to see your progress, resume lessons and track completion here."
            onAction={() => navigation.navigate('MyCourses')}
            testID="my-learning-empty-state"
            title="Your learning shelf is empty"
          />
        ) : null}

        {!isInitialLoading &&
        !hasError &&
        !isEmpty &&
        filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            message="Try a different search term, category or status filter."
            testID="my-learning-no-results"
            title="No courses match your filters"
          />
        ) : null}

        {!hasError && filtered.length > 0 ? (
          <View style={styles.section} testID="my-learning-list">
            {filtered.map((enrollment) => (
              <CourseCard
                actionLabel={
                  enrollment.status === 'completed'
                    ? 'Review course'
                    : 'Resume learning'
                }
                enrollment={enrollment}
                key={enrollment.id}
                onPress={openCourse}
                testID="my-learning-card"
              />
            ))}
          </View>
        ) : null}

        {isRefreshing ? (
          <Text style={styles.refreshing} testID="my-learning-refreshing">
            Refreshing…
          </Text>
        ) : null}
      </ScrollView>
      <LearnerTabBar active="learning" onSelect={handleTabSelect} wishlistCount={wishlistCount} />
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
  headerAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerActionLabel: {
    ...typography.label,
    color: palette.accent,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statValue: {
    ...typography.title,
    color: palette.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: palette.textMuted,
  },
  categories: {
    marginTop: spacing.sm,
  },
  tabs: {
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  refreshing: {
    ...typography.caption,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default MyLearningScreen;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LmsSyncIndicator } from '@/lms/SyncIndicator';
import {
  Pressable,
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
import { CourseRail } from '@/components/learner/CourseRail';
import { SearchBar } from '@/components/learner/SearchBar';
import { SectionHeader } from '@/components/learner/SectionHeader';
import { AppearanceToggle, LearnerTabBar } from '@/components/learner';
import type { LearnerTabKey } from '@/components/learner';
import { LEARNER_TAB_ROUTES } from '@/components/learner/LearnerTabBar';
import { useCourseSearch } from '@/hooks/useCourseSearch';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useWishlist } from '@/hooks/useWishlist';
import type { ScreenProps } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Course, CourseCategoryId, Enrollment } from '@/types';
import {
  COURSE_CATEGORIES,
  getCourseCategoryId,
  sortCourses,
} from '@/utils/course';

export function LearnerDashboardScreen({
  navigation,
}: ScreenProps<'LearnerDashboard'>) {
  const styles = useThemedStyles(createStyles);
  const { palette, mode } = useTheme();
  const { count: wishlistCount } = useWishlist();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <AppearanceToggle compact testID="dashboard-appearance-toggle" />
      ),
    });
  }, [mode, navigation]);
  const {
    enrollments,
    isLoading,
    isRefreshing,
    hasError,
    error,
    isEmpty,
    refresh,
  } = useEnrollments();

  // The dashboard is discovery-led, so it also reads the catalogue. Failures
  // here never block the learner's own enrollments.
  const { courses: catalogCourses } = useCourseSearch({
    query: '',
    status: 'all',
  });

  const [query, setQuery] = useState('');
  const handleTabSelect = useCallback(
    (key: LearnerTabKey) => navigation.navigate(LEARNER_TAB_ROUTES[key] as never),
    [navigation]
  );

  const openCourse = useCallback(
    (enrollment: Enrollment) => {
      navigation.navigate('CourseDetail', { courseId: enrollment.courseId });
    },
    [navigation]
  );

  const openCatalogCourse = useCallback(
    (course: Course) => {
      navigation.navigate('CourseDetail', { courseId: course.id });
    },
    [navigation]
  );

  const openCategory = useCallback(
    (category: CourseCategoryId | 'all') => {
      navigation.navigate(
        'MyCourses',
        category === 'all' ? undefined : { category }
      );
    },
    [navigation]
  );

  const completedCount = enrollments.filter(
    (e) => e.status === 'completed'
  ).length;

  /** Every course the learner can see, de-duplicated by id. */
  const allCourses = useMemo(() => {
    const byId = new Map<string, Course>();
    for (const course of catalogCourses) {
      byId.set(course.id, course);
    }
    for (const enrollment of enrollments) {
      byId.set(enrollment.courseId, enrollment.course);
    }
    return [...byId.values()];
  }, [catalogCourses, enrollments]);

  const discovery = useMemo(
    () => allCourses.filter((course) => !course.isEnrolled),
    [allCourses]
  );

  const featured = useMemo(
    () => sortCourses(discovery, 'highest-rated').slice(0, 6),
    [discovery]
  );

  const recommended = useMemo(() => {
    const pool = discovery.length > 0 ? discovery : allCourses;
    return sortCourses(pool, 'recommended').slice(0, 6);
  }, [allCourses, discovery]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<CourseCategoryId | 'all', number>> = {
      all: allCourses.length,
    };
    for (const category of COURSE_CATEGORIES) {
      counts[category.id] = allCourses.filter(
        (course) => getCourseCategoryId(course) === category.id
      ).length;
    }
    return counts;
  }, [allCourses]);

  const showSkeleton = isLoading && enrollments.length === 0;
  const hasEnrollments = enrollments.length > 0;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="learner-dashboard">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={isRefreshing}
            tintColor={palette.brand}
            testID="dashboard-refresh-control"
          />
        }
        testID="dashboard-scroll-view">
        <ScreenHeader
          right={
            <View style={styles.headerRight}>
              <View style={styles.stat} testID="dashboard-enrollment-count">
                <Text style={styles.statLabel}>Enrolled</Text>
                <Text style={styles.statValue}>{enrollments.length}</Text>
              </View>
            </View>
          }
          subtitle={`${completedCount} completed · ${
            enrollments.length - completedCount
          } in progress`}
          title="Welcome back"
        />

        <SearchBar
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          onSubmit={() => navigation.navigate('GlobalSearch')}
          placeholder="Search courses, lessons and forum…"
          testID="dashboard-search"
          value={query}
          subtitle={`${completedCount} completed · ${enrollments.length - completedCount} in progress`}
          title="My Learning"
        />

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('NotificationPreferences')}
            style={styles.browseButton}
            testID="notification-settings">
            <Text style={styles.browseLabel}>Alerts</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('MyCourses')}
            style={styles.browseButton}
            testID="browse-tab">
            <Text style={styles.browseLabel}>Browse</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('StaffTools')}
            style={styles.browseButton}
            testID="staff-tools">
            <Text style={styles.browseLabel}>Teaching</Text>
          </Pressable>
          <View style={styles.stat} testID="dashboard-enrollment-count">
            <Text style={styles.statLabel}>Enrolled</Text>
            <Text style={styles.statValue}>{enrollments.length}</Text>
          </View>
        </View>
        <LmsSyncIndicator/>

        {showSkeleton ? (
          <View style={styles.section}>
            <LoadingState rows={3} testID="dashboard-loading" />
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.section}>
            <ErrorState
              message={error ?? 'Unable to load your enrollments.'}
              onRetry={refresh}
            />
          </View>
        ) : null}

        {!showSkeleton && !hasError && isEmpty ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              actionLabel="Browse Course Catalog"
              icon="🚀"
              message="Explore available programs and bootcamps to begin tracking your lessons and certifications."
              onAction={() => navigation.navigate('MyCourses')}
              testID="dashboard-empty-state"
              title="You're not enrolled in any courses yet."
            />
          </View>
        ) : null}

        {!showSkeleton && !hasError ? (
          <View testID="dashboard-categories">
            <SectionHeader
              actionLabel="All courses"
              onAction={() => navigation.navigate('MyCourses')}
              subtitle="Find the track that fits your goal"
              title="Browse by category"
            />
            <CategoryChips
              counts={categoryCounts}
              onChange={openCategory}
              testID="dashboard-category-chips"
              value="all"
            />
          </View>
        ) : null}

        {!showSkeleton && !hasError && featured.length > 0 ? (
          <View testID="dashboard-featured">
            <SectionHeader
              actionLabel="See all"
              onAction={() => navigation.navigate('MyCourses')}
              subtitle="Hand-picked by the Thinkz AI team"
              title="Featured courses"
            />
            <CourseRail
              courses={featured}
              onSelect={openCatalogCourse}
              testID="dashboard-featured-rail"
            />
          </View>
        ) : null}

        {!showSkeleton && !hasError && hasEnrollments ? (
          <View testID="dashboard-continue">
            <SectionHeader
              actionLabel="My Learning"
              onAction={() => navigation.navigate('MyLearning')}
              subtitle="Pick up where you left off"
              testID="dashboard-continue-header"
              title="Continue learning"
            />
            <View style={styles.section} testID="dashboard-course-list">
              {enrollments.map((enrollment) => (
                <CourseCard
                  actionLabel={
                    enrollment.status === 'completed'
                      ? 'Review course'
                      : 'Continue learning'
                  }
                  enrollment={enrollment}
                  key={enrollment.id}
                  onPress={openCourse}
                />
              ))}
            </View>
          </View>
        ) : null}

        {!showSkeleton && !hasError && recommended.length > 0 ? (
          <View testID="dashboard-recommended">
            <SectionHeader
              actionLabel="See all"
              onAction={() => navigation.navigate('MyCourses')}
              subtitle="Based on your learning history"
              title="Recommended for you"
            />
            <CourseRail
              courses={recommended}
              onSelect={openCatalogCourse}
              testID="dashboard-recommended-rail"
            />
          </View>
        ) : null}

        <Text style={styles.footer}>
          Keep going — a little practice every day compounds.
        </Text>
      </ScrollView>
      <LearnerTabBar active="home" onSelect={handleTabSelect} wishlistCount={wishlistCount} />
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingTop: 116,
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  emptyWrap: {
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  browseButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: palette.surfaceMuted,
  },
  browseLabel: {
    ...typography.label,
    color: palette.accent,
  },
  stat: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statLabel: {
    ...typography.caption,
    color: palette.textMuted,
  },
  statValue: {
    ...typography.title,
    color: palette.textPrimary,
  },
  footer: {
    ...typography.caption,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});

export default LearnerDashboardScreen;

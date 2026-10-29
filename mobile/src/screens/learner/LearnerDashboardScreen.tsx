import {LmsSyncIndicator} from '@/lms/SyncIndicator';
import { useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CourseCard } from '@/components/learner/CourseCard';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from '@/components/common';
import { useEnrollments } from '@/hooks/useEnrollments';
import type { ScreenProps } from '@/navigation/types';
import { palette, spacing, typography } from '@/theme/tokens';
import type { Enrollment } from '@/types';

export function LearnerDashboardScreen({
  navigation,
}: ScreenProps<'LearnerDashboard'>) {
  const {
    enrollments,
    isLoading,
    isRefreshing,
    hasError,
    error,
    isEmpty,
    refresh,
  } = useEnrollments();

  const openCourse = useCallback(
    (enrollment: Enrollment) => {
      navigation.navigate('CourseDetail', { courseId: enrollment.courseId });
    },
    [navigation]
  );

  const completedCount = enrollments.filter(
    (e) => e.status === 'completed'
  ).length;

  const showSkeleton = isLoading && enrollments.length === 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea} testID="learner-dashboard">
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
            <ErrorState message={error ?? 'Unable to load your enrollments.'} onRetry={refresh} />
          </View>
        ) : null}

        {!showSkeleton && !hasError && isEmpty ? (
          <EmptyState
            actionLabel="Browse Course Catalog"
            icon="🚀"
            message="Explore available programs and bootcamps to begin tracking your lessons and certifications."
            onAction={() => navigation.navigate('MyCourses')}
            testID="dashboard-empty-state"
            title="You're not enrolled in any courses yet."
          />
        ) : null}

        {!showSkeleton && !hasError && enrollments.length > 0 ? (
          <View style={styles.section} testID="dashboard-course-list">
            {enrollments.map((enrollment) => (
              <CourseCard
                enrollment={enrollment}
                key={enrollment.id}
                onPress={openCourse}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
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
});

export default LearnerDashboardScreen;

import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from '@/components/common';
import { CourseGrid, LearnerTabBar } from '@/components/learner';
import type { LearnerTabKey } from '@/components/learner';
import { useWishlist } from '@/hooks/useWishlist';
import { useWishlistCourses } from '@/hooks/useWishlistCourses';
import type { ScreenProps } from '@/navigation/types';
import { LEARNER_TAB_ROUTES } from '@/components/learner/LearnerTabBar';
import { spacing, typography } from '@/theme/tokens';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Course } from '@/types';
import { getScreenWidth } from '@/utils/responsive';

const HORIZONTAL_PADDING = spacing.md * 2;

export function WishlistScreen({ navigation }: ScreenProps<'Wishlist'>) {
  const styles = useThemedStyles(createStyles);
  const { ids, savedCourseIds, count, toggle } = useWishlist();
  const { courses, isLoading, error, hasError, refresh } =
    useWishlistCourses(ids);

  const openCourse = useCallback(
    (course: Course) => {
      navigation.navigate('CourseDetail', { courseId: course.id });
    },
    [navigation]
  );

  const handleTabSelect = useCallback(
    (key: LearnerTabKey) => {
      navigation.navigate(LEARNER_TAB_ROUTES[key] as never);
    },
    [navigation]
  );

  const showLoading = isLoading && courses.length === 0 && count > 0;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="wishlist-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        testID="wishlist-scroll-view">
        <ScreenHeader
          subtitle={`${count} saved course${count === 1 ? '' : 's'}`}
          title="Wishlist"
          testID="wishlist-header"
        />

        <Text style={styles.hint} testID="wishlist-hint">
          Courses you save on this device appear here. Tap the heart on any
          course to add or remove it.
        </Text>

        {showLoading ? (
          <View style={styles.section}>
            <LoadingState rows={3} testID="wishlist-loading" />
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.section}>
            <ErrorState
              message={error ?? 'Unable to load your saved courses.'}
              onRetry={refresh}
              testID="wishlist-error"
            />
          </View>
        ) : null}

        {!showLoading && !hasError && count === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              actionLabel="Explore courses"
              icon="♡"
              message="Save courses from Explore or Course Detail to build a shortlist you can revisit any time."
              onAction={() => navigation.navigate('MyCourses')}
              testID="wishlist-empty"
              title="Your wishlist is empty"
            />
          </View>
        ) : null}

        {!showLoading && !hasError && courses.length > 0 ? (
          <View testID="wishlist-list">
            <CourseGrid
              courses={courses}
              firstCardTestID="wishlist-card-0"
              onSelect={openCourse}
              onToggleSave={(course) => toggle(course.id)}
              savedCourseIds={savedCourseIds}
              testID="wishlist-grid"
              width={getScreenWidth() - HORIZONTAL_PADDING}
            />
          </View>
        ) : null}
      </ScrollView>

      <LearnerTabBar
        active="wishlist"
        onSelect={handleTabSelect}
        wishlistCount={count}
      />
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingBottom: spacing.xxl,
      flexGrow: 1,
    },
    hint: {
      ...typography.caption,
      color: palette.textMuted,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
    },
    emptyWrap: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
  });

export default WishlistScreen;

import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  ErrorState,
  InlineSpinner,
  LoadingState,
  ScreenHeader,
} from '@/components/common';
import { CategoryChips } from '@/components/learner/CategoryChips';
import { CourseGrid } from '@/components/learner/CourseGrid';
import { FilterTabs } from '@/components/learner/FilterTabs';
import { SearchBar } from '@/components/learner/SearchBar';
import { SortChips } from '@/components/learner/SortChips';
import { LearnerTabBar } from '@/components/learner';
import type { LearnerTabKey } from '@/components/learner';
import { LEARNER_TAB_ROUTES } from '@/components/learner/LearnerTabBar';
import { useCourseSearch } from '@/hooks/useCourseSearch';
import { useDebouncedValue } from '@/hooks/useAsyncResource';
import { useWishlist } from '@/hooks/useWishlist';
import type { ScreenProps } from '@/navigation/types';
import { SEARCH_DEBOUNCE_MS, spacing } from '@/theme/tokens';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type {
  CourseCategoryId,
  CourseSortOption,
  CourseStatusFilter,
} from '@/types';
import { getCourseCategoryId, isCategoryMatch, sortCourses } from '@/utils/course';
import { getScreenWidth } from '@/utils/responsive';

const HORIZONTAL_PADDING = spacing.md * 2;

export function MyCoursesScreen({
  navigation,
  route,
}: ScreenProps<'MyCourses'>) {
  const styles = useThemedStyles(createStyles);
  const { count: wishlistCount } = useWishlist();
  const initialCategory = route.params?.category ?? 'all';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CourseStatusFilter>('all');
  const [category, setCategory] = useState<CourseCategoryId | 'all'>(
    initialCategory
  );
  const [sort, setSort] = useState<CourseSortOption>('recommended');

  // Single source of truth for the 300 ms search window.
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const isDebouncing = query !== debouncedQuery;

  const params = useMemo(
    () => ({ query: debouncedQuery, status }),
    [debouncedQuery, status]
  );
  const { courses, total, isLoading, error, hasError, isEmpty, refresh } =
    useCourseSearch(params);

  const contentWidth = getScreenWidth() - HORIZONTAL_PADDING;

  const handleScroll = () => Keyboard.dismiss();
  const handleTabSelect = useCallback(
    (key: LearnerTabKey) => navigation.navigate(LEARNER_TAB_ROUTES[key] as never),
    [navigation]
  );

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<CourseCategoryId | 'all', number>> = {
      all: courses.length,
    };
    for (const course of courses) {
      const id = getCourseCategoryId(course);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [courses]);

  // Category and sort are presentation-only, so they never widen the API
  // contract: the debounced `{ query, status }` request stays unchanged.
  const visibleCourses = useMemo(
    () =>
      sortCourses(
        courses.filter((course) => isCategoryMatch(course, category)),
        sort
      ),
    [category, courses, sort]
  );

  const isInitialLoading = isLoading && courses.length === 0;
  const hasNoCourses = !isLoading && !hasError && isEmpty;
  const hasNoVisibleCourses =
    !isLoading && !hasError && !isEmpty && visibleCourses.length === 0;

  const clearFilters = useCallback(() => {
    setCategory('all');
    setSort('recommended');
    setStatus('all');
    setQuery('');
  }, []);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="my-courses">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID="my-courses-scroll-view">
        <ScreenHeader
          subtitle={
            isLoading
              ? 'Updating…'
              : `${visibleCourses.length} of ${total} course${
                  total === 1 ? '' : 's'
                }`
          }
          title="My Courses"
        />

        <SearchBar
          isSearching={isDebouncing}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          value={query}
        />

        <View style={styles.tabsWrap}>
          <FilterTabs onChange={setStatus} value={status} />
        </View>

        <CategoryChips
          counts={categoryCounts}
          onChange={setCategory}
          testID="my-courses-category-chips"
          value={category}
        />

        <View style={styles.sortWrap}>
          <SortChips onChange={setSort} value={sort} />
        </View>

        {isInitialLoading ? (
          <View style={styles.section}>
            <LoadingState rows={4} testID="my-courses-loading" />
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.section}>
            <ErrorState
              message={error ?? 'Unable to load courses.'}
              onRetry={refresh}
            />
          </View>
        ) : null}

        {hasNoCourses ? (
          <EmptyState
            icon="🔍"
            message="Try a different search term or switch to the All filter."
            testID="my-courses-empty-state"
            title={query ? `No courses match “${query}”` : 'No courses found'}
          />
        ) : null}

        {hasNoVisibleCourses ? (
          <EmptyState
            actionLabel="Clear filters"
            icon="🧭"
            message="No course in this category matches the current search and status filters."
            onAction={clearFilters}
            testID="my-courses-filter-empty-state"
            title="Nothing in this category yet"
          />
        ) : null}

        {!hasError && visibleCourses.length > 0 ? (
          <View style={styles.section} testID="course-list">
            <View testID="my-courses-results">
              <CourseGrid
                courses={visibleCourses}
                firstCardTestID="course-card-0"
                onSelect={(course) =>
                  navigation.navigate('CourseDetail', { courseId: course.id })
                }
                width={contentWidth}
              />
            </View>
            {isLoading ? (
              <InlineSpinner testID="my-courses-inline-spinner" />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <LearnerTabBar active="explore" onSelect={handleTabSelect} wishlistCount={wishlistCount} />
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
  tabsWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sortWrap: {
    marginTop: spacing.xxs,
    marginBottom: spacing.xs,
  },
  section: {
    marginTop: spacing.xs,
  },
});

export default MyCoursesScreen;

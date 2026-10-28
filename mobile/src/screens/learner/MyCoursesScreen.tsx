import { useMemo, useState } from 'react';
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
import { CourseGrid } from '@/components/learner/CourseGrid';
import { FilterTabs } from '@/components/learner/FilterTabs';
import { SearchBar } from '@/components/learner/SearchBar';
import { useCourseSearch } from '@/hooks/useCourseSearch';
import { useDebouncedValue } from '@/hooks/useAsyncResource';
import type { ScreenProps } from '@/navigation/types';
import { SEARCH_DEBOUNCE_MS, palette, spacing } from '@/theme/tokens';
import type { CourseStatusFilter } from '@/types';
import { getScreenWidth } from '@/utils/responsive';

const HORIZONTAL_PADDING = spacing.md * 2;

export function MyCoursesScreen({ navigation }: ScreenProps<'MyCourses'>) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CourseStatusFilter>('all');

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

  const isInitialLoading = isLoading && courses.length === 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea} testID="my-courses">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID="my-courses-scroll-view">
        <ScreenHeader
          subtitle={isLoading ? 'Updating…' : `${total} course${total === 1 ? '' : 's'}`}
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

        {isInitialLoading ? (
          <View style={styles.section}>
            <LoadingState rows={4} testID="my-courses-loading" />
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.section}>
            <ErrorState message={error ?? 'Unable to load courses.'} onRetry={refresh} />
          </View>
        ) : null}

        {!isInitialLoading && !hasError && isEmpty ? (
          <EmptyState
            icon="🔍"
            message="Try a different search term or switch to the All filter."
            testID="my-courses-empty-state"
            title={query ? `No courses match “${query}”` : 'No courses found'}
          />
        ) : null}

        {!hasError && courses.length > 0 ? (
          <View style={styles.section} testID="course-list">
            <View testID="my-courses-results">
              <CourseGrid
                courses={courses}
                firstCardTestID="course-card-0"
                onSelect={(course) =>
                  navigation.navigate('CourseDetail', { courseId: course.id })
                }
                width={contentWidth}
              />
            </View>
            {isLoading ? <InlineSpinner testID="my-courses-inline-spinner" /> : null}
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
  tabsWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  section: {
    marginTop: spacing.xs,
  },
});

export default MyCoursesScreen;

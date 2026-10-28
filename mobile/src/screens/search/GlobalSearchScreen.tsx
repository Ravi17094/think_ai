import { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
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
import {
  RecentSearches,
  ResultRow,
  ResultTabs,
  SearchInput,
} from '@/components/search';
import { useDebouncedValue } from '@/hooks/useAsyncResource';
import { useGlobalSearch, SEARCH_TAB_LABELS } from '@/hooks/useGlobalSearch';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import type { ScreenProps } from '@/navigation/types';
import { SEARCH_DEBOUNCE_MS, palette, spacing, typography } from '@/theme/tokens';
import type { SearchResult } from '@/types';

export function GlobalSearchScreen({ navigation }: ScreenProps<'GlobalSearch'>) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const isDebouncing = query !== debouncedQuery;

  const {
    activeResults,
    activeTotal,
    activeType,
    setActiveType,
    isLoading,
    hasError,
    error,
  } = useGlobalSearch(debouncedQuery);

  const {
    recent,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentSearches();

  const tabLabels = useMemo(
    () => ['course', 'lesson', 'forum', 'assessment'].map((k) => SEARCH_TAB_LABELS[k as keyof typeof SEARCH_TAB_LABELS]),
    []
  );
  const activeLabel =
    SEARCH_TAB_LABELS[activeType] ?? SEARCH_TAB_LABELS.course;

  const commitSearch = (term: string) => {
    addRecentSearch(term);
  };

  const handleSelectResult = (result: SearchResult) => {
    commitSearch(query);
    if (result.type === 'forum') {
      navigation.navigate('ForumHome');
      return;
    }
    navigation.navigate('CourseDetail', { courseId: result.id });
  };

  const hasQuery = debouncedQuery.trim() !== '';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea} testID="global-search">
      <ScreenHeader
        subtitle={
          hasQuery ? `${activeTotal} result${activeTotal === 1 ? '' : 's'}` : 'Search everything'
        }
        title="Global Search"
      />

      <SearchInput
        isBusy={isDebouncing || isLoading}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        onSubmit={commitSearch}
        value={query}
      />

      <RecentSearches
        isVisible={query.length === 0}
        onClearAll={clearRecentSearches}
        onRemove={removeRecentSearch}
        onSelect={(term) => {
          setQuery(term);
          commitSearch(term);
        }}
        recent={recent}
      />

      {hasQuery ? (
        <ResultTabs
          activeTab={activeLabel}
          onChange={(label) => {
            const entry = Object.entries(SEARCH_TAB_LABELS).find(
              ([, value]) => value === label
            );
            if (entry) {
              setActiveType(entry[0] as typeof activeType);
            }
          }}
          tabs={tabLabels}
          testID="global-search-tabs"
        />
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={activeResults}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.stateWrap}>
            {hasError ? (
              <ErrorState message={error ?? 'Search is unavailable.'} />
            ) : null}
            {!hasError && isLoading ? (
              <LoadingState rows={3} testID="global-search-loading" />
            ) : null}
            {!hasError && !isLoading && hasQuery ? (
              <EmptyState
                icon="🧭"
                message={`Nothing found in ${activeLabel}. Try another tab or a shorter query.`}
                testID="global-search-empty-state"
                title="No matches"
              />
            ) : null}
            {!hasQuery ? (
              <View style={styles.idleWrap}>
                <Text style={styles.idleText}>
                  Search across courses, lessons, the forum and assessments.
                </Text>
                <Text
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ForumHome')}
                  style={styles.idleLink}
                  testID="global-search-forum-link">
                  Browse the forum →
                </Text>
              </View>
            ) : null}
          </View>
        }
        onScrollBeginDrag={Keyboard.dismiss}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <ResultRow
              onSelect={handleSelectResult}
              query={debouncedQuery}
              result={item}
            />
          </View>
        )}
        testID="global-search-results"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  list: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  rowWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  stateWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  idleWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  idleText: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  idleLink: {
    ...typography.label,
    color: palette.accent,
  },
});

export default GlobalSearchScreen;

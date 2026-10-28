import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner, ScreenHeader } from '@/components/common';
import { CategoryChips } from '@/components/forum/CategoryChips';
import { CreatePostModal } from '@/components/forum/CreatePostModal';
import { FloatingActionButton } from '@/components/forum/FloatingActionButton';
import { SortDropdown } from '@/components/forum/SortDropdown';
import { TagFilter } from '@/components/forum/TagFilter';
import { ThreadList } from '@/components/forum/ThreadList';
import { useForumThreads } from '@/hooks/useForumThreads';
import type { ScreenProps } from '@/navigation/types';
import { palette, spacing } from '@/theme/tokens';
import type { CreateThreadInput } from '@/types';

export function ForumHomeScreen({ navigation }: ScreenProps<'ForumHome'>) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const {
    threads,
    categories,
    availableTags,
    filters,
    hasMore,
    isLoading,
    isRefreshing,
    hasError,
    error,
    isEmpty,
    isOffline,
    isFromCache,
    threshold,
    total,
    setCategoryId,
    setTags,
    setSort,
    onScrollProgress,
    refresh,
    createThread,
  } = useForumThreads();

  const handleCreateThread = useCallback(
    async (input: CreateThreadInput) => {
      setIsSubmitting(true);
      setComposerError(null);
      try {
        await createThread(input);
        setIsComposerOpen(false);
      } catch (cause) {
        setComposerError(
          cause instanceof Error ? cause.message : 'Could not post the thread.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [createThread]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea} testID="forum-home">
      <ScreenHeader
        right={
          <View style={styles.headerRight}>
            <SortDropdown onChange={setSort} value={filters.sort} />
          </View>
        }
        subtitle={`${total} thread${total === 1 ? '' : 's'} in the community`}
        title="Forum"
      />

      <OfflineBanner
        message="You are offline — showing saved threads."
        visible={isOffline || isFromCache}
      />

      <CategoryChips
        categories={categories}
        onSelect={setCategoryId}
        selectedCategoryId={filters.categoryId}
      />

      <TagFilter
        onChange={setTags}
        selectedTags={filters.tags}
        tags={availableTags}
      />

      <View style={styles.listWrap}>
        <ThreadList
          categories={categories}
          emptyMessage="Try another category, clear your tags, or start the first thread."
          emptyTitle={isEmpty ? 'Nothing here yet' : undefined}
          errorMessage={error}
          hasError={hasError}
          hasMore={hasMore}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onEndReached={() => onScrollProgress(threshold)}
          onEndReachedThreshold={threshold}
          onRefresh={refresh}
          onSelectThread={() => navigation.navigate('GlobalSearch')}
          threads={threads}
        />
      </View>

      <FloatingActionButton onPress={() => setIsComposerOpen(true)} />

      <CreatePostModal
        availableTags={availableTags}
        categories={categories}
        errorMessage={composerError}
        isSubmitting={isSubmitting}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={handleCreateThread}
        visible={isComposerOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  listWrap: {
    flex: 1,
    marginTop: spacing.xs,
  },
});

export default ForumHomeScreen;

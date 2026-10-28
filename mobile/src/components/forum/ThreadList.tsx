import { memo, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';

import { EmptyState, ErrorState, InlineSpinner } from '@/components/common';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import type { ForumCategory, ForumThread } from '@/types';

export interface ThreadListProps {
  threads: ForumThread[];
  categories: ForumCategory[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  hasError: boolean;
  errorMessage?: string | null;
  onEndReached: () => void;
  /** 0–1. Defaults to the spec's 0.8 threshold. */
  onEndReachedThreshold?: number;
  onRefresh?: () => void;
  onSelectThread?: (thread: ForumThread) => void;
  /** 0–1. The next page is requested once this fraction of the list is visible. */
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  testID?: string;
}

function ThreadListRow({
  thread,
  category,
  onSelect,
  testID,
}: {
  thread: ForumThread;
  category: ForumCategory | undefined;
  onSelect?: (thread: ForumThread) => void;
  testID: string;
}) {
  const handlePress = useCallback(() => onSelect?.(thread), [onSelect, thread]);

  return (
    <View style={styles.card} testID={`${testID}-${thread.id}`}>
      <View style={styles.cardHeader}>
        {thread.isPinned ? (
          <Text style={styles.pin} testID={`${testID}-${thread.id}-pinned`}>
            📌 Pinned
          </Text>
        ) : null}
        {thread.isSolved ? (
          <Text style={styles.solved} testID={`${testID}-${thread.id}-solved`}>
            ✓ Solved
          </Text>
        ) : null}
      </View>

      <Text
        accessibilityRole="button"
        numberOfLines={2}
        onPress={handlePress}
        style={styles.title}
        testID={`${testID}-${thread.id}-title`}>
        {thread.title}
      </Text>

      <Text numberOfLines={2} style={styles.excerpt}>
        {thread.excerpt}
      </Text>

      <View style={styles.metaRow}>
        {category ? (
          <Text style={[styles.category, { color: category.color }]}>
            {category.name}
          </Text>
        ) : null}
        <Text style={styles.meta}>▲ {thread.upvotes}</Text>
        <Text style={styles.meta}>💬 {thread.replyCount}</Text>
        <Text style={styles.author}>{thread.author.name}</Text>
      </View>

      <View style={styles.tagRow}>
        {thread.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const MemoisedThreadListRow = memo(ThreadListRow);

/**
 * Paginated forum thread list. Pagination is driven by `onEndReached`, which the
 * screen wires to the 80%-threshold handler in `useForumThreads`.
 */
export function ThreadList({
  threads,
  categories,
  isLoading,
  isRefreshing,
  hasMore,
  hasError,
  errorMessage,
  onEndReached,
  onEndReachedThreshold = 0.8,
  onRefresh,
  onSelectThread,
  onViewableItemsChanged,
  emptyTitle = 'No threads yet',
  emptyMessage = 'Be the first to start a conversation in this category.',
  testID = 'forum-thread-list',
}: ThreadListProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={threads}
      initialNumToRender={8}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        hasError ? (
          <ErrorState message={errorMessage ?? 'Unable to load threads.'} />
        ) : isLoading ? null : (
          <EmptyState
            icon="💬"
            message={emptyMessage}
            testID={`${testID}-empty`}
            title={emptyTitle}
          />
        )
      }
      ListFooterComponent={
        <View>
          {hasError ? null : isLoading || isRefreshing ? (
            <InlineSpinner testID={`${testID}-loading`} />
          ) : null}
          {!isLoading && !isRefreshing && !hasMore && threads.length > 0 ? (
            <Text style={styles.endOfList} testID={`${testID}-end`}>
              You have reached the end
            </Text>
          ) : null}
        </View>
      }
      maxToRenderPerBatch={8}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      onRefresh={onRefresh}
      onViewableItemsChanged={onViewableItemsChanged}
      refreshing={isRefreshing}
      removeClippedSubviews
      renderItem={({ item }) => (
        <MemoisedThreadListRow
          category={categoryById.get(item.categoryId)}
          onSelect={onSelectThread}
          testID={testID}
          thread={item}
        />
      )}
      testID={testID}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: 96,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.xxs,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pin: {
    ...typography.caption,
    color: palette.warning,
  },
  solved: {
    ...typography.caption,
    color: palette.success,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  excerpt: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  category: {
    ...typography.caption,
    fontWeight: '700',
  },
  meta: {
    ...typography.caption,
    color: palette.textMuted,
  },
  author: {
    ...typography.caption,
    color: palette.textMuted,
    marginLeft: 'auto',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  tag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceMuted,
  },
  tagText: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  endOfList: {
    ...typography.caption,
    color: palette.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});

export default ThreadList;

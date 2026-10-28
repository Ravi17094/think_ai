import type { ReactElement } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState, ErrorState } from '@/components/common';
import { palette, spacing } from '@/theme/tokens';
import type { BookmarkRecord } from '@/types/community';
import { BookmarkRow } from './BookmarkRow';
import { BookmarksSkeleton } from './BookmarksSkeleton';

export interface BookmarkListProps {
  bookmarks: BookmarkRecord[];
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  isRemovingId?: string | null;
  onOpen?: (record: BookmarkRecord) => void;
  onRemove?: (record: BookmarkRecord) => void;
  listHeader?: ReactElement | null;
  testID?: string;
}

/** FlatList of bookmark rows with skeleton / empty / error states. */
export function BookmarkList({
  bookmarks,
  isLoading = false,
  hasError = false,
  errorMessage,
  onRetry,
  isRefreshing = false,
  onRefresh,
  isRemovingId = null,
  onOpen,
  onRemove,
  listHeader,
  testID = 'bookmark-list',
}: BookmarkListProps) {
  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={bookmarks}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        hasError ? (
          <ErrorState
            message={errorMessage ?? 'Unable to load bookmarks.'}
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <BookmarksSkeleton testID={`${testID}-skeleton`} />
        ) : (
          <EmptyState
            icon="🔖"
            message="Bookmark a thread and it will show up here for quick access."
            testID={`${testID}-empty`}
            title="No bookmarks yet"
          />
        )
      }
      ListHeaderComponent={listHeader ?? null}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
      testID={testID}
      renderItem={({ item, index }) => (
        <BookmarkRow
          isRemoving={isRemovingId === item.discussionId}
          onOpen={onOpen}
          onRemove={onRemove}
          record={item}
          testID={`${testID}-row-${index}`}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: palette.background,
  },
});

export default BookmarkList;

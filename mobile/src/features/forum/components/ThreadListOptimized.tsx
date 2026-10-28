import { useCallback } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text } from 'react-native';

import { Thread } from '../types';
import { ThreadRow } from './ThreadRow';

interface Props {
  threads: Thread[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

export function ThreadListOptimized({
  threads,
  loading,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: Props) {
  const renderItem = useCallback<ListRenderItem<Thread>>(
    ({ item }) => <ThreadRow thread={item} />,
    []
  );
  const keyExtractor = useCallback((item: Thread) => item.id, []);
  const onEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore && !loading) onLoadMore();
  }, [isLoadingMore, hasMore, loading, onLoadMore]);

  return (
    <FlatList
      data={threads}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={21}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      ListFooterComponent={
        isLoadingMore ? (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.footer}
            testID="forum-thread-list-loading-more">
            Loading...
          </Text>
        ) : null
      }
      ListEmptyComponent={!loading ? <Text style={styles.empty}>No threads</Text> : null}
      contentContainerStyle={styles.content}
      testID="forum-thread-list-optimized"
    />
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', padding: 12 },
  empty: { textAlign: 'center', padding: 24 },
  content: { paddingBottom: 16 },
});

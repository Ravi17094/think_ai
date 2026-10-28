import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Thread } from '../types';
import { LazyThumbnail } from './LazyThumbnail';

export const ThreadRow = memo(function ThreadRow({ thread }: { thread: Thread }) {
  return (
    <View
      style={styles.row}
      accessibilityLabel={`${thread.title}. ${thread.replies} replies by ${thread.author}`}
      testID={`thread-row-${thread.id}`}>
      {thread.thumbnailUrl ? (
        <LazyThumbnail uri={thread.thumbnailUrl} />
      ) : (
        <View style={styles.thumbPlaceholder} />
      )}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {thread.title}
        </Text>
        <Text style={styles.meta}>
          {thread.replies} replies - {thread.author}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  thumbPlaceholder: {
    width: 64,
    height: 48,
    backgroundColor: '#ddd',
    borderRadius: 4,
  },
  text: { flex: 1 },
  title: { fontWeight: '600' },
  meta: { color: '#666', fontSize: 12 },
});

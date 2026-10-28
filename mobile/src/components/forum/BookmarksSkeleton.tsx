import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/common';
import { palette, radii, spacing } from '@/theme/tokens';

/** Row skeletons mirroring the bookmark card layout. */
export function BookmarksSkeleton({
  rows = 3,
  testID = 'bookmarks-skeleton',
}: {
  rows?: number;
  testID?: string;
}) {
  return (
    <View testID={testID}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton height={16} width="72%" testID={`${testID}-title-${index}`} />
          <Skeleton height={12} width="94%" testID={`${testID}-excerpt-${index}`} />
          <Skeleton height={10} width="50%" testID={`${testID}-meta-${index}`} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
});

export default BookmarksSkeleton;

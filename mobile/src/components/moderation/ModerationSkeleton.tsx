import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/common';
import { palette, radii, spacing } from '@/theme/tokens';

/** Queue-row skeletons matching the flag table layout (header lives in the table). */
export function ModerationSkeleton({
  rows = 3,
  testID = 'moderation-skeleton',
}: {
  rows?: number;
  testID?: string;
}) {
  return (
    <View testID={testID}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.rowMain}>
            <View style={styles.contentLines}>
              <Skeleton height={12} width="30%" />
              <Skeleton height={14} width="86%" />
              <Skeleton height={12} width="94%" />
              <Skeleton height={10} width="62%" />
            </View>
            <Skeleton height={22} width={64} radius={999} />
            <Skeleton height={18} width={32} />
          </View>
          <View style={styles.actions}>
            <Skeleton height={32} width={74} radius={999} />
            <Skeleton height={32} width={64} radius={999} />
            <Skeleton height={32} width={74} radius={999} />
            <Skeleton height={32} width={64} radius={999} />
          </View>
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
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  contentLines: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});

export default ModerationSkeleton;

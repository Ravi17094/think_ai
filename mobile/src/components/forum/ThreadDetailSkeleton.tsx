import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/common';
import { palette, radii, spacing } from '@/theme/tokens';

export interface ThreadDetailSkeletonProps {
  /** Number of reply rows to shimmer. */
  replyRows?: number;
  testID?: string;
}

/**
 * Page-load placeholder for the thread detail screen: mirrors the thread card
 * plus `replyRows` reply rows so content swaps in without a layout jump.
 */
export function ThreadDetailSkeleton({
  replyRows = 3,
  testID = 'thread-detail-skeleton',
}: ThreadDetailSkeletonProps) {
  return (
    <View testID={testID}>
      <View style={styles.card}>
        <Skeleton height={10} width="24%" testID={`${testID}-category`} />
        <Skeleton height={24} width="85%" radius={12} testID={`${testID}-title`} />
        <View style={styles.authorRow}>
          <Skeleton height={36} width={36} radius={999} testID={`${testID}-avatar`} />
          <View style={styles.authorLines}>
            <Skeleton height={12} width="45%" testID={`${testID}-author`} />
            <Skeleton height={10} width="60%" testID={`${testID}-timestamp`} />
          </View>
        </View>
        <Skeleton height={12} width="100%" testID={`${testID}-body-1`} />
        <Skeleton height={12} width="96%" testID={`${testID}-body-2`} />
        <Skeleton height={12} width="58%" testID={`${testID}-body-3`} />
        <View style={styles.tagRow}>
          <Skeleton height={20} width={72} radius={999} testID={`${testID}-tag-1`} />
          <Skeleton height={20} width={56} radius={999} testID={`${testID}-tag-2`} />
        </View>
      </View>

      {Array.from({ length: replyRows }, (_, index) => (
        <View key={index} style={styles.reply}>
          <View style={styles.authorRow}>
            <Skeleton height={28} width={28} radius={999} />
            <Skeleton height={12} width="35%" />
          </View>
          <Skeleton height={12} width="92%" />
          <Skeleton height={12} width={index % 2 === 0 ? '70%' : '84%'} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorLines: {
    flex: 1,
    gap: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reply: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});

export default ThreadDetailSkeleton;

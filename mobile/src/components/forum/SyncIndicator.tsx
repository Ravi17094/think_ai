import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';

export interface SyncIndicatorProps {
  /** `syncedAt` stamp from `GET /api/bookmarks`. */
  syncedAt: string | null;
  isSyncing?: boolean;
  testID?: string;
}

/** "Synced Xm ago" chip shown in the bookmarks header. */
export function SyncIndicator({
  syncedAt,
  isSyncing = false,
  testID = 'sync-indicator',
}: SyncIndicatorProps) {
  return (
    <View style={styles.chip} testID={testID}>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.icon}>
        {isSyncing ? '⟳' : '↻'}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        style={styles.label}
        testID={`${testID}-label`}>
        {isSyncing
          ? 'Syncing…'
          : syncedAt
            ? `Synced ${formatRelativeTime(syncedAt)}`
            : 'Not synced yet'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  icon: {
    ...typography.caption,
    color: palette.accent,
  },
  label: {
    ...typography.caption,
    color: palette.textSecondary,
  },
});

export default SyncIndicator;

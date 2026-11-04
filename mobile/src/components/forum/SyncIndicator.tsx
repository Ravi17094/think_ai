import { useThemedStyles } from "@/theme/useThemedStyles";
import type { Palette } from "@/theme/tokens";
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/theme/tokens';
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
  testID = 'sync-indicator'
}: SyncIndicatorProps) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.chip} testID={testID}>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        {isSyncing ? '⟳' : '↻'}
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.label} testID={`${testID}-label`}>
        {isSyncing ? 'Syncing…' : syncedAt ? `Synced ${formatRelativeTime(syncedAt)}` : 'Not synced yet'}
      </Text>
    </View>;
}
const createStyles = (palette: Palette) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs
  },
  icon: {
    ...typography.caption,
    color: palette.accent
  },
  label: {
    ...typography.caption,
    color: palette.textSecondary
  }
});
export default SyncIndicator;

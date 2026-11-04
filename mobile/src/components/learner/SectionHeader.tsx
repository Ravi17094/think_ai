import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { hitSlop, spacing, typography } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/** Consistent section heading used by dashboard, listing and learning screens. */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  testID = 'section-header',
}: SectionHeaderProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.text}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          hitSlop={hitSlop}
          onPress={onAction}
          style={styles.action}
          testID={`${testID}-action`}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: palette.textMuted,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  actionLabel: {
    ...typography.label,
    color: palette.accent,
  },
});

export default SectionHeader;

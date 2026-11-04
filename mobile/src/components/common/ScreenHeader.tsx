import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useThemedStyles } from '@/theme/useThemedStyles';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  testID?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  testID = 'screen-header',
}: ScreenHeaderProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header} testID={testID}>
      <View style={styles.headerText}>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export interface InlineSpinnerProps {
  label?: string;
  testID?: string;
}

export function InlineSpinner({
  label = 'Loading more…',
  testID = 'inline-spinner',
}: InlineSpinnerProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessible
      style={styles.inlineSpinner}
      testID={testID}>
      <ActivityIndicator color={palette.brand} size="small" />
      <Text style={styles.inlineSpinnerLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    color: palette.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: palette.textSecondary,
    marginTop: spacing.xxs,
  },
  inlineSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  inlineSpinnerLabel: {
    ...typography.caption,
    color: palette.textMuted,
  },
});

export default ScreenHeader;

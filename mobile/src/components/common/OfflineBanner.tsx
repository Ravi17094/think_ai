import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export interface OfflineBannerProps {
  /** Defaults to `true`; render the banner only while offline. */
  visible?: boolean;
  message?: string;
  testID?: string;
}

/**
 * Reusable offline indicator shown across screens.
 *
 * Announced to screen readers as an alert and exposed via a stable testID so
 * the offline read-mode can be asserted end-to-end.
 */
export function OfflineBanner({
  visible = true,
  message = 'You are offline — showing saved content.',
  testID = 'offline-banner',
}: OfflineBannerProps) {
  if (!visible) {
    return null;
  }
  return (
    <View
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessible
      style={styles.banner}
      testID={testID}>
      <Text style={styles.icon}>📴</Text>
      <Text style={styles.label} testID={`${testID}-label`}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderColor: palette.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    ...typography.label,
    // High-contrast text for the amber surface (WCAG AA at this size).
    color: '#FDE68A',
    flexShrink: 1,
  },
});

export default OfflineBanner;

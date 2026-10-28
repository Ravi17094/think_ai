import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import type { FlagSeverity } from '@/types/community';

const SEVERITY_LABELS: Record<FlagSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Severity chip — colour derives from report count vs policy thresholds. */
export function SeverityBadge({
  severity,
  testID = 'severity-badge',
}: {
  severity: FlagSeverity;
  testID?: string;
}) {
  return (
    <View
      accessibilityLabel={`Severity ${SEVERITY_LABELS[severity]}`}
      accessible
      style={[
        styles.badge,
        severity === 'high' && styles.high,
        severity === 'medium' && styles.medium,
        severity === 'low' && styles.low,
      ]}
      testID={`${testID}-${severity}`}>
      <Text style={styles.label}>{SEVERITY_LABELS[severity]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    minWidth: 64,
  },
  high: {
    backgroundColor: 'rgba(248, 113, 113, 0.16)',
    borderColor: palette.danger,
  },
  medium: {
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
    borderColor: palette.warning,
  },
  low: {
    backgroundColor: 'rgba(96, 165, 250, 0.16)',
    borderColor: palette.info,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: palette.textPrimary,
  },
});

export default SeverityBadge;

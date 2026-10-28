import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export interface SolvedToggleProps {
  solved: boolean;
  /** Only the thread author gets the interactive toggle. */
  canManage: boolean;
  isUpdating?: boolean;
  onToggle?: (solved: boolean) => void;
  testID?: string;
}

/**
 * Solved badge / toggle. The backend only lets the thread author flip
 * `PATCH /api/discussions/:id/solved`, so readers see a static badge.
 */
export function SolvedToggle({
  solved,
  canManage,
  isUpdating = false,
  onToggle,
  testID = 'solved-toggle',
}: SolvedToggleProps) {
  if (!canManage) {
    return solved ? (
      <Text style={styles.badge} testID={`${testID}-badge`}>
        ✓ Solved
      </Text>
    ) : null;
  }

  return (
    <Pressable
      accessibilityLabel={solved ? 'Mark thread as unsolved' : 'Mark thread as solved'}
      accessibilityRole="button"
      accessibilityState={{ selected: solved, busy: isUpdating, disabled: isUpdating }}
      disabled={isUpdating}
      onPress={() => onToggle?.(!solved)}
      style={({ pressed }) => [
        styles.badge,
        solved ? styles.solvedActive : styles.solvedInactive,
        pressed && styles.pressed,
      ]}
      testID={testID}>
      {isUpdating ? (
        <ActivityIndicator color={palette.success} size="small" />
      ) : (
        <Text style={[styles.label, solved ? styles.labelActive : styles.labelInactive]}>
          {solved ? '✓ Solved — tap to reopen' : 'Mark as solved'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.success,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  solvedActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
  },
  solvedInactive: {
    borderColor: palette.borderStrong,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
  labelActive: {
    color: palette.success,
  },
  labelInactive: {
    color: palette.textSecondary,
  },
});

export default SolvedToggle;

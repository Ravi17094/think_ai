import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export interface EnrollButtonProps {
  isEnrolled: boolean;
  onEnroll?: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function EnrollButton({
  isEnrolled,
  onEnroll,
  isSubmitting = false,
  disabled = false,
  testID = 'enroll-button',
}: EnrollButtonProps) {
  // Already-enrolled always wins: the control is disabled with an explanatory label.
  const isDisabled = disabled || isEnrolled || isSubmitting;
  const label = isEnrolled
    ? 'Enrolled'
    : isSubmitting
      ? 'Enrolling…'
      : 'Enroll now';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isSubmitting || undefined }}
      disabled={isDisabled}
      onPress={onEnroll}
      style={[
        styles.button,
        isEnrolled && styles.buttonEnrolled,
        isDisabled && !isEnrolled && styles.buttonDisabled,
      ]}
      testID={testID}>
      {isSubmitting && !isEnrolled ? (
        <ActivityIndicator color={palette.textInverse} size="small" />
      ) : null}
      <Text
        style={[styles.label, isEnrolled && styles.labelEnrolled]}
        testID={`${testID}-label`}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
  },
  buttonEnrolled: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.success,
  },
  buttonDisabled: {
    backgroundColor: palette.surfaceMuted,
  },
  label: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  labelEnrolled: {
    color: palette.success,
  },
});

export default EnrollButton;

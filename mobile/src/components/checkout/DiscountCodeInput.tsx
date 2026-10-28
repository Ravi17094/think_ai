import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import { formatINR } from '@/utils/pricing';
import type { DiscountValidation } from '@/types/community';

export interface DiscountCodeInputProps {
  value: string;
  onChange: (next: string) => void;
  onApply: () => void;
  onClear: () => void;
  isChecking?: boolean;
  validation: DiscountValidation | null;
  disabled?: boolean;
  testID?: string;
}

/** Discount code field wired to `POST /api/v1/payments/validate-discount`. */
export function DiscountCodeInput({
  value,
  onChange,
  onApply,
  onClear,
  isChecking = false,
  validation = null,
  disabled = false,
  testID = 'discount-input',
}: DiscountCodeInputProps) {
  const statusTestId =
    validation === null
      ? null
      : validation.valid
        ? `${testID}-status-valid`
        : `${testID}-status-invalid`;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Discount code"
          autoCapitalize="characters"
          editable={!disabled && !isChecking}
          maxLength={24}
          onChangeText={(text) => onChange(text.toUpperCase())}
          onSubmitEditing={onApply}
          placeholder="DISCOUNT code"
          placeholderTextColor={palette.textMuted}
          returnKeyType="go"
          style={styles.input}
          testID={`${testID}-field`}
          value={value}
        />
        <Pressable
          accessibilityLabel="Apply discount code"
          accessibilityRole="button"
          accessibilityState={{
            disabled: disabled || isChecking || value.trim() === '',
            busy: isChecking,
          }}
          disabled={disabled || isChecking || value.trim() === ''}
          onPress={onApply}
          style={({ pressed }) => [
            styles.applyButton,
            (disabled || isChecking || value.trim() === '') && styles.disabled,
            pressed && styles.pressed,
          ]}
          testID={`${testID}-apply`}>
          <Text style={styles.applyLabel}>
            {isChecking ? '…' : 'Apply'}
          </Text>
        </Pressable>
      </View>

      {validation !== null ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.status,
            validation.valid ? styles.statusValid : styles.statusInvalid,
          ]}
          testID={statusTestId ?? `${testID}-status`}>
          <Text
            style={[
              styles.statusText,
              validation.valid ? styles.statusTextValid : styles.statusTextInvalid,
            ]}
            testID={`${testID}-message`}>
            {validation.valid
              ? `${validation.message} (${formatINR(validation.discountAmount)} off)`
              : validation.message}
          </Text>
          {validation.valid ? (
            <Pressable
              accessibilityLabel="Remove discount code"
              accessibilityRole="button"
              hitSlop={hitSlop}
              onPress={onClear}
              testID={`${testID}-clear`}>
              <Text style={styles.clearLabel}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    color: palette.textPrimary,
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
  },
  applyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brandAlt,
    borderRadius: radii.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  applyLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusValid: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: palette.success,
  },
  statusInvalid: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: palette.danger,
  },
  statusText: {
    ...typography.caption,
    flex: 1,
  },
  statusTextValid: {
    color: palette.success,
  },
  statusTextInvalid: {
    color: palette.danger,
  },
  clearLabel: {
    ...typography.label,
    color: palette.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default DiscountCodeInput;

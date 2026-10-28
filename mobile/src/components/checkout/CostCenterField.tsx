import { StyleSheet, Text, TextInput, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

/** `AB-1234` — department cost centre used by the discount API. */
export const COST_CENTER_PATTERN = /^[A-Z]{2}-\d{4}$/;

export function isValidCostCenter(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || COST_CENTER_PATTERN.test(trimmed);
}

export interface CostCenterFieldProps {
  value: string;
  onChange: (next: string) => void;
  errorMessage?: string | null;
  testID?: string;
}

/** Optional company cost centre — validated only when filled in. */
export function CostCenterField({
  value,
  onChange,
  errorMessage = null,
  testID = 'cost-center-field',
}: CostCenterFieldProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>Cost centre (optional)</Text>
      <TextInput
        accessibilityLabel="Cost centre"
        autoCapitalize="characters"
        editable={!errorMessage}
        maxLength={7}
        onChangeText={(text) => onChange(text.toUpperCase())}
        placeholder="AB-1234"
        placeholderTextColor={palette.textMuted}
        style={[styles.input, errorMessage ? styles.inputError : null]}
        testID={`${testID}-input`}
        value={value}
      />
      <Text style={styles.hint} testID={`${testID}-hint`}>
        Format: two letters, dash, four digits (e.g. AB-1234). Required by some
        discount codes.
      </Text>
      {errorMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.error}
          testID={`${testID}-error`}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  label: {
    ...typography.label,
    color: palette.textSecondary,
  },
  input: {
    ...typography.body,
    color: palette.textPrimary,
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inputError: {
    borderColor: palette.danger,
  },
  hint: {
    ...typography.caption,
    color: palette.textMuted,
  },
  error: {
    ...typography.caption,
    color: palette.danger,
  },
});

export default CostCenterField;

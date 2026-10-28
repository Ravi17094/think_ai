import { StyleSheet, Text, TextInput, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import type { CardDetails } from '@/types/community';

export interface CardFormErrors {
  number?: string;
  expiry?: string;
  cvv?: string;
  name?: string;
}

export interface CardFormProps {
  value: CardDetails;
  onChange: (next: CardDetails) => void;
  errorMessage?: string | null;
  /** Force field errors visible (e.g. after a blocked Pay tap). */
  showErrors?: boolean;
  testID?: string;
}

/** Luhn checksum over the digit string. */
export function luhnCheck(digits: string): boolean {
  if (digits.length < 12 || !/^\d+$/.test(digits)) {
    return false;
  }
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let payload = digits.charCodeAt(i) - 48;
    if (double) {
      payload *= 2;
      if (payload > 9) {
        payload -= 9;
      }
    }
    sum += payload;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits);
}

/** Groups digits in 4s, max 19 digits. */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** Normalises typed expiry to `MM/YY`. */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function validateExpiry(value: string, now: Date = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) {
    return false;
  }
  const endOfMonth = new Date(year, month, 1).getTime();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return endOfMonth > startOfCurrentMonth;
}

export function validateCvv(value: string): boolean {
  return /^\d{3,4}$/.test(value);
}

/** Per-field validation used by the screen before payment starts. */
export function validateCard(card: CardDetails): CardFormErrors {
  const errors: CardFormErrors = {};
  if (!validateCardNumber(card.number)) {
    errors.number = 'Enter a valid card number (Luhn check).';
  }
  if (!validateExpiry(card.expiry)) {
    errors.expiry = 'Use MM/YY in the future.';
  }
  if (!validateCvv(card.cvv)) {
    errors.cvv = '3 or 4 digits.';
  }
  if (card.name.trim().length < 2) {
    errors.name = 'Name on card is required.';
  }
  return errors;
}

const FIELDS: {
  key: keyof CardDetails;
  label: string;
  placeholder: string;
  keyboard: 'number-pad' | 'default';
  maxLength: number;
  errorKey: keyof CardFormErrors;
}[] = [
  {
    key: 'number',
    label: 'Card number',
    placeholder: '4242 4242 4242 4242',
    keyboard: 'number-pad',
    maxLength: 23,
    errorKey: 'number',
  },
  {
    key: 'expiry',
    label: 'Expiry',
    placeholder: 'MM/YY',
    keyboard: 'number-pad',
    maxLength: 5,
    errorKey: 'expiry',
  },
  {
    key: 'cvv',
    label: 'CVV',
    placeholder: '123',
    keyboard: 'number-pad',
    maxLength: 4,
    errorKey: 'cvv',
  },
  {
    key: 'name',
    label: 'Name on card',
    placeholder: 'Ada Lovelace',
    keyboard: 'default',
    maxLength: 60,
    errorKey: 'name',
  },
];

/**
 * Controlled card form with inline formatting and per-field validation
 * (Luhn, expiry window, CVV shape) — no payment SDK, client-side only.
 */
export function CardForm({
  value,
  onChange,
  errorMessage = null,
  showErrors = false,
  testID = 'card-form',
}: CardFormProps) {
  const errors = validateCard(value);
  const fieldErrorsVisible = showErrors || value.number !== '' || value.expiry !== '';

  const update = (key: keyof CardDetails, raw: string) => {
    if (key === 'number') {
      onChange({ ...value, number: formatCardNumber(raw) });
    } else if (key === 'expiry') {
      onChange({ ...value, expiry: formatExpiry(raw) });
    } else if (key === 'cvv') {
      onChange({ ...value, cvv: raw.replace(/\D/g, '').slice(0, 4) });
    } else {
      onChange({ ...value, [key]: raw });
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.field, styles.fieldWide]}>
        <Text style={styles.label}>{FIELDS[0]?.label}</Text>
        <TextInput
          accessibilityLabel="Card number"
          keyboardType="number-pad"
          maxLength={FIELDS[0]?.maxLength}
          onChangeText={(text) => update('number', text)}
          placeholder={FIELDS[0]?.placeholder}
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          testID={`${testID}-number`}
          value={value.number}
        />
        {fieldErrorsVisible && errors.number ? (
          <Text style={styles.fieldError} testID={`${testID}-number-error`}>
            {errors.number}
          </Text>
        ) : null}
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Expiry</Text>
          <TextInput
            accessibilityLabel="Card expiry"
            keyboardType="number-pad"
            maxLength={5}
            onChangeText={(text) => update('expiry', text)}
            placeholder="MM/YY"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            testID={`${testID}-expiry`}
            value={value.expiry}
          />
          {fieldErrorsVisible && errors.expiry ? (
            <Text style={styles.fieldError} testID={`${testID}-expiry-error`}>
              {errors.expiry}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            accessibilityLabel="Card CVV"
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(text) => update('cvv', text)}
            placeholder="123"
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            style={styles.input}
            testID={`${testID}-cvv`}
            value={value.cvv}
          />
          {fieldErrorsVisible && errors.cvv ? (
            <Text style={styles.fieldError} testID={`${testID}-cvv-error`}>
              {errors.cvv}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Name on card</Text>
        <TextInput
          accessibilityLabel="Name on card"
          autoCapitalize="words"
          keyboardType="default"
          maxLength={60}
          onChangeText={(text) => update('name', text)}
          placeholder="Name as printed"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          testID={`${testID}-name`}
          value={value.name}
        />
        {fieldErrorsVisible && errors.name ? (
          <Text style={styles.fieldError} testID={`${testID}-name-error`}>
            {errors.name}
          </Text>
        ) : null}
      </View>

      {errorMessage ? (
        <Text
          accessibilityLiveRegion="assertive"
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
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    gap: spacing.xxs,
  },
  fieldWide: {
    flex: undefined,
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
  fieldError: {
    ...typography.caption,
    color: palette.warning,
  },
  error: {
    ...typography.label,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: palette.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.danger,
    padding: spacing.sm,
  },
});

export default CardForm;

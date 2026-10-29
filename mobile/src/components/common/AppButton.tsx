import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  /** Shows a spinner and blocks presses (submit / paying states). */
  loading?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Shared action button so every screen's primary/secondary actions match. */
export function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  loadingLabel,
  style,
  testID,
}: AppButtonProps) {
  const isBlocked = loading || disabled;
  const label = loading && loadingLabel ? loadingLabel : title;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      disabled={isBlocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        isBlocked && styles.blocked,
        pressed && !isBlocked && styles.pressed,
        style,
      ]}
      testID={testID}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? palette.textPrimary : palette.textInverse}
          size="small"
          style={styles.spinner}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          variant === 'primary' && {color: palette.textPrimary},
          variant === 'secondary' && styles.secondaryLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
  },
  secondary: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  danger: {
    backgroundColor: palette.danger,
  },
  blocked: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  spinner: {
    marginRight: spacing.xxs,
  },
  label: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: palette.textPrimary,
  },
});

export default AppButton;

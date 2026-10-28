import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shows a spinner and blocks both actions while the request runs. */
  isBusy?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Shared confirmation dialog (create post, moderation destructive actions,
 * checkout). The confirm button doubles as the in-flight indicator so screens
 * do not have to track a second "submitting" affordance.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isBusy = false,
  errorMessage = null,
  onConfirm,
  onCancel,
  testID = 'confirm-dialog',
}: ConfirmDialogProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!isBusy) {
          onCancel();
        }
      }}
      transparent
      visible={visible}>
      <View style={styles.backdrop} testID={`${testID}-backdrop`}>
        <View
          accessibilityViewIsModal
          style={styles.card}
          testID={testID}>
          <Text
            accessibilityRole="header"
            style={styles.title}
            testID={`${testID}-title`}>
            {title}
          </Text>
          {message ? (
            <Text style={styles.message} testID={`${testID}-message`}>
              {message}
            </Text>
          ) : null}

          {errorMessage ? (
            <Text
              accessibilityLiveRegion="assertive"
              style={styles.error}
              testID={`${testID}-error`}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy }}
              disabled={isBusy}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                isBusy && styles.disabled,
                pressed && styles.pressed,
              ]}
              testID={`${testID}-cancel`}>
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isBusy, disabled: isBusy }}
              disabled={isBusy}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                isBusy && styles.disabled,
                pressed && styles.pressed,
              ]}
              testID={`${testID}-confirm`}>
              {isBusy ? (
                <ActivityIndicator color={palette.textInverse} size="small" />
              ) : (
                <Text style={styles.confirmLabel}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.overlay,
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  message: {
    ...typography.body,
    color: palette.textSecondary,
  },
  error: {
    ...typography.caption,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: palette.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.danger,
    padding: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  cancelButton: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  confirmButton: {
    backgroundColor: palette.brand,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  cancelLabel: {
    ...typography.label,
    color: palette.textPrimary,
  },
  confirmLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
});

export default ConfirmDialog;

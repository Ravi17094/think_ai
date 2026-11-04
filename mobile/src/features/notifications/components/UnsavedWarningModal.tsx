import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function UnsavedWarningModal({
  visible,
  onDiscard,
  onCancel,
}: {
  visible: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" testID="unsaved-warning-modal">
      <View style={styles.backdrop}>
        <View
          accessibilityViewIsModal
          style={styles.card}
          testID="unsaved-warning-card">
          <Text accessibilityRole="header" style={styles.title}>
            Unsaved changes
          </Text>
          <Text style={styles.description}>You have unsaved changes. Discard them?</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.action, styles.cancel]} onPress={onCancel} testID="unsaved-cancel"><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.action, styles.discard]} onPress={onDiscard} testID="unsaved-discard"><Text style={styles.discardText}>Discard</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radii.xl,
    width: '80%',
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  description: { ...typography.body, color: palette.textSecondary },
  action: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  cancel: { borderColor: palette.borderStrong, borderWidth: 1 },
  discard: { backgroundColor: palette.danger },
  cancelText: { ...typography.label, color: palette.textPrimary },
  discardText: { ...typography.label, color: palette.textInverse },
});

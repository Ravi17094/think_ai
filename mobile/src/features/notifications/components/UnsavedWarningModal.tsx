import { Modal, StyleSheet, Text, Button, View } from 'react-native';

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
          <Text>You have unsaved changes. Discard them?</Text>
          <View style={styles.actions}>
            <Button title="Cancel" onPress={onCancel} testID="unsaved-cancel" />
            <Button title="Discard" color="red" onPress={onDiscard} testID="unsaved-discard" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

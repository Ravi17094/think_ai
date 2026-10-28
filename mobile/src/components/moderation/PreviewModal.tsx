import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import { MentionText } from '@/components/forum/MentionText';

export interface PreviewModalProps {
  visible: boolean;
  title: string;
  body: string;
  /** Small line above the title (type, author, timestamp…). */
  meta?: string;
  onClose: () => void;
  testID?: string;
}

/** Read-only content preview used by the moderation queue and user posts. */
export function PreviewModal({
  visible,
  title,
  body,
  meta,
  onClose,
  testID = 'preview-modal',
}: PreviewModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={styles.backdrop} testID={`${testID}-backdrop`}>
        <View style={styles.sheet} testID={testID}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Preview</Text>
            <Pressable
              accessibilityLabel="Close preview"
              accessibilityRole="button"
              onPress={onClose}
              testID={`${testID}-close`}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} testID={`${testID}-content`}>
            {meta ? (
              <Text style={styles.meta} testID={`${testID}-meta`}>
                {meta}
              </Text>
            ) : null}
            <Text style={styles.title} testID={`${testID}-title`}>
              {title}
            </Text>
            <MentionText text={body} testID={`${testID}-body`} />
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
            testID={`${testID}-done`}>
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: palette.overlay,
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: palette.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  close: {
    ...typography.subtitle,
    color: palette.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  body: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  meta: {
    ...typography.caption,
    color: palette.accent,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brand,
    borderRadius: radii.pill,
    marginHorizontal: spacing.md,
    minHeight: 44,
  },
  doneLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default PreviewModal;

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/common';
import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { ForumCategory } from '@/types';
import { MarkdownPreview } from './MarkdownPreview';

export interface PostPreviewModalProps {
  visible: boolean;
  title: string;
  body: string;
  category?: ForumCategory | undefined;
  tags: string[];
  isSubmitting?: boolean;
  errorMessage?: string | null;
  /** "Keep editing" — dismisses the preview. */
  onClose: () => void;
  /** "Publish" — opens the confirmation dialog (or submits directly). */
  onPublish: () => void;
  testID?: string;
}

/**
 * Rendered preview of the new thread — same content the rich editor's inline
 * preview shows, plus category/tag chips and the publish action.
 */
export function PostPreviewModal({
  visible,
  title,
  body,
  category,
  tags,
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onPublish,
  testID = 'post-preview-modal',
}: PostPreviewModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={styles.backdrop} testID={`${testID}-backdrop`}>
        <View accessibilityViewIsModal style={styles.sheet} testID={testID}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              Preview
            </Text>
            <Pressable
              accessibilityLabel="Close preview"
              accessibilityRole="button"
              hitSlop={hitSlop}
              onPress={onClose}
              testID={`${testID}-close`}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            testID={`${testID}-content`}>
            <View style={styles.badgeRow}>
              {category ? (
                <Text style={[styles.category, { color: category.color }]}>
                  {category.name}
                </Text>
              ) : null}
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <Text
              accessibilityRole="header"
              style={styles.title}
              testID={`${testID}-title`}>
              {title.trim() === '' ? 'Untitled thread' : title}
            </Text>

            <MarkdownPreview testID={`${testID}-body`} value={body} />

            {errorMessage ? (
              <Text
                accessibilityLiveRegion="assertive"
                style={styles.error}
                testID={`${testID}-error`}>
                {errorMessage}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <AppButton
              onPress={onClose}
              style={styles.action}
              testID={`${testID}-edit`}
              title="Keep editing"
              variant="secondary"
            />
            <AppButton
              loading={isSubmitting}
              loadingLabel="Posting…"
              onPress={onPublish}
              style={styles.action}
              testID={`${testID}-publish`}
              title="Publish thread"
            />
          </View>
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
    maxHeight: '90%',
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  category: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tag: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  tagText: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
  },
  error: {
    ...typography.caption,
    color: palette.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  action: {
    flex: 1,
  },
});

export default PostPreviewModal;

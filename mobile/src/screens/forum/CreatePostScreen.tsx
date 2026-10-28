import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, ConfirmDialog, ErrorState, ScreenHeader } from '@/components/common';
import { CategoryDropdown } from '@/components/forum/CategoryDropdown';
import { CreatePostSkeleton } from '@/components/forum/CreatePostSkeleton';
import { PostPreviewModal } from '@/components/forum/PostPreviewModal';
import { RichTextEditor } from '@/components/forum/RichTextEditor';
import { TagMultiSelect } from '@/components/forum/TagMultiSelect';
import { TITLE_MIN_LENGTH } from '@/components/forum/CreatePostModal';
import { useCreateThread } from '@/hooks/useCreateThread';
import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

/**
 * Page 7 — Create Post (`/forum/new`).
 *
 * Title / category / rich body / tags form with inline validation, a rendered
 * preview modal and a confirmation dialog before the discussion is created.
 */
export function CreatePostScreen({ navigation }: ScreenProps<'CreatePost'>) {
  const {
    categories,
    availableTags,
    isLoading,
    hasError,
    loadError,
    isSubmitting,
    submitError,
    clearSubmitError,
    createThread,
    reload,
  } = useCreateThread();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Adopt the first category once the taxonomy resolves (same as Page 5).
  useEffect(() => {
    if (categoryId === '' && categories.length > 0) {
      setCategoryId(categories[0]?.id ?? '');
    }
  }, [categories, categoryId]);

  const validate = useCallback((): string | null => {
    if (title.trim().length < TITLE_MIN_LENGTH) {
      return `Add a title of at least ${TITLE_MIN_LENGTH} characters.`;
    }
    if (body.trim() === '') {
      return 'Add a body before posting.';
    }
    if (categoryId === '') {
      return 'Pick a category.';
    }
    return null;
  }, [body, categoryId, title]);

  const openPreview = useCallback(() => {
    const problem = validate();
    setValidationError(problem);
    if (problem === null) {
      setShowPreview(true);
    }
  }, [validate]);

  const requestSubmit = useCallback(() => {
    const problem = validate();
    setValidationError(problem);
    if (problem === null) {
      clearSubmitError();
      setShowConfirm(true);
    }
  }, [clearSubmitError, validate]);

  const handleConfirm = useCallback(async () => {
    try {
      const result = await createThread({
        title: title.trim(),
        body: body.trim(),
        categoryId,
        tags,
      });
      setShowConfirm(false);
      setShowPreview(false);
      setTitle('');
      setBody('');
      setTags([]);
      navigation.navigate('ForumThread', { threadId: result.id });
    } catch {
      // submitError is surfaced inside the dialog; keep it open for a retry.
    }
  }, [body, categoryId, createThread, navigation, tags, title]);

  const selectedCategory = categories.find((item) => item.id === categoryId);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="create-post">
      <ScreenHeader
        subtitle="Share a question with the community"
        testID="create-post-header"
        title="New thread"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          testID="create-post-scroll">
          {isLoading ? (
            <CreatePostSkeleton />
          ) : hasError ? (
            <ErrorState
              message={loadError ?? 'Unable to load the form options.'}
              onRetry={() => void reload()}
              testID="create-post-error"
            />
          ) : (
            <View style={styles.form}>
              <View>
                <Text style={styles.label} testID="create-post-title-label">
                  Title
                </Text>
                <TextInput
                  accessibilityLabel="Thread title"
                  onChangeText={setTitle}
                  placeholder="What do you want to discuss?"
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                  testID="create-post-title"
                  value={title}
                />
                <Text style={styles.hint} testID="create-post-title-hint">
                  {title.trim().length}/{TITLE_MIN_LENGTH} characters minimum
                </Text>
              </View>

              <View>
                <Text style={styles.label}>Category</Text>
                <CategoryDropdown
                  categories={categories}
                  onChange={setCategoryId}
                  testID="create-post-category"
                  value={categoryId}
                />
              </View>

              <View>
                <Text style={styles.label}>Body</Text>
                <RichTextEditor
                  mentions
                  minHeight={160}
                  onChangeText={setBody}
                  placeholder="Add context, code or links… use @ to mention a member"
                  testID="create-post-body"
                  value={body}
                />
              </View>

              <View>
                <Text style={styles.label}>Tags</Text>
                <TagMultiSelect
                  onChange={setTags}
                  availableTags={availableTags}
                  testID="create-post-tags"
                  value={tags}
                />
              </View>

              {validationError ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={styles.error}
                  testID="create-post-validation-error">
                  {validationError}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <AppButton
                  onPress={openPreview}
                  style={styles.action}
                  testID="create-post-preview"
                  title="Preview"
                  variant="secondary"
                />
                <AppButton
                  onPress={requestSubmit}
                  style={styles.action}
                  testID="create-post-submit"
                  title="Post thread"
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PostPreviewModal
        body={body}
        category={selectedCategory}
        errorMessage={null}
        isSubmitting={isSubmitting}
        onClose={() => setShowPreview(false)}
        onPublish={() => {
          setShowPreview(false);
          clearSubmitError();
          setShowConfirm(true);
        }}
        tags={tags}
        title={title}
        visible={showPreview}
      />

      <ConfirmDialog
        confirmLabel="Post thread"
        errorMessage={submitError}
        isBusy={isSubmitting}
        message="Your thread will be visible to the whole community."
        onCancel={() => {
          if (!isSubmitting) {
            setShowConfirm(false);
          }
        }}
        onConfirm={() => void handleConfirm()}
        testID="create-post-confirm"
        title="Post this thread?"
        visible={showConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  form: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  label: {
    ...typography.label,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
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
  hint: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: spacing.xxs,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});

export default CreatePostScreen;

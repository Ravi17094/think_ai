import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';

import { useApiClient } from '@/hooks/useApiClient';
import {
  hitSlop,
  palette,
  radii,
  SEARCH_DEBOUNCE_MS,
  spacing,
  typography,
} from '@/theme/tokens';
import type { MentionUser } from '@/types/community';
import { MarkdownPreview } from './MarkdownPreview';
import { MentionAutocomplete, detectMention } from './MentionAutocomplete';

export interface RichTextEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  errorMessage?: string | null;
  /** Show the `** _ ` []` formatting toolbar. Defaults to `true`. */
  toolbar?: boolean;
  /** Show the Write/Preview toggle. Defaults to `true`. */
  previewToggle?: boolean;
  /** Enable `@` member autocomplete. Defaults to `false`. */
  mentions?: boolean;
  minHeight?: number;
  testID?: string;
}

interface ToolbarButton {
  key: string;
  label: string;
  accessibilityLabel: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { key: 'bold', label: 'B', accessibilityLabel: 'Bold' },
  { key: 'italic', label: 'I', accessibilityLabel: 'Italic' },
  { key: 'code', label: '<>', accessibilityLabel: 'Inline code' },
  { key: 'link', label: '🔗', accessibilityLabel: 'Insert link' },
];

/**
 * Multiline editor shared by the reply composer (Page 6) and the create-post
 * form (Page 7): formatting toolbar with selection wrapping, Write/Preview
 * toggle and optional `@` mention autocomplete.
 */
export function RichTextEditor({
  value,
  onChangeText,
  label,
  placeholder,
  errorMessage,
  toolbar = true,
  previewToggle = true,
  mentions = false,
  minHeight = 120,
  testID = 'rich-text-editor',
}: RichTextEditorProps) {
  const client = useApiClient();
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isPreview, setIsPreview] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mention = useMemo(
    () => (mentions ? detectMention(value, selection.end) : null),
    [mentions, value, selection.end]
  );

  // Debounced member lookup while an `@query` is active.
  useEffect(() => {
    if (mention === null) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    const timer = setTimeout(() => {
      client
        .searchMentionUsers(mention.query)
        .then((users) => {
          if (active) {
            setSuggestions(users);
            setIsSearching(false);
          }
        })
        .catch(() => {
          if (active) {
            setSuggestions([]);
            setIsSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [client, mention]);

  const applyWrap = (marker: string) => {
    const { start, end } = selection;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
    onChangeText(next);
    const innerStart = start + marker.length;
    setSelection({ start: innerStart, end: innerStart + selected.length });
  };

  const applyLink = () => {
    const { start, end } = selection;
    const selected = value.slice(start, end) || 'link text';
    const next = `${value.slice(0, start)}[${selected}](https://)${value.slice(end)}`;
    onChangeText(next);
    const caret = start + selected.length + 3;
    setSelection({ start: caret, end: caret });
  };

  const insertMention = (user: MentionUser) => {
    if (!mention) {
      return;
    }
    const after = mention.start + 1 + mention.query.length;
    const next = `${value.slice(0, mention.start)}@${user.username} ${value.slice(after)}`;
    onChangeText(next);
    const caret = mention.start + user.username.length + 2;
    setSelection({ start: caret, end: caret });
    inputRef.current?.focus();
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    const { start, end } = event.nativeEvent.selection;
    setSelection({ start, end });
  };

  const handleTogglePreview = () => {
    setIsPreview((current) => {
      if (current) {
        inputRef.current?.focus();
      }
      return !current;
    });
  };

  return (
    <View style={styles.container} testID={testID}>
      {label ? (
        <Text style={styles.label} testID={`${testID}-label`}>
          {label}
        </Text>
      ) : null}

      {toolbar && !isPreview ? (
        <ScrollView
          contentContainerStyle={styles.toolbar}
          horizontal
          testID={`${testID}-toolbar`}>
          {TOOLBAR_BUTTONS.map((button) => (
            <Pressable
              accessibilityLabel={button.accessibilityLabel}
              accessibilityRole="button"
              hitSlop={hitSlop}
              key={button.key}
              onPress={() => {
                if (button.key === 'link') {
                  applyLink();
                  return;
                }
                const marker = MARKERS[button.key];
                if (marker) {
                  applyWrap(marker);
                }
              }}
              style={({ pressed }) => [styles.toolButton, pressed && styles.toolPressed]}
              testID={`${testID}-tool-${button.key}`}>
              <Text
                style={[
                  styles.toolLabel,
                  button.key === 'italic' && styles.italic,
                  button.key === 'code' && styles.mono,
                ]}>
                {button.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {isPreview ? (
        <View style={[styles.previewBox, { minHeight }]} testID={`${testID}-preview`}>
          <MarkdownPreview value={value} testID={`${testID}-preview-content`} />
        </View>
      ) : (
        <TextInput
          accessibilityLabel={label ?? 'Message'}
          multiline
          onChangeText={onChangeText}
          onSelectionChange={handleSelectionChange}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          ref={inputRef}
          selection={selection}
          style={[styles.input, { minHeight }]}
          testID={`${testID}-input`}
          value={value}
        />
      )}

      {mentions && !isPreview ? (
        <MentionAutocomplete
          isLoading={isSearching}
          onSelect={insertMention}
          query={mention?.query ?? null}
          suggestions={suggestions}
          testID={`${testID}-mentions`}
        />
      ) : null}

      <View style={styles.footerRow}>
        {previewToggle ? (
          <Pressable
            accessibilityLabel={isPreview ? 'Back to editing' : 'Preview'}
            accessibilityRole="button"
            accessibilityState={{ selected: isPreview }}
            hitSlop={hitSlop}
            onPress={handleTogglePreview}
            style={({ pressed }) => [styles.toggle, pressed && styles.toolPressed]}
            testID={`${testID}-toggle-preview`}>
            <Text style={styles.toggleLabel}>
              {isPreview ? 'Back to editing' : 'Preview'}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.error} testID={`${testID}-error`}>
            {errorMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const MARKERS: Record<string, string> = {
  bold: '**',
  italic: '_',
  code: '`',
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...typography.label,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  toolButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  toolPressed: {
    opacity: 0.7,
  },
  toolLabel: {
    ...typography.label,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  mono: {
    ...typography.mono,
  },
  input: {
    ...typography.body,
    color: palette.textPrimary,
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  previewBox: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  toggleLabel: {
    ...typography.label,
    color: palette.accent,
  },
  error: {
    ...typography.caption,
    color: palette.danger,
    flexShrink: 1,
    textAlign: 'right',
  },
});

export default RichTextEditor;

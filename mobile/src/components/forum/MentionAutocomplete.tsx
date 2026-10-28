import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { MentionUser } from '@/types/community';

export interface MentionAutocompleteProps {
  /** The text after `@` at the caret, or `null` when the popover is closed. */
  query: string | null;
  suggestions: MentionUser[];
  isLoading?: boolean;
  onSelect: (user: MentionUser) => void;
  testID?: string;
}

/**
 * Finds a trailing `@mention` before the caret.
 *
 * Returns the query (without `@`) and the index of the `@` so the caller can
 * splice the completed username in. Matches at the start of the text or after
 * whitespace, mirroring the web editor.
 */
export function detectMention(
  text: string,
  cursor: number
): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = /(?:^|\s)@([A-Za-z0-9_]{0,20})$/.exec(before);
  if (!match) {
    return null;
  }
  const query = match[1] ?? '';
  return { query, start: before.length - query.length - 1 };
}

/** Popover list of matching members rendered under the editor's `@` caret. */
export function MentionAutocomplete({
  query,
  suggestions,
  isLoading = false,
  onSelect,
  testID = 'mention-autocomplete',
}: MentionAutocompleteProps) {
  if (query === null) {
    return null;
  }

  return (
    <View style={styles.panel} testID={testID}>
      {isLoading ? (
        <View
          accessibilityLabel="Searching members"
          accessibilityLiveRegion="polite"
          accessible
          style={styles.statusRow}
          testID={`${testID}-loading`}>
          <ActivityIndicator color={palette.brandAlt} size="small" />
          <Text style={styles.statusText}>Searching members…</Text>
        </View>
      ) : suggestions.length === 0 ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.statusText}
          testID={`${testID}-empty`}>
          No matching members.
        </Text>
      ) : (
        suggestions.map((user) => (
          <Pressable
            accessibilityLabel={`Mention ${user.username}`}
            accessibilityRole="button"
            hitSlop={hitSlop}
            key={user.id}
            onPress={() => onSelect(user)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            testID={`mention-option-${user.username}`}>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    maxHeight: 180,
    overflow: 'hidden',
    paddingVertical: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowPressed: {
    backgroundColor: palette.surfaceMuted,
  },
  username: {
    ...typography.label,
    color: palette.brand,
    fontWeight: '700',
  },
  name: {
    ...typography.caption,
    color: palette.textSecondary,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: palette.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});

export default MentionAutocomplete;

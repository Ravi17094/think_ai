import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';

export const MAX_TAGS = 5;

export interface TagMultiSelectProps {
  /** Taxonomy suggestions from `GET /api/discussions/tags`. */
  availableTags: string[];
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  /** Allow typing a custom tag that is not in the taxonomy. Defaults to `true`. */
  allowCustom?: boolean;
  testID?: string;
}

/** Multi-select chips for thread tags plus an optional free-form tag entry. */
export function TagMultiSelect({
  availableTags,
  value,
  onChange,
  maxTags = MAX_TAGS,
  allowCustom = true,
  testID = 'tag-multi-select',
}: TagMultiSelectProps) {
  const [customTag, setCustomTag] = useState('');
  const isFull = value.length >= maxTags;

  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((entry) => entry !== tag));
    } else if (!isFull) {
      onChange([...value, tag]);
    }
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (!tag || value.includes(tag) || isFull) {
      return;
    }
    onChange([...value, tag]);
    setCustomTag('');
  };

  const suggestions = availableTags.filter((tag) => !value.includes(tag));

  return (
    <View style={styles.container} testID={testID}>
      {value.length > 0 ? (
        <View style={styles.chipRow} testID={`${testID}-selected`}>
          {value.map((tag) => (
            <Pressable
              accessibilityLabel={`Remove tag ${tag}`}
              accessibilityRole="button"
              hitSlop={hitSlop}
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.chip, styles.chipSelected]}
              testID={`${testID}-selected-${tag}`}>
              <Text style={styles.chipSelectedText}>{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.chipRow} testID={`${testID}-suggestions`}>
          {suggestions.map((tag) => (
            <Pressable
              accessibilityLabel={`Add tag ${tag}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false, disabled: isFull }}
              hitSlop={hitSlop}
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.chip, isFull && styles.chipDisabled]}
              testID={`${testID}-option-${tag}`}>
              <Text style={styles.chipText}>+ {tag}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {allowCustom ? (
        <View style={styles.customRow}>
          <TextInput
            accessibilityLabel="Custom tag"
            editable={!isFull}
            onChangeText={setCustomTag}
            onSubmitEditing={addCustomTag}
            placeholder={isFull ? `Max ${maxTags} tags` : 'Add your own tag'}
            placeholderTextColor={palette.textMuted}
            returnKeyType="done"
            style={styles.customInput}
            testID={`${testID}-custom-input`}
            value={customTag}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!customTag.trim() || isFull}
            onPress={addCustomTag}
            style={({ pressed }) => [
              styles.addButton,
              (!customTag.trim() || isFull) && styles.addDisabled,
              pressed && styles.pressed,
            ]}
            testID={`${testID}-custom-add`}>
            <Text style={styles.addLabel}>Add</Text>
          </Pressable>
        </View>
      ) : null}

      <Text
        accessibilityLiveRegion="polite"
        style={styles.counter}
        testID={`${testID}-counter`}>
        {value.length}/{maxTags} tags
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: palette.brandAlt,
    borderColor: palette.brandAlt,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  chipSelectedText: {
    ...typography.caption,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  customInput: {
    ...typography.body,
    color: palette.textPrimary,
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brand,
    borderRadius: radii.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  addDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  addLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  counter: {
    ...typography.caption,
    color: palette.textMuted,
  },
});

export default TagMultiSelect;

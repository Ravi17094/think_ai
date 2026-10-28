import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';

export interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onChange: (nextSelected: string[]) => void;
  testID?: string;
}

export function TagFilter({
  tags,
  selectedTags,
  onChange,
  testID = 'tag-filter',
}: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  const toggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((entry) => entry !== tag));
      return;
    }
    // Multi-select: tapping an unselected tag adds it to the set.
    onChange([...selectedTags, tag]);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}>
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        return (
          <Pressable
            accessibilityLabel={tag}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            hitSlop={hitSlop}
            key={tag}
            onPress={() => toggle(tag)}
            style={[styles.chip, isSelected && styles.chipSelected]}
            testID={`${testID}-${tag}`}>
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}>
              {isSelected ? `✓ ${tag}` : tag}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  chipSelected: {
    backgroundColor: palette.brandAlt,
    borderColor: palette.brandAlt,
  },
  label: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  labelSelected: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
});

export default TagFilter;

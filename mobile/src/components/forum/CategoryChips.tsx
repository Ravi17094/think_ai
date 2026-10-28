import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { ForumCategory } from '@/types';

export interface CategoryChipsProps {
  categories: ForumCategory[];
  selectedCategoryId: string | null;
  /** `null` selects the "All" chip. */
  onSelect: (categoryId: string | null) => void;
  testID?: string;
}

export const ALL_CATEGORY_LABEL = 'All';

export function CategoryChips({
  categories,
  selectedCategoryId,
  onSelect,
  testID = 'category-chips',
}: CategoryChipsProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}>
      <CategoryChip
        color={palette.brand}
        isSelected={selectedCategoryId === null}
        label={ALL_CATEGORY_LABEL}
        onPress={() => onSelect(null)}
        testID={`${testID}-all`}
      />
      {categories.map((category) => (
        <CategoryChip
          color={category.color}
          isSelected={selectedCategoryId === category.id}
          key={category.id}
          label={category.name}
          onPress={() => onSelect(category.id)}
          testID={`${testID}-${category.id}`}
        />
      ))}
    </ScrollView>
  );
}

interface CategoryChipProps {
  label: string;
  color: string;
  isSelected: boolean;
  onPress: () => void;
  testID: string;
}

function CategoryChip({
  label,
  color,
  isSelected,
  onPress,
  testID,
}: CategoryChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      hitSlop={hitSlop}
      onPress={onPress}
      style={[
        styles.chip,
        isSelected
          ? { backgroundColor: color, borderColor: color }
          : styles.chipIdle,
      ]}
      testID={testID}>
      <Text style={[styles.label, isSelected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  label: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  labelSelected: {
    color: palette.textInverse,
    fontWeight: '700',
  },
});

export default CategoryChips;

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { COURSE_CATEGORIES } from '@/utils/course';
import type { Palette } from '@/theme/tokens';
import { minTouchTarget, radii, spacing, typography } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { CourseCategoryId } from '@/types';

export interface CategoryChipsProps {
  value: CourseCategoryId | 'all';
  onChange: (next: CourseCategoryId | 'all') => void;
  includeAll?: boolean;
  counts?: Partial<Record<CourseCategoryId | 'all', number>>;
  testID?: string;
}

export function CategoryChips({
  value,
  onChange,
  includeAll = true,
  counts,
  testID = 'category-chips',
}: CategoryChipsProps) {
  const styles = useThemedStyles(createStyles);
  const options: { id: CourseCategoryId | 'all'; label: string; icon: string }[] =
    [
      ...(includeAll
        ? [{ id: 'all' as const, label: 'All courses', icon: '✨' }]
        : []),
      ...COURSE_CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        icon: category.icon,
      })),
    ];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}>
      {options.map((option) => {
        const selected = option.id === value;
        const count = counts?.[option.id];
        return (
          <Pressable
            accessibilityLabel={
              count === undefined ? option.label : `${option.label}, ${count} courses`
            }
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[styles.chip, selected && styles.chipSelected]}
            testID={`category-chip-${option.id}`}>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.icon}>
              {option.icon}
            </Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
              {count === undefined ? '' : ` (${count})`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  content: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chip: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  chipSelected: {
    borderColor: palette.brand,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    ...typography.label,
    color: palette.textSecondary,
  },
  labelSelected: {
    color: palette.textPrimary,
  },
});

export default CategoryChips;

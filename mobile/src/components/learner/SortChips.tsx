import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { minTouchTarget, radii, spacing, typography } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { CourseSortOption } from '@/types';
import { COURSE_SORT_OPTIONS } from '@/utils/course';

export interface SortChipsProps {
  value: CourseSortOption;
  onChange: (next: CourseSortOption) => void;
  testID?: string;
}

export function SortChips({
  value,
  onChange,
  testID = 'sort-chips',
}: SortChipsProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView
      accessibilityLabel="Sort courses"
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}>
      {COURSE_SORT_OPTIONS.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.chip, selected && styles.chipSelected]}
            testID={`sort-chip-${option.key}`}>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  content: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chip: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipSelected: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
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

export default SortChips;

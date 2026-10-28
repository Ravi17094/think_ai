import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { CourseStatusFilter } from '@/types';

export const COURSE_STATUS_FILTERS: readonly {
  key: CourseStatusFilter;
  label: string;
}[] = [
  { key: 'all', label: 'All' },
  { key: 'in-progress', label: 'In-progress' },
  { key: 'completed', label: 'Completed' },
];

export interface FilterTabsProps {
  value: CourseStatusFilter;
  onChange: (next: CourseStatusFilter) => void;
  /** Optional per-tab result counts rendered in parentheses. */
  counts?: Partial<Record<CourseStatusFilter, number>>;
  testID?: string;
}

export function FilterTabs({
  value,
  onChange,
  counts,
  testID = 'filter-tabs',
}: FilterTabsProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}>
      {COURSE_STATUS_FILTERS.map((filter) => {
        const isSelected = value === filter.key;
        const count = counts?.[filter.key];
        const label = count === undefined ? filter.label : `${filter.label} (${count})`;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={filter.label}
            hitSlop={hitSlop}
            key={filter.key}
            onPress={() => onChange(filter.key)}
            style={[styles.tab, isSelected && styles.tabSelected]}
            testID={`${testID}-${filter.key}`}>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {label}
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
    paddingVertical: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    marginRight: spacing.xs,
  },
  tabSelected: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  label: {
    ...typography.label,
    color: palette.textSecondary,
  },
  labelSelected: {
    color: palette.textInverse,
  },
});

export default FilterTabs;

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';

export interface ResultTabsProps {
  tabs: readonly string[];
  activeTab: string;
  onChange: (tab: string) => void;
  counts?: Partial<Record<string, number>>;
  testID?: string;
}

export function ResultTabs({
  tabs,
  activeTab,
  onChange,
  counts,
  testID = 'result-tabs',
}: ResultTabsProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={styles.container}
      testID={testID}>
      {tabs.map((tab) => {
        const isSelected = tab === activeTab;
        const count = counts?.[tab];
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={tab}
            hitSlop={hitSlop}
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.tab, isSelected && styles.tabSelected]}
            testID={`${testID}-${tab}`}>
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
              testID={`${testID}-${tab}-label`}>
              {tab}
              {count === undefined ? '' : ` ${count}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tabSelected: {
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

export default ResultTabs;

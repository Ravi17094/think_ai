import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';

export interface RecentSearchesProps {
  recent: string[];
  onSelect: (term: string) => void;
  onRemove?: (term: string) => void;
  onClearAll?: () => void;
  isVisible?: boolean;
  testID?: string;
}

export function RecentSearches({
  recent,
  onSelect,
  onRemove,
  onClearAll,
  isVisible = true,
  testID = 'recent-searches',
}: RecentSearchesProps) {
  if (!isVisible || recent.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent searches</Text>
        {onClearAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear recent searches"
            hitSlop={hitSlop}
            onPress={onClearAll}
            testID={`${testID}-clear-all`}>
            <Text style={styles.clearAll}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.chips}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {recent.map((term) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={term}
            hitSlop={hitSlop}
            key={term}
            onPress={() => onSelect(term)}
            style={styles.chip}
            testID={`${testID}-item-${term}`}>
            <Text style={styles.chipText}>{term}</Text>
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${term}`}
                hitSlop={hitSlop}
                onPress={() => onRemove(term)}
                testID={`${testID}-remove-${term}`}>
                <Text style={styles.chipRemove}>✕</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.label,
    color: palette.textSecondary,
  },
  clearAll: {
    ...typography.caption,
    color: palette.accent,
  },
  chips: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipText: {
    ...typography.caption,
    color: palette.textPrimary,
  },
  chipRemove: {
    ...typography.caption,
    color: palette.textMuted,
  },
});

export default RecentSearches;

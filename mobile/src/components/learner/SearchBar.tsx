import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';

export interface SearchBarProps {
  value: string;
  onChangeText: (next: string) => void;
  onClear?: () => void;
  placeholder?: string;
  /** True while a debounced request is in flight. */
  isSearching?: boolean;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search courses…',
  isSearching = false,
  testID = 'search-bar',
}: SearchBarProps) {
  const showClear = value.length > 0;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChangeText('');
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.leadingIcon}>
        🔍
      </Text>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        returnKeyType="search"
        style={styles.input}
        testID={`${testID}-input`}
        value={value}
      />
      {showClear ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={hitSlop}
          onPress={handleClear}
          testID={`${testID}-clear`}>
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      ) : null}
      {isSearching ? (
        <Text
          accessibilityLabel="Searching"
          accessibilityLiveRegion="polite"
          style={styles.spinner}
          testID={`${testID}-searching`}>
          …
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  leadingIcon: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: palette.textPrimary,
    paddingVertical: spacing.xs,
  },
  clear: {
    ...typography.label,
    color: palette.textSecondary,
    paddingHorizontal: spacing.xxs,
  },
  spinner: {
    ...typography.body,
    color: palette.textMuted,
    paddingHorizontal: spacing.xxs,
  },
});

export default SearchBar;

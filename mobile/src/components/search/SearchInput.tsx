import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';

export interface SearchInputProps {
  value: string;
  onChangeText: (next: string) => void;
  onSubmit?: (term: string) => void;
  onClear?: () => void;
  placeholder?: string;
  isBusy?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'Search courses, lessons, forum and assessments…',
  isBusy = false,
  autoFocus = false,
  testID = 'search-input',
}: SearchInputProps) {
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
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value)}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        returnKeyType="search"
        style={styles.input}
        testID={`${testID}-field`}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={hitSlop}
          onPress={handleClear}
          testID={`${testID}-clear`}>
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      ) : null}
      {isBusy ? (
        <Text
          accessibilityLabel="Searching"
          accessibilityLiveRegion="polite"
          style={styles.busy}
          testID={`${testID}-busy`}>
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
  busy: {
    ...typography.body,
    color: palette.textMuted,
    paddingHorizontal: spacing.xxs,
  },
});

export default SearchInput;

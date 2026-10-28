import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { ForumCategory } from '@/types';

export interface CategoryDropdownProps {
  categories: ForumCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testID?: string;
}

/** Accessible category picker — same modal-menu pattern as `SortDropdown`. */
export function CategoryDropdown({
  categories,
  value,
  onChange,
  placeholder = 'Select a category',
  disabled = false,
  testID = 'category-dropdown',
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = categories.find((category) => category.id === value);

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        accessibilityLabel="Category"
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen, disabled }}
        disabled={disabled}
        hitSlop={hitSlop}
        onPress={() => setIsOpen((open) => !open)}
        style={[styles.trigger, disabled && styles.disabled]}
        testID={`${testID}-trigger`}>
        <Text
          numberOfLines={1}
          style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected ? selected.name : placeholder}
        </Text>
        <Text style={styles.caret}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}>
        <Pressable
          accessibilityLabel="Dismiss category options"
          onPress={() => setIsOpen(false)}
          style={styles.backdrop}
          testID={`${testID}-backdrop`}>
          <View
            accessibilityRole="menu"
            accessibilityViewIsModal
            style={styles.menu}
            testID={`${testID}-menu`}>
            {categories.map((category) => {
              const isSelected = category.id === value;
              return (
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  key={category.id}
                  onPress={() => {
                    onChange(category.id);
                    setIsOpen(false);
                  }}
                  style={styles.option}
                  testID={`${testID}-option-${category.id}`}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: category.color },
                      isSelected && styles.optionTextSelected,
                    ]}>
                    {isSelected ? `✓ ${category.name}` : category.name}
                  </Text>
                </Pressable>
              );
            })}
            {categories.length === 0 ? (
              <Text style={styles.empty}>No categories available.</Text>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    minWidth: 200,
  },
  disabled: {
    opacity: 0.6,
  },
  triggerText: {
    ...typography.body,
    color: palette.textPrimary,
    flex: 1,
  },
  placeholder: {
    color: palette.textMuted,
  },
  caret: {
    fontSize: 10,
    color: palette.textMuted,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.overlay,
  },
  menu: {
    minWidth: 240,
    maxWidth: '86%',
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionText: {
    ...typography.body,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
  empty: {
    ...typography.caption,
    color: palette.textMuted,
    padding: spacing.md,
  },
});

export default CategoryDropdown;

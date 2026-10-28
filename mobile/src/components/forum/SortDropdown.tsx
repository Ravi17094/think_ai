import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { ForumSort } from '@/types';

export const FORUM_SORT_OPTIONS: readonly { key: ForumSort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'most-voted', label: 'Most voted' },
  { key: 'recently-active', label: 'Recently active' },
];

export const SORT_LABELS: Record<ForumSort, string> = {
  newest: 'Newest',
  'most-voted': 'Most voted',
  'recently-active': 'Recently active',
};

export interface SortDropdownProps {
  value: ForumSort;
  onChange: (next: ForumSort) => void;
  testID?: string;
}

export function SortDropdown({
  value,
  onChange,
  testID = 'sort-dropdown',
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        accessibilityLabel="Sort threads"
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        hitSlop={hitSlop}
        onPress={() => setIsOpen((open) => !open)}
        style={styles.trigger}
        testID={`${testID}-trigger`}>
        <Text style={styles.triggerText}>{SORT_LABELS[value]}</Text>
        <Text style={styles.caret}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}>
        <Pressable
          accessibilityLabel="Dismiss sort options"
          onPress={() => setIsOpen(false)}
          style={styles.backdrop}
          testID={`${testID}-backdrop`}>
          <View
            accessibilityRole="menu"
            accessibilityViewIsModal
            style={styles.menu}>
            {FORUM_SORT_OPTIONS.map((option) => {
              const isSelected = option.key === value;
              return (
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  key={option.key}
                  onPress={() => {
                    onChange(option.key);
                    setIsOpen(false);
                  }}
                  style={styles.option}
                  testID={`${testID}-option-${option.key}`}>
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}>
                    {isSelected ? `✓ ${option.label}` : option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  trigger: {
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
  triggerText: {
    ...typography.caption,
    color: palette.textPrimary,
  },
  caret: {
    fontSize: 9,
    color: palette.textMuted,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.overlay,
  },
  menu: {
    minWidth: 220,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionText: {
    ...typography.body,
    color: palette.textSecondary,
  },
  optionTextSelected: {
    color: palette.accent,
    fontWeight: '700',
  },
});

export default SortDropdown;

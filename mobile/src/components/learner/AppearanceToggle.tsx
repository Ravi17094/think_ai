import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/tokens';
import { radii, spacing, typography } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';

const OPTIONS = [
  { mode: 'light' as const, label: 'Light', icon: '☀' },
  { mode: 'dark' as const, label: 'Dark', icon: '◐' },
];

export function AppearanceToggle({ testID = 'appearance-toggle', compact = false }: { testID?: string; compact?: boolean }) {
  const { mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={[styles.control, compact && styles.controlCompact]} testID={testID}>
      {OPTIONS.map((option) => {
        const selected = mode === option.mode;
        return (
          <Pressable
            accessibilityLabel={`${option.label} mode`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={option.mode}
            onPress={() => setMode(option.mode)}
            style={[styles.option, compact && styles.optionCompact, selected && styles.optionSelected]}
            testID={`${testID}-${option.mode}`}>
            <Text style={[styles.icon, compact && styles.iconCompact, selected && styles.iconSelected]}>{option.icon}</Text>
            <Text style={[styles.label, compact && styles.labelCompact, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  control: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    padding: 3,
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  option: {
    minWidth: 68,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  controlCompact: { padding: 2, gap: 2 },
  optionCompact: { minWidth: 56, minHeight: 44, paddingHorizontal: spacing.xs },
  optionSelected: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  icon: { ...typography.caption, color: palette.textMuted },
  iconCompact: { fontSize: 11, lineHeight: 14 },
  iconSelected: { color: palette.brand },
  label: { ...typography.caption, color: palette.textSecondary },
  labelCompact: { fontSize: 11, lineHeight: 15 },
  labelSelected: { color: palette.textPrimary, fontWeight: '700' },
});

export default AppearanceToggle;

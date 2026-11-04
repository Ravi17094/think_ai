import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from './ThemeProvider';
import type { Palette } from './tokens';

/**
 * Builds a `StyleSheet` from the active palette.
 *
 * Style factories must be defined at module scope so their identity is stable:
 *
 *   const createStyles = (palette: Palette) => StyleSheet.create({ ... });
 *   const styles = useThemedStyles(createStyles);
 *
 * This keeps the light and dark themes expressed with exactly the same layout
 * values and only swaps colour tokens.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (palette: Palette) => T
): T {
  const { palette } = useTheme();
  return useMemo(() => StyleSheet.create(factory(palette)), [factory, palette]);
}

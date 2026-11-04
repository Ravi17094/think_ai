import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  palettes,
  type Palette,
  type ThemeMode,
} from './tokens';

export const THEME_STORAGE_KEY = 'thinkz_theme_mode';

export interface ThemeContextValue {
  mode: ThemeMode;
  palette: Palette;
  isDark: boolean;
  /** True once the persisted preference has been read. */
  isReady: boolean;
  setMode: (next: ThemeMode) => void;
  toggleMode: () => void;
}

const DEFAULT_THEME: ThemeContextValue = {
  mode: 'dark',
  palette: palettes.dark,
  isDark: true,
  isReady: false,
  setMode: () => undefined,
  toggleMode: () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Test seam: skips AsyncStorage restoration when provided. */
  initialMode?: ThemeMode;
}

/**
 * App-wide light/dark theme. The learner's choice is persisted so the app
 * reopens in the same theme; `useTheme` is safe to call without a provider and
 * falls back to the original dark palette.
 */
export function ThemeProvider({ children, initialMode }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode ?? 'dark');
  const [isReady, setIsReady] = useState(initialMode !== undefined);

  useEffect(() => {
    if (initialMode !== undefined) {
      return undefined;
    }
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (active && (stored === 'light' || stored === 'dark')) {
          setModeState(stored);
        }
      })
      .catch(() => {
        // Storage is best-effort; keep the default theme.
      })
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [initialMode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setIsReady(true);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
      // Persistence is best-effort; the in-memory theme still updates.
    });
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
        // Same rationale as setMode.
      });
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      palette: palettes[mode],
      isDark: mode === 'dark',
      isReady,
      setMode,
      toggleMode,
    }),
    [isReady, mode, setMode, toggleMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Test seam: resets the persisted preference between suites. */
export async function __resetThemeForTests(): Promise<void> {
  try {
    await AsyncStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Nothing to reset.
  }
}

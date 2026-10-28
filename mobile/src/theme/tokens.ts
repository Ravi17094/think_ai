/**
 * Design tokens.
 *
 * NOTE: `Design System tokens` are a cross-team dependency (due 10:00 AM per the
 * Day-1 plan). These values are a local stand-in that mirrors the existing web
 * frontend palette so the app is visually consistent today. When the shared
 * package is published, replace this module with the published token import —
 * nothing else in the app reads raw hex values, so the swap is isolated to
 * this file and `src/theme/index.ts`.
 */

export const palette = {
  background: '#0B1020',
  surface: '#141A2E',
  surfaceElevated: '#1B2239',
  surfaceMuted: '#222A45',
  border: '#2A3352',
  borderStrong: '#3A4570',

  brand: '#7C3AED',
  brandAlt: '#4F46E5',
  accent: '#22D3EE',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',

  textPrimary: '#F1F3F9',
  textSecondary: '#A8B0C8',
  textMuted: '#6F7897',
  textInverse: '#0B1020',

  overlay: 'rgba(11, 16, 32, 0.72)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  mono: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

/** Minimum touch target — the web module already enforces 44px in e2e. */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouchTarget = 44;

/** Debounce window mandated by the spec for every search field. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Fraction of list length that triggers the next page fetch. */
export const INFINITE_SCROLL_THRESHOLD = 0.8;

/** Forum page size used by the paginated `useForumThreads` hook. */
export const FORUM_PAGE_SIZE = 15;

export const theme = {
  palette,
  spacing,
  radii,
  typography,
} as const;

export type Theme = typeof theme;

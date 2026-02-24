/**
 * Avently theme: matches website (header blue, primary, amber search bar).
 * Primary: #006BB3, Header: #003580, Search bar border: #febb02 (website hero search).
 */
export const colors = {
  primary: '#006BB3',
  primaryDark: '#003580',
  primaryForeground: '#FFFFFF',
  /** Hero and header background (same as website). */
  headerBg: '#003580',
  /** Footer background. */
  footerBg: '#002855',
  /** Hero search bar border (website amber). */
  searchBarBorder: '#febb02',
  searchBarBorderMuted: '#fcd34d',
  background: '#F7F9FC',
  foreground: '#1E293B',
  card: '#FFFFFF',
  cardForeground: '#1E293B',
  muted: '#E2E8F0',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  input: '#E2E8F0',
  destructive: '#DC2626',
  accent: '#E0F2FE',
  accentForeground: '#006BB3',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  headline: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;

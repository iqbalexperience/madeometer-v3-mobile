/**
 * constants/theme.ts
 *
 * Design tokens sourced directly from globals.css.
 * Brand: red (#d35457) on dark (#000000 / #121212).
 */

export const Colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brand: '#d35457',           // --color-brand
  brandDark: '#b04043',       // --color-brand-dark
  brandGlow: '#d35457',       // --color-brand-glow
  brandLight: 'rgba(211,84,87,0.12)',  // translucent brand for backgrounds

  // ── Backgrounds ────────────────────────────────────────────────────────────
  bgDark: '#000000',          // --color-dark / app background
  bgSurface: '#121212',       // --color-surface
  bgHighlight: '#1C1C1E',     // --color-highlight (elevated cards)
  bgCard: 'rgba(22,22,22,0.6)',  // glass-panel background
  bgWhite: '#121212',         // "white" bg — in dark theme this is the surface
  bgGray50: '#1a1a1a',        // subtle background step
  bgGray100: '#1C1C1E',       // bgHighlight alias

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  textWhite: '#FFFFFF',
  textLight: 'rgba(255,255,255,0.5)',

  // ── Borders ────────────────────────────────────────────────────────────────
  borderLight: 'rgba(255,255,255,0.08)',
  borderMedium: 'rgba(255,255,255,0.14)',
  borderDark: 'rgba(255,255,255,0.22)',
  borderBrand: 'rgba(211,84,87,0.4)',

  // ── Verdicts ───────────────────────────────────────────────────────────────
  // Recommended — green tinted in dark mode
  verdictRecommended: 'rgba(16,185,129,0.12)',
  verdictRecommendedBorder: 'rgba(16,185,129,0.3)',
  verdictRecommendedText: '#6EE7B7',
  // Avoid — brand red tinted
  verdictAvoid: 'rgba(211,84,87,0.12)',
  verdictAvoidBorder: 'rgba(211,84,87,0.3)',
  verdictAvoidText: '#FDA4A6',
  // Neutral — muted
  verdictNeutral: 'rgba(255,255,255,0.06)',
  verdictNeutralBorder: 'rgba(255,255,255,0.12)',
  verdictNeutralText: 'rgba(255,255,255,0.6)',

  // ── Accents ────────────────────────────────────────────────────────────────
  cyan: '#06B6D4',
  amber: '#F59E0B',
  red: '#d35457',          // same as brand
  emerald: '#10B981',
  indigo: '#6366F1',

  // ── Header ─────────────────────────────────────────────────────────────────
  headerBg: 'rgba(0,0,0,0.92)',
  headerBorder: 'rgba(255,255,255,0.06)',

  // ── Glass effect (mirrors glass-panel utility) ──────────────────────────────
  glassBg: 'rgba(22,22,22,0.6)',
  glassBorder: 'rgba(255,255,255,0.08)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// Matches globals.css text scale
export const Typography = {
  xs: 10,   // --text-xs
  sm: 14,   // --text-sm
  base: 16, // --text-base
  md: 17,
  lg: 18,   // --text-lg
  xl: 20,   // --text-xl
  xxl: 22,
  xxxl: 26,
  display: 30,
};

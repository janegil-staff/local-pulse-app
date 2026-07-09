// localpulse/app/src/theme/theme.js
//
// Light + dark palettes.
//
// `theme` is a live object whose `.colors` are swapped in place by applyMode().
// `useStyles(factory)` is a REAL hook: it subscribes to mode changes and
// rebuilds the factory when the palette swaps. Nothing remounts — the tree
// stays mounted, navigation state is preserved, and every component using
// useStyles simply re-renders with the new colors.
//
// (An earlier design forced a remount with key={rev}; that reset navigation
// on every theme toggle, so it was removed. Without a subscription here,
// useStyles would silently freeze at whatever palette was active on first
// render — which is exactly the "toggle does nothing" bug.)
import { useSyncExternalStore, useMemo } from 'react';

export const darkColors = {
  accent: '#3B82C4',
  accentDark: '#2E6598',
  accentDim: '#214364',
  bg: '#0f1216',
  surface: '#181d24',
  surfaceAlt: '#212832',
  border: '#2a323d',
  text: '#eef2f6',
  textDim: '#8a97a6',
  like: '#e0567a',
  success: '#4ec97a',
  danger: '#e0574e',
};

export const lightColors = {
  accent: '#387BBA',
  accentDark: '#2A5D8D',
  accentDim: '#B4CFE8',
  bg: '#f6f8fa',
  surface: '#ffffff',
  surfaceAlt: '#eef1f5',
  border: '#dde2e8',
  text: '#141a20',
  textDim: '#5c6773',
  like: '#d6396a',
  success: '#2fa860',
  danger: '#d23d34',
};

const base = {
  spacing: (n) => n * 4,
  radius: { sm: 8, md: 12, lg: 18 },
};

// The live active theme. Screens may read `theme.colors.x` inline; that always
// reflects the current palette because applyMode mutates it in place.
export const theme = {
  mode: 'dark',
  colors: { ...darkColors },
  ...base,
};

// ── Subscription store ────────────────────────────────────────────────
// A bare listener set. Lives here (not in ThemeContext) to avoid a circular
// import: ThemeContext already imports from this module.
let version = 0;
const listeners = new Set();

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return version;
}

// Swap the active palette in place and notify subscribers.
export function applyMode(mode) {
  const next = mode === 'light' ? lightColors : darkColors;
  if (theme.mode === mode) return;   // no-op: don't churn renders
  theme.mode = mode;
  Object.assign(theme.colors, next);
  version += 1;
  listeners.forEach((cb) => cb());
}

// ── Hooks ─────────────────────────────────────────────────────────────

// Re-renders the caller whenever the palette changes. Returns the mode so it
// can double as `const mode = useThemeVersion()` if ever useful.
export function useThemeVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Rebuilds `factory(theme)` whenever the palette changes.
//
//   const styles = useStyles(stylesFactory);
//   const stylesFactory = ({ colors, spacing, radius }) => StyleSheet.create({...});
//
// The factory must be defined at module scope (a stable reference), otherwise
// the memo is defeated and styles are rebuilt every render — which still
// *works*, just wastefully.
export function useStyles(factory) {
  const v = useThemeVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(theme), [factory, v]);
}

// Legacy: module-level `const s = makeStyles(theme)(factory)`. This is FROZEN —
// it cannot react to mode changes. Kept only so old call sites don't crash.
// Migrate to useStyles; see scripts/convert-to-usestyles.cjs.
export function makeStyles(t = theme) {
  return (factory) => factory(t);
}

export const POST_TYPE_META = {
  update: { label: 'Update', emoji: '💬' },
  event: { label: 'Event', emoji: '📅' },
  recommendation: { label: 'Recommendation', emoji: '⭐' },
  lostfound: { label: 'Lost & Found', emoji: '🔎' },
  marketplace: { label: 'For Sale', emoji: '🏷️' },
  question: { label: 'Question', emoji: '❓' },
};
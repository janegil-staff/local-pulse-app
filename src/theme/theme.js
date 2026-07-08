// localpulse/app/src/theme/theme.js
// Light + dark palettes. `theme` is a live proxy to the active palette so that
// existing `makeStyles(theme)(...)` module-level calls keep working — the
// ThemeProvider swaps the active palette and remounts the tree via a key, so
// styles are rebuilt against the new colors.

export const darkColors = {
  bg: '#0f1216',
  surface: '#181d24',
  surfaceAlt: '#212832',
  border: '#2a323d',
  text: '#eef2f6',
  textDim: '#8a97a6',
  accent: '#4a9eff',
  accentDark: '#2f6fb5',
  accentDim: '#2f6fb5',
  like: '#e0567a',
  success: '#4ec97a',
  danger: '#e0574e',
};

export const lightColors = {
  bg: '#f6f8fa',
  surface: '#ffffff',
  surfaceAlt: '#eef1f5',
  border: '#dde2e8',
  text: '#141a20',
  textDim: '#5c6773',
  accent: '#2f7fe0',
  accentDark: '#1f5fb0',
  accentDim: '#93bdf0',
  like: '#d6396a',
  success: '#2fa860',
  danger: '#d23d34',
};

const base = {
  spacing: (n) => n * 4,
  radius: { sm: 8, md: 12, lg: 18 },
};

// The live active theme. Screens import this; ThemeProvider mutates `.colors`
// and forces a remount so module-level makeStyles picks up the new palette.
export const theme = {
  mode: 'dark',
  colors: { ...darkColors },
  ...base,
};

// Swap the active palette in place.
export function applyMode(mode) {
  theme.mode = mode;
  const palette = mode === 'light' ? lightColors : darkColors;
  Object.assign(theme.colors, palette);
}

export function makeStyles(t = theme) {
  return (factory) => factory(t);
}

// Hook version: rebuilds the given factory against the live theme on every
// render. Because ThemeProvider remounts the tree (key bump) on mode change,
// components using this get fresh styles in the new palette. Use as:
//   const styles = useStyles((t) => StyleSheet.create({ ... }))
// where the factory receives the live theme ({ colors, spacing, radius }).
export function useStyles(factory) {
  return factory(theme);
}

export const POST_TYPE_META = {
  update: { label: 'Update', emoji: '💬' },
  event: { label: 'Event', emoji: '📅' },
  recommendation: { label: 'Recommendation', emoji: '⭐' },
  lostfound: { label: 'Lost & Found', emoji: '🔎' },
  marketplace: { label: 'For Sale', emoji: '🏷️' },
  question: { label: 'Question', emoji: '❓' },
};

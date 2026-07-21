// localpulse/app/src/lib/interests.js
//
// Canonical interest list, shared by the settings editor and profile display.
//
// Values are stored verbatim in User.interests ([String] in the model), so they
// stay lowercase and stable. Labels are localized at render time via i18n keys
// of the form `interest_<value>` (e.g. interest_hiking). Older free-text
// interests from earlier seed data still display — they just render as their
// raw string when no matching i18n key exists.

export const INTERESTS = [
  'hiking',
  'coffee',
  'travel',
  'photography',
  'music',
  'food',
  'fitness',
  'running',
  'art',
  'books',
  'gaming',
  'cooking',
  'cycling',
  'yoga',
  'movies',
  'dancing',
  'design',
  'nature',
  'concerts',
  'fashion',
  'technology',
  'football',
  'climbing',
  'baking',
];

// Max interests a user may select. Keeps profiles scannable.
export const MAX_INTERESTS = 8;

// Localized label for an interest value. Falls back to the raw value (so legacy
// free-text interests still show) when the i18n key is missing.
//   t          the plain strings object from useLang()
//   value      e.g. 'hiking'
export function interestLabel(t, value) {
  if (!value) return '';
  const key = `interest_${value}`;
  const label = t?.[key];
  if (label) return label;
  // Fallback: capitalize the raw stored value for legacy/free-text interests.
  return value.charAt(0).toUpperCase() + value.slice(1);
}
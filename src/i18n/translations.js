// src/i18n/translations.js
// Loads the 12 per-language JSON files from ./locales and exposes the same
// getTranslations(lang) API the app already uses. Norwegian default per Qup
// convention; English fallback for any missing key. Metro bundles JSON imports
// natively, so these resolve in Expo without extra config.
//
// Contract: getTranslations(lang) -> { ...strings }. Unknown keys fall back to
// English, unknown langs fall back to DEFAULT_LANG.

import no from './locales/no.json';
import en from './locales/en.json';
import nl from './locales/nl.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import sv from './locales/sv.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import es from './locales/es.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';

const TRANSLATIONS = { no, en, nl, fr, de, it, sv, da, fi, es, pl, pt };

export const SUPPORTED_LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];
export const DEFAULT_LANG = 'en';

// getTranslations(lang) -> string map. Unknown keys fall back to English;
// unknown lang falls back to DEFAULT_LANG.
export function getTranslations(lang) {
  const base = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
  return new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (key in en) return en[key];
      return undefined;
    }
  });
}
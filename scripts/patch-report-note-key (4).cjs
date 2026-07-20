// localpulse/app/scripts/patch-report-note-key.cjs
//
// Adds the `reportNotePlaceholder` key to all 12 locale JSON files under
// src/i18n/locales/. Idempotent: skips any file that already has the key.
//
// Run from the app root:
//   node scripts/patch-report-note-key.cjs
// Optional: pass the locales dir as an argument.
//   node scripts/patch-report-note-key.cjs src/i18n/locales

const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || path.join(__dirname, '..', 'src', 'i18n', 'locales');

const KEYS = {
  reportNotePlaceholder: {
    no: 'Beskriv hva som er galt (valgfritt)…',
    en: 'Describe what’s wrong (optional)…',
    nl: 'Beschrijf wat er mis is (optioneel)…',
    fr: 'Décrivez le problème (facultatif)…',
    de: 'Beschreibe das Problem (optional)…',
    it: 'Descrivi il problema (facoltativo)…',
    sv: 'Beskriv vad som är fel (valfritt)…',
    da: 'Beskriv hvad der er galt (valgfrit)…',
    fi: 'Kuvaile ongelmaa (valinnainen)…',
    es: 'Describe el problema (opcional)…',
    pl: 'Opisz problem (opcjonalnie)…',
    pt: 'Descreva o problema (opcional)…',
  },
  reportPostTitle: {
    no: 'Rapporter innlegg',
    en: 'Report post',
    nl: 'Bericht melden',
    fr: 'Signaler la publication',
    de: 'Beitrag melden',
    it: 'Segnala post',
    sv: 'Rapportera inlägg',
    da: 'Rapportér opslag',
    fi: 'Ilmoita julkaisusta',
    es: 'Denunciar publicación',
    pl: 'Zgłoś post',
    pt: 'Denunciar publicação',
  },
};

const LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];
let changed = 0;

for (const lang of LANGS) {
  const file = path.join(DIR, `${lang}.json`);
  if (!fs.existsSync(file)) { console.warn(`! ${lang}.json not found — skipped`); continue; }

  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  let touched = false;
  for (const [key, vals] of Object.entries(KEYS)) {
    // Overwrite: these are UI strings, not user content, so refreshing their
    // wording on re-run is intended (idempotent to the current KEYS).
    if (obj[key] !== vals[lang]) {
      obj[key] = vals[lang];
      touched = true;
    }
  }
  if (!touched) { console.log(`· ${lang}: up to date`); continue; }
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}: set report keys`);
  changed += 1;
}

console.log(`\ndone — updated ${changed} file(s).`);

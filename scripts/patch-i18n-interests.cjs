// local-pulse-app/scripts/patch-i18n-interests.cjs
//
// Idempotent: adds the flat `interests` key to all 12 locale JSON files.
// Norwegian authoritative; every language provided so none ships partial.
// Re-running is safe — existing keys are never overwritten.
//
// Run from local-pulse-app root: node scripts/patch-i18n-interests.cjs
//
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');

const STRINGS = {
  no: 'Interesser',
  en: 'Interests',
  nl: 'Interesses',
  fr: "Centres d'intérêt",
  de: 'Interessen',
  it: 'Interessi',
  sv: 'Intressen',
  da: 'Interesser',
  fi: 'Kiinnostuksen kohteet',
  es: 'Intereses',
  pl: 'Zainteresowania',
  pt: 'Interesses',
};

const LOCALES = Object.keys(STRINGS);
let changed = 0;

for (const locale of LOCALES) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  skip: ${locale}.json not found`);
    continue;
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  if ('interests' in json) {
    console.log(`  ok (already present): ${locale}.json`);
    continue;
  }
  json.interests = STRINGS[locale];
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`  patched: ${locale}.json`);
  changed++;
}

console.log(`\nDone. ${changed} file(s) updated.`);

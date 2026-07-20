// localpulse/app/scripts/patch-posts-label-key.cjs
//
// Adds the `postsLabel` key to all 12 locale JSON files under src/i18n/locales/.
// Used as the section header above a user's posts on their public profile.
// Idempotent: only writes when the value differs.
//
// Run from the app root:
//   node scripts/patch-posts-label-key.cjs
// Optional: pass the locales dir as an argument.

const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || path.join(__dirname, '..', 'src', 'i18n', 'locales');

const VALUES = {
  no: 'Innlegg',
  en: 'Posts',
  nl: 'Berichten',
  fr: 'Publications',
  de: 'Beiträge',
  it: 'Post',
  sv: 'Inlägg',
  da: 'Opslag',
  fi: 'Julkaisut',
  es: 'Publicaciones',
  pl: 'Posty',
  pt: 'Publicações',
};

const KEY = 'postsLabel';
let changed = 0;

for (const [lang, value] of Object.entries(VALUES)) {
  const file = path.join(DIR, `${lang}.json`);
  if (!fs.existsSync(file)) { console.warn(`! ${lang}.json not found — skipped`); continue; }

  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (obj[KEY] === value) { console.log(`· ${lang}: ${KEY} up to date`); continue; }
  obj[KEY] = value;
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}: set ${KEY}`);
  changed += 1;
}

console.log(`\ndone — updated ${changed} file(s).`);

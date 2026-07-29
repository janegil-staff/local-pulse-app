// localpulse/app/scripts/i18n/add-follow-keys.cjs
//
// Adds the two empty-state strings the followers list needs, to all 12
// locale files. Idempotent — existing values are never overwritten.
// No .bak files; git is the safety net.
//
//   node scripts/i18n/add-follow-keys.cjs

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '../../src/i18n/locales');
const CODES = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

const KEYS = {
  noFollowers: {
    no: 'Ingen følgere ennå.',
    en: 'No followers yet.',
    nl: 'Nog geen volgers.',
    fr: 'Pas encore d\u2019abonnés.',
    de: 'Noch keine Follower.',
    it: 'Ancora nessun follower.',
    sv: 'Inga följare ännu.',
    da: 'Ingen følgere endnu.',
    fi: 'Ei vielä seuraajia.',
    es: 'Aún no hay seguidores.',
    pl: 'Brak obserwujących.',
    pt: 'Ainda sem seguidores.',
  },
  noFollowing: {
    no: 'Følger ingen ennå.',
    en: 'Not following anyone yet.',
    nl: 'Volgt nog niemand.',
    fr: 'Ne suit encore personne.',
    de: 'Folgt noch niemandem.',
    it: 'Non segue ancora nessuno.',
    sv: 'Följer ingen ännu.',
    da: 'Følger ingen endnu.',
    fi: 'Ei seuraa vielä ketään.',
    es: 'Todavía no sigue a nadie.',
    pl: 'Nikogo jeszcze nie obserwuje.',
    pt: 'Ainda não segue ninguém.',
  },
};

const problems = [];
for (const [key, byLocale] of Object.entries(KEYS)) {
  const missing = CODES.filter((c) => !byLocale[c] || !String(byLocale[c]).trim());
  if (missing.length) problems.push(`${key}: missing ${missing.join(', ')}`);
}
if (problems.length) {
  console.error('\nAborted — nothing written:\n');
  problems.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}

let updated = 0;
let skipped = 0;

for (const code of CODES) {
  const file = path.join(DIR, `${code}.json`);
  if (!fs.existsSync(file)) {
    console.error(`Missing locale file: ${file}`);
    process.exit(1);
  }

  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;

  for (const [key, byLocale] of Object.entries(KEYS)) {
    if (json[key] === undefined) {
      json[key] = byLocale[code];
      changed = true;
    } else {
      skipped += 1;
    }
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
    updated += 1;
  }
}

console.log(
  updated
    ? `Updated ${updated} locale file(s) with ${Object.keys(KEYS).length} keys.`
    : 'No changes — all keys already present.'
);
if (skipped) console.log(`${skipped} existing value(s) left untouched.`);

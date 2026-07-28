// localpulse/app/scripts/i18n/add-profile-prompt-keys.cjs
//
// Adds the ProfilePrompt strings to all 12 locale files. Idempotent —
// existing values are never overwritten, so it is safe to re-run.
// No .bak files; git is the safety net.
//
//   node scripts/i18n/add-profile-prompt-keys.cjs

const fs = require('fs');
const path = require('path');

// Adjust if the locales live elsewhere in this repo.
const DIR = path.resolve(__dirname, '../src/i18n/locales');

const CODES = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

// Field labels are lowercase: they are interpolated mid-sentence into
// profilePromptBody. Norwegian is authoritative.
const KEYS = {
  profilePromptTitle: {
    no: 'Fullfør profilen din',
    en: 'Finish your profile',
    nl: 'Maak je profiel af',
    fr: 'Complétez votre profil',
    de: 'Profil vervollständigen',
    it: 'Completa il tuo profilo',
    sv: 'Slutför din profil',
    da: 'Færdiggør din profil',
    fi: 'Viimeistele profiilisi',
    es: 'Completa tu perfil',
    pl: 'Dokończ swój profil',
    pt: 'Complete o seu perfil',
  },
  profilePromptBody: {
    no: 'Legg til {fields} for å bli synlig for folk i nærheten.',
    en: 'Add {fields} so people nearby can find you.',
    nl: 'Voeg {fields} toe zodat mensen in de buurt je kunnen vinden.',
    fr: 'Ajoutez {fields} pour que les personnes à proximité vous trouvent.',
    de: 'Ergänze {fields}, damit Leute in der Nähe dich finden.',
    it: 'Aggiungi {fields} così le persone vicine possono trovarti.',
    sv: 'Lägg till {fields} så att folk i närheten kan hitta dig.',
    da: 'Tilføj {fields}, så folk i nærheden kan finde dig.',
    fi: 'Lisää {fields}, jotta lähellä olevat löytävät sinut.',
    es: 'Añade {fields} para que la gente cercana pueda encontrarte.',
    pl: 'Dodaj {fields}, aby osoby w pobliżu mogły Cię znaleźć.',
    pt: 'Adicione {fields} para que as pessoas próximas o encontrem.',
  },
  profilePromptCta: {
    no: 'Fullfør',
    en: 'Finish',
    nl: 'Afmaken',
    fr: 'Compléter',
    de: 'Fertigstellen',
    it: 'Completa',
    sv: 'Slutför',
    da: 'Færdiggør',
    fi: 'Viimeistele',
    es: 'Completar',
    pl: 'Dokończ',
    pt: 'Concluir',
  },
  profilePromptDismiss: {
    no: 'Ikke nå',
    en: 'Not now',
    nl: 'Niet nu',
    fr: 'Plus tard',
    de: 'Später',
    it: 'Non ora',
    sv: 'Inte nu',
    da: 'Ikke nu',
    fi: 'Ei nyt',
    es: 'Ahora no',
    pl: 'Nie teraz',
    pt: 'Agora não',
  },
  fieldLocation: {
    no: 'sted',
    en: 'your location',
    nl: 'je locatie',
    fr: 'votre position',
    de: 'deinen Standort',
    it: 'la tua posizione',
    sv: 'din plats',
    da: 'din placering',
    fi: 'sijaintisi',
    es: 'tu ubicación',
    pl: 'lokalizację',
    pt: 'a sua localização',
  },
  fieldDateOfBirth: {
    no: 'fødselsdato',
    en: 'your date of birth',
    nl: 'je geboortedatum',
    fr: 'votre date de naissance',
    de: 'dein Geburtsdatum',
    it: 'la tua data di nascita',
    sv: 'ditt födelsedatum',
    da: 'din fødselsdato',
    fi: 'syntymäaikasi',
    es: 'tu fecha de nacimiento',
    pl: 'datę urodzenia',
    pt: 'a sua data de nascimento',
  },
  fieldGender: {
    no: 'kjønn',
    en: 'your gender',
    nl: 'je geslacht',
    fr: 'votre genre',
    de: 'dein Geschlecht',
    it: 'il tuo genere',
    sv: 'ditt kön',
    da: 'dit køn',
    fi: 'sukupuolesi',
    es: 'tu género',
    pl: 'płeć',
    pt: 'o seu género',
  },
  fieldUsername: {
    no: 'brukernavn',
    en: 'a username',
    nl: 'een gebruikersnaam',
    fr: 'un nom d\u2019utilisateur',
    de: 'einen Benutzernamen',
    it: 'un nome utente',
    sv: 'ett användarnamn',
    da: 'et brugernavn',
    fi: 'käyttäjänimen',
    es: 'un nombre de usuario',
    pl: 'nazwę użytkownika',
    pt: 'um nome de utilizador',
  },
  fieldPhotos: {
    no: 'et bilde',
    en: 'a photo',
    nl: 'een foto',
    fr: 'une photo',
    de: 'ein Foto',
    it: 'una foto',
    sv: 'ett foto',
    da: 'et billede',
    fi: 'kuvan',
    es: 'una foto',
    pl: 'zdjęcie',
    pt: 'uma foto',
  },
  fieldBio: {
    no: 'en kort bio',
    en: 'a short bio',
    nl: 'een korte bio',
    fr: 'une courte bio',
    de: 'eine kurze Bio',
    it: 'una breve bio',
    sv: 'en kort bio',
    da: 'en kort bio',
    fi: 'lyhyen esittelyn',
    es: 'una breve bio',
    pl: 'krótki opis',
    pt: 'uma breve bio',
  },
};

// Every key must exist in every language before anything is written.
const problems = [];
for (const [key, byLocale] of Object.entries(KEYS)) {
  const missing = CODES.filter((c) => !byLocale[c] || !String(byLocale[c]).trim());
  if (missing.length) problems.push(`${key}: missing ${missing.join(', ')}`);
}
if (problems.length) {
  console.error('\nAborted — incomplete translations:\n');
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

// localpulse/app/scripts/i18n/add-dob-keys.cjs
//
// Adds the DOB-editing strings to all 12 locale files. Idempotent —
// existing values are never overwritten, so it is safe to re-run.
// No .bak files; git is the safety net.
//
//   node scripts/i18n/add-dob-keys.cjs

const fs = require('fs');
const path = require('path');

// Adjust if the locales live elsewhere in this repo.
const DIR = path.resolve(__dirname, '../../src/i18n/locales');

const CODES = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

// Server error keys (dobUnderAge, dobInFuture, dobInvalid, dobChangeLimit)
// are returned verbatim by the API and looked up here, so the names must
// match src/lib/dob.js exactly.
const KEYS = {
  dobSaved: {
    no: 'Fødselsdatoen er lagret.',
    en: 'Date of birth saved.',
    nl: 'Geboortedatum opgeslagen.',
    fr: 'Date de naissance enregistrée.',
    de: 'Geburtsdatum gespeichert.',
    it: 'Data di nascita salvata.',
    sv: 'Födelsedatum sparat.',
    da: 'Fødselsdato gemt.',
    fi: 'Syntymäaika tallennettu.',
    es: 'Fecha de nacimiento guardada.',
    pl: 'Data urodzenia zapisana.',
    pt: 'Data de nascimento guardada.',
  },
  dobUnderAge: {
    no: 'Du må være minst 18 år for å bruke appen.',
    en: 'You must be at least 18 to use the app.',
    nl: 'Je moet minstens 18 zijn om de app te gebruiken.',
    fr: 'Vous devez avoir au moins 18 ans pour utiliser l\u2019application.',
    de: 'Du musst mindestens 18 Jahre alt sein, um die App zu nutzen.',
    it: 'Devi avere almeno 18 anni per usare l\u2019app.',
    sv: 'Du måste vara minst 18 år för att använda appen.',
    da: 'Du skal være mindst 18 år for at bruge appen.',
    fi: 'Sinun on oltava vähintään 18-vuotias käyttääksesi sovellusta.',
    es: 'Debes tener al menos 18 años para usar la aplicación.',
    pl: 'Musisz mieć co najmniej 18 lat, aby korzystać z aplikacji.',
    pt: 'Tem de ter pelo menos 18 anos para usar a aplicação.',
  },
  dobInFuture: {
    no: 'Fødselsdatoen kan ikke være i fremtiden.',
    en: 'Date of birth cannot be in the future.',
    nl: 'Geboortedatum kan niet in de toekomst liggen.',
    fr: 'La date de naissance ne peut pas être dans le futur.',
    de: 'Das Geburtsdatum kann nicht in der Zukunft liegen.',
    it: 'La data di nascita non può essere nel futuro.',
    sv: 'Födelsedatumet kan inte ligga i framtiden.',
    da: 'Fødselsdatoen kan ikke ligge i fremtiden.',
    fi: 'Syntymäaika ei voi olla tulevaisuudessa.',
    es: 'La fecha de nacimiento no puede estar en el futuro.',
    pl: 'Data urodzenia nie może być w przyszłości.',
    pt: 'A data de nascimento não pode estar no futuro.',
  },
  dobInvalid: {
    no: 'Ugyldig fødselsdato.',
    en: 'Invalid date of birth.',
    nl: 'Ongeldige geboortedatum.',
    fr: 'Date de naissance invalide.',
    de: 'Ungültiges Geburtsdatum.',
    it: 'Data di nascita non valida.',
    sv: 'Ogiltigt födelsedatum.',
    da: 'Ugyldig fødselsdato.',
    fi: 'Virheellinen syntymäaika.',
    es: 'Fecha de nacimiento no válida.',
    pl: 'Nieprawidłowa data urodzenia.',
    pt: 'Data de nascimento inválida.',
  },
  dobChangeLimit: {
    no: 'Du kan ikke endre fødselsdatoen flere ganger. Kontakt support hvis den er feil.',
    en: 'You cannot change your date of birth again. Contact support if it is wrong.',
    nl: 'Je kunt je geboortedatum niet nogmaals wijzigen. Neem contact op met support als deze onjuist is.',
    fr: 'Vous ne pouvez plus modifier votre date de naissance. Contactez le support si elle est incorrecte.',
    de: 'Du kannst dein Geburtsdatum nicht erneut ändern. Wende dich an den Support, wenn es falsch ist.',
    it: 'Non puoi più cambiare la tua data di nascita. Contatta l\u2019assistenza se è sbagliata.',
    sv: 'Du kan inte ändra ditt födelsedatum igen. Kontakta supporten om det är fel.',
    da: 'Du kan ikke ændre din fødselsdato igen. Kontakt support, hvis den er forkert.',
    fi: 'Et voi enää muuttaa syntymäaikaasi. Ota yhteyttä tukeen, jos se on väärin.',
    es: 'No puedes volver a cambiar tu fecha de nacimiento. Contacta con soporte si es incorrecta.',
    pl: 'Nie możesz ponownie zmienić daty urodzenia. Skontaktuj się z pomocą techniczną, jeśli jest błędna.',
    pt: 'Não pode voltar a alterar a sua data de nascimento. Contacte o suporte se estiver errada.',
  },
  dobChangesLeft: {
    no: 'Du kan endre fødselsdatoen {n} gang(er) til.',
    en: 'You can change your date of birth {n} more time(s).',
    nl: 'Je kunt je geboortedatum nog {n} keer wijzigen.',
    fr: 'Vous pouvez encore modifier votre date de naissance {n} fois.',
    de: 'Du kannst dein Geburtsdatum noch {n} Mal ändern.',
    it: 'Puoi cambiare la data di nascita ancora {n} volte.',
    sv: 'Du kan ändra ditt födelsedatum {n} gång(er) till.',
    da: 'Du kan ændre din fødselsdato {n} gang(e) mere.',
    fi: 'Voit muuttaa syntymäaikaasi vielä {n} kertaa.',
    es: 'Puedes cambiar tu fecha de nacimiento {n} vez/veces más.',
    pl: 'Możesz jeszcze {n} raz(y) zmienić datę urodzenia.',
    pt: 'Pode alterar a sua data de nascimento mais {n} vez(es).',
  },
  dobLastChangeWarning: {
    no: 'Dette er siste gangen du kan endre fødselsdatoen. Er du sikker?',
    en: 'This is the last time you can change your date of birth. Are you sure?',
    nl: 'Dit is de laatste keer dat je je geboortedatum kunt wijzigen. Weet je het zeker?',
    fr: 'C\u2019est la dernière fois que vous pouvez modifier votre date de naissance. Confirmer ?',
    de: 'Dies ist das letzte Mal, dass du dein Geburtsdatum ändern kannst. Bist du sicher?',
    it: 'Questa è l\u2019ultima volta che puoi cambiare la data di nascita. Sei sicuro?',
    sv: 'Det här är sista gången du kan ändra ditt födelsedatum. Är du säker?',
    da: 'Dette er sidste gang, du kan ændre din fødselsdato. Er du sikker?',
    fi: 'Tämä on viimeinen kerta, kun voit muuttaa syntymäaikaasi. Oletko varma?',
    es: 'Esta es la última vez que puedes cambiar tu fecha de nacimiento. ¿Seguro?',
    pl: 'To ostatni raz, gdy możesz zmienić datę urodzenia. Na pewno?',
    pt: 'Esta é a última vez que pode alterar a sua data de nascimento. Tem a certeza?',
  },
};

// Every key must exist in every language before anything is written.
const problems = [];
for (const [key, byLocale] of Object.entries(KEYS)) {
  const missing = CODES.filter((c) => !byLocale[c] || !String(byLocale[c]).trim());
  if (missing.length) problems.push(`${key}: missing ${missing.join(', ')}`);

  // A {n} present in Norwegian but absent elsewhere renders as literal braces.
  const ph = (v) => [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  const base = ph(byLocale.no);
  for (const c of CODES) {
    if (byLocale[c] && ph(byLocale[c]) !== base) {
      problems.push(`${key}: placeholder mismatch in ${c}`);
    }
  }
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

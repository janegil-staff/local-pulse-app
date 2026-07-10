// localpulse/app/scripts/add-change-pin-i18n.cjs
//
// Adds the five ChangePinScreen keys to all 12 language objects in
// src/i18n/translations.js. Idempotent: a locale that already has a key is
// skipped, so re-running after a partial edit is safe.
//
//   node scripts/add-change-pin-i18n.cjs

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.join(__dirname, 'src', 'i18n', 'translations.js');

const STRINGS = {
  no: {
    changePin: 'Endre PIN',
    currentPin: 'Nåværende PIN',
    pinChanged: 'PIN-koden er endret.',
    pinMustDiffer: 'Ny PIN må være forskjellig fra den nåværende.',
    success: 'Fullført',
  },
  en: {
    changePin: 'Change PIN',
    currentPin: 'Current PIN',
    pinChanged: 'Your PIN has been changed.',
    pinMustDiffer: 'The new PIN must differ from the current one.',
    success: 'Success',
  },
  de: {
    changePin: 'PIN ändern',
    currentPin: 'Aktuelle PIN',
    pinChanged: 'Deine PIN wurde geändert.',
    pinMustDiffer: 'Die neue PIN muss sich von der aktuellen unterscheiden.',
    success: 'Erfolg',
  },
  da: {
    changePin: 'Skift PIN',
    currentPin: 'Nuværende PIN',
    pinChanged: 'Din PIN er blevet ændret.',
    pinMustDiffer: 'Den nye PIN skal være forskellig fra den nuværende.',
    success: 'Fuldført',
  },
  sv: {
    changePin: 'Ändra PIN',
    currentPin: 'Nuvarande PIN',
    pinChanged: 'Din PIN har ändrats.',
    pinMustDiffer: 'Den nya PIN-koden måste skilja sig från den nuvarande.',
    success: 'Klart',
  },
  fi: {
    changePin: 'Vaihda PIN',
    currentPin: 'Nykyinen PIN',
    pinChanged: 'PIN-koodisi on vaihdettu.',
    pinMustDiffer: 'Uuden PIN-koodin on oltava eri kuin nykyisen.',
    success: 'Valmis',
  },
  fr: {
    changePin: 'Modifier le PIN',
    currentPin: 'PIN actuel',
    pinChanged: 'Votre PIN a été modifié.',
    pinMustDiffer: "Le nouveau PIN doit être différent de l'actuel.",
    success: 'Réussi',
  },
  es: {
    changePin: 'Cambiar PIN',
    currentPin: 'PIN actual',
    pinChanged: 'Tu PIN ha sido cambiado.',
    pinMustDiffer: 'El nuevo PIN debe ser distinto del actual.',
    success: 'Listo',
  },
  it: {
    changePin: 'Cambia PIN',
    currentPin: 'PIN attuale',
    pinChanged: 'Il tuo PIN è stato cambiato.',
    pinMustDiffer: 'Il nuovo PIN deve essere diverso da quello attuale.',
    success: 'Fatto',
  },
  nl: {
    changePin: 'Pincode wijzigen',
    currentPin: 'Huidige pincode',
    pinChanged: 'Je pincode is gewijzigd.',
    pinMustDiffer: 'De nieuwe pincode moet verschillen van de huidige.',
    success: 'Gelukt',
  },
  pl: {
    changePin: 'Zmień PIN',
    currentPin: 'Obecny PIN',
    pinChanged: 'Twój PIN został zmieniony.',
    pinMustDiffer: 'Nowy PIN musi różnić się od obecnego.',
    success: 'Gotowe',
  },
  pt: {
    changePin: 'Alterar PIN',
    currentPin: 'PIN atual',
    pinChanged: 'O teu PIN foi alterado.',
    pinMustDiffer: 'O novo PIN tem de ser diferente do atual.',
    success: 'Concluído',
  },
};

const LANGS = Object.keys(STRINGS);

if (!fs.existsSync(FILE)) {
  console.error(`missing: ${FILE}`);
  process.exit(1);
}

const src = fs.readFileSync(FILE, 'utf8');
const ast = parser.parse(src, { sourceType: 'module' });

const objects = {};
traverse(ast, {
  VariableDeclarator(p) {
    const name = t.isIdentifier(p.node.id) ? p.node.id.name : null;
    if (name && LANGS.includes(name) && t.isObjectExpression(p.node.init)) {
      objects[name] = p.node.init;
    }
  },
});

const missingLangs = LANGS.filter((l) => !objects[l]);
if (missingLangs.length) {
  console.error(`no object literal found for: ${missingLangs.join(', ')}`);
  process.exit(1);
}

let changed = 0;

for (const lang of LANGS) {
  const obj = objects[lang];
  const existing = new Set(
    obj.properties
      .filter((p) => t.isObjectProperty(p))
      .map((p) => (t.isIdentifier(p.key) ? p.key.name : p.key.value)),
  );

  const added = [];
  for (const [key, value] of Object.entries(STRINGS[lang])) {
    if (existing.has(key)) continue;
    obj.properties.push(t.objectProperty(t.identifier(key), t.stringLiteral(value)));
    added.push(key);
  }

  if (added.length) {
    changed += added.length;
    console.log(`  ${lang}: +${added.length} (${added.join(', ')})`);
  } else {
    console.log(`  ${lang}: up to date`);
  }
}

if (changed === 0) {
  console.log('\nNothing to do.');
  process.exit(0);
}

// jsescOption.minimal keeps æøå and accented characters as literal UTF-8.
const { code } = generate(ast, { jsescOption: { minimal: true } }, src);
fs.writeFileSync(FILE, code.endsWith('\n') ? code : `${code}\n`, 'utf8');

console.log(`\n${changed} key(s) added to ${path.relative(process.cwd(), FILE)}`);
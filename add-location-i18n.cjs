// localpulse/app/scripts/add-location-i18n.cjs
//
// Adds `usingCurrentLocation` and `locationRequired` to all 12 language
// objects in src/i18n/translations.js. Idempotent: a locale that already has
// a key is skipped, so re-running after a partial edit is safe.
//
//   node scripts/add-location-i18n.cjs
//
// The file is a flat `const <lang> = { ... };` per language. Babel AST edit
// rather than regex, because the strings contain braces and apostrophes.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.join(__dirname, 'src', 'i18n', 'translations.js');

// Keyed by language, then by string key. Every language is present — no
// English placeholders, nothing to grep for later.
const STRINGS = {
  no: {
    usingCurrentLocation: 'Bruker din posisjon',
    locationRequired: 'Velg et sted for å fortsette.',
  },
  en: {
    usingCurrentLocation: 'Using your current location',
    locationRequired: 'Choose a location to continue.',
  },
  de: {
    usingCurrentLocation: 'Dein aktueller Standort wird verwendet',
    locationRequired: 'Wähle einen Ort, um fortzufahren.',
  },
  da: {
    usingCurrentLocation: 'Bruger din nuværende placering',
    locationRequired: 'Vælg en placering for at fortsætte.',
  },
  sv: {
    usingCurrentLocation: 'Använder din nuvarande plats',
    locationRequired: 'Välj en plats för att fortsätta.',
  },
  fi: {
    usingCurrentLocation: 'Käytetään nykyistä sijaintiasi',
    locationRequired: 'Valitse sijainti jatkaaksesi.',
  },
  fr: {
    usingCurrentLocation: 'Utilisation de votre position actuelle',
    locationRequired: 'Choisissez une localisation pour continuer.',
  },
  es: {
    usingCurrentLocation: 'Usando tu ubicación actual',
    locationRequired: 'Elige una ubicación para continuar.',
  },
  it: {
    usingCurrentLocation: 'Uso della tua posizione attuale',
    locationRequired: 'Scegli una posizione per continuare.',
  },
  nl: {
    usingCurrentLocation: 'Je huidige locatie wordt gebruikt',
    locationRequired: 'Kies een locatie om door te gaan.',
  },
  pl: {
    usingCurrentLocation: 'Używana jest Twoja obecna lokalizacja',
    locationRequired: 'Wybierz lokalizację, aby kontynuować.',
  },
  pt: {
    usingCurrentLocation: 'A usar a tua localização atual',
    locationRequired: 'Escolhe uma localização para continuar.',
  },
};

const LANGS = Object.keys(STRINGS);

if (!fs.existsSync(FILE)) {
  console.error(`missing: ${FILE}`);
  process.exit(1);
}

const src = fs.readFileSync(FILE, 'utf8');
const ast = parser.parse(src, { sourceType: 'module' });

// Collect the `const <lang> = { ... }` object literals by declarator name.
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

// jsescOption.minimal keeps æøå and accented characters as literal UTF-8
// rather than \uXXXX escapes.
const { code } = generate(ast, { jsescOption: { minimal: true } }, src);
fs.writeFileSync(FILE, code.endsWith('\n') ? code : `${code}\n`, 'utf8');

console.log(`\n${changed} key(s) added to ${path.relative(process.cwd(), FILE)}`);
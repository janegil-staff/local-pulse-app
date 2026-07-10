// localpulse/app/scripts/add-send-i18n.cjs
//
// Adds `send` to all 12 language objects in src/i18n/translations.js.
// Idempotent: a locale that already has the key is skipped.
//
//   node scripts/add-send-i18n.cjs
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');

const STRINGS = {
  no: { send: 'Send' },
  en: { send: 'Send' },
  nl: { send: 'Versturen' },
  fr: { send: 'Envoyer' },
  de: { send: 'Senden' },
  it: { send: 'Invia' },
  sv: { send: 'Skicka' },
  da: { send: 'Send' },
  fi: { send: 'Lähetä' },
  es: { send: 'Enviar' },
  pl: { send: 'Wyślij' },
  pt: { send: 'Enviar' },
};

const src = fs.readFileSync(FILE, 'utf8');
const ast = parser.parse(src, { sourceType: 'module' });

let added = 0;
const skipped = [];
const missing = new Set(Object.keys(STRINGS));

traverse(ast, {
  VariableDeclarator(p) {
    const lang = p.node.id.name;
    if (!STRINGS[lang] || !t.isObjectExpression(p.node.init)) return;
    missing.delete(lang);

    const existing = new Set(
      p.node.init.properties
        .filter((prop) => t.isObjectProperty(prop))
        .map((prop) => (t.isIdentifier(prop.key) ? prop.key.name : prop.key.value))
    );

    for (const [key, value] of Object.entries(STRINGS[lang])) {
      if (existing.has(key)) { skipped.push(`${lang}.${key}`); continue; }
      p.node.init.properties.push(t.objectProperty(t.identifier(key), t.stringLiteral(value)));
      added += 1;
    }
  },
});

if (missing.size) {
  console.error(`Language objects not found in ${FILE}: ${[...missing].join(', ')}`);
  process.exit(1);
}

const out = generate(ast, { jsescOption: { minimal: true } }, src).code;
fs.writeFileSync(FILE, out + '\n', 'utf8');

console.log(`Added ${added}, skipped ${skipped.length}${skipped.length ? ': ' + skipped.join(', ') : ''}.`);
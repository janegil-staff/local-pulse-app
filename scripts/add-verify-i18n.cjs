// localpulse/app/scripts/add-savetoast-i18n.cjs
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');

const STRINGS = {
  no: { postSaved: 'Lagret', postUnsaved: 'Fjernet fra lagrede' },
  en: { postSaved: 'Saved', postUnsaved: 'Removed from saved' },
  nl: { postSaved: 'Opgeslagen', postUnsaved: 'Verwijderd uit opgeslagen' },
  fr: { postSaved: 'Enregistré', postUnsaved: 'Retiré des enregistrements' },
  de: { postSaved: 'Gespeichert', postUnsaved: 'Aus Gespeichertem entfernt' },
  it: { postSaved: 'Salvato', postUnsaved: 'Rimosso dai salvati' },
  sv: { postSaved: 'Sparad', postUnsaved: 'Borttagen från sparade' },
  da: { postSaved: 'Gemt', postUnsaved: 'Fjernet fra gemte' },
  fi: { postSaved: 'Tallennettu', postUnsaved: 'Poistettu tallennetuista' },
  es: { postSaved: 'Guardado', postUnsaved: 'Eliminado de guardados' },
  pl: { postSaved: 'Zapisano', postUnsaved: 'Usunięto z zapisanych' },
  pt: { postSaved: 'Guardado', postUnsaved: 'Removido dos guardados' },
};

const src = fs.readFileSync(FILE, 'utf8');
const ast = parser.parse(src, { sourceType: 'module' });
let added = 0; const skipped = []; const missing = new Set(Object.keys(STRINGS));
traverse(ast, {
  VariableDeclarator(p) {
    const lang = p.node.id.name;
    if (!STRINGS[lang] || !t.isObjectExpression(p.node.init)) return;
    missing.delete(lang);
    const existing = new Set(p.node.init.properties.filter((x) => t.isObjectProperty(x)).map((x) => (t.isIdentifier(x.key) ? x.key.name : x.key.value)));
    for (const [key, value] of Object.entries(STRINGS[lang])) {
      if (existing.has(key)) { skipped.push(`${lang}.${key}`); continue; }
      p.node.init.properties.push(t.objectProperty(t.identifier(key), t.stringLiteral(value)));
      added++;
    }
  },
});
if (missing.size) { console.error(`Missing: ${[...missing].join(', ')}`); process.exit(1); }
fs.writeFileSync(FILE, generate(ast, { jsescOption: { minimal: true } }, src).code + '\n', 'utf8');
console.log(`Added ${added}, skipped ${skipped.length}.`);
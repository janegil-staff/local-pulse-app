// localpulse/app/scripts/add-saved-i18n.cjs
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');

const STRINGS = {
  no: { savedPosts: 'Lagrede innlegg' }, en: { savedPosts: 'Saved posts' },
  nl: { savedPosts: 'Opgeslagen berichten' }, fr: { savedPosts: 'Publications enregistrées' },
  de: { savedPosts: 'Gespeicherte Beiträge' }, it: { savedPosts: 'Post salvati' },
  sv: { savedPosts: 'Sparade inlägg' }, da: { savedPosts: 'Gemte opslag' },
  fi: { savedPosts: 'Tallennetut julkaisut' }, es: { savedPosts: 'Publicaciones guardadas' },
  pl: { savedPosts: 'Zapisane posty' }, pt: { savedPosts: 'Publicações guardadas' },
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
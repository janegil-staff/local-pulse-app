// localpulse/app/scripts/add-consent-link-i18n.cjs
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');

const STRINGS = {
  no: { consentPre: 'Jeg samtykker til lagring og bruk av mine data i samsvar med', consentPost: '' },
  en: { consentPre: 'I consent to the storage and use of my data in accordance with the', consentPost: '' },
  nl: { consentPre: 'Ik geef toestemming voor de opslag en het gebruik van mijn gegevens volgens het', consentPost: '' },
  fr: { consentPre: 'Je consens au stockage et à l’utilisation de mes données conformément à la', consentPost: '' },
  de: { consentPre: 'Ich willige in die Speicherung und Nutzung meiner Daten gemäß der', consentPost: 'ein' },
  it: { consentPre: 'Acconsento alla conservazione e all’uso dei miei dati in conformità con l’', consentPost: '' },
  sv: { consentPre: 'Jag samtycker till lagring och användning av mina uppgifter i enlighet med', consentPost: '' },
  da: { consentPre: 'Jeg samtykker til opbevaring og brug af mine data i overensstemmelse med', consentPost: '' },
  fi: { consentPre: 'Suostun tietojeni tallentamiseen ja käyttöön', consentPost: 'mukaisesti' },
  es: { consentPre: 'Doy mi consentimiento para el almacenamiento y uso de mis datos de acuerdo con la', consentPost: '' },
  pl: { consentPre: 'Wyrażam zgodę na przechowywanie i wykorzystywanie moich danych zgodnie z', consentPost: '' },
  pt: { consentPre: 'Consinto o armazenamento e a utilização dos meus dados de acordo com a', consentPost: '' },
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
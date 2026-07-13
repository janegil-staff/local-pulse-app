// scripts/patch-i18n-messages.cjs
// Idempotent: adds Messages/Requests inbox keys to every language object in
// src/i18n/translations.js. Re-running is a no-op. Norwegian authoritative.
//
//   node scripts/patch-i18n-messages.cjs
//
// NOTE: the empty-state key (noConversations / requestsEmpty) may need a value
// matching your actual line-118 text — adjust if your empty state says
// something different.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.resolve(__dirname, '../src/i18n/translations.js');

const ADDITIONS = {
  messages: {
    no: 'Meldinger', en: 'Messages', de: 'Nachrichten', da: 'Beskeder',
    sv: 'Meddelanden', fi: 'Viestit', fr: 'Messages', es: 'Mensajes',
    it: 'Messaggi', nl: 'Berichten', pl: 'Wiadomości', pt: 'Mensagens',
  },
  requests: {
    no: 'Forespørsler', en: 'Requests', de: 'Anfragen', da: 'Anmodninger',
    sv: 'Förfrågningar', fi: 'Pyynnöt', fr: 'Demandes', es: 'Solicitudes',
    it: 'Richieste', nl: 'Verzoeken', pl: 'Prośby', pt: 'Pedidos',
  },
  noMessagesYet: {
    no: 'Ingen meldinger ennå', en: 'No messages yet', de: 'Noch keine Nachrichten',
    da: 'Ingen beskeder endnu', sv: 'Inga meddelanden än', fi: 'Ei vielä viestejä',
    fr: 'Pas encore de messages', es: 'Aún no hay mensajes', it: 'Ancora nessun messaggio',
    nl: 'Nog geen berichten', pl: 'Brak wiadomości', pt: 'Ainda sem mensagens',
  },
  noConversations: {
    no: 'Ingen samtaler ennå. Finn folk i Utforsk og si hei.',
    en: 'No conversations yet. Find people in Discover and say hi.',
    de: 'Noch keine Unterhaltungen. Finde Leute in Entdecken und sag hallo.',
    da: 'Ingen samtaler endnu. Find folk i Opdag og sig hej.',
    sv: 'Inga konversationer än. Hitta folk i Utforska och säg hej.',
    fi: 'Ei vielä keskusteluja. Etsi ihmisiä Löydä-osiosta ja tervehdi.',
    fr: 'Pas encore de conversations. Trouvez des gens dans Découvrir et dites bonjour.',
    es: 'Aún no hay conversaciones. Encuentra personas en Descubrir y saluda.',
    it: 'Ancora nessuna conversazione. Trova persone in Esplora e saluta.',
    nl: 'Nog geen gesprekken. Vind mensen in Ontdekken en zeg hallo.',
    pl: 'Brak rozmów. Znajdź ludzi w Odkrywaj i przywitaj się.',
    pt: 'Ainda sem conversas. Encontra pessoas em Descobrir e diz olá.',
  },
  noRequests: {
    no: 'Ingen forespørsler', en: 'No requests', de: 'Keine Anfragen',
    da: 'Ingen anmodninger', sv: 'Inga förfrågningar', fi: 'Ei pyyntöjä',
    fr: 'Aucune demande', es: 'Sin solicitudes', it: 'Nessuna richiesta',
    nl: 'Geen verzoeken', pl: 'Brak próśb', pt: 'Sem pedidos',
  },
  accept: {
    no: 'Godta', en: 'Accept', de: 'Annehmen', da: 'Acceptér', sv: 'Acceptera',
    fi: 'Hyväksy', fr: 'Accepter', es: 'Aceptar', it: 'Accetta', nl: 'Accepteren',
    pl: 'Akceptuj', pt: 'Aceitar',
  },
};

const LANGS = ['no', 'en', 'de', 'da', 'sv', 'fi', 'fr', 'es', 'it', 'nl', 'pl', 'pt'];

const src = fs.readFileSync(FILE, 'utf8');
const ast = parser.parse(src, { sourceType: 'module' });

let added = 0;
let skipped = 0;

traverse(ast, {
  VariableDeclarator(pathNode) {
    const name = pathNode.node.id && pathNode.node.id.name;
    if (!LANGS.includes(name)) return;
    const obj = pathNode.node.init;
    if (!obj || obj.type !== 'ObjectExpression') return;

    for (const key of Object.keys(ADDITIONS)) {
      const already = obj.properties.some(
        (p) =>
          p.type === 'ObjectProperty' &&
          ((p.key.type === 'Identifier' && p.key.name === key) ||
            (p.key.type === 'StringLiteral' && p.key.value === key))
      );
      if (already) { skipped++; continue; }
      const value = ADDITIONS[key][name];
      if (value == null) continue;
      obj.properties.push(
        t.objectProperty(t.identifier(key), t.stringLiteral(value))
      );
      added++;
    }
  },
});

if (added === 0) {
  console.log(`No changes — all keys already present (${skipped} skips).`);
} else {
  const out = generate(ast, { retainLines: false, jsescOption: { minimal: true } }, src).code;
  fs.writeFileSync(FILE, out + '\n', 'utf8');
  console.log(`Added ${added} key/lang entries, skipped ${skipped}. Wrote ${FILE}`);
}

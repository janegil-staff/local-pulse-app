// scripts/patch-feed-i18n.cjs
// Idempotent: adds feed-tab i18n keys (allFeeds, feedFollowing, feedTitle,
// feedEmptyNearby, feedEmptyFollowing) to every language object in
// src/i18n/translations.js. Re-running is a no-op — existing keys are skipped.
//
//   node scripts/patch-feed-i18n.cjs
//
// Norwegian is authoritative. Values below are the full 12-language set.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.resolve(__dirname, '../src/i18n/translations.js');

// key -> { lang: value }. Every lang present for every key (no partial subsets).
const ADDITIONS = {
  allFeeds: {
    no: 'Alle innlegg', en: 'All feeds', de: 'Alle Beiträge', da: 'Alle opslag',
    sv: 'Alla inlägg', fi: 'Kaikki julkaisut', fr: 'Tous les fils',
    es: 'Todas las publicaciones', it: 'Tutti i post', nl: 'Alle berichten',
    pl: 'Wszystkie posty', pt: 'Todas as publicações',
  },
  feedFollowing: {
    no: 'Følger', en: 'Following', de: 'Folge ich', da: 'Følger',
    sv: 'Följer', fi: 'Seuraat', fr: 'Abonnements', es: 'Siguiendo',
    it: 'Seguiti', nl: 'Volgend', pl: 'Obserwowani', pt: 'A seguir',
  },
  feedTitle: {
    no: 'Innlegg', en: 'Feed', de: 'Feed', da: 'Feed',
    sv: 'Flöde', fi: 'Syöte', fr: 'Fil', es: 'Feed',
    it: 'Feed', nl: 'Feed', pl: 'Aktualności', pt: 'Feed',
  },
  feedEmptyNearby: {
    no: 'Ingen innlegg ennå. Bli den første — trykk +',
    en: 'No posts yet. Be the first — tap +',
    de: 'Noch keine Beiträge. Sei der Erste — tippe auf +',
    da: 'Ingen opslag endnu. Vær den første — tryk på +',
    sv: 'Inga inlägg än. Var först — tryck på +',
    fi: 'Ei vielä julkaisuja. Ole ensimmäinen — napauta +',
    fr: 'Pas encore de publications. Soyez le premier — appuyez sur +',
    es: 'Aún no hay publicaciones. Sé el primero — toca +',
    it: 'Ancora nessun post. Sii il primo — tocca +',
    nl: 'Nog geen berichten. Wees de eerste — tik op +',
    pl: 'Brak postów. Bądź pierwszy — dotknij +',
    pt: 'Ainda sem publicações. Seja o primeiro — toque em +',
  },
  feedEmptyFollowing: {
    no: 'Følg folk for å se innleggene deres her.',
    en: 'Follow people to see their posts here.',
    de: 'Folge Leuten, um ihre Beiträge hier zu sehen.',
    da: 'Følg folk for at se deres opslag her.',
    sv: 'Följ personer för att se deras inlägg här.',
    fi: 'Seuraa ihmisiä nähdäksesi heidän julkaisunsa täällä.',
    fr: 'Abonnez-vous à des personnes pour voir leurs publications ici.',
    es: 'Sigue a personas para ver sus publicaciones aquí.',
    it: 'Segui delle persone per vedere qui i loro post.',
    nl: 'Volg mensen om hun berichten hier te zien.',
    pl: 'Obserwuj ludzi, aby zobaczyć tutaj ich posty.',
    pt: 'Segue pessoas para ver as publicações delas aqui.',
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

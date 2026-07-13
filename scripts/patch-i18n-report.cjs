// scripts/patch-i18n-report.cjs
// Idempotent: adds report-flow i18n keys (reason labels + sheet strings) to
// every language object in src/i18n/translations.js. Re-running is a no-op.
//
//   node scripts/patch-i18n-report.cjs
//
// Reason KEYS on the wire are fixed enum values (see server Report.js); these
// are only the human labels shown in the report sheet. Norwegian authoritative.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.resolve(__dirname, '../src/i18n/translations.js');

const ADDITIONS = {
  reportInappropriate: {
    no: 'Upassende innhold', en: 'Inappropriate content', de: 'Unangemessene Inhalte',
    da: 'Upassende indhold', sv: 'Olämpligt innehåll', fi: 'Sopimaton sisältö',
    fr: 'Contenu inapproprié', es: 'Contenido inapropiado', it: 'Contenuti inappropriati',
    nl: 'Ongepaste inhoud', pl: 'Nieodpowiednie treści', pt: 'Conteúdo inadequado',
  },
  reportHarassment: {
    no: 'Trakassering', en: 'Harassment', de: 'Belästigung', da: 'Chikane',
    sv: 'Trakasserier', fi: 'Häirintä', fr: 'Harcèlement', es: 'Acoso',
    it: 'Molestie', nl: 'Intimidatie', pl: 'Nękanie', pt: 'Assédio',
  },
  reportSpam: {
    no: 'Spam eller svindel', en: 'Spam or scam', de: 'Spam oder Betrug',
    da: 'Spam eller svindel', sv: 'Skräppost eller bedrägeri', fi: 'Roskaposti tai huijaus',
    fr: 'Spam ou arnaque', es: 'Spam o estafa', it: 'Spam o truffa',
    nl: 'Spam of oplichting', pl: 'Spam lub oszustwo', pt: 'Spam ou fraude',
  },
  reportMisinformation: {
    no: 'Falsk eller villedende profil', en: 'Fake or misleading profile',
    de: 'Gefälschtes oder irreführendes Profil', da: 'Falsk eller vildledende profil',
    sv: 'Falsk eller vilseledande profil', fi: 'Väärä tai harhaanjohtava profiili',
    fr: 'Profil faux ou trompeur', es: 'Perfil falso o engañoso',
    it: 'Profilo falso o ingannevole', nl: 'Nep- of misleidend profiel',
    pl: 'Fałszywy lub wprowadzający w błąd profil', pt: 'Perfil falso ou enganoso',
  },
  reportOther: {
    no: 'Annet', en: 'Other', de: 'Sonstiges', da: 'Andet', sv: 'Annat',
    fi: 'Muu', fr: 'Autre', es: 'Otro', it: 'Altro', nl: 'Anders',
    pl: 'Inne', pt: 'Outro',
  },
  reportUserTitle: {
    no: 'Rapporter bruker', en: 'Report user', de: 'Nutzer melden',
    da: 'Rapportér bruger', sv: 'Rapportera användare', fi: 'Ilmoita käyttäjästä',
    fr: "Signaler l'utilisateur", es: 'Denunciar usuario', it: 'Segnala utente',
    nl: 'Gebruiker melden', pl: 'Zgłoś użytkownika', pt: 'Denunciar utilizador',
  },
  reportWhy: {
    no: 'Hvorfor rapporterer du denne profilen?',
    en: 'Why are you reporting this profile?',
    de: 'Warum meldest du dieses Profil?',
    da: 'Hvorfor rapporterer du denne profil?',
    sv: 'Varför rapporterar du den här profilen?',
    fi: 'Miksi ilmoitat tästä profiilista?',
    fr: 'Pourquoi signalez-vous ce profil ?',
    es: '¿Por qué denuncias este perfil?',
    it: 'Perché segnali questo profilo?',
    nl: 'Waarom meld je dit profiel?',
    pl: 'Dlaczego zgłaszasz ten profil?',
    pt: 'Porque estás a denunciar este perfil?',
  },
  reportThanksTitle: {
    no: 'Rapportert', en: 'Reported', de: 'Gemeldet', da: 'Rapporteret',
    sv: 'Rapporterad', fi: 'Ilmoitettu', fr: 'Signalé', es: 'Denunciado',
    it: 'Segnalato', nl: 'Gemeld', pl: 'Zgłoszono', pt: 'Denunciado',
  },
  reportThanks: {
    no: 'Takk — teamet vårt vil se på denne profilen.',
    en: 'Thanks — our team will review this profile.',
    de: 'Danke — unser Team überprüft dieses Profil.',
    da: 'Tak — vores team gennemgår denne profil.',
    sv: 'Tack — vårt team granskar den här profilen.',
    fi: 'Kiitos — tiimimme tarkistaa tämän profiilin.',
    fr: 'Merci — notre équipe examinera ce profil.',
    es: 'Gracias — nuestro equipo revisará este perfil.',
    it: 'Grazie — il nostro team esaminerà questo profilo.',
    nl: 'Bedankt — ons team beoordeelt dit profiel.',
    pl: 'Dziękujemy — nasz zespół sprawdzi ten profil.',
    pt: 'Obrigado — a nossa equipa vai analisar este perfil.',
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

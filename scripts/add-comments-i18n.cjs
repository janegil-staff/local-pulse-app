// localpulse/app/scripts/add-comments-i18n.cjs
//
// Adds the PostDetailScreen comment strings to all 12 language objects in
// src/i18n/translations.js. Fixes the "undefined (1)" heading — the screen
// renders `${t.comments} (${count})`, and t.comments was never added.
//
//   node scripts/add-comments-i18n.cjs
//
// Idempotent: a locale that already has a key is skipped, so re-running is safe.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');

const STRINGS = {
  no: { comments: 'Kommentarer', loadingComments: 'Laster kommentarer…', noComments: 'Ingen kommentarer ennå — start samtalen.', addComment: 'Legg til en kommentar…' },
  en: { comments: 'Comments', loadingComments: 'Loading comments…', noComments: 'No comments yet — start the conversation.', addComment: 'Add a comment…' },
  nl: { comments: 'Reacties', loadingComments: 'Reacties laden…', noComments: 'Nog geen reacties — begin het gesprek.', addComment: 'Voeg een reactie toe…' },
  fr: { comments: 'Commentaires', loadingComments: 'Chargement des commentaires…', noComments: 'Pas encore de commentaires — lancez la conversation.', addComment: 'Ajouter un commentaire…' },
  de: { comments: 'Kommentare', loadingComments: 'Kommentare werden geladen…', noComments: 'Noch keine Kommentare — starte das Gespräch.', addComment: 'Kommentar hinzufügen…' },
  it: { comments: 'Commenti', loadingComments: 'Caricamento commenti…', noComments: 'Ancora nessun commento — inizia la conversazione.', addComment: 'Aggiungi un commento…' },
  sv: { comments: 'Kommentarer', loadingComments: 'Laddar kommentarer…', noComments: 'Inga kommentarer än — starta konversationen.', addComment: 'Lägg till en kommentar…' },
  da: { comments: 'Kommentarer', loadingComments: 'Indlæser kommentarer…', noComments: 'Ingen kommentarer endnu — start samtalen.', addComment: 'Tilføj en kommentar…' },
  fi: { comments: 'Kommentit', loadingComments: 'Ladataan kommentteja…', noComments: 'Ei vielä kommentteja — aloita keskustelu.', addComment: 'Lisää kommentti…' },
  es: { comments: 'Comentarios', loadingComments: 'Cargando comentarios…', noComments: 'Aún no hay comentarios — inicia la conversación.', addComment: 'Añade un comentario…' },
  pl: { comments: 'Komentarze', loadingComments: 'Ładowanie komentarzy…', noComments: 'Brak komentarzy — rozpocznij rozmowę.', addComment: 'Dodaj komentarz…' },
  pt: { comments: 'Comentários', loadingComments: 'A carregar comentários…', noComments: 'Ainda sem comentários — inicie a conversa.', addComment: 'Adicione um comentário…' },
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

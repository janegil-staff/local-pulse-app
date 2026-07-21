// localpulse/app/scripts/patch-interests-keys.cjs
//
// Adds interest-picker strings to all 12 mobile locale files under
// src/i18n/locales/. These are FLAT keys (the mobile locales are flat JSON,
// unlike the nested web ones):
//   interests, addInterests, interestsMax, done
//   interest_<value> for each canonical interest (interest_hiking, ...)
//
// SAFE: only sets keys that are missing; never overwrites existing values, so
// hand-edits survive re-runs. Idempotent.
//
// Run from the app root:
//   node scripts/patch-interests-keys.cjs
// Optional: pass the locales dir as an argument.

const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || path.join(__dirname, '..', 'src', 'i18n', 'locales');
const LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

// UI strings for the picker.
const UI = {
  interests: {
    no: 'Interesser', en: 'Interests', nl: 'Interesses', fr: 'Centres d’intérêt',
    de: 'Interessen', it: 'Interessi', sv: 'Intressen', da: 'Interesser',
    fi: 'Kiinnostukset', es: 'Intereses', pl: 'Zainteresowania', pt: 'Interesses',
  },
  addInterests: {
    no: 'Legg til', en: 'Add', nl: 'Toevoegen', fr: 'Ajouter', de: 'Hinzufügen',
    it: 'Aggiungi', sv: 'Lägg till', da: 'Tilføj', fi: 'Lisää', es: 'Añadir',
    pl: 'Dodaj', pt: 'Adicionar',
  },
  interestsMax: {
    no: 'Du kan velge opptil {n} interesser.',
    en: 'You can pick up to {n} interests.',
    nl: 'Je kunt maximaal {n} interesses kiezen.',
    fr: 'Vous pouvez choisir jusqu’à {n} centres d’intérêt.',
    de: 'Du kannst bis zu {n} Interessen auswählen.',
    it: 'Puoi scegliere fino a {n} interessi.',
    sv: 'Du kan välja upp till {n} intressen.',
    da: 'Du kan vælge op til {n} interesser.',
    fi: 'Voit valita enintään {n} kiinnostusta.',
    es: 'Puedes elegir hasta {n} intereses.',
    pl: 'Możesz wybrać maksymalnie {n} zainteresowań.',
    pt: 'Podes escolher até {n} interesses.',
  },
  done: {
    no: 'Ferdig', en: 'Done', nl: 'Klaar', fr: 'Terminé', de: 'Fertig',
    it: 'Fatto', sv: 'Klar', da: 'Færdig', fi: 'Valmis', es: 'Listo',
    pl: 'Gotowe', pt: 'Concluído',
  },
};

// Interest labels. Key in the JSON is interest_<value>.
// [no, en, nl, fr, de, it, sv, da, fi, es, pl, pt]
const INTEREST_LABELS = {
  hiking:     ['Turgåing','Hiking','Wandelen','Randonnée','Wandern','Escursionismo','Vandring','Vandring','Vaellus','Senderismo','Wędrówki','Caminhadas'],
  coffee:     ['Kaffe','Coffee','Koffie','Café','Kaffee','Caffè','Kaffe','Kaffe','Kahvi','Café','Kawa','Café'],
  travel:     ['Reise','Travel','Reizen','Voyage','Reisen','Viaggi','Resor','Rejser','Matkailu','Viajar','Podróże','Viagens'],
  photography:['Fotografering','Photography','Fotografie','Photographie','Fotografie','Fotografia','Fotografi','Fotografering','Valokuvaus','Fotografía','Fotografia','Fotografia'],
  music:      ['Musikk','Music','Muziek','Musique','Musik','Musica','Musik','Musik','Musiikki','Música','Muzyka','Música'],
  food:       ['Mat','Food','Eten','Cuisine','Essen','Cibo','Mat','Mad','Ruoka','Comida','Jedzenie','Comida'],
  fitness:    ['Trening','Fitness','Fitness','Fitness','Fitness','Fitness','Träning','Fitness','Kuntoilu','Fitness','Fitness','Fitness'],
  running:    ['Løping','Running','Hardlopen','Course à pied','Laufen','Corsa','Löpning','Løb','Juoksu','Correr','Bieganie','Corrida'],
  art:        ['Kunst','Art','Kunst','Art','Kunst','Arte','Konst','Kunst','Taide','Arte','Sztuka','Arte'],
  books:      ['Bøker','Books','Boeken','Livres','Bücher','Libri','Böcker','Bøger','Kirjat','Libros','Książki','Livros'],
  gaming:     ['Gaming','Gaming','Gamen','Jeux vidéo','Gaming','Videogiochi','Gaming','Gaming','Pelaaminen','Videojuegos','Gry','Jogos'],
  cooking:    ['Matlaging','Cooking','Koken','Cuisine','Kochen','Cucina','Matlagning','Madlavning','Ruoanlaitto','Cocinar','Gotowanie','Cozinhar'],
  cycling:    ['Sykling','Cycling','Fietsen','Vélo','Radfahren','Ciclismo','Cykling','Cykling','Pyöräily','Ciclismo','Kolarstwo','Ciclismo'],
  yoga:       ['Yoga','Yoga','Yoga','Yoga','Yoga','Yoga','Yoga','Yoga','Jooga','Yoga','Joga','Ioga'],
  movies:     ['Film','Movies','Films','Cinéma','Filme','Film','Film','Film','Elokuvat','Películas','Filmy','Filmes'],
  dancing:    ['Dans','Dancing','Dansen','Danse','Tanzen','Ballo','Dans','Dans','Tanssi','Baile','Taniec','Dança'],
  design:     ['Design','Design','Ontwerp','Design','Design','Design','Design','Design','Muotoilu','Diseño','Projektowanie','Design'],
  nature:     ['Natur','Nature','Natuur','Nature','Natur','Natura','Natur','Natur','Luonto','Naturaleza','Natura','Natureza'],
  concerts:   ['Konserter','Concerts','Concerten','Concerts','Konzerte','Concerti','Konserter','Koncerter','Konsertit','Conciertos','Koncerty','Concertos'],
  fashion:    ['Mote','Fashion','Mode','Mode','Mode','Moda','Mode','Mode','Muoti','Moda','Moda','Moda'],
  technology: ['Teknologi','Technology','Technologie','Technologie','Technologie','Tecnologia','Teknik','Teknologi','Teknologia','Tecnología','Technologia','Tecnologia'],
  football:   ['Fotball','Football','Voetbal','Football','Fußball','Calcio','Fotboll','Fodbold','Jalkapallo','Fútbol','Piłka nożna','Futebol'],
  climbing:   ['Klatring','Climbing','Klimmen','Escalade','Klettern','Arrampicata','Klättring','Klatring','Kiipeily','Escalada','Wspinaczka','Escalada'],
  baking:     ['Baking','Baking','Bakken','Pâtisserie','Backen','Cottura','Bakning','Bagning','Leipominen','Repostería','Pieczenie','Padaria'],
};

const LANG_INDEX = { no:0, en:1, nl:2, fr:3, de:4, it:5, sv:6, da:7, fi:8, es:9, pl:10, pt:11 };

let filesChanged = 0;

for (const lang of LANGS) {
  const file = path.join(DIR, `${lang}.json`);
  if (!fs.existsSync(file)) { console.warn(`! ${lang}.json not found — skipped`); continue; }

  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  let touched = false;

  // UI strings.
  for (const [key, byLang] of Object.entries(UI)) {
    if (obj[key] === undefined) { obj[key] = byLang[lang]; touched = true; }
  }

  // Interest labels.
  const idx = LANG_INDEX[lang];
  for (const [value, labels] of Object.entries(INTEREST_LABELS)) {
    const key = `interest_${value}`;
    if (obj[key] === undefined) { obj[key] = labels[idx]; touched = true; }
  }

  if (!touched) { console.log(`· ${lang}: already has interest keys`); continue; }

  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}: added interest keys`);
  filesChanged += 1;
}

console.log(`\ndone — updated ${filesChanged} file(s).`);

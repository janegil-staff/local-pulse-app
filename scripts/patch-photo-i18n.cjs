// localpulse/app/scripts/patch-photo-i18n.cjs
//
// Adds the photo.* keys used by PhotoPicker.js to all 12 locale files.
// Idempotent: re-running only fills missing keys, never overwrites existing
// translations. Norwegian (no) is authoritative; the rest are provided.
//
// Run from the app root:  node scripts/patch-photo-i18n.cjs

const fs = require('fs');
const path = require('path');

// Adjust if your locales live elsewhere.
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

// photo.* strings per language.
const STRINGS = {
  no: {
    add: 'Legg til bilde',
    permissionTitle: 'Tilgang kreves',
    permissionBody: 'Gi appen tilgang til bildene dine for å legge til et bilde.',
    errorTitle: 'Kunne ikke åpne bilder',
    errorBody: 'Noe gikk galt da bildevelgeren skulle åpnes. Prøv igjen.',
    uploadErrorTitle: 'Opplasting mislyktes',
    uploadErrorBody: 'Kunne ikke laste opp bildet. Sjekk nettverket og prøv igjen.',
  },
  en: {
    add: 'Add photo',
    permissionTitle: 'Permission needed',
    permissionBody: 'Allow access to your photos to add a picture.',
    errorTitle: 'Could not open photos',
    errorBody: 'Something went wrong opening the picker. Please try again.',
    uploadErrorTitle: 'Upload failed',
    uploadErrorBody: 'Could not upload the photo. Check your connection and try again.',
  },
  nl: {
    add: 'Foto toevoegen',
    permissionTitle: 'Toestemming vereist',
    permissionBody: 'Geef toegang tot je foto’s om een afbeelding toe te voegen.',
    errorTitle: 'Kon foto’s niet openen',
    errorBody: 'Er ging iets mis bij het openen van de kiezer. Probeer het opnieuw.',
    uploadErrorTitle: 'Uploaden mislukt',
    uploadErrorBody: 'Kon de foto niet uploaden. Controleer je verbinding en probeer opnieuw.',
  },
  fr: {
    add: 'Ajouter une photo',
    permissionTitle: 'Autorisation requise',
    permissionBody: 'Autorisez l’accès à vos photos pour ajouter une image.',
    errorTitle: 'Impossible d’ouvrir les photos',
    errorBody: 'Une erreur s’est produite à l’ouverture du sélecteur. Réessayez.',
    uploadErrorTitle: 'Échec de l’envoi',
    uploadErrorBody: 'Impossible d’envoyer la photo. Vérifiez votre connexion et réessayez.',
  },
  de: {
    add: 'Foto hinzufügen',
    permissionTitle: 'Berechtigung erforderlich',
    permissionBody: 'Erlaube den Zugriff auf deine Fotos, um ein Bild hinzuzufügen.',
    errorTitle: 'Fotos konnten nicht geöffnet werden',
    errorBody: 'Beim Öffnen der Auswahl ist ein Fehler aufgetreten. Bitte erneut versuchen.',
    uploadErrorTitle: 'Upload fehlgeschlagen',
    uploadErrorBody: 'Foto konnte nicht hochgeladen werden. Prüfe die Verbindung und versuche es erneut.',
  },
  it: {
    add: 'Aggiungi foto',
    permissionTitle: 'Autorizzazione necessaria',
    permissionBody: 'Consenti l’accesso alle tue foto per aggiungere un’immagine.',
    errorTitle: 'Impossibile aprire le foto',
    errorBody: 'Si è verificato un errore durante l’apertura del selettore. Riprova.',
    uploadErrorTitle: 'Caricamento non riuscito',
    uploadErrorBody: 'Impossibile caricare la foto. Controlla la connessione e riprova.',
  },
  sv: {
    add: 'Lägg till foto',
    permissionTitle: 'Behörighet krävs',
    permissionBody: 'Ge appen åtkomst till dina bilder för att lägga till ett foto.',
    errorTitle: 'Kunde inte öppna bilder',
    errorBody: 'Något gick fel när väljaren skulle öppnas. Försök igen.',
    uploadErrorTitle: 'Uppladdning misslyckades',
    uploadErrorBody: 'Kunde inte ladda upp fotot. Kontrollera anslutningen och försök igen.',
  },
  da: {
    add: 'Tilføj billede',
    permissionTitle: 'Tilladelse kræves',
    permissionBody: 'Giv adgang til dine billeder for at tilføje et foto.',
    errorTitle: 'Kunne ikke åbne billeder',
    errorBody: 'Noget gik galt, da vælgeren skulle åbnes. Prøv igen.',
    uploadErrorTitle: 'Upload mislykkedes',
    uploadErrorBody: 'Kunne ikke uploade billedet. Tjek din forbindelse, og prøv igen.',
  },
  fi: {
    add: 'Lisää kuva',
    permissionTitle: 'Lupa tarvitaan',
    permissionBody: 'Salli pääsy kuviisi lisätäksesi kuvan.',
    errorTitle: 'Kuvia ei voitu avata',
    errorBody: 'Valitsimen avaamisessa tapahtui virhe. Yritä uudelleen.',
    uploadErrorTitle: 'Lataus epäonnistui',
    uploadErrorBody: 'Kuvaa ei voitu ladata. Tarkista yhteys ja yritä uudelleen.',
  },
  es: {
    add: 'Añadir foto',
    permissionTitle: 'Permiso necesario',
    permissionBody: 'Permite el acceso a tus fotos para añadir una imagen.',
    errorTitle: 'No se pudieron abrir las fotos',
    errorBody: 'Ocurrió un error al abrir el selector. Inténtalo de nuevo.',
    uploadErrorTitle: 'Error al subir',
    uploadErrorBody: 'No se pudo subir la foto. Comprueba tu conexión e inténtalo de nuevo.',
  },
  pl: {
    add: 'Dodaj zdjęcie',
    permissionTitle: 'Wymagane uprawnienia',
    permissionBody: 'Zezwól na dostęp do zdjęć, aby dodać obraz.',
    errorTitle: 'Nie można otworzyć zdjęć',
    errorBody: 'Wystąpił błąd podczas otwierania selektora. Spróbuj ponownie.',
    uploadErrorTitle: 'Przesyłanie nie powiodło się',
    uploadErrorBody: 'Nie udało się przesłać zdjęcia. Sprawdź połączenie i spróbuj ponownie.',
  },
  pt: {
    add: 'Adicionar foto',
    permissionTitle: 'Permissão necessária',
    permissionBody: 'Permita o acesso às suas fotos para adicionar uma imagem.',
    errorTitle: 'Não foi possível abrir as fotos',
    errorBody: 'Ocorreu um erro ao abrir o seletor. Tente novamente.',
    uploadErrorTitle: 'Falha no envio',
    uploadErrorBody: 'Não foi possível enviar a foto. Verifique a ligação e tente novamente.',
  },
};

let changed = 0;
let skipped = 0;

for (const lang of LANGS) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  missing locale file, skipping: ${file}`);
    continue;
  }

  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const src = STRINGS[lang];

  if (!json.photo || typeof json.photo !== 'object') json.photo = {};

  let touched = false;
  for (const [key, val] of Object.entries(src)) {
    // Only fill missing keys — never clobber an existing translation.
    if (json.photo[key] === undefined) {
      json.photo[key] = val;
      touched = true;
      changed += 1;
    } else {
      skipped += 1;
    }
  }

  if (touched) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`✅ ${lang}: updated`);
  } else {
    console.log(`•  ${lang}: already up to date`);
  }
}

console.log(`\nDone. ${changed} keys added, ${skipped} already present.`);

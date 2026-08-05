// local-pulse-app/scripts/patch-i18n-call.cjs

/**
 * Adds the `call.*` namespace to every supported locale.
 *
 * Idempotent: existing keys are left untouched unless --force is passed.
 * Norwegian is the authoritative source; the other locales are translations
 * of it.
 *
 *   node scripts/patch-i18n-call.cjs
 *   node scripts/patch-i18n-call.cjs --force   # overwrite existing call.* keys
 *   node scripts/patch-i18n-call.cjs --dry     # report only, write nothing
 */

const fs = require('fs');
const path = require('path');

// Adjust if the locale files live elsewhere in local-pulse-app.
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const NAMESPACE = 'call';

const LOCALES = [
  'no', 'en', 'nl', 'fr', 'de', 'it',
  'sv', 'da', 'fi', 'es', 'pl', 'pt',
];

const TRANSLATIONS = {
  no: {
    videoCall: 'Videosamtale',
    audioCall: 'Lydsamtale',
    calling: 'Ringer …',
    connecting: 'Kobler til …',
    reconnecting: 'Kobler til på nytt …',
    incomingVideoCall: 'Innkommende videosamtale',
    incomingAudioCall: 'Innkommende lydsamtale',
    accept: 'Svar',
    decline: 'Avvis',
    cancel: 'Avbryt',
    endCall: 'Avslutt',
    mute: 'Slå av mikrofon',
    unmute: 'Slå på mikrofon',
    cameraOn: 'Slå på kamera',
    cameraOff: 'Slå av kamera',
    switchCamera: 'Bytt kamera',
    callEnded: 'Samtalen er avsluttet',
    callDeclined: 'Samtalen ble avvist',
    callMissed: 'Tapt anrop',
    callCancelled: 'Samtalen ble avbrutt',
    callFailed: 'Kunne ikke koble til samtalen',
    busy: 'Opptatt',
    noAnswer: 'Ingen svar',
    unknownUser: 'Ukjent bruker',
    permissionTitle: 'Trenger tilgang til kamera og mikrofon',
    permissionBody: 'Gi Qup Pulse tilgang til kamera og mikrofon for å kunne ringe.',
    permissionOpenSettings: 'Åpne innstillinger',
    reportCall: 'Rapporter samtale',
    outgoing: 'Utgående',
    incoming: 'Innkommende',
    missed: 'Tapt',
    groupNotSupported: 'Samtaler er kun tilgjengelig i én-til-én-samtaler.',
    noConnection: 'Ingen tilkobling. Prøv igjen.',
  },
  en: {
    videoCall: 'Video call',
    audioCall: 'Voice call',
    calling: 'Calling …',
    connecting: 'Connecting …',
    reconnecting: 'Reconnecting …',
    incomingVideoCall: 'Incoming video call',
    incomingAudioCall: 'Incoming voice call',
    accept: 'Answer',
    decline: 'Decline',
    cancel: 'Cancel',
    endCall: 'End',
    mute: 'Mute',
    unmute: 'Unmute',
    cameraOn: 'Turn on camera',
    cameraOff: 'Turn off camera',
    switchCamera: 'Switch camera',
    callEnded: 'Call ended',
    callDeclined: 'Call declined',
    callMissed: 'Missed call',
    callCancelled: 'Call cancelled',
    callFailed: 'Could not connect the call',
    busy: 'Busy',
    noAnswer: 'No answer',
    unknownUser: 'Unknown user',
    permissionTitle: 'Camera and microphone access needed',
    permissionBody: 'Allow Qup Pulse to use your camera and microphone to make calls.',
    permissionOpenSettings: 'Open settings',
    reportCall: 'Report call',
    outgoing: 'Outgoing',
    incoming: 'Incoming',
    missed: 'Missed',
    groupNotSupported: 'Calls are only available in one-to-one conversations.',
    noConnection: 'No connection. Please try again.',
  },
  nl: {
    videoCall: 'Videogesprek',
    audioCall: 'Spraakoproep',
    calling: 'Bellen …',
    connecting: 'Verbinden …',
    reconnecting: 'Opnieuw verbinden …',
    incomingVideoCall: 'Inkomend videogesprek',
    incomingAudioCall: 'Inkomende spraakoproep',
    accept: 'Opnemen',
    decline: 'Weigeren',
    cancel: 'Annuleren',
    endCall: 'Beëindigen',
    mute: 'Microfoon uit',
    unmute: 'Microfoon aan',
    cameraOn: 'Camera aan',
    cameraOff: 'Camera uit',
    switchCamera: 'Camera wisselen',
    callEnded: 'Gesprek beëindigd',
    callDeclined: 'Oproep geweigerd',
    callMissed: 'Gemiste oproep',
    callCancelled: 'Oproep geannuleerd',
    callFailed: 'Kan de oproep niet tot stand brengen',
    busy: 'Bezet',
    noAnswer: 'Geen antwoord',
    unknownUser: 'Onbekende gebruiker',
    permissionTitle: 'Toegang tot camera en microfoon nodig',
    permissionBody: 'Geef Qup Pulse toegang tot je camera en microfoon om te kunnen bellen.',
    permissionOpenSettings: 'Instellingen openen',
    reportCall: 'Gesprek melden',
    outgoing: 'Uitgaand',
    incoming: 'Inkomend',
    missed: 'Gemist',
    groupNotSupported: 'Bellen is alleen beschikbaar in één-op-één-gesprekken.',
    noConnection: 'Geen verbinding. Probeer het opnieuw.',
  },
  fr: {
    videoCall: 'Appel vidéo',
    audioCall: 'Appel audio',
    calling: 'Appel en cours …',
    connecting: 'Connexion …',
    reconnecting: 'Reconnexion …',
    incomingVideoCall: 'Appel vidéo entrant',
    incomingAudioCall: 'Appel audio entrant',
    accept: 'Répondre',
    decline: 'Refuser',
    cancel: 'Annuler',
    endCall: 'Raccrocher',
    mute: 'Couper le micro',
    unmute: 'Activer le micro',
    cameraOn: 'Activer la caméra',
    cameraOff: 'Désactiver la caméra',
    switchCamera: 'Changer de caméra',
    callEnded: 'Appel terminé',
    callDeclined: 'Appel refusé',
    callMissed: 'Appel manqué',
    callCancelled: 'Appel annulé',
    callFailed: "Impossible d'établir l'appel",
    busy: 'Occupé',
    noAnswer: 'Pas de réponse',
    unknownUser: 'Utilisateur inconnu',
    permissionTitle: 'Accès à la caméra et au micro requis',
    permissionBody: 'Autorisez Qup Pulse à utiliser votre caméra et votre micro pour passer des appels.',
    permissionOpenSettings: 'Ouvrir les réglages',
    reportCall: "Signaler l'appel",
    outgoing: 'Sortant',
    incoming: 'Entrant',
    missed: 'Manqué',
    groupNotSupported: 'Les appels sont disponibles uniquement dans les conversations en tête-à-tête.',
    noConnection: 'Aucune connexion. Veuillez réessayer.',
  },
  de: {
    videoCall: 'Videoanruf',
    audioCall: 'Sprachanruf',
    calling: 'Wird angerufen …',
    connecting: 'Verbindung wird hergestellt …',
    reconnecting: 'Verbindung wird wiederhergestellt …',
    incomingVideoCall: 'Eingehender Videoanruf',
    incomingAudioCall: 'Eingehender Sprachanruf',
    accept: 'Annehmen',
    decline: 'Ablehnen',
    cancel: 'Abbrechen',
    endCall: 'Beenden',
    mute: 'Stummschalten',
    unmute: 'Stummschaltung aufheben',
    cameraOn: 'Kamera einschalten',
    cameraOff: 'Kamera ausschalten',
    switchCamera: 'Kamera wechseln',
    callEnded: 'Anruf beendet',
    callDeclined: 'Anruf abgelehnt',
    callMissed: 'Verpasster Anruf',
    callCancelled: 'Anruf abgebrochen',
    callFailed: 'Anruf konnte nicht verbunden werden',
    busy: 'Besetzt',
    noAnswer: 'Keine Antwort',
    unknownUser: 'Unbekannter Benutzer',
    permissionTitle: 'Zugriff auf Kamera und Mikrofon erforderlich',
    permissionBody: 'Erlaube Qup Pulse den Zugriff auf Kamera und Mikrofon, um anrufen zu können.',
    permissionOpenSettings: 'Einstellungen öffnen',
    reportCall: 'Anruf melden',
    outgoing: 'Ausgehend',
    incoming: 'Eingehend',
    missed: 'Verpasst',
    groupNotSupported: 'Anrufe sind nur in Einzelunterhaltungen verfügbar.',
    noConnection: 'Keine Verbindung. Bitte erneut versuchen.',
  },
  it: {
    videoCall: 'Videochiamata',
    audioCall: 'Chiamata vocale',
    calling: 'Chiamata in corso …',
    connecting: 'Connessione …',
    reconnecting: 'Riconnessione …',
    incomingVideoCall: 'Videochiamata in arrivo',
    incomingAudioCall: 'Chiamata vocale in arrivo',
    accept: 'Rispondi',
    decline: 'Rifiuta',
    cancel: 'Annulla',
    endCall: 'Termina',
    mute: 'Disattiva microfono',
    unmute: 'Attiva microfono',
    cameraOn: 'Attiva fotocamera',
    cameraOff: 'Disattiva fotocamera',
    switchCamera: 'Cambia fotocamera',
    callEnded: 'Chiamata terminata',
    callDeclined: 'Chiamata rifiutata',
    callMissed: 'Chiamata persa',
    callCancelled: 'Chiamata annullata',
    callFailed: 'Impossibile stabilire la chiamata',
    busy: 'Occupato',
    noAnswer: 'Nessuna risposta',
    unknownUser: 'Utente sconosciuto',
    permissionTitle: "Serve l'accesso a fotocamera e microfono",
    permissionBody: 'Consenti a Qup Pulse di usare fotocamera e microfono per effettuare chiamate.',
    permissionOpenSettings: 'Apri impostazioni',
    reportCall: 'Segnala chiamata',
    outgoing: 'In uscita',
    incoming: 'In arrivo',
    missed: 'Persa',
    groupNotSupported: 'Le chiamate sono disponibili solo nelle conversazioni uno a uno.',
    noConnection: 'Nessuna connessione. Riprova.',
  },
  sv: {
    videoCall: 'Videosamtal',
    audioCall: 'Röstsamtal',
    calling: 'Ringer …',
    connecting: 'Ansluter …',
    reconnecting: 'Återansluter …',
    incomingVideoCall: 'Inkommande videosamtal',
    incomingAudioCall: 'Inkommande röstsamtal',
    accept: 'Svara',
    decline: 'Avvisa',
    cancel: 'Avbryt',
    endCall: 'Avsluta',
    mute: 'Stäng av mikrofonen',
    unmute: 'Slå på mikrofonen',
    cameraOn: 'Slå på kameran',
    cameraOff: 'Stäng av kameran',
    switchCamera: 'Byt kamera',
    callEnded: 'Samtalet avslutat',
    callDeclined: 'Samtalet avvisades',
    callMissed: 'Missat samtal',
    callCancelled: 'Samtalet avbröts',
    callFailed: 'Det gick inte att koppla samtalet',
    busy: 'Upptaget',
    noAnswer: 'Inget svar',
    unknownUser: 'Okänd användare',
    permissionTitle: 'Åtkomst till kamera och mikrofon krävs',
    permissionBody: 'Ge Qup Pulse åtkomst till kameran och mikrofonen för att kunna ringa.',
    permissionOpenSettings: 'Öppna inställningar',
    reportCall: 'Rapportera samtal',
    outgoing: 'Utgående',
    incoming: 'Inkommande',
    missed: 'Missat',
    groupNotSupported: 'Samtal är endast tillgängliga i konversationer mellan två personer.',
    noConnection: 'Ingen anslutning. Försök igen.',
  },
  da: {
    videoCall: 'Videoopkald',
    audioCall: 'Taleopkald',
    calling: 'Ringer op …',
    connecting: 'Opretter forbindelse …',
    reconnecting: 'Genopretter forbindelse …',
    incomingVideoCall: 'Indgående videoopkald',
    incomingAudioCall: 'Indgående taleopkald',
    accept: 'Besvar',
    decline: 'Afvis',
    cancel: 'Annuller',
    endCall: 'Afslut',
    mute: 'Slå mikrofonen fra',
    unmute: 'Slå mikrofonen til',
    cameraOn: 'Slå kameraet til',
    cameraOff: 'Slå kameraet fra',
    switchCamera: 'Skift kamera',
    callEnded: 'Opkaldet er afsluttet',
    callDeclined: 'Opkaldet blev afvist',
    callMissed: 'Ubesvaret opkald',
    callCancelled: 'Opkaldet blev annulleret',
    callFailed: 'Kunne ikke oprette forbindelse til opkaldet',
    busy: 'Optaget',
    noAnswer: 'Intet svar',
    unknownUser: 'Ukendt bruger',
    permissionTitle: 'Adgang til kamera og mikrofon er påkrævet',
    permissionBody: 'Giv Qup Pulse adgang til kamera og mikrofon for at kunne ringe.',
    permissionOpenSettings: 'Åbn indstillinger',
    reportCall: 'Rapportér opkald',
    outgoing: 'Udgående',
    incoming: 'Indgående',
    missed: 'Ubesvaret',
    groupNotSupported: 'Opkald er kun tilgængelige i én-til-én-samtaler.',
    noConnection: 'Ingen forbindelse. Prøv igen.',
  },
  fi: {
    videoCall: 'Videopuhelu',
    audioCall: 'Äänipuhelu',
    calling: 'Soitetaan …',
    connecting: 'Yhdistetään …',
    reconnecting: 'Yhdistetään uudelleen …',
    incomingVideoCall: 'Saapuva videopuhelu',
    incomingAudioCall: 'Saapuva äänipuhelu',
    accept: 'Vastaa',
    decline: 'Hylkää',
    cancel: 'Peruuta',
    endCall: 'Lopeta',
    mute: 'Mykistä',
    unmute: 'Poista mykistys',
    cameraOn: 'Ota kamera käyttöön',
    cameraOff: 'Poista kamera käytöstä',
    switchCamera: 'Vaihda kameraa',
    callEnded: 'Puhelu päättyi',
    callDeclined: 'Puhelu hylättiin',
    callMissed: 'Vastaamaton puhelu',
    callCancelled: 'Puhelu peruutettiin',
    callFailed: 'Puhelua ei voitu yhdistää',
    busy: 'Varattu',
    noAnswer: 'Ei vastausta',
    unknownUser: 'Tuntematon käyttäjä',
    permissionTitle: 'Kameran ja mikrofonin käyttöoikeus tarvitaan',
    permissionBody: 'Anna Qup Pulsille oikeus käyttää kameraa ja mikrofonia puheluita varten.',
    permissionOpenSettings: 'Avaa asetukset',
    reportCall: 'Ilmoita puhelusta',
    outgoing: 'Lähtevä',
    incoming: 'Saapuva',
    missed: 'Vastaamaton',
    groupNotSupported: 'Puhelut ovat käytettävissä vain kahdenkeskisissä keskusteluissa.',
    noConnection: 'Ei yhteyttä. Yritä uudelleen.',
  },
  es: {
    videoCall: 'Videollamada',
    audioCall: 'Llamada de voz',
    calling: 'Llamando …',
    connecting: 'Conectando …',
    reconnecting: 'Reconectando …',
    incomingVideoCall: 'Videollamada entrante',
    incomingAudioCall: 'Llamada de voz entrante',
    accept: 'Responder',
    decline: 'Rechazar',
    cancel: 'Cancelar',
    endCall: 'Colgar',
    mute: 'Silenciar',
    unmute: 'Activar micrófono',
    cameraOn: 'Activar cámara',
    cameraOff: 'Desactivar cámara',
    switchCamera: 'Cambiar cámara',
    callEnded: 'Llamada finalizada',
    callDeclined: 'Llamada rechazada',
    callMissed: 'Llamada perdida',
    callCancelled: 'Llamada cancelada',
    callFailed: 'No se pudo establecer la llamada',
    busy: 'Ocupado',
    noAnswer: 'Sin respuesta',
    unknownUser: 'Usuario desconocido',
    permissionTitle: 'Se necesita acceso a la cámara y al micrófono',
    permissionBody: 'Permite que Qup Pulse use la cámara y el micrófono para hacer llamadas.',
    permissionOpenSettings: 'Abrir ajustes',
    reportCall: 'Denunciar llamada',
    outgoing: 'Saliente',
    incoming: 'Entrante',
    missed: 'Perdida',
    groupNotSupported: 'Las llamadas solo están disponibles en conversaciones individuales.',
    noConnection: 'Sin conexión. Inténtalo de nuevo.',
  },
  pl: {
    videoCall: 'Połączenie wideo',
    audioCall: 'Połączenie głosowe',
    calling: 'Dzwonienie …',
    connecting: 'Łączenie …',
    reconnecting: 'Ponowne łączenie …',
    incomingVideoCall: 'Przychodzące połączenie wideo',
    incomingAudioCall: 'Przychodzące połączenie głosowe',
    accept: 'Odbierz',
    decline: 'Odrzuć',
    cancel: 'Anuluj',
    endCall: 'Zakończ',
    mute: 'Wycisz mikrofon',
    unmute: 'Włącz mikrofon',
    cameraOn: 'Włącz kamerę',
    cameraOff: 'Wyłącz kamerę',
    switchCamera: 'Przełącz kamerę',
    callEnded: 'Połączenie zakończone',
    callDeclined: 'Połączenie odrzucone',
    callMissed: 'Nieodebrane połączenie',
    callCancelled: 'Połączenie anulowane',
    callFailed: 'Nie udało się nawiązać połączenia',
    busy: 'Zajęte',
    noAnswer: 'Brak odpowiedzi',
    unknownUser: 'Nieznany użytkownik',
    permissionTitle: 'Wymagany dostęp do kamery i mikrofonu',
    permissionBody: 'Zezwól aplikacji Qup Pulse na dostęp do kamery i mikrofonu, aby dzwonić.',
    permissionOpenSettings: 'Otwórz ustawienia',
    reportCall: 'Zgłoś połączenie',
    outgoing: 'Wychodzące',
    incoming: 'Przychodzące',
    missed: 'Nieodebrane',
    groupNotSupported: 'Połączenia są dostępne tylko w rozmowach jeden na jeden.',
    noConnection: 'Brak połączenia. Spróbuj ponownie.',
  },
  pt: {
    videoCall: 'Videochamada',
    audioCall: 'Chamada de voz',
    calling: 'A chamar …',
    connecting: 'A ligar …',
    reconnecting: 'A ligar novamente …',
    incomingVideoCall: 'Videochamada recebida',
    incomingAudioCall: 'Chamada de voz recebida',
    accept: 'Atender',
    decline: 'Recusar',
    cancel: 'Cancelar',
    endCall: 'Terminar',
    mute: 'Desativar microfone',
    unmute: 'Ativar microfone',
    cameraOn: 'Ativar câmara',
    cameraOff: 'Desativar câmara',
    switchCamera: 'Mudar de câmara',
    callEnded: 'Chamada terminada',
    callDeclined: 'Chamada recusada',
    callMissed: 'Chamada perdida',
    callCancelled: 'Chamada cancelada',
    callFailed: 'Não foi possível estabelecer a chamada',
    busy: 'Ocupado',
    noAnswer: 'Sem resposta',
    unknownUser: 'Utilizador desconhecido',
    permissionTitle: 'É necessário acesso à câmara e ao microfone',
    permissionBody: 'Permite que o Qup Pulse use a câmara e o microfone para fazer chamadas.',
    permissionOpenSettings: 'Abrir definições',
    reportCall: 'Denunciar chamada',
    outgoing: 'Efetuada',
    incoming: 'Recebida',
    missed: 'Perdida',
    groupNotSupported: 'As chamadas só estão disponíveis em conversas individuais.',
    noConnection: 'Sem ligação. Tenta novamente.',
  },
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry');

function readLocale(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse ${filePath}: ${error.message}`);
  }
}

function run() {
  if (!fs.existsSync(LOCALES_DIR)) {
    // eslint-disable-next-line no-console
    console.error(`Locales directory not found: ${LOCALES_DIR}`);
    process.exit(1);
  }

  // Guard against a partial patch: verify every locale has every key before
  // touching a single file.
  const referenceKeys = Object.keys(TRANSLATIONS.no).sort();
  const incomplete = LOCALES.filter((locale) => {
    const keys = Object.keys(TRANSLATIONS[locale] || {}).sort();
    return keys.join('|') !== referenceKeys.join('|');
  });

  if (incomplete.length) {
    // eslint-disable-next-line no-console
    console.error(
      `Refusing to run: these locales do not match the Norwegian key set: ${incomplete.join(', ')}`
    );
    process.exit(1);
  }

  let touched = 0;

  LOCALES.forEach((locale) => {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    const existing = readLocale(filePath);

    if (existing === null) {
      // eslint-disable-next-line no-console
      console.warn(`  ${locale}: file missing, skipped (${filePath})`);
      return;
    }

    const current = existing[NAMESPACE] || {};
    const incoming = TRANSLATIONS[locale];

    const added = [];
    const overwritten = [];

    Object.entries(incoming).forEach(([key, value]) => {
      if (!(key in current)) {
        current[key] = value;
        added.push(key);
      } else if (force && current[key] !== value) {
        current[key] = value;
        overwritten.push(key);
      }
    });

    if (!added.length && !overwritten.length) {
      // eslint-disable-next-line no-console
      console.log(`  ${locale}: already up to date`);
      return;
    }

    existing[NAMESPACE] = current;

    if (!dryRun) {
      fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
    }

    touched += 1;

    // eslint-disable-next-line no-console
    console.log(
      `  ${locale}: +${added.length} added` +
        (overwritten.length ? `, ${overwritten.length} overwritten` : '') +
        (dryRun ? ' (dry run)' : '')
    );
  });

  // eslint-disable-next-line no-console
  console.log(
    `\n${dryRun ? 'Would update' : 'Updated'} ${touched} of ${LOCALES.length} locale files.`
  );
}

run();

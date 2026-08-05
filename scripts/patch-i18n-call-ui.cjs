// local-pulse-app/scripts/patch-i18n-call-ui.cjs

/**
 * Adds the call UI strings (history, eligibility, reporting) to the existing
 * `call.*` namespace in every supported locale.
 *
 * Run after patch-i18n-call.cjs. Idempotent; existing keys are left alone
 * unless --force is passed.
 *
 *   node scripts/patch-i18n-call-ui.cjs
 *   node scripts/patch-i18n-call-ui.cjs --force
 *   node scripts/patch-i18n-call-ui.cjs --dry
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const NAMESPACE = 'call';

const LOCALES = [
  'no', 'en', 'nl', 'fr', 'de', 'it',
  'sv', 'da', 'fi', 'es', 'pl', 'pt',
];

const TRANSLATIONS = {
  no: {
    historyTitle: 'Samtalelogg',
    historyEmpty: 'Ingen samtaler ennå',
    callAgain: 'Ring igjen',
    startVideoCall: 'Start videosamtale',
    notEligible: 'Dere må ha utvekslet meldinger før dere kan ringe.',
    reportTitle: 'Rapporter samtale',
    reportSubtitle: 'Hva skjedde i denne samtalen?',
    reportReasonHarassment: 'Trakassering eller mobbing',
    reportReasonNudity: 'Nakenhet eller seksuelt innhold',
    reportReasonMinorSafety: 'Fare for barn',
    reportReasonHateSpeech: 'Hatefulle ytringer',
    reportReasonSpam: 'Spam eller svindel',
    reportReasonOther: 'Annet',
    reportDetailsPlaceholder: 'Legg til flere detaljer (valgfritt)',
    reportSubmit: 'Send rapport',
    reportSubmitting: 'Sender …',
    reportThanks: 'Takk. Rapporten er sendt til moderatorene våre.',
    reportFailed: 'Kunne ikke sende rapporten. Prøv igjen.',
  },
  en: {
    historyTitle: 'Call history',
    historyEmpty: 'No calls yet',
    callAgain: 'Call again',
    startVideoCall: 'Start video call',
    notEligible: 'You need to exchange messages before you can call.',
    reportTitle: 'Report call',
    reportSubtitle: 'What happened during this call?',
    reportReasonHarassment: 'Harassment or bullying',
    reportReasonNudity: 'Nudity or sexual content',
    reportReasonMinorSafety: 'Child safety concern',
    reportReasonHateSpeech: 'Hate speech',
    reportReasonSpam: 'Spam or scam',
    reportReasonOther: 'Something else',
    reportDetailsPlaceholder: 'Add more details (optional)',
    reportSubmit: 'Send report',
    reportSubmitting: 'Sending …',
    reportThanks: 'Thank you. Your report has been sent to our moderators.',
    reportFailed: 'Could not send the report. Please try again.',
  },
  nl: {
    historyTitle: 'Oproepgeschiedenis',
    historyEmpty: 'Nog geen oproepen',
    callAgain: 'Opnieuw bellen',
    startVideoCall: 'Videogesprek starten',
    notEligible: 'Jullie moeten eerst berichten uitwisselen voordat je kunt bellen.',
    reportTitle: 'Gesprek melden',
    reportSubtitle: 'Wat is er tijdens dit gesprek gebeurd?',
    reportReasonHarassment: 'Intimidatie of pesten',
    reportReasonNudity: 'Naaktheid of seksuele inhoud',
    reportReasonMinorSafety: 'Zorgen om kindveiligheid',
    reportReasonHateSpeech: 'Haatzaaiende taal',
    reportReasonSpam: 'Spam of oplichting',
    reportReasonOther: 'Iets anders',
    reportDetailsPlaceholder: 'Voeg meer details toe (optioneel)',
    reportSubmit: 'Melding versturen',
    reportSubmitting: 'Versturen …',
    reportThanks: 'Bedankt. Je melding is naar onze moderators gestuurd.',
    reportFailed: 'Kan de melding niet versturen. Probeer het opnieuw.',
  },
  fr: {
    historyTitle: 'Historique des appels',
    historyEmpty: 'Aucun appel pour le moment',
    callAgain: 'Rappeler',
    startVideoCall: 'Démarrer un appel vidéo',
    notEligible: 'Vous devez avoir échangé des messages avant de pouvoir appeler.',
    reportTitle: "Signaler l'appel",
    reportSubtitle: "Que s'est-il passé pendant cet appel ?",
    reportReasonHarassment: 'Harcèlement ou intimidation',
    reportReasonNudity: 'Nudité ou contenu sexuel',
    reportReasonMinorSafety: "Sécurité d'un mineur",
    reportReasonHateSpeech: 'Discours haineux',
    reportReasonSpam: 'Spam ou arnaque',
    reportReasonOther: 'Autre chose',
    reportDetailsPlaceholder: 'Ajouter des précisions (facultatif)',
    reportSubmit: 'Envoyer le signalement',
    reportSubmitting: 'Envoi …',
    reportThanks: 'Merci. Votre signalement a été transmis à nos modérateurs.',
    reportFailed: "Impossible d'envoyer le signalement. Veuillez réessayer.",
  },
  de: {
    historyTitle: 'Anrufverlauf',
    historyEmpty: 'Noch keine Anrufe',
    callAgain: 'Erneut anrufen',
    startVideoCall: 'Videoanruf starten',
    notEligible: 'Ihr müsst Nachrichten ausgetauscht haben, bevor ihr anrufen könnt.',
    reportTitle: 'Anruf melden',
    reportSubtitle: 'Was ist während dieses Anrufs passiert?',
    reportReasonHarassment: 'Belästigung oder Mobbing',
    reportReasonNudity: 'Nacktheit oder sexuelle Inhalte',
    reportReasonMinorSafety: 'Gefährdung von Kindern',
    reportReasonHateSpeech: 'Hassrede',
    reportReasonSpam: 'Spam oder Betrug',
    reportReasonOther: 'Etwas anderes',
    reportDetailsPlaceholder: 'Weitere Details hinzufügen (optional)',
    reportSubmit: 'Meldung senden',
    reportSubmitting: 'Wird gesendet …',
    reportThanks: 'Danke. Deine Meldung wurde an unsere Moderatoren gesendet.',
    reportFailed: 'Meldung konnte nicht gesendet werden. Bitte erneut versuchen.',
  },
  it: {
    historyTitle: 'Cronologia chiamate',
    historyEmpty: 'Ancora nessuna chiamata',
    callAgain: 'Richiama',
    startVideoCall: 'Avvia videochiamata',
    notEligible: 'Dovete esservi scambiati dei messaggi prima di poter chiamare.',
    reportTitle: 'Segnala chiamata',
    reportSubtitle: 'Che cosa è successo durante questa chiamata?',
    reportReasonHarassment: 'Molestie o bullismo',
    reportReasonNudity: 'Nudità o contenuti sessuali',
    reportReasonMinorSafety: 'Sicurezza dei minori',
    reportReasonHateSpeech: "Incitamento all'odio",
    reportReasonSpam: 'Spam o truffa',
    reportReasonOther: 'Altro',
    reportDetailsPlaceholder: 'Aggiungi altri dettagli (facoltativo)',
    reportSubmit: 'Invia segnalazione',
    reportSubmitting: 'Invio …',
    reportThanks: 'Grazie. La tua segnalazione è stata inviata ai nostri moderatori.',
    reportFailed: 'Impossibile inviare la segnalazione. Riprova.',
  },
  sv: {
    historyTitle: 'Samtalshistorik',
    historyEmpty: 'Inga samtal ännu',
    callAgain: 'Ring igen',
    startVideoCall: 'Starta videosamtal',
    notEligible: 'Ni måste ha utbytt meddelanden innan ni kan ringa.',
    reportTitle: 'Rapportera samtal',
    reportSubtitle: 'Vad hände under det här samtalet?',
    reportReasonHarassment: 'Trakasserier eller mobbning',
    reportReasonNudity: 'Nakenhet eller sexuellt innehåll',
    reportReasonMinorSafety: 'Oro för barns säkerhet',
    reportReasonHateSpeech: 'Hatpropaganda',
    reportReasonSpam: 'Skräppost eller bedrägeri',
    reportReasonOther: 'Något annat',
    reportDetailsPlaceholder: 'Lägg till fler detaljer (valfritt)',
    reportSubmit: 'Skicka rapport',
    reportSubmitting: 'Skickar …',
    reportThanks: 'Tack. Din rapport har skickats till våra moderatorer.',
    reportFailed: 'Det gick inte att skicka rapporten. Försök igen.',
  },
  da: {
    historyTitle: 'Opkaldshistorik',
    historyEmpty: 'Ingen opkald endnu',
    callAgain: 'Ring igen',
    startVideoCall: 'Start videoopkald',
    notEligible: 'I skal have udvekslet beskeder, før I kan ringe.',
    reportTitle: 'Rapportér opkald',
    reportSubtitle: 'Hvad skete der under dette opkald?',
    reportReasonHarassment: 'Chikane eller mobning',
    reportReasonNudity: 'Nøgenhed eller seksuelt indhold',
    reportReasonMinorSafety: 'Bekymring for børns sikkerhed',
    reportReasonHateSpeech: 'Hadefuld tale',
    reportReasonSpam: 'Spam eller svindel',
    reportReasonOther: 'Noget andet',
    reportDetailsPlaceholder: 'Tilføj flere detaljer (valgfrit)',
    reportSubmit: 'Send rapport',
    reportSubmitting: 'Sender …',
    reportThanks: 'Tak. Din rapport er sendt til vores moderatorer.',
    reportFailed: 'Rapporten kunne ikke sendes. Prøv igen.',
  },
  fi: {
    historyTitle: 'Puheluhistoria',
    historyEmpty: 'Ei vielä puheluita',
    callAgain: 'Soita uudelleen',
    startVideoCall: 'Aloita videopuhelu',
    notEligible: 'Teidän on vaihdettava viestejä ennen kuin voitte soittaa.',
    reportTitle: 'Ilmoita puhelusta',
    reportSubtitle: 'Mitä tämän puhelun aikana tapahtui?',
    reportReasonHarassment: 'Häirintä tai kiusaaminen',
    reportReasonNudity: 'Alastomuus tai seksuaalinen sisältö',
    reportReasonMinorSafety: 'Huoli lapsen turvallisuudesta',
    reportReasonHateSpeech: 'Vihapuhe',
    reportReasonSpam: 'Roskaposti tai huijaus',
    reportReasonOther: 'Jokin muu',
    reportDetailsPlaceholder: 'Lisää tarkempia tietoja (valinnainen)',
    reportSubmit: 'Lähetä ilmoitus',
    reportSubmitting: 'Lähetetään …',
    reportThanks: 'Kiitos. Ilmoituksesi on lähetetty moderaattoreillemme.',
    reportFailed: 'Ilmoituksen lähettäminen epäonnistui. Yritä uudelleen.',
  },
  es: {
    historyTitle: 'Historial de llamadas',
    historyEmpty: 'Aún no hay llamadas',
    callAgain: 'Volver a llamar',
    startVideoCall: 'Iniciar videollamada',
    notEligible: 'Tenéis que haber intercambiado mensajes antes de poder llamar.',
    reportTitle: 'Denunciar llamada',
    reportSubtitle: '¿Qué ocurrió durante esta llamada?',
    reportReasonHarassment: 'Acoso o intimidación',
    reportReasonNudity: 'Desnudez o contenido sexual',
    reportReasonMinorSafety: 'Seguridad de menores',
    reportReasonHateSpeech: 'Discurso de odio',
    reportReasonSpam: 'Spam o estafa',
    reportReasonOther: 'Otra cosa',
    reportDetailsPlaceholder: 'Añade más detalles (opcional)',
    reportSubmit: 'Enviar denuncia',
    reportSubmitting: 'Enviando …',
    reportThanks: 'Gracias. Tu denuncia se ha enviado a nuestros moderadores.',
    reportFailed: 'No se pudo enviar la denuncia. Inténtalo de nuevo.',
  },
  pl: {
    historyTitle: 'Historia połączeń',
    historyEmpty: 'Brak połączeń',
    callAgain: 'Zadzwoń ponownie',
    startVideoCall: 'Rozpocznij połączenie wideo',
    notEligible: 'Musicie wymienić wiadomości, zanim będziecie mogli zadzwonić.',
    reportTitle: 'Zgłoś połączenie',
    reportSubtitle: 'Co wydarzyło się podczas tego połączenia?',
    reportReasonHarassment: 'Nękanie lub zastraszanie',
    reportReasonNudity: 'Nagość lub treści seksualne',
    reportReasonMinorSafety: 'Bezpieczeństwo dzieci',
    reportReasonHateSpeech: 'Mowa nienawiści',
    reportReasonSpam: 'Spam lub oszustwo',
    reportReasonOther: 'Coś innego',
    reportDetailsPlaceholder: 'Dodaj więcej szczegółów (opcjonalnie)',
    reportSubmit: 'Wyślij zgłoszenie',
    reportSubmitting: 'Wysyłanie …',
    reportThanks: 'Dziękujemy. Twoje zgłoszenie zostało wysłane do moderatorów.',
    reportFailed: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.',
  },
  pt: {
    historyTitle: 'Histórico de chamadas',
    historyEmpty: 'Ainda sem chamadas',
    callAgain: 'Ligar novamente',
    startVideoCall: 'Iniciar videochamada',
    notEligible: 'Têm de trocar mensagens antes de poderem ligar.',
    reportTitle: 'Denunciar chamada',
    reportSubtitle: 'O que aconteceu durante esta chamada?',
    reportReasonHarassment: 'Assédio ou bullying',
    reportReasonNudity: 'Nudez ou conteúdo sexual',
    reportReasonMinorSafety: 'Segurança de menores',
    reportReasonHateSpeech: 'Discurso de ódio',
    reportReasonSpam: 'Spam ou burla',
    reportReasonOther: 'Outra coisa',
    reportDetailsPlaceholder: 'Adiciona mais detalhes (opcional)',
    reportSubmit: 'Enviar denúncia',
    reportSubmitting: 'A enviar …',
    reportThanks: 'Obrigado. A tua denúncia foi enviada aos nossos moderadores.',
    reportFailed: 'Não foi possível enviar a denúncia. Tenta novamente.',
  },
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry');

function readLocale(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

  // Fail before writing anything if any locale is missing a key — a partial
  // translation patch is worse than none.
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

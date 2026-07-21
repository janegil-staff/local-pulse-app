// local-pulse-app/scripts/patch-i18n-chat-pending.cjs
//
// Adds the chat pending-gate toast strings to all 12 locale JSON files.
// Overwrites these specific keys so re-running updates the wording; other keys
// are untouched. Run from local-pulse-app root:
//   node scripts/patch-i18n-chat-pending.cjs
//
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');

// Toast title (short) shown on the first line, and the explanation on the
// second. PENDING_LIMIT = initiator hit the one-opener cap. PENDING_RECIPIENT =
// recipient tried to reply before accepting. chatSendFailed = generic fallback.
const KEYS = {
  chatPendingTitle: {
    no: 'Melding ikke sendt',
    en: 'Message not sent',
    nl: 'Bericht niet verzonden',
    fr: 'Message non envoyé',
    de: 'Nachricht nicht gesendet',
    it: 'Messaggio non inviato',
    sv: 'Meddelandet skickades inte',
    da: 'Beskeden blev ikke sendt',
    fi: 'Viestiä ei lähetetty',
    es: 'Mensaje no enviado',
    pl: 'Wiadomość nie wysłana',
    pt: 'Mensagem não enviada',
  },
  chatPendingLimit: {
    no: 'Du har sendt din første melding. Du kan ikke sende flere før den andre personen godtar forespørselen din.',
    en: 'You’ve sent your first message. You can’t send more until the other person accepts your request.',
    nl: 'Je hebt je eerste bericht verstuurd. Je kunt pas meer sturen als de ander je verzoek accepteert.',
    fr: 'Vous avez envoyé votre premier message. Vous ne pourrez en envoyer d’autres qu’une fois votre demande acceptée.',
    de: 'Du hast deine erste Nachricht gesendet. Weitere kannst du erst senden, wenn die andere Person deine Anfrage annimmt.',
    it: 'Hai inviato il tuo primo messaggio. Non puoi inviarne altri finché l’altra persona non accetta la tua richiesta.',
    sv: 'Du har skickat ditt första meddelande. Du kan inte skicka fler förrän den andra personen godkänner din förfrågan.',
    da: 'Du har sendt din første besked. Du kan ikke sende flere, før den anden person accepterer din anmodning.',
    fi: 'Lähetit ensimmäisen viestisi. Et voi lähettää lisää, ennen kuin toinen hyväksyy pyyntösi.',
    es: 'Has enviado tu primer mensaje. No puedes enviar más hasta que la otra persona acepte tu solicitud.',
    pl: 'Wysłałeś pierwszą wiadomość. Nie możesz wysłać kolejnych, dopóki druga osoba nie zaakceptuje prośby.',
    pt: 'Enviaste a tua primeira mensagem. Não podes enviar mais até a outra pessoa aceitar o teu pedido.',
  },
  chatPendingRecipient: {
    no: 'Godta forespørselen før du svarer.',
    en: 'Accept the request before replying.',
    nl: 'Accepteer het verzoek voordat je antwoordt.',
    fr: 'Acceptez la demande avant de répondre.',
    de: 'Nimm die Anfrage an, bevor du antwortest.',
    it: 'Accetta la richiesta prima di rispondere.',
    sv: 'Acceptera förfrågan innan du svarar.',
    da: 'Accepter anmodningen, før du svarer.',
    fi: 'Hyväksy pyyntö ennen vastaamista.',
    es: 'Acepta la solicitud antes de responder.',
    pl: 'Zaakceptuj prośbę przed odpowiedzią.',
    pt: 'Aceita o pedido antes de responder.',
  },
  chatSendFailed: {
    no: 'Kunne ikke sende meldingen.',
    en: 'Could not send the message.',
    nl: 'Kon het bericht niet verzenden.',
    fr: 'Impossible d’envoyer le message.',
    de: 'Nachricht konnte nicht gesendet werden.',
    it: 'Impossibile inviare il messaggio.',
    sv: 'Kunde inte skicka meddelandet.',
    da: 'Kunne ikke sende beskeden.',
    fi: 'Viestin lähetys epäonnistui.',
    es: 'No se pudo enviar el mensaje.',
    pl: 'Nie udało się wysłać wiadomości.',
    pt: 'Não foi possível enviar a mensagem.',
  },
};

const LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];
let changed = 0;

for (const locale of LANGS) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  skip: ${locale}.json not found`);
    continue;
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of Object.keys(KEYS)) {
    json[key] = KEYS[key][locale]; // overwrite so re-running refreshes wording
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`  patched: ${locale}.json`);
  changed++;
}

console.log(`\nDone. ${changed} file(s) updated.`);

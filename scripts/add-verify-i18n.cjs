// localpulse/app/scripts/add-myprofile-i18n.cjs
//
// Adds every user-facing string in MyProfileScreen to all 12 language objects
// in src/i18n/translations.js, and REPLACES verifyBody, which was written with
// a {{email}} placeholder that LangContext's t() does not interpolate.
//
//   node scripts/add-myprofile-i18n.cjs
//
// Idempotent for additions (existing keys are skipped). verifyBody is
// overwritten unconditionally — re-running is safe.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');

// Overwritten, not skipped: the old value holds an uninterpolated {{email}}.
const OVERWRITE = new Set(['verifyBody']);

const STRINGS = {
  no: {
    verifyBody: 'Vi sendte deg en bekreftelseslenke. Sjekk innboksen din.',
    myProfileTitle: 'Min profil', photosLabel: 'Bilder', mainPhoto: 'Hoved',
    photoHint: 'Trykk på et bilde for å gjøre det til hovedbildet',
    bioLabel: 'Om meg', bioPlaceholder: 'Fortell litt om deg selv…',
    edit: 'Rediger', save: 'Lagre', cancel: 'Avbryt', logout: 'Logg ut',
    logoutConfirmTitle: 'Logge ut?', logoutConfirmBody: 'Du trenger e-post og PIN for å logge inn igjen.',
    removePhotoTitle: 'Fjerne bildet?', removePhotoBody: 'Bildet fjernes fra profilen din.', remove: 'Fjern',
    permissionTitle: 'Tilgang kreves', permissionBody: 'Gi tilgang til bilder i Innstillinger.',
    uploadFailed: 'Opplasting mislyktes', couldntSave: 'Kunne ikke lagre', couldntRemove: 'Kunne ikke fjerne',
    couldntSend: 'Kunne ikke sende', tryAgain: 'Prøv igjen.', somethingWrong: 'Noe gikk galt. Prøv igjen.',
    alreadyConfirmed: 'E-postadressen din er allerede bekreftet.', confirmationSent: 'Bekreftelse sendt. Sjekk innboksen.',
  },
  en: {
    verifyBody: 'We sent you a confirmation link. Check your inbox.',
    myProfileTitle: 'My Profile', photosLabel: 'Photos', mainPhoto: 'Main',
    photoHint: 'Tap a photo to make it your main picture',
    bioLabel: 'Bio', bioPlaceholder: 'Tell people a bit about yourself…',
    edit: 'Edit', save: 'Save', cancel: 'Cancel', logout: 'Log out',
    logoutConfirmTitle: 'Log out?', logoutConfirmBody: 'You’ll need your email and PIN to sign back in.',
    removePhotoTitle: 'Remove photo?', removePhotoBody: 'This photo will be removed from your profile.', remove: 'Remove',
    permissionTitle: 'Permission needed', permissionBody: 'Allow photo access in Settings to add a picture.',
    uploadFailed: 'Upload failed', couldntSave: 'Couldn’t save', couldntRemove: 'Couldn’t remove',
    couldntSend: 'Couldn’t send', tryAgain: 'Try again.', somethingWrong: 'Something went wrong. Try again.',
    alreadyConfirmed: 'Your email is already confirmed.', confirmationSent: 'Confirmation email sent. Check your inbox.',
  },
  nl: {
    verifyBody: 'We hebben je een bevestigingslink gestuurd. Controleer je inbox.',
    myProfileTitle: 'Mijn profiel', photosLabel: 'Foto’s', mainPhoto: 'Hoofd',
    photoHint: 'Tik op een foto om deze als hoofdfoto in te stellen',
    bioLabel: 'Over mij', bioPlaceholder: 'Vertel iets over jezelf…',
    edit: 'Bewerken', save: 'Opslaan', cancel: 'Annuleren', logout: 'Uitloggen',
    logoutConfirmTitle: 'Uitloggen?', logoutConfirmBody: 'Je hebt je e-mail en pincode nodig om weer in te loggen.',
    removePhotoTitle: 'Foto verwijderen?', removePhotoBody: 'Deze foto wordt van je profiel verwijderd.', remove: 'Verwijderen',
    permissionTitle: 'Toestemming nodig', permissionBody: 'Sta fototoegang toe in Instellingen.',
    uploadFailed: 'Uploaden mislukt', couldntSave: 'Kan niet opslaan', couldntRemove: 'Kan niet verwijderen',
    couldntSend: 'Kan niet verzenden', tryAgain: 'Probeer opnieuw.', somethingWrong: 'Er ging iets mis. Probeer opnieuw.',
    alreadyConfirmed: 'Je e-mailadres is al bevestigd.', confirmationSent: 'Bevestigingsmail verzonden. Controleer je inbox.',
  },
  fr: {
    verifyBody: 'Nous vous avons envoyé un lien de confirmation. Vérifiez votre boîte de réception.',
    myProfileTitle: 'Mon profil', photosLabel: 'Photos', mainPhoto: 'Principale',
    photoHint: 'Touchez une photo pour en faire votre photo principale',
    bioLabel: 'À propos', bioPlaceholder: 'Parlez un peu de vous…',
    edit: 'Modifier', save: 'Enregistrer', cancel: 'Annuler', logout: 'Déconnexion',
    logoutConfirmTitle: 'Se déconnecter ?', logoutConfirmBody: 'Vous aurez besoin de votre e-mail et de votre code PIN pour vous reconnecter.',
    removePhotoTitle: 'Supprimer la photo ?', removePhotoBody: 'Cette photo sera retirée de votre profil.', remove: 'Supprimer',
    permissionTitle: 'Autorisation requise', permissionBody: 'Autorisez l’accès aux photos dans les Réglages.',
    uploadFailed: 'Échec de l’envoi', couldntSave: 'Enregistrement impossible', couldntRemove: 'Suppression impossible',
    couldntSend: 'Envoi impossible', tryAgain: 'Réessayez.', somethingWrong: 'Une erreur est survenue. Réessayez.',
    alreadyConfirmed: 'Votre e-mail est déjà confirmé.', confirmationSent: 'E-mail de confirmation envoyé. Vérifiez votre boîte de réception.',
  },
  de: {
    verifyBody: 'Wir haben dir einen Bestätigungslink gesendet. Sieh in deinem Posteingang nach.',
    myProfileTitle: 'Mein Profil', photosLabel: 'Fotos', mainPhoto: 'Haupt',
    photoHint: 'Tippe auf ein Foto, um es als Hauptbild festzulegen',
    bioLabel: 'Über mich', bioPlaceholder: 'Erzähl etwas über dich…',
    edit: 'Bearbeiten', save: 'Speichern', cancel: 'Abbrechen', logout: 'Abmelden',
    logoutConfirmTitle: 'Abmelden?', logoutConfirmBody: 'Du brauchst deine E-Mail und PIN, um dich wieder anzumelden.',
    removePhotoTitle: 'Foto entfernen?', removePhotoBody: 'Dieses Foto wird von deinem Profil entfernt.', remove: 'Entfernen',
    permissionTitle: 'Berechtigung erforderlich', permissionBody: 'Erlaube den Fotozugriff in den Einstellungen.',
    uploadFailed: 'Upload fehlgeschlagen', couldntSave: 'Speichern fehlgeschlagen', couldntRemove: 'Entfernen fehlgeschlagen',
    couldntSend: 'Senden fehlgeschlagen', tryAgain: 'Versuche es erneut.', somethingWrong: 'Etwas ist schiefgelaufen. Versuche es erneut.',
    alreadyConfirmed: 'Deine E-Mail-Adresse ist bereits bestätigt.', confirmationSent: 'Bestätigungs-E-Mail gesendet. Sieh in deinem Posteingang nach.',
  },
  it: {
    verifyBody: 'Ti abbiamo inviato un link di conferma. Controlla la tua casella di posta.',
    myProfileTitle: 'Il mio profilo', photosLabel: 'Foto', mainPhoto: 'Principale',
    photoHint: 'Tocca una foto per renderla la tua immagine principale',
    bioLabel: 'Su di me', bioPlaceholder: 'Racconta qualcosa di te…',
    edit: 'Modifica', save: 'Salva', cancel: 'Annulla', logout: 'Esci',
    logoutConfirmTitle: 'Uscire?', logoutConfirmBody: 'Ti serviranno email e PIN per accedere di nuovo.',
    removePhotoTitle: 'Rimuovere la foto?', removePhotoBody: 'Questa foto verrà rimossa dal tuo profilo.', remove: 'Rimuovi',
    permissionTitle: 'Autorizzazione necessaria', permissionBody: 'Consenti l’accesso alle foto in Impostazioni.',
    uploadFailed: 'Caricamento non riuscito', couldntSave: 'Impossibile salvare', couldntRemove: 'Impossibile rimuovere',
    couldntSend: 'Impossibile inviare', tryAgain: 'Riprova.', somethingWrong: 'Qualcosa è andato storto. Riprova.',
    alreadyConfirmed: 'La tua email è già confermata.', confirmationSent: 'Email di conferma inviata. Controlla la posta.',
  },
  sv: {
    verifyBody: 'Vi har skickat en bekräftelselänk. Kolla din inkorg.',
    myProfileTitle: 'Min profil', photosLabel: 'Bilder', mainPhoto: 'Huvud',
    photoHint: 'Tryck på en bild för att göra den till din huvudbild',
    bioLabel: 'Om mig', bioPlaceholder: 'Berätta lite om dig själv…',
    edit: 'Redigera', save: 'Spara', cancel: 'Avbryt', logout: 'Logga ut',
    logoutConfirmTitle: 'Logga ut?', logoutConfirmBody: 'Du behöver din e-post och PIN för att logga in igen.',
    removePhotoTitle: 'Ta bort bilden?', removePhotoBody: 'Bilden tas bort från din profil.', remove: 'Ta bort',
    permissionTitle: 'Behörighet krävs', permissionBody: 'Tillåt åtkomst till bilder i Inställningar.',
    uploadFailed: 'Uppladdning misslyckades', couldntSave: 'Kunde inte spara', couldntRemove: 'Kunde inte ta bort',
    couldntSend: 'Kunde inte skicka', tryAgain: 'Försök igen.', somethingWrong: 'Något gick fel. Försök igen.',
    alreadyConfirmed: 'Din e-post är redan bekräftad.', confirmationSent: 'Bekräftelsemejl skickat. Kolla din inkorg.',
  },
  da: {
    verifyBody: 'Vi har sendt dig et bekræftelseslink. Tjek din indbakke.',
    myProfileTitle: 'Min profil', photosLabel: 'Billeder', mainPhoto: 'Hoved',
    photoHint: 'Tryk på et billede for at gøre det til dit hovedbillede',
    bioLabel: 'Om mig', bioPlaceholder: 'Fortæl lidt om dig selv…',
    edit: 'Rediger', save: 'Gem', cancel: 'Annuller', logout: 'Log ud',
    logoutConfirmTitle: 'Log ud?', logoutConfirmBody: 'Du skal bruge din e-mail og PIN for at logge ind igen.',
    removePhotoTitle: 'Fjern billede?', removePhotoBody: 'Billedet fjernes fra din profil.', remove: 'Fjern',
    permissionTitle: 'Tilladelse påkrævet', permissionBody: 'Tillad adgang til billeder i Indstillinger.',
    uploadFailed: 'Upload mislykkedes', couldntSave: 'Kunne ikke gemme', couldntRemove: 'Kunne ikke fjerne',
    couldntSend: 'Kunne ikke sende', tryAgain: 'Prøv igen.', somethingWrong: 'Noget gik galt. Prøv igen.',
    alreadyConfirmed: 'Din e-mail er allerede bekræftet.', confirmationSent: 'Bekræftelsesmail sendt. Tjek din indbakke.',
  },
  fi: {
    verifyBody: 'Lähetimme sinulle vahvistuslinkin. Tarkista sähköpostisi.',
    myProfileTitle: 'Oma profiili', photosLabel: 'Kuvat', mainPhoto: 'Pääkuva',
    photoHint: 'Napauta kuvaa tehdäksesi siitä pääkuvasi',
    bioLabel: 'Tietoja', bioPlaceholder: 'Kerro hieman itsestäsi…',
    edit: 'Muokkaa', save: 'Tallenna', cancel: 'Peruuta', logout: 'Kirjaudu ulos',
    logoutConfirmTitle: 'Kirjaudutaanko ulos?', logoutConfirmBody: 'Tarvitset sähköpostisi ja PIN-koodisi kirjautuaksesi takaisin.',
    removePhotoTitle: 'Poistetaanko kuva?', removePhotoBody: 'Kuva poistetaan profiilistasi.', remove: 'Poista',
    permissionTitle: 'Lupa tarvitaan', permissionBody: 'Salli kuvien käyttö Asetuksissa.',
    uploadFailed: 'Lataus epäonnistui', couldntSave: 'Tallennus epäonnistui', couldntRemove: 'Poisto epäonnistui',
    couldntSend: 'Lähetys epäonnistui', tryAgain: 'Yritä uudelleen.', somethingWrong: 'Jotain meni pieleen. Yritä uudelleen.',
    alreadyConfirmed: 'Sähköpostisi on jo vahvistettu.', confirmationSent: 'Vahvistusviesti lähetetty. Tarkista sähköpostisi.',
  },
  es: {
    verifyBody: 'Te enviamos un enlace de confirmación. Revisa tu bandeja de entrada.',
    myProfileTitle: 'Mi perfil', photosLabel: 'Fotos', mainPhoto: 'Principal',
    photoHint: 'Toca una foto para convertirla en tu imagen principal',
    bioLabel: 'Sobre mí', bioPlaceholder: 'Cuenta algo sobre ti…',
    edit: 'Editar', save: 'Guardar', cancel: 'Cancelar', logout: 'Cerrar sesión',
    logoutConfirmTitle: '¿Cerrar sesión?', logoutConfirmBody: 'Necesitarás tu correo y PIN para volver a entrar.',
    removePhotoTitle: '¿Eliminar la foto?', removePhotoBody: 'Esta foto se eliminará de tu perfil.', remove: 'Eliminar',
    permissionTitle: 'Permiso necesario', permissionBody: 'Permite el acceso a las fotos en Ajustes.',
    uploadFailed: 'Error al subir', couldntSave: 'No se pudo guardar', couldntRemove: 'No se pudo eliminar',
    couldntSend: 'No se pudo enviar', tryAgain: 'Inténtalo de nuevo.', somethingWrong: 'Algo salió mal. Inténtalo de nuevo.',
    alreadyConfirmed: 'Tu correo ya está confirmado.', confirmationSent: 'Correo de confirmación enviado. Revisa tu bandeja.',
  },
  pl: {
    verifyBody: 'Wysłaliśmy Ci link potwierdzający. Sprawdź swoją skrzynkę.',
    myProfileTitle: 'Mój profil', photosLabel: 'Zdjęcia', mainPhoto: 'Główne',
    photoHint: 'Dotknij zdjęcia, aby ustawić je jako główne',
    bioLabel: 'O mnie', bioPlaceholder: 'Napisz coś o sobie…',
    edit: 'Edytuj', save: 'Zapisz', cancel: 'Anuluj', logout: 'Wyloguj się',
    logoutConfirmTitle: 'Wylogować?', logoutConfirmBody: 'Aby zalogować się ponownie, potrzebujesz e-maila i PIN-u.',
    removePhotoTitle: 'Usunąć zdjęcie?', removePhotoBody: 'To zdjęcie zostanie usunięte z Twojego profilu.', remove: 'Usuń',
    permissionTitle: 'Wymagane uprawnienie', permissionBody: 'Zezwól na dostęp do zdjęć w Ustawieniach.',
    uploadFailed: 'Przesyłanie nie powiodło się', couldntSave: 'Nie udało się zapisać', couldntRemove: 'Nie udało się usunąć',
    couldntSend: 'Nie udało się wysłać', tryAgain: 'Spróbuj ponownie.', somethingWrong: 'Coś poszło nie tak. Spróbuj ponownie.',
    alreadyConfirmed: 'Twój e-mail jest już potwierdzony.', confirmationSent: 'Wysłano e-mail potwierdzający. Sprawdź skrzynkę.',
  },
  pt: {
    verifyBody: 'Enviámos-lhe um link de confirmação. Verifique a sua caixa de entrada.',
    myProfileTitle: 'O meu perfil', photosLabel: 'Fotos', mainPhoto: 'Principal',
    photoHint: 'Toque numa foto para a tornar a sua imagem principal',
    bioLabel: 'Sobre mim', bioPlaceholder: 'Conte um pouco sobre si…',
    edit: 'Editar', save: 'Guardar', cancel: 'Cancelar', logout: 'Terminar sessão',
    logoutConfirmTitle: 'Terminar sessão?', logoutConfirmBody: 'Vai precisar do seu e-mail e PIN para voltar a entrar.',
    removePhotoTitle: 'Remover a foto?', removePhotoBody: 'Esta foto será removida do seu perfil.', remove: 'Remover',
    permissionTitle: 'Permissão necessária', permissionBody: 'Permita o acesso às fotos nas Definições.',
    uploadFailed: 'Falha no carregamento', couldntSave: 'Não foi possível guardar', couldntRemove: 'Não foi possível remover',
    couldntSend: 'Não foi possível enviar', tryAgain: 'Tente novamente.', somethingWrong: 'Algo correu mal. Tente novamente.',
    alreadyConfirmed: 'O seu e-mail já está confirmado.', confirmationSent: 'E-mail de confirmação enviado. Verifique a caixa de entrada.',
  },
};

const src = fs.readFileSync(FILE, 'utf8');
const ast = parser.parse(src, { sourceType: 'module' });

let added = 0;
let replaced = 0;
const skipped = [];
const missing = new Set(Object.keys(STRINGS));

traverse(ast, {
  VariableDeclarator(p) {
    const lang = p.node.id.name;
    if (!STRINGS[lang] || !t.isObjectExpression(p.node.init)) return;
    missing.delete(lang);

    const props = p.node.init.properties;
    const byName = new Map();
    props.filter((x) => t.isObjectProperty(x)).forEach((x) => {
      byName.set(t.isIdentifier(x.key) ? x.key.name : x.key.value, x);
    });

    for (const [key, value] of Object.entries(STRINGS[lang])) {
      const existing = byName.get(key);
      if (existing && OVERWRITE.has(key)) {
        existing.value = t.stringLiteral(value);
        replaced += 1;
      } else if (existing) {
        skipped.push(`${lang}.${key}`);
      } else {
        props.push(t.objectProperty(t.identifier(key), t.stringLiteral(value)));
        added += 1;
      }
    }
  },
});

if (missing.size) {
  console.error(`Language objects not found in ${FILE}: ${[...missing].join(', ')}`);
  process.exit(1);
}

const out = generate(ast, { jsescOption: { minimal: true } }, src).code;
fs.writeFileSync(FILE, out + '\n', 'utf8');

console.log(`Added ${added}, replaced ${replaced}, skipped ${skipped.length}.`);
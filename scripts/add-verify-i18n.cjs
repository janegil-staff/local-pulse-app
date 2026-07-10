// localpulse/app/scripts/add-settings-blocked-i18n.cjs
//
// Adds every user-facing string for SettingsScreen and BlockedUsersScreen to
// all 12 language objects in src/i18n/translations.js. Idempotent: a locale
// that already has a key is skipped, so re-running after a partial edit is safe.
//
//   node scripts/add-settings-blocked-i18n.cjs
//
// Keys already added by earlier scripts (cancel, logout, delete,
// logoutConfirmTitle, logoutConfirmBody, tryAgain) are intentionally omitted
// here and will show as skipped if present.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');

const STRINGS = {
  no: {
    settingsTitle: 'Innstillinger', personalSettings: 'Personlige innstillinger',
    appearanceSection: 'UTSEENDE', darkMode: 'Mørk modus', useSystemSetting: 'Bruk systeminnstilling',
    on: 'På', off: 'Av', privacySection: 'PERSONVERN OG SIKKERHET', legalSection: 'JURIDISK',
    termsOfService: 'Vilkår for bruk', privacyPolicy: 'Personvern', deleteAccount: 'Slett konto',
    deleteAccountTitle: 'Slette konto', deleteAccountBody: 'Dette sletter profilen, bildene og meldingene dine permanent. Dette kan ikke angres.',
    error: 'Feil',
    blockedUsersTitle: 'Blokkerte brukere', unblock: 'Fjern blokkering',
    unblockTitle: 'Fjerne blokkering', unblockBody: 'Fjerne blokkeringen av',
    unblockNote: 'Å fjerne en blokkering gjenoppretter samtalen dere hadde. De blir ikke varslet.',
    noBlockedUsers: 'Du har ikke blokkert noen.', couldntLoadBlocked: 'Kunne ikke laste blokkerte brukere.',
    couldntUnblock: 'Kunne ikke fjerne blokkeringen',
  },
  en: {
    settingsTitle: 'Settings', personalSettings: 'Personal settings',
    appearanceSection: 'APPEARANCE', darkMode: 'Dark mode', useSystemSetting: 'Use system setting',
    on: 'On', off: 'Off', privacySection: 'PRIVACY & SAFETY', legalSection: 'LEGAL',
    termsOfService: 'Terms of Service', privacyPolicy: 'Privacy Policy', deleteAccount: 'Delete account',
    deleteAccountTitle: 'Delete account', deleteAccountBody: 'This permanently deletes your profile, photos, and messages. This cannot be undone.',
    error: 'Error',
    blockedUsersTitle: 'Blocked users', unblock: 'Unblock',
    unblockTitle: 'Unblock', unblockBody: 'Unblock',
    unblockNote: 'Unblocking restores any conversation you had. They won’t be notified.',
    noBlockedUsers: 'You haven’t blocked anyone.', couldntLoadBlocked: 'Couldn’t load blocked users.',
    couldntUnblock: 'Couldn’t unblock',
  },
  nl: {
    settingsTitle: 'Instellingen', personalSettings: 'Persoonlijke instellingen',
    appearanceSection: 'WEERGAVE', darkMode: 'Donkere modus', useSystemSetting: 'Systeeminstelling gebruiken',
    on: 'Aan', off: 'Uit', privacySection: 'PRIVACY EN VEILIGHEID', legalSection: 'JURIDISCH',
    termsOfService: 'Servicevoorwaarden', privacyPolicy: 'Privacybeleid', deleteAccount: 'Account verwijderen',
    deleteAccountTitle: 'Account verwijderen', deleteAccountBody: 'Hiermee worden je profiel, foto’s en berichten permanent verwijderd. Dit kan niet ongedaan worden gemaakt.',
    error: 'Fout',
    blockedUsersTitle: 'Geblokkeerde gebruikers', unblock: 'Deblokkeren',
    unblockTitle: 'Deblokkeren', unblockBody: 'Deblokkeer',
    unblockNote: 'Deblokkeren herstelt het gesprek dat je had. Zij krijgen hiervan geen melding.',
    noBlockedUsers: 'Je hebt niemand geblokkeerd.', couldntLoadBlocked: 'Kan geblokkeerde gebruikers niet laden.',
    couldntUnblock: 'Kan niet deblokkeren',
  },
  fr: {
    settingsTitle: 'Réglages', personalSettings: 'Paramètres personnels',
    appearanceSection: 'APPARENCE', darkMode: 'Mode sombre', useSystemSetting: 'Utiliser le réglage système',
    on: 'Activé', off: 'Désactivé', privacySection: 'CONFIDENTIALITÉ ET SÉCURITÉ', legalSection: 'MENTIONS LÉGALES',
    termsOfService: 'Conditions d’utilisation', privacyPolicy: 'Politique de confidentialité', deleteAccount: 'Supprimer le compte',
    deleteAccountTitle: 'Supprimer le compte', deleteAccountBody: 'Cela supprime définitivement votre profil, vos photos et vos messages. Cette action est irréversible.',
    error: 'Erreur',
    blockedUsersTitle: 'Utilisateurs bloqués', unblock: 'Débloquer',
    unblockTitle: 'Débloquer', unblockBody: 'Débloquer',
    unblockNote: 'Débloquer restaure la conversation que vous aviez. La personne n’en sera pas informée.',
    noBlockedUsers: 'Vous n’avez bloqué personne.', couldntLoadBlocked: 'Impossible de charger les utilisateurs bloqués.',
    couldntUnblock: 'Impossible de débloquer',
  },
  de: {
    settingsTitle: 'Einstellungen', personalSettings: 'Persönliche Einstellungen',
    appearanceSection: 'DARSTELLUNG', darkMode: 'Dunkelmodus', useSystemSetting: 'Systemeinstellung verwenden',
    on: 'Ein', off: 'Aus', privacySection: 'PRIVATSPHÄRE UND SICHERHEIT', legalSection: 'RECHTLICHES',
    termsOfService: 'Nutzungsbedingungen', privacyPolicy: 'Datenschutz', deleteAccount: 'Konto löschen',
    deleteAccountTitle: 'Konto löschen', deleteAccountBody: 'Dadurch werden dein Profil, deine Fotos und Nachrichten dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.',
    error: 'Fehler',
    blockedUsersTitle: 'Blockierte Nutzer', unblock: 'Blockierung aufheben',
    unblockTitle: 'Blockierung aufheben', unblockBody: 'Blockierung aufheben für',
    unblockNote: 'Das Aufheben stellt eure frühere Unterhaltung wieder her. Die Person wird nicht benachrichtigt.',
    noBlockedUsers: 'Du hast niemanden blockiert.', couldntLoadBlocked: 'Blockierte Nutzer konnten nicht geladen werden.',
    couldntUnblock: 'Blockierung konnte nicht aufgehoben werden',
  },
  it: {
    settingsTitle: 'Impostazioni', personalSettings: 'Impostazioni personali',
    appearanceSection: 'ASPETTO', darkMode: 'Modalità scura', useSystemSetting: 'Usa impostazione di sistema',
    on: 'Attivo', off: 'Disattivo', privacySection: 'PRIVACY E SICUREZZA', legalSection: 'NOTE LEGALI',
    termsOfService: 'Termini di servizio', privacyPolicy: 'Informativa sulla privacy', deleteAccount: 'Elimina account',
    deleteAccountTitle: 'Elimina account', deleteAccountBody: 'Questa operazione elimina definitivamente profilo, foto e messaggi. Non può essere annullata.',
    error: 'Errore',
    blockedUsersTitle: 'Utenti bloccati', unblock: 'Sblocca',
    unblockTitle: 'Sblocca', unblockBody: 'Sbloccare',
    unblockNote: 'Sbloccando ripristini la conversazione che avevate. La persona non verrà avvisata.',
    noBlockedUsers: 'Non hai bloccato nessuno.', couldntLoadBlocked: 'Impossibile caricare gli utenti bloccati.',
    couldntUnblock: 'Impossibile sbloccare',
  },
  sv: {
    settingsTitle: 'Inställningar', personalSettings: 'Personliga inställningar',
    appearanceSection: 'UTSEENDE', darkMode: 'Mörkt läge', useSystemSetting: 'Använd systeminställning',
    on: 'På', off: 'Av', privacySection: 'INTEGRITET OCH SÄKERHET', legalSection: 'JURIDIK',
    termsOfService: 'Användarvillkor', privacyPolicy: 'Integritetspolicy', deleteAccount: 'Radera konto',
    deleteAccountTitle: 'Radera konto', deleteAccountBody: 'Detta raderar permanent din profil, dina bilder och meddelanden. Det kan inte ångras.',
    error: 'Fel',
    blockedUsersTitle: 'Blockerade användare', unblock: 'Avblockera',
    unblockTitle: 'Avblockera', unblockBody: 'Avblockera',
    unblockNote: 'Att avblockera återställer konversationen ni hade. De meddelas inte.',
    noBlockedUsers: 'Du har inte blockerat någon.', couldntLoadBlocked: 'Kunde inte ladda blockerade användare.',
    couldntUnblock: 'Kunde inte avblockera',
  },
  da: {
    settingsTitle: 'Indstillinger', personalSettings: 'Personlige indstillinger',
    appearanceSection: 'UDSEENDE', darkMode: 'Mørk tilstand', useSystemSetting: 'Brug systemindstilling',
    on: 'Til', off: 'Fra', privacySection: 'PRIVATLIV OG SIKKERHED', legalSection: 'JURIDISK',
    termsOfService: 'Servicevilkår', privacyPolicy: 'Privatlivspolitik', deleteAccount: 'Slet konto',
    deleteAccountTitle: 'Slet konto', deleteAccountBody: 'Dette sletter permanent din profil, dine billeder og beskeder. Det kan ikke fortrydes.',
    error: 'Fejl',
    blockedUsersTitle: 'Blokerede brugere', unblock: 'Fjern blokering',
    unblockTitle: 'Fjern blokering', unblockBody: 'Fjern blokering af',
    unblockNote: 'At fjerne blokeringen gendanner jeres samtale. De får ikke besked.',
    noBlockedUsers: 'Du har ikke blokeret nogen.', couldntLoadBlocked: 'Kunne ikke indlæse blokerede brugere.',
    couldntUnblock: 'Kunne ikke fjerne blokeringen',
  },
  fi: {
    settingsTitle: 'Asetukset', personalSettings: 'Henkilökohtaiset asetukset',
    appearanceSection: 'ULKOASU', darkMode: 'Tumma tila', useSystemSetting: 'Käytä järjestelmän asetusta',
    on: 'Päällä', off: 'Pois', privacySection: 'YKSITYISYYS JA TURVALLISUUS', legalSection: 'OIKEUDELLISET TIEDOT',
    termsOfService: 'Käyttöehdot', privacyPolicy: 'Tietosuojakäytäntö', deleteAccount: 'Poista tili',
    deleteAccountTitle: 'Poista tili', deleteAccountBody: 'Tämä poistaa pysyvästi profiilisi, kuvasi ja viestisi. Tätä ei voi peruuttaa.',
    error: 'Virhe',
    blockedUsersTitle: 'Estetyt käyttäjät', unblock: 'Poista esto',
    unblockTitle: 'Poista esto', unblockBody: 'Poista käyttäjän esto:',
    unblockNote: 'Eston poistaminen palauttaa aiemman keskustelunne. Käyttäjälle ei ilmoiteta.',
    noBlockedUsers: 'Et ole estänyt ketään.', couldntLoadBlocked: 'Estettyjä käyttäjiä ei voitu ladata.',
    couldntUnblock: 'Eston poistaminen epäonnistui',
  },
  es: {
    settingsTitle: 'Ajustes', personalSettings: 'Ajustes personales',
    appearanceSection: 'APARIENCIA', darkMode: 'Modo oscuro', useSystemSetting: 'Usar ajuste del sistema',
    on: 'Activado', off: 'Desactivado', privacySection: 'PRIVACIDAD Y SEGURIDAD', legalSection: 'LEGAL',
    termsOfService: 'Términos del servicio', privacyPolicy: 'Política de privacidad', deleteAccount: 'Eliminar cuenta',
    deleteAccountTitle: 'Eliminar cuenta', deleteAccountBody: 'Esto elimina permanentemente tu perfil, tus fotos y mensajes. No se puede deshacer.',
    error: 'Error',
    blockedUsersTitle: 'Usuarios bloqueados', unblock: 'Desbloquear',
    unblockTitle: 'Desbloquear', unblockBody: 'Desbloquear a',
    unblockNote: 'Desbloquear restaura la conversación que tenían. No se le notificará.',
    noBlockedUsers: 'No has bloqueado a nadie.', couldntLoadBlocked: 'No se pudieron cargar los usuarios bloqueados.',
    couldntUnblock: 'No se pudo desbloquear',
  },
  pl: {
    settingsTitle: 'Ustawienia', personalSettings: 'Ustawienia osobiste',
    appearanceSection: 'WYGLĄD', darkMode: 'Tryb ciemny', useSystemSetting: 'Użyj ustawienia systemu',
    on: 'Wł.', off: 'Wył.', privacySection: 'PRYWATNOŚĆ I BEZPIECZEŃSTWO', legalSection: 'INFORMACJE PRAWNE',
    termsOfService: 'Warunki korzystania', privacyPolicy: 'Polityka prywatności', deleteAccount: 'Usuń konto',
    deleteAccountTitle: 'Usuń konto', deleteAccountBody: 'To trwale usunie Twój profil, zdjęcia i wiadomości. Tej operacji nie można cofnąć.',
    error: 'Błąd',
    blockedUsersTitle: 'Zablokowani użytkownicy', unblock: 'Odblokuj',
    unblockTitle: 'Odblokuj', unblockBody: 'Odblokować',
    unblockNote: 'Odblokowanie przywraca waszą rozmowę. Ta osoba nie zostanie powiadomiona.',
    noBlockedUsers: 'Nikogo nie zablokowałeś.', couldntLoadBlocked: 'Nie udało się załadować zablokowanych użytkowników.',
    couldntUnblock: 'Nie udało się odblokować',
  },
  pt: {
    settingsTitle: 'Definições', personalSettings: 'Definições pessoais',
    appearanceSection: 'APARÊNCIA', darkMode: 'Modo escuro', useSystemSetting: 'Usar definição do sistema',
    on: 'Ligado', off: 'Desligado', privacySection: 'PRIVACIDADE E SEGURANÇA', legalSection: 'LEGAL',
    termsOfService: 'Termos de Serviço', privacyPolicy: 'Política de Privacidade', deleteAccount: 'Eliminar conta',
    deleteAccountTitle: 'Eliminar conta', deleteAccountBody: 'Isto elimina permanentemente o seu perfil, fotos e mensagens. Não pode ser anulado.',
    error: 'Erro',
    blockedUsersTitle: 'Utilizadores bloqueados', unblock: 'Desbloquear',
    unblockTitle: 'Desbloquear', unblockBody: 'Desbloquear',
    unblockNote: 'Desbloquear restaura a conversa que tinham. A pessoa não será notificada.',
    noBlockedUsers: 'Não bloqueaste ninguém.', couldntLoadBlocked: 'Não foi possível carregar os utilizadores bloqueados.',
    couldntUnblock: 'Não foi possível desbloquear',
  },
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
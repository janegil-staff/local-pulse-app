// localpulse/app/src/lib/legalContent.js
// Shared Terms + Privacy content. Rendered inline on the first onboarding page
// and on the standalone Legal screen. Replace with reviewed legal text before
// release, and host canonical versions at real URLs.

export const LEGAL = {
  terms: {
    title: 'Terms of Service',
    body: [
      ['1. Eligibility', 'You must be at least 18 years old to create an account or use this app. By using the app you represent that you meet this requirement.'],
      ['2. Your account', 'You are responsible for the accuracy of the information on your profile and for keeping your login credentials secure. You may delete your account at any time from Settings.'],
      ['3. Community conduct', 'You agree not to harass, threaten, impersonate, or post unlawful, hateful, or sexually explicit content. Accounts that violate these rules may be suspended or removed.'],
      ['4. Content', 'You retain ownership of the photos and text you post, but grant us a license to display them within the app to provide the service.'],
      ['5. Safety', 'Meeting people carries risk. Always meet in public, tell a friend your plans, and use your judgment. We do not conduct background checks on users.'],
      ['6. Reporting', 'You can report or block any user from their profile. We review reports and take action against violating accounts.'],
      ['7. Termination', 'We may suspend or terminate accounts that violate these terms. You may stop using the app and delete your account at any time.'],
      ['8. Changes', 'We may update these terms; continued use after changes means you accept the updated terms.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      ['1. What we collect', 'Account details (name, email, date of birth, gender), profile content (photos, bio, interests), approximate location for discovery, and usage data needed to run the service.'],
      ['2. How we use it', 'To create your profile, show you nearby people, enable matches and messaging, and keep the community safe. We do not sell your personal data.'],
      ['3. Location', 'We use your approximate location to show and rank nearby profiles. You can disable location in your device settings, though discovery depends on it.'],
      ['4. Sharing', 'Your profile is visible to other users of the app. We share data with service providers (such as image hosting) only as needed to operate the service.'],
      ['5. Retention & deletion', 'We keep your data while your account is active. Deleting your account from Settings permanently removes your profile, matches, and messages.'],
      ['6. Security', 'We use industry-standard measures to protect your data, though no system is perfectly secure.'],
      ['7. Your rights', 'You can access, correct, or delete your information at any time from within the app, or by contacting us.'],
      ['8. Contact', 'For privacy questions, contact the support address listed on our website.'],
    ],
  },
};

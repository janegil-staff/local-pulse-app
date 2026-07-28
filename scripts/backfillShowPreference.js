// localpulse/server/src/scripts/backfillShowPreference.js
//
// Applies the opposite-sex discovery default to existing accounts.
//
//   node src/scripts/backfillShowPreference.js            # dry run
//   node src/scripts/backfillShowPreference.js --confirm  # write
//
// Only touches users whose `preferences.showSetByUser` is not true, so
// anyone who has already opened the discovery settings and made a choice
// keeps it. Everyone else is on the old implicit default and is fair game.
//
// Worth thinking about before running this in production: it changes what
// existing users see in Discovery, without them asking. For a small early
// user base that is fine. Past a certain size it is the kind of change
// people notice and complain about, and a one-time in-app notice is kinder
// than a silent switch.

import mongoose from 'mongoose';
import { config } from '../config/index.js';
import User from '../models/User.js';
import { defaultShowFor } from '../lib/defaultShowPreference.js';

const CONFIRM = process.argv.includes('--confirm');

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  const users = await User.find(
    { 'preferences.showSetByUser': { $ne: true } },
    { _id: 1, username: 1, gender: 1, preferences: 1 }
  ).lean();

  const changes = [];

  for (const user of users) {
    const next = defaultShowFor(user.gender);
    if (user.preferences?.show !== next) {
      changes.push({
        _id: user._id,
        username: user.username,
        gender: user.gender || '(unset)',
        from: user.preferences?.show || '(unset)',
        to: next,
      });
    }
  }

  console.log(`Candidates : ${users.length}`);
  console.log(`Changes    : ${changes.length}\n`);

  const byTransition = {};
  for (const change of changes) {
    const key = `${change.gender} : ${change.from} -> ${change.to}`;
    byTransition[key] = (byTransition[key] || 0) + 1;
  }
  for (const [key, count] of Object.entries(byTransition)) {
    console.log(`  ${key.padEnd(40)} ${count}`);
  }

  if (!CONFIRM) {
    console.log('\nDRY RUN — nothing written. Pass --confirm to apply.');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  for (const change of changes) {
    await User.updateOne(
      { _id: change._id },
      { $set: { 'preferences.show': change.to } }
    );
    updated += 1;
  }

  console.log(`\nUpdated ${updated} user(s).`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Backfill failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

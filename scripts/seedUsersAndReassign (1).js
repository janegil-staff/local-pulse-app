// localpulse/server/scripts/seedUsersAndReassign.js
//
// Creates N loginable users (PIN 2255) and reassigns ALL existing posts to them
// round-robin. Does NOT delete any users — that's a separate manual step you run
// after verifying the reassignment.
//
// Login works because User.setPin() hashes BOTH pinHash and passwordHash with
// bcrypt(12), exactly as /auth/login expects. Uses .save() per document so the
// method runs (insertMany would bypass it).
//
// Run from the server root:
//   node scripts/seedUsersAndReassign.js                 # 5 users near Sandnes
//   node scripts/seedUsersAndReassign.js --count=8
//   node scripts/seedUsersAndReassign.js --lat=58.97 --lng=5.73
//   node scripts/seedUsersAndReassign.js --confirm       # required for remote/prod DB
//
// After it runs it prints each new user's email + PIN so you can log in as them.

import 'dotenv/config';
import mongoose from 'mongoose';
import User, { snapCoords } from '../src/models/User.js';
import Post from '../src/models/Post.js';

// ── args ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const COUNT = args.count != null ? Math.max(1, Number(args.count)) : 5;
const CENTER = {
  lat: args.lat != null ? Number(args.lat) : 58.8522, // Sandnes
  lng: args.lng != null ? Number(args.lng) : 5.7361,
};
const PIN = '2255';

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('No Mongo connection string (MONGODB_URI / MONGO_URL / DATABASE_URL).');
  process.exit(1);
}

// Guard against accidentally mutating a production database — this reassigns
// EVERY post, so a wrong target is costly.
const looksProd = !/localhost|127\.0\.0\.1|mongo:27017/.test(MONGODB_URI);
if (looksProd && !args.confirm) {
  console.error(
    `Refusing to run against what looks like a remote/prod DB:\n  ${MONGODB_URI.replace(/\/\/[^@]*@/, '//<credentials>@')}\n` +
    `This creates users AND reassigns every post. Re-run with --confirm if you mean it.`
  );
  process.exit(1);
}

// ── new user identities ─────────────────────────────────────────────────
// Distinct usernames/emails so unique indexes don't collide. A short random
// suffix avoids clashing with existing accounts on re-run.
const SUFFIX = Math.random().toString(36).slice(2, 6);
const PEOPLE = [
  { username: 'ingrids',  displayName: 'Ingrid Solheim', gender: 'female' },
  { username: 'matsberg', displayName: 'Mats Berg',      gender: 'male'   },
  { username: 'karov',    displayName: 'Karoline Vik',   gender: 'female' },
  { username: 'olek_p',   displayName: 'Oleksandr P.',   gender: 'male'   },
  { username: 'theah',    displayName: 'Thea Haaland',   gender: 'female' },
  { username: 'jonasr',   displayName: 'Jonas Ravn',     gender: 'male'   },
  { username: 'amara_o',  displayName: 'Amara Okafor',   gender: 'female' },
  { username: 'sindre_l', displayName: 'Sindre Lie',     gender: 'male'   },
];

const jitter = () => (Math.random() - 0.5) * 0.02; // ~±1km
// 18+ dob, spread across ages.
const dobFor = (i) => new Date(1990 + (i % 15), (i * 3) % 12, ((i * 7) % 27) + 1);

// Real portrait photos, gender-matched, from randomuser.me (stable CDN URLs,
// actual faces). Each new user gets one as photos[0]. These are external URLs,
// not Cloudinary assets, so publicId stays null — the deletion path skips
// entries without a publicId, which is correct here (nothing to destroy).
const PORTRAITS = {
  female: [
    'https://randomuser.me/api/portraits/women/68.jpg',
    'https://randomuser.me/api/portraits/women/44.jpg',
    'https://randomuser.me/api/portraits/women/12.jpg',
    'https://randomuser.me/api/portraits/women/90.jpg',
    'https://randomuser.me/api/portraits/women/33.jpg',
  ],
  male: [
    'https://randomuser.me/api/portraits/men/32.jpg',
    'https://randomuser.me/api/portraits/men/75.jpg',
    'https://randomuser.me/api/portraits/men/11.jpg',
    'https://randomuser.me/api/portraits/men/54.jpg',
    'https://randomuser.me/api/portraits/men/86.jpg',
  ],
};

// Pick a portrait for a given gender + index so users don't all share one face.
function portraitFor(gender, i) {
  const pool = PORTRAITS[gender] || PORTRAITS.male;
  return pool[i % pool.length];
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  const postCount = await Post.countDocuments();
  console.log(`Will create ${COUNT} user(s) and reassign ${postCount} post(s) across them.`);
  if (postCount === 0) console.log('(No posts to reassign — users will still be created.)');

  // ── 1. Create users ────────────────────────────────────────────────────
  const created = [];
  for (let i = 0; i < COUNT; i += 1) {
    const p = PEOPLE[i % PEOPLE.length];
    const username = `${p.username}_${SUFFIX}${i}`;
    const email = `${username}@example.com`;

    const u = new User({
      username,
      email,
      displayName: p.displayName,
      gender: p.gender,
      dob: dobFor(i),
      language: 'no',
      neighborhood: 'Sandnes',
      profileComplete: true,
      emailVerified: true,
      // Real portrait as the primary photo. photoSchema is { url, publicId };
      // publicId is null since these are external URLs, not Cloudinary assets.
      photos: [{ url: portraitFor(p.gender, i), publicId: null }],
      // Snapped GeoJSON point (same grid the app uses) so these users are
      // discoverable and can author geo-visible posts.
      location: {
        type: 'Point',
        coordinates: snapCoords([CENTER.lng + jitter(), CENTER.lat + jitter()]),
      },
      locationMode: 'manual',
      locationName: 'Sandnes',
    });
    // Hashes pinHash AND passwordHash (bcrypt 12) — this is what makes login work.
    await u.setPin(PIN);
    await u.save();
    created.push(u);
    console.log(`  ✓ ${email}  (PIN ${PIN})`);
  }

  // ── 2. Reassign ALL posts round-robin across the new users ─────────────
  if (postCount > 0) {
    const ids = created.map((u) => u._id);
    const all = await Post.find({}, { _id: 1 }).lean();
    let n = 0;
    for (let i = 0; i < all.length; i += 1) {
      const author = ids[i % ids.length];
      await Post.updateOne({ _id: all[i]._id }, { $set: { author } });
      n += 1;
    }
    console.log(`Reassigned ${n} post(s) across ${ids.length} new user(s).`);
  }

  // ── 3. Print credentials ───────────────────────────────────────────────
  console.log('\nNew users (log in with these):');
  for (const u of created) console.log(`  ${u.email}   PIN ${PIN}`);

  await mongoose.disconnect();
  console.log('\nDone. Old users were NOT deleted — remove them manually once verified.');
}

main().catch(async (err) => {
  console.error('Failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

// localpulse/app/src/fixtures/sampleFeed.js
//
// Sample feed for local testing / screenshots / store review. Shape matches
// what PostCard reads: id, type, author {displayName, username}, text,
// imageUrl, placeName, createdAt, likeCount, likedByMe, savedByMe.
//
// `type` maps to POST_TYPE_META in theme.js; unknown types fall back to
// 'update', so adjust these keys to your real POST_TYPE_META if they differ.
//
// Usage (quick manual test in FeedScreen):
//   import { SAMPLE_FEED } from '../fixtures/sampleFeed.js';
//   const data = __DEV__ && posts.length === 0 ? SAMPLE_FEED : posts;

// Timestamps are computed relative to now so timeAgo() shows "5m", "2h", etc.
const minsAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

export const SAMPLE_FEED = [
  {
    id: 'sample-1',
    type: 'event',
    author: { displayName: 'Ingrid Solheim', username: 'ingrids' },
    text: 'Beach volleyball at Sola strand this Saturday 14:00 — we need two more players. Beginners very welcome, we just want a good time. 🏐',
    imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&q=80',
    placeName: 'Sola strand',
    createdAt: minsAgo(4),
    likeCount: 12,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: 'sample-2',
    type: 'question',
    author: { displayName: 'Mats', username: 'matsberg' },
    text: 'Moved to Sandnes last week. Where do people actually get good coffee around here? Not a chain — somewhere with character.',
    imageUrl: '',
    placeName: 'Sandnes sentrum',
    createdAt: minsAgo(38),
    likeCount: 7,
    likedByMe: true,
    savedByMe: false,
  },
  {
    id: 'sample-3',
    type: 'update',
    author: { displayName: 'Karoline Vik', username: 'karov' },
    text: 'Sunset run along the fjord tonight. Six months ago I couldn’t do 2 km without stopping. Small steps add up. 🏃‍♀️',
    imageUrl: 'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=1200&q=80',
    placeName: 'Gandsfjorden',
    createdAt: minsAgo(95),
    likeCount: 41,
    likedByMe: false,
    savedByMe: true,
  },
  {
    id: 'sample-4',
    type: 'recommendation',
    author: { displayName: 'Oleksandr', username: 'olek_p' },
    text: 'The new ramen place near the train station is the real deal. Tonkotsu broth, proper chashu. Go before the queues figure it out.',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&q=80',
    placeName: 'Jærbanen stasjon',
    createdAt: minsAgo(180),
    likeCount: 23,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: 'sample-5',
    type: 'update',
    author: { displayName: 'Thea', username: 'theah' },
    text: 'Free pile of firewood on my driveway — first come first served. Dry, been under cover all winter. DM for the address. 🔥',
    imageUrl: '',
    placeName: 'Hana',
    createdAt: minsAgo(320),
    likeCount: 5,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: 'sample-6',
    type: 'event',
    author: { displayName: 'Jonas Ravn', username: 'jonasr' },
    text: 'Board game night at mine on Friday. Wingspan, Catan, whatever people bring. Room for 6, three spots left. Snacks provided.',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1200&q=80',
    placeName: 'Stavanger',
    createdAt: minsAgo(600),
    likeCount: 18,
    likedByMe: true,
    savedByMe: true,
  },
  {
    id: 'sample-7',
    type: 'question',
    author: { displayName: 'Amara', username: 'amara_o' },
    text: 'Anyone know a reliable bike mechanic nearby? Gears slipping and I’m out of my depth. Willing to pay for someone who knows their stuff.',
    imageUrl: '',
    placeName: 'Bryne',
    createdAt: minsAgo(1440),
    likeCount: 3,
    likedByMe: false,
    savedByMe: false,
  },
];

export default SAMPLE_FEED;
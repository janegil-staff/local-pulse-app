// localpulse/app/src/lib/avatar.js
// Central place for the default avatar. Use avatarSource(user) anywhere you'd
// pass an Image source, and it returns the user's photo or the default.

// ⚠️ Adjust the path if you saved the file elsewhere.
const DEFAULT_AVATAR = require('../../assets/images/default-avatar.png');

// Photos are now { url, publicId } objects. Older cached responses (and any
// screen handed a stale `user` via route params) may still hold bare strings,
// so accept both.
function photoUrl(photo) {
  if (!photo) return null;
  return typeof photo === 'string' ? photo : photo.url || null;
}

// Returns an Image `source` prop: the user's first photo if present, else the
// bundled default. Works with a photos array, a single url, or a user object.
export function avatarSource(input) {
  let uri = null;
  if (typeof input === 'string') {
    uri = input;
  } else if (input) {
    uri =
      input.avatarUrl ||
      (Array.isArray(input.photos) ? photoUrl(input.photos[0]) : null) ||
      photoUrl(input.photo) ||
      null;
  }
  return uri ? { uri } : DEFAULT_AVATAR;
}

// Convenience: just the default (e.g. for a known-empty slot).
export const defaultAvatar = DEFAULT_AVATAR;
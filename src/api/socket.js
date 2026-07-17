// localpulse/app/src/api/socket.js
import { io } from 'socket.io-client';
import { SOCKET_URL, getToken } from './client.js';

let socket = null;

// Connect once and reuse. Returns the existing socket if one exists AT ALL —
// not only if it's already `connected`. socket.io connects asynchronously, so
// there's a window where the socket exists but connected === false; returning a
// fresh socket in that window creates a SECOND connection and orphans the
// listeners the first caller bound (chatStore binds chat:message/chat:notify on
// connect; a replaced socket silently stops delivering them). Multiple callers
// now share one socket: chatStore for messages, usePresence for heartbeats.
//
// AUTH_CALLBACK_V1 — `auth` MUST be a function, not an object.
//
// It was `auth: { token: getToken() }`, which evaluates getToken() exactly
// once, at socket-creation time. Combined with the `if (socket) return socket`
// reuse above, that meant the token was read once per app lifetime. If
// connectChatSocket() ran before login — or before the persisted token had been
// restored from storage — the socket connected with token: null, the server's
// authSocket rejected it ("No token"), and the dead socket was then handed back
// to every subsequent caller forever. REST kept working the whole time because
// client.js reads the token fresh per request, which is why the app looked
// half-alive: conversations loaded, but nothing could send or receive.
//
// This reliably bit the simulator (fresh install, boots logged-out, token
// restored asynchronously → socket created first) while physical devices with a
// warm session usually won the race.
//
// As a function, socket.io calls it on every connect AND every reconnect, so a
// token that arrives late — or is refreshed mid-session — is picked up without
// tearing the socket down.
export function connectChatSocket() {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: (cb) => cb({ token: getToken() }),
    autoConnect: true,
  });

  // CONNECT_ERROR_LOG_V1 — this failure was completely silent for weeks.
  // A rejected handshake produced no error anywhere: emits on a disconnected
  // socket are dropped without throwing, so the UI cleared its input and
  // waited for an ack that could never arrive.
  //
  // 'No token' / 'Invalid token' here means the auth callback above returned
  // nothing usable — check that login has completed and the token is persisted
  // before this socket is created.
  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err?.message ?? err);
  });

  return socket;
}

export function getChatSocket() {
  return socket;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
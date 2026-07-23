// localpulse/app/src/api/socket.js
// Socket.IO client for live chat + presence. Talks to the default namespace
// on SOCKET_URL; the server (src/socket/chat.js) authenticates the handshake
// from auth.token and pushes chat:message / chat:notify / chat:accepted events.
//
// This version keeps the original, correct structure (function-form auth so
// the token is re-read on every reconnect; shared idempotent instance) and
// adds diagnostics to pin down the Android-only "chat:accepted never arrives"
// bug. Once the cause is found, the extra logging can be trimmed.
import { io } from 'socket.io-client';
import { SOCKET_URL, getToken } from './client.js';

let socket = null;

// Idempotent: returns the shared socket, creating it on first call. Safe to
// call from multiple places (usePresence, chatStore) — they all get the same
// instance. The auth callback is read on every (re)connect, so a token that
// arrives after the first call still lands on the next handshake.
export function connectChatSocket() {
  if (socket) {
    // If a prior call created the socket while the token was still null (e.g.
    // usePresence firing before login), make sure we're actively reconnecting
    // now that a token may exist.
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    auth: (cb) => {
      const token = getToken();
      if (__DEV__) console.log('[socket] handshake auth, hasToken =', !!token);
      cb({ token });
    },
  });

  if (__DEV__) {
    socket.on('connect', () => console.log('[socket] connected', socket.id));
    socket.on('connect_error', (e) => console.log('[socket] connect_error', e.message));
    socket.on('disconnect', (r) => console.log('[socket] disconnect', r));
    // Catch-all so we can SEE whether chat:accepted actually reaches this client.
    socket.onAny((event, ...args) => console.log('[socket] <=', event, JSON.stringify(args)));
  }

  return socket;
}

// Return the current socket without forcing creation. May be null before the
// first connectChatSocket() call.
export function getChatSocket() {
  return socket;
}

// Tear down on logout so the next login re-handshakes with the correct token
// and doesn't inherit a socket authed as the previous user.
export function disconnectChatSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
// localpulse/app/src/api/socket.js
// Socket.IO client for live chat + presence. Talks to the default namespace
// on SOCKET_URL; the server (src/socket/chat.js) authenticates the handshake
// from auth.token and pushes chat:message / chat:notify events.

import { io } from 'socket.io-client';
import { SOCKET_URL, getToken } from './client.js';

let socket = null;

// Idempotent: returns the shared socket, creating it on first call. Safe to
// call from multiple places (usePresence, chatStore) — they all get the same
// instance. The auth callback is read on every (re)connect, so a token that
// arrives after the first call still lands on the next handshake, and a fresh
// install with a null token reconnects cleanly once login sets it.
export function connectChatSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    auth: (cb) => cb({ token: getToken() }),
  });
  if (__DEV__) {
    socket.on('connect', () => console.log('[socket] connected', socket.id));
    socket.on('connect_error', (e) => console.log('[socket] connect_error', e.message));
    socket.on('disconnect', (r) => console.log('[socket] disconnect', r));
  }
  return socket;
}

// Returns the current socket without creating one. Null before connectChatSocket
// has run. Callers that only want to emit on an already-live socket use this.
export function getChatSocket() {
  return socket;
}

// Tear down on logout so the next login opens a fresh, correctly-authed socket
// rather than reusing one carrying the previous user's token.
export function disconnectChatSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
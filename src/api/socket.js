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
export function connectChatSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token: getToken() },
    autoConnect: true,
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
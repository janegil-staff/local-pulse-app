// localpulse/app/src/api/socket.js
import { io } from 'socket.io-client';
import { SOCKET_URL, getToken } from './client.js';

let socket = null;

// Connect (or reconnect) with the current auth token in the handshake.
export function connectChatSocket() {
  if (socket && socket.connected) return socket;
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

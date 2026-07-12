// localpulse/app/src/lib/usePresence.js
//
// Keeps the current user's presence fresh so online indicators actually light
// up. The server marks a user "online" when it sees a socket connect or a
// `presence:ping`, and treats them offline after ONLINE_MS (2 min). Without a
// heartbeat, lastSeenAt only updates around chat use and goes stale two minutes
// later — so nobody ever reads as online on Discovery or profiles.
//
// Mount this ONCE, high in the authed tree (see App / navigator), passing
// whether the user is logged in. It reuses the shared socket singleton, so
// chat keeps working on the same connection.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { connectChatSocket, getChatSocket, disconnectChatSocket } from '../api/socket.js';

// Must be < ONLINE_MS (120_000) on the server, with margin for a dropped ping.
const PING_INTERVAL_MS = 60_000;

export function usePresence(isAuthed) {
  useEffect(() => {
    if (!isAuthed) return undefined;

    // Bring the socket up at login (not lazily at first chat) so presence is
    // live from the moment the user is authenticated.
    const socket = connectChatSocket();

    const ping = () => {
      const s = getChatSocket();
      if (s && s.connected) s.emit('presence:ping');
    };

    // The connect itself writes lastSeenAt server-side; emit once now to cover
    // the case where the socket was already connected (connectChatSocket is a
    // no-op then and wouldn't re-trigger the connect handler).
    ping();

    // socket.io fires 'connect' on the initial connect and every reconnect —
    // ping on each so a reconnect after a network blip refreshes presence.
    socket.on('connect', ping);

    const interval = setInterval(ping, PING_INTERVAL_MS);

    // Coming back to the foreground is exactly when presence is most stale —
    // the interval is throttled/suspended in the background on both platforms.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      const s = getChatSocket();
      if (s) s.off('connect', ping);
    };
  }, [isAuthed]);
}
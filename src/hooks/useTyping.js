// localpulse/app/src/hooks/useTyping.js
//
// Typing indicator for a 1:1 conversation.
//
//   const { peerTyping, onTextChange, stopTyping } = useTyping({
//     socket,
//     conversationId,
//   });
//
// Two things make this harder than it looks, and both are handled here:
//
//   1. Emitting on every keystroke floods the socket. Someone typing at
//      60wpm produces ~5 events a second per conversation, and none of them
//      carry information the first one didn't. Emits are throttled.
//
//   2. The "stopped typing" event gets lost. Backgrounding the app, losing
//      signal, force-quitting — any of these drop the socket mid-word, and
//      the stop event never arrives. The receiving side must expire the
//      indicator on a timer rather than trusting a stop to turn it off, or
//      the other person appears to be typing forever.

import { useCallback, useEffect, useRef, useState } from "react";

// How often a "typing" event may be sent while someone keeps typing.
const EMIT_THROTTLE_MS = 2000;

// Idle time after the last keystroke before we tell the other side we
// stopped. Longer than a natural pause between words, shorter than the
// receiving side's expiry.
const STOP_AFTER_IDLE_MS = 3000;

// How long an incoming "typing" stays visible without a refresh. Must be
// comfortably longer than EMIT_THROTTLE_MS or the indicator flickers between
// throttled emits, and shorter than a user's patience if the stop is lost.
const PEER_EXPIRY_MS = 5000;

export function useTyping({ socket, conversationId }) {
  const [peerTyping, setPeerTyping] = useState(false);

  const lastEmitAt = useRef(0);
  const stopTimer = useRef(null);
  const expiryTimer = useRef(null);

  const clearTimers = () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    stopTimer.current = null;
    expiryTimer.current = null;
  };

  const emit = useCallback(
    (typing) => {
      if (!socket || !conversationId) return;
      socket.emit("chat:typing", { conversationId, typing });
    },
    [socket, conversationId],
  );

  // Call from the TextInput's onChangeText.
  const onTextChange = useCallback(
    (text) => {
      if (!socket || !conversationId) return;

      // An empty field means they cleared it — treat as stopped immediately
      // rather than waiting out the idle timer.
      if (!text) {
        if (stopTimer.current) clearTimeout(stopTimer.current);
        lastEmitAt.current = 0;
        emit(false);
        return;
      }

      const now = Date.now();
      if (now - lastEmitAt.current > EMIT_THROTTLE_MS) {
        lastEmitAt.current = now;
        emit(true);
      }

      // Push the stop back on every keystroke.
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => {
        lastEmitAt.current = 0;
        emit(false);
      }, STOP_AFTER_IDLE_MS);
    },
    [socket, conversationId, emit],
  );

  // Call right after sending — otherwise the indicator lingers on the other
  // side for a few seconds after the message has already arrived, which looks
  // like a second message is coming.
  const stopTyping = useCallback(() => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    lastEmitAt.current = 0;
    emit(false);
  }, [emit]);

  useEffect(() => {
    if (!socket || !conversationId) return undefined;

    const onPeerTyping = (payload) => {
      if (payload?.conversationId !== conversationId) return;

      if (!payload.typing) {
        setPeerTyping(false);
        if (expiryTimer.current) clearTimeout(expiryTimer.current);
        return;
      }

      setPeerTyping(true);

      // Self-expiring. This is the part that matters: if the peer's socket
      // drops mid-sentence the stop never arrives, and without this the
      // indicator stays on screen indefinitely.
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      expiryTimer.current = setTimeout(
        () => setPeerTyping(false),
        PEER_EXPIRY_MS,
      );
    };

    // A dropped connection means we no longer know anything about the peer's
    // state, so assume not typing rather than leaving a stale indicator up.
    const onDisconnect = () => setPeerTyping(false);

    socket.on("chat:typing", onPeerTyping);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("chat:typing", onPeerTyping);
      socket.off("disconnect", onDisconnect);
      clearTimers();
      // Tell the other side we are gone. Best-effort — if the socket is
      // already down this is a no-op, which is why the expiry above exists.
      emit(false);
      setPeerTyping(false);
    };
  }, [socket, conversationId, emit]);

  return { peerTyping, onTextChange, stopTyping };
}

export default useTyping;

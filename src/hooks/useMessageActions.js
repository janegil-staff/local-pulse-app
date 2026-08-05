// localpulse/app/src/hooks/useMessageActions.js
//
// Hide / unhide / retract / report for a single conversation, plus the socket
// listener that removes a retracted message live.
//
// ONE HOOK, deliberately, and modelled on useTyping. Typing was implemented
// three times across this screen and the store — emit in one place, listener
// in another, render reading a third — and none of the three agreed. Every
// individual piece was correct. Putting all of this in one place is the point
// of the file, not an accident of organisation.
//
// It does NOT reach into chatStore. The caller passes removeMessage and
// restoreMessage — two narrow actions — so state ownership stays in the store
// and this hook cannot disagree with it about what the thread contains.
//
// ── The three mechanisms, which are not variations of each other ──
//
//   hide     MY view only. The other party keeps their copy and is never
//            told — no socket event, by design, because an event saying
//            "message hidden" would leak that you removed something, which is
//            precisely what delete-for-me is not. Reversible via unhide.
//   retract  MY OWN message, gone for BOTH. Irreversible: there is no
//            unretract endpoint and adding one would let someone remove and
//            restore a message around a moderator's read of it. Refused with
//            409 once the message has been reported.
//   report   escalates to the moderation queue. Removes nothing.
//
// Hide and retract must never share a control. One changes your view; the
// other destroys the message for someone else.
//
// ── Error codes the caller should expect ──
//
//   403 not_sender        tried to retract someone else's message. Should be
//                         unreachable from a correct UI — retract is offered
//                         on your own messages only — so it means the UI and
//                         the server disagree about ownership.
//   409 message_reported  under moderation review. The ONLY case where the
//                         confirm dialog's promise does not hold, so it gets
//                         its own sentence rather than a generic failure.
//
// These arrive as err.code, which requires the client.js change that keeps
// code and status on thrown errors. Without it every failure is prose.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

export function useMessageActions({
  socket,
  conversationId,
  removeMessage,
  restoreMessage,
  t,
}) {
  // The message awaiting retract confirmation. Held whole rather than by id so
  // the dialog can show its text without a lookup.
  const [retractFor, setRetractFor] = useState(null);
  // The message being reported, same reasoning.
  const [reportFor, setReportFor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  // Undo applies to HIDE ONLY. Retraction is irreversible and an undo toast
  // after it would offer a button the server has no route for — that shipped
  // once already on web and 404'd.
  const [undoFor, setUndoFor] = useState(null);
  const undoTimer = useRef(null);

  const clearUndo = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndoFor(null);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  // Two narrow store actions rather than a raw setter. chatStore owns the
  // messages array; handing this hook a setState would put two things in
  // charge of one piece of state, which is precisely how typing ended up
  // implemented three times and working none of them.
  const drop = useCallback(
    (id) => {
      removeMessage?.(id);
    },
    [removeMessage],
  );

  // ── Retraction arriving from the other side ────────────
  //
  // Symmetric, so one room event covers both participants and the sender's
  // other devices. Filtered by conversationId because the socket may be joined
  // to more than one room and a retraction in another thread must not mutate
  // this screen's list.
  useEffect(() => {
    if (!socket || !conversationId) return undefined;

    const onRetracted = (payload) => {
      if (String(payload?.conversationId) !== String(conversationId)) return;
      drop(payload.messageId);
    };

    socket.on("chat:message:retracted", onRetracted);
    return () => {
      socket.off("chat:message:retracted", onRetracted);
    };
  }, [socket, conversationId, drop]);

  // ── Hide ───────────────────────────────────────────────
  const hide = useCallback(
    async (msg) => {
      setBusyId(msg.id);
      setError("");
      try {
        await api.hideMessage(msg.id);
        drop(msg.id);

        // Undo lives here because there is no other way back: nothing in the
        // app lists what you have hidden, so a hide without an undo is
        // effectively permanent from the user's side even though the server
        // treats it as reversible.
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndoFor(msg);
        undoTimer.current = setTimeout(() => setUndoFor(null), 6000);
      } catch (e) {
        setError(e?.message || t?.hideFailed || "Could not hide the message.");
      } finally {
        setBusyId(null);
      }
    },
    [drop, t],
  );

  const undoHide = useCallback(async () => {
    const msg = undoFor;
    if (!msg) return;
    clearUndo();
    try {
      await api.unhideMessage(msg.id);
      // restoreMessage re-inserts by createdAt rather than appending: a
      // message restored to the bottom of the thread reads as a new one.
      restoreMessage?.(msg);
    } catch (e) {
      setError(e?.message || t?.undoFailed || "Could not undo.");
    }
  }, [undoFor, clearUndo, restoreMessage, t]);

  // ── Retract ────────────────────────────────────────────
  //
  // Two steps: askRetract opens the confirm, confirmRetract performs it. The
  // dialog is not optional — the action cannot be undone and the copy is the
  // only place the user is told so.
  const askRetract = useCallback((msg) => {
    setError("");
    setRetractFor(msg);
  }, []);

  const cancelRetract = useCallback(() => setRetractFor(null), []);

  const confirmRetract = useCallback(async () => {
    const msg = retractFor;
    if (!msg) return;
    setRetractFor(null);
    setBusyId(msg.id);

    try {
      await api.retractMessage(msg.id);
      // Dropped locally as well as over the socket: the server's emit excludes
      // nobody, but relying on a round trip to update the screen that caused
      // the change makes the UI feel broken on a slow connection.
      drop(msg.id);
    } catch (e) {
      if (e?.code === "message_reported") {
        setError(
          t?.retractReported ||
            "This message has been reported and cannot be retracted.",
        );
      } else if (e?.code === "not_sender") {
        // Should be unreachable — retract is offered on own messages only.
        setError(e.message);
      } else {
        setError(
          e?.message || t?.retractFailed || "Could not retract the message.",
        );
      }
    } finally {
      setBusyId(null);
    }
  }, [retractFor, drop, t]);

  // ── Report ─────────────────────────────────────────────
  //
  // Removes nothing. A reported message stays exactly where it is, which is
  // what makes the moderation queue worth having — and it is also why
  // retraction refuses afterwards.
  const askReport = useCallback((msg) => {
    setError("");
    setReportFor(msg);
  }, []);

  const cancelReport = useCallback(() => setReportFor(null), []);

  const submitReport = useCallback(
    async ({ reason, note }) => {
      const msg = reportFor;
      if (!msg) return null;
      if (!reason) {
        setError(t?.reasonRequired || "Choose a reason.");
        return null;
      }
      setBusyId(msg.id);
      try {
        const res = await api.reportMessage(msg.id, { reason, note });
        setReportFor(null);
        return res;
      } catch (e) {
        setError(e?.message || t?.reportFailed || "Could not send the report.");
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [reportFor, t],
  );

  return {
    hide,
    undoFor,
    undoHide,
    clearUndo,

    askRetract,
    retractFor,
    cancelRetract,
    confirmRetract,

    askReport,
    reportFor,
    cancelReport,
    submitReport,

    busyId,
    error,
    clearError: () => setError(""),
  };
}

export default useMessageActions;

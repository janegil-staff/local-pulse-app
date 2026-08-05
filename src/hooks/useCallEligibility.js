// local-pulse-app/src/hooks/useCallEligibility.js

import { useMemo } from "react";
import { useCall, CALL_PHASE } from "../context/CallContext";
import { getChatSocket } from "../api/socket.js";
import { useAuth } from "../context/AuthContext";

/**
 * Single source of truth for "may this user start a call here?".
 *
 * Qup Pulse surfaces strangers by proximity, so calling is deliberately NOT
 * available the moment two people are matched. It unlocks only once there is
 * an actual established thread — both sides have sent at least one message.
 * That one rule removes the worst failure mode of live video in a discovery
 * app: cold-calling someone who has never spoken to you.
 *
 * Keep this the only place the rule lives. If the call button and the server
 * disagree about eligibility, the server wins and the user sees a confusing
 * error — so `call:invite` in local-pulse-api should enforce the same checks.
 *
 * ASSUMPTIONS — adjust to the real Conversation shape:
 *   - conversation.participants: array of user objects or ids
 *   - conversation.isBlocked / conversation.blockedBy for block state
 *   - conversation.senderIds: ids that have sent at least one message.
 *     If that field does not exist, derive it server-side and add it to the
 *     conversation payload — counting messages on the client is not reliable
 *     once pagination is involved.
 */

export const CALL_INELIGIBLE = {
  NOT_ONE_TO_ONE: "not_one_to_one",
  NOT_ESTABLISHED: "not_established",
  BLOCKED: "blocked",
  OFFLINE: "offline",
  ALREADY_IN_CALL: "already_in_call",
};

export default function useCallEligibility(conversation) {
  const socket = getChatSocket();
  const { user } = useAuth();
  const { phase } = useCall();

  return useMemo(() => {
    const deny = (reason) => ({ canCall: false, reason, peer: null });

    if (!conversation || !user) return deny(CALL_INELIGIBLE.NOT_ESTABLISHED);

    const participants = conversation.participants || [];
    if (participants.length !== 2) return deny(CALL_INELIGIBLE.NOT_ONE_TO_ONE);

    const currentUserId = String(user.id ?? user._id);
    const peer = participants.find(
      (participant) =>
        String(participant?._id ?? participant) !== currentUserId,
    );
    if (!peer) return deny(CALL_INELIGIBLE.NOT_ONE_TO_ONE);

    if (conversation.isBlocked || conversation.blockedBy) {
      return deny(CALL_INELIGIBLE.BLOCKED);
    }

    // Both sides must have spoken. A one-sided thread is not a relationship.
    const senderIds = (conversation.senderIds || []).map(String);
    const peerId = String(peer?._id ?? peer);
    const established =
      senderIds.includes(currentUserId) && senderIds.includes(peerId);

    if (!established) return deny(CALL_INELIGIBLE.NOT_ESTABLISHED);

    if (phase !== CALL_PHASE.IDLE) return deny(CALL_INELIGIBLE.ALREADY_IN_CALL);
    if (!socket?.connected) return deny(CALL_INELIGIBLE.OFFLINE);

    return { canCall: true, reason: null, peer };
  }, [conversation, user, socket, phase]);
}

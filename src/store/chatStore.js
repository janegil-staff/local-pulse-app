// localpulse/app/src/store/chatStore.js
import { create } from "zustand";
import { api } from "../api/client.js";
import { connectChatSocket, getChatSocket } from "../api/socket.js";
import { Alert } from "react-native";

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [], // for the active conversation
  activeId: null,
  activeStatus: null, // status of the active conversation ('pending'|'accepted')
  typingUserId: null,
  unread: 0, // unread messages in accepted conversations
  requestCount: 0, // pending message requests awaiting your response
  bound: false,
  sendingImage: false,

  // Wire socket listeners once, after login.
  initSocket: () => {
    if (get().bound) return;
    console.log("[chatStore] initSocket: connecting…");
    const s = connectChatSocket();
    console.log(
      "[chatStore] initSocket: got socket, connected =",
      s?.connected,
    );

    s.on("connect", () =>
      console.log("[chatStore] socket connect, id =", s.id),
    );
    s.on("connect_error", (e) =>
      console.log("[chatStore] socket connect_error:", e?.message),
    );
    s.on("disconnect", (r) => console.log("[chatStore] socket disconnect:", r));

    // Inbound live messages. The server broadcasts chat:message to the whole
    // conversation room — INCLUDING the sender — so a message we just sent over
    // REST is echoed back here too. Dedup by id so our optimistic append (in
    // send()) and this echo don't produce a doubled bubble.
    s.on("chat:message", (msg) => {
      const st = get();
      const isActive = String(msg.conversationId) === String(st.activeId);
      const exists = st.messages.some((m) => String(m.id) === String(msg.id));
      const preview = msg.text || "📷";
      set({
        messages: isActive && !exists ? [...st.messages, msg] : st.messages,
        conversations: st.conversations.map((c) =>
          String(c.id) === String(msg.conversationId)
            ? { ...c, lastMessage: preview, lastMessageAt: msg.createdAt }
            : c,
        ),
      });
    });

    s.on("chat:notify", ({ conversationId }) => {
      const st = get();
      console.log("[chatStore] chat:notify received");
      if (String(conversationId) === String(st.activeId)) return;
      get().refreshUnread();
    });

    // CHAT_ACCEPTED_V1 — the recipient accepting a request flips the
    // conversation to 'accepted' server-side and emits chat:accepted to BOTH
    // participants (each user's personal room). Update local status if this is
    // the open conversation, and reload lists so the row moves from Requests
    // into Messages on both sides.
    s.on("chat:accepted", ({ conversationId }) => {
      const st = get();
      console.log("[chatStore] chat:accepted for", conversationId);
      if (String(conversationId) === String(st.activeId)) {
        set({ activeStatus: "accepted" });
      }
      get()
        .loadConversations()
        .catch(() => {});
      get().refreshUnread();
    });

    // src/store/chatStore.js, around line 79
    // No chat:typing listener here on purpose. useTyping owns typing:
    // it filters by conversationId, throttles the emit, and expires a
    // stale indicator. The version that lived here did none of that and
    // its clear-timeout compared against the LOCAL user id, so it could
    // never clear what it set.

    set({ bound: true });
    console.log("[chatStore] initSocket: bound listeners, priming unread…");
    get().refreshUnread();
  },

  refreshUnread: async () => {
    try {
      // ONE call. The endpoint returns both numbers, scoped so they never
      // double-count: `count` covers accepted conversations, `requestCount`
      // covers pending ones awaiting your approval.
      //
      // This previously made a second call to getRequests() and counted the
      // array — two endpoints, two chances to disagree, and its catch block
      // swallowed failures so a broken request list looked identical to an
      // empty one.
      const { count, requestCount } = await api.getChatUnreadCount();

      console.log("[chatStore] refreshUnread:", { count, requestCount });

      set({
        unread: count || 0,
        requestCount: requestCount || 0,
      });
    } catch (e) {
      // Left visible on purpose. A silent failure here is indistinguishable
      // from "nothing waiting", which is exactly the state that hid this bug.
      console.log("[chatStore] refreshUnread failed:", e?.message);
    }
  },

  loadConversations: async () => {
    const { conversations } = await api.getConversations();
    set({ conversations });
  },

  openConversation: async (userId) => {
    const { conversationId } = await api.openConversation(userId);
    return conversationId;
  },

  enterConversation: async (conversationId) => {
    set({ activeId: conversationId, messages: [], activeStatus: null });
    const s = connectChatSocket();
    s.emit("chat:join", { conversationId });
    const res = await api.getMessages(conversationId);
    set({
      messages: res.messages ?? [],
      // getMessages returns conversation: { id, status, initiator } — seed the
      // active status so the input knows whether the chat is pending/accepted.
      activeStatus: res.conversation?.status ?? null,
    });
    try {
      await api.markConversationRead(conversationId);
      get().refreshUnread();
    } catch {
      /* ignore */
    }
  },

  // Re-fetch the active conversation's messages and merge by id. Fallback for
  // unreliable socket delivery (notably Android): ChatScreen polls this while
  // open so a message that never arrived via chat:message still shows up.
  // Merge-by-id means already-present messages aren't duplicated or reordered,
  // and locally-optimistic sends stay put.
  refetchActiveMessages: async () => {
    const { activeId } = get();
    if (!activeId) return;
    try {
      const res = await api.getMessages(activeId);
      const incoming = res.messages ?? [];
      set((st) => {
        // Only apply if still on the same conversation.
        if (String(st.activeId) !== String(activeId)) return {};
        if (!incoming.length) {
          return { activeStatus: res.conversation?.status ?? st.activeStatus };
        }
        // Server returns oldest-first. Start from the authoritative server list,
        // then keep any locally-optimistic messages not yet returned by the
        // server (e.g. just-sent, echo pending) appended in their existing order.
        const incomingIds = new Set(incoming.map((m) => String(m.id)));
        const localOnly = st.messages.filter(
          (m) => !incomingIds.has(String(m.id)),
        );
        return {
          messages: [...incoming, ...localOnly],
          activeStatus: res.conversation?.status ?? st.activeStatus,
        };
      });
    } catch {
      /* transient — next poll retries */
    }
  },

  // Recipient accepts a pending request. Optimistically flip local status so
  // the input unlocks immediately; the server also emits chat:accepted which
  // reconciles both sides.
  acceptActive: async () => {
    const { activeId } = get();
    if (!activeId) return;
    try {
      await api.acceptConversation(activeId);
      set({ activeStatus: "accepted" });
      get()
        .loadConversations()
        .catch(() => {});
      get().refreshUnread();
    } catch (e) {
      Alert.alert("", e?.message || "Could not accept");
    }
  },

  leaveConversation: () => {
    const { activeId } = get();
    const s = getChatSocket();
    if (activeId) s?.emit("chat:leave", { conversationId: activeId });
    set({
      activeId: null,
      messages: [],
      typingUserId: null,
      activeStatus: null,
    });
  },

  // Send a text message over REST — the reliable path on both platforms.
  //
  // WHY NOT socket.emit('chat:send'): on Android the websocket is frequently
  // suspended/dropped (OS backgrounding, flaky transport). emit() into a
  // disconnected socket is SILENTLY dropped — no ack, no error, message lost.
  // The server treats POST /conversations/:id/messages as the single source of
  // truth (persists AND broadcasts chat:message to both sides), so REST loses
  // nothing. The chat:message listener appends the echoed copy; we dedup by id.
  send: async (text, labels = {}) => {
    const { activeId } = get();
    if (!activeId || !text.trim()) return;
    const bodyText = text.trim();
    try {
      const res = await api.sendMessage(activeId, { text: bodyText });
      const msg = res?.message;
      // Optimistic append (deduped) so the sender sees it instantly even if the
      // socket echo is slow or the socket is down.
      if (msg) {
        set((st) => {
          const exists = st.messages.some(
            (m) => String(m.id) === String(msg.id),
          );
          const isActive =
            String(msg.conversationId ?? activeId) === String(st.activeId);
          return {
            messages: isActive && !exists ? [...st.messages, msg] : st.messages,
            conversations: st.conversations.map((c) =>
              String(c.id) === String(activeId)
                ? {
                    ...c,
                    lastMessage: msg.text || "📷",
                    lastMessageAt: msg.createdAt,
                  }
                : c,
            ),
          };
        });
      }
    } catch (e) {
      // The server returns a TRANSLATION KEY for anything the user can act on
      // (chatPendingLimit, chatPendingRecipient) — not an English sentence.
      // The old code regex-matched prose, which broke the moment the server
      // switched to keys, and could never have worked once those sentences
      // were localised.
      const key = e?.message || "";
      const body = labels[key] || labels.default || key || "Could not send";
      Alert.alert(labels.title || "", body);
    }
  },

  sendImage: async (uri) => {
    const { activeId } = get();
    if (!activeId) return "No conversation";
    set({ sendingImage: true });
    try {
      const res = await api.uploadImage(uri);
      const imageUrl = typeof res === "string" ? res : res?.url;
      if (!imageUrl) return "Upload failed";
      // Send the image message over REST too, same reliability reason as text.
      const sent = await api.sendMessage(activeId, { imageUrl });
      const msg = sent?.message;
      if (msg) {
        set((st) => {
          const exists = st.messages.some(
            (m) => String(m.id) === String(msg.id),
          );
          const isActive =
            String(msg.conversationId ?? activeId) === String(st.activeId);
          return {
            messages: isActive && !exists ? [...st.messages, msg] : st.messages,
            conversations: st.conversations.map((c) =>
              String(c.id) === String(activeId)
                ? { ...c, lastMessage: "📷", lastMessageAt: msg.createdAt }
                : c,
            ),
          };
        });
      }
      return null;
    } catch (e) {
      return e?.message || "Upload failed";
    } finally {
      set({ sendingImage: false });
    }
  },
  // Called from AuthContext.logout(). Without this the counts, conversations
  // and socket binding survive into the next login — the new user sees the
  // previous one's badge, and initSocket() no-ops because bound is still true,
  // so the listeners stay attached to a socket authenticated as someone else.
  // ── Message visibility ────────────────────────────────────
  //
  // Used by useMessageActions for hide and retract. Deliberately narrow:
  // the hook removes one message or restores one, and nothing else in the
  // app should be reaching into this array.
  //
  // These change the LOCAL list only. The server call is the hook's job,
  // and hiding never emits a socket event by design — the other party must
  // not learn that you removed their message from your view.
  removeMessage: (id) =>
    set((s) => ({
      messages: s.messages.filter((x) => String(x.id) !== String(id)),
    })),

  // Re-inserted in createdAt order, not appended. A restored message at the
  // bottom of the thread reads as a new one from the other person.
  //
  // A no-op if it is already present, so a double undo cannot duplicate it.
  restoreMessage: (msg) =>
    set((s) => {
      if (!msg) return {};
      if (s.messages.some((x) => String(x.id) === String(msg.id))) return {};
      const next = [...s.messages, msg];
      next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return { messages: next };
    }),

  reset: () => {
    const s = getChatSocket();
    if (s) s.removeAllListeners();
    set({
      conversations: [],
      messages: [],
      activeId: null,
      activeStatus: null,
      typingUserId: null,
      unread: 0,
      requestCount: 0,
      bound: false,
      sendingImage: false,
    });
  },
  emitTyping: () => {
    const { activeId } = get();
    getChatSocket()?.emit("chat:typing", { conversationId: activeId });
  },
}));

// localpulse/app/src/store/chatStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';
import { connectChatSocket, getChatSocket } from '../api/socket.js';
import { Alert } from 'react-native';

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [],        // for the active conversation
  activeId: null,
  activeStatus: null,  // status of the active conversation ('pending'|'accepted')
  typingUserId: null,
  unread: 0,           // unread messages in accepted conversations
  requestCount: 0,     // pending message requests awaiting your response
  bound: false,
  sendingImage: false,

  // Wire socket listeners once, after login.
  initSocket: () => {
    if (get().bound) return;
    console.log('[chatStore] initSocket: connecting…');
    const s = connectChatSocket();
    console.log('[chatStore] initSocket: got socket, connected =', s?.connected);

    s.on('connect', () => console.log('[chatStore] socket connect, id =', s.id));
    s.on('connect_error', (e) => console.log('[chatStore] socket connect_error:', e?.message));
    s.on('disconnect', (r) => console.log('[chatStore] socket disconnect:', r));

    // Inbound live messages. The server broadcasts chat:message to the whole
    // conversation room — INCLUDING the sender — so a message we just sent over
    // REST is echoed back here too. Dedup by id so our optimistic append (in
    // send()) and this echo don't produce a doubled bubble.
    s.on('chat:message', (msg) => {
      const st = get();
      const isActive = String(msg.conversationId) === String(st.activeId);
      const exists = st.messages.some((m) => String(m.id) === String(msg.id));
      const preview = msg.text || '📷';
      set({
        messages: isActive && !exists ? [...st.messages, msg] : st.messages,
        conversations: st.conversations.map((c) =>
          String(c.id) === String(msg.conversationId)
            ? { ...c, lastMessage: preview, lastMessageAt: msg.createdAt }
            : c
        ),
      });
    });

    s.on('chat:notify', ({ conversationId }) => {
      const st = get();
      console.log('[chatStore] chat:notify received');
      if (String(conversationId) === String(st.activeId)) return;
      get().refreshUnread();
    });

    // CHAT_ACCEPTED_V1 — the recipient accepting a request flips the
    // conversation to 'accepted' server-side and emits chat:accepted to BOTH
    // participants (each user's personal room). Update local status if this is
    // the open conversation, and reload lists so the row moves from Requests
    // into Messages on both sides.
    s.on('chat:accepted', ({ conversationId }) => {
      const st = get();
      console.log('[chatStore] chat:accepted for', conversationId);
      if (String(conversationId) === String(st.activeId)) {
        set({ activeStatus: 'accepted' });
      }
      get().loadConversations().catch(() => {});
      get().refreshUnread();
    });

    s.on('chat:typing', ({ userId }) => {
      set({ typingUserId: userId });
      setTimeout(() => set((st) => (st.typingUserId === userId ? { typingUserId: null } : {})), 2500);
    });

    set({ bound: true });
    console.log('[chatStore] initSocket: bound listeners, priming unread…');
    get().refreshUnread();
  },

  refreshUnread: async () => {
    try {
      const { count } = await api.getChatUnreadCount();
      console.log('[chatStore] refreshUnread: server count =', count);
      set({ unread: count || 0 });
    } catch (e) {
      console.log('[chatStore] refreshUnread failed:', e?.message);
    }
    try {
      const { requests } = await api.getRequests();
      console.log('[chatStore] refreshUnread: requests =', (requests ?? []).length);
      set({ requestCount: (requests ?? []).length });
    } catch (e) {
      console.log('[chatStore] refreshUnread requests failed:', e?.message);
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
    s.emit('chat:join', { conversationId });
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
    } catch { /* ignore */ }
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
        const localOnly = st.messages.filter((m) => !incomingIds.has(String(m.id)));
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
      set({ activeStatus: 'accepted' });
      get().loadConversations().catch(() => {});
      get().refreshUnread();
    } catch (e) {
      Alert.alert('', e?.message || 'Could not accept');
    }
  },

  leaveConversation: () => {
    const { activeId } = get();
    const s = getChatSocket();
    if (activeId) s?.emit('chat:leave', { conversationId: activeId });
    set({ activeId: null, messages: [], typingUserId: null, activeStatus: null });
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
          const exists = st.messages.some((m) => String(m.id) === String(msg.id));
          const isActive = String(msg.conversationId ?? activeId) === String(st.activeId);
          return {
            messages: isActive && !exists ? [...st.messages, msg] : st.messages,
            conversations: st.conversations.map((c) =>
              String(c.id) === String(activeId)
                ? { ...c, lastMessage: msg.text || '📷', lastMessageAt: msg.createdAt }
                : c
            ),
          };
        });
      }
    } catch (e) {
      const m = e?.message || '';
      const code =
        /accept the request/i.test(m) ? 'PENDING_RECIPIENT' :
        /wait for your request/i.test(m) ? 'PENDING_LIMIT' : null;
      const body =
        (code && labels[code]) ||
        labels.default ||
        m ||
        'Could not send';
      Alert.alert(labels.title || '', body);
    }
  },

  sendImage: async (uri) => {
    const { activeId } = get();
    if (!activeId) return 'No conversation';
    set({ sendingImage: true });
    try {
      const res = await api.uploadImage(uri);
      const imageUrl = typeof res === 'string' ? res : res?.url;
      if (!imageUrl) return 'Upload failed';
      // Send the image message over REST too, same reliability reason as text.
      const sent = await api.sendMessage(activeId, { imageUrl });
      const msg = sent?.message;
      if (msg) {
        set((st) => {
          const exists = st.messages.some((m) => String(m.id) === String(msg.id));
          const isActive = String(msg.conversationId ?? activeId) === String(st.activeId);
          return {
            messages: isActive && !exists ? [...st.messages, msg] : st.messages,
            conversations: st.conversations.map((c) =>
              String(c.id) === String(activeId)
                ? { ...c, lastMessage: '📷', lastMessageAt: msg.createdAt }
                : c
            ),
          };
        });
      }
      return null;
    } catch (e) {
      return e?.message || 'Upload failed';
    } finally {
      set({ sendingImage: false });
    }
  },

  emitTyping: () => {
    const { activeId } = get();
    getChatSocket()?.emit('chat:typing', { conversationId: activeId });
  },
}));
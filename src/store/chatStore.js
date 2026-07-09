// localpulse/app/src/store/chatStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';
import { connectChatSocket, getChatSocket } from '../api/socket.js';

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [],        // for the active conversation
  activeId: null,
  typingUserId: null,
  unread: 0,           // unread messages in accepted conversations
  requestCount: 0,     // pending message requests awaiting your response
  bound: false,
  sendingImage: false,

  // Wire socket listeners once, after login.
  initSocket: () => {
    if (get().bound) return;
    const s = connectChatSocket();

    s.on('chat:message', (msg) => {
      const st = get();
      const isActive = String(msg.conversationId) === String(st.activeId);
      // An image message has no text — fall back to the server's marker so the
      // conversation row doesn't go blank.
      const preview = msg.text || '📷';
      set({
        messages: isActive ? [...st.messages, msg] : st.messages,
        conversations: st.conversations.map((c) =>
          String(c.id) === String(msg.conversationId)
            ? { ...c, lastMessage: preview, lastMessageAt: msg.createdAt }
            : c
        ),
      });
    });

    // Incoming notification → bump the badge. Requests count too: a pending
    // conversation still needs the user's attention.
    s.on('chat:notify', ({ conversationId, pending }) => {
      const st = get();
      if (String(conversationId) === String(st.activeId)) return; // you're reading it
      if (pending) {
        set({ requestCount: st.requestCount + 1 });
      } else {
        set({ unread: st.unread + 1 });
      }
    });

    s.on('chat:typing', ({ userId }) => {
      set({ typingUserId: userId });
      setTimeout(() => set((st) => (st.typingUserId === userId ? { typingUserId: null } : {})), 2500);
    });

    set({ bound: true });
    // Prime the unread total from the server.
    get().refreshUnread();
  },

  refreshUnread: async () => {
    try {
      const { count } = await api.getChatUnreadCount();
      set({ unread: count || 0 });
    } catch { /* ignore */ }
    // Also refresh how many pending requests are waiting.
    try {
      const { requests } = await api.getRequests();
      set({ requestCount: (requests ?? []).length });
    } catch { /* ignore */ }
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
    set({ activeId: conversationId, messages: [] });
    const s = getChatSocket();
    s?.emit('chat:join', { conversationId });
    const { messages } = await api.getMessages(conversationId);
    set({ messages });
    // Mark this conversation read, then refresh the unread total.
    try {
      await api.markConversationRead(conversationId);
      get().refreshUnread();
    } catch { /* ignore */ }
  },

  leaveConversation: () => {
    const { activeId } = get();
    const s = getChatSocket();
    if (activeId) s?.emit('chat:leave', { conversationId: activeId });
    set({ activeId: null, messages: [], typingUserId: null });
  },

  send: (text) => {
    const { activeId } = get();
    const s = getChatSocket();
    if (!activeId || !text.trim()) return;
    s?.emit('chat:send', { conversationId: activeId, text: text.trim() });
  },

  // Upload first, then emit the resulting URL. Returns an error string on
  // failure rather than throwing, because the caller renders it in an Alert.
  // The server rejects images on pending conversations — that error surfaces
  // here via the ack.
  sendImage: async (uri) => {
    const { activeId } = get();
    if (!activeId) return 'No conversation';
    set({ sendingImage: true });
    try {
      const res = await api.uploadImage(uri);
      const imageUrl = typeof res === 'string' ? res : res?.url;
      if (!imageUrl) return 'Upload failed';

      const s = getChatSocket();
      if (!s) return 'Not connected';

      // Wait for the ack so a rejection (pending conversation, block) reaches
      // the user instead of vanishing.
      const ack = await new Promise((resolve) => {
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; resolve(v); } };
        s.emit('chat:sendImage', { conversationId: activeId, imageUrl }, done);
        setTimeout(() => done({ error: 'Send timed out' }), 15000);
      });

      return ack?.error ?? null;
    } catch (e) {
      return e?.message ?? 'Upload failed';
    } finally {
      set({ sendingImage: false });
    }
  },

  emitTyping: () => {
    const { activeId } = get();
    getChatSocket()?.emit('chat:typing', { conversationId: activeId });
  },
}));
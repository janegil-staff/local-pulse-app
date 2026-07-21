// localpulse/app/src/store/chatStore.js
import { create } from 'zustand';
import Toast from 'react-native-toast-message';
import { api } from '../api/client.js';
import { connectChatSocket, getChatSocket } from '../api/socket.js';
import { Alert } from 'react-native';

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
    console.log('[chatStore] initSocket: connecting…');
    const s = connectChatSocket();
    console.log('[chatStore] initSocket: got socket, connected =', s?.connected);

    s.on('connect', () => console.log('[chatStore] socket connect, id =', s.id));
    s.on('connect_error', (e) => console.log('[chatStore] socket connect_error:', e?.message));
    s.on('disconnect', (r) => console.log('[chatStore] socket disconnect:', r));

    s.on('chat:message', (msg) => {
      const st = get();
      const isActive = String(msg.conversationId) === String(st.activeId);
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

    s.on('chat:notify', ({ conversationId }) => {
      const st = get();
      console.log('[chatStore] chat:notify received');
      if (String(conversationId) === String(st.activeId)) return;
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
    set({ activeId: conversationId, messages: [] });
    const s = connectChatSocket();
    s.emit('chat:join', { conversationId });
    const { messages } = await api.getMessages(conversationId);
    set({ messages });
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


send: (text, labels = {}) => {
    const { activeId } = get();
    const s = getChatSocket();
    if (!activeId || !text.trim()) return;
    s?.emit('chat:send', { conversationId: activeId, text: text.trim() }, (ack) => {
      console.log('[chatStore] send ack:', ack);
      if (ack?.error) {
        // Localized: the screen passes these in via labels (store can't use
        // useLang). Default to the pending-limit explanation, then generic.
        const body =
          (ack.code && labels[ack.code]) ||
          labels.PENDING_LIMIT ||
          labels.default ||
          ack.error;
        Alert.alert(labels.title || '', body);
      }
    });
  },

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
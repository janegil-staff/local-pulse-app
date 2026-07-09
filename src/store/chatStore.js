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

  // Wire socket listeners once, after login.
  initSocket: () => {
    if (get().bound) return;
    const s = connectChatSocket();

    s.on('chat:message', (msg) => {
      const st = get();
      const isActive = String(msg.conversationId) === String(st.activeId);
      set({
        messages: isActive ? [...st.messages, msg] : st.messages,
        conversations: st.conversations.map((c) =>
          String(c.id) === String(msg.conversationId)
            ? { ...c, lastMessage: msg.text, lastMessageAt: msg.createdAt }
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

  emitTyping: () => {
    const { activeId } = get();
    getChatSocket()?.emit('chat:typing', { conversationId: activeId });
  },
}));
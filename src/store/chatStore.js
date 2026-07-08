// localpulse/app/src/store/chatStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';
import { connectChatSocket, getChatSocket } from '../api/socket.js';

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [],        // for the active conversation
  activeId: null,
  typingUserId: null,
  bound: false,

  // Wire socket listeners once, after login.
  initSocket: () => {
    if (get().bound) return;
    const s = connectChatSocket();

    s.on('chat:message', (msg) => {
      // Append if it's the active conversation; always bump the list preview.
      set((st) => ({
        messages:
          String(msg.conversationId) === String(st.activeId)
            ? [...st.messages, msg]
            : st.messages,
        conversations: st.conversations.map((c) =>
          String(c.id) === String(msg.conversationId)
            ? { ...c, lastMessage: msg.text, lastMessageAt: msg.createdAt }
            : c
        ),
      }));
    });

    s.on('chat:typing', ({ userId }) => {
      set({ typingUserId: userId });
      setTimeout(() => set((st) => (st.typingUserId === userId ? { typingUserId: null } : {})), 2500);
    });

    set({ bound: true });
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

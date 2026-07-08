// localpulse/app/src/store/notificationStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const { notifications } = await api.getNotifications();
      set({ notifications, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  refreshUnread: async () => {
    try {
      const { count } = await api.getUnreadCount();
      set({ unreadCount: count });
    } catch {
      /* ignore */
    }
  },

  markAllRead: async () => {
    try {
      await api.markNotificationsRead();
      set((s) => ({
        unreadCount: 0,
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      }));
    } catch {
      /* ignore */
    }
  },
}));

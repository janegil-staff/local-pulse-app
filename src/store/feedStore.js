// localpulse/app/src/store/feedStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';

export const useFeedStore = create((set, get) => ({
  posts: [],
  loading: false,
  refreshing: false,
  error: null,
  coords: null, // { lng, lat } when location is available

  setCoords: (coords) => set({ coords }),

  loadFeed: async ({ refresh = false } = {}) => {
    set(refresh ? { refreshing: true, error: null } : { loading: true, error: null });
    try {
      const { coords } = get();
      const params = coords ? { lng: coords.lng, lat: coords.lat } : {};
      const { posts } = await api.getFeed(params);
      set({ posts, loading: false, refreshing: false });
    } catch (e) {
      set({ error: e.message, loading: false, refreshing: false });
    }
  },

  createPost: async (payload) => {
    try {
      const { coords } = get();
      const body = coords ? { ...payload, lng: coords.lng, lat: coords.lat } : payload;
      const { post } = await api.createPost(body);
      set((s) => ({ posts: [post, ...s.posts] })); // prepend new post
      return true;
    } catch (e) {
      set({ error: e.message });
      return false;
    }
  },

  // Optimistic like: flip UI immediately, reconcile with server, revert on error.
  toggleLike: async (id) => {
    const prev = get().posts;
    set({
      posts: prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p
      ),
    });
    try {
      const { likedByMe, likeCount } = await api.toggleLike(id);
      set((s) => ({
        posts: s.posts.map((p) => (p.id === id ? { ...p, likedByMe, likeCount } : p)),
      }));
    } catch {
      set({ posts: prev }); // revert
    }
  },

  // Optimistic save toggle.
  toggleSave: async (id) => {
    const prev = get().posts;
    set({ posts: prev.map((p) => (p.id === id ? { ...p, savedByMe: !p.savedByMe } : p)) });
    try {
      const { saved } = await api.toggleSave(id);
      set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, savedByMe: saved } : p)) }));
    } catch {
      set({ posts: prev });
    }
  },
}));

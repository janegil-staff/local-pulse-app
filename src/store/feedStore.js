// localpulse/app/src/store/feedStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';
import Toast from 'react-native-toast-message';

// How many posts to request per page. The server should honour a `limit` and a
// `before` cursor (ISO timestamp of the oldest post already shown) and return
// posts strictly older than it, newest-first. See getFeed notes at the bottom.
const PAGE_SIZE = 20;

export const useFeedStore = create((set, get) => ({
  posts: [],
  loading: false,
  refreshing: false,
  loadingMore: false,   // a "load older" page is in flight
  hasMore: true,        // false once the server returns a short/empty page
  error: null,
  coords: null,         // { lng, lat } when location is available

  setCoords: (coords) => set({ coords }),

  loadFeed: async ({ refresh = false } = {}) => {
    set(refresh ? { refreshing: true, error: null } : { loading: true, error: null });
    try {
      const { coords } = get();
      const params = { limit: PAGE_SIZE };
      if (coords) { params.lng = coords.lng; params.lat = coords.lat; }
      const { posts } = await api.getFeed(params);
      // Fresh load replaces the list and resets pagination. If the first page
      // came back full, assume there may be more; if short, we're at the end.
      set({
        posts,
        hasMore: posts.length >= PAGE_SIZE,
        loading: false,
        refreshing: false,
      });
    } catch (e) {
      set({ error: e.message, loading: false, refreshing: false });
    }
  },

  // Fetch the next (older) page and APPEND it. No-op if already loading, if
  // there's nothing more, or if the list is empty (nothing to page from).
  loadMore: async () => {
    const { posts, loadingMore, hasMore, coords } = get();
    if (loadingMore || !hasMore || posts.length === 0) return;

    // Cursor = createdAt of the oldest post we currently hold. The server
    // returns posts strictly older than this.
    const before = posts[posts.length - 1]?.createdAt;
    if (!before) return;

    set({ loadingMore: true });
    try {
      const params = { limit: PAGE_SIZE, before };
      if (coords) { params.lng = coords.lng; params.lat = coords.lat; }
      const { posts: older } = await api.getFeed(params);

      // De-dupe against what we already have (guards against a boundary post
      // repeating if two share the same createdAt).
      const seen = new Set(get().posts.map((p) => p.id));
      const fresh = (older || []).filter((p) => !seen.has(p.id));

      set((s) => ({
        posts: [...s.posts, ...fresh],
        // Out of pages when the server returns fewer than a full page.
        hasMore: (older?.length || 0) >= PAGE_SIZE,
        loadingMore: false,
      }));
    } catch (e) {
      // Don't surface a blocking error for pagination — just stop trying.
      set({ loadingMore: false });
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

  // Optimistic save toggle. `labels` carries the localized toast strings from
  // the calling component (the store can't reach useLang). Toast reflects the
  // actual server result, so it's honest about save vs un-save.
  toggleSave: async (id, labels) => {
    const prev = get().posts;
    const wasSaved = prev.find((p) => p.id === id)?.savedByMe;
    set({ posts: prev.map((p) => (p.id === id ? { ...p, savedByMe: !p.savedByMe } : p)) });
    try {
      const { saved } = await api.toggleSave(id);
      set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, savedByMe: saved } : p)) }));
      if (labels) {
        Toast.show({
          type: 'success',
          text1: saved ? labels.saved : labels.unsaved,
          position: 'bottom',
          visibilityTime: 1500,
        });
      }
      return { saved };
    } catch {
      set({ posts: prev });
      if (labels) {
        Toast.show({ type: 'error', text1: labels.failed, position: 'bottom', visibilityTime: 1500 });
      }
      return { saved: wasSaved };
    }
  },
}));
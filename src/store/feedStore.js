// localpulse/app/src/store/feedStore.js
import { create } from "zustand";
import { api } from "../api/client.js";
import Toast from "react-native-toast-message";
import { useProfileStore } from "./profileStore.js";

// How many posts to request per page. The server should honour a `limit` and a
// `before` cursor (ISO timestamp of the oldest post already shown) and return
// posts strictly older than it, newest-first.
const PAGE_SIZE = 20;

// "Anywhere" (preferences.maxDistanceKm === null) means no distance limit —
// globally, not just a wide radius. The server returns an unfiltered feed when
// no coordinates are sent, so honouring the setting is a matter of omitting
// them rather than sending a huge radius.
//
// Read from the profile store rather than passed in as an argument, so every
// caller gets the same answer and none of them can forget to pass it.
//
// `undefined` counts as Anywhere too: accounts created before maxDistanceKm
// existed have no value, and the schema default is null — the server already
// treats both as "no limit", so the client must agree or the two disagree
// about what the user asked for.
function wantsAnywhere() {
  const prefs = useProfileStore.getState().profile?.preferences;
  return prefs?.maxDistanceKm === null || prefs?.maxDistanceKm === undefined;
}

// Adds lng/lat unless the user has asked for Anywhere. One helper so loadFeed
// and loadMore cannot drift — paging with a different filter than the first
// page produced is a confusing bug to find.
function withLocation(params, coords) {
  if (coords && !wantsAnywhere()) {
    return { ...params, lng: coords.lng, lat: coords.lat };
  }
  return params;
}

export const useFeedStore = create((set, get) => ({
  posts: [],
  loading: false,
  refreshing: false,
  loadingMore: false, // a "load older" page is in flight
  hasMore: true, // false once the server returns a short/empty page
  error: null,
  coords: null, // { lng, lat } when location is available

  setCoords: (coords) => set({ coords }),

  loadFeed: async ({ refresh = false } = {}) => {
    set(
      refresh
        ? { refreshing: true, error: null }
        : { loading: true, error: null },
    );
    try {
      const { coords } = get();
      const params = withLocation({ limit: PAGE_SIZE }, coords);

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
      const params = withLocation({ limit: PAGE_SIZE, before }, coords);
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

  // NOTE: createPost deliberately does NOT use withLocation().
  //
  // A post's coordinates are where it was MADE, not a browsing preference.
  // Stripping them for an Anywhere user would file every one of their posts
  // with no location at all, and it would then never appear in anyone's
  // nearby feed — including their own once they narrow the radius again.
  createPost: async (payload) => {
    try {
      const { coords } = get();
      const body = coords
        ? { ...payload, lng: coords.lng, lat: coords.lat }
        : payload;
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
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: p.likeCount + (p.likedByMe ? -1 : 1),
            }
          : p,
      ),
    });
    try {
      const { likedByMe, likeCount } = await api.toggleLike(id);
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === id ? { ...p, likedByMe, likeCount } : p,
        ),
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
    set({
      posts: prev.map((p) =>
        p.id === id ? { ...p, savedByMe: !p.savedByMe } : p,
      ),
    });
    try {
      const { saved } = await api.toggleSave(id);
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === id ? { ...p, savedByMe: saved } : p,
        ),
      }));
      if (labels) {
        Toast.show({
          type: "success",
          text1: saved ? labels.saved : labels.unsaved,
          position: "bottom",
          visibilityTime: 1500,
        });
      }
      return { saved };
    } catch {
      set({ posts: prev });
      if (labels) {
        Toast.show({
          type: "error",
          text1: labels.failed,
          position: "bottom",
          visibilityTime: 1500,
        });
      }
      return { saved: wasSaved };
    }
  },
}));

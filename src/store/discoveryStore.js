// localpulse/app/src/store/discoveryStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';

export const useDiscoveryStore = create((set, get) => ({
  deck: [],          // array of candidate cards
  loading: false,
  error: null,
  lastMatch: null,   // set when a swipe produces a match → drives the modal

  loadDeck: async () => {
    set({ loading: true, error: null });
    try {
      const { deck } = await api.getDiscovery();
      set({ deck, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  // Remove the top card immediately, then send the swipe. If it's a match,
  // surface it for the "It's a match!" modal.
  swipe: async (userId, action) => {
    set((s) => ({ deck: s.deck.filter((c) => c.id !== userId) }));
    try {
      const res = await api.swipe(userId, action);
      if (res.matched && res.match) set({ lastMatch: res.match });
      // Refill when the deck runs low.
      if (get().deck.length <= 2) get().loadDeck();
    } catch {
      /* swipe already removed from UI; ignore transient errors */
    }
  },

  clearMatch: () => set({ lastMatch: null }),
}));

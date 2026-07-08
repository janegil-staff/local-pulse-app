// localpulse/app/src/store/profileStore.js
import { create } from 'zustand';
import { api } from '../api/client.js';

export const useProfileStore = create((set, get) => ({
  profile: null,     // toSelf() shape from backend
  matches: [],
  loading: false,

  loadProfile: async () => {
    set({ loading: true });
    try {
      const { profile } = await api.getMyProfile();
      set({ profile, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  saveProfile: async (patch) => {
    const { profile } = await api.updateMyProfile(patch);
    set({ profile });
    return profile;
  },

  savePreferences: async (patch) => {
    const { preferences } = await api.updatePreferences(patch);
    set((s) => ({ profile: s.profile ? { ...s.profile, preferences } : s.profile }));
  },

  loadMatches: async () => {
    const { matches } = await api.getMatches();
    set({ matches });
  },

  unmatch: async (id) => {
    await api.unmatch(id);
    set((s) => ({ matches: s.matches.filter((m) => m.id !== id) }));
  },
}));

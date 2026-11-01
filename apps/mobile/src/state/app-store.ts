import { create } from 'zustand';

export const MAX_COMPARE = 4;

interface AppState {
  /** null = use the first league returned by the provider. */
  activeLeagueId: string | null;
  compareIds: string[];
  setActiveLeague: (id: string) => void;
  toggleCompare: (playerId: string) => void;
  clearCompare: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeLeagueId: null,
  compareIds: [],
  setActiveLeague: (id) => set({ activeLeagueId: id }),
  toggleCompare: (playerId) =>
    set((s) => {
      if (s.compareIds.includes(playerId)) {
        return { compareIds: s.compareIds.filter((id) => id !== playerId) };
      }
      if (s.compareIds.length >= MAX_COMPARE) return s;
      return { compareIds: [...s.compareIds, playerId] };
    }),
  clearCompare: () => set({ compareIds: [] }),
}));

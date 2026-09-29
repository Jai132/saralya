import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LS_PREFIX } from '../lib/storage';

export type EngineChoice = 'auto' | 'ar' | 'camera' | 'demo';

interface SettingsState {
  engine: EngineChoice;
  showSettings: boolean;
  setEngine: (e: EngineChoice) => void;
  openSettings: (open: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      engine: 'auto',
      showSettings: false,
      setEngine: (engine) => set({ engine }),
      openSettings: (showSettings) => set({ showSettings }),
    }),
    { name: `${LS_PREFIX}settings`, partialize: (s) => ({ engine: s.engine }) },
  ),
);

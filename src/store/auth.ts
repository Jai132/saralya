import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LS_PREFIX } from '../lib/storage';

export const DEMO_OTP = '123456';

interface AuthState {
  mobile: string | null;
  registered: string[];
  login: (mobile: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      mobile: null,
      registered: [],
      login: (mobile) =>
        set((s) => ({ mobile, registered: s.registered.includes(mobile) ? s.registered : [...s.registered, mobile] })),
      logout: () => set({ mobile: null }),
    }),
    { name: `${LS_PREFIX}auth` },
  ),
);

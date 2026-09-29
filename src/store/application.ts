import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LS_PREFIX } from '../lib/storage';

export type Product = 'msme' | 'lap' | 'vehicle';
export type VehicleKind = 'car' | 'cv';
export type AppStatus = 'draft' | 'submitted' | 'evidence' | 'review' | 'sanctioned';

export interface Application {
  id: string;
  product: Product;
  vehicleKind?: VehicleKind;
  vehicleSub?: string;
  vehicleNew?: boolean;
  amount: number;
  tenureMonths: number;
  purpose: string;
  status: AppStatus;
  createdAt: number;
  inspectedAt?: number;
  /** Flow-specific results (RC card, QR decodes, calibrations, property type…). */
  flow: Record<string, unknown>;
}

interface ApplicationState {
  byMobile: Record<string, Application>;
  start: (mobile: string, a: Omit<Application, 'id' | 'status' | 'createdAt' | 'flow'>) => Application;
  patch: (mobile: string, patch: Partial<Application>) => void;
  setFlow: (mobile: string, key: string, value: unknown) => void;
  clear: (mobile: string) => void;
}

export const useApplications = create<ApplicationState>()(
  persist(
    (set) => ({
      byMobile: {},
      start: (mobile, a) => {
        const app: Application = {
          ...a,
          id: `APP-${Date.now().toString(36).toUpperCase()}`,
          status: 'draft',
          createdAt: Date.now(),
          flow: {},
        };
        set((s) => ({ byMobile: { ...s.byMobile, [mobile]: app } }));
        return app;
      },
      patch: (mobile, patch) =>
        set((s) => {
          const cur = s.byMobile[mobile];
          return cur ? { byMobile: { ...s.byMobile, [mobile]: { ...cur, ...patch } } } : s;
        }),
      setFlow: (mobile, key, value) =>
        set((s) => {
          const cur = s.byMobile[mobile];
          return cur ? { byMobile: { ...s.byMobile, [mobile]: { ...cur, flow: { ...cur.flow, [key]: value } } } } : s;
        }),
      clear: (mobile) =>
        set((s) => {
          const next = { ...s.byMobile };
          delete next[mobile];
          return { byMobile: next };
        }),
    }),
    { name: `${LS_PREFIX}application` },
  ),
);

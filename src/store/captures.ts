import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LS_PREFIX } from '../lib/storage';

export type EngineKind = 'ar' | 'camera' | 'demo';

export interface CaptureMeta {
  id: string;
  appId: string;
  stepId: string;
  label: string;
  ts: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  engine: EngineKind;
  brightness: number;
  sharpness: number;
  width: number;
  height: number;
  /** SHA-256 of the JPEG bytes (or of the metadata snapshot when no frame was available). */
  imageHash: string;
  hash: string;
  prevHash: string;
  /** IndexedDB key for the JPEG, if a frame was available. */
  blobId?: string;
  note?: string;
}

interface CapturesState {
  items: CaptureMeta[];
  add: (c: CaptureMeta) => void;
  forApp: (appId: string) => CaptureMeta[];
  head: (appId: string) => string;
}

export const GENESIS = '0'.repeat(64);

export const useCaptures = create<CapturesState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (c) => set((s) => ({ items: [...s.items, c] })),
      forApp: (appId) => get().items.filter((c) => c.appId === appId),
      head: (appId) => {
        const list = get().items.filter((c) => c.appId === appId);
        return list.length ? list[list.length - 1].hash : GENESIS;
      },
    }),
    { name: `${LS_PREFIX}captures` },
  ),
);

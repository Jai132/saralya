import { useEffect, useState } from 'react';
import { asset } from '../../lib/storage';
import { HSRP_PLATE_MM } from '../../data/hsrp';
import type { Pt } from '../../lib/homography';

export interface PartTemplate {
  id: string;
  vehicleClass: 'car' | 'cv' | 'both';
  part: string;
  widthMm: number;
  heightMm: number;
  /** TL, TR, BR, BL in template millimetres. */
  corners: Pt[];
  outline: string;
  zones: { id: string; label: string; rect: [number, number, number, number] }[];
  planar: boolean;
  note?: string;
}

let cache: Promise<Record<string, PartTemplate>> | null = null;

/** Loads public/templates/*.json once. The number-plate size comes from data/hsrp.ts (single source). */
export function loadTemplates(): Promise<Record<string, PartTemplate>> {
  cache ??= (async () => {
    const ids: string[] = await fetch(asset('templates/index.json')).then((r) => r.json());
    const list: PartTemplate[] = await Promise.all(ids.map((id) => fetch(asset(`templates/${id}.json`)).then((r) => r.json())));
    const out: Record<string, PartTemplate> = {};
    for (const t of list) out[t.id] = t;
    const plate = out['number-plate'];
    if (plate) {
      const { widthMm, heightMm } = HSRP_PLATE_MM.car;
      plate.widthMm = widthMm;
      plate.heightMm = heightMm;
      plate.corners = [
        [0, 0],
        [widthMm, 0],
        [widthMm, heightMm],
        [0, heightMm],
      ];
    }
    return out;
  })();
  return cache;
}

export function useTemplates() {
  const [t, setT] = useState<Record<string, PartTemplate> | null>(null);
  useEffect(() => {
    let live = true;
    loadTemplates().then((x) => live && setT(x));
    return () => {
      live = false;
    };
  }, []);
  return t;
}

/** Dummy data for the property (LAP / self-construction) flow. Everything here is simulated in the prototype. */

export type PropertyType = 'house' | 'flat' | 'shop-house' | 'plot';
export type PropertyProduct = 'lap' | 'self-construction';

export const PROPERTY_TYPES: { id: PropertyType; title: string; sub: string }[] = [
  { id: 'house', title: 'Independent house', sub: 'A house on its own plot' },
  { id: 'flat', title: 'Flat / apartment', sub: 'A unit in a building' },
  { id: 'shop-house', title: 'Shop-cum-house', sub: 'Shop below, home above' },
  { id: 'plot', title: 'Plot under construction', sub: 'Building on your own plot' },
];

export const PROPERTY_PRODUCTS: { id: PropertyProduct; title: string; sub: string }[] = [
  { id: 'lap', title: 'Loan against property', sub: 'Borrow against a property you own' },
  { id: 'self-construction', title: 'Self-construction loan', sub: 'Released in tranches as you build' },
];

/** Used when the browser can't give a GPS fix (desktop demo). A residential street in Jodhpur. */
export const DEMO_LOCATION = { lat: 26.27412, lng: 73.00594, accuracy: 6 };

// ————— Parcel —————

/** Plot size in metres (width along the road × depth) and its rotation from north, for the dummy polygon. */
export const PLOT = { w: 9, d: 15, rotDeg: 17 };

/** Deterministic dummy ULPIN (14 characters, "28…") and survey number for a location. */
export function parcelFor(lat: number, lng: number) {
  const seed = Math.abs(Math.round(lat * 1e5) * 31 + Math.round(lng * 1e5) * 17);
  const digits = String(seed).padStart(12, '7').slice(-12);
  return {
    ulpin: `28${digits}`,
    survey: `Sy. No. ${100 + (seed % 380)}/${1 + (seed % 7)}${'ABC'[seed % 3]}`,
    village: 'Mandore (ward 42)',
    areaSqm: PLOT.w * PLOT.d,
  };
}

/** Parcel corners as [lat, lng], with the point at about a third of the way in from the road. */
export function parcelPolygon(lat: number, lng: number): [number, number][] {
  const r = (PLOT.rotDeg * Math.PI) / 180;
  const mLat = 1 / 111320;
  const mLng = 1 / (111320 * Math.cos((lat * Math.PI) / 180));
  // Slightly irregular quad, like a real cadastral parcel.
  const local: [number, number][] = [
    [-PLOT.w / 2, -PLOT.d * 0.35],
    [PLOT.w / 2 + 0.4, -PLOT.d * 0.35],
    [PLOT.w / 2, PLOT.d * 0.65],
    [-PLOT.w / 2 - 0.3, PLOT.d * 0.65 - 0.5],
  ];
  return local.map(([x, y]) => {
    const e = x * Math.cos(r) - y * Math.sin(r);
    const n = x * Math.sin(r) + y * Math.cos(r);
    return [lat + n * mLat, lng + e * mLng];
  });
}

// ————— Records —————

export interface PropertyRecord {
  id: string;
  name: string;
  source: 'signed' | 'paper';
  via: string;
  result: string;
}

export const PROPERTY_RECORDS: PropertyRecord[] = [
  { id: 'ror', name: 'RoR / 7-12 extract', source: 'signed', via: 'State land records (Bhulekh)', result: 'Owner: matches applicant · 135 sq m' },
  { id: 'card', name: 'SVAMITVA property card', source: 'signed', via: 'DigiLocker', result: 'Parcel and owner match' },
  { id: 'ec', name: 'Encumbrance certificate', source: 'paper', via: 'Sub-registrar copy, photographed', result: 'No registered charge shown (13 years)' },
  { id: 'cersai', name: 'CERSAI search', source: 'signed', via: 'Central registry', result: 'No security interest registered' },
];

export const SOURCE_TIPS = {
  signed: 'Issued and signed by the registry itself. It can’t be edited, and we can check it’s current.',
  paper: 'A photo of a paper copy. It may be genuine, but it could be old or altered — your officer will check it.',
};

// ————— Floor plans (metres, x across the plot, y back from the road) —————

export interface Room {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** As-built only: not on the sanctioned plan. */
  extra?: boolean;
}

/** Sanctioned ground floor: 7 × 7 m with setbacks. */
export const PLAN_ROOMS: Room[] = [
  { name: 'Living', x: 1, y: 2.5, w: 4, h: 4 },
  { name: 'Kitchen', x: 5, y: 2.5, w: 3, h: 2.5 },
  { name: 'Bath', x: 5, y: 5, w: 3, h: 1.5 },
  { name: 'Bedroom 1', x: 1, y: 6.5, w: 4, h: 3 },
  { name: 'Bedroom 2', x: 5, y: 6.5, w: 3, h: 3 },
];

/** As built: the same rooms plus a rear room that eats into the back setback. */
export const ASBUILT_ROOMS: Room[] = [...PLAN_ROOMS, { name: 'Rear room', x: 1, y: 9.5, w: 7, h: 1.75, extra: true }];

const SQFT = 10.7639;
export function areaRangeSqft(rooms: Room[]): [number, number] {
  const a = rooms.reduce((s, r) => s + r.w * r.h, 0) * SQFT;
  return [Math.round((a * 0.97) / 10) * 10, Math.round((a * 1.09) / 10) * 10];
}

export const DEVIATIONS = [
  { label: 'Coverage +25% (setback)', detail: 'A rear room extends into the back setback (3.75 m left vs 5.5 m on the plan)' },
  { label: 'Floor 3 not on plan', detail: 'The plan sanctions two floors; the building shows three' },
];

// ————— Shadow floor count (illustrative) —————

export const SHADOW = { shadowM: 16, sunElevDeg: 34, floorHeightM: 3.5, sanctionedFloors: 2 };

// ————— Self-construction stages —————

export const STAGES = [
  { id: 'sanction', title: 'Sanction', sub: 'Baseline capture', tranche: 0 },
  { id: 'plinth', title: 'Plinth', sub: 'Foundation complete', tranche: 30 },
  { id: 'slab', title: 'Roof slab', sub: 'Structure complete', tranche: 40 },
  { id: 'completion', title: 'Completion', sub: 'Finished & occupied', tranche: 30 },
] as const;

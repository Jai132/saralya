import type { VehicleKind } from '../store/application';

/** All vehicle records here are fictitious. Makes and models are invented, not real brands. */

export type SilhouetteType = 'car' | 'pickup' | 'truck' | 'tipper';

export function silhouetteFor(kind: VehicleKind, sub?: string): SilhouetteType {
  if (kind === 'car') return 'car';
  if (sub === 'pickup') return 'pickup';
  if (sub === 'tipper') return 'tipper';
  return 'truck';
}

/** File-name suffix per capture angle, in walkaround order. */
export const ANGLE_FILES = ['front', 'front34-left', 'left', 'rear34-left', 'rear', 'rear34-right', 'right', 'front34-right'];
export const ANGLE_LABELS = ['Front', 'Front-¾ left', 'Left side', 'Rear-¾ left', 'Rear', 'Rear-¾ right', 'Right side', 'Front-¾ right'];

export const DEMO_PLATES: Record<VehicleKind, string> = { car: 'MH12KX7730', cv: 'RJ19GA4821' };

export const RE_REG = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;

export function formatReg(r: string): string {
  const m = r.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{4})$/);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ') : r;
}

export interface RcRecord {
  regNo: string;
  ownerMasked: string;
  make: string;
  model: string;
  variant: string;
  bodyType: string;
  year: number;
  fuel: string;
  colour: string;
  chassisMasked: string;
  engineMasked: string;
  registeredAt: string;
  hypothecation: string;
  priorCharges: string;
  insuranceUpto: string;
  fitnessUpto?: string;
  permitUpto?: string;
  permitType?: string;
  /** Simulated readings the identity close-ups will "recognise". */
  odometerKm: number;
  tyreDot: string;
}

const MODELS: Record<string, Omit<RcRecord, 'regNo' | 'ownerMasked' | 'registeredAt'>> = {
  hatchback: {
    make: 'Orion Motors', model: 'Kiro', variant: 'VXi 1.2 MT', bodyType: 'Hatchback', year: 2020, fuel: 'Petrol', colour: 'Deep blue',
    chassisMasked: 'MZ3KR2XXXXXX41187', engineMasked: 'K12NXXXX8820', hypothecation: 'No active charge', priorCharges: 'None recorded',
    insuranceUpto: '14 Mar 2027', odometerKm: 48_210, tyreDot: '2223 (week 22, 2023)',
  },
  sedan: {
    make: 'Orion Motors', model: 'Aster', variant: 'ZX 1.5 AT', bodyType: 'Sedan', year: 2019, fuel: 'Petrol', colour: 'Deep blue',
    chassisMasked: 'MZ3AS5XXXXXX20914', engineMasked: 'G15DXXXX1442', hypothecation: 'No active charge', priorCharges: 'None recorded',
    insuranceUpto: '02 Jan 2027', odometerKm: 61_480, tyreDot: '4122 (week 41, 2022)',
  },
  suv: {
    make: 'Vardhan Auto', model: 'Terra', variant: '4x2 Diesel MT', bodyType: 'SUV', year: 2021, fuel: 'Diesel', colour: 'Deep blue',
    chassisMasked: 'MV1TR4XXXXXX07752', engineMasked: 'D20TXXXX3305', hypothecation: 'No active charge', priorCharges: 'None recorded',
    insuranceUpto: '28 Jul 2027', odometerKm: 39_950, tyreDot: '0924 (week 9, 2024)',
  },
  pickup: {
    make: 'Ashva Commercial', model: 'Cargo Pik-Up', variant: '1.5T Diesel', bodyType: 'Pickup (goods)', year: 2018, fuel: 'Diesel', colour: 'White',
    chassisMasked: 'MA7PK1XXXXXX55301', engineMasked: 'P25CXXXX7719', hypothecation: 'No active charge', priorCharges: '1 prior charge — released 2022',
    insuranceUpto: '09 Nov 2026', fitnessUpto: '21 Apr 2027', permitUpto: '30 Jun 2026', permitType: 'Goods carrier (state)', odometerKm: 1_10_400, tyreDot: '3121 (week 31, 2021)',
  },
  truck: {
    make: 'Ashva Commercial', model: 'Haulmax', variant: '1109 BS-VI', bodyType: 'Truck (goods)', year: 2019, fuel: 'Diesel', colour: 'Yellow / red',
    chassisMasked: 'MA7HM9XXXXXX18426', engineMasked: 'H38DXXXX2290', hypothecation: 'No active charge', priorCharges: 'None recorded',
    insuranceUpto: '17 Feb 2027', fitnessUpto: '03 Aug 2027', permitUpto: '31 Mar 2028', permitType: 'National permit (goods)', odometerKm: 90_120, tyreDot: '1219 (week 12, 2019)',
  },
  tipper: {
    make: 'Ashva Commercial', model: 'Rockmax', variant: '2518 Tipper', bodyType: 'Tipper', year: 2019, fuel: 'Diesel', colour: 'Yellow / rust',
    chassisMasked: 'MA7RK2XXXXXX45812', engineMasked: 'R56DXXXX6031', hypothecation: 'No active charge', priorCharges: '1 prior charge — released 2024',
    insuranceUpto: '05 Dec 2026', fitnessUpto: '11 Sep 2027', permitUpto: '31 Mar 2027', permitType: 'State permit (goods)', odometerKm: 3_20_600, tyreDot: '3824 (week 38, 2024)',
  },
};

const STATE_RTO: Record<string, string> = { MH: 'Pune RTO, Maharashtra', RJ: 'Jodhpur RTO, Rajasthan', UP: 'Lucknow RTO, Uttar Pradesh', TN: 'Chennai RTO, Tamil Nadu', KA: 'Bengaluru RTO, Karnataka', GJ: 'Ahmedabad RTO, Gujarat' };

export function fetchRc(regNo: string, sub: string, ownerName: string): RcRecord {
  const base = MODELS[sub] ?? MODELS.hatchback;
  const masked = ownerName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0] + '*'.repeat(Math.max(2, w.length - 1)))
    .join(' ');
  return { ...base, regNo, ownerMasked: masked || 'R***** K**** G****', registeredAt: STATE_RTO[regNo.slice(0, 2)] ?? `${regNo.slice(0, 2)} RTO` };
}

/** Which walkaround photo each part is calibrated on. Index into the 8 angles. */
export interface PartSource {
  templateId: string;
  angle?: number;
  closeup?: 'plate' | 'chassis';
}

export const PART_SOURCES: Record<VehicleKind, PartSource[]> = {
  car: [
    { templateId: 'car-bonnet', angle: 0 },
    { templateId: 'car-bumper-f', angle: 0 },
    { templateId: 'car-door-fl', angle: 2 },
    { templateId: 'car-door-rl', angle: 2 },
    { templateId: 'car-boot', angle: 4 },
    { templateId: 'car-bumper-r', angle: 4 },
    { templateId: 'car-door-rr', angle: 6 },
    { templateId: 'car-door-fr', angle: 6 },
    { templateId: 'car-roof', angle: 1 },
    { templateId: 'number-plate', closeup: 'plate' },
    { templateId: 'chassis-plate', closeup: 'chassis' },
  ],
  cv: [
    { templateId: 'cv-cabin-front', angle: 0 },
    { templateId: 'cv-bumper', angle: 0 },
    { templateId: 'cv-door-l', angle: 2 },
    { templateId: 'cv-body-l', angle: 2 },
    { templateId: 'cv-tailgate', angle: 4 },
    { templateId: 'cv-body-r', angle: 6 },
    { templateId: 'cv-door-r', angle: 6 },
    { templateId: 'number-plate', closeup: 'plate' },
    { templateId: 'chassis-plate', closeup: 'chassis' },
  ],
};

export type Severity = 'minor' | 'moderate' | 'severe';
export type DamageType = 'dent' | 'scratch' | 'crack' | 'rust' | 'repaint' | 'chip';

export interface DamageMark {
  type: DamageType;
  severity: Severity;
  /** Rectangle in template millimetres. */
  rect: [number, number, number, number];
  zone: string;
  note: string;
  /** Lender-grid deduction for this item, % of benchmark (dummy). */
  deductionPct: number;
}

/** Predefined, dummy findings per part (template coordinates). Parts not listed are clean. */
export const DAMAGE: Record<string, DamageMark[]> = {
  'car-door-fl': [
    { type: 'repaint', severity: 'moderate', rect: [120, 430, 820, 420], zone: 'Upper + lower panel', note: 'Paint thickness / tone differs from adjacent panels — likely repaint', deductionPct: 3 },
  ],
  'car-bumper-r': [{ type: 'scratch', severity: 'minor', rect: [1180, 160, 380, 120], zone: 'Right corner', note: 'Surface scratches, ~30 cm', deductionPct: 1 }],
  'car-bonnet': [{ type: 'chip', severity: 'minor', rect: [600, 860, 220, 90], zone: 'Leading edge', note: 'Stone chips on leading edge', deductionPct: 0.5 }],
  'car-door-rr': [{ type: 'dent', severity: 'moderate', rect: [420, 610, 260, 180], zone: 'Lower panel', note: 'Shallow dent, no paint break', deductionPct: 2.5 }],
  'car-bumper-f': [{ type: 'crack', severity: 'minor', rect: [140, 260, 200, 120], zone: 'Left corner', note: 'Hairline crack near fog lamp', deductionPct: 1.5 }],
  'cv-body-l': [
    { type: 'rust', severity: 'moderate', rect: [300, 900, 1500, 180], zone: 'Bottom rail', note: 'Surface rust along bottom rail', deductionPct: 2 },
    { type: 'dent', severity: 'minor', rect: [2500, 380, 420, 300], zone: 'Side panels', note: 'Load impact dents', deductionPct: 1 },
  ],
  'cv-tailgate': [{ type: 'dent', severity: 'moderate', rect: [700, 420, 900, 420], zone: 'Upper / lower half', note: 'Tailgate dented from loading', deductionPct: 2 }],
  'cv-bumper': [{ type: 'crack', severity: 'minor', rect: [200, 60, 350, 160], zone: 'Left end', note: 'Bumper end bent', deductionPct: 1 }],
  'cv-cabin-front': [{ type: 'chip', severity: 'minor', rect: [300, 150, 400, 250], zone: 'Windscreen', note: 'Windscreen chip, outside wiper sweep', deductionPct: 1 }],
  'cv-body-r': [{ type: 'rust', severity: 'minor', rect: [2600, 920, 900, 160], zone: 'Bottom rail', note: 'Light rust', deductionPct: 1 }],
};

export const SEVERITY_COLOR: Record<Severity | 'none', string> = {
  none: '#99d5c9',
  minor: '#f2c94c',
  moderate: '#ea8a3a',
  severe: '#c0392b',
};

/** Actuation liveness pool — the "server" picks 5 in random order. */
export const ACTUATIONS: { id: string; text: string }[] = [
  { id: 'hazards', text: 'Switch the hazard lights on' },
  { id: 'headlights', text: 'Switch the headlights on' },
  { id: 'wheel-left', text: 'Turn the steering wheel full left' },
  { id: 'wheel-right', text: 'Turn the steering wheel full right' },
  { id: 'bonnet', text: 'Open the bonnet' },
  { id: 'boot', text: 'Open the boot or a rear door' },
  { id: 'wipers', text: 'Switch the wipers on' },
  { id: 'horn', text: 'Sound the horn, then tap Done' },
  { id: 'ignition', text: 'Ignition on — show the odometer' },
  { id: 'windscreen-code', text: 'Show this code against the windscreen: {code}' },
  { id: 'indicator-left', text: 'Switch on the left indicator' },
  { id: 'indicator-right', text: 'Switch on the right indicator' },
  { id: 'brake', text: 'Press the brake — show the brake lights' },
  { id: 'driver-door', text: 'Open the driver’s door' },
  { id: 'window', text: 'Lower the driver’s window' },
];

export function pickActuations(n = 5): string[] {
  const ids = ACTUATIONS.map((a) => a.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, n);
}

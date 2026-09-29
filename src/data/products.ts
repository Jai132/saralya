import type { Product, VehicleKind } from '../store/application';

export interface ProductMeta {
  id: Product;
  title: string;
  tagline: string;
  inspection: string;
  minAmount: number;
  maxAmount: number;
  step: number;
  defaultAmount: number;
  tenures: number[];
  purposes: string[];
}

export const PRODUCTS: Record<Product, ProductMeta> = {
  msme: {
    id: 'msme',
    title: 'MSME business loan',
    tagline: 'Working capital or expansion for your shop or unit',
    inspection: 'A guided 5-minute walk through your shop',
    minAmount: 50_000,
    maxAmount: 25_00_000,
    step: 10_000,
    defaultAmount: 5_00_000,
    tenures: [12, 18, 24, 36, 48],
    purposes: ['Working capital / stock', 'Shop renovation', 'Buy equipment', 'Repay costlier debt', 'Other business need'],
  },
  lap: {
    id: 'lap',
    title: 'Loan against property',
    tagline: 'Use your house or shop as collateral — or fund construction in stages',
    inspection: 'Location proof and a walkaround of the property',
    minAmount: 3_00_000,
    maxAmount: 75_00_000,
    step: 50_000,
    defaultAmount: 10_00_000,
    tenures: [36, 60, 84, 120, 180],
    purposes: ['Business expansion', 'Self-construction (tranches)', 'Home improvement', 'Education', 'Debt consolidation'],
  },
  vehicle: {
    id: 'vehicle',
    title: 'Vehicle loan',
    tagline: 'Used cars and commercial vehicles — pickup, truck, tipper',
    inspection: 'Identity check and an 8-angle walkaround of the vehicle',
    minAmount: 1_00_000,
    maxAmount: 40_00_000,
    step: 10_000,
    defaultAmount: 4_00_000,
    tenures: [12, 24, 36, 48, 60],
    purposes: ['Buy a used vehicle', 'Refinance my vehicle', 'Working capital against vehicle', 'Top-up on existing loan'],
  },
};

export const VEHICLE_SUBS: Record<VehicleKind, { value: string; label: string }[]> = {
  car: [
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
  ],
  cv: [
    { value: 'pickup', label: 'Pickup' },
    { value: 'truck', label: 'Truck' },
    { value: 'tipper', label: 'Tipper' },
  ],
};

/**
 * How each document reaches the lender:
 * - signed: pulled as an issuer-signed record (DigiLocker, registry, AA, GSTN) — can't be edited or staged
 * - live:   captured live by the camera during the inspection
 */
export type DocSource = 'signed' | 'live';

export interface DocItem {
  name: string;
  source: DocSource;
  via: string;
  when?: string;
}

export function documentsFor(product: Product, opts: { vehicleKind?: VehicleKind; gstRegistered?: boolean; selfConstruction?: boolean } = {}): DocItem[] {
  if (product === 'msme') {
    return [
      { name: 'PAN', source: 'signed', via: 'DigiLocker · Income Tax Dept' },
      { name: 'Aadhaar', source: 'signed', via: 'DigiLocker · UIDAI (masked)' },
      { name: 'Udyam registration', source: 'signed', via: 'Udyam portal' },
      ...(opts.gstRegistered !== false
        ? [{ name: 'GST returns', source: 'signed' as const, via: 'GSTN (with consent)', when: 'if registered' }]
        : []),
      { name: '12-month bank statement', source: 'signed', via: 'Account Aggregator' },
      { name: 'Business address proof', source: 'live', via: 'Signboard + frontage capture, GPS-bound' },
      { name: 'Recent purchase invoices', source: 'live', via: 'Scan the e-invoice QR — IRP-signed, verifies offline' },
    ];
  }
  if (product === 'lap') {
    return [
      { name: 'Sale / title deed', source: 'signed', via: 'State registry (where digitised)' },
      { name: 'Encumbrance certificate', source: 'signed', via: 'State registration dept' },
      { name: 'RoR / 7-12 / khata / property card', source: 'signed', via: 'Bhulekh · SVAMITVA card' },
      { name: 'Latest property tax receipt', source: 'signed', via: 'Municipal portal' },
      { name: 'CERSAI search', source: 'signed', via: 'CERSAI registry (prior charges)' },
      { name: 'Sanctioned building plan', source: 'live', via: 'Photograph the plan during inspection' },
      ...(opts.selfConstruction ? [] : [{ name: 'OC / CC', source: 'live' as const, via: 'Photograph during inspection', when: 'where applicable' }]),
      { name: 'The property itself', source: 'live', via: 'GPS + walkaround, parcel-bound' },
    ];
  }
  const cv = opts.vehicleKind === 'cv';
  return [
    { name: 'Registration certificate (RC)', source: 'signed', via: 'DigiLocker · VAHAN' },
    { name: 'Insurance', source: 'signed', via: 'Insurer record via VAHAN' },
    { name: 'Hypothecation status', source: 'signed', via: 'VAHAN (live charge status)' },
    ...(cv
      ? [
          { name: 'Permit', source: 'signed' as const, via: 'VAHAN' },
          { name: 'Fitness certificate', source: 'signed' as const, via: 'VAHAN' },
        ]
      : []),
    { name: 'Prior-lender NOC / Form 35', source: 'live', via: 'Photograph during inspection', when: 'if previously financed' },
    { name: 'The vehicle: plate, chassis, odometer, condition', source: 'live', via: '8-angle walkaround + close-ups' },
  ];
}

/** Consents confirmed just before a capture session, per product. All unchecked by default. */
export function inspectionConsents(product: Product) {
  const what = { msme: 'your shop and stock', lap: 'the property', vehicle: 'the vehicle' }[product];
  return [
    {
      id: 'camera',
      label: 'Use my camera for this inspection only',
      sub: `To record ${what}. Access is for this session only and stops when you leave the capture screen.`,
    },
    {
      id: 'location',
      label: 'Use my precise location during capture',
      sub: 'Each frame is stamped with GPS so the lender knows where it was taken.',
    },
    {
      id: 'motion',
      label: 'Use motion sensors to verify the capture',
      sub: 'Phone movement is compared with the video to show the capture is live, not a replay.',
    },
    {
      id: 'india',
      label: 'Store the sealed captures in India',
      sub: 'Captures are hash-sealed and kept on India-hosted storage (simulated in this prototype).',
    },
  ];
}

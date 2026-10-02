/** Dummy outputs for the MSME shop walkthrough. Everything here is simulated in the prototype. */

/** What the signboard "OCR" reads when the profile has no business name. */
export const DEFAULT_BOARD = 'SHREE GANESH KIRANA';

/** Stock-ticker targets per shelf wall (items detected). Sums to the headline 1,284. */
export const STOCK_WALLS: Record<string, number> = {
  'shelf-left': 412,
  'shelf-back': 538,
  'shelf-right': 334,
};
export const STOCK_TOTAL = Object.values(STOCK_WALLS).reduce((a, b) => a + b, 0);

/** Back-room count shown on the storage step. */
export const STORAGE_COUNT = { sacks: 26, cartons: 12 };

/**
 * Labels for the low-opacity stock boxes drawn over feature-point clusters. Chosen from the box's shape and
 * where it sits in the frame — a visual stand-in, the production counting models do the real classification.
 */
export function clusterLabel(r: { x: number; y: number; w: number; h: number }, frameH: number): string {
  const aspect = r.w / Math.max(1, r.h);
  if (r.y + r.h > frameH * 0.78 && aspect < 2.2) return 'sacks';
  if (aspect > 2.4) return 'packaged goods';
  if (aspect < 0.7) return 'bottles & jars';
  return r.w * r.h > frameH * frameH * 0.06 ? 'cartons' : 'packets';
}

// ————— QR codes —————

/** Demo-mode UPI standee on the counter. The QR is rendered and then decoded for real. */
export const DEMO_UPI = { vpaHandle: 'demobank', mcc: '5411' };

export function demoVpa(businessName: string): string {
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'shreeganeshkirana';
  return `${slug}@${DEMO_UPI.vpaHandle}`;
}

/** Fictitious supplier directory used to put a name to the seller GSTIN on a scanned e-invoice. */
export const SUPPLIERS: Record<string, string> = {
  '08AABCA1234F1Z2': 'ABC Distributors',
  '08AAKFS5678M1Z9': 'Shiv Shakti Traders',
  '08AADCM4321P1ZK': 'Marwar FMCG Agencies',
};

/** The demo-mode invoice (its QR is a correctly shaped e-invoice JWS with a placeholder signature). */
export const DEMO_INVOICE = {
  sellerGstin: '08AABCA1234F1Z2',
  docNo: 'ABC/26-27/0912',
  docType: 'INV',
  docDate: '2026-09-12',
  value: 48200,
  itemCount: 14,
  hsn: '1006',
  irn: '7c1b5e0a9d3f42b68e1a0c97d4f5b3e2a816c0d9e7f45b2a3c1d0e9f8a7b6c5d',
  irnDate: '2026-09-12 16:42:08',
};

/** Shown when the scanned code isn't a signed e-invoice, clearly labelled as a demo result. */
export const DEMO_INVOICE_RESULT = {
  supplier: 'ABC Distributors',
  value: 48200,
  date: '2026-09-12',
};

// ————— Meter —————

export const METER_READING = {
  kwh: '04718',
  consumerNo: '2104XXXX37',
  sanctionedLoadKw: 2,
  tariff: 'Non-domestic (shop)',
  avgMonthlyUnits: [290, 340],
};

// ————— Two-snapshot example (the kirana worked example, used in explainer diagrams) —————

export const TWO_SNAPSHOT_EXAMPLE = {
  t0: 400000,
  purchases: 550000,
  t1: 380000,
  cogs: 570000,
  marginPct: 5,
  sales: 600000,
  days: 30,
};

/** Re-capture window for snapshot 2, in days after snapshot 1. */
export const SNAPSHOT2_WINDOW = { from: 7, to: 14 };

/** Merchant category codes a shop's payment QR commonly carries. */
export const MCC_NAMES: Record<string, string> = {
  '5411': 'Grocery stores & supermarkets',
  '5499': 'Food stores (misc.)',
  '5311': 'Department stores',
  '5912': 'Pharmacies',
  '5812': 'Restaurants',
  '0000': 'Personal / unspecified',
};

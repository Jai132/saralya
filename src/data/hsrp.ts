/**
 * Number plate sizes used to recover metric scale from a 4-point plate calibration.
 * PLACEHOLDERS based on standard HSRP sizes — verify against the current HSRP specification before relying on them.
 */
export const HSRP_PLATE_MM = {
  car: { widthMm: 500, heightMm: 120, verify: true },
  cv: { widthMm: 500, heightMm: 120, verify: true },
} as const;

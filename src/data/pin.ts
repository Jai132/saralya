/** Rough PIN-prefix → state map for auto-filling the state field (demo only; user can override). */
const RANGES: [number, number, string][] = [
  [11, 11, 'Delhi'],
  [12, 13, 'Haryana'],
  [14, 16, 'Punjab'],
  [20, 28, 'Uttar Pradesh'],
  [24, 26, 'Uttarakhand'],
  [30, 34, 'Rajasthan'],
  [36, 39, 'Gujarat'],
  [40, 44, 'Maharashtra'],
  [45, 48, 'Madhya Pradesh'],
  [49, 49, 'Chhattisgarh'],
  [50, 50, 'Telangana'],
  [51, 53, 'Andhra Pradesh'],
  [56, 59, 'Karnataka'],
  [60, 64, 'Tamil Nadu'],
  [67, 69, 'Kerala'],
  [70, 74, 'West Bengal'],
  [75, 77, 'Odisha'],
  [80, 85, 'Bihar'],
];

export function stateForPin(pin: string): string | null {
  if (pin.length < 2) return null;
  const p = Number(pin.slice(0, 2));
  // Later entries are more specific, so search from the end.
  for (let i = RANGES.length - 1; i >= 0; i--) {
    const [a, b, s] = RANGES[i];
    if (p >= a && p <= b) return s;
  }
  return null;
}

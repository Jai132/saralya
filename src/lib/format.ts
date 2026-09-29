const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');

/** ₹3,40,000 */
export function rupees(n: number): string {
  return inr.format(Math.round(n));
}

/** 1,28,400 */
export function indian(n: number): string {
  return num.format(n);
}

function trim(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** ₹3.4 L / ₹1.2 Cr / ₹48,200 — compact lakh/crore. */
export function lakh(n: number, digits = 1): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${trim(n / 1e7, digits + 1)} Cr`;
  if (a >= 1e5) return `₹${trim(n / 1e5, digits)} L`;
  return rupees(n);
}

/** "₹3.4–4.6 L" when both ends share a unit, else "₹90k–₹1.2 L". */
export function lakhRange(lo: number, hi: number, digits = 1): string {
  if (lo >= 1e5 && hi < 1e7) return `₹${trim(lo / 1e5, digits)}–${trim(hi / 1e5, digits)} L`;
  if (lo >= 1e7) return `₹${trim(lo / 1e7, digits + 1)}–${trim(hi / 1e7, digits + 1)} Cr`;
  return `${lakh(lo, digits)}–${lakh(hi, digits)}`;
}

/** Kilometres in lakh: 320000 → "3.2 L km". */
export function lakhKm(km: number): string {
  return `${trim(km / 1e5, 1)} L km`;
}

export function dateIN(d: Date | number | string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTimeIN(d: Date | number | string): string {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function timeIN(d: Date | number = Date.now()): string {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/** "3f9a…c21e" */
export function shortHash(h: string, n = 4): string {
  return h ? `${h.slice(0, n)}…${h.slice(-n)}` : '—';
}

export function mask(s: string, keepEnd = 4, char = 'X'): string {
  if (s.length <= keepEnd) return s;
  return char.repeat(s.length - keepEnd) + s.slice(-keepEnd);
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function mmss(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

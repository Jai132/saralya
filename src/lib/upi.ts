/**
 * Parses what a shop's payment QR actually contains. Two shapes are common in India:
 *
 *   - a UPI deep link:  upi://pay?pa=shop@okbank&pn=SHREE%20GANESH%20KIRANA&mc=5411&cu=INR
 *   - a BharatQR / EMVCo merchant string: "000201010211…5303356…5802IN5913SHREE GANESH…6304ABCD",
 *     a list of 2-digit tag + 2-digit length + value fields, with the UPI VPA inside a merchant-account
 *     template (tags 26–51) and the merchant name in tag 59.
 */

export interface UpiPayee {
  /** Virtual payment address, e.g. "shreeganesh@okbank". */
  vpa: string;
  /** Payee name as encoded in the QR (may be empty on some personal QRs). */
  name: string;
  amount?: number;
  /** Merchant category code (5411 = grocery stores). */
  mcc?: string;
  note?: string;
  format: 'upi-link' | 'bharatqr';
}

const VPA = /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-]{1,63}$/i;

export function isVpa(s: string): boolean {
  return VPA.test(s.trim());
}

function decodeParam(v: string): string {
  try {
    return decodeURIComponent(v.replace(/\+/g, ' ')).trim();
  } catch {
    return v.trim();
  }
}

/** Parses a upi://pay link. Returns null if it isn't one or has no valid payee address. */
export function parseUpiLink(text: string): UpiPayee | null {
  const m = text.trim().match(/^upi:\/\/pay\/?\?(.*)$/i);
  if (!m) return null;
  const params: Record<string, string> = {};
  for (const part of m[1].split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    const k = (i < 0 ? part : part.slice(0, i)).toLowerCase();
    if (!(k in params)) params[k] = i < 0 ? '' : decodeParam(part.slice(i + 1));
  }
  const vpa = params.pa ?? '';
  if (!isVpa(vpa)) return null;
  const am = params.am ? Number(params.am) : undefined;
  return {
    vpa: vpa.toLowerCase(),
    name: params.pn ?? '',
    amount: am !== undefined && Number.isFinite(am) && am > 0 ? am : undefined,
    mcc: params.mc || undefined,
    note: params.tn || undefined,
    format: 'upi-link',
  };
}

/** Splits an EMVCo TLV string into tag → value. Returns null if the lengths don't add up. */
export function parseTlv(s: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < s.length) {
    if (i + 4 > s.length) return null;
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len)) return null;
    const v = s.slice(i + 4, i + 4 + len);
    if (v.length !== len) return null;
    out[tag] = v;
    i += 4 + len;
  }
  return out;
}

/** Parses a BharatQR / EMVCo merchant QR that carries a UPI address. */
export function parseBharatQr(text: string): UpiPayee | null {
  const s = text.trim();
  if (!s.startsWith('000201')) return null;
  const top = parseTlv(s);
  if (!top) return null;
  let vpa = '';
  for (let t = 26; t <= 51 && !vpa; t++) {
    const tmpl = top[String(t)];
    if (!tmpl) continue;
    const sub = parseTlv(tmpl);
    if (!sub) continue;
    // A UPI template's GUID (sub-tag 00) reads "upi" or "A000000677010111"; the VPA is a later sub-tag.
    const vals = Object.entries(sub).filter(([k]) => k !== '00').map(([, v]) => v);
    vpa = vals.find(isVpa) ?? '';
  }
  if (!vpa) return null;
  const am = top['54'] ? Number(top['54']) : undefined;
  return {
    vpa: vpa.toLowerCase(),
    name: (top['59'] ?? '').trim(),
    amount: am !== undefined && Number.isFinite(am) && am > 0 ? am : undefined,
    mcc: top['52'] && top['52'] !== '0000' ? top['52'] : undefined,
    format: 'bharatqr',
  };
}

export function parsePaymentQr(text: string): UpiPayee | null {
  return parseUpiLink(text) ?? parseBharatQr(text);
}

const NOISE = new Set(['MS', 'M', 'S', 'SHRI', 'SMT', 'MR', 'MRS', 'THE', 'AND', 'PVT', 'LTD', 'LLP', 'CO', 'STORE', 'STORES', 'ENTERPRISES', 'TRADERS']);

function tokens(s: string): string[] {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !NOISE.has(t));
}

/**
 * Loose match between the QR payee name and the names we hold for the borrower (bank account holder,
 * business name). QR names are often truncated or abbreviated, so a strong token overlap counts.
 */
export function payeeNameMatches(payee: string, candidates: string[]): boolean {
  const p = tokens(payee);
  if (!p.length) return false;
  return candidates.some((c) => {
    const q = tokens(c);
    if (!q.length) return false;
    const shared = p.filter((t) => q.includes(t) || q.some((u) => u.startsWith(t) || t.startsWith(u))).length;
    return shared / Math.min(p.length, q.length) >= 0.6 && shared >= Math.min(2, p.length, q.length);
  });
}

/** Builds a upi://pay link (used for the demo-mode QR, which is then decoded for real). */
export function buildUpiLink(p: { vpa: string; name: string; mcc?: string }): string {
  const q = [`pa=${encodeURIComponent(p.vpa)}`, `pn=${encodeURIComponent(p.name)}`];
  if (p.mcc) q.push(`mc=${p.mcc}`);
  q.push('cu=INR');
  return `upi://pay?${q.join('&')}`;
}

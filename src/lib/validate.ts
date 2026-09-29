/** Client-side format checks for Indian KYC fields. Each returns an error string or null. */

type V = (v: string) => string | null;

const req =
  (msg = 'Required'): V =>
  (v) =>
    v.trim() ? null : msg;

const pattern =
  (re: RegExp, msg: string): V =>
  (v) =>
    !v.trim() ? 'Required' : re.test(v.trim()) ? null : msg;

export const RE = {
  mobile: /^[6-9]\d{9}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  aadhaar: /^[2-9]\d{11}$/,
  pin: /^[1-9]\d{5}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  udyam: /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  account: /^\d{9,18}$/,
};

export const v = {
  required: req(),
  mobile: pattern(RE.mobile, 'Enter a 10-digit Indian mobile number'),
  pan: pattern(RE.pan, 'PAN format is ABCDE1234F'),
  aadhaar: pattern(RE.aadhaar, 'Aadhaar is 12 digits and does not start with 0 or 1'),
  pin: pattern(RE.pin, 'PIN code is 6 digits'),
  email: pattern(RE.email, 'Enter a valid email'),
  udyam: pattern(RE.udyam, 'Format is UDYAM-XX-00-0000000'),
  gstin: pattern(RE.gstin, 'GSTIN is 15 characters, e.g. 27ABCDE1234F1Z5'),
  ifsc: pattern(RE.ifsc, 'IFSC is 11 characters, e.g. HDFC0001234'),
  account: pattern(RE.account, 'Account number is 9–18 digits'),
  positive: (s: string) => (!s.trim() ? 'Required' : Number(s) > 0 ? null : 'Enter an amount'),
  nonNegative: (s: string) => (!s.trim() ? 'Required' : Number(s) >= 0 ? null : 'Cannot be negative'),
  adultDob: (s: string) => {
    if (!s) return 'Required';
    const d = new Date(s);
    const age = (Date.now() - d.getTime()) / (365.25 * 864e5);
    if (Number.isNaN(age)) return 'Enter a valid date';
    if (age < 18) return 'Applicant must be at least 18';
    if (age > 75) return 'Check the date of birth';
    return null;
  },
};

/** Run a map of validators; returns only failing fields. */
export function check<T extends string>(rules: Record<T, string | null>): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  (Object.keys(rules) as T[]).forEach((k) => {
    if (rules[k]) out[k] = rules[k]!;
  });
  return out;
}

/** Only digits, optionally capped. */
export const digits = (s: string, max?: number) => s.replace(/\D/g, '').slice(0, max);

/**
 * GST e-invoice QR. The Invoice Registration Portal (IRP) signs every registered invoice; the QR printed on
 * it is that signed JWS: base64url(header) . base64url(payload) . base64url(signature), where the payload's
 * `data` field is itself a JSON string with the invoice summary (seller/buyer GSTIN, number, date, value, IRN).
 *
 * We decode and parse the JWS for real. Verifying the signature needs the IRP's public certificate and is
 * simulated in the prototype.
 */

export interface EInvoice {
  sellerGstin: string;
  buyerGstin: string;
  docNo: string;
  docType: string;
  /** ISO date (yyyy-mm-dd). */
  docDate: string;
  value: number;
  itemCount?: number;
  hsn?: string;
  irn: string;
  irnDate?: string;
  alg: string;
}

function b64urlToString(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b.length % 4 ? '='.repeat(4 - (b.length % 4)) : '';
  const bin = atob(b + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function stringToB64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** dd/mm/yyyy → yyyy-mm-dd; passes ISO through. */
function isoDate(d: string): string {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : '';
}

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Returns the parsed invoice if `text` is a well-formed e-invoice JWS, otherwise null. */
export function parseEInvoice(text: string): EInvoice | null {
  const parts = text.trim().split('.');
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
  try {
    const header = JSON.parse(b64urlToString(parts[0])) as { alg?: string };
    const payload = JSON.parse(b64urlToString(parts[1])) as { data?: unknown };
    const data = (typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data) as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') return null;
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : data[k] != null ? String(data[k]) : '');
    const seller = str('SellerGstin').toUpperCase();
    const value = Number(data.TotInvVal);
    const irn = str('Irn');
    if (!GSTIN_RE.test(seller) || !Number.isFinite(value) || !irn) return null;
    return {
      sellerGstin: seller,
      buyerGstin: str('BuyerGstin').toUpperCase(),
      docNo: str('DocNo'),
      docType: str('DocTyp') || 'INV',
      docDate: isoDate(str('DocDt')),
      value,
      itemCount: data.ItemCnt != null ? Number(data.ItemCnt) : undefined,
      hsn: str('MainHsnCode') || undefined,
      irn,
      irnDate: str('IrnDt') || undefined,
      alg: header.alg ?? '',
    };
  } catch {
    return null;
  }
}

/** Builds an e-invoice-shaped JWS with a placeholder signature (for the demo-mode invoice QR). */
export function buildDemoEInvoice(d: Omit<EInvoice, 'alg' | 'docDate'> & { docDate: string }): string {
  const [y, m, day] = d.docDate.split('-');
  const data = {
    SellerGstin: d.sellerGstin,
    BuyerGstin: d.buyerGstin,
    DocNo: d.docNo,
    DocTyp: d.docType,
    DocDt: `${day}/${m}/${y}`,
    TotInvVal: d.value,
    ItemCnt: d.itemCount,
    MainHsnCode: d.hsn,
    Irn: d.irn,
    IrnDt: d.irnDate,
  };
  const header = stringToB64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = stringToB64url(JSON.stringify({ data: JSON.stringify(data), iss: 'NIC' }));
  return `${header}.${payload}.${stringToB64url('demo-signature-not-valid')}`;
}

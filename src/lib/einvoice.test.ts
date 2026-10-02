import { describe, expect, it } from 'vitest';
import { buildDemoEInvoice, parseEInvoice, stringToB64url } from './einvoice';

const inv = {
  sellerGstin: '08AABCA1234F1Z2',
  buyerGstin: '08ABCPG1234K1Z5',
  docNo: 'ABC/26-27/0912',
  docType: 'INV',
  docDate: '2026-09-12',
  value: 48200,
  itemCount: 14,
  hsn: '1006',
  irn: 'abc123',
  irnDate: '2026-09-12 16:42:08',
};

describe('e-invoice QR', () => {
  it('decodes a JWS whose data field is a JSON string', () => {
    const p = parseEInvoice(buildDemoEInvoice(inv));
    expect(p).toMatchObject({ sellerGstin: '08AABCA1234F1Z2', docDate: '2026-09-12', value: 48200, docNo: 'ABC/26-27/0912', alg: 'RS256' });
  });
  it('also accepts data as an object', () => {
    const h = stringToB64url('{"alg":"RS256"}');
    const b = stringToB64url(JSON.stringify({ data: { SellerGstin: '08AABCA1234F1Z2', TotInvVal: 10, Irn: 'x', DocDt: '01/02/2026' } }));
    expect(parseEInvoice(`${h}.${b}.sig`)?.docDate).toBe('2026-02-01');
  });
  it('rejects anything else', () => {
    expect(parseEInvoice('upi://pay?pa=a@b')).toBeNull();
    expect(parseEInvoice('a.b.c')).toBeNull();
    const h = stringToB64url('{}');
    expect(parseEInvoice(`${h}.${stringToB64url('{"data":"{\\"SellerGstin\\":\\"BAD\\"}"}')}.s`)).toBeNull();
  });
});

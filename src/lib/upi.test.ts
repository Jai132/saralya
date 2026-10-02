import { describe, expect, it } from 'vitest';
import { buildUpiLink, parseBharatQr, parsePaymentQr, parseTlv, parseUpiLink, payeeNameMatches } from './upi';

const tlv = (tag: string, v: string) => `${tag}${String(v.length).padStart(2, '0')}${v}`;

describe('UPI link', () => {
  it('parses payee address, name, amount and MCC', () => {
    const p = parseUpiLink('upi://pay?pa=shreeganesh@okbank&pn=SHREE%20GANESH+KIRANA&am=250.00&mc=5411&cu=INR');
    expect(p).toMatchObject({ vpa: 'shreeganesh@okbank', name: 'SHREE GANESH KIRANA', amount: 250, mcc: '5411', format: 'upi-link' });
  });
  it('is case-insensitive on scheme and keys', () => {
    expect(parseUpiLink('UPI://pay?PA=a.b@ybl&PN=Asha')?.vpa).toBe('a.b@ybl');
  });
  it('rejects links without a valid VPA', () => {
    expect(parseUpiLink('upi://pay?pn=Nobody')).toBeNull();
    expect(parseUpiLink('upi://pay?pa=not-a-vpa')).toBeNull();
    expect(parseUpiLink('https://example.com')).toBeNull();
  });
  it('round-trips the demo builder', () => {
    const link = buildUpiLink({ vpa: 'shop@demobank', name: 'Shree Ganesh Kirana', mcc: '5411' });
    expect(parseUpiLink(link)).toMatchObject({ vpa: 'shop@demobank', name: 'Shree Ganesh Kirana' });
  });
});

describe('BharatQR / EMVCo', () => {
  const acct = tlv('00', 'upi') + tlv('01', 'kirana@okaxis');
  const qr = tlv('00', '01') + tlv('01', '11') + tlv('26', acct) + tlv('52', '5411') + tlv('53', '356') + tlv('58', 'IN') + tlv('59', 'GANESH KIRANA') + tlv('60', 'JODHPUR') + tlv('63', 'ABCD');
  it('splits TLV fields', () => {
    expect(parseTlv(qr)?.['59']).toBe('GANESH KIRANA');
    expect(parseTlv('0002')).toBeNull();
  });
  it('finds the VPA inside a merchant-account template', () => {
    expect(parseBharatQr(qr)).toMatchObject({ vpa: 'kirana@okaxis', name: 'GANESH KIRANA', mcc: '5411', format: 'bharatqr' });
    expect(parsePaymentQr(qr)?.vpa).toBe('kirana@okaxis');
  });
});

describe('payee name match', () => {
  it('matches truncated or reordered names', () => {
    expect(payeeNameMatches('SHREE GANESH KIRANA', ['Ramesh Kumar Gupta', 'Shree Ganesh Kirana Store'])).toBe(true);
    expect(payeeNameMatches('RAMESH K GUPTA', ['Ramesh Kumar Gupta'])).toBe(true);
    expect(payeeNameMatches('M/s Ganesh Kirana', ['Shree Ganesh Kirana'])).toBe(true);
  });
  it('rejects a different person or shop', () => {
    expect(payeeNameMatches('SURESH TRADERS', ['Ramesh Kumar Gupta', 'Shree Ganesh Kirana'])).toBe(false);
    expect(payeeNameMatches('', ['Ramesh'])).toBe(false);
  });
});

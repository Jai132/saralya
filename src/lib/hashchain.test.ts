import { describe, expect, it } from 'vitest';
import { canonical, linkHash, sha256Hex, verifyChain, sealedFields } from './hashchain';

const GENESIS = '0'.repeat(64);

describe('sha256Hex', () => {
  it('matches the known digest of "abc"', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('canonical', () => {
  it('is independent of key order and drops undefined', () => {
    expect(canonical({ b: 1, a: { d: 2, c: [1, 'x'] }, u: undefined })).toBe(canonical({ a: { c: [1, 'x'], d: 2 }, b: 1 }));
  });
});

describe('hash chain', () => {
  async function build(n: number) {
    const items: { id: string; ts: number; imageHash: string; prevHash: string; hash: string }[] = [];
    let prev = GENESIS;
    for (let i = 0; i < n; i++) {
      const base = { id: `c${i}`, ts: 1000 + i, imageHash: await sha256Hex(`frame-${i}`), prevHash: prev };
      const hash = await linkHash(prev, base.imageHash, base);
      items.push({ ...base, hash });
      prev = hash;
    }
    return items;
  }

  it('verifies an intact chain', async () => {
    const items = await build(4);
    expect(await verifyChain(items, GENESIS)).toBe(-1);
    expect(sealedFields(items[0])).not.toHaveProperty('hash');
  });

  it('detects edited metadata at the edited link', async () => {
    const items = await build(4);
    items[2] = { ...items[2], ts: 9999 };
    expect(await verifyChain(items, GENESIS)).toBe(2);
  });

  it('detects re-ordering', async () => {
    const items = await build(3);
    [items[0], items[1]] = [items[1], items[0]];
    expect(await verifyChain(items, GENESIS)).toBe(0);
  });
});

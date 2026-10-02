import { describe, expect, it } from 'vitest';
import { clusterPoints, iou, RectTracker } from './clusters';

function blob(cx: number, cy: number, w: number, h: number, n: number) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push({ x: cx - w / 2 + ((i * 37) % 100) / 100 * w, y: cy - h / 2 + ((i * 61) % 100) / 100 * h });
  return pts;
}

describe('clusterPoints', () => {
  it('finds separate dense regions and ignores sparse noise', () => {
    const pts = [...blob(40, 40, 40, 30, 40), ...blob(150, 120, 30, 50, 40), { x: 100, y: 10 }, { x: 10, y: 170 }];
    const r = clusterPoints(pts, 192, 192, { cell: 12 });
    expect(r).toHaveLength(2);
    const a = r.find((b) => b.x < 96)!;
    expect(a.x).toBeLessThan(25);
    expect(a.x + a.w).toBeGreaterThan(55);
  });
  it('splits one wall-sized blob into product-sized boxes', () => {
    const r = clusterPoints(blob(96, 96, 180, 180, 400), 192, 192, { cell: 12 });
    expect(r.length).toBeGreaterThanOrEqual(4);
    for (const b of r) expect(b.w * b.h).toBeLessThan(0.15 * 192 * 192);
  });
  it('returns nothing for an empty frame', () => {
    expect(clusterPoints([], 100, 100)).toEqual([]);
  });
});

describe('RectTracker', () => {
  it('keeps ids stable across frames and drops vanished regions', () => {
    const t = new RectTracker();
    const a = t.update([{ x: 0, y: 0, w: 10, h: 10, n: 5 }]);
    const id = a[0].id;
    const b = t.update([{ x: 1, y: 1, w: 10, h: 10, n: 5 }]);
    expect(b[0].id).toBe(id);
    expect(b[0].hits).toBe(2);
    for (let i = 0; i < 4; i++) t.update([]);
    expect(t.update([])).toHaveLength(0);
  });
  it('computes overlap', () => {
    expect(iou({ x: 0, y: 0, w: 10, h: 10, n: 0 }, { x: 5, y: 0, w: 10, h: 10, n: 0 })).toBeCloseTo(1 / 3);
  });
});

import { describe, expect, it } from 'vitest';
import { fast9, bucket, PointTracker, median, Gray } from './features';
import { measureQuality } from './quality';

function blank(w: number, h: number, v = 30): Gray {
  return { data: new Uint8Array(w * h).fill(v), width: w, height: h };
}

function rect(img: Gray, x0: number, y0: number, x1: number, y1: number, v: number) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) img.data[y * img.width + x] = v;
}

describe('fast9', () => {
  it('finds nothing on a flat image', () => {
    expect(fast9(blank(40, 40), 20)).toHaveLength(0);
  });

  it('finds the four corners of a bright square', () => {
    const img = blank(60, 60);
    rect(img, 20, 20, 40, 40, 220);
    const pts = fast9(img, 20);
    const near = (x: number, y: number) => pts.some((p) => Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2);
    expect(near(20, 20)).toBe(true);
    expect(near(39, 20)).toBe(true);
    expect(near(20, 39)).toBe(true);
    expect(near(39, 39)).toBe(true);
    // Straight edges are not corners.
    expect(pts.some((p) => Math.abs(p.x - 30) <= 2 && Math.abs(p.y - 20) <= 1)).toBe(false);
  });
});

describe('bucket', () => {
  it('caps the output count and prefers strong corners', () => {
    const cs = Array.from({ length: 100 }, (_, i) => ({ x: (i * 7) % 80, y: (i * 13) % 60, score: i }));
    const out = bucket(cs, 80, 60, 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out[0].score).toBe(99);
  });
});

describe('PointTracker', () => {
  it('keeps ids across small moves and reports median flow', () => {
    const t = new PointTracker(5);
    const a = t.update([{ x: 10, y: 10, score: 1 }, { x: 30, y: 30, score: 1 }]);
    const b = t.update([{ x: 12, y: 11, score: 1 }, { x: 32, y: 31, score: 1 }]);
    expect(b.map((x) => x.id).sort()).toEqual(a.map((x) => x.id).sort());
    expect(t.flow.dx).toBe(2);
    expect(t.flow.dy).toBe(1);
    expect(b[0].hist).toHaveLength(1);
  });
});

describe('quality', () => {
  it('scores a flat image as not sharp and a checkerboard as sharp', () => {
    expect(measureQuality(blank(32, 32, 128)).sharpness).toBe(0);
    const img = blank(32, 32);
    for (let i = 0; i < img.data.length; i++) img.data[i] = ((i % 32) + ((i / 32) | 0)) % 2 ? 200 : 40;
    const q = measureQuality(img);
    expect(q.sharpness).toBeGreaterThan(1000);
    expect(q.brightness).toBeCloseTo(120, 0);
  });
});

describe('median', () => {
  it('handles odd, even and empty arrays', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

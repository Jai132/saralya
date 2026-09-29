/**
 * Lightweight feature-point detection for the live camera overlay.
 *
 * FAST-9 corner detector (Rosten & Drummond) on a small grayscale frame, with 3×3 non-max suppression,
 * grid bucketing so points spread across the scene, and an adaptive threshold that keeps the count
 * near a target. Plus a nearest-neighbour tracker that gives each point a short trail and yields the
 * median image flow (used as a heading fallback when no motion sensor is available).
 */

export interface Gray {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface Corner {
  x: number;
  y: number;
  score: number;
}

/** RGBA ImageData → 8-bit luma. */
export function toGray(img: ImageData, out?: Uint8Array): Gray {
  const { data, width, height } = img;
  const g = out && out.length === width * height ? out : new Uint8Array(width * height);
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  return { data: g, width, height };
}

// Bresenham circle of radius 3: 16 offsets, clockwise from 12 o'clock.
const CIRCLE: [number, number][] = [
  [0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1], [2, 2], [1, 3],
  [0, 3], [-1, 3], [-2, 2], [-3, 1], [-3, 0], [-3, -1], [-2, -2], [-1, -3],
];

/** True if a 16-bit ring mask contains ≥ 9 contiguous set bits (with wrap-around). */
function hasArc9(mask: number): boolean {
  let m = mask | (mask << 16);
  // After k shifts-and-ANDs, a bit survives only if k+1 consecutive bits were set.
  for (let k = 0; k < 8; k++) m &= m >>> 1;
  return m !== 0;
}

export function fast9(img: Gray, threshold: number): Corner[] {
  const { data, width: w, height: h } = img;
  const offs = CIRCLE.map(([dx, dy]) => dy * w + dx);
  const scores = new Float32Array(w * h);
  const cands: number[] = [];
  const t = threshold;

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      const p = data[i];
      const hi = p + t;
      const lo = p - t;
      // High-speed test on the four compass pixels: any 9-arc covers at least 2 of them.
      const a = data[i + offs[0]], b = data[i + offs[4]], c = data[i + offs[8]], d = data[i + offs[12]];
      const nb = +(a > hi) + +(b > hi) + +(c > hi) + +(d > hi);
      const nd = +(a < lo) + +(b < lo) + +(c < lo) + +(d < lo);
      if (nb < 2 && nd < 2) continue;

      let bright = 0, dark = 0, sb = 0, sd = 0;
      for (let k = 0; k < 16; k++) {
        const v = data[i + offs[k]];
        if (v > hi) {
          bright |= 1 << k;
          sb += v - hi;
        } else if (v < lo) {
          dark |= 1 << k;
          sd += lo - v;
        }
      }
      let s = 0;
      if (nb >= 2 && hasArc9(bright)) s = sb;
      if (nd >= 2 && hasArc9(dark)) s = Math.max(s, sd);
      if (s > 0) {
        scores[i] = s;
        cands.push(i);
      }
    }
  }

  // 3×3 non-maximum suppression.
  const out: Corner[] = [];
  for (const i of cands) {
    const s = scores[i];
    if (
      s >= scores[i - 1] && s > scores[i + 1] &&
      s >= scores[i - w - 1] && s >= scores[i - w] && s >= scores[i - w + 1] &&
      s > scores[i + w - 1] && s > scores[i + w] && s > scores[i + w + 1]
    ) {
      out.push({ x: i % w, y: (i / w) | 0, score: s });
    }
  }
  return out;
}

/** Keep the strongest `n` corners while spreading them over a cols×rows grid. */
export function bucket(corners: Corner[], w: number, h: number, n: number, cols = 8, rows = 6): Corner[] {
  const sorted = [...corners].sort((a, b) => b.score - a.score);
  const cap = Math.max(2, Math.ceil((n / (cols * rows)) * 2));
  const counts = new Uint16Array(cols * rows);
  const out: Corner[] = [];
  for (const c of sorted) {
    const cell = Math.min(rows - 1, ((c.y / h) * rows) | 0) * cols + Math.min(cols - 1, ((c.x / w) * cols) | 0);
    if (counts[cell] >= cap) continue;
    counts[cell]++;
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

/** Stateful detector that adapts its FAST threshold to hold roughly `target` points. */
export class FeatureDetector {
  threshold = 22;
  constructor(public target = 150) {}

  detect(img: Gray): Corner[] {
    const raw = fast9(img, this.threshold);
    if (raw.length < this.target * 1.3) this.threshold = Math.max(7, this.threshold - 2);
    else if (raw.length > this.target * 4) this.threshold = Math.min(70, this.threshold + 2);
    return bucket(raw, img.width, img.height, this.target);
  }
}

export interface Track {
  id: number;
  x: number;
  y: number;
  age: number;
  hist: [number, number][];
}

/** Greedy nearest-neighbour association between consecutive detections. */
export class PointTracker {
  tracks: Track[] = [];
  flow = { dx: 0, dy: 0, matched: 0 };
  private nextId = 1;

  constructor(
    public radius = 7,
    public trail = 6,
  ) {}

  update(points: Corner[]): Track[] {
    const r2 = this.radius * this.radius;
    const prev = this.tracks;
    const pairs: { d: number; p: number; t: number }[] = [];
    for (let pi = 0; pi < points.length; pi++) {
      const p = points[pi];
      for (let ti = 0; ti < prev.length; ti++) {
        const dx = p.x - prev[ti].x;
        const dy = p.y - prev[ti].y;
        const d = dx * dx + dy * dy;
        if (d <= r2) pairs.push({ d, p: pi, t: ti });
      }
    }
    pairs.sort((a, b) => a.d - b.d);
    const usedP = new Uint8Array(points.length);
    const usedT = new Uint8Array(prev.length);
    const next: Track[] = [];
    const dxs: number[] = [];
    const dys: number[] = [];
    for (const pr of pairs) {
      if (usedP[pr.p] || usedT[pr.t]) continue;
      usedP[pr.p] = 1;
      usedT[pr.t] = 1;
      const t = prev[pr.t];
      const p = points[pr.p];
      dxs.push(p.x - t.x);
      dys.push(p.y - t.y);
      const hist = t.hist.length >= this.trail ? t.hist.slice(1) : t.hist.slice();
      hist.push([t.x, t.y]);
      next.push({ id: t.id, x: p.x, y: p.y, age: t.age + 1, hist });
    }
    for (let pi = 0; pi < points.length; pi++) {
      if (!usedP[pi]) next.push({ id: this.nextId++, x: points[pi].x, y: points[pi].y, age: 0, hist: [] });
    }
    this.flow = { dx: median(dxs), dy: median(dys), matched: dxs.length };
    this.tracks = next;
    return next;
  }
}

export function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

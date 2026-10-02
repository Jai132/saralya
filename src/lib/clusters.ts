/**
 * Rough "stock regions" from feature points: bin stable corners into a coarse grid, keep dense cells, join
 * neighbouring dense cells into connected blobs and return their bounding rectangles. Shelves full of goods
 * are corner-rich, blank walls aren't, so the blobs land on stock. It's a visual stand-in for the counting
 * models used in production, not a count.
 */

export interface Pt2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Points inside the blob. */
  n: number;
}

export function clusterPoints(
  pts: Pt2[],
  width: number,
  height: number,
  opts: { cell?: number; minPerCell?: number; minPoints?: number; maxArea?: number } = {},
): Rect[] {
  const cell = opts.cell ?? Math.max(8, Math.round(Math.max(width, height) / 14));
  const minPerCell = opts.minPerCell ?? 2;
  const minPoints = opts.minPoints ?? 5;
  // A fully stocked wall is one big dense blob; cut blobs larger than this (fraction of the frame) into pieces.
  const maxArea = (opts.maxArea ?? 0.09) * width * height;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const count = new Int32Array(cols * rows);
  for (const p of pts) {
    if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) continue;
    count[Math.floor(p.y / cell) * cols + Math.floor(p.x / cell)]++;
  }
  const seen = new Uint8Array(cols * rows);
  const out: Rect[] = [];
  const stack: number[] = [];
  for (let s = 0; s < count.length; s++) {
    if (seen[s] || count[s] < minPerCell) continue;
    const cells: number[] = [];
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      cells.push(i);
      const cx = i % cols;
      const cy = (i - cx) / cols;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx;
        if (!seen[j] && count[j] >= minPerCell) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    const set = new Set(cells);
    const members = pts.filter((p) => p.x >= 0 && p.y >= 0 && p.x < width && p.y < height && set.has(Math.floor(p.y / cell) * cols + Math.floor(p.x / cell)));
    split(members, 0);
  }

  function split(members: Pt2[], depth: number) {
    if (members.length < minPoints) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of members) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    if ((x1 - x0) * (y1 - y0) > maxArea && depth < 6 && members.length >= 2 * minPoints) {
      // Cut at the median along the longer side.
      const byX = x1 - x0 >= (y1 - y0) * 1.2;
      const sorted = [...members].sort((a, b) => (byX ? a.x - b.x : a.y - b.y));
      const mid = sorted.length >> 1;
      split(sorted.slice(0, mid), depth + 1);
      split(sorted.slice(mid), depth + 1);
      return;
    }
    // Pad by half a cell so the box encloses the goods rather than just their corners.
    const pad = cell / 2;
    const rx = Math.max(0, x0 - pad);
    const ry = Math.max(0, y0 - pad);
    out.push({ x: rx, y: ry, w: Math.min(width, x1 + pad) - rx, h: Math.min(height, y1 + pad) - ry, n: members.length });
  }
  return out.sort((a, b) => b.n - a.n);
}

export function iou(a: Rect, b: Rect): number {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

export interface TrackedRect extends Rect {
  id: number;
  /** Frames this region has been seen in a row; drawn once it's stable. */
  hits: number;
  misses: number;
}

/** Keeps regions stable across frames: matches by overlap, eases the rectangles, drops ones that vanish. */
export class RectTracker {
  private items: TrackedRect[] = [];
  private nextId = 1;

  update(rects: Rect[], ease = 0.35): TrackedRect[] {
    const used = new Set<number>();
    for (const t of this.items) {
      let best = -1, bestIou = 0.15;
      rects.forEach((r, i) => {
        if (used.has(i)) return;
        const o = iou(t, r);
        if (o > bestIou) {
          bestIou = o;
          best = i;
        }
      });
      if (best >= 0) {
        const r = rects[best];
        used.add(best);
        t.x += (r.x - t.x) * ease;
        t.y += (r.y - t.y) * ease;
        t.w += (r.w - t.w) * ease;
        t.h += (r.h - t.h) * ease;
        t.n = r.n;
        t.hits++;
        t.misses = 0;
      } else t.misses++;
    }
    this.items = this.items.filter((t) => t.misses < 4);
    rects.forEach((r, i) => {
      if (!used.has(i)) this.items.push({ ...r, id: this.nextId++, hits: 1, misses: 0 });
    });
    return this.items;
  }

  reset() {
    this.items = [];
  }
}

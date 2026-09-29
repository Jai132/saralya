import Delaunator from 'delaunator';
import { coverCrop } from '../../lib/camera';
import { FeatureDetector, PointTracker, toGray, Track } from '../../lib/features';
import { measureQuality, Quality } from '../../lib/quality';
import type { FrameEngine } from './engines/types';

export interface Analysis {
  tracks: Track[];
  quality: Quality;
  /** Median flow magnitude in analysis pixels. */
  motion: number;
  flow: { dx: number; dy: number };
  aw: number;
  ah: number;
  fps: number;
  ms: number;
}

/** Samples the visible part of the engine's frame at low resolution for FAST corners and quality. */
export class FrameAnalyzer {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  private detector = new FeatureDetector(150);
  private tracker = new PointTracker(7, 6);
  private gray?: Uint8Array;
  private times: number[] = [];
  latest: Analysis | null = null;

  step(engine: FrameEngine, viewW: number, viewH: number): Analysis | null {
    const { w, h } = engine.size();
    if (!w || !h || !viewW || !viewH) return null;
    const t0 = performance.now();
    const long = 192;
    const aspect = viewW / viewH;
    const aw = aspect >= 1 ? long : Math.round(long * aspect);
    const ah = aspect >= 1 ? Math.round(long / aspect) : long;
    if (this.canvas.width !== aw || this.canvas.height !== ah) {
      this.canvas.width = aw;
      this.canvas.height = ah;
    }
    const c = engine.cover ? coverCrop(w, h, viewW, viewH) : { sx: 0, sy: 0, sw: w, sh: h };
    try {
      this.ctx.drawImage(engine.source, c.sx, c.sy, c.sw, c.sh, 0, 0, aw, ah);
    } catch {
      return null;
    }
    const img = this.ctx.getImageData(0, 0, aw, ah);
    const g = toGray(img, this.gray);
    this.gray = g.data;
    const corners = this.detector.detect(g);
    const tracks = this.tracker.update(corners);
    const quality = measureQuality(g);
    const { dx, dy } = this.tracker.flow;

    const now = performance.now();
    this.times.push(now);
    while (this.times.length && now - this.times[0] > 1000) this.times.shift();

    this.latest = {
      tracks,
      quality,
      motion: Math.hypot(dx, dy),
      flow: { dx, dy },
      aw,
      ah,
      fps: this.times.length,
      ms: now - t0,
    };
    return this.latest;
  }
}

/** Draws the live wireframe, trails and feature dots over the camera image. */
export function drawOverlay(ctx: CanvasRenderingContext2D, a: Analysis, W: number, H: number, opts: { mesh: boolean; dim?: boolean }) {
  ctx.clearRect(0, 0, W, H);
  const sx = W / a.aw;
  const sy = H / a.ah;
  const tr = a.tracks;
  if (!tr.length) return;
  const alpha = opts.dim ? 0.45 : 1;

  if (opts.mesh && tr.length >= 3) {
    const coords = new Float64Array(tr.length * 2);
    for (let i = 0; i < tr.length; i++) {
      coords[2 * i] = tr[i].x;
      coords[2 * i + 1] = tr[i].y;
    }
    const d = new Delaunator(coords);
    const maxLen = 0.13 * Math.max(a.aw, a.ah);
    const max2 = maxLen * maxLen;
    const edge = (i: number, j: number) => {
      const dx = coords[2 * i] - coords[2 * j];
      const dy = coords[2 * i + 1] - coords[2 * j + 1];
      return dx * dx + dy * dy <= max2;
    };
    ctx.beginPath();
    const fill = new Path2D();
    const t = d.triangles;
    for (let k = 0; k < t.length; k += 3) {
      const i = t[k], j = t[k + 1], l = t[k + 2];
      if (!edge(i, j) || !edge(j, l) || !edge(l, i)) continue;
      const ax = coords[2 * i] * sx, ay = coords[2 * i + 1] * sy;
      const bx = coords[2 * j] * sx, by = coords[2 * j + 1] * sy;
      const cx = coords[2 * l] * sx, cy = coords[2 * l + 1] * sy;
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      fill.moveTo(ax, ay);
      fill.lineTo(bx, by);
      fill.lineTo(cx, cy);
      fill.closePath();
    }
    ctx.fillStyle = `rgba(20,184,166,${0.045 * alpha})`;
    ctx.fill(fill);
    ctx.strokeStyle = `rgba(94,234,212,${0.32 * alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Trails.
  ctx.lineWidth = 1.2;
  for (const p of tr) {
    const n = p.hist.length;
    if (n < 2) continue;
    for (let k = 1; k < n; k++) {
      ctx.strokeStyle = `rgba(45,212,191,${(k / n) * 0.55 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(p.hist[k - 1][0] * sx, p.hist[k - 1][1] * sy);
      ctx.lineTo(p.hist[k][0] * sx, p.hist[k][1] * sy);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(45,212,191,${0.6 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(p.hist[n - 1][0] * sx, p.hist[n - 1][1] * sy);
    ctx.lineTo(p.x * sx, p.y * sy);
    ctx.stroke();
  }

  // Dots: new points small and white, stable ones teal with a soft halo.
  for (const p of tr) {
    const x = p.x * sx;
    const y = p.y * sy;
    if (p.age >= 3) {
      ctx.fillStyle = `rgba(45,212,191,${0.22 * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(94,234,212,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(255,255,255,${0.8 * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

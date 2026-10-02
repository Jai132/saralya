import { ReactNode, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Boxes, FlaskConical, Scale, ScanText } from 'lucide-react';
import type { ShellState } from '../capture/CaptureShell';
import { clusterPoints, RectTracker } from '../../lib/clusters';
import { clusterLabel, STOCK_TOTAL, STOCK_WALLS, STORAGE_COUNT } from '../../data/msme';
import { indian } from '../../lib/format';

const STOCK_STEPS = new Set(['shelf-left', 'shelf-back', 'shelf-right', 'storage']);
const WALLS = Object.keys(STOCK_WALLS);

/**
 * Draws low-opacity labelled rectangles over clusters of stable feature points. Reads the shell's latest
 * analysis on its own timer so the boxes move smoothly without re-rendering the HUD.
 */
function StockBoxes({ analysis }: { analysis: ShellState['analysis'] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // The shell passes a fresh getter each render; keep the latest in a ref so the timer (and tracker) persist.
  const get = useRef(analysis);
  get.current = analysis;
  useEffect(() => {
    const tracker = new RectTracker();
    const labels = new Map<number, string>();
    const id = window.setInterval(() => {
      const cv = ref.current;
      const a = get.current();
      if (!cv || !a) return;
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      if (cv.width !== Math.round(W * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      const ctx = cv.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const pts = a.tracks.filter((t) => t.age >= 2);
      // Ignore the bands under the prompt banner and the bottom controls.
      const rects = clusterPoints(pts, a.aw, a.ah).filter((r) => r.w * r.h > a.aw * a.ah * 0.006 && r.w * r.h < a.aw * a.ah * 0.5).slice(0, 10);
      const tracked = tracker.update(rects);
      const sx = W / a.aw;
      const sy = H / a.ah;
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      for (const r of tracked) {
        if (r.hits < 3) continue;
        const fade = r.misses ? 1 - r.misses / 4 : 1;
        if (!labels.has(r.id)) labels.set(r.id, clusterLabel(r, a.ah));
        const x = r.x * sx, y = r.y * sy, w = r.w * sx, h = r.h * sy;
        ctx.fillStyle = `rgba(251,191,36,${0.09 * fade})`;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = `rgba(251,191,36,${0.55 * fade})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        const label = labels.get(r.id)!;
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = `rgba(120,53,15,${0.7 * fade})`;
        ctx.fillRect(x, Math.max(0, y - 14), tw, 14);
        ctx.fillStyle = `rgba(254,243,199,${fade})`;
        ctx.fillText(label, x + 4, Math.max(10, y - 4));
      }
    }, 120);
    return () => window.clearInterval(id);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/** Count that rolls towards its target, like a meter. */
function useRolling(target: number) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const d = target - cur.current;
      if (Math.abs(d) < 0.5) cur.current = target;
      else cur.current += d * 0.12 + Math.sign(d) * 0.4;
      setV(Math.round(cur.current));
      if (cur.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function StockTicker({ s }: { s: ShellState }) {
  const doneWalls = WALLS.filter((w) => (s.shots[w] ?? 0) > 0);
  let target = doneWalls.reduce((a, w) => a + STOCK_WALLS[w], 0);
  const current = WALLS.includes(s.step.id) && !doneWalls.includes(s.step.id) ? s.step.id : null;
  // Items "appear" as the wall is swept; a little jitter keeps it from looking like a progress bar.
  if (current && s.sweeping) target += Math.floor(STOCK_WALLS[current] * Math.min(1, s.sweepProgress) * (0.92 + 0.08 * Math.sin(s.sweepProgress * 17)));
  target = Math.min(STOCK_TOTAL, target);
  const shown = useRolling(target);
  return (
    <div className="w-[min(58vw,15rem)] rounded-xl border border-amber-300/25 bg-black/55 px-3 py-2 text-white shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
        <Boxes className="h-3.5 w-3.5" /> Stock ticker
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-bold tabular-nums leading-none">{indian(shown)}</span>
        <span className="text-xs text-white/75">items detected</span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {WALLS.map((w) => (
          <span key={w} className={`h-1 flex-1 rounded-full ${doneWalls.includes(w) ? 'bg-amber-300' : w === current ? 'animate-pulseDot bg-amber-300/60' : 'bg-white/20'}`} />
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-[9.5px] text-white/60">
        <FlaskConical className="h-3 w-3" /> Simulated · counting uses specialist models in production
      </div>
    </div>
  );
}

function ResultChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[92%] animate-fadeUp items-center gap-2 rounded-2xl border border-white/15 bg-navy/85 px-3 py-2 text-[12.5px] text-white shadow-lg backdrop-blur-md">
      <span className="text-teal-light">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-medium text-white/80">Simulated</span>
    </div>
  );
}

export function walkthroughOverlay(board: { text: string; matchesUdyam: boolean }) {
  return function Overlay(s: ShellState) {
    const id = s.step.id;
    const shot = (s.shots[id] ?? 0) > 0;
    const stock = STOCK_STEPS.has(id);
    return (
      <>
        {stock && s.engine !== 'ar' && <StockBoxes analysis={s.analysis} />}
        {(stock || WALLS.some((w) => (s.shots[w] ?? 0) > 0)) && id !== 'storage' && (
          <div className="absolute bottom-[31%] right-3">
            <StockTicker s={s} />
          </div>
        )}
        <div className="absolute inset-x-0 top-[47%]">
          {id === 'frontage' && shot && (
            <ResultChip icon={<ScanText className="h-4 w-4" />}>
              Board reads: <b className="tracking-wide">{board.text}</b>
              {board.matchesUdyam ? (
                <span className="ml-1 inline-flex items-center gap-0.5 text-teal-light">
                  · matches Udyam <BadgeCheck className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="ml-1 text-amber-200">· name differs from Udyam</span>
              )}
            </ResultChip>
          )}
          {id === 'counter' && shot && <ResultChip icon={<Scale className="h-4 w-4" />}>Weighing scale and billing counter in frame</ResultChip>}
          {id === 'storage' && shot && (
            <ResultChip icon={<Boxes className="h-4 w-4" />}>
              Back stock: ~{STORAGE_COUNT.sacks} sacks, ~{STORAGE_COUNT.cartons} cartons
            </ResultChip>
          )}
        </div>
      </>
    );
  };
}

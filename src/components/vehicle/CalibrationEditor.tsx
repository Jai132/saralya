import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, RotateCcw, Ruler, X } from 'lucide-react';
import { Button, Chip } from '../ui';
import { isConvexQuad, Pt, scalePxPerMm, warpQuad } from '../../lib/homography';
import type { PartTemplate } from './templates';

const CORNER_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const CORNER_SHORT = ['TL', 'TR', 'BR', 'BL'];
const MAX_SRC = 1280;
const PREVIEW_W = 600;

export interface CalibrationResult {
  /** Corners in the stored photo's pixel coordinates (TL, TR, BR, BL). */
  corners: Pt[];
  rectified: Blob;
  pxPerMm?: number;
}

interface Props {
  imageUrl: string;
  template: PartTemplate;
  initial?: Pt[];
  onSave: (r: CalibrationResult) => void;
  onCancel: () => void;
}

/**
 * Four-point calibration: drag the handles onto the part's reference corners; the photo is rectified to the
 * template's canonical rectangle in real time through a DLT homography.
 */
export function CalibrationEditor({ imageUrl, template, initial, onSave, onCancel }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const srcCanvas = useRef<HTMLCanvasElement | null>(null);
  const srcData = useRef<ImageData | null>(null);
  const [img, setImg] = useState<{ w: number; h: number; scale: number } | null>(null);
  const [box, setBox] = useState({ x: 0, y: 0, w: 1, h: 1, s: 1 });
  // Handles live in *source canvas* pixels (the photo downscaled to ≤ MAX_SRC).
  const [quad, setQuad] = useState<Pt[] | null>(null);
  const [touched, setTouched] = useState<boolean[]>([false, false, false, false]);
  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const raf = useRef(0);

  const aspect = template.widthMm / template.heightMm;
  const outW = PREVIEW_W;
  const outH = Math.max(40, Math.round(PREVIEW_W / aspect));
  const isPlate = template.id === 'number-plate';

  // Load the photo into an offscreen canvas.
  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, MAX_SRC / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * s);
      c.height = Math.round(im.naturalHeight * s);
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(im, 0, 0, c.width, c.height);
      srcCanvas.current = c;
      srcData.current = g.getImageData(0, 0, c.width, c.height);
      setImg({ w: c.width, h: c.height, scale: s });
      if (initial) setQuad(initial.map(([x, y]) => [x * s, y * s] as Pt));
      else {
        // Default inset quad with the template's aspect ratio — a starting point, not a detection.
        const qw = Math.min(c.width * 0.62, c.height * 0.62 * aspect);
        const qh = qw / aspect;
        const x0 = (c.width - qw) / 2;
        const y0 = (c.height - qh) / 2;
        setQuad([
          [x0, y0],
          [x0 + qw, y0],
          [x0 + qw, y0 + qh],
          [x0, y0 + qh],
        ]);
      }
      if (initial) setTouched([true, true, true, true]);
    };
    im.src = imageUrl;
  }, [imageUrl, aspect, initial]);

  // Fit the photo inside the stage (object-contain).
  const layout = useCallback(() => {
    const el = stageRef.current;
    if (!el || !img) return;
    const W = el.clientWidth;
    const H = el.clientHeight;
    const s = Math.min(W / img.w, H / img.h);
    setBox({ x: (W - img.w * s) / 2, y: (H - img.h * s) / 2, w: img.w * s, h: img.h * s, s });
  }, [img]);
  useLayoutEffect(() => {
    layout();
    const ro = new ResizeObserver(layout);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [layout]);

  const convex = quad ? isConvexQuad(quad) : false;

  // Live rectified preview (half resolution while dragging).
  useEffect(() => {
    if (!quad || !srcData.current) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const cv = previewRef.current;
      if (!cv || !srcData.current) return;
      const f = drag ? 0.5 : 1;
      const w = Math.round(outW * f);
      const h = Math.round(outH * f);
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      const g = cv.getContext('2d')!;
      if (!convex) {
        g.fillStyle = '#1f2937';
        g.fillRect(0, 0, w, h);
        return;
      }
      const out = warpQuad(srcData.current, quad, w, h);
      if (out) g.putImageData(new ImageData(out.data, w, h), 0, 0);
    });
  }, [quad, drag, convex, outW, outH]);

  // Loupe: 3× zoom around the dragged handle.
  useEffect(() => {
    const cv = loupeRef.current;
    if (!drag || !cv || !quad || !srcCanvas.current) return;
    const g = cv.getContext('2d')!;
    const S = cv.width;
    const zoom = 3;
    const [hx, hy] = quad[drag.i];
    const span = S / zoom / box.s;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    g.drawImage(srcCanvas.current, hx - span / 2, hy - span / 2, span, span, 0, 0, S, S);
    g.strokeStyle = '#2dd4bf';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(S / 2, S / 2 - 18);
    g.lineTo(S / 2, S / 2 + 18);
    g.moveTo(S / 2 - 18, S / 2);
    g.lineTo(S / 2 + 18, S / 2);
    g.stroke();
    g.restore();
  }, [drag, quad, box.s]);

  const toImg = (clientX: number, clientY: number): Pt => {
    const r = stageRef.current!.getBoundingClientRect();
    const x = (clientX - r.left - box.x) / box.s;
    const y = (clientY - r.top - box.y) / box.s;
    return [Math.max(0, Math.min(img!.w, x)), Math.max(0, Math.min(img!.h, y))];
  };

  const onDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ i, x: e.clientX, y: e.clientY });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag || !quad) return;
    const p = toImg(e.clientX, e.clientY);
    setQuad(quad.map((q, k) => (k === drag.i ? p : q)));
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
  };
  const onUp = () => {
    if (!drag) return;
    setTouched((t) => t.map((v, k) => v || k === drag.i));
    setDrag(null);
  };

  const next = touched.findIndex((t) => !t);
  const stageRect = stageRef.current?.getBoundingClientRect();

  const pxPerMm = useMemo(() => {
    if (!quad || !img || !isPlate) return null;
    // Report in the *original* photo's pixels.
    const orig = quad.map(([x, y]) => [x / img.scale, y / img.scale] as Pt);
    return scalePxPerMm(orig, template.widthMm, template.heightMm);
  }, [quad, img, isPlate, template]);

  const save = async () => {
    if (!quad || !srcData.current || !img || !convex) return;
    setSaving(true);
    const out = warpQuad(srcData.current, quad, outW, outH)!;
    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    c.getContext('2d')!.putImageData(new ImageData(out.data, outW, outH), 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.9));
    setSaving(false);
    if (!blob) return;
    onSave({ corners: quad.map(([x, y]) => [x / img.scale, y / img.scale] as Pt), rectified: blob, pxPerMm: pxPerMm ?? undefined });
  };

  const reset = () => {
    if (!img) return;
    const qw = Math.min(img.w * 0.62, img.h * 0.62 * aspect);
    const qh = qw / aspect;
    const x0 = (img.w - qw) / 2;
    const y0 = (img.h - qh) / 2;
    setQuad([
      [x0, y0],
      [x0 + qw, y0],
      [x0 + qw, y0 + qh],
      [x0, y0 + qh],
    ]);
    setTouched([false, false, false, false]);
  };

  const disp = (p: Pt) => [box.x + p[0] * box.s, box.y + p[1] * box.s];

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-navy text-white">
      <div className="flex items-center gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),10px)]">
        <button onClick={onCancel} className="rounded-full bg-white/10 p-1.5" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-light">4-point calibration</div>
          <div className="truncate font-serif text-[17px] font-semibold">{template.part}</div>
        </div>
        {!template.planar && <Chip tone="ember">Curved part — approximate</Chip>}
      </div>

      <div className="px-3 pb-2 text-[13px] text-white/80">
        {next >= 0 ? (
          <>
            Drag the <b className="text-teal-light">{CORNER_SHORT[next]}</b> handle onto the part’s {CORNER_NAMES[next]} corner.
          </>
        ) : convex ? (
          'All four corners placed. Fine-tune with the loupe, then save.'
        ) : (
          <span className="inline-flex items-center gap-1 text-orange-300">
            <AlertTriangle className="h-4 w-4" /> Handles cross over — keep them in TL → TR → BR → BL order.
          </span>
        )}
      </div>

      <div
        ref={stageRef}
        className="relative mx-3 min-h-[40vh] flex-1 touch-none overflow-hidden rounded-2xl bg-black"
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {img && (
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          />
        )}
        {quad && img && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <polygon points={quad.map((p) => disp(p).join(',')).join(' ')} fill="rgba(20,184,166,0.15)" stroke={convex ? '#2dd4bf' : '#fb923c'} strokeWidth={2} />
          </svg>
        )}
        {quad &&
          img &&
          quad.map((p, i) => {
            const [x, y] = disp(p);
            return (
              <button
                key={i}
                onPointerDown={onDown(i)}
                aria-label={`${CORNER_NAMES[i]} handle`}
                className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full touch-none"
                style={{ left: x, top: y }}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-bold ${
                    touched[i] ? 'border-teal-light bg-teal/80' : i === next ? 'animate-pulseDot border-white bg-white/30' : 'border-white/70 bg-black/40'
                  }`}
                >
                  {CORNER_SHORT[i]}
                </span>
              </button>
            );
          })}
        {drag && stageRect && (
          <canvas
            ref={loupeRef}
            width={128}
            height={128}
            className="pointer-events-none absolute rounded-full border-2 border-teal-light shadow-2xl"
            style={{
              left: Math.min(stageRect.width - 132, Math.max(4, drag.x - stageRect.left - 64)),
              top: Math.max(4, drag.y - stageRect.top - 170),
              width: 128,
              height: 128,
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-[96px_1fr] gap-3 px-3 pt-3">
        <TemplateDiagram template={template} highlight={next} touched={touched} />
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/60">
            <span>Rectified to template · live</span>
            {pxPerMm != null && (
              <span className="inline-flex items-center gap-1 normal-case tracking-normal text-teal-light">
                <Ruler className="h-3 w-3" /> Scale recovered: {pxPerMm.toFixed(2)} px/mm
              </span>
            )}
          </div>
          <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: `${outW} / ${outH}`, maxHeight: '22vh' }}>
            <canvas ref={previewRef} className="h-full w-full" />
            <svg viewBox={`0 0 ${template.widthMm} ${template.heightMm}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <path d={template.outline} fill="none" stroke="#2dd4bf" strokeOpacity={0.85} strokeWidth={template.widthMm / 150} vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          {isPlate && <div className="mt-1 text-[10px] text-white/50">Plate size {template.widthMm}×{template.heightMm} mm — placeholder HSRP size, verify against spec.</div>}
        </div>
      </div>

      <div className="flex gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        <Button variant="glass" onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>
          Reset
        </Button>
        <Button block onClick={save} disabled={!convex} loading={saving} icon={<Check className="h-4 w-4" />}>
          Save calibration
        </Button>
      </div>
    </div>,
    document.body,
  );
}

/** Small template drawing with the reference corners marked; the next corner to place pulses. */
export function TemplateDiagram({ template, highlight, touched }: { template: PartTemplate; highlight: number; touched: boolean[] }) {
  const pad = template.widthMm * 0.12;
  const vb = `${-pad} ${-pad} ${template.widthMm + 2 * pad} ${template.heightMm + 2 * pad}`;
  const r = Math.max(template.widthMm, template.heightMm) * 0.06;
  return (
    <div className="rounded-lg bg-white p-1.5">
      <svg viewBox={vb} className="h-auto w-full">
        <path d={template.outline} fill="#EEF8F6" stroke="#0B1B34" strokeWidth={template.widthMm / 90} />
        {template.corners.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={touched[i] ? '#0F766E' : i === highlight ? '#C2410C' : '#94a3b8'} className={i === highlight ? 'animate-pulseDot' : ''} />
          </g>
        ))}
      </svg>
      <div className="mt-1 text-center text-[9px] leading-tight text-ink-soft">
        {template.widthMm}×{template.heightMm} mm
        <br />
        illustrative
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, Flashlight, Loader2, MonitorPlay, QrCode, X } from 'lucide-react';
import { Button } from '../ui';
import { CameraError, CameraHandle, coverCrop, grabJpeg, openRearCamera } from '../../lib/camera';
import { decodeQr } from '../../lib/qr';
import { sealCapture } from '../../lib/seal';
import { useGeo } from '../../lib/sensors';
import { useSettings } from '../../store/settings';
import type { CaptureMeta } from '../../store/captures';
import { drawCounter } from './qrProps';

interface Props {
  appId: string;
  stepId: string;
  title: string;
  hint: string;
  /** Builds the printed prop shown in demo mode (its QR is decoded for real). */
  demoProp: () => HTMLCanvasElement;
  onDecoded: (text: string, capture: CaptureMeta) => void;
  onClose: () => void;
}

type Source = { kind: 'camera'; cam: CameraHandle } | { kind: 'demo'; canvas: HTMLCanvasElement; stop: () => void };

/**
 * Full-screen live QR scanner. Frames come from the rear camera (or, in demo mode, a canvas showing a printed
 * QR on a shop counter); jsQR decodes them on the device. The decoding frame is sealed into the capture chain.
 */
export function QrScanner({ appId, stepId, title, hint, demoProp, onDecoded, onClose }: Props) {
  const engine = useSettings((s) => s.engine);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const srcRef = useRef<Source | null>(null);
  const [mode, setMode] = useState<'camera' | 'demo'>(engine === 'demo' ? 'demo' : 'camera');
  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'error'>('starting');
  const [error, setError] = useState<CameraError | null>(null);
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const geo = useGeo(true);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const doneRef = useRef(false);
  const cb = useRef({ onDecoded, demoProp });
  cb.current = { onDecoded, demoProp };

  // ————— Source lifecycle —————
  useEffect(() => {
    let cancelled = false;
    const stage = stageRef.current!;
    setStatus('starting');
    setError(null);
    (async () => {
      if (mode === 'camera') {
        const video = document.createElement('video');
        video.className = 'absolute inset-0 h-full w-full object-cover';
        stage.appendChild(video);
        try {
          const cam = await openRearCamera(video);
          if (cancelled) return cam.stop();
          srcRef.current = { kind: 'camera', cam };
          setTorch({ supported: cam.torchSupported, on: false });
          setStatus('scanning');
        } catch (e) {
          video.remove();
          if (cancelled) return;
          setError(e instanceof CameraError ? e : new CameraError('unknown', String(e)));
          setStatus('error');
        }
        return;
      }
      // Demo: a printed prop on the counter that drifts into view like a hand-held phone approaching it.
      const canvas = document.createElement('canvas');
      canvas.className = 'absolute inset-0 h-full w-full';
      stage.appendChild(canvas);
      const prop = cb.current.demoProp();
      const g = canvas.getContext('2d')!;
      const t0 = performance.now();
      let raf = 0;
      const draw = () => {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        if (canvas.width !== Math.round(W * dpr)) {
          canvas.width = Math.round(W * dpr);
          canvas.height = Math.round(H * dpr);
        }
        const t = (performance.now() - t0) / 1000;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawCounter(g, W, H, t);
        const approach = Math.min(1, t / 1.6);
        const ease = approach * approach * (3 - 2 * approach);
        const fit = Math.min((W * 0.86) / prop.width, (H * 0.62) / prop.height);
        const scale = fit * (0.5 + 0.5 * ease) * (1 + Math.sin(t * 0.9) * 0.025);
        g.save();
        g.translate(W / 2 + Math.sin(t * 0.7) * W * 0.02, H * 0.47 + Math.cos(t * 0.6) * H * 0.012);
        g.rotate(Math.sin(t * 0.5) * 0.06 - 0.03);
        g.scale(scale, scale);
        g.shadowColor = 'rgba(0,0,0,0.45)';
        g.shadowBlur = 30;
        g.drawImage(prop, -prop.width / 2, -prop.height / 2);
        g.restore();
        // Gentle exposure variation, like a real phone camera.
        g.fillStyle = `rgba(0,0,0,${0.06 + 0.04 * Math.sin(t * 1.3)})`;
        g.fillRect(0, 0, W, H);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      srcRef.current = { kind: 'demo', canvas, stop: () => cancelAnimationFrame(raf) };
      setStatus('scanning');
    })();
    return () => {
      cancelled = true;
      const s = srcRef.current;
      srcRef.current = null;
      if (s?.kind === 'camera') {
        s.cam.stop();
        s.cam.video.remove();
      } else if (s?.kind === 'demo') {
        s.stop();
        s.canvas.remove();
      }
    };
  }, [mode]);

  // ————— Decode loop —————
  useEffect(() => {
    if (status !== 'scanning') return;
    const work = document.createElement('canvas');
    const wctx = work.getContext('2d', { willReadFrequently: true })!;
    let busy = false;
    const id = window.setInterval(async () => {
      const s = srcRef.current;
      const stage = stageRef.current;
      if (!s || !stage || busy || doneRef.current) return;
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      // Visible part of the source, so a QR is only "seen" when it's actually on screen.
      const sw = s.kind === 'camera' ? s.cam.video.videoWidth : s.canvas.width;
      const sh = s.kind === 'camera' ? s.cam.video.videoHeight : s.canvas.height;
      if (!sw || !sh) return;
      const crop = s.kind === 'camera' ? coverCrop(sw, sh, W, H) : { sx: 0, sy: 0, sw, sh };
      const k = Math.min(1, 900 / Math.max(crop.sw, crop.sh));
      work.width = Math.round(crop.sw * k);
      work.height = Math.round(crop.sh * k);
      const src = s.kind === 'camera' ? s.cam.video : s.canvas;
      wctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, work.width, work.height);
      const hit = decodeQr(wctx.getImageData(0, 0, work.width, work.height));
      if (!hit) return;
      busy = true;
      doneRef.current = true;
      // Freeze the frame that decoded, so the outline stays on the code (and that exact frame is sealed).
      if (s.kind === 'camera') s.cam.video.pause();
      else s.stop();
      // Outline the code where it sits on screen.
      const ov = overlayRef.current;
      if (ov) {
        const dpr = Math.min(window.devicePixelRatio, 2);
        ov.width = Math.round(W * dpr);
        ov.height = Math.round(H * dpr);
        const o = ov.getContext('2d')!;
        o.setTransform(dpr, 0, 0, dpr, 0, 0);
        const fx = W / work.width;
        const fy = H / work.height;
        o.beginPath();
        hit.corners.forEach((p, i) => (i ? o.lineTo(p.x * fx, p.y * fy) : o.moveTo(p.x * fx, p.y * fy)));
        o.closePath();
        o.fillStyle = 'rgba(45,212,191,0.18)';
        o.fill();
        o.strokeStyle = '#2dd4bf';
        o.lineWidth = 4;
        o.lineJoin = 'round';
        o.stroke();
      }
      setStatus('found');
      const frame = await grabJpeg(src, sw, sh);
      const g = geoRef.current;
      const capture = await sealCapture({
        appId,
        stepId,
        label: title,
        engine: s.kind === 'camera' ? 'camera' : 'demo',
        blob: frame.blob,
        width: frame.width,
        height: frame.height,
        geo: g.status === 'ok' ? { lat: g.lat, lng: g.lng, accuracy: g.accuracy } : null,
        note: `QR decoded on device · ${hit.text.length} characters`,
      });
      window.setTimeout(() => cb.current.onDecoded(hit.text, capture), 700);
    }, 120);
    return () => window.clearInterval(id);
  }, [status, appId, stepId, title]);

  const toggleTorch = async () => {
    const s = srcRef.current;
    if (s?.kind !== 'camera' || !torch.supported) return;
    try {
      await s.cam.setTorch(!torch.on);
      setTorch((t) => ({ ...t, on: !t.on }));
    } catch {
      /* torch busy */
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <div ref={stageRef} className="absolute inset-0" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Reticle */}
      {status !== 'error' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-square w-[72%] max-w-[22rem] rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
            {['-left-0.5 -top-0.5 border-l-4 border-t-4 rounded-tl-3xl', '-right-0.5 -top-0.5 border-r-4 border-t-4 rounded-tr-3xl', '-bottom-0.5 -left-0.5 border-b-4 border-l-4 rounded-bl-3xl', '-bottom-0.5 -right-0.5 border-b-4 border-r-4 rounded-br-3xl'].map((c) => (
              <span key={c} className={`absolute h-10 w-10 ${status === 'found' ? 'border-teal-light' : 'border-white'} ${c}`} />
            ))}
            {status === 'scanning' && <span className="absolute inset-x-4 h-0.5 animate-scanline rounded-full bg-teal-light/80 shadow-[0_0_12px_2px_rgba(45,212,191,0.6)]" />}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 px-3 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="rounded-full bg-black/40 p-1.5 backdrop-blur-md" aria-label="Close scanner">
            <X className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-teal/85 px-2.5 py-1 text-[11px] font-semibold">
            <Camera className="h-3 w-3" /> Live capture only
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] backdrop-blur-md">{mode === 'demo' ? 'Demo scene' : 'Camera'}</span>
        </div>
        <div className="mt-3 rounded-2xl bg-black/50 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <QrCode className="h-4 w-4 text-teal-light" /> {title}
          </div>
          <div className="mt-0.5 text-[13px] text-white/75">{hint}</div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),18px)]">
        {status === 'found' ? (
          <div className="animate-fadeUp rounded-full bg-teal px-4 py-2 text-sm font-semibold shadow-lg">QR decoded · sealing frame…</div>
        ) : status === 'scanning' ? (
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm backdrop-blur-md">
            <Loader2 className="h-4 w-4 animate-spin text-teal-light" /> Looking for a QR code…
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          {mode === 'camera' && status !== 'error' && (
            <>
              <Button size="sm" variant="glass" onClick={() => setMode('demo')} icon={<MonitorPlay className="h-4 w-4" />}>
                No QR handy? Use demo
              </Button>
              {torch.supported && (
                <button onClick={toggleTorch} className={`rounded-full p-2.5 backdrop-blur-md ${torch.on ? 'bg-yellow-300 text-navy' : 'bg-black/40'}`} aria-label="Torch">
                  <Flashlight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {mode === 'demo' && engine !== 'demo' && status === 'scanning' && (
            <Button size="sm" variant="glass" onClick={() => setMode('camera')} icon={<Camera className="h-4 w-4" />}>
              Use camera
            </Button>
          )}
        </div>
        <div className="text-center text-[11px] text-white/55">Decoded on this phone. The frame is sealed into your evidence chain.</div>
      </div>

      {status === 'error' && error && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy p-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <CameraOff className="h-7 w-7 text-orange-300" />
            </div>
            <h2 className="mb-2 font-serif text-xl font-semibold">{error.reason === 'denied' ? 'Camera access is off' : 'Couldn’t start the camera'}</h2>
            <p className="mb-6 text-sm text-white/70">{error.message}</p>
            <div className="space-y-2">
              <Button block onClick={() => setMode('demo')} icon={<MonitorPlay className="h-4 w-4" />}>
                Scan a demo QR instead
              </Button>
              <Button block variant="ghost" className="!text-white/70" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

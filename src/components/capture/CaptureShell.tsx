import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Camera, CameraOff, Check, Flashlight, ListChecks, MonitorPlay, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button, Sheet } from '../ui';
import { ChallengeCard, ChallengeStatus, PromptBanner, QualityMeter, SealTicker, Shutter, TopBar } from './HUD';
import { PointCloudMiniMap, MiniMapHandle } from './PointCloudMiniMap';
import { Analysis, drawOverlay, FrameAnalyzer } from './analyzer';
import { startCameraEngine } from './engines/cameraEngine';
import { startDemoEngine } from './engines/demoEngine';
import type { FrameEngine } from './engines/types';
import { CaptureScript, CaptureStep } from '../../data/scripts';
import { CHALLENGES, CHALLENGE_WINDOW_S, ChallengeDef, randomCode } from '../../data/challenges';
import { useSettings } from '../../store/settings';
import { CaptureMeta, EngineKind, useCaptures } from '../../store/captures';
import { detectCapabilities } from '../../lib/capabilities';
import { CameraError } from '../../lib/camera';
import { useGeo, useOrientationPose, Pose } from '../../lib/sensors';
import { verdict as qualityVerdict, QualityVerdict } from '../../lib/quality';
import { linkHash, sha256Hex } from '../../lib/hashchain';
import { blobs } from '../../lib/storage';

export interface ChallengeResult {
  id: string;
  text: string;
  stepId: string;
  issuedAt: number;
  windowS: number;
  result: 'verified' | 'missed';
  respondedInS?: number;
}

export interface CaptureSummary {
  captureIds: string[];
  challenges: ChallengeResult[];
  durationMs: number;
  coverage: number;
  engine: EngineKind;
  cloudPoints: number;
  stepShots: Record<string, number>;
}

/** What flow-specific overlays can read. */
export interface ShellState {
  step: CaptureStep;
  stepIdx: number;
  shots: Record<string, number>;
  coverage: number;
  sweepProgress: number;
  points: number;
  captures: number;
  engine: EngineKind | null;
}

interface Props {
  script: CaptureScript;
  appId: string;
  onDone: (s: CaptureSummary) => void;
  onExit: () => void;
  /** Flow-specific layer drawn above the feature overlay (silhouettes, tickers, floor plan…). */
  overlay?: (s: ShellState) => ReactNode;
  onCaptured?: (c: CaptureMeta, step: CaptureStep) => void;
}

const BINS = 36;

interface ActiveChallenge {
  def: ChallengeDef;
  code?: string;
  stepId: string;
  issuedAt: number;
  attempt: number;
  status: ChallengeStatus;
}

export function CaptureShell({ script, appId, onDone, onExit, overlay, onCaptured }: Props) {
  const engineChoice = useSettings((s) => s.engine);
  const openSettings = useSettings((s) => s.openSettings);
  const addCapture = useCaptures((s) => s.add);
  const headOf = useCaptures((s) => s.head);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<MiniMapHandle>(null);
  const engineRef = useRef<FrameEngine | null>(null);
  const analyzer = useRef(new FrameAnalyzer());
  const latest = useRef<Analysis | null>(null);

  const [forced, setForced] = useState<EngineKind | null>(null);
  const [retry, setRetry] = useState(0);
  const [engine, setEngine] = useState<{ status: 'starting' | 'running' | 'error'; kind?: EngineKind; label?: string; torch?: boolean; error?: CameraError }>({
    status: 'starting',
  });

  const geo = useGeo(true);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const orient = useOrientationPose(true);

  const [stepIdx, setStepIdx] = useState(0);
  const [shots, setShots] = useState<Record<string, number>>({});
  const [stepDone, setStepDone] = useState(false);
  const step = script.steps[stepIdx];
  const stepRef = useRef(step);
  stepRef.current = step;

  const [hud, setHud] = useState({ verdict: 'ok' as QualityVerdict, brightness: 128, sharpness: 100, points: 0, fps: 0, coverage: new Array(BINS).fill(0) as number[], sweep: 0 });
  const [sweeping, setSweeping] = useState(false);
  const sweep = useRef({ active: false, startedAt: 0, min: 0, max: 0, keyframes: 0, progress: 0 });

  const [seal, setSeal] = useState({ hash: '', count: 0, pulse: 0 });
  const captureIds = useRef<string[]>([]);
  const sealQueue = useRef<Promise<unknown>>(Promise.resolve());

  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [clock, setClock] = useState(Date.now());
  const challengeLog = useRef<ChallengeResult[]>([]);
  const usedChallenges = useRef(new Set<string>());
  const [resolved, setResolved] = useState<Record<string, boolean>>({});

  const [flash, setFlash] = useState(0);
  const [shake, setShake] = useState(0);
  const [nudge, setNudge] = useState<string | null>(null);
  const blocked = useRef({ n: 0, at: 0 });
  const [torchOn, setTorchOn] = useState(false);
  const [checklist, setChecklist] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const startedAt = useRef(Date.now());
  const coverageBins = useRef(new Array(BINS).fill(0) as number[]);
  const pose = useRef<Pose>({ yaw: 0, pitch: 0 });

  // ————— Engine lifecycle —————
  useEffect(() => {
    let cancelled = false;
    let eng: FrameEngine | null = null;
    setEngine({ status: 'starting' });
    (async () => {
      const caps = await detectCapabilities();
      const kind: EngineKind =
        forced ?? (engineChoice === 'demo' ? 'demo' : engineChoice === 'camera' || engineChoice === 'ar' ? 'camera' : caps.camera && caps.secure ? 'camera' : 'demo');
      try {
        eng = kind === 'demo' ? await startDemoEngine(stageRef.current!, script.demo) : await startCameraEngine(stageRef.current!);
      } catch (e) {
        if (!cancelled) setEngine({ status: 'error', error: e instanceof CameraError ? e : new CameraError('unknown', String(e)) });
        return;
      }
      if (cancelled) {
        eng.stop();
        return;
      }
      engineRef.current = eng;
      miniRef.current?.clear();
      setEngine({ status: 'running', kind: eng.kind, label: eng.label, torch: eng.torch?.supported });
    })();
    return () => {
      cancelled = true;
      eng?.stop();
      engineRef.current = null;
      setTorchOn(false);
    };
  }, [engineChoice, forced, retry, script.demo]);

  // ————— Sealing —————
  const sealFrame = useCallback(
    (stepId: string, label: string, note?: string) => {
      const run = async () => {
        const eng = engineRef.current;
        if (!eng) return null;
        const a = latest.current;
        const g = geoRef.current;
        const { blob, width, height } = await eng.capture();
        const id = `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const ts = Date.now();
        const imageHash = blob ? await sha256Hex(await blob.arrayBuffer()) : await sha256Hex(`${id}|${ts}|no-frame`);
        const prevHash = headOf(appId);
        const meta: Omit<CaptureMeta, 'hash'> = {
          id,
          appId,
          stepId,
          label,
          ts,
          lat: g.status === 'ok' ? g.lat : undefined,
          lng: g.status === 'ok' ? g.lng : undefined,
          accuracy: g.status === 'ok' ? Math.round(g.accuracy!) : undefined,
          engine: eng.kind,
          brightness: Math.round(a?.quality.brightness ?? 0),
          sharpness: Math.round(a?.quality.sharpness ?? 0),
          width,
          height,
          imageHash,
          prevHash,
          blobId: blob ? id : undefined,
          note: note ?? (blob ? undefined : 'camera frame unavailable in this mode'),
        };
        const hash = await linkHash(prevHash, imageHash, meta);
        if (blob) await blobs.put(id, blob);
        const full: CaptureMeta = { ...meta, hash };
        addCapture(full);
        captureIds.current.push(id);
        setSeal((s) => ({ hash, count: s.count + 1, pulse: s.pulse + 1 }));
        return full;
      };
      const p = sealQueue.current.then(run, run);
      sealQueue.current = p;
      return p;
    },
    [appId, addCapture, headOf],
  );

  // ————— Analysis loop: features, overlay, pose, coverage, mini-map, sweep —————
  useEffect(() => {
    if (engine.status !== 'running') return;
    const eng = engineRef.current!;
    let tick = 0;
    let flowYaw = 0;
    let flowPitch = 0;
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const dir = new THREE.Vector3();
    const pts = new Float32Array(40 * 3);

    const id = window.setInterval(() => {
      const stage = stageRef.current;
      const cv = canvasRef.current;
      if (!stage || !cv) return;
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const a = analyzer.current.step(eng, W, H);
      if (!a) return;
      latest.current = a;
      const dpr = Math.min(window.devicePixelRatio, 2);
      if (cv.width !== Math.round(W * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      const ctx = cv.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawOverlay(ctx, a, W, H, { mesh: true });

      // Heading: engine pose (demo/XR) → device orientation → integrated optical flow.
      const hfov = eng.hfov;
      const vfov = 2 * Math.atan(Math.tan(hfov / 2) / (W / H));
      const ep = eng.pose?.();
      if (ep) pose.current = ep;
      else if (orient.current) pose.current = { ...orient.current };
      else {
        flowYaw += (a.flow.dx / a.aw) * hfov;
        flowPitch = Math.max(-1.2, Math.min(1.2, flowPitch + (a.flow.dy / a.ah) * vfov));
        pose.current = { yaw: flowYaw, pitch: flowPitch };
      }
      const p = pose.current;

      // Coverage: mark the yaw bins inside the current horizontal field of view.
      const bins = coverageBins.current;
      const binW = (2 * Math.PI) / BINS;
      for (let k = -hfov / 2; k <= hfov / 2; k += binW / 2) {
        const b = ((Math.floor((p.yaw + k) / binW) % BINS) + BINS) % BINS;
        bins[b] = 1;
      }

      // Sweep progress: new heading range covered since the sweep started (with a time fallback on
      // devices that report no motion, so a desktop webcam can still finish).
      const s = sweep.current;
      if (s.active) {
        s.min = Math.min(s.min, p.yaw);
        s.max = Math.max(s.max, p.yaw);
        const target = ((stepRef.current.sweepDeg ?? 60) * Math.PI) / 180;
        const byAngle = (s.max - s.min) / target;
        const byTime = (performance.now() - s.startedAt) / 18000;
        s.progress = Math.min(1, Math.max(byAngle, byTime));
        const due = Math.floor(s.progress * 3 + 1e-6);
        while (s.keyframes < Math.min(3, due)) {
          s.keyframes++;
          sealFrame(stepRef.current.id, `${stepRef.current.title} · keyframe ${s.keyframes}`);
        }
      }

      // Mini-map: every 3rd tick, lift a sample of stable points into 3D.
      if (tick % 3 === 0 && miniRef.current) {
        const stable = a.tracks.filter((t) => t.age >= 2);
        const stride = Math.max(1, Math.floor(stable.length / 28));
        let n = 0;
        const tx = Math.tan(hfov / 2);
        const ty = Math.tan(vfov / 2);
        euler.set(p.pitch, p.yaw, 0, 'YXZ');
        const origin = p.pos ?? [0, 1.5, 0];
        for (let i = 0; i < stable.length && n < 40; i += stride) {
          const t = stable[i];
          const u = (t.x / a.aw) * 2 - 1;
          const v = -((t.y / a.ah) * 2 - 1);
          let d = eng.depthAt ? eng.depthAt(u, v) : null;
          if (!eng.depthAt) {
            // Pseudo-depth for plain camera mode: lower in frame ≈ nearer (floor), with per-track jitter.
            const j = ((t.id * 9301 + 49297) % 233280) / 233280 - 0.5;
            d = 2.6 + 0.9 * v + j * 0.7;
          }
          if (d == null || d > 14) continue;
          dir.set(u * tx, v * ty, -1).normalize().applyEuler(euler).multiplyScalar(d);
          pts[3 * n] = origin[0] + dir.x;
          pts[3 * n + 1] = origin[1] + dir.y;
          pts[3 * n + 2] = origin[2] + dir.z;
          n++;
        }
        miniRef.current.setPose(p);
        miniRef.current.add(pts, n);
      }

      if (tick % 4 === 0) {
        setHud({
          verdict: qualityVerdict(a.quality, a.motion),
          brightness: a.quality.brightness,
          sharpness: a.quality.sharpness,
          points: a.tracks.length,
          fps: a.fps,
          coverage: [...bins],
          sweep: s.active ? s.progress : 0,
        });
      }
      tick++;
    }, 66);
    return () => window.clearInterval(id);
  }, [engine.status, orient, sealFrame]);


  // ————— Challenges —————
  const issueChallenge = useCallback(
    (stepId: string, wanted: string | undefined, attempt: number) => {
      let defId = wanted && wanted !== 'random' ? wanted : undefined;
      if (!defId || attempt > 1) {
        const pool = script.challengePool.filter((c) => !usedChallenges.current.has(c));
        defId = (pool.length ? pool : script.challengePool)[Math.floor(Math.random() * (pool.length || script.challengePool.length))];
      }
      usedChallenges.current.add(defId);
      const def = CHALLENGES[defId];
      setChallenge({ def, code: def.text.includes('{code}') ? randomCode() : undefined, stepId, issuedAt: Date.now(), attempt, status: 'active' });
      engineRef.current?.hint?.(def.demoHint ?? null);
    },
    [script.challengePool],
  );

  useEffect(() => {
    if (engine.status !== 'running' || !step.challenge) return;
    const t = window.setTimeout(() => issueChallenge(step.id, step.challenge, 1), 2500);
    return () => window.clearTimeout(t);
  }, [engine.status, step.id, step.challenge, issueChallenge]);

  useEffect(() => {
    if (!challenge || challenge.status !== 'active') return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now - challenge.issuedAt > CHALLENGE_WINDOW_S * 1000) {
        setChallenge((c) => (c ? { ...c, status: 'missed' } : c));
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [challenge]);

  useEffect(() => {
    if (!challenge) return;
    if (challenge.status === 'missed') {
      const t = window.setTimeout(() => {
        if (challenge.attempt === 1) issueChallenge(challenge.stepId, undefined, 2);
        else {
          challengeLog.current.push(logEntry(challenge, 'missed'));
          setResolved((r) => ({ ...r, [challenge.stepId]: true }));
          setChallenge(null);
        }
      }, 1600);
      return () => window.clearTimeout(t);
    }
    if (challenge.status === 'verifying') {
      const t = window.setTimeout(() => {
        setChallenge((c) => (c ? { ...c, status: 'verified' } : c));
        challengeLog.current.push(logEntry(challenge, 'verified'));
        setResolved((r) => ({ ...r, [challenge.stepId]: true }));
        sealFrame(challenge.stepId, `Challenge · ${challenge.def.text.replace('{code}', challenge.code ?? '')}`);
      }, 1500);
      return () => window.clearTimeout(t);
    }
    if (challenge.status === 'verified') {
      const t = window.setTimeout(() => setChallenge(null), 1400);
      return () => window.clearTimeout(t);
    }
  }, [challenge, issueChallenge, sealFrame]);

  // ————— Step completion —————
  // A step with a challenge only completes once that challenge is verified or its retry window has passed.
  const challengePending = (!!challenge && challenge.stepId === step.id) || (!!step.challenge && !resolved[step.id]);
  const photoDone = step.kind === 'photo' && (shots[step.id] ?? 0) >= (step.shots ?? 1);
  const sweepDone = step.kind === 'sweep' && (shots[step.id] ?? 0) >= 1;
  const ready = (photoDone || sweepDone) && !challengePending;

  const finish = useCallback(async () => {
    await sealQueue.current;
    onDone({
      captureIds: [...captureIds.current],
      challenges: [...challengeLog.current],
      durationMs: Date.now() - startedAt.current,
      coverage: coverageBins.current.reduce((a, b) => a + b, 0) / BINS,
      engine: engineRef.current?.kind ?? 'demo',
      cloudPoints: miniRef.current?.size() ?? 0,
      stepShots: { ...shots },
    });
  }, [onDone, shots]);

  useEffect(() => {
    if (!ready || stepDone) return;
    setStepDone(true);
    setToast({ text: `${step.title} ✓`, key: Date.now() });
    window.setTimeout(() => setToast(null), 2200);
    const t = window.setTimeout(() => {
      setStepDone(false);
      if (stepIdx < script.steps.length - 1) setStepIdx(stepIdx + 1);
      else finish();
    }, 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ————— Shutter —————
  const press = async () => {
    if (engine.status !== 'running' || stepDone) return;
    if (step.kind === 'sweep') {
      if (sweep.current.active) return;
      const p = pose.current;
      sweep.current = { active: true, startedAt: performance.now(), min: p.yaw, max: p.yaw, keyframes: 0, progress: 0 };
      setSweeping(true);
      return;
    }
    const v = hud.verdict;
    const now = Date.now();
    if (v !== 'ok') {
      // Nudge first; a third tap within a few seconds captures anyway and flags the frame.
      if (now - blocked.current.at > 4000) blocked.current = { n: 0, at: now };
      blocked.current.n++;
      if (blocked.current.n < 3) {
        setShake((s) => s + 1);
        setNudge(v === 'dark' ? 'Too dark' : v === 'bright' ? 'Too bright' : 'Hold steady');
        window.setTimeout(() => setNudge(null), 1600);
        return;
      }
    }
    blocked.current = { n: 0, at: 0 };
    setFlash((f) => f + 1);
    const c = await sealFrame(step.id, step.title, v !== 'ok' ? `captured with low quality (${v})` : undefined);
    if (c) {
      setShots((s) => ({ ...s, [step.id]: (s[step.id] ?? 0) + 1 }));
      onCaptured?.(c, step);
    }
  };

  // Sweep finished → count it as the step's shot.
  useEffect(() => {
    if (sweeping && hud.sweep >= 1) {
      sweep.current.active = false;
      setSweeping(false);
      setShots((s) => ({ ...s, [step.id]: (s[step.id] ?? 0) + 1 }));
    }
  }, [hud.sweep, sweeping, step.id]);

  // Reset sweep when the step changes.
  useEffect(() => {
    sweep.current.active = false;
    setSweeping(false);
  }, [stepIdx]);

  const toggleTorch = async () => {
    const t = engineRef.current?.torch;
    if (!t?.supported) return;
    try {
      await t.set(!torchOn);
      setTorchOn(!torchOn);
    } catch {
      /* torch busy */
    }
  };

  const coverage = hud.coverage.reduce((a, b) => a + b, 0) / BINS;
  const shellState: ShellState = {
    step,
    stepIdx,
    shots,
    coverage,
    sweepProgress: hud.sweep,
    points: hud.points,
    captures: seal.count,
    engine: engine.kind ?? null,
  };
  const elapsed = clock - startedAt.current;
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div ref={stageRef} className="absolute inset-0" />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      {overlay && engine.status === 'running' && <div className="pointer-events-none absolute inset-0">{overlay(shellState)}</div>}
      {flash > 0 && <div key={flash} className="pointer-events-none absolute inset-0 animate-flash bg-white" />}

      {engine.status === 'running' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col">
          <TopBar
            elapsed={elapsed}
            geo={geo}
            engineLabel={engine.label ?? ''}
            points={hud.points}
            fps={hud.fps}
            onClose={() => setConfirmExit(true)}
            onSettings={() => openSettings(true)}
          />
          <PromptBanner
            index={stepIdx}
            total={script.steps.length}
            title={step.title}
            prompt={step.kind === 'sweep' && !sweeping ? `${step.prompt}. Tap record, then pan slowly.` : step.prompt}
            done={stepDone}
            onOpenChecklist={() => setChecklist(true)}
          />
          {challenge && (
            <ChallengeCard
              text={challenge.def.text}
              code={challenge.code}
              status={challenge.status}
              remaining={Math.max(0, 1 - (clock - challenge.issuedAt) / (CHALLENGE_WINDOW_S * 1000))}
              seconds={Math.max(0, Math.ceil(CHALLENGE_WINDOW_S - (clock - challenge.issuedAt) / 1000))}
              onDone={() => setChallenge((c) => (c ? { ...c, status: 'verifying' } : c))}
            />
          )}

          <div className="flex-1" />

          {toast && (
            <div key={toast.key} className="mx-auto mb-2 animate-toast rounded-full bg-teal px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
              {toast.text}
            </div>
          )}
          {nudge && <div className="mx-auto mb-2 animate-fadeUp rounded-full bg-ember px-4 py-1.5 text-sm font-semibold">{nudge}</div>}

          <div className="flex items-end justify-between px-3">
            <div className="pointer-events-auto">
              <PointCloudMiniMap ref={miniRef} size={112} coverage={hud.coverage} />
              <div className="mt-0.5 text-center text-[10px] text-white/70">Coverage {Math.round(coverage * 100)}%</div>
            </div>
            <QualityMeter brightness={hud.brightness} sharpness={hud.sharpness} verdict={hud.verdict} />
          </div>

          <div className="mt-2 flex justify-center">
            <SealTicker hash={seal.hash} count={seal.count} pulse={seal.pulse} />
          </div>

          <div className="flex items-center justify-around px-6 pb-[max(env(safe-area-inset-bottom),14px)] pt-3">
            <button
              onClick={() => setChecklist(true)}
              className="pointer-events-auto flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
              aria-label="Checklist"
            >
              <ListChecks className="h-5 w-5" />
              <span className="text-[9px]">
                {stepIdx + (ready ? 1 : 0)}/{script.steps.length}
              </span>
            </button>
            <Shutter
              mode={step.kind}
              recording={sweeping}
              progress={hud.sweep}
              blocked={hud.verdict !== 'ok' && step.kind === 'photo'}
              onPress={press}
              shake={shake}
            />
            <button
              onClick={toggleTorch}
              disabled={!engine.torch}
              className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md disabled:opacity-35 ${torchOn ? 'bg-yellow-300 text-navy' : 'bg-black/40 text-white'}`}
              aria-label="Torch"
            >
              <Flashlight className="h-5 w-5" />
            </button>
          </div>
          {step.kind === 'photo' && (
            <div className="pb-2 text-center text-[11px] text-white/60">
              {(shots[step.id] ?? 0)}/{step.shots ?? 1} photo{(step.shots ?? 1) > 1 ? 's' : ''} for this step
            </div>
          )}
        </div>
      )}

      {engine.status === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy text-white/80">
          <Camera className="h-8 w-8 animate-pulse text-teal-light" />
          <div className="text-sm">Starting capture…</div>
        </div>
      )}

      {engine.status === 'error' && (
        <EngineError
          error={engine.error!}
          onRetry={() => {
            setForced(null);
            setRetry((r) => r + 1);
          }}
          onDemo={() => setForced('demo')}
          onBack={onExit}
        />
      )}

      <Sheet open={checklist} onClose={() => setChecklist(false)} title={script.title} dark>
        <ol className="space-y-2">
          {script.steps.map((s, i) => {
            const n = shots[s.id] ?? 0;
            const done = i < stepIdx || (i === stepIdx && ready);
            return (
              <li key={s.id} className={`flex items-start gap-3 rounded-xl p-3 ${i === stepIdx ? 'bg-white/10' : ''}`}>
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${done ? 'border-teal-light bg-teal-light text-navy' : i === stepIdx ? 'border-teal-light text-teal-light' : 'border-white/30 text-white/50'}`}>
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="block text-xs text-white/60">{s.prompt}</span>
                </span>
                <span className="text-xs text-white/60">
                  {s.kind === 'sweep' ? (n ? 'swept' : 'sweep') : `${n}/${s.shots ?? 1}`}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-white/50">
          {seal.count} sealed frames · {challengeLog.current.filter((c) => c.result === 'verified').length} challenges verified
        </p>
      </Sheet>

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} title="Leave the inspection?">
        <p className="mb-4 text-sm text-ink-soft">
          Frames you’ve captured stay sealed on this device. The camera turns off as soon as you leave.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={() => setConfirmExit(false)}>
            Keep capturing
          </Button>
          <Button variant="danger" block onClick={onExit}>
            Leave
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function logEntry(c: ActiveChallenge, result: 'verified' | 'missed'): ChallengeResult {
  return {
    id: c.def.id,
    text: c.def.text.replace('{code}', c.code ?? ''),
    stepId: c.stepId,
    issuedAt: c.issuedAt,
    windowS: CHALLENGE_WINDOW_S,
    result,
    respondedInS: result === 'verified' ? Math.round((Date.now() - c.issuedAt) / 100) / 10 : undefined,
  };
}

function EngineError({ error, onRetry, onDemo, onBack }: { error: CameraError; onRetry: () => void; onDemo: () => void; onBack: () => void }) {
  const copy = {
    denied: {
      title: 'Camera access is off',
      body: 'Allow camera access for this site: tap the lock icon in the address bar → Permissions → Camera → Allow, then retry.',
    },
    notfound: { title: 'No camera found', body: 'This device doesn’t seem to have a camera. You can run the inspection in Demo mode instead.' },
    insecure: { title: 'Camera needs a secure connection', body: 'Open the app over HTTPS (or localhost) to use the camera.' },
    busy: { title: 'Camera is busy', body: 'Another app is using the camera. Close it and retry.' },
    unknown: { title: 'Couldn’t start the camera', body: error.message },
  }[error.reason];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-navy p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <CameraOff className="h-7 w-7 text-orange-300" />
        </div>
        <h2 className="mb-2 font-serif text-xl font-semibold text-white">{copy.title}</h2>
        <p className="mb-6 text-sm text-white/70">{copy.body}</p>
        <div className="space-y-2">
          <Button block onClick={onRetry} icon={<RotateCcw className="h-4 w-4" />}>
            Retry camera
          </Button>
          <Button block variant="glass" onClick={onDemo} icon={<MonitorPlay className="h-4 w-4" />}>
            Use Demo mode
          </Button>
          <Button block variant="ghost" className="!text-white/70" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}


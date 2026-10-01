import { ReactNode } from 'react';
import { Camera, Check, ChevronDown, Cpu, EyeOff, Link2, Loader2, MapPin, ShieldCheck, Sun, X, Settings, Focus } from 'lucide-react';
import { ProgressRing } from '../ui';
import { mmss, shortHash, timeIN } from '../../lib/format';
import type { GeoState } from '../../lib/sensors';
import { QualityVerdict, QUALITY_LIMITS, VERDICT_TEXT } from '../../lib/quality';

function HudChip({ children, tone = 'glass', icon }: { children: ReactNode; tone?: 'glass' | 'teal' | 'ember' | 'red'; icon?: ReactNode }) {
  const cls = {
    glass: 'bg-black/35 text-white/90 border-white/15',
    teal: 'bg-teal/80 text-white border-teal-light/40',
    ember: 'bg-ember/85 text-white border-orange-300/40',
    red: 'bg-danger/85 text-white border-red-300/40',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-[3px] text-[10.5px] font-medium backdrop-blur-md ${cls}`}>
      {icon}
      {children}
    </span>
  );
}

export function TopBar({
  elapsed,
  geo,
  engineLabel,
  points,
  fps,
  onClose,
  onSettings,
}: {
  elapsed: number;
  geo: GeoState;
  engineLabel: string;
  points: number;
  fps: number;
  onClose: () => void;
  onSettings?: () => void;
}) {
  const gps =
    geo.status === 'ok' ? (
      <HudChip tone={geo.accuracy! <= 25 ? 'glass' : 'ember'} icon={<MapPin className="h-3 w-3" />}>
        GPS ±{Math.round(geo.accuracy!)} m
      </HudChip>
    ) : geo.status === 'locating' ? (
      <HudChip icon={<Loader2 className="h-3 w-3 animate-spin" />}>GPS…</HudChip>
    ) : (
      <HudChip tone="ember" icon={<MapPin className="h-3 w-3" />}>
        GPS off
      </HudChip>
    );
  return (
    <div className="pointer-events-auto px-3 pt-[max(env(safe-area-inset-top),10px)]">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="rounded-full bg-black/35 p-1.5 text-white backdrop-blur-md" aria-label="Exit capture">
          <X className="h-4 w-4" />
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[12px] font-semibold text-white backdrop-blur-md">
          <span className="h-2 w-2 animate-pulseDot rounded-full bg-red-500" />
          {mmss(elapsed)}
        </span>
        <HudChip tone="teal" icon={<Camera className="h-3 w-3" />}>
          Live capture only
        </HudChip>
        <div className="flex-1" />
        {onSettings && (
          <button onClick={onSettings} className="rounded-full bg-black/35 p-1.5 text-white backdrop-blur-md" aria-label="Capture settings">
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="-mx-3 mt-1.5 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {gps}
        <HudChip>{timeIN()}</HudChip>
        <HudChip icon={<ShieldCheck className="h-3 w-3" />}>Device check: pass · simulated</HudChip>
        <HudChip icon={<EyeOff className="h-3 w-3" />}>Bystander faces auto-blurred · simulated</HudChip>
        <HudChip icon={<Cpu className="h-3 w-3" />}>
          {engineLabel} · {points} pts · {fps} fps
        </HudChip>
      </div>
    </div>
  );
}

export function PromptBanner({
  index,
  total,
  title,
  prompt,
  done,
  onOpenChecklist,
}: {
  index: number;
  total: number;
  title: string;
  prompt: string;
  done: boolean;
  onOpenChecklist: () => void;
}) {
  return (
    <button onClick={onOpenChecklist} className="pointer-events-auto mx-3 mt-2 block w-[calc(100%-1.5rem)] animate-fadeUp rounded-2xl border border-white/10 bg-navy/70 px-4 py-3 text-left text-white backdrop-blur-md">
      <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.14em] text-teal-light">
        <span>
          Step {index + 1} of {total} · {title}
        </span>
        <span className="flex items-center gap-0.5 normal-case tracking-normal text-white/60">
          Checklist <ChevronDown className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-1 text-[16px] font-semibold leading-snug">
        {done ? (
          <span className="flex items-center gap-1.5 text-teal-light">
            <Check className="h-4 w-4" /> Done — moving on
          </span>
        ) : (
          prompt
        )}
      </div>
    </button>
  );
}

export function QualityMeter({ brightness, sharpness, verdict }: { brightness: number; sharpness: number; verdict: QualityVerdict }) {
  const light = Math.min(1, brightness / 160);
  const focus = Math.min(1, sharpness / (QUALITY_LIMITS.minSharpness * 4));
  const bar = (v: number, okAt: number) => (
    <div className="h-1 w-14 overflow-hidden rounded-full bg-white/20">
      <div className={`h-full rounded-full transition-all ${v >= okAt ? 'bg-teal-light' : 'bg-orange-400'}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
  return (
    <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-white backdrop-blur-md">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] text-white/70">
        <Sun className="h-3 w-3" /> {bar(light, QUALITY_LIMITS.minBrightness / 160)}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-white/70">
        <Focus className="h-3 w-3" /> {bar(focus, 0.25)}
      </div>
      <div className={`mt-1.5 max-w-[9.5rem] text-[10.5px] font-medium leading-tight ${verdict === 'ok' ? 'text-teal-light' : 'text-orange-300'}`}>
        {VERDICT_TEXT[verdict]}
      </div>
    </div>
  );
}

export type ChallengeStatus = 'active' | 'verifying' | 'verified' | 'missed';

export function ChallengeCard({
  text,
  code,
  remaining,
  seconds,
  status,
  onDone,
}: {
  text: string;
  code?: string;
  remaining: number;
  seconds: number;
  status: ChallengeStatus;
  onDone: () => void;
}) {
  const parts = code ? text.split('{code}') : [text];
  return (
    <div className="pointer-events-auto mx-3 mt-2 animate-fadeUp rounded-2xl border border-orange-300/30 bg-ember/90 p-3 text-white shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <ProgressRing value={status === 'active' ? remaining : 1} size={46} stroke={4} color="#fff" track="rgba(255,255,255,0.25)">
          {status === 'active' ? (
            <span className="font-mono text-[13px]">{seconds}</span>
          ) : status === 'verifying' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === 'verified' ? (
            <Check className="h-5 w-5" strokeWidth={3} />
          ) : (
            <X className="h-5 w-5" />
          )}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-100">
            {status === 'verified' ? 'Challenge verified · simulated' : status === 'missed' ? 'Window missed — new challenge' : 'Live challenge'}
          </div>
          <div className="text-[15px] font-semibold leading-snug">
            {parts[0]}
            {code && <span className="ml-1 rounded-md bg-white px-1.5 py-0.5 font-mono text-[18px] tracking-[0.2em] text-ember">{code}</span>}
            {parts[1]}
          </div>
        </div>
        {status === 'active' && (
          <button onClick={onDone} className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-ember">
            Done
          </button>
        )}
      </div>
    </div>
  );
}

export function SealTicker({ hash, count, pulse }: { hash: string; count: number; pulse: number }) {
  if (!count) {
    return (
      <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/70 backdrop-blur-md">
        <Link2 className="h-3.5 w-3.5" /> Each capture is sealed with SHA-256
      </div>
    );
  }
  return (
    <div
      key={pulse}
      className="pointer-events-auto inline-flex animate-fadeUp items-center gap-1.5 rounded-full border border-teal-light/30 bg-black/50 px-3 py-1 text-[11px] text-white backdrop-blur-md"
    >
      <Link2 className="h-3.5 w-3.5 text-teal-light" />
      <span>
        Sealed · <span className="font-mono">{shortHash(hash)}</span>
      </span>
      <span className="text-white/50">· {count} in chain</span>
    </div>
  );
}

export function Shutter({
  mode,
  recording,
  progress,
  blocked,
  onPress,
  shake,
}: {
  mode: 'photo' | 'sweep';
  recording: boolean;
  progress: number;
  blocked: boolean;
  onPress: () => void;
  shake: number;
}) {
  return (
    <button
      key={shake}
      onClick={onPress}
      aria-label={mode === 'sweep' ? (recording ? 'Recording sweep' : 'Start sweep') : 'Capture'}
      className={`pointer-events-auto relative flex h-[76px] w-[76px] items-center justify-center rounded-full bg-black/25 shadow-[0_0_0_1.5px_rgba(0,0,0,0.25)] ${shake ? 'animate-shake' : ''}`}
    >
      <ProgressRing value={mode === 'sweep' ? progress : 0} size={76} stroke={4} color="#2dd4bf" track="rgba(255,255,255,0.55)">
        <span />
      </ProgressRing>
      <span
        className={`absolute inset-[9px] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.15)] transition ${
          mode === 'sweep' && recording ? 'scale-[0.55] rounded-xl bg-red-500' : blocked ? 'bg-white/45' : 'bg-white'
        }`}
      />
      {mode === 'sweep' && !recording && <span className="absolute h-4 w-4 rounded-full bg-red-500" />}
    </button>
  );
}

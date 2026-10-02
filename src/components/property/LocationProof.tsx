import { ReactNode, useEffect, useState } from 'react';
import { BadgeCheck, Loader2, MapPinned, Satellite, ScanSearch } from 'lucide-react';
import { SimChip } from '../ui';
import { tileFor } from './ParcelMap';

function CheckRow({ state, icon, title, children, sim }: { state: 'wait' | 'run' | 'ok'; icon: ReactNode; title: string; children: ReactNode; sim?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 transition ${state === 'ok' ? 'border-teal/30 bg-teal-tint/50' : 'border-line bg-white'} ${state === 'wait' ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-teal">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-navy">{title}</span>
        {sim && state === 'ok' && <SimChip />}
        {state === 'run' && <Loader2 className="h-4 w-4 animate-spin text-teal" />}
        {state === 'ok' && <BadgeCheck className="h-5 w-5 animate-fadeUp text-teal" />}
      </div>
      {state !== 'wait' && <div className="mt-1.5 text-[13px] text-ink-soft">{children}</div>}
    </div>
  );
}

/** Illustrative cross-view match: a ground-level view of the frontage matched to the satellite tile above it. */
function CrossView({ lat, lng, play }: { lat: number; lng: number; play: boolean }) {
  const t = tileFor(lat, lng);
  // Keypoints on the ground sketch (left, 0..120) ↔ roof corners near the point on the tile (right, 0..120).
  const sx = (t.px / 256) * 120, sy = (t.py / 256) * 120;
  const pairs: [number, number, number, number][] = [
    [22, 40, sx - 14, sy - 10],
    [98, 40, sx + 14, sy - 6],
    [24, 92, sx - 12, sy + 12],
    [96, 92, sx + 15, sy + 10],
    [60, 30, sx + 1, sy - 12],
  ];
  return (
    <svg viewBox="0 0 280 120" className="mt-2 w-full overflow-visible rounded-lg">
      {/* Ground view: a simple frontage sketch. */}
      <rect x="0" y="0" width="120" height="120" rx="8" fill="#e0f2fe" />
      <rect x="0" y="96" width="120" height="24" fill="#a3a3a3" />
      <polygon points="14,40 60,22 106,40" fill="#94a3b8" />
      <rect x="18" y="40" width="84" height="56" fill="#f5e6c8" stroke="#a16207" />
      <rect x="30" y="52" width="18" height="16" fill="#7dd3fc" stroke="#475569" />
      <rect x="72" y="52" width="18" height="16" fill="#7dd3fc" stroke="#475569" />
      <rect x="52" y="66" width="16" height="30" fill="#92400e" />
      <text x="60" y="114" textAnchor="middle" fontSize="8" fill="#1f2937">Ground frame</text>
      {/* Satellite tile. */}
      <defs>
        <clipPath id="tileclip">
          <rect x="160" y="0" width="120" height="120" rx="8" />
        </clipPath>
      </defs>
      <rect x="160" y="0" width="120" height="120" rx="8" fill="#334155" />
      <image href={t.url} x="160" y="0" width="120" height="120" clipPath="url(#tileclip)" preserveAspectRatio="none" />
      <circle cx={160 + sx} cy={sy} r="4" fill="#0F766E" stroke="#fff" strokeWidth="1.5" />
      <text x="220" y="114" textAnchor="middle" fontSize="8" fill="#fff" stroke="#000" strokeWidth="0.3">Satellite tile</text>
      {pairs.map(([a, b, c, d], i) => (
        <g key={i} style={{ opacity: play ? 1 : 0, transition: `opacity .4s ease ${0.25 * i}s` }}>
          <line x1={a} y1={b} x2={160 + c} y2={d} stroke="#2dd4bf" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx={a} cy={b} r="2.6" fill="#14b8a6" />
          <circle cx={160 + c} cy={d} r="2.6" fill="#14b8a6" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Three independent location checks, run in sequence: the phone's own GNSS fix, a cross-view match of the
 * ground frame to satellite imagery, and the cadastral parcel the point falls in.
 */
export function LocationProof({
  lat,
  lng,
  accuracy,
  fixes,
  demo,
  ulpin,
  survey,
  village,
  instant,
  onDone,
}: {
  lat: number;
  lng: number;
  accuracy: number;
  fixes: number;
  demo: boolean;
  ulpin: string;
  survey: string;
  village: string;
  /** Show the finished checks straight away (returning to a verified location). */
  instant?: boolean;
  onDone: () => void;
}) {
  const [step, setStep] = useState(instant ? 3 : 0);
  useEffect(() => {
    if (step >= 3) {
      onDone();
      return;
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 1200 : 1700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const st = (i: number) => (step > i ? 'ok' : step === i ? 'run' : 'wait');
  return (
    <div className="space-y-2">
      <CheckRow state={st(0)} icon={<Satellite className="h-4 w-4" />} title="GNSS consistent">
        {demo ? 'Demo location (no GPS fix in this browser)' : `Accuracy ±${Math.round(accuracy)} m · ${fixes > 1 ? `${fixes} fixes agree` : 'steady fix'}`}
        {' · '}mock-location check passed <span className="text-[11px] text-ink-faint">(simulated)</span>
      </CheckRow>
      <CheckRow state={st(1)} icon={<ScanSearch className="h-4 w-4" />} title="Cross-view match" sim>
        Your street-level view lines up with the satellite image of this spot.
        <CrossView lat={lat} lng={lng} play={step > 1} />
      </CheckRow>
      <CheckRow state={st(2)} icon={<MapPinned className="h-4 w-4" />} title="Cadastral parcel" sim>
        ULPIN <span className="font-mono font-semibold text-navy">{ulpin}</span> · {survey} · {village}
      </CheckRow>
    </div>
  );
}

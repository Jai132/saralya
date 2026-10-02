import { useEffect, useState } from 'react';
import { ASBUILT_ROOMS, PLAN_ROOMS, PLOT, Room } from '../../data/property';

const k = 22; // px per metre
const W = PLOT.w * k;
const H = PLOT.d * k;
/** Plot coordinates (y back from the road) → SVG, road at the bottom. */
const R = (r: Room) => ({ x: r.x * k, y: H - (r.y + r.h) * k, width: r.w * k, height: r.h * k });

/** Wall-tracing animation over the photographed plan: each room outline draws itself in turn. */
export function PlanTrace({ photoUrl, onDone }: { photoUrl: string | null; onDone: () => void }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const a = window.setTimeout(() => setGo(true), 400);
    const b = window.setTimeout(onDone, 400 + PLAN_ROOMS.length * 450 + 900);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy" style={{ aspectRatio: '4 / 3' }}>
      {photoUrl && <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.07)_1px,transparent_1px)] bg-[size:16px_16px]" />
      <svg viewBox={`${0.5 * k} ${H - 10 * k} ${8 * k} ${8 * k}`} className="absolute inset-0 h-full w-full p-4">
        {PLAN_ROOMS.map((r, i) => (
          <g key={r.name}>
            <rect
              {...R(r)}
              pathLength={1}
              fill={go ? 'rgba(45,212,191,0.10)' : 'transparent'}
              stroke="#5eead4"
              strokeWidth={2.5}
              strokeDasharray={1}
              strokeDashoffset={go ? 0 : 1}
              style={{ transition: `stroke-dashoffset .5s ease ${i * 0.45}s, fill .4s ease ${i * 0.45 + 0.4}s` }}
            />
            <text
              x={R(r).x + R(r).width / 2}
              y={R(r).y + R(r).height / 2 + 4}
              textAnchor="middle"
              fontSize={11}
              fill="#fff"
              style={{ opacity: go ? 1 : 0, transition: `opacity .3s ease ${i * 0.45 + 0.45}s` }}
            >
              {r.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur-md">Tracing walls from the plan photo…</div>
    </div>
  );
}

type Show = 'both' | 'plan' | 'asbuilt';
const SHOWS: [Show, string][] = [
  ['both', 'Both'],
  ['plan', 'Plan'],
  ['asbuilt', 'As-built'],
];

/** Sanctioned plan (green) over what was captured on site (orange), on the plot with its setbacks. */
export function PlanOverlay() {
  const [show, setShow] = useState<Show>('both');
  const plan = show !== 'asbuilt';
  const built = show !== 'plan';
  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        {SHOWS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setShow(id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${show === id ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-soft'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-white p-3">
        <svg viewBox={`-10 -10 ${W + 20} ${H + 34}`} className="mx-auto block max-h-[22rem] w-full">
          {/* Plot boundary and the plan's rear setback line. */}
          <rect x={0} y={0} width={W} height={H} fill="#f8fafc" stroke="#94a3b8" strokeDasharray="5 4" />
          <line x1={0} x2={W} y1={H - 9.5 * k} y2={H - 9.5 * k} stroke="#64748b" strokeDasharray="2 3" />
          {built &&
            ASBUILT_ROOMS.map((r) => (
              <rect key={`b-${r.name}`} {...R(r)} fill={r.extra ? 'rgba(234,88,12,0.28)' : 'rgba(234,88,12,0.10)'} stroke="#ea580c" strokeWidth={2} />
            ))}
          {plan &&
            PLAN_ROOMS.map((r) => (
              <rect key={`p-${r.name}`} {...R(r)} fill="rgba(22,163,74,0.08)" stroke="#16a34a" strokeWidth={2} strokeDasharray={built ? '6 3' : undefined} />
            ))}
          {ASBUILT_ROOMS.filter((r) => !r.extra || built).map((r) => (
            <text key={`t-${r.name}`} x={R(r).x + R(r).width / 2} y={R(r).y + R(r).height / 2 + 3} textAnchor="middle" fontSize={9} fill="#334155">
              {r.name}
            </text>
          ))}
          <rect x={0} y={H + 6} width={W} height={12} fill="#d4d4d8" />
          <text x={W / 2} y={H + 15} textAnchor="middle" fontSize={8} fill="#52525b">
            ROAD
          </text>
        </svg>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border-2 border-dashed border-green-600" /> Sanctioned plan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border-2 border-orange-600 bg-orange-600/20" /> As built
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dotted border-slate-500" /> Rear setback
          </span>
        </div>
      </div>
    </div>
  );
}

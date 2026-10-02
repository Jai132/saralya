import { FlaskConical, Ruler } from 'lucide-react';
import type { ShellState } from '../capture/CaptureShell';
import { areaRangeSqft, ASBUILT_ROOMS, Room } from '../../data/property';
import { indian } from '../../lib/format';

const EXTERIOR = ['frontage', 'elev-east', 'elev-west', 'roof'];
const PAD = 0.4;
const X0 = 1 - PAD, X1 = 8 + PAD, Y0 = 2.5 - PAD, Y1 = 11.25 + PAD;

/** How much of the as-built plan the walkaround has "seen": the footprint from outside, rooms during the interior sweep. */
function reveal(s: ShellState): { footprint: boolean; rooms: number } {
  const footprint = EXTERIOR.filter((id) => (s.shots[id] ?? 0) > 0).length >= 2;
  const swept = (s.shots.interior ?? 0) > 0;
  const n = ASBUILT_ROOMS.length;
  if (swept) return { footprint: true, rooms: n };
  if (s.step.id === 'interior' && s.sweeping) return { footprint, rooms: Math.min(n, s.sweepProgress * (n + 0.4)) };
  return { footprint, rooms: 0 };
}

/** Live 2D floor-plan sketch that builds up in a corner as rooms are swept (simulated), with an area ticker. */
export function FloorPlanSketch({ s }: { s: ShellState }) {
  const { footprint, rooms } = reveal(s);
  const shown = ASBUILT_ROOMS.slice(0, Math.floor(rooms));
  const partial = rooms % 1 > 0.05 ? ASBUILT_ROOMS[Math.floor(rooms)] : undefined;
  const area = shown.length ? areaRangeSqft(shown) : null;
  const W = 104;
  const k = W / (X1 - X0);
  const H = (Y1 - Y0) * k;
  // Front of the building at the bottom.
  const rect = (r: Room) => ({ x: (r.x - X0) * k, y: (Y1 - (r.y + r.h)) * k, width: r.w * k, height: r.h * k });
  const fp = { x: (1 - X0) * k, y: (Y1 - 11.25) * k, width: 7 * k, height: 8.75 * k };
  return (
    <div className="w-[8rem] rounded-xl border border-teal-light/25 bg-black/55 p-2 text-white shadow-lg backdrop-blur-md">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-teal-light">
        <Ruler className="h-3.5 w-3.5" /> Floor plan
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        {footprint && <rect {...fp} fill="none" stroke="rgba(255,255,255,0.45)" strokeDasharray="4 3" strokeWidth={1.2} />}
        {shown.map((r) => (
          <g key={r.name} className="animate-fadeUp">
            <rect {...rect(r)} fill={r.extra ? 'rgba(251,146,60,0.22)' : 'rgba(45,212,191,0.16)'} stroke={r.extra ? '#fb923c' : '#5eead4'} strokeWidth={1.6} />
            <text x={rect(r).x + rect(r).width / 2} y={rect(r).y + rect(r).height / 2 + 3} textAnchor="middle" fontSize={6.5} fill="rgba(255,255,255,0.85)">
              {r.name}
            </text>
          </g>
        ))}
        {partial && (
          <rect {...rect(partial)} fill="rgba(45,212,191,0.06)" stroke="#5eead4" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.4 + 0.6 * (rooms % 1)} />
        )}
        {!footprint && !shown.length && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.55)">
            Builds as you walk
          </text>
        )}
      </svg>
      <div className="mt-1 text-[10px] leading-tight">
        <span className="block text-white/65">Built-up area so far</span>
        <span className="text-[12px] font-semibold">{area ? `${indian(area[0])}–${indian(area[1])} sq ft` : '—'}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[9px] text-white/50">
        <FlaskConical className="h-2.5 w-2.5" /> Simulated in prototype
      </div>
    </div>
  );
}

export function propertyOverlay(s: ShellState) {
  return (
    <div className="absolute bottom-[31%] right-3">
      <FloorPlanSketch s={s} />
    </div>
  );
}

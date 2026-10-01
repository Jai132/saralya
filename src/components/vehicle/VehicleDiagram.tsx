import type { VehicleKind } from '../../store/application';
import { DAMAGE, SEVERITY_COLOR, Severity } from '../../data/vehicles';

type Box = { id: string; label: string; x: number; y: number; w: number; h: number };

/** Unfolded panel layout (top-down, front at the top, vehicle's left on the left) like an inspection sheet. */
const LAYOUT: Record<VehicleKind, Box[]> = {
  car: [
    { id: 'car-bumper-f', label: 'Front bumper', x: 85, y: 6, w: 130, h: 24 },
    { id: 'car-bonnet', label: 'Bonnet', x: 85, y: 34, w: 130, h: 84 },
    { id: 'car-roof', label: 'Roof', x: 92, y: 148, w: 116, h: 120 },
    { id: 'car-boot', label: 'Boot', x: 85, y: 300, w: 130, h: 70 },
    { id: 'car-bumper-r', label: 'Rear bumper', x: 85, y: 374, w: 130, h: 24 },
    { id: 'car-door-fl', label: 'Front-left door', x: 10, y: 128, w: 68, h: 84 },
    { id: 'car-door-rl', label: 'Rear-left door', x: 10, y: 216, w: 68, h: 76 },
    { id: 'car-door-fr', label: 'Front-right door', x: 222, y: 128, w: 68, h: 84 },
    { id: 'car-door-rr', label: 'Rear-right door', x: 222, y: 216, w: 68, h: 76 },
  ],
  cv: [
    { id: 'cv-bumper', label: 'Bumper', x: 60, y: 6, w: 180, h: 22 },
    { id: 'cv-cabin-front', label: 'Cabin front', x: 60, y: 32, w: 180, h: 70 },
    { id: 'cv-door-l', label: 'Cabin L door', x: 8, y: 108, w: 46, h: 62 },
    { id: 'cv-door-r', label: 'Cabin R door', x: 246, y: 108, w: 46, h: 62 },
    { id: 'cv-body-l', label: 'Body left', x: 8, y: 176, w: 46, h: 190 },
    { id: 'cv-body-r', label: 'Body right', x: 246, y: 176, w: 46, h: 190 },
    { id: 'cv-tailgate', label: 'Tailgate', x: 60, y: 372, w: 180, h: 30 },
  ],
};

const RANK: Record<Severity, number> = { minor: 1, moderate: 2, severe: 3 };

export function worstSeverity(partId: string): Severity | 'none' {
  const marks = DAMAGE[partId] ?? [];
  if (!marks.length) return 'none';
  return marks.reduce((a, m) => (RANK[m.severity] > RANK[a] ? m.severity : a), marks[0].severity);
}

export function VehicleDiagram({ kind, selected, onSelect }: { kind: VehicleKind; selected?: string | null; onSelect?: (id: string) => void }) {
  const boxes = LAYOUT[kind];
  return (
    <div>
      <svg viewBox="0 0 300 406" className="mx-auto h-auto w-full max-w-[300px]">
        {kind === 'cv' && <rect x={60} y={176} width={180} height={190} rx={6} fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="4 4" />}
        {kind === 'cv' && (
          <text x={150} y={274} textAnchor="middle" fontSize={10} fill="#94a3b8">
            Load body (top)
          </text>
        )}
        {kind === 'car' && <rect x={92} y={122} width={116} height={22} rx={4} fill="#e2e8f0" />}
        {kind === 'car' && <rect x={92} y={272} width={116} height={24} rx={4} fill="#e2e8f0" />}
        {boxes.map((b) => {
          const sev = worstSeverity(b.id);
          const isSel = selected === b.id;
          return (
            <g key={b.id} onClick={() => onSelect?.(b.id)} className={onSelect ? 'cursor-pointer' : ''}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={SEVERITY_COLOR[sev]} fillOpacity={sev === 'none' ? 0.35 : 0.85} stroke={isSel ? '#0B1B34' : '#ffffff'} strokeWidth={isSel ? 2.5 : 1.5} />
              <text x={b.x + b.w / 2} y={b.y + b.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={b.w < 60 ? 7.5 : 9} fontWeight={600} fill="#0B1B34">
                {b.label.split(' ').length > 2 && b.w < 80 ? (
                  <>
                    <tspan x={b.x + b.w / 2} dy="-0.5em">{b.label.split(' ').slice(0, -1).join(' ')}</tspan>
                    <tspan x={b.x + b.w / 2} dy="1.1em">{b.label.split(' ').slice(-1)}</tspan>
                  </>
                ) : (
                  b.label
                )}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px] text-ink-soft">
        {(['none', 'minor', 'moderate', 'severe'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEVERITY_COLOR[s], opacity: s === 'none' ? 0.5 : 1 }} />
            {s === 'none' ? 'No findings' : s[0].toUpperCase() + s.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}

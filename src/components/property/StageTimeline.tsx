import { Check } from 'lucide-react';
import { STAGES } from '../../data/property';

/** Dummy top-down "satellite" thumbnail of the plot at a construction stage. */
function StageThumb({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 60 60" className="h-14 w-14 rounded-lg">
      <rect width="60" height="60" fill="#7c8f5a" />
      <rect x="6" y="6" width="48" height="48" fill="#a8956d" stroke="#e7e5e4" strokeDasharray="2 2" />
      {stage === 0 && <rect x="22" y="20" width="10" height="6" fill="#d6d3d1" />}
      {stage >= 1 && <rect x="14" y="12" width="32" height="34" fill="none" stroke="#57534e" strokeWidth="3" />}
      {stage >= 1 && <path d="M14 29 H46 M30 12 V46" stroke="#57534e" strokeWidth="2" />}
      {stage >= 2 && <rect x="13" y="11" width="34" height="36" fill="#9ca3af" />}
      {stage >= 3 && <rect x="13" y="11" width="34" height="36" fill="#b45309" />}
      {stage >= 3 && <circle cx="38" cy="20" r="4" fill="#111827" />}
    </svg>
  );
}

/** Self-construction tranches: each stage releases on a short re-capture instead of an officer visit. */
export function StageTimeline({ current = 0 }: { current?: number }) {
  return (
    <ol className="space-y-3">
      {STAGES.map((s, i) => {
        const done = i <= current;
        const next = i === current + 1;
        return (
          <li key={s.id} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${done ? 'border-teal bg-teal text-white' : next ? 'border-teal text-teal' : 'border-line text-ink-faint'}`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-navy">{s.title}</div>
              <div className="text-xs text-ink-soft">
                {s.sub}
                {s.tranche ? ` · releases ${s.tranche}%` : ''}
                {i === current ? ' · captured today' : next ? ' · next' : ''}
              </div>
            </div>
            <div className={done ? '' : 'opacity-50'}>
              <StageThumb stage={i} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

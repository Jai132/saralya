import type { PartTemplate } from './templates';
import { DamageMark, SEVERITY_COLOR } from '../../data/vehicles';

/** A rectified part photo with its template outline and damage annotations, all in template millimetres. */
export function RectifiedPanel({
  template,
  imageUrl,
  marks,
  selected,
  onSelect,
}: {
  template: PartTemplate;
  imageUrl?: string | null;
  marks: DamageMark[];
  selected?: number | null;
  onSelect?: (i: number) => void;
}) {
  const W = template.widthMm;
  const H = template.heightMm;
  const sw = W / 160;
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-slate-800" style={{ aspectRatio: `${W} / ${H}` }}>
      {imageUrl ? (
        <img src={imageUrl} alt={template.part} className="absolute inset-0 h-full w-full object-fill" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-ink-faint">Not calibrated — template only</div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={template.outline} fill="none" stroke="#2dd4bf" strokeOpacity={0.8} strokeWidth={sw} />
        {marks.map((m, i) => {
          const [x, y, w, h] = m.rect;
          const c = SEVERITY_COLOR[m.severity];
          return (
            <g key={i} onClick={() => onSelect?.(i)} className={onSelect ? 'cursor-pointer' : ''}>
              <rect x={x} y={y} width={w} height={h} fill={c} fillOpacity={selected === i ? 0.45 : 0.28} stroke={c} strokeWidth={sw * (selected === i ? 1.6 : 1)} strokeDasharray={m.type === 'repaint' ? `${sw * 4} ${sw * 3}` : undefined} />
              <circle cx={x + w} cy={y} r={Math.max(W, H) * 0.035} fill={c} stroke="#fff" strokeWidth={sw * 0.6} />
              <text x={x + w} y={y} dy="0.35em" textAnchor="middle" fontSize={Math.max(W, H) * 0.04} fontWeight={700} fill="#fff">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

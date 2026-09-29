import { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div className="h-full rounded-full bg-teal transition-all duration-500" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  color = '#0F766E',
  track = 'rgba(148,163,184,0.3)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          style={{ transition: 'stroke-dashoffset .3s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{children}</div>
    </div>
  );
}

/** Horizontal tracker: Submitted → Evidence verified → … */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-start">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span className={`absolute right-1/2 top-3 h-0.5 w-full ${i <= current ? 'bg-teal' : 'bg-slate-200'}`} />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                done ? 'border-teal bg-teal text-white' : active ? 'border-teal bg-white text-teal' : 'border-slate-300 bg-white text-ink-faint'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`mt-1.5 px-1 text-[10.5px] leading-tight ${done || active ? 'font-medium text-navy' : 'text-ink-faint'}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Value range bar: shows lo–hi within a wider scale plus the point estimate. */
export function RangeBar({
  lo,
  hi,
  mid,
  min,
  max,
  tone = 'teal',
}: {
  lo: number;
  hi: number;
  mid?: number;
  min: number;
  max: number;
  tone?: 'teal' | 'ember';
}) {
  const p = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const color = tone === 'teal' ? 'bg-teal' : 'bg-ember';
  return (
    <div className="relative h-2 w-full rounded-full bg-slate-200">
      <div className={`absolute h-full rounded-full ${color} opacity-80`} style={{ left: p(lo), width: `calc(${p(hi)} - ${p(lo)})` }} />
      {mid !== undefined && (
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-navy" style={{ left: p(mid) }} />
      )}
    </div>
  );
}

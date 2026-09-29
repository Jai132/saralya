import { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-line bg-white shadow-card ${className}`} {...rest} />;
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">{eyebrow}</div>}
      <h2 className="text-[22px] font-semibold leading-tight">{title}</h2>
      {sub && <p className="mt-1.5 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

export function Callout({
  tone = 'teal',
  title,
  children,
  icon,
}: {
  tone?: 'teal' | 'ember' | 'navy';
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const tones = {
    teal: 'bg-teal-tint border-teal',
    ember: 'bg-ember-tint border-ember',
    navy: 'bg-slate-50 border-navy',
  };
  return (
    <div className={`rounded-xl border-l-4 px-4 py-3 text-sm ${tones[tone]}`}>
      <div className="flex gap-2.5">
        {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
        <div>
          {title && <div className="mb-0.5 font-semibold text-navy">{title}</div>}
          <div className="text-ink-soft">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function KV({ k, v, mono }: { k: ReactNode; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-ink-soft">{k}</span>
      <span className={`text-right font-medium text-ink ${mono ? 'font-mono text-[13px]' : ''}`}>{v}</span>
    </div>
  );
}

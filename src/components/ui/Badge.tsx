import { ReactNode } from 'react';
import { FlaskConical, ShieldCheck, Camera, FileWarning } from 'lucide-react';

type Tone = 'teal' | 'ember' | 'red' | 'navy' | 'slate' | 'amber' | 'white';

const tones: Record<Tone, string> = {
  teal: 'bg-teal-tint text-teal border-teal/20',
  ember: 'bg-ember-tint text-ember border-ember/20',
  red: 'bg-danger-tint text-danger border-danger/20',
  navy: 'bg-navy text-white border-navy',
  slate: 'bg-slate-100 text-ink-soft border-slate-200',
  amber: 'bg-amber-tint text-amber border-amber/25',
  white: 'bg-white/15 text-white border-white/20',
};

export function Chip({
  tone = 'slate',
  icon,
  children,
  className = '',
  title,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

/** Marks any number or result that is dummy data in this prototype. */
export function SimChip({ dark, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <Chip
      tone={dark ? 'white' : 'slate'}
      icon={<FlaskConical className="h-3 w-3" />}
      className={`!text-[10px] ${className}`}
      title="This output is dummy data in the prototype. Production uses specialist models and live registry pulls."
    >
      Simulated in prototype
    </Chip>
  );
}

export type Tier = 'green' | 'amber' | 'red';

export function TierPill({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' }) {
  const cls = {
    green: 'bg-teal text-white',
    amber: 'bg-[#D97706] text-white',
    red: 'bg-danger text-white',
  }[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${cls} ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {tier[0].toUpperCase() + tier.slice(1)}
    </span>
  );
}

export type Maturity = 'high' | 'medium' | 'research';

export function MaturityBadge({ level }: { level: Maturity }) {
  const cls = { high: 'bg-[#15803d]', medium: 'bg-ember', research: 'bg-danger' }[level];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${cls}`}>
      {level}
    </span>
  );
}

export function SourceBadge({ kind }: { kind: 'signed' | 'photo' | 'live' }) {
  if (kind === 'signed')
    return (
      <Chip
        tone="teal"
        icon={<ShieldCheck className="h-3 w-3" />}
        title="Issued and digitally signed by the government source. It can't be edited or staged, unlike an uploaded scan."
      >
        Issuer-signed
      </Chip>
    );
  if (kind === 'photo')
    return (
      <Chip
        tone="ember"
        icon={<FileWarning className="h-3 w-3" />}
        title="A photo of a paper document. It can be edited or forged; treat as a weaker source than an issued record."
      >
        Photo of paper
      </Chip>
    );
  return (
    <Chip tone="navy" icon={<Camera className="h-3 w-3" />}>
      Live capture
    </Chip>
  );
}

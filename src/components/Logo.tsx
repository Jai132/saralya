/** Saralya mark: a sealed lens — a capture ring closed by a seal notch. */
export function LogoMark({ size = 28, light }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill={light ? '#ffffff' : '#0B1B34'} />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#14b8a6" strokeWidth="5" strokeDasharray="88 20" strokeLinecap="round" transform="rotate(-50 32 32)" />
      <circle cx="32" cy="32" r="6.5" fill={light ? '#0B1B34' : '#ffffff'} />
      <circle cx="46.5" cy="19" r="3.2" fill="#C2410C" />
    </svg>
  );
}

export function Wordmark({ light, size = 'md' }: { light?: boolean; size?: 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size === 'lg' ? 40 : 28} light={light} />
      <span
        className={`font-serif font-semibold tracking-tight ${light ? 'text-white' : 'text-navy'} ${size === 'lg' ? 'text-[30px]' : 'text-xl'}`}
      >
        Saralya
      </span>
    </div>
  );
}

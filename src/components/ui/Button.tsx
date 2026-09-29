import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'glass';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-teal text-white hover:bg-teal-dark active:bg-teal-dark disabled:bg-teal/40',
  secondary: 'bg-white text-navy border border-line hover:border-teal/50 hover:text-teal disabled:text-ink-faint',
  ghost: 'bg-transparent text-teal hover:bg-teal-tint disabled:text-ink-faint',
  danger: 'bg-danger text-white hover:bg-red-800 disabled:bg-danger/40',
  dark: 'bg-navy text-white hover:bg-navy-800 disabled:bg-navy/40',
  glass: 'bg-white/15 text-white backdrop-blur-md border border-white/20 hover:bg-white/25 disabled:opacity-40',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-xl gap-2',
  lg: 'h-14 px-5 text-base rounded-2xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/** Sticky bottom action bar for mobile screens. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-6 shrink-0" />
      <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-line bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
        {children}
      </div>
    </>
  );
}

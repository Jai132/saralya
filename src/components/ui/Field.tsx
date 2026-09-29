import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useId } from 'react';
import { Check } from 'lucide-react';

interface FieldShellProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  id: string;
}

function FieldShell({ label, hint, error, children, id }: FieldShellProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-navy">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'prefix'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  value: string;
  onChange: (v: string) => void;
  upper?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function TextField({ label, hint, error, value, onChange, upper, prefix, suffix, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3.5 text-[15px] text-ink-soft">{prefix}</span>}
        <input
          id={id}
          className={`field-input ${prefix ? 'pl-12' : ''} ${suffix ? 'pr-24' : ''}`}
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
          {...rest}
        />
        {suffix && <span className="absolute right-2">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  placeholder?: string;
}

export function SelectField({ label, hint, error, value, onChange, options, placeholder = 'Select', ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      <select
        id={id}
        className={`field-input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%2394a3b8%22 stroke-width=%221.6%22 fill=%22none%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-9 ${value ? '' : 'text-ink-faint'}`}
        value={value}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value} className="text-ink">
              {opt.label}
            </option>
          );
        })}
      </select>
    </FieldShell>
  );
}

/** Pill-style single choice. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label?: ReactNode;
  value: T | '';
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  error?: string | null;
}) {
  return (
    <div className="mb-4">
      {label && <div className="mb-1.5 text-[13px] font-medium text-navy">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-[42px] rounded-xl border px-3.5 text-sm font-medium transition ${
              value === o.value ? 'border-teal bg-teal-tint text-teal' : 'border-line bg-white text-ink-soft hover:border-teal/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3.5 transition hover:border-teal/40">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-teal/30 ${
          checked ? 'border-teal bg-teal' : 'border-slate-300 bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      <span>
        <span className="block text-sm font-medium text-navy">{label}</span>
        {sub && <span className="mt-0.5 block text-xs text-ink-soft">{sub}</span>}
      </span>
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="mb-4 flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-navy">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-teal' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

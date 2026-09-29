import { ReactNode } from 'react';

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
            value === t.id ? 'border-teal text-teal' : 'border-transparent text-ink-soft hover:text-navy'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

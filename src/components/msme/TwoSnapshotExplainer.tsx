import { ArrowDown } from 'lucide-react';
import { lakh } from '../../lib/format';
import { TWO_SNAPSHOT_EXAMPLE } from '../../data/msme';

export interface TwoSnapshotValues {
  t0: number;
  purchases: number;
  t1: number;
  cogs: number;
  marginPct: number;
  sales: number;
  days: number;
}

interface Term {
  op?: string;
  label: string;
  sub: string;
  value: number;
  tone: string;
  pending?: boolean;
}

/**
 * Stock today + verified purchases − stock at the re-capture = goods sold at cost; grossed up by the margin,
 * that's sales. Bars are drawn to scale. `pendingT1` shows snapshot 2 as still to come (borrower view).
 */
export function TwoSnapshotExplainer({ v = TWO_SNAPSHOT_EXAMPLE, pendingT1, dark }: { v?: TwoSnapshotValues; pendingT1?: boolean; dark?: boolean }) {
  const terms: Term[] = [
    { label: 'Stock today', sub: 'Snapshot 1', value: v.t0, tone: 'bg-teal' },
    { op: '+', label: 'Purchases', sub: 'Signed e-invoices', value: v.purchases, tone: 'bg-navy' },
    { op: '−', label: 'Stock later', sub: 'Snapshot 2', value: v.t1, tone: 'bg-teal-light', pending: pendingT1 },
    { op: '=', label: 'Goods sold', sub: 'At cost', value: v.cogs, tone: 'bg-ember' },
  ];
  const max = Math.max(...terms.map((t) => t.value));
  const ink = dark ? 'text-white' : 'text-navy';
  const soft = dark ? 'text-white/65' : 'text-ink-faint';
  return (
    <div>
      <div className="flex items-end gap-1">
        {terms.map((t, i) => (
          <div key={t.label} className="flex flex-1 items-end gap-1">
            {t.op && <span className={`pb-12 text-lg font-bold ${soft}`}>{t.op}</span>}
            <div className="min-w-0 flex-1 text-center">
              <div className="flex h-24 items-end justify-center">
                <div
                  className={`w-full max-w-[3.25rem] origin-bottom rounded-t-md ${t.pending ? 'border-2 border-dashed border-teal/60 bg-teal/10' : t.tone}`}
                  style={{ height: `${(t.value / max) * 100}%`, animation: `fadeUp .5s ease-out ${i * 0.15}s both` }}
                />
              </div>
              <div className={`mt-1 text-[11px] font-semibold leading-tight ${ink}`}>{t.label}</div>
              <div className={`text-[10px] leading-tight ${soft}`}>{t.sub}</div>
              <div className={`mt-0.5 font-mono text-[11px] ${t.pending ? soft : ink}`}>{lakh(t.value)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-2 flex items-center justify-center gap-1.5 text-[11px] ${soft}`}>
        <ArrowDown className="h-3.5 w-3.5" /> add the usual margin (~{v.marginPct}%)
      </div>
      <div className={`mt-1 rounded-xl px-3 py-2 text-center text-sm ${dark ? 'bg-white/10' : 'bg-teal-tint'}`}>
        <span className={soft}>Sales over {v.days} days ≈ </span>
        <span className={`font-semibold ${dark ? 'text-teal-light' : 'text-teal'}`}>{lakh(v.sales)}</span>
      </div>
    </div>
  );
}

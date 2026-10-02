import { ReactNode, useMemo } from 'react';
import { Boxes, CalendarClock, Clock, Gauge, Link2, QrCode, ShieldCheck, Store, Zap } from 'lucide-react';
import type { ShellState } from '../../../components/capture/CaptureShell';
import { BottomBar, Button, Callout, Card, SimChip } from '../../../components/ui';
import { TwoSnapshotExplainer } from '../../../components/msme/TwoSnapshotExplainer';
import { useBlobUrl } from '../../../lib/useBlobUrl';
import { dateIN, indian, mmss, shortHash } from '../../../lib/format';
import { METER_READING } from '../../../data/msme';
import { useCaptures } from '../../../store/captures';
import type { MsmeFlowState } from './state';

function Item({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-card">
      <span className="rounded-lg bg-teal-tint p-1.5 text-teal">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-navy">{title}</span>
        <span className="block text-xs text-ink-soft">{sub}</span>
      </span>
    </li>
  );
}

export function IntroStage({ onStart }: { onStart: () => void }) {
  return (
    <div className="animate-fadeUp">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-teal-light">
        <Store className="h-7 w-7" />
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Shop walkthrough · about 5 minutes</div>
      <h1 className="mb-2 text-[22px] font-semibold leading-tight">Walk us through your shop</h1>
      <p className="mb-4 text-sm text-ink-soft">Your phone does the inspection. Here’s what we’ll capture, and why.</p>
      <ul className="mb-4 space-y-2">
        <Item icon={<Store className="h-4 w-4" />} title="Shop front & signboard" sub="Shows the shop is where your Udyam says it is" />
        <Item icon={<Boxes className="h-4 w-4" />} title="Counter, shelves & back room" sub="A slow pan of each wall lets us estimate stock" />
        <Item icon={<QrCode className="h-4 w-4" />} title="Two QR codes" sub="Your UPI QR and a supplier’s e-invoice" />
        <Item icon={<Zap className="h-4 w-4" />} title="Electricity meter" sub="Power use tracks how busy the shop is" />
      </ul>
      <Callout tone="teal" title="Two snapshots, not one">
        Today is snapshot 1. In 7–14 days we’ll ask for a 3-minute re-capture — the change in stock plus your verified purchases tells us your
        real sales.
      </Callout>
      <BottomBar>
        <Button block size="lg" onClick={onStart}>
          Start walkthrough
        </Button>
      </BottomBar>
    </div>
  );
}

/** Framing guide for the meter photo. */
export function meterOverlay(s: ShellState) {
  if (s.step.id !== 'meter') return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pt-[calc(2.4rem+6%)]">
      <div className="relative rounded-xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" style={{ width: '56%', aspectRatio: '0.8' }}>
        {['-left-1 -top-1 border-l-4 border-t-4', '-right-1 -top-1 border-r-4 border-t-4', '-bottom-1 -left-1 border-b-4 border-l-4', '-bottom-1 -right-1 border-b-4 border-r-4'].map((c) => (
          <span key={c} className={`absolute h-5 w-5 rounded-sm border-teal-light ${c}`} />
        ))}
      </div>
      <div className="mt-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">Electricity meter · kWh display</div>
    </div>
  );
}

function CaptureThumb({ captureId, className = '' }: { captureId?: string; className?: string }) {
  const blobId = useCaptures((s) => s.items.find((c) => c.id === captureId)?.blobId);
  const url = useBlobUrl(blobId);
  return <div className={`overflow-hidden rounded-xl bg-slate-200 ${className}`}>{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>;
}

export function MeterResultStage({ captureId, onNext }: { captureId?: string; onNext: () => void }) {
  const m = METER_READING;
  return (
    <div className="animate-fadeUp space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Step 3 of 4 · Electricity meter</div>
        <h1 className="text-[22px] font-semibold leading-tight">Meter reading captured</h1>
      </div>
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-lg bg-teal-tint p-1.5 text-teal">
            <Gauge className="h-4 w-4" />
          </span>
          <div className="flex-1 font-semibold text-navy">Reading</div>
          <SimChip />
        </div>
        <div className="flex gap-3">
          <CaptureThumb captureId={captureId} className="aspect-[4/5] w-28 shrink-0" />
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-mono text-[26px] font-bold leading-none text-navy">
              {m.kwh} <span className="text-sm font-semibold text-ink-soft">kWh</span>
            </div>
            <div className="mt-2 space-y-1 text-[13px] text-ink-soft">
              <div>Consumer no. {m.consumerNo}</div>
              <div>Tariff: {m.tariff}</div>
              <div>Sanctioned load: {m.sanctionedLoadKw} kW</div>
              <div>
                Typical use: {m.avgMonthlyUnits[0]}–{m.avgMonthlyUnits[1]} units / month
              </div>
            </div>
          </div>
        </div>
      </Card>
      <p className="px-1 text-xs text-ink-faint">
        A shop’s power use rises and falls with trade. Your officer sees it next to sales and stock, not on its own.
      </p>
      <BottomBar>
        <Button block size="lg" onClick={onNext}>
          Continue
        </Button>
      </BottomBar>
    </div>
  );
}

export function DoneStage({ appId, state, onSubmit }: { appId: string; state: MsmeFlowState; onSubmit: () => void }) {
  const items = useCaptures((s) => s.items);
  const caps = useMemo(() => items.filter((c) => c.appId === appId), [items, appId]);
  const head = caps.length ? caps[caps.length - 1].hash : '';
  const ms = (state.sessions.walkthrough?.durationMs ?? 0) + (state.sessions.meter?.durationMs ?? 0);
  const due = state.snapshot2Due;
  return (
    <div className="animate-fadeUp space-y-3">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal text-white shadow-lg">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Step 4 of 4</div>
        <h1 className="text-[24px] font-semibold leading-tight">Snapshot 1 of 2 sealed</h1>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">Every frame is hashed and chained on this phone, so none of it can be swapped later.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-2.5 shadow-card">
          <div className="text-lg font-semibold text-navy">{indian(caps.length)}</div>
          <div className="text-[10px] text-ink-faint">frames sealed</div>
        </div>
        <div className="rounded-xl bg-white p-2.5 shadow-card">
          <div className="text-lg font-semibold text-navy">{mmss(ms)}</div>
          <div className="text-[10px] text-ink-faint">capture time</div>
        </div>
        <div className="rounded-xl bg-white p-2.5 shadow-card">
          <div className="flex items-center justify-center gap-1 font-mono text-sm font-semibold text-navy">
            <Link2 className="h-3.5 w-3.5 text-teal" />
            {head ? shortHash(head) : '—'}
          </div>
          <div className="text-[10px] text-ink-faint">chain head</div>
        </div>
      </div>

      {due && (
        <Card className="flex items-start gap-3 p-4">
          <span className="rounded-lg bg-ember-tint p-1.5 text-ember">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="text-sm">
            <div className="font-semibold text-navy">
              Next: a 3-minute re-capture, {dateIN(due.from)} – {dateIN(due.to)}
            </div>
            <div className="mt-0.5 text-ink-soft">Just the shelves and back room. We’ll remind you; it unlocks your sales estimate.</div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex-1 font-semibold text-navy">How two snapshots show your sales</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-ink-soft">Illustrative</span>
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          What you had, plus what you bought, minus what’s left, is what you sold — at cost. No bank statement guesswork.
        </p>
        <TwoSnapshotExplainer pendingT1 />
      </Card>

      <div className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
        <Clock className="h-3.5 w-3.5" /> Sealed {dateIN(state.snapshot1At ?? Date.now())}
      </div>

      <BottomBar>
        <Button block size="lg" onClick={onSubmit}>
          Submit for review
        </Button>
      </BottomBar>
    </div>
  );
}

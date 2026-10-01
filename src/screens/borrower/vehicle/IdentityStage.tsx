import { ReactNode } from 'react';
import { BadgeCheck, Gauge, Hash, ScanLine, CircleDot, Fingerprint } from 'lucide-react';
import { BottomBar, Button, Card, Chip, SimChip } from '../../../components/ui';
import { ReliefMap } from '../../../components/vehicle/ReliefMap';
import { useBlobUrl } from '../../../lib/useBlobUrl';
import { indian } from '../../../lib/format';
import { formatReg, RcRecord } from '../../../data/vehicles';
import { useCaptures } from '../../../store/captures';

function Thumb({ captureId, label }: { captureId?: string; label?: string }) {
  const blobId = useCaptures((s) => s.items.find((c) => c.id === captureId)?.blobId);
  const url = useBlobUrl(blobId);
  return (
    <div className="min-w-0 flex-1">
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-200">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>
      {label && <div className="mt-0.5 text-center text-[10px] text-ink-faint">{label}</div>}
    </div>
  );
}

function Check({ icon, title, children, thumb }: { icon: ReactNode; title: string; children: ReactNode; thumb?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-lg bg-teal-tint p-1.5 text-teal">{icon}</span>
        <div className="flex-1 font-semibold text-navy">{title}</div>
        <SimChip />
      </div>
      <div className="flex gap-3">
        {thumb && <div className="w-24 shrink-0">{thumb}</div>}
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">{children}</div>
      </div>
    </Card>
  );
}

const ok = (t: ReactNode) => (
  <div className="flex items-start gap-1.5 text-teal">
    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{t}</span>
  </div>
);

export function IdentityStage({ rc, caps, onNext }: { rc: RcRecord; caps: Record<string, string>; onNext: () => void }) {
  const last5 = rc.chassisMasked.slice(-5);
  return (
    <div className="animate-fadeUp space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Identity checks</div>
        <h1 className="text-[22px] font-semibold leading-tight">The vehicle matches its record</h1>
        <p className="mt-1 text-sm text-ink-soft">Four independent identity handles, each checked against the signed RC.</p>
      </div>

      <Check icon={<ScanLine className="h-4 w-4" />} title="Number plate" thumb={<Thumb captureId={caps.plate} />}>
        <div>
          Read: <span className="font-mono font-semibold tracking-wider text-navy">{formatReg(rc.regNo)}</span> <Chip tone="slate">ANPR</Chip>
        </div>
        {ok(<>Plate → RC make/model ({rc.make} {rc.model}) matches the vehicle in frame</>)}
      </Check>

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-teal-tint p-1.5 text-teal">
            <Fingerprint className="h-4 w-4" />
          </span>
          <div className="flex-1 font-semibold text-navy">Chassis number · torch relief</div>
          <SimChip />
        </div>
        <div className="mb-3 flex gap-2">
          <Thumb captureId={caps['chassis-l']} label="Torch left" />
          <Thumb captureId={caps['chassis-c']} label="Torch centre" />
          <Thumb captureId={caps['chassis-r']} label="Torch right" />
        </div>
        <ReliefMap text={rc.chassisMasked.replace(/X+/, '·····')} />
        <div className="mt-3 space-y-1.5 text-sm">
          {ok('Stamped relief detected — not a print')}
          {ok(<>Chassis number matches RC (…{last5})</>)}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Three torch angles give a crude normal map: genuine stamping shades differently as the light moves; a photo or screen stays flat.
          Illustrative visual.
        </p>
      </Card>

      <Check icon={<Hash className="h-4 w-4" />} title="Engine number" thumb={<Thumb captureId={caps.engine} />}>
        <div>
          Read: <span className="font-mono text-navy">{rc.engineMasked}</span>
        </div>
        {ok('Matches RC')}
      </Check>

      <Check icon={<Gauge className="h-4 w-4" />} title="Odometer" thumb={<Thumb captureId={caps.odometer} />}>
        <div>
          Reading: <span className="font-semibold text-navy">{indian(rc.odometerKm)} km</span>
        </div>
        <div className="text-xs text-ink-soft">Machine-read at capture, not typed.</div>
      </Check>

      <Check icon={<CircleDot className="h-4 w-4" />} title="Tyres" thumb={<Thumb captureId={caps.tyres} />}>
        <div>
          Sidewall DOT: <span className="font-mono text-navy">{rc.tyreDot}</span>
        </div>
        <div className="text-xs text-ink-soft">Tyre date gives an independent age check.</div>
      </Check>

      <BottomBar>
        <Button block size="lg" onClick={onNext}>
          Next: calibrate the panels
        </Button>
      </BottomBar>
    </div>
  );
}

import { useState } from 'react';
import { Car, Truck, Search, Info } from 'lucide-react';
import { BottomBar, Button, Callout, TextField } from '../../../components/ui';
import { RcCard } from '../../../components/vehicle/RcCard';
import { DEMO_PLATES, fetchRc, RcRecord, RE_REG } from '../../../data/vehicles';
import type { VehicleKind } from '../../../store/application';

export function RcStage({
  kind,
  sub,
  ownerName,
  rc,
  onFetched,
  onNext,
}: {
  kind: VehicleKind;
  sub: string;
  ownerName: string;
  rc?: RcRecord;
  onFetched: (rc: RcRecord) => void;
  onNext: () => void;
}) {
  const [reg, setReg] = useState(rc?.regNo ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const Icon = kind === 'car' ? Car : Truck;

  const fetch = () => {
    if (!RE_REG.test(reg)) {
      setErr('Enter a registration number like MH12AB1234');
      return;
    }
    setErr(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onFetched(fetchRc(reg, sub, ownerName));
    }, 1600);
  };

  return (
    <div className="animate-fadeUp">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-2xl bg-teal-tint p-3 text-teal">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Step 1 · Identity first</div>
          <h1 className="text-[22px] font-semibold leading-tight">Which vehicle is it?</h1>
        </div>
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        We fetch the signed registration record first, then check that the vehicle in your camera is the one on the record.
      </p>
      <TextField
        label="Registration number"
        placeholder={DEMO_PLATES[kind]}
        upper
        maxLength={11}
        className="field-input font-mono text-lg tracking-[0.15em]"
        value={reg}
        onChange={(s) => {
          setReg(s.replace(/[^A-Z0-9]/g, ''));
          setErr(null);
        }}
        error={err}
        suffix={
          !reg ? (
            <button type="button" onClick={() => setReg(DEMO_PLATES[kind])} className="rounded-lg bg-teal-tint px-2.5 py-1.5 text-xs font-semibold text-teal">
              Use demo plate
            </button>
          ) : undefined
        }
      />
      {!rc && (
        <Button block variant="secondary" onClick={fetch} loading={loading} icon={<Search className="h-4 w-4" />}>
          {loading ? 'Fetching from DigiLocker…' : 'Fetch RC from DigiLocker (demo)'}
        </Button>
      )}
      {rc && (
        <div className="mt-2 animate-fadeUp">
          <RcCard rc={rc} cv={kind === 'cv'} />
          <div className="mt-4">
            <Callout tone="teal" icon={<Info className="h-4 w-4 text-teal" />} title="What happens next">
              An 8-angle walkaround, identity close-ups (plate, chassis, engine, odometer, tyres), a quick calibration of a few panels,
              and five actions that prove you have the vehicle. About 7 minutes.
            </Callout>
          </div>
        </div>
      )}
      {rc && (
        <BottomBar>
          <Button block size="lg" onClick={onNext}>
            Start the walkaround
          </Button>
        </BottomBar>
      )}
    </div>
  );
}

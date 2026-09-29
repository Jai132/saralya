import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Camera, EyeOff, MapPin, ScanFace, Clock } from 'lucide-react';
import { BorrowerPage } from './BorrowerLayout';
import { BottomBar, Button, Checkbox, Chip } from '../../components/ui';
import { useMe } from '../../store/useMe';
import { inspectionConsents, PRODUCTS } from '../../data/products';

/** Purpose-specific consent, confirmed right before the camera opens. Nothing is pre-ticked. */
export default function InspectConsent() {
  const nav = useNavigate();
  const me = useMe();
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!me.app) return <Navigate to="/b/loan" replace />;

  const product = me.app.product;
  const items = inspectionConsents(product);
  const all = items.every((c) => ticked[c.id]);
  const minutes = { msme: '~5 min', lap: '~8 min', vehicle: '~7 min' }[product];

  return (
    <BorrowerPage title="Before we start" back="/b/loan">
      <div className="animate-fadeUp">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-teal-light">
          <Camera className="h-7 w-7" />
        </div>
        <h1 className="mb-1 text-[24px] font-semibold">Your inspection, your consent</h1>
        <p className="mb-4 text-sm text-ink-soft">
          For your {PRODUCTS[product].title.toLowerCase()}. {PRODUCTS[product].inspection}.
        </p>
        <div className="mb-5 flex flex-wrap gap-1.5">
          <Chip tone="navy" icon={<Camera className="h-3 w-3" />}>
            Live capture only
          </Chip>
          <Chip tone="teal" icon={<Clock className="h-3 w-3" />}>
            {minutes}
          </Chip>
          <Chip tone="teal" icon={<MapPin className="h-3 w-3" />}>
            GPS-stamped
          </Chip>
        </div>

        <div className="space-y-2.5">
          {items.map((c) => (
            <Checkbox key={c.id} checked={!!ticked[c.id]} onChange={(b) => setTicked({ ...ticked, [c.id]: b })} label={c.label} sub={c.sub} />
          ))}
        </div>

        <div className="mt-5 space-y-2 rounded-2xl bg-white p-4 text-sm shadow-card">
          <div className="flex gap-3">
            <ScanFace className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
            <div>
              <div className="font-semibold text-navy">We analyse the asset, never the person</div>
              <div className="text-xs text-ink-soft">No face analysis, no expression or demeanour scoring.</div>
            </div>
          </div>
          <div className="flex gap-3">
            <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
            <div>
              <div className="font-semibold text-navy">Faces of bystanders are blurred automatically</div>
              <div className="text-xs text-ink-soft">Simulated in this prototype.</div>
            </div>
          </div>
        </div>
      </div>

      <BottomBar>
        <Button block size="lg" disabled={!all} onClick={() => nav(`/b/inspect/${product}`)}>
          {all ? 'Open camera' : 'Tick all four to continue'}
        </Button>
      </BottomBar>
    </BorrowerPage>
  );
}

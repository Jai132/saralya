import { ReactNode, useEffect, useRef, useState } from 'react';
import { Building, Building2, Check, FileCheck2, FileWarning, Home, Landmark, Loader2, MapPinned, Store, Sun, Construction, Info, Ruler } from 'lucide-react';
import type { ShellState } from '../../../components/capture/CaptureShell';
import { BottomBar, Button, Callout, Card, Chip, SimChip } from '../../../components/ui';
import { ParcelMap } from '../../../components/property/ParcelMap';
import { LocationProof } from '../../../components/property/LocationProof';
import { PlanOverlay, PlanTrace } from '../../../components/property/PlanViews';
import { ShadowFloorCount } from '../../../components/property/ShadowFloorCount';
import { StageTimeline } from '../../../components/property/StageTimeline';
import { useGeo } from '../../../lib/sensors';
import { useBlobUrl } from '../../../lib/useBlobUrl';
import { indian } from '../../../lib/format';
import {
  areaRangeSqft,
  ASBUILT_ROOMS,
  DEMO_LOCATION,
  DEVIATIONS,
  parcelFor,
  parcelPolygon,
  PROPERTY_PRODUCTS,
  PROPERTY_RECORDS,
  PROPERTY_TYPES,
  PropertyProduct,
  PropertyType,
  SOURCE_TIPS,
} from '../../../data/property';
import { useCaptures } from '../../../store/captures';
import type { LocationFix, PropertyFlowState } from './state';

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">{children}</div>;
}

function Choice({ active, icon, title, sub, onClick }: { active: boolean; icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border-2 bg-white p-3 text-left transition ${active ? 'border-teal shadow-card' : 'border-transparent shadow-card hover:border-teal/30'}`}
    >
      <span className={`rounded-lg p-2 ${active ? 'bg-teal text-white' : 'bg-teal-tint text-teal'}`}>{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-navy">{title}</span>
        <span className="block text-xs text-ink-soft">{sub}</span>
      </span>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? 'border-teal bg-teal text-white' : 'border-line'}`}>
        {active && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

const TYPE_ICONS: Record<PropertyType, ReactNode> = {
  house: <Home className="h-5 w-5" />,
  flat: <Building2 className="h-5 w-5" />,
  'shop-house': <Store className="h-5 w-5" />,
  plot: <Construction className="h-5 w-5" />,
};

export function TypeStage({
  type,
  product,
  onChange,
  onNext,
}: {
  type?: PropertyType;
  product?: PropertyProduct;
  onChange: (p: { type?: PropertyType; product?: PropertyProduct }) => void;
  onNext: () => void;
}) {
  return (
    <div className="animate-fadeUp space-y-4">
      <div>
        <Eyebrow>Step 1 of 5 · The property</Eyebrow>
        <h1 className="text-[22px] font-semibold leading-tight">Show us the property</h1>
        <p className="mt-1 text-sm text-ink-soft">About 8 minutes on site. First, what kind of property is it?</p>
      </div>
      <div className="space-y-2">
        {PROPERTY_TYPES.map((t) => (
          <Choice
            key={t.id}
            active={type === t.id}
            icon={TYPE_ICONS[t.id]}
            title={t.title}
            sub={t.sub}
            onClick={() => onChange(t.id === 'plot' ? { type: t.id, product: 'self-construction' } : { type: t.id })}
          />
        ))}
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-navy">Which loan?</div>
        <div className="space-y-2">
          {PROPERTY_PRODUCTS.map((p) => (
            <Choice
              key={p.id}
              active={product === p.id}
              icon={p.id === 'lap' ? <Landmark className="h-5 w-5" /> : <Building className="h-5 w-5" />}
              title={p.title}
              sub={p.sub}
              onClick={() => onChange({ product: p.id })}
            />
          ))}
        </div>
      </div>
      <BottomBar>
        <Button block size="lg" disabled={!type || !product} onClick={onNext}>
          Continue
        </Button>
      </BottomBar>
    </div>
  );
}

/** Live GPS, satellite map with the parcel, and the three location checks. */
export function LocationStage({ saved, onVerified, onNext }: { saved?: LocationFix; onVerified: (f: LocationFix) => void; onNext: () => void }) {
  const geo = useGeo(!saved);
  const fixes = useRef(0);
  const lastTs = useRef<number | undefined>(undefined);
  const [timedOut, setTimedOut] = useState(false);
  const [fix, setFix] = useState<LocationFix | null>(saved ?? null);
  const [checked, setChecked] = useState(!!saved);

  if (geo.status === 'ok' && geo.ts !== lastTs.current) {
    lastTs.current = geo.ts;
    fixes.current++;
  }
  useEffect(() => {
    if (saved) return;
    const t = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(t);
  }, [saved]);

  // Lock the location once there's a good fix (or a couple of seconds of fixes), or fall back to the demo spot.
  useEffect(() => {
    if (fix) return;
    const good = geo.status === 'ok' && (geo.accuracy! <= 20 || fixes.current >= 3);
    const fail = geo.status === 'denied' || geo.status === 'unavailable' || (timedOut && geo.status !== 'ok');
    if (!good && !fail && !(timedOut && geo.status === 'ok')) return;
    const demo = geo.status !== 'ok';
    const lat = demo ? DEMO_LOCATION.lat : geo.lat!;
    const lng = demo ? DEMO_LOCATION.lng : geo.lng!;
    const p = parcelFor(lat, lng);
    setFix({ lat, lng, accuracy: demo ? DEMO_LOCATION.accuracy : geo.accuracy!, fixes: Math.max(1, fixes.current), demo, ulpin: p.ulpin, survey: p.survey, village: p.village, at: Date.now() });
  }, [geo, timedOut, fix]);

  return (
    <div className="animate-fadeUp space-y-3">
      <div>
        <Eyebrow>Step 2 of 5 · Location proof</Eyebrow>
        <h1 className="text-[22px] font-semibold leading-tight">Stand at the property</h1>
        <p className="mt-1 text-sm text-ink-soft">We tie every photo to this exact plot, so it can’t be swapped for another property.</p>
      </div>
      {fix ? (
        <ParcelMap lat={fix.lat} lng={fix.lng} accuracy={fix.accuracy} parcel={parcelPolygon(fix.lat, fix.lng)} />
      ) : (
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-2xl bg-navy text-white/80">
          <Loader2 className="h-6 w-6 animate-spin text-teal-light" />
          <div className="text-sm">{geo.status === 'ok' ? `Refining GPS · ±${Math.round(geo.accuracy!)} m` : 'Getting a GPS fix…'}</div>
        </div>
      )}
      {fix && (
        <LocationProof
          lat={fix.lat}
          lng={fix.lng}
          accuracy={fix.accuracy}
          fixes={fix.fixes}
          demo={fix.demo}
          ulpin={fix.ulpin}
          survey={fix.survey}
          village={fix.village}
          instant={!!saved}
          onDone={() => {
            setChecked(true);
            if (!saved) onVerified(fix);
          }}
        />
      )}
      {checked && (
        <div className="flex animate-fadeUp justify-center">
          <Chip tone="teal" icon={<MapPinned className="h-3.5 w-3.5" />} className="!px-3 !py-1 !text-sm">
            Parcel-bound capture
          </Chip>
        </div>
      )}
      <BottomBar>
        <Button block size="lg" disabled={!checked} onClick={onNext}>
          Continue to records
        </Button>
      </BottomBar>
    </div>
  );
}

function SourceBadge({ source }: { source: 'signed' | 'paper' }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} title={SOURCE_TIPS[source]} className="inline-flex">
        {source === 'signed' ? (
          <Chip tone="teal" icon={<FileCheck2 className="h-3 w-3" />}>
            Issuer-signed
          </Chip>
        ) : (
          <Chip tone="ember" icon={<FileWarning className="h-3 w-3" />}>
            Photo of paper
          </Chip>
        )}
      </button>
      {open && (
        <span className="absolute right-0 top-7 z-10 w-56 animate-fadeUp rounded-xl bg-navy p-2.5 text-xs leading-snug text-white shadow-lg">{SOURCE_TIPS[source]}</span>
      )}
    </span>
  );
}

export function RecordsStage({ pulled, onPulled, onNext }: { pulled: boolean; onPulled: () => void; onNext: () => void }) {
  const [n, setN] = useState(pulled ? PROPERTY_RECORDS.length : -1);
  useEffect(() => {
    if (n < 0 || n >= PROPERTY_RECORDS.length) {
      if (n === PROPERTY_RECORDS.length && !pulled) onPulled();
      return;
    }
    const t = window.setTimeout(() => setN((x) => x + 1), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  const done = n >= PROPERTY_RECORDS.length;
  return (
    <div className="animate-fadeUp space-y-3">
      <div>
        <Eyebrow>Step 3 of 5 · Records</Eyebrow>
        <h1 className="text-[22px] font-semibold leading-tight">Pull the property records</h1>
        <p className="mt-1 text-sm text-ink-soft">Records issued by the registry itself carry more weight than photos of paper copies.</p>
      </div>
      <Card className="divide-y divide-line p-0">
        {PROPERTY_RECORDS.map((r, i) => (
          <div key={r.id} className="flex items-start gap-3 p-3.5">
            <span className="mt-0.5">
              {n > i ? <Check className="h-5 w-5 text-teal" /> : n === i ? <Loader2 className="h-5 w-5 animate-spin text-teal" /> : <span className="block h-5 w-5 rounded-full border-2 border-line" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-navy">{r.name}</span>
                {n > i && <SourceBadge source={r.source} />}
              </div>
              <div className="text-xs text-ink-faint">{r.via}</div>
              {n > i && <div className="mt-0.5 animate-fadeUp text-[13px] text-ink-soft">{r.result}</div>}
            </div>
          </div>
        ))}
      </Card>
      {done && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-ink-faint">Title itself is verified by the lender’s advocate. Saralya binds the property you show to the registry parcel.</p>
          <SimChip />
        </div>
      )}
      <BottomBar>
        {n < 0 ? (
          <Button block size="lg" onClick={() => setN(0)}>
            Pull records (demo)
          </Button>
        ) : (
          <Button block size="lg" disabled={!done} onClick={onNext}>
            Start the walkaround
          </Button>
        )}
      </BottomBar>
    </div>
  );
}

export function PlanIntroStage({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="animate-fadeUp">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-teal-light">
        <Ruler className="h-7 w-7" />
      </div>
      <Eyebrow>Step 4 of 5 · Sanctioned plan</Eyebrow>
      <h1 className="mb-2 text-[22px] font-semibold leading-tight">Photograph your sanctioned plan</h1>
      <p className="mb-4 text-sm text-ink-soft">
        Lay the approved building plan flat in good light. We trace its walls and compare them with what you just showed us.
      </p>
      <Callout tone="teal" title="Live capture only">
        Take the photo now with the camera — uploads aren’t accepted, so the plan you show is the one on site.
      </Callout>
      <BottomBar>
        <div className="space-y-2">
          <Button block size="lg" onClick={onStart}>
            Open camera
          </Button>
          <Button block variant="ghost" onClick={onSkip}>
            I don’t have the plan here
          </Button>
        </div>
      </BottomBar>
    </div>
  );
}

/** Framing guide for the plan photo. */
export function planGuide(s: ShellState) {
  if (s.step.id !== 'plan') return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pt-[calc(2.4rem+6%)]">
      <div className="relative rounded-xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" style={{ width: '84%', aspectRatio: '1.42' }}>
        {['-left-1 -top-1 border-l-4 border-t-4', '-right-1 -top-1 border-r-4 border-t-4', '-bottom-1 -left-1 border-b-4 border-l-4', '-bottom-1 -right-1 border-b-4 border-r-4'].map((c) => (
          <span key={c} className={`absolute h-5 w-5 rounded-sm border-teal-light ${c}`} />
        ))}
      </div>
      <div className="mt-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">Sanctioned plan · whole sheet</div>
    </div>
  );
}

export function PlanStage({ captureId, onNext }: { captureId?: string; onNext: () => void }) {
  const blobId = useCaptures((s) => s.items.find((c) => c.id === captureId)?.blobId);
  const url = useBlobUrl(blobId);
  const [traced, setTraced] = useState(false);
  const [lo, hi] = areaRangeSqft(ASBUILT_ROOMS);
  return (
    <div className="animate-fadeUp space-y-3">
      <div>
        <Eyebrow>Step 4 of 5 · Plan check</Eyebrow>
        <h1 className="text-[22px] font-semibold leading-tight">{traced ? 'Plan compared with the building' : 'Reading your plan'}</h1>
      </div>
      {!traced ? (
        <PlanTrace photoUrl={url} onDone={() => setTraced(true)} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">
              As built: <b className="text-navy">{indian(lo)}–{indian(hi)} sq ft</b> ground floor
            </span>
            <SimChip />
          </div>
          <PlanOverlay />
          <Card className="p-4">
            <div className="mb-2 font-semibold text-navy">Differences from the approved plan</div>
            <ul className="space-y-2">
              {DEVIATIONS.map((d) => (
                <li key={d.label} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  <span>
                    <span className="font-semibold text-navy">{d.label}</span>
                    <span className="block text-xs text-ink-soft">{d.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-2.5 text-[13px] text-ink-soft">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              We found some differences from the approved plan; your officer will discuss them.
            </div>
          </Card>
        </>
      )}
      <BottomBar>
        <Button block size="lg" disabled={!traced} onClick={onNext}>
          Continue
        </Button>
      </BottomBar>
    </div>
  );
}

export function SummaryStage({ state, appId, onSubmit }: { state: PropertyFlowState; appId: string; onSubmit: () => void }) {
  const count = useCaptures((s) => s.items.reduce((n, c) => n + (c.appId === appId ? 1 : 0), 0));
  const self = state.product === 'self-construction';
  return (
    <div className="animate-fadeUp space-y-3">
      <div>
        <Eyebrow>Step 5 of 5 · Review</Eyebrow>
        <h1 className="text-[22px] font-semibold leading-tight">Property captured</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {indian(count)} sealed frames, bound to parcel {state.location?.ulpin ?? '—'}.
        </p>
      </div>

      <Card className="p-4">
        <div className="mb-1 flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber" />
          <div className="flex-1 font-semibold text-navy">Counting floors from a shadow</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-ink-soft">Illustrative</span>
        </div>
        <p className="mb-2 text-xs text-ink-soft">
          From the sun’s angle at capture time and the length of the building’s shadow in satellite imagery, we can estimate its height.
        </p>
        <ShadowFloorCount />
      </Card>

      {self && (
        <Card className="p-4">
          <div className="mb-1 font-semibold text-navy">Your construction stages</div>
          <p className="mb-3 text-xs text-ink-soft">Your next tranche can release on a 3-minute capture instead of an officer visit.</p>
          <StageTimeline current={0} />
          <div className="mt-2 flex justify-end">
            <SimChip />
          </div>
        </Card>
      )}

      <BottomBar>
        <Button block size="lg" onClick={onSubmit}>
          Submit for review
        </Button>
      </BottomBar>
    </div>
  );
}

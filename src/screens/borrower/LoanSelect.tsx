import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Store, Home as HomeIcon, Truck, Car, ChevronRight, ShieldCheck, Camera, Info } from 'lucide-react';
import { BorrowerPage } from './BorrowerLayout';
import { BottomBar, Button, Callout, Card, SelectField, Segmented, SourceBadge } from '../../components/ui';
import { useMe } from '../../store/useMe';
import { Product, VehicleKind, useApplications } from '../../store/application';
import { PRODUCTS, VEHICLE_SUBS, documentsFor } from '../../data/products';
import { lakh, rupees } from '../../lib/format';
import { digits } from '../../lib/validate';

type Stage = 'product' | 'details' | 'documents';

const ICONS: Record<Product, typeof Store> = { msme: Store, lap: HomeIcon, vehicle: Truck };

export default function LoanSelect() {
  const nav = useNavigate();
  const me = useMe();
  const start = useApplications((s) => s.start);
  const patchApp = useApplications((s) => s.patch);
  const existing = me.app && me.app.status === 'draft' ? me.app : undefined;

  const [stage, setStage] = useState<Stage>(existing ? 'documents' : 'product');
  const [product, setProduct] = useState<Product | null>(existing?.product ?? null);
  const [vehicleKind, setVehicleKind] = useState<VehicleKind | ''>(existing?.vehicleKind ?? '');
  const [vehicleSub, setVehicleSub] = useState(existing?.vehicleSub ?? '');
  const [vehicleNew, setVehicleNew] = useState<'new' | 'used' | ''>(existing ? (existing.vehicleNew ? 'new' : 'used') : 'used');
  const [amount, setAmount] = useState(existing?.amount ?? 0);
  const [amountText, setAmountText] = useState(existing ? String(existing.amount) : '');
  const [tenure, setTenure] = useState(existing?.tenureMonths ?? 0);
  const [purpose, setPurpose] = useState(existing?.purpose ?? '');
  const [tried, setTried] = useState(false);

  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!me.onboarded) return <Navigate to="/b/onboarding" replace />;

  const meta = product ? PRODUCTS[product] : null;

  const pick = (p: Product) => {
    setProduct(p);
    const m = PRODUCTS[p];
    setAmount(m.defaultAmount);
    setAmountText(String(m.defaultAmount));
    setTenure(m.tenures[2]);
    setPurpose('');
    if (p !== 'vehicle') {
      setStage('details');
      window.scrollTo(0, 0);
    }
  };

  const setAmt = (n: number) => {
    setAmount(n);
    setAmountText(String(n));
  };

  const amountErr =
    meta && (amount < meta.minAmount || amount > meta.maxAmount) ? `Between ${lakh(meta.minAmount)} and ${lakh(meta.maxAmount)}` : null;
  const detailsValid = !!meta && !amountErr && !!tenure && !!purpose;

  const toDocuments = () => {
    if (!detailsValid || !product) {
      setTried(true);
      return;
    }
    const fields = {
      product,
      vehicleKind: product === 'vehicle' ? (vehicleKind as VehicleKind) : undefined,
      vehicleSub: product === 'vehicle' ? vehicleSub : undefined,
      vehicleNew: product === 'vehicle' ? vehicleNew === 'new' : undefined,
      amount,
      tenureMonths: tenure,
      purpose,
    };
    if (existing && existing.product === product) patchApp(me.mobile!, fields);
    else start(me.mobile!, fields);
    setStage('documents');
    window.scrollTo(0, 0);
  };

  const onBack = () => {
    if (stage === 'documents') setStage('details');
    else if (stage === 'details') setStage('product');
    else nav('/b');
  };

  const title = stage === 'product' ? 'Choose a loan' : stage === 'details' ? meta?.title : 'Documents';

  return (
    <BorrowerPage title={title} onBack={onBack}>
      {stage === 'product' && (
        <div className="animate-fadeUp">
          <h1 className="mb-1 text-[24px] font-semibold">What do you need?</h1>
          <p className="mb-5 text-sm text-ink-soft">
            Hi {me.profile.fullName.split(' ')[0] || 'there'} — pick a loan. Each one comes with a short phone inspection instead of a field visit.
          </p>
          <div className="space-y-3">
            {(Object.keys(PRODUCTS) as Product[]).map((id) => {
              const m = PRODUCTS[id];
              const Icon = ICONS[id];
              const active = product === id;
              return (
                <Card key={id} className={`overflow-hidden transition ${active ? 'border-teal ring-2 ring-teal/20' : ''}`}>
                  <button onClick={() => pick(id)} className="flex w-full items-start gap-4 p-4 text-left">
                    <span className={`rounded-2xl p-3 ${active ? 'bg-teal text-white' : 'bg-teal-tint text-teal'}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-serif text-[17px] font-semibold text-navy">{m.title}</span>
                      <span className="mt-0.5 block text-[13px] text-ink-soft">{m.tagline}</span>
                      <span className="mt-2 block text-xs text-ink-faint">
                        {lakh(m.minAmount)} – {lakh(m.maxAmount)} · {m.inspection}
                      </span>
                    </span>
                    {id !== 'vehicle' && <ChevronRight className="mt-1 h-5 w-5 text-ink-faint" />}
                  </button>
                  {id === 'vehicle' && active && (
                    <div className="animate-fadeUp border-t border-line bg-slate-50/60 p-4">
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {(
                          [
                            { k: 'car', label: 'Used car', icon: Car },
                            { k: 'cv', label: 'Commercial vehicle', icon: Truck },
                          ] as const
                        ).map((o) => (
                          <button
                            key={o.k}
                            onClick={() => {
                              setVehicleKind(o.k);
                              setVehicleSub('');
                            }}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition ${
                              vehicleKind === o.k ? 'border-teal bg-teal-tint text-teal' : 'border-line bg-white text-navy'
                            }`}
                          >
                            <o.icon className="h-5 w-5" />
                            {o.label}
                          </button>
                        ))}
                      </div>
                      {vehicleKind && (
                        <>
                          <Segmented
                            label={vehicleKind === 'car' ? 'Body type' : 'Vehicle type'}
                            value={vehicleSub}
                            onChange={setVehicleSub}
                            options={VEHICLE_SUBS[vehicleKind]}
                          />
                          {vehicleKind === 'cv' && (
                            <Segmented
                              label="New or used"
                              value={vehicleNew}
                              onChange={(x) => setVehicleNew(x)}
                              options={[
                                { value: 'used', label: 'Used' },
                                { value: 'new', label: 'New' },
                              ]}
                            />
                          )}
                          <Button
                            block
                            disabled={!vehicleSub}
                            onClick={() => {
                              setStage('details');
                              window.scrollTo(0, 0);
                            }}
                          >
                            Continue
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {stage === 'details' && meta && (
        <div className="animate-fadeUp">
          <h1 className="mb-5 text-[24px] font-semibold">How much, and for how long?</h1>
          <div className="mb-5 rounded-2xl border border-line bg-white p-4">
            <div className="mb-1 text-[13px] font-medium text-navy">Loan amount</div>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-lg text-ink-soft">₹</span>
              <input
                inputMode="numeric"
                className="w-full border-0 bg-transparent font-serif text-[32px] font-semibold text-navy outline-none"
                value={amountText ? Number(amountText).toLocaleString('en-IN') : ''}
                onChange={(e) => {
                  const d = digits(e.target.value, 9);
                  setAmountText(d);
                  setAmount(Number(d) || 0);
                }}
                aria-invalid={!!amountErr}
              />
            </div>
            <input
              type="range"
              min={meta.minAmount}
              max={meta.maxAmount}
              step={meta.step}
              value={Math.min(Math.max(amount, meta.minAmount), meta.maxAmount)}
              onChange={(e) => setAmt(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
              <span>{lakh(meta.minAmount)}</span>
              <span className={amountErr ? 'text-danger' : ''}>{amountErr ?? lakh(amount)}</span>
              <span>{lakh(meta.maxAmount)}</span>
            </div>
          </div>
          <Segmented
            label="Tenure"
            value={tenure ? String(tenure) : ''}
            onChange={(s) => setTenure(Number(s))}
            options={meta.tenures.map((t) => ({ value: String(t), label: t % 12 === 0 ? `${t / 12} yr` : `${t} mo` }))}
          />
          <SelectField
            label="Purpose"
            value={purpose}
            onChange={setPurpose}
            options={meta.purposes}
            error={tried && !purpose ? 'Choose a purpose' : null}
          />
          {!amountErr && tenure > 0 && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-ink-soft">
              Indicative EMI at 18% p.a.: <b className="text-navy">{rupees(emi(amount, 18, tenure))}</b> / month. Final rate depends on credit review.
            </div>
          )}
          <BottomBar>
            <Button block size="lg" onClick={toDocuments} disabled={!!amountErr}>
              See what we’ll need
            </Button>
          </BottomBar>
        </div>
      )}

      {stage === 'documents' && product && me.app && (
        <Documents
          product={product}
          vehicleKind={me.app.vehicleKind}
          gstRegistered={!me.profile.gstNotRegistered}
          selfConstruction={me.app.purpose.startsWith('Self-construction')}
          onStart={() => nav('/b/inspect')}
        />
      )}
    </BorrowerPage>
  );
}

function emi(p: number, annualPct: number, months: number) {
  const r = annualPct / 1200;
  return (p * r * (1 + r) ** months) / ((1 + r) ** months - 1);
}

function Documents({
  product,
  vehicleKind,
  gstRegistered,
  selfConstruction,
  onStart,
}: {
  product: Product;
  vehicleKind?: VehicleKind;
  gstRegistered: boolean;
  selfConstruction: boolean;
  onStart: () => void;
}) {
  const docs = documentsFor(product, { vehicleKind, gstRegistered, selfConstruction });
  const signed = docs.filter((d) => d.source === 'signed');
  const live = docs.filter((d) => d.source === 'live');
  return (
    <div className="animate-fadeUp">
      <h1 className="mb-1 text-[24px] font-semibold">No uploads. No photocopies.</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Here’s everything for your {PRODUCTS[product].title.toLowerCase()} — and how each item reaches the lender.
      </p>

      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-teal" />
        <h3 className="font-sans text-sm font-semibold text-navy">We’ll pull these as signed records</h3>
      </div>
      <Card className="mb-5 divide-y divide-line">
        {signed.map((d) => (
          <DocRow key={d.name} name={d.name} via={d.via} when={d.when} kind="signed" />
        ))}
      </Card>

      <div className="mb-2 flex items-center gap-2">
        <Camera className="h-4 w-4 text-navy" />
        <h3 className="font-sans text-sm font-semibold text-navy">You’ll capture these live, in the app</h3>
      </div>
      <Card className="mb-5 divide-y divide-line">
        {live.map((d) => (
          <DocRow key={d.name} name={d.name} via={d.via} when={d.when} kind="live" />
        ))}
      </Card>

      <Callout tone="teal" icon={<Info className="h-4 w-4 text-teal" />} title="Why signed beats a photo">
        A record fetched straight from the issuer (DigiLocker, VAHAN, the land registry) carries a digital signature — it can’t be
        edited or staged. A photo of paper can. That’s why we pull records and only use the camera for things that must be seen.
      </Callout>

      <BottomBar>
        <Button block size="lg" onClick={onStart} icon={<Camera className="h-5 w-5" />}>
          Start inspection
        </Button>
      </BottomBar>
    </div>
  );
}

function DocRow({ name, via, when, kind }: { name: string; via: string; when?: string; kind: 'signed' | 'live' }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-navy">
          {name} {when && <span className="font-normal text-ink-faint">· {when}</span>}
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">{via}</div>
      </div>
      <SourceBadge kind={kind} />
    </div>
  );
}

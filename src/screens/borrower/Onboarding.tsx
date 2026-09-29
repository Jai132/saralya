import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BadgeCheck, Building2, Landmark, Loader2, ShieldCheck } from 'lucide-react';
import { BorrowerPage } from './BorrowerLayout';
import {
  BottomBar,
  Button,
  Callout,
  Checkbox,
  Chip,
  ProgressBar,
  Segmented,
  SelectField,
  TextField,
  Toggle,
} from '../../components/ui';
import { useMe } from '../../store/useMe';
import { Profile } from '../../store/profile';
import { check, digits, v } from '../../lib/validate';
import { lookupIfsc } from '../../data/ifsc';
import { stateForPin } from '../../data/pin';
import {
  ACCOUNT_TYPES,
  CONSTITUTIONS,
  GENDERS,
  INDUSTRIES,
  OCCUPATIONS,
  ONBOARDING_CONSENTS,
  RESIDENCE_TYPES,
  STATES,
  TURNOVER_BANDS,
} from '../../data/options';

type StepId = 'personal' | 'income' | 'business' | 'bank' | 'consents';

const STEP_TITLES: Record<StepId, string> = {
  personal: 'About you',
  income: 'Occupation and income',
  business: 'Your business',
  bank: 'Bank details',
  consents: 'Your consents',
};

type Errors = Partial<Record<string, string>>;

function validate(step: StepId, p: Profile): Errors {
  switch (step) {
    case 'personal':
      return check({
        fullName: v.required(p.fullName),
        dob: v.adultDob(p.dob),
        gender: v.required(p.gender),
        pan: v.pan(p.pan),
        aadhaar: p.aadhaarLast4.length === 4 ? null : 'Enter your 12-digit Aadhaar or verify via DigiLocker',
        email: v.email(p.email),
        address: v.required(p.address),
        pin: v.pin(p.pin),
        city: v.required(p.city),
        state: v.required(p.state),
        residenceType: v.required(p.residenceType),
        yearsAtAddress: v.nonNegative(p.yearsAtAddress),
      });
    case 'income':
      return check({
        occupation: v.required(p.occupation),
        monthlyIncome: v.positive(p.monthlyIncome),
        existingEmi: v.nonNegative(p.existingEmi),
        dependants: v.nonNegative(p.dependants),
      });
    case 'business':
      return check({
        businessName: v.required(p.businessName),
        constitution: v.required(p.constitution),
        udyam: v.udyam(p.udyam),
        gstin: p.gstNotRegistered ? null : v.gstin(p.gstin),
        industry: v.required(p.industry),
        businessAddress: p.businessAddressSame ? null : v.required(p.businessAddress),
        vintage: v.nonNegative(p.vintage),
        turnoverBand: v.required(p.turnoverBand),
      });
    case 'bank':
      return check({
        accountHolder: v.required(p.accountHolder),
        accountNumber: v.account(p.accountNumber),
        accountNumberConfirm: !p.accountNumberConfirm
          ? 'Required'
          : p.accountNumberConfirm !== p.accountNumber
            ? 'Account numbers do not match'
            : null,
        ifsc: v.ifsc(p.ifsc),
        bankName: v.required(p.bankName),
        accountType: v.required(p.accountType),
      });
    case 'consents':
      return check(
        Object.fromEntries(
          ONBOARDING_CONSENTS.filter((c) => c.required).map((c) => [c.id, p.consents[c.id] ? null : 'Required']),
        ) as Record<string, string | null>,
      );
  }
}

export default function Onboarding() {
  const nav = useNavigate();
  const me = useMe();
  const { profile: p, patch } = me;
  const [tried, setTried] = useState(false);

  const steps = useMemo<StepId[]>(
    // The business step counts until a non-business occupation is chosen, so the step total doesn't jump.
    () => ['personal', 'income', ...(p.occupation === 'business' || !p.occupation ? (['business'] as const) : []), 'bank', 'consents'],
    [p.occupation],
  );
  const idx = Math.min(me.step, steps.length - 1);
  const step = steps[idx];
  const errors = validate(step, p);
  const e = (k: string) => (tried ? errors[k] ?? null : null);

  if (!me.mobile) return <Navigate to="/b/login" replace />;

  const next = () => {
    if (Object.keys(errors).length) {
      setTried(true);
      // Scroll to the first error so it's visible on small screens.
      setTimeout(() => document.querySelector('[aria-invalid="true"], .text-danger')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
      return;
    }
    setTried(false);
    if (idx === steps.length - 1) {
      me.completeOnboarding();
      nav('/b/loan', { replace: true });
    } else {
      me.setStep(idx + 1);
      window.scrollTo(0, 0);
    }
  };

  const back = () => {
    setTried(false);
    if (idx === 0) nav('/');
    else me.setStep(idx - 1);
  };

  return (
    <BorrowerPage title="Create your profile" onBack={back}>
      <div className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
            Step {idx + 1} of {steps.length}
          </div>
          <div className="text-[11px] text-ink-faint">Saved automatically</div>
        </div>
        <ProgressBar value={(idx + 1) / steps.length} />
        <h1 className="mt-4 text-[24px] font-semibold">{STEP_TITLES[step]}</h1>
      </div>

      <div key={step} className="animate-fadeUp">
        {step === 'personal' && <Personal p={p} patch={patch} e={e} />}
        {step === 'income' && <Income p={p} patch={patch} e={e} />}
        {step === 'business' && <Business p={p} patch={patch} e={e} />}
        {step === 'bank' && <Bank p={p} patch={patch} e={e} />}
        {step === 'consents' && <Consents p={p} patch={patch} e={e} />}
      </div>

      <BottomBar>
        {tried && Object.keys(errors).length > 0 && (
          <p className="mb-2 text-center text-xs text-danger">Please fix the highlighted fields.</p>
        )}
        <Button block size="lg" onClick={next}>
          {idx === steps.length - 1 ? 'Finish and choose a loan' : 'Continue'}
        </Button>
      </BottomBar>
    </BorrowerPage>
  );
}

interface StepProps {
  p: Profile;
  patch: (x: Partial<Profile>) => void;
  e: (k: string) => string | null;
}

function Personal({ p, patch, e }: StepProps) {
  const [aadhaar, setAadhaar] = useState('');
  const [verifying, setVerifying] = useState(false);
  const aErr = aadhaar.length === 12 ? v.aadhaar(aadhaar) : null;

  const setA = (s: string) => {
    const d = digits(s, 12);
    setAadhaar(d);
    // Only the last 4 digits are ever stored.
    if (d.length === 12 && !v.aadhaar(d)) patch({ aadhaarLast4: d.slice(-4), aadhaarVerified: false });
  };

  const digilocker = () => {
    setVerifying(true);
    setTimeout(() => {
      const last4 = aadhaar.length === 12 && !v.aadhaar(aadhaar) ? aadhaar.slice(-4) : String(1000 + Math.floor(Math.random() * 9000));
      patch({ aadhaarLast4: last4, aadhaarVerified: true });
      setAadhaar('');
      setVerifying(false);
    }, 1600);
  };

  return (
    <>
      <TextField label="Full name as per PAN" autoComplete="name" value={p.fullName} onChange={(s) => patch({ fullName: s })} error={e('fullName')} />
      <TextField label="Date of birth" type="date" value={p.dob} onChange={(s) => patch({ dob: s })} error={e('dob')} max={new Date().toISOString().slice(0, 10)} />
      <Segmented label="Gender" value={p.gender} onChange={(s) => patch({ gender: s })} options={GENDERS} error={e('gender')} />
      <TextField
        label="PAN"
        placeholder="ABCDE1234F"
        upper
        maxLength={10}
        autoCapitalize="characters"
        value={p.pan}
        onChange={(s) => patch({ pan: s.replace(/[^A-Z0-9]/g, '') })}
        error={e('pan') ?? (p.pan.length === 10 ? v.pan(p.pan) : null)}
        className="field-input font-mono tracking-wider"
      />

      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-medium text-navy">Aadhaar</div>
        {p.aadhaarLast4 ? (
          <div className="flex items-center justify-between rounded-xl border border-teal/30 bg-teal-tint px-3.5 py-3">
            <div>
              <div className="font-mono text-[15px] tracking-wider text-navy">XXXX XXXX {p.aadhaarLast4}</div>
              <div className="mt-0.5 text-[11px] text-ink-soft">Only the last 4 digits are stored</div>
            </div>
            {p.aadhaarVerified ? (
              <Chip tone="teal" icon={<BadgeCheck className="h-3 w-3" />}>
                DigiLocker verified
              </Chip>
            ) : (
              <button className="text-xs font-semibold text-teal" onClick={() => patch({ aadhaarLast4: '', aadhaarVerified: false })}>
                Change
              </button>
            )}
          </div>
        ) : (
          <>
            <input
              className="field-input font-mono tracking-wider"
              inputMode="numeric"
              placeholder="12-digit Aadhaar"
              value={aadhaar.replace(/(\d{4})(?=\d)/g, '$1 ')}
              onChange={(ev) => setA(ev.target.value)}
              aria-invalid={!!(aErr || e('aadhaar'))}
            />
            {(aErr || e('aadhaar')) && <p className="mt-1 text-xs text-danger">{aErr || e('aadhaar')}</p>}
          </>
        )}
        {!p.aadhaarVerified && (
          <Button variant="secondary" size="sm" className="mt-2" onClick={digilocker} loading={verifying} icon={<ShieldCheck className="h-4 w-4" />}>
            {verifying ? 'Connecting to DigiLocker…' : 'Verify via DigiLocker (demo)'}
          </Button>
        )}
      </div>

      <TextField label="Email" type="email" autoComplete="email" value={p.email} onChange={(s) => patch({ email: s.trim() })} error={e('email')} />
      <TextField label="Current address" autoComplete="street-address" placeholder="House no., street, locality" value={p.address} onChange={(s) => patch({ address: s })} error={e('address')} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="PIN code"
          inputMode="numeric"
          value={p.pin}
          onChange={(s) => {
            const pin = digits(s, 6);
            const st = pin.length >= 2 ? stateForPin(pin) : null;
            patch({ pin, ...(st && !p.state ? { state: st } : {}) });
          }}
          error={e('pin')}
        />
        <TextField label="City / town" value={p.city} onChange={(s) => patch({ city: s })} error={e('city')} />
      </div>
      <SelectField label="State" value={p.state} onChange={(s) => patch({ state: s })} options={STATES} error={e('state')} />
      <Segmented label="Residence type" value={p.residenceType} onChange={(s) => patch({ residenceType: s })} options={RESIDENCE_TYPES} error={e('residenceType')} />
      <TextField label="Years at current address" inputMode="numeric" value={p.yearsAtAddress} onChange={(s) => patch({ yearsAtAddress: digits(s, 2) })} error={e('yearsAtAddress')} />
    </>
  );
}

function Income({ p, patch, e }: StepProps) {
  return (
    <>
      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-medium text-navy">Occupation type</div>
        <div className="space-y-2">
          {OCCUPATIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => patch({ occupation: o.value })}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition ${
                p.occupation === o.value ? 'border-teal bg-teal-tint text-teal' : 'border-line bg-white text-navy'
              }`}
            >
              <span className={`h-4 w-4 rounded-full border-2 ${p.occupation === o.value ? 'border-[5px] border-teal' : 'border-slate-300'}`} />
              {o.label}
            </button>
          ))}
        </div>
        {e('occupation') && <p className="mt-1 text-xs text-danger">{e('occupation')}</p>}
      </div>
      <TextField
        label={p.occupation === 'salaried' ? 'Monthly take-home salary' : 'Monthly income (approx.)'}
        prefix="₹"
        inputMode="numeric"
        value={p.monthlyIncome}
        onChange={(s) => patch({ monthlyIncome: digits(s, 9) })}
        error={e('monthlyIncome')}
      />
      <TextField label="Existing EMIs (total per month)" prefix="₹" inputMode="numeric" hint="Enter 0 if none" value={p.existingEmi} onChange={(s) => patch({ existingEmi: digits(s, 8) })} error={e('existingEmi')} />
      <TextField label="Number of dependants" inputMode="numeric" value={p.dependants} onChange={(s) => patch({ dependants: digits(s, 2) })} error={e('dependants')} />
    </>
  );
}

function Business({ p, patch, e }: StepProps) {
  // Auto-inserts dashes: UDYAM-XX-00-0000000. Typing may start with or without the "UDYAM" prefix.
  const fmtUdyam = (s: string) => {
    const clean = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if ('UDYAM'.startsWith(clean)) return clean;
    const raw = clean.replace(/^UDYAM/, '');
    const st = raw.slice(0, 2).replace(/[^A-Z]/g, '');
    const dd = raw.slice(st.length, st.length + 2).replace(/\D/g, '');
    const rest = raw.slice(st.length + dd.length).replace(/\D/g, '').slice(0, 7);
    return ['UDYAM', st, dd, rest].filter((x, i) => i === 0 || x).join('-');
  };
  return (
    <>
      <TextField label="Business name" value={p.businessName} onChange={(s) => patch({ businessName: s })} error={e('businessName')} />
      <SelectField label="Constitution" value={p.constitution} onChange={(s) => patch({ constitution: s })} options={CONSTITUTIONS} error={e('constitution')} />
      <TextField
        label="Udyam registration number"
        placeholder="UDYAM-MH-12-0012345"
        className="field-input font-mono tracking-wide"
        value={p.udyam}
        onChange={(s) => patch({ udyam: fmtUdyam(s) })}
        error={e('udyam')}
      />
      <Toggle
        label="Not registered under GST"
        checked={p.gstNotRegistered}
        onChange={(b) => patch({ gstNotRegistered: b, ...(b ? { gstin: '' } : {}) })}
      />
      {!p.gstNotRegistered && (
        <TextField
          label="GSTIN"
          placeholder="27ABCDE1234F1Z5"
          upper
          maxLength={15}
          className="field-input font-mono tracking-wider"
          value={p.gstin}
          onChange={(s) => patch({ gstin: s.replace(/[^A-Z0-9]/g, '') })}
          error={e('gstin') ?? (p.gstin.length === 15 ? v.gstin(p.gstin) : null)}
          hint={p.pan && p.gstin.length >= 12 && p.gstin.slice(2, 12) !== p.pan ? 'Note: characters 3–12 of a proprietor’s GSTIN usually match their PAN' : undefined}
        />
      )}
      <SelectField label="Nature of business" value={p.industry} onChange={(s) => patch({ industry: s })} options={INDUSTRIES} error={e('industry')} />
      <Toggle label="Business address same as residence" checked={p.businessAddressSame} onChange={(b) => patch({ businessAddressSame: b })} />
      {!p.businessAddressSame && (
        <TextField label="Business address" value={p.businessAddress} onChange={(s) => patch({ businessAddress: s })} error={e('businessAddress')} />
      )}
      <TextField label="Business vintage (years)" inputMode="numeric" value={p.vintage} onChange={(s) => patch({ vintage: digits(s, 2) })} error={e('vintage')} />
      <SelectField label="Annual turnover" value={p.turnoverBand} onChange={(s) => patch({ turnoverBand: s })} options={TURNOVER_BANDS} error={e('turnoverBand')} />
    </>
  );
}

function Bank({ p, patch, e }: StepProps) {
  const [dropping, setDropping] = useState(false);
  const holder = p.accountHolder || p.fullName;
  const canDrop = !v.account(p.accountNumber) && p.accountNumber === p.accountNumberConfirm && !v.ifsc(p.ifsc) && !!holder;

  const onIfsc = (s: string) => {
    const ifsc = s.replace(/[^A-Z0-9]/g, '').slice(0, 11);
    const hit = ifsc.length === 11 ? lookupIfsc(ifsc) : null;
    patch({ ifsc, pennyDropVerified: false, ...(hit ? { bankName: hit.bank, branch: hit.branch } : ifsc.length < 11 ? { bankName: '', branch: '' } : {}) });
  };

  const pennyDrop = () => {
    setDropping(true);
    setTimeout(() => {
      setDropping(false);
      patch({ pennyDropVerified: true, accountHolder: holder });
    }, 1800);
  };

  const ifscKnown = p.ifsc.length === 11 && !!lookupIfsc(p.ifsc);

  return (
    <>
      <TextField label="Account holder name" value={holder} onChange={(s) => patch({ accountHolder: s, pennyDropVerified: false })} error={e('accountHolder')} />
      <TextField
        label="Account number"
        inputMode="numeric"
        className="field-input font-mono tracking-wider"
        value={p.accountNumber}
        onChange={(s) => patch({ accountNumber: digits(s, 18), pennyDropVerified: false })}
        error={e('accountNumber')}
      />
      <TextField
        label="Confirm account number"
        inputMode="numeric"
        className="field-input font-mono tracking-wider"
        value={p.accountNumberConfirm}
        onChange={(s) => patch({ accountNumberConfirm: digits(s, 18), pennyDropVerified: false })}
        onPaste={(ev) => ev.preventDefault()}
        error={e('accountNumberConfirm') ?? (p.accountNumberConfirm.length >= p.accountNumber.length && p.accountNumberConfirm && p.accountNumberConfirm !== p.accountNumber ? 'Account numbers do not match' : null)}
      />
      <TextField
        label="IFSC"
        placeholder="HDFC0001234"
        upper
        maxLength={11}
        className="field-input font-mono tracking-wider"
        value={p.ifsc}
        onChange={onIfsc}
        error={e('ifsc') ?? (p.ifsc.length === 11 ? v.ifsc(p.ifsc) : null)}
        hint="Try SBIN, HDFC, ICIC, UTIB, PUNB, BARB, CNRB, KKBK… (demo lookup)"
      />
      {p.ifsc.length === 11 && !v.ifsc(p.ifsc) && (
        ifscKnown ? (
          <div className="-mt-2 mb-4 flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
            <Landmark className="h-5 w-5 shrink-0 text-teal" />
            <div>
              <div className="font-semibold text-navy">{p.bankName}</div>
              <div className="text-xs text-ink-soft">{p.branch} branch</div>
            </div>
          </div>
        ) : (
          <TextField label="Bank name" hint="Not in the demo lookup — enter it manually" value={p.bankName} onChange={(s) => patch({ bankName: s })} error={e('bankName')} />
        )
      )}
      <Segmented label="Account type" value={p.accountType} onChange={(s) => patch({ accountType: s })} options={ACCOUNT_TYPES} error={e('accountType')} />

      {p.pennyDropVerified ? (
        <div className="flex items-center gap-3 rounded-xl border border-teal/30 bg-teal-tint px-3.5 py-3">
          <BadgeCheck className="h-5 w-5 text-teal" />
          <div className="text-sm">
            <div className="font-semibold text-teal">Name match: 96% ✓</div>
            <div className="text-xs text-ink-soft">₹1 credited and reversed · name at bank: {holder.toUpperCase()}</div>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          block
          disabled={!canDrop}
          loading={dropping}
          onClick={pennyDrop}
          icon={dropping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
        >
          {dropping ? 'Sending ₹1…' : 'Verify with ₹1 penny drop (demo)'}
        </Button>
      )}
    </>
  );
}

function Consents({ p, patch, e }: StepProps) {
  const set = (id: string, b: boolean) => patch({ consents: { ...p.consents, [id]: b } });
  return (
    <>
      <p className="mb-4 text-sm text-ink-soft">
        Each consent covers one purpose only. Nothing is pre-ticked — read each line and choose. You can withdraw any consent later.
      </p>
      <div className="space-y-2.5">
        {ONBOARDING_CONSENTS.map((c) => (
          <div key={c.id}>
            <Checkbox
              checked={!!p.consents[c.id]}
              onChange={(b) => set(c.id, b)}
              label={
                <>
                  {c.label} {!c.required && <span className="font-normal text-ink-faint">(optional)</span>}
                </>
              }
              sub={c.sub}
            />
            {e(c.id) && <p className="ml-1 mt-1 text-xs text-danger">Needed to continue</p>}
          </div>
        ))}
      </div>
      {!p.consents.aa && (
        <div className="mt-4">
          <Callout tone="ember">Without Account Aggregator consent, your officer may ask for bank statements separately, which is slower.</Callout>
        </div>
      )}
    </>
  );
}

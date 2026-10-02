import { ReactNode, useMemo, useState } from 'react';
import { BadgeCheck, FileText, Info, QrCode, RotateCcw, ScanLine } from 'lucide-react';
import { BottomBar, Button, Card, Chip, SimChip } from '../../../components/ui';
import { QrScanner } from '../../../components/msme/QrScanner';
import { taxInvoice, upiStandee } from '../../../components/msme/qrProps';
import { buildUpiLink, parsePaymentQr, payeeNameMatches } from '../../../lib/upi';
import { buildDemoEInvoice, parseEInvoice } from '../../../lib/einvoice';
import { dateIN, rupees, shortHash } from '../../../lib/format';
import { DEMO_INVOICE, DEMO_INVOICE_RESULT, DEMO_UPI, demoVpa, MCC_NAMES, SUPPLIERS } from '../../../data/msme';
import type { Profile } from '../../../store/profile';
import type { CaptureMeta } from '../../../store/captures';
import type { MsmeFlowState, QrScan } from './state';

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 last:border-0">
      <span className="text-xs text-ink-faint">{k}</span>
      <span className="min-w-0 text-right text-sm font-medium text-navy">{children}</span>
    </div>
  );
}

function Raw({ text }: { text: string }) {
  return (
    <div className="mt-2 rounded-lg bg-slate-100 px-2.5 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">What the QR contains</div>
      <div className="break-all font-mono text-[11px] text-ink-soft">{text.length > 140 ? `${text.slice(0, 140)}…` : text}</div>
    </div>
  );
}

const ok = (t: ReactNode) => (
  <div className="flex items-start gap-1.5 text-sm text-teal">
    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{t}</span>
  </div>
);

function Decoded({ scan }: { scan: QrScan }) {
  return (
    <Chip tone="teal" icon={<ScanLine className="h-3 w-3" />} title={`Sealed frame ${scan.captureId}`}>
      Decoded on device
    </Chip>
  );
}

function UpiResult({ scan, profile }: { scan: QrScan; profile: Profile }) {
  const p = parsePaymentQr(scan.text);
  if (!p)
    return (
      <div>
        <div className="flex items-start gap-1.5 text-sm text-ember">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> That QR isn’t a UPI payment code. Scan the one customers pay to.
        </div>
        <Raw text={scan.text} />
      </div>
    );
  const match = payeeNameMatches(p.name, [profile.accountHolder, profile.businessName, profile.fullName]);
  return (
    <div>
      <Row k="Payee name">{p.name || '—'}</Row>
      <Row k="UPI ID">
        <span className="font-mono text-[13px]">{p.vpa}</span>
      </Row>
      <Row k="QR type">{p.format === 'bharatqr' ? 'BharatQR (merchant)' : 'UPI link'}</Row>
      {p.mcc && (
        <Row k="Merchant category">
          {p.mcc} · {MCC_NAMES[p.mcc] ?? 'Other'}
        </Row>
      )}
      <div className="mt-2.5 flex items-start gap-2">
        <div className="flex-1">
          {match ? (
            ok('Payee matches your bank account name')
          ) : (
            <div className="flex items-start gap-1.5 text-sm text-ink-soft">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              The payee name differs from your bank account name. That’s fine — your officer may ask which account this QR settles to.
            </div>
          )}
        </div>
        <SimChip />
      </div>
    </div>
  );
}

function GstResult({ scan, gstin }: { scan: QrScan; gstin: string }) {
  const inv = parseEInvoice(scan.text);
  if (!inv)
    return (
      <div>
        <div className="rounded-xl border border-dashed border-ember/50 bg-ember-tint/60 p-3">
          <div className="mb-1 flex items-center gap-2">
            <Chip tone="ember">Demo result</Chip>
            <span className="text-[11px] text-ember">This code isn’t a signed e-invoice</span>
          </div>
          <p className="mb-2 text-xs text-ink-soft">Here’s what a verified one returns:</p>
          {ok(
            <>
              IRP signature verified · Supplier: {DEMO_INVOICE_RESULT.supplier} · {rupees(DEMO_INVOICE_RESULT.value)} · {dateIN(DEMO_INVOICE_RESULT.date)}
            </>,
          )}
        </div>
        <Raw text={scan.text} />
      </div>
    );
  const supplier = SUPPLIERS[inv.sellerGstin];
  return (
    <div>
      <Row k="Supplier">{supplier ?? 'Not in the demo directory'}</Row>
      <Row k="Supplier GSTIN">
        <span className="font-mono text-[13px]">{inv.sellerGstin}</span>
      </Row>
      <Row k="Invoice">
        {inv.docNo} · {inv.docDate ? dateIN(inv.docDate) : '—'}
      </Row>
      <Row k="Invoice value">{rupees(inv.value)}</Row>
      <Row k="IRN">
        <span className="font-mono text-[12px]">{shortHash(inv.irn, 6)}</span>
      </Row>
      <div className="mt-2.5 flex items-start gap-2">
        <div className="flex-1 space-y-1">
          {ok('IRP signature verified')}
          {gstin && inv.buyerGstin === gstin.toUpperCase() ? (
            ok('Billed to your GSTIN')
          ) : (
            <div className="flex items-start gap-1.5 text-sm text-ink-soft">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber" /> Billed to a different GSTIN ({inv.buyerGstin || 'none'})
            </div>
          )}
        </div>
        <SimChip />
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">The QR’s contents are read for real; checking the portal’s signature is simulated in the prototype.</p>
    </div>
  );
}

function ScanCard({
  icon,
  title,
  body,
  scan,
  onScan,
  children,
  extra,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  scan?: QrScan;
  onScan: () => void;
  children?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-lg bg-teal-tint p-1.5 text-teal">{icon}</span>
        <div className="flex-1 font-semibold text-navy">{title}</div>
        {scan && <Decoded scan={scan} />}
      </div>
      {scan ? (
        <>
          {children}
          <button onClick={onScan} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal">
            <RotateCcw className="h-3.5 w-3.5" /> Scan again
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">{body}</p>
          <Button block variant="secondary" onClick={onScan} icon={<QrCode className="h-4 w-4" />}>
            Scan {title.toLowerCase().includes('upi') ? 'UPI QR' : 'invoice QR'}
          </Button>
          {extra}
        </>
      )}
    </Card>
  );
}

export function QrStage({
  appId,
  profile,
  state,
  onScanned,
  onSkipGst,
  onNext,
}: {
  appId: string;
  profile: Profile;
  state: MsmeFlowState;
  onScanned: (which: 'upi' | 'gst', scan: QrScan) => void;
  onSkipGst: () => void;
  onNext: () => void;
}) {
  const [open, setOpen] = useState<'upi' | 'gst' | null>(null);
  const name = profile.businessName || 'Shree Ganesh Kirana';
  const props = useMemo(
    () => ({
      upi: () => {
        const vpa = demoVpa(name);
        return upiStandee(buildUpiLink({ vpa, name, mcc: DEMO_UPI.mcc }), name, vpa);
      },
      gst: () => {
        const buyer = profile.gstin || '08ABCPG1234K1Z5';
        return taxInvoice(buildDemoEInvoice({ ...DEMO_INVOICE, buyerGstin: buyer }), {
          supplier: SUPPLIERS[DEMO_INVOICE.sellerGstin],
          gstin: DEMO_INVOICE.sellerGstin,
          docNo: DEMO_INVOICE.docNo,
          date: dateIN(DEMO_INVOICE.docDate),
          value: DEMO_INVOICE.value,
          buyer: name,
        });
      },
    }),
    [name, profile.gstin],
  );
  const upiOk = !!state.upi && !!parsePaymentQr(state.upi.text);
  const gstDone = !!state.gst || !!state.gstSkipped;

  const decoded = (which: 'upi' | 'gst') => (text: string, c: CaptureMeta) => {
    onScanned(which, { text, captureId: c.id, at: c.ts });
    setOpen(null);
  };

  return (
    <div className="animate-fadeUp space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Step 2 of 4 · QR codes</div>
        <h1 className="text-[22px] font-semibold leading-tight">Scan two QR codes</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Your payment QR shows where sales settle. A supplier’s e-invoice QR is a purchase the tax portal has signed — far stronger than a
          photo of a bill.
        </p>
      </div>

      <ScanCard
        icon={<QrCode className="h-4 w-4" />}
        title="Shop’s UPI QR"
        body="The QR customers pay to — usually on the counter or the wall behind it."
        scan={state.upi}
        onScan={() => setOpen('upi')}
      >
        {state.upi && <UpiResult scan={state.upi} profile={profile} />}
      </ScanCard>

      <ScanCard
        icon={<FileText className="h-4 w-4" />}
        title="Supplier e-invoice QR"
        body="Scan the QR printed on a recent purchase invoice from your distributor."
        scan={state.gst}
        onScan={() => setOpen('gst')}
        extra={
          state.gstSkipped ? (
            <p className="mt-2 text-center text-xs text-ink-faint">Skipped — you can show invoices to your officer instead.</p>
          ) : (
            <button onClick={onSkipGst} className="mt-2 w-full text-center text-xs font-semibold text-ink-soft">
              I don’t have one with me
            </button>
          )
        }
      >
        {state.gst && <GstResult scan={state.gst} gstin={profile.gstin} />}
      </ScanCard>

      <BottomBar>
        <Button block size="lg" disabled={!upiOk || !gstDone} onClick={onNext}>
          Continue to meter photo
        </Button>
      </BottomBar>

      {open && (
        <QrScanner
          appId={appId}
          stepId={open === 'upi' ? 'qr-upi' : 'qr-gst'}
          title={open === 'upi' ? 'UPI QR' : 'Supplier e-invoice QR'}
          hint={open === 'upi' ? 'Hold the shop’s payment QR inside the square' : 'Hold the QR on the invoice inside the square'}
          demoProp={props[open]}
          onDecoded={decoded(open)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

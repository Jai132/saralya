import { useMemo, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BorrowerPage } from '../BorrowerLayout';
import { CaptureShell, CaptureSummary } from '../../../components/capture/CaptureShell';
import { walkthroughOverlay } from '../../../components/msme/StockOverlay';
import { MSME_METER_SCRIPT, MSME_SCRIPT } from '../../../data/scripts';
import { DEFAULT_BOARD, SNAPSHOT2_WINDOW } from '../../../data/msme';
import { useMe } from '../../../store/useMe';
import { useApplications } from '../../../store/application';
import { initialMsmeState, MsmeFlowState, MsmeStage } from './state';
import { QrStage } from './QrStage';
import { DoneStage, IntroStage, MeterResultStage, meterOverlay } from './stages';

const BACK: Partial<Record<MsmeStage, MsmeStage>> = { qr: 'walkthrough', 'meter-result': 'meter', done: 'meter-result' };
const DAY = 86_400_000;

/** Shop walkthrough: intro → guided capture → UPI + e-invoice QRs → meter → "Snapshot 1 of 2 sealed". */
export default function MsmeFlow() {
  const nav = useNavigate();
  const me = useMe();
  const setFlow = useApplications((s) => s.setFlow);
  const patchApp = useApplications((s) => s.patch);
  const app = me.app;
  const m: MsmeFlowState = { ...initialMsmeState, ...((app?.flow.msme as MsmeFlowState | undefined) ?? {}) };
  const mRef = useRef(m);
  mRef.current = m;
  const caught = useRef<Record<string, string>>({});

  const board = me.profile.businessName ? me.profile.businessName.toUpperCase() : DEFAULT_BOARD;
  const overlay = useMemo(() => walkthroughOverlay({ text: board, matchesUdyam: !!me.profile.udyam }), [board, me.profile.udyam]);

  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!app || app.product !== 'msme') return <Navigate to="/b/loan" replace />;

  const save = (patch: Partial<MsmeFlowState>) => setFlow(me.mobile!, 'msme', { ...mRef.current, ...patch });
  const go = (stage: MsmeStage) => {
    save({ stage });
    window.scrollTo(0, 0);
  };
  const onCaptured = (c: { id: string }, step: { id: string }) => {
    caught.current[step.id] = c.id;
  };
  const sessionDone = (key: 'walkthrough' | 'meter', next: MsmeStage) => (s: CaptureSummary) => {
    const patch: Partial<MsmeFlowState> = { stage: next, caps: { ...mRef.current.caps, ...caught.current }, sessions: { ...mRef.current.sessions, [key]: s } };
    if (key === 'meter') {
      const now = Date.now();
      patch.snapshot1At = now;
      patch.snapshot2Due = { from: now + SNAPSHOT2_WINDOW.from * DAY, to: now + SNAPSHOT2_WINDOW.to * DAY };
    }
    caught.current = {};
    save(patch);
  };

  if (m.stage === 'walkthrough')
    return (
      <CaptureShell
        key="walk"
        script={MSME_SCRIPT}
        appId={app.id}
        overlay={overlay}
        onCaptured={onCaptured}
        onDone={sessionDone('walkthrough', 'qr')}
        onExit={() => go('intro')}
      />
    );
  if (m.stage === 'meter')
    return (
      <CaptureShell
        key="meter"
        script={MSME_METER_SCRIPT}
        appId={app.id}
        overlay={meterOverlay}
        onCaptured={onCaptured}
        onDone={sessionDone('meter', 'meter-result')}
        onExit={() => go('qr')}
      />
    );

  const back = BACK[m.stage];
  return (
    <BorrowerPage title="Shop inspection" onBack={back ? () => go(back) : () => nav('/b/loan')}>
      {m.stage === 'intro' && <IntroStage onStart={() => go('walkthrough')} />}
      {m.stage === 'qr' && (
        <QrStage
          appId={app.id}
          profile={me.profile}
          state={m}
          onScanned={(which, scan) => save(which === 'upi' ? { upi: scan } : { gst: scan, gstSkipped: false })}
          onSkipGst={() => save({ gstSkipped: true })}
          onNext={() => go('meter')}
        />
      )}
      {m.stage === 'meter-result' && <MeterResultStage captureId={m.caps.meter} onNext={() => go('done')} />}
      {m.stage === 'done' && (
        <DoneStage
          appId={app.id}
          state={m}
          onSubmit={() => {
            patchApp(me.mobile!, { status: 'submitted', inspectedAt: Date.now() });
            nav('/b/home', { replace: true });
          }}
        />
      )}
    </BorrowerPage>
  );
}

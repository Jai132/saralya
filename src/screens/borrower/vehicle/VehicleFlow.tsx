import { useMemo, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Hand, ShieldCheck, Timer } from 'lucide-react';
import { BorrowerPage } from '../BorrowerLayout';
import { BottomBar, Button, Callout } from '../../../components/ui';
import { CaptureShell, CaptureSummary } from '../../../components/capture/CaptureShell';
import { actuationScript, vehicleCloseupScript, vehicleScript } from '../../../data/scripts';
import { pickActuations, silhouetteFor } from '../../../data/vehicles';
import { useMe } from '../../../store/useMe';
import { useApplications } from '../../../store/application';
import { initialVehicleState, VehicleFlowState, VehicleStage } from './state';
import { RcStage } from './RcStage';
import { IdentityStage } from './IdentityStage';
import { CalibrateStage } from './CalibrateStage';
import { ConditionStage } from './ConditionStage';
import { closeupOverlay, walkaroundOverlay } from './overlays';

const BACK: Partial<Record<VehicleStage, VehicleStage>> = {
  identity: 'closeups',
  calibrate: 'identity',
  'actuation-intro': 'calibrate',
  condition: 'actuation-intro',
};

/** Identity-first vehicle inspection: RC → 8 angles → identity close-ups → calibration → actuation → condition. */
export default function VehicleFlow() {
  const nav = useNavigate();
  const me = useMe();
  const setFlow = useApplications((s) => s.setFlow);
  const patchApp = useApplications((s) => s.patch);
  const app = me.app;
  const v: VehicleFlowState = { ...initialVehicleState, ...((app?.flow.vehicle as VehicleFlowState | undefined) ?? {}) };
  const vRef = useRef(v);
  vRef.current = v;
  const caught = useRef<Record<string, string>>({});

  const kind = app?.vehicleKind ?? 'car';
  const sub = app?.vehicleSub ?? (kind === 'car' ? 'hatchback' : 'truck');
  const scripts = useMemo(
    () => ({
      walk: vehicleScript(kind, sub),
      close: vehicleCloseupScript(kind, sub),
      act: actuationScript(kind, sub, v.actions ?? pickActuations()),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, sub, v.actions?.join()],
  );
  const overlayWalk = useMemo(() => walkaroundOverlay(silhouetteFor(kind, sub)), [kind, sub]);

  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!app || app.product !== 'vehicle') return <Navigate to="/b/loan" replace />;

  const save = (patch: Partial<VehicleFlowState>) => setFlow(me.mobile!, 'vehicle', { ...vRef.current, ...patch });
  const go = (stage: VehicleStage) => {
    save({ stage });
    window.scrollTo(0, 0);
  };

  const sessionDone = (key: 'walkaround' | 'closeups' | 'actuation', next: VehicleStage, capsKey?: 'angleCaps' | 'closeCaps') => (s: CaptureSummary) => {
    const patch: Partial<VehicleFlowState> = { stage: next, sessions: { ...vRef.current.sessions, [key]: s } };
    if (capsKey) patch[capsKey] = { ...vRef.current[capsKey], ...caught.current };
    caught.current = {};
    save(patch);
  };

  const onCaptured = (c: { id: string }, step: { id: string }) => {
    caught.current[step.id] = c.id;
  };

  // Full-screen capture stages.
  if (v.stage === 'walkaround')
    return (
      <CaptureShell
        key="walk"
        script={scripts.walk}
        appId={app.id}
        overlay={overlayWalk}
        onCaptured={onCaptured}
        onDone={sessionDone('walkaround', 'closeups', 'angleCaps')}
        onExit={() => go('rc')}
      />
    );
  if (v.stage === 'closeups')
    return (
      <CaptureShell
        key="close"
        script={scripts.close}
        appId={app.id}
        overlay={closeupOverlay}
        onCaptured={onCaptured}
        onDone={sessionDone('closeups', 'identity', 'closeCaps')}
        onExit={() => go('walkaround')}
      />
    );
  if (v.stage === 'actuation')
    return <CaptureShell key="act" script={scripts.act} appId={app.id} onDone={sessionDone('actuation', 'condition')} onExit={() => go('actuation-intro')} />;

  const back = BACK[v.stage];
  return (
    <BorrowerPage title="Vehicle inspection" onBack={back ? () => go(back) : () => nav('/b/loan')}>
      {v.stage === 'rc' && (
        <RcStage
          kind={kind}
          sub={sub}
          ownerName={me.profile.fullName}
          rc={v.rc}
          onFetched={(rc) => save({ rc })}
          onNext={() => go('walkaround')}
        />
      )}
      {v.stage === 'identity' && v.rc && <IdentityStage rc={v.rc} caps={v.closeCaps} onNext={() => go('calibrate')} />}
      {v.stage === 'calibrate' && (
        <CalibrateStage
          appId={app.id}
          kind={kind}
          angleCaps={v.angleCaps}
          closeCaps={v.closeCaps}
          calibrations={v.calibrations}
          onSaved={(id, c) => save({ calibrations: { ...vRef.current.calibrations, [id]: c } })}
          onNext={() => save({ stage: 'actuation-intro', actions: pickActuations() })}
        />
      )}
      {v.stage === 'actuation-intro' && (
        <div className="animate-fadeUp">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-teal-light">
            <Hand className="h-7 w-7" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Proof of possession</div>
          <h1 className="mb-2 text-[22px] font-semibold leading-tight">Five quick actions</h1>
          <p className="mb-4 text-sm text-ink-soft">
            We’ll ask for five actions in a random order — hazards on, steering full left, bonnet open… Each has a 15-second window. Keep
            the vehicle in view and tap Done when it’s done.
          </p>
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-card">
              <Timer className="h-4 w-4 text-ember" /> 15 s per action
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-card">
              <ShieldCheck className="h-4 w-4 text-teal" /> Each one sealed
            </div>
          </div>
          <Callout tone="ember" title="A recording can’t pass an unseen sequence">
            The order is chosen only when you start, so a pre-recorded video can’t match it.
          </Callout>
          <BottomBar>
            <Button block size="lg" onClick={() => go('actuation')}>
              I’m at the vehicle — start
            </Button>
          </BottomBar>
        </div>
      )}
      {v.stage === 'condition' && (
        <ConditionStage
          kind={kind}
          calibrations={v.calibrations}
          onSubmit={() => {
            patchApp(me.mobile!, { status: 'submitted', inspectedAt: Date.now() });
            nav('/b/home', { replace: true });
          }}
        />
      )}
    </BorrowerPage>
  );
}

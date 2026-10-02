import { useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BorrowerPage } from '../BorrowerLayout';
import { CaptureShell, CaptureSummary } from '../../../components/capture/CaptureShell';
import { propertyOverlay } from '../../../components/property/FloorPlanSketch';
import { LAP_PLAN_SCRIPT, LAP_SCRIPT } from '../../../data/scripts';
import { useMe } from '../../../store/useMe';
import { useApplications } from '../../../store/application';
import { initialPropertyState, PropertyFlowState, PropertyStage } from './state';
import { LocationStage, PlanIntroStage, planGuide, PlanStage, RecordsStage, SummaryStage, TypeStage } from './stages';

const BACK: Partial<Record<PropertyStage, PropertyStage>> = {
  location: 'type',
  records: 'location',
  'plan-intro': 'walkaround',
  plan: 'plan-intro',
  summary: 'plan-intro',
};

/** Property inspection: type → location proof → records → walkaround → sanctioned plan → review. */
export default function PropertyFlow() {
  const nav = useNavigate();
  const me = useMe();
  const setFlow = useApplications((s) => s.setFlow);
  const patchApp = useApplications((s) => s.patch);
  const app = me.app;
  const p: PropertyFlowState = { ...initialPropertyState, ...((app?.flow.property as PropertyFlowState | undefined) ?? {}) };
  const pRef = useRef(p);
  pRef.current = p;
  const caught = useRef<Record<string, string>>({});

  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!app || app.product !== 'lap') return <Navigate to="/b/loan" replace />;

  const save = (patch: Partial<PropertyFlowState>) => setFlow(me.mobile!, 'property', { ...pRef.current, ...patch });
  const go = (stage: PropertyStage) => {
    save({ stage });
    window.scrollTo(0, 0);
  };
  const onCaptured = (c: { id: string }, step: { id: string }) => {
    caught.current[step.id] = c.id;
  };
  const sessionDone = (key: 'walkaround' | 'plan', next: PropertyStage) => (s: CaptureSummary) => {
    save({ stage: next, caps: { ...pRef.current.caps, ...caught.current }, sessions: { ...pRef.current.sessions, [key]: s } });
    caught.current = {};
  };

  if (p.stage === 'walkaround')
    return (
      <CaptureShell
        key="walk"
        script={LAP_SCRIPT}
        appId={app.id}
        overlay={propertyOverlay}
        onCaptured={onCaptured}
        onDone={sessionDone('walkaround', 'plan-intro')}
        onExit={() => go('records')}
      />
    );
  if (p.stage === 'plan-capture')
    return (
      <CaptureShell
        key="plan"
        script={LAP_PLAN_SCRIPT}
        appId={app.id}
        overlay={planGuide}
        onCaptured={onCaptured}
        onDone={sessionDone('plan', 'plan')}
        onExit={() => go('plan-intro')}
      />
    );

  const back = BACK[p.stage];
  return (
    <BorrowerPage title="Property inspection" onBack={back ? () => go(back) : () => nav('/b/loan')}>
      {p.stage === 'type' && <TypeStage type={p.type} product={p.product} onChange={(c) => save(c)} onNext={() => go('location')} />}
      {p.stage === 'location' && <LocationStage saved={p.location} onVerified={(location) => save({ location })} onNext={() => go('records')} />}
      {p.stage === 'records' && <RecordsStage pulled={!!p.recordsPulled} onPulled={() => save({ recordsPulled: true })} onNext={() => go('walkaround')} />}
      {p.stage === 'plan-intro' && <PlanIntroStage onStart={() => go('plan-capture')} onSkip={() => go('summary')} />}
      {p.stage === 'plan' && <PlanStage captureId={p.caps.plan} onNext={() => go('summary')} />}
      {p.stage === 'summary' && (
        <SummaryStage
          state={p}
          appId={app.id}
          onSubmit={() => {
            patchApp(me.mobile!, { status: 'submitted', inspectedAt: Date.now() });
            nav('/b/home', { replace: true });
          }}
        />
      )}
    </BorrowerPage>
  );
}

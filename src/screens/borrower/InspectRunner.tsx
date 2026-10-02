import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CaptureShell, CaptureSummary } from '../../components/capture/CaptureShell';
import { LAP_SCRIPT, vehicleScript } from '../../data/scripts';
import { useMe } from '../../store/useMe';
import { useApplications } from '../../store/application';

/** Runs the product's capture script for products without a dedicated flow screen yet (property, until M7). */
export default function InspectRunner() {
  const nav = useNavigate();
  const me = useMe();
  const setFlow = useApplications((s) => s.setFlow);
  const patch = useApplications((s) => s.patch);
  const app = me.app;

  const script = useMemo(() => {
    if (!app) return null;
    if (app.product === 'lap') return LAP_SCRIPT;
    return vehicleScript(app.vehicleKind ?? 'car');
  }, [app]);

  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!app || !script) return <Navigate to="/b/loan" replace />;

  const done = (s: CaptureSummary) => {
    setFlow(me.mobile!, 'session', s);
    patch(me.mobile!, { status: 'submitted', inspectedAt: Date.now() });
    nav('/b/home', { replace: true });
  };

  return <CaptureShell script={script} appId={app.id} onDone={done} onExit={() => nav('/b/home')} />;
}

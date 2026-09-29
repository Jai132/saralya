import { Navigate } from 'react-router-dom';
import { useMe } from '../../store/useMe';

/** Routes a borrower to wherever they left off. */
export default function BorrowerIndex() {
  const me = useMe();
  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!me.onboarded) return <Navigate to="/b/onboarding" replace />;
  if (!me.app) return <Navigate to="/b/loan" replace />;
  return <Navigate to="/b/home" replace />;
}

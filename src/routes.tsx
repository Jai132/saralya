import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './screens/Landing';
import CameraCheck from './screens/CameraCheck';
import Placeholder from './screens/Placeholder';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/camera-check" element={<CameraCheck />} />
      <Route path="/b/*" element={<Placeholder title="Borrower app" />} />
      <Route path="/lender/*" element={<Placeholder title="Lender console" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

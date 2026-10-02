import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './screens/Landing';
import CameraCheck from './screens/CameraCheck';
import Placeholder from './screens/Placeholder';
import BorrowerIndex from './screens/borrower/BorrowerIndex';
import Login from './screens/borrower/Login';
import Onboarding from './screens/borrower/Onboarding';
import LoanSelect from './screens/borrower/LoanSelect';
import InspectConsent from './screens/borrower/InspectConsent';
import Home from './screens/borrower/Home';
import VehicleFlow from './screens/borrower/vehicle/VehicleFlow';
import MsmeFlow from './screens/borrower/msme/MsmeFlow';
import PropertyFlow from './screens/borrower/property/PropertyFlow';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/camera-check" element={<CameraCheck />} />
      <Route path="/b" element={<BorrowerIndex />} />
      <Route path="/b/login" element={<Login />} />
      <Route path="/b/onboarding" element={<Onboarding />} />
      <Route path="/b/loan" element={<LoanSelect />} />
      <Route path="/b/inspect" element={<InspectConsent />} />
      <Route path="/b/inspect/vehicle" element={<VehicleFlow />} />
      <Route path="/b/inspect/msme" element={<MsmeFlow />} />
      <Route path="/b/inspect/lap" element={<PropertyFlow />} />
      <Route path="/b/inspect/:product" element={<Navigate to="/b/loan" replace />} />
      <Route path="/b/home" element={<Home />} />
      <Route path="/lender/*" element={<Placeholder title="Lender console" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { HashRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ScrollToTop } from './components/ScrollToTop';

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <AppRoutes />
      <SettingsDrawer />
    </HashRouter>
  );
}

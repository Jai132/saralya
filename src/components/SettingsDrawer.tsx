import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Box, MonitorPlay, Sparkles, Trash2, Check, Video } from 'lucide-react';
import { Sheet, Button } from './ui';
import { EngineChoice, useSettings } from '../store/settings';
import { resetDemoData } from '../lib/storage';
import { detectCapabilities, Capabilities } from '../lib/capabilities';

const engines: { id: EngineChoice; label: string; sub: string; icon: JSX.Element }[] = [
  { id: 'auto', label: 'Auto', sub: 'Best available on this device', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'ar', label: 'AR', sub: 'WebXR surfaces + depth point cloud (ARCore)', icon: <Box className="h-4 w-4" /> },
  { id: 'camera', label: 'Camera', sub: 'Live camera + feature points', icon: <Camera className="h-4 w-4" /> },
  { id: 'demo', label: 'Demo', sub: 'Synthetic 3D scene — no camera needed', icon: <MonitorPlay className="h-4 w-4" /> },
];

export function SettingsDrawer() {
  const { showSettings, openSettings, engine, setEngine } = useSettings();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (showSettings) detectCapabilities().then(setCaps);
    else {
      setConfirming(false);
      setCleared(false);
    }
  }, [showSettings]);

  const doReset = async () => {
    await resetDemoData();
    setCleared(true);
    setTimeout(() => {
      openSettings(false);
      nav('/');
      window.location.reload();
    }, 700);
  };

  return (
    <Sheet open={showSettings} onClose={() => openSettings(false)} title="Settings">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Capture engine</div>
      <div className="space-y-2">
        {engines.map((e) => {
          const unavailable = caps && ((e.id === 'ar' && !caps.webxrAR) || (e.id === 'camera' && !caps.camera));
          return (
            <button
              key={e.id}
              onClick={() => setEngine(e.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                engine === e.id ? 'border-teal bg-teal-tint' : 'border-line hover:border-teal/40'
              }`}
            >
              <span className={`rounded-lg p-2 ${engine === e.id ? 'bg-teal text-white' : 'bg-slate-100 text-ink-soft'}`}>{e.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-navy">{e.label}</span>
                <span className="block text-xs text-ink-soft">
                  {e.sub}
                  {unavailable && <span className="text-ember"> · not detected on this device</span>}
                </span>
              </span>
              {engine === e.id && <Check className="h-4 w-4 text-teal" />}
            </button>
          );
        })}
      </div>
      {caps && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-ink-soft">
          Detected: camera {caps.camera ? '✓' : '✗'} · WebXR AR {caps.webxrAR ? '✓' : '✗'} · secure context{' '}
          {caps.secure ? '✓' : '✗'} · BarcodeDetector {caps.barcode ? '✓' : '✗'} · orientation {caps.orientation ? '✓' : '✗'}
        </div>
      )}
      <Button
        variant="secondary"
        block
        className="mt-3"
        icon={<Video className="h-4 w-4" />}
        onClick={() => {
          openSettings(false);
          nav('/camera-check');
        }}
      >
        Camera check
      </Button>

      <div className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">Demo data</div>
      {cleared ? (
        <div className="rounded-xl bg-teal-tint p-3 text-sm font-medium text-teal">Cleared. Reloading…</div>
      ) : confirming ? (
        <div className="rounded-xl border border-danger/30 bg-danger-tint p-3">
          <p className="mb-3 text-sm text-danger">
            This removes all accounts, applications and sealed captures stored in this browser.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={doReset} icon={<Trash2 className="h-4 w-4" />}>
              Yes, reset everything
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" block onClick={() => setConfirming(true)} icon={<Trash2 className="h-4 w-4" />}>
          Reset demo data
        </Button>
      )}
      <p className="mt-4 text-center text-[11px] text-ink-faint">Prototype — nothing leaves your browser.</p>
    </Sheet>
  );
}

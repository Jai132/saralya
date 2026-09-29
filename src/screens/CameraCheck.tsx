import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flashlight } from 'lucide-react';
import { Button, Chip } from '../components/ui';
import { detectCapabilities, Capabilities } from '../lib/capabilities';

/** Diagnostic page: confirms camera, torch, GPS and WebXR support on a real phone. */
export default function CameraCheck() {
  const nav = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState('');
  const [torchOk, setTorchOk] = useState(false);
  const [torch, setTorch] = useState(false);
  const [gps, setGps] = useState<string>('not requested');
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    detectCapabilities().then(setCaps);
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  const start = async () => {
    setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play();
      }
      const track = s.getVideoTracks()[0];
      const st = track.getSettings();
      setInfo(`${st.width}×${st.height} @ ${Math.round(st.frameRate ?? 0)} fps · ${track.label}`);
      const c = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
      setTorchOk(!!c.torch);
    } catch (e) {
      setErr((e as Error).message || String(e));
    }
  };

  const toggleTorch = async () => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
    setTorch(!torch);
  };

  const locate = () => {
    setGps('requesting…');
    navigator.geolocation.getCurrentPosition(
      (p) => setGps(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} ± ${Math.round(p.coords.accuracy)} m`),
      (e) => setGps(`error: ${e.message}`),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1 text-sm text-ink-soft">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="mb-1 text-xl font-semibold">Camera check</h2>
      <p className="mb-4 text-sm text-ink-soft">A quick diagnostic to confirm this phone supports the capture engines.</p>
      <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-2xl bg-navy">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">
            {err ? <span className="text-red-300">{err}</span> : 'Camera is off'}
          </div>
        )}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button onClick={start}>Start camera</Button>
        {torchOk && (
          <Button variant="secondary" onClick={toggleTorch} icon={<Flashlight className="h-4 w-4" />}>
            Torch {torch ? 'off' : 'on'}
          </Button>
        )}
        <Button variant="secondary" onClick={locate}>
          Get GPS
        </Button>
      </div>
      <div className="space-y-1.5 rounded-xl border border-line bg-white p-3 text-xs text-ink-soft">
        <div>Stream: {info || '—'}</div>
        <div>Torch: {stream ? (torchOk ? 'supported' : 'not supported') : '—'}</div>
        <div>GPS: {gps}</div>
        {caps && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Chip tone={caps.secure ? 'teal' : 'red'}>secure {caps.secure ? '✓' : '✗'}</Chip>
            <Chip tone={caps.webxrAR ? 'teal' : 'slate'}>WebXR AR {caps.webxrAR ? '✓' : '✗'}</Chip>
            <Chip tone={caps.barcode ? 'teal' : 'slate'}>BarcodeDetector {caps.barcode ? '✓' : '✗'}</Chip>
          </div>
        )}
      </div>
    </div>
  );
}

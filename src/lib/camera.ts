export interface CameraHandle {
  stream: MediaStream;
  track: MediaStreamTrack;
  video: HTMLVideoElement;
  torchSupported: boolean;
  setTorch: (on: boolean) => Promise<void>;
  stop: () => void;
}

export class CameraError extends Error {
  constructor(
    public reason: 'denied' | 'notfound' | 'insecure' | 'busy' | 'unknown',
    message: string,
  ) {
    super(message);
  }
}

/** Opens the rear camera at ~1280×720 into a muted, inline <video>. */
export async function openRearCamera(video: HTMLVideoElement): Promise<CameraHandle> {
  if (!window.isSecureContext) throw new CameraError('insecure', 'Camera needs HTTPS or localhost.');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('notfound', 'This browser has no camera API.');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: false,
    });
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('denied', 'Camera permission was denied.');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new CameraError('notfound', 'No camera found on this device.');
    if (name === 'NotReadableError') throw new CameraError('busy', 'The camera is in use by another app.');
    throw new CameraError('unknown', (e as Error).message || 'Could not open the camera.');
  }
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.srcObject = stream;
  await new Promise<void>((res) => {
    if (video.readyState >= 1) res();
    else video.onloadedmetadata = () => res();
  });
  await video.play().catch(() => undefined);

  const track = stream.getVideoTracks()[0];
  const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
  return {
    stream,
    track,
    video,
    torchSupported: !!caps.torch,
    setTorch: async (on) => {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    },
    stop: () => {
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

/** Source rectangle of a (sw×sh) frame that is visible when drawn "object-fit: cover" into (vw×vh). */
export function coverCrop(sw: number, sh: number, vw: number, vh: number) {
  const scale = Math.max(vw / sw, vh / sh);
  const cw = vw / scale;
  const ch = vh / scale;
  return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, sw: cw, sh: ch };
}

/** Draws a source into a canvas capped at `maxSide` on its long edge and encodes a JPEG. */
export async function grabJpeg(
  source: CanvasImageSource,
  w: number,
  h: number,
  maxSide = 1600,
  quality = 0.86,
): Promise<{ blob: Blob | null; width: number; height: number }> {
  const s = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.round(w * s);
  const ch = Math.round(h * s);
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  c.getContext('2d')!.drawImage(source, 0, 0, cw, ch);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', quality));
  return { blob, width: cw, height: ch };
}

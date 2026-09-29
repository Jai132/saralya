export interface Capabilities {
  secure: boolean;
  camera: boolean;
  webxrAR: boolean;
  barcode: boolean;
  orientation: boolean;
  geolocation: boolean;
}

let cached: Promise<Capabilities> | null = null;

export function detectCapabilities(): Promise<Capabilities> {
  cached ??= (async () => {
    let webxrAR = false;
    try {
      webxrAR = !!(await (navigator as Navigator & { xr?: XRSystemLike }).xr?.isSessionSupported('immersive-ar'));
    } catch {
      webxrAR = false;
    }
    let camera = false;
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devs = await navigator.mediaDevices.enumerateDevices();
        camera = devs.some((d) => d.kind === 'videoinput');
      }
    } catch {
      camera = false;
    }
    return {
      secure: window.isSecureContext,
      camera,
      webxrAR,
      barcode: 'BarcodeDetector' in window,
      orientation: 'DeviceOrientationEvent' in window,
      geolocation: 'geolocation' in navigator,
    };
  })();
  return cached;
}

interface XRSystemLike {
  isSessionSupported(mode: string): Promise<boolean>;
}

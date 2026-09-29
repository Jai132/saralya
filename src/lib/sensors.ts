import { useEffect, useRef, useState } from 'react';

export interface GeoState {
  status: 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable';
  lat?: number;
  lng?: number;
  accuracy?: number;
  ts?: number;
}

/** Live high-accuracy GPS while `enabled`. */
export function useGeo(enabled: boolean): GeoState {
  const [s, setS] = useState<GeoState>({ status: 'idle' });
  useEffect(() => {
    if (!enabled) return;
    if (!('geolocation' in navigator)) {
      setS({ status: 'unavailable' });
      return;
    }
    setS((p) => (p.status === 'ok' ? p : { status: 'locating' }));
    const id = navigator.geolocation.watchPosition(
      (p) => setS({ status: 'ok', lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, ts: p.timestamp }),
      (e) => setS({ status: e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return s;
}

export interface Pose {
  /** Radians, counter-clockwise seen from above (three.js convention: 0 looks down −Z). Unwrapped. */
  yaw: number;
  /** Radians, positive looks up. */
  pitch: number;
  /** Camera position in metres when the engine tracks it (demo scene, WebXR). */
  pos?: [number, number, number];
}

/**
 * Rear-camera heading and pitch from DeviceOrientation.
 * Computes the world direction of the device's −Z axis from R = Rz(α)·Rx(β)·Ry(γ) (W3C convention),
 * which stays stable whether the phone is held flat or upright.
 */
export function orientationToPose(alpha: number, beta: number, gamma: number): { heading: number; pitch: number } {
  const d = Math.PI / 180;
  const a = alpha * d, b = beta * d, g = gamma * d;
  const cA = Math.cos(a), sA = Math.sin(a), cB = Math.cos(b), sB = Math.sin(b), cG = Math.cos(g), sG = Math.sin(g);
  // −(third column of R): the direction the back camera points, in East-North-Up coordinates.
  const vx = -(cG * sA * sB + cA * sG);
  const vy = -(sA * sG - cA * cG * sB);
  const vz = -(cB * cG);
  return { heading: Math.atan2(vx, vy), pitch: Math.asin(Math.max(-1, Math.min(1, vz))) };
}

/** Subscribes to device orientation; `ref.current` is null until the first real event. */
export function useOrientationPose(enabled: boolean) {
  const ref = useRef<Pose | null>(null);
  useEffect(() => {
    if (!enabled || !('DeviceOrientationEvent' in window)) return;
    let last: number | null = null;
    let unwrapped = 0;
    const on = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      const { heading, pitch } = orientationToPose(e.alpha, e.beta, e.gamma);
      // Compass heading is clockwise; our yaw is counter-clockwise.
      const yaw = -heading;
      if (last === null) unwrapped = yaw;
      else {
        let dYaw = yaw - last;
        if (dYaw > Math.PI) dYaw -= 2 * Math.PI;
        if (dYaw < -Math.PI) dYaw += 2 * Math.PI;
        unwrapped += dYaw;
      }
      last = yaw;
      ref.current = { yaw: unwrapped, pitch };
    };
    const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, on as EventListener);
    return () => window.removeEventListener(evt, on as EventListener);
  }, [enabled]);
  return ref;
}

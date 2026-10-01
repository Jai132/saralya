/** WebXR helpers for the AR capture engine (Chrome on Android with ARCore). */

export async function isArSupported(): Promise<boolean> {
  try {
    return !!(await navigator.xr?.isSessionSupported('immersive-ar'));
  } catch {
    return false;
  }
}

export interface ArSessionInfo {
  session: XRSession;
  depth: boolean;
  cameraAccess: boolean;
  anchors: boolean;
  domOverlay: boolean;
}

/**
 * Requests an immersive-ar session. Must be called from a user gesture (tap), so nothing async should
 * run before it. Retries with fewer optional features if the browser rejects the full set.
 */
export async function requestArSession(overlayRoot: HTMLElement): Promise<ArSessionInfo> {
  const xr = navigator.xr;
  if (!xr) throw new Error('WebXR is not available in this browser.');

  const full: XRSessionInit = {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'depth-sensing', 'camera-access', 'anchors', 'local-floor'],
    domOverlay: { root: overlayRoot },
    depthSensing: { usagePreference: ['cpu-optimized'], dataFormatPreference: ['luminance-alpha', 'float32'] },
  } as XRSessionInit;
  const minimal: XRSessionInit = {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: overlayRoot },
  };

  let session: XRSession;
  try {
    session = await xr.requestSession('immersive-ar', full);
  } catch (e) {
    console.warn('[xr] full feature set rejected, retrying minimal', e);
    session = await xr.requestSession('immersive-ar', minimal);
  }

  // enabledFeatures is newer; when absent, infer from what the session exposes.
  const enabled = (session as XRSession & { enabledFeatures?: string[] }).enabledFeatures;
  const has = (f: string, fallback: boolean) => (enabled ? enabled.includes(f) : fallback);
  return {
    session,
    depth: has('depth-sensing', !!(session as XRSession & { depthUsage?: string }).depthUsage),
    cameraAccess: has('camera-access', typeof XRWebGLBinding !== 'undefined' && 'getCameraImage' in XRWebGLBinding.prototype),
    anchors: has('anchors', false),
    domOverlay: !!session.domOverlayState,
  };
}

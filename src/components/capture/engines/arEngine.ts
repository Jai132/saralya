import * as THREE from 'three';
import { requestArSession } from '../../../lib/xr';
import type { FrameEngine } from './types';

// WebXR Raw Camera Access isn't in @types/webxr yet.
interface XRCameraLike {
  width: number;
  height: number;
}
type CameraBinding = XRWebGLBinding & { getCameraImage(camera: XRCameraLike): WebGLTexture | null };

const MAX_POINTS = 25000;
const VOXEL = 0.05;
const MAX_PATCHES = 60;
const SAMPLE_MS = 200;

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(45,212,191,0.95)';
  g.lineWidth = 3;
  g.strokeRect(2, 2, 252, 252);
  g.strokeStyle = 'rgba(45,212,191,0.55)';
  g.lineWidth = 1.5;
  for (let i = 1; i < 8; i++) {
    g.beginPath();
    g.moveTo(i * 32, 0);
    g.lineTo(i * 32, 256);
    g.moveTo(0, i * 32);
    g.lineTo(256, i * 32);
    g.stroke();
  }
  g.fillStyle = 'rgba(20,184,166,0.12)';
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Patch {
  mesh: THREE.Mesh;
  anchor?: XRAnchor;
  pos: THREE.Vector3;
}

/**
 * Engine A: WebXR immersive-ar with hit-test surfaces, anchored grid patches and a sparse world point cloud
 * from the depth API (or a 5×5 fan of hit-test rays when depth isn't available). The React HUD is shown on
 * top through dom-overlay.
 *
 * Must be started from a tap: Chrome only grants an AR session inside a user gesture.
 */
export async function startArEngine(overlayRoot: HTMLElement, onEnded: () => void): Promise<FrameEngine> {
  const info = await requestArSession(overlayRoot);
  const { session } = info;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);
  const gl = renderer.getContext() as WebGL2RenderingContext;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));

  // Reticle that follows the centre hit-test.
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.08, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.95 }),
  );
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  reticle.add(dot);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Surface patches.
  const gridMat = new THREE.MeshBasicMaterial({ map: gridTexture(), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const patchGeo = new THREE.PlaneGeometry(0.6, 0.6).rotateX(-Math.PI / 2);
  const patches: Patch[] = [];

  // Point cloud.
  const positions = new Float32Array(MAX_POINTS * 3);
  const colors = new Float32Array(MAX_POINTS * 3);
  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  cloudGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  cloudGeo.setDrawRange(0, 0);
  const cloud = new THREE.Points(cloudGeo, new THREE.PointsMaterial({ size: 0.014, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
  cloud.frustumCulled = false;
  scene.add(cloud);
  const voxels = new Set<number>();
  let count = 0;
  let write = 0;
  const near = new THREE.Color(0x99f6e4);
  const far = new THREE.Color(0x1d4ed8);
  const tmpC = new THREE.Color();
  // New points waiting for the mini-map.
  const pending = new Float32Array(4000 * 3);
  let pendingN = 0;

  const addPoint = (x: number, y: number, z: number, dist: number) => {
    const key = (Math.round(x / VOXEL) + 1024) * 4194304 + (Math.round(y / VOXEL) + 1024) * 2048 + (Math.round(z / VOXEL) + 1024);
    if (voxels.has(key)) return;
    voxels.add(key);
    const o = write * 3;
    positions[o] = x;
    positions[o + 1] = y;
    positions[o + 2] = z;
    tmpC.copy(near).lerp(far, Math.min(1, dist / 5));
    colors[o] = tmpC.r;
    colors[o + 1] = tmpC.g;
    colors[o + 2] = tmpC.b;
    write = (write + 1) % MAX_POINTS;
    count = Math.min(MAX_POINTS, count + 1);
    if (pendingN < 4000) {
      pending[pendingN * 3] = x;
      pending[pendingN * 3 + 1] = y;
      pending[pendingN * 3 + 2] = z;
      pendingN++;
    }
  };

  // Hit-test sources: centre (reticle) plus a 5×5 fan used when depth isn't available.
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const centreSource = await session.requestHitTestSource!({ space: viewerSpace });
  if (!centreSource) throw new Error('Hit-test is not available in this AR session.');
  const fanSources: XRHitTestSource[] = [];
  if (!info.depth) {
    for (let gy = -2; gy <= 2; gy++)
      for (let gx = -2; gx <= 2; gx++) {
        const ray = new XRRay({ x: 0, y: 0, z: 0, w: 1 }, { x: gx * 0.18, y: gy * 0.28, z: -1, w: 0 });
        const src = await session.requestHitTestSource!({ space: viewerSpace, offsetRay: ray });
        if (src) fanSources.push(src);
      }
  }

  let lastHit: XRHitTestResult | null = null;
  const lastHitPos = new THREE.Vector3();
  const placePatch = async (hit: XRHitTestResult, refSpace: XRReferenceSpace) => {
    if (patches.length >= MAX_PATCHES) return;
    const pose = hit.getPose(refSpace);
    if (!pose) return;
    const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    if (patches.some((p) => p.pos.distanceTo(pos) < 0.45)) return;
    const mesh = new THREE.Mesh(patchGeo, gridMat);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(m);
    scene.add(mesh);
    const patch: Patch = { mesh, pos };
    patches.push(patch);
    if (info.anchors && hit.createAnchor) {
      try {
        patch.anchor = await hit.createAnchor();
      } catch {
        /* anchors unavailable for this hit */
      }
    }
  };

  // Tapping the scene (outside HUD controls) drops a patch at the reticle.
  let tapRequested = false;
  const onSelect = () => {
    tapRequested = true;
  };
  session.addEventListener('select', onSelect);
  const onBeforeSelect = (e: Event) => {
    if ((e.target as Element | null)?.closest?.('button, a, input, select, [role="dialog"], [data-hud-control]')) e.preventDefault();
  };
  overlayRoot.addEventListener('beforexrselect', onBeforeSelect);

  // Pose, fps and capture plumbing.
  let tracking = false;
  let yawUnwrapped = 0;
  let lastYaw: number | null = null;
  const pose = { yaw: 0, pitch: 0, pos: [0, 0, 0] as [number, number, number] };
  let hfov = (60 * Math.PI) / 180;
  const frameTimes: number[] = [];
  let lastSample = 0;
  let lastAutoPlace = 0;
  let glBinding: CameraBinding | null = null;
  let fb: WebGLFramebuffer | null = null;
  let captureReq: ((r: { pixels: Uint8Array; w: number; h: number } | null) => void) | null = null;
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const invProj = new THREE.Matrix4();
  const viewM = new THREE.Matrix4();
  const v4 = new THREE.Vector4();

  const sampleDepth = (frame: XRFrame, view: XRView) => {
    let depth: XRCPUDepthInformation | null | undefined;
    try {
      depth = frame.getDepthInformation(view);
    } catch {
      depth = null;
    }
    if (!depth) return false;
    invProj.fromArray(view.projectionMatrix).invert();
    viewM.fromArray(view.transform.matrix);
    const cols = 32;
    const rows = 24;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) / cols;
        const y = (r + 0.5) / rows;
        let d = 0;
        try {
          d = depth.getDepthInMeters(x, y);
        } catch {
          d = 0;
        }
        if (!(d > 0.15 && d < 8)) continue;
        // Normalised view coords (origin top-left) → NDC → view-space ray at z = −1 → scale to depth.
        v4.set(x * 2 - 1, 1 - y * 2, -1, 1).applyMatrix4(invProj);
        const px = v4.x / v4.w, py = v4.y / v4.w, pz = v4.z / v4.w;
        const s = d / -pz;
        v4.set(px * s, py * s, pz * s, 1).applyMatrix4(viewM);
        addPoint(v4.x, v4.y, v4.z, d);
      }
    }
    return true;
  };

  const sampleFan = (frame: XRFrame, refSpace: XRReferenceSpace, origin: DOMPointReadOnly) => {
    for (const src of fanSources) {
      const hits = frame.getHitTestResults(src);
      const p = hits[0]?.getPose(refSpace);
      if (!p) continue;
      const t = p.transform.position;
      // Jitter slightly so repeated hits on one plane spread into a visible patch of points.
      const j = () => (Math.random() - 0.5) * 0.06;
      addPoint(t.x + j(), t.y, t.z + j(), Math.hypot(t.x - origin.x, t.y - origin.y, t.z - origin.z));
    }
  };

  const readCamera = (view: XRView): { pixels: Uint8Array; w: number; h: number } | null => {
    const cam = (view as XRView & { camera?: XRCameraLike }).camera;
    if (!info.cameraAccess || !cam) return null;
    try {
      glBinding ??= new XRWebGLBinding(session, gl) as CameraBinding;
      const tex = glBinding.getCameraImage(cam);
      if (!tex) return null;
      const w = cam.width;
      const h = cam.height;
      const prev = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      fb ??= gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, prev);
      return { pixels: px, w, h };
    } catch (e) {
      console.warn('[xr] camera image unavailable', e);
      return null;
    }
  };

  renderer.setAnimationLoop((time: number, frame?: XRFrame) => {
    if (!frame) return;
    const refSpace = renderer.xr.getReferenceSpace();
    if (!refSpace) return;
    const viewer = frame.getViewerPose(refSpace);
    tracking = !!viewer && !viewer.emulatedPosition;
    frameTimes.push(time);
    while (frameTimes.length && time - frameTimes[0] > 1000) frameTimes.shift();

    if (viewer) {
      const t = viewer.transform;
      q.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
      euler.setFromQuaternion(q, 'YXZ');
      if (lastYaw === null) yawUnwrapped = euler.y;
      else {
        let d = euler.y - lastYaw;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        yawUnwrapped += d;
      }
      lastYaw = euler.y;
      pose.yaw = yawUnwrapped;
      pose.pitch = euler.x;
      pose.pos = [t.position.x, t.position.y, t.position.z];
      const view = viewer.views[0];
      hfov = 2 * Math.atan(1 / view.projectionMatrix[0]);

      const hits = frame.getHitTestResults(centreSource);
      lastHit = hits[0] ?? null;
      const hp = lastHit?.getPose(refSpace);
      if (hp) {
        reticle.visible = true;
        reticle.matrix.fromArray(hp.transform.matrix);
        lastHitPos.setFromMatrixPosition(reticle.matrix);
      } else reticle.visible = false;

      if (lastHit && (tapRequested || time - lastAutoPlace > 450)) {
        lastAutoPlace = time;
        placePatch(lastHit, refSpace);
      }
      tapRequested = false;

      // Keep anchored patches glued to their anchors as tracking refines.
      for (const p of patches) {
        if (!p.anchor) continue;
        const ap = frame.getPose(p.anchor.anchorSpace, refSpace);
        if (ap) p.mesh.matrix.fromArray(ap.transform.matrix);
      }

      if (time - lastSample > SAMPLE_MS) {
        lastSample = time;
        const usedDepth = info.depth && sampleDepth(frame, view);
        if (!usedDepth) sampleFan(frame, refSpace, t.position);
        cloudGeo.setDrawRange(0, count);
        cloudGeo.attributes.position.needsUpdate = true;
        cloudGeo.attributes.color.needsUpdate = true;
      }

      if (captureReq) {
        const r = readCamera(view);
        captureReq(r);
        captureReq = null;
      }
    }
    renderer.render(scene, camera);
  });

  let stopping = false;
  const onEnd = () => {
    if (!stopping) onEnded();
  };
  session.addEventListener('end', onEnd);

  const snapshotCanvas = (): HTMLCanvasElement => {
    // No camera frame: draw what the engine sees — projected cloud and surfaces — as an honest overlay snapshot.
    const W = 720;
    const H = Math.round((W * window.innerHeight) / window.innerWidth);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0B1B34';
    g.fillRect(0, 0, W, H);
    const xrCam = renderer.xr.getCamera();
    const vp = new THREE.Matrix4().multiplyMatrices(xrCam.projectionMatrix, xrCam.matrixWorldInverse);
    const v = new THREE.Vector4();
    for (let i = 0; i < count; i++) {
      v.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2], 1).applyMatrix4(vp);
      if (v.w <= 0) continue;
      const x = ((v.x / v.w + 1) / 2) * W;
      const y = ((1 - v.y / v.w) / 2) * H;
      if (x < 0 || y < 0 || x > W || y > H) continue;
      g.fillStyle = `rgb(${Math.round(colors[3 * i] * 255)},${Math.round(colors[3 * i + 1] * 255)},${Math.round(colors[3 * i + 2] * 255)})`;
      g.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.font = '600 20px Inter, Arial';
    g.fillText('Camera frame unavailable in this mode — AR overlay snapshot', 24, H - 56);
    g.font = '16px Inter, Arial';
    g.fillText(`${count} points · ${patches.length} surfaces · ${new Date().toISOString()}`, 24, H - 28);
    return c;
  };

  const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.86));

  return {
    kind: 'ar',
    label: 'AR',
    source: renderer.domElement,
    cover: false,
    analyse: false,
    get hfov() {
      return hfov;
    },
    size: () => ({ w: window.innerWidth, h: window.innerHeight }),
    pose: () => ({ yaw: pose.yaw, pitch: pose.pitch, pos: [...pose.pos] as [number, number, number] }),
    drainCloud: () => {
      const out = { points: pending.slice(0, pendingN * 3), count: pendingN };
      pendingN = 0;
      return out;
    },
    status: () => ({ tracking, surfaces: patches.length, points: count, fps: frameTimes.length, depth: info.depth }),
    capture: async () => {
      const r = await new Promise<{ pixels: Uint8Array; w: number; h: number } | null>((res) => {
        captureReq = res;
        // If no XR frame arrives (session paused), give up after a second.
        setTimeout(() => {
          if (captureReq === res) {
            captureReq = null;
            res(null);
          }
        }, 1000);
      });
      if (r) {
        const c = document.createElement('canvas');
        c.width = r.w;
        c.height = r.h;
        const g = c.getContext('2d')!;
        const img = g.createImageData(r.w, r.h);
        // readPixels is bottom-up; flip rows.
        const row = r.w * 4;
        for (let y = 0; y < r.h; y++) img.data.set(r.pixels.subarray((r.h - 1 - y) * row, (r.h - y) * row), y * row);
        g.putImageData(img, 0, 0);
        return { blob: await toBlob(c), width: r.w, height: r.h };
      }
      const c = snapshotCanvas();
      // The snapshot is an overlay render, not a camera frame; the shell records that in the capture note.
      const blob = await toBlob(c);
      return { blob, width: c.width, height: c.height, overlayOnly: true };
    },
    stop: () => {
      stopping = true;
      renderer.setAnimationLoop(null);
      session.removeEventListener('select', onSelect);
      session.removeEventListener('end', onEnd);
      overlayRoot.removeEventListener('beforexrselect', onBeforeSelect);
      centreSource.cancel();
      fanSources.forEach((s) => s.cancel());
      session.end().catch(() => undefined);
      cloudGeo.dispose();
      patchGeo.dispose();
      gridMat.map?.dispose();
      gridMat.dispose();
      renderer.dispose();
    },
  };
}

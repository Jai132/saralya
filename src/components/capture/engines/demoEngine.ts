import * as THREE from 'three';
import { grabJpeg } from '../../../lib/camera';
import { buildWorld } from './demoScenes';
import { disposeTextures } from './demoTextures';
import type { DemoHint, DemoVariant, FrameEngine } from './types';

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Engine C: a synthetic three.js scene on a slow scripted camera path, fed through exactly the same
 * feature detector and HUD as the live camera. Drag to look around; challenge hints make the autopilot
 * act them out (tilt to the ceiling, turn a full circle…).
 */
export async function startDemoEngine(container: HTMLElement, variant: DemoVariant): Promise<FrameEngine> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'absolute inset-0 h-full w-full';
  canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  const world = buildWorld(variant);
  const cam = new THREE.PerspectiveCamera(60, 1, 0.05, 80);
  const ray = new THREE.Raycaster();

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // Portrait phones get a taller vertical FOV so the horizontal view isn't a letterbox.
    cam.fov = cam.aspect < 1 ? 68 : 52;
    cam.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // Drag-to-look offsets, easing back to the autopilot a moment after release.
  let offYaw = 0, offPitch = 0, dragging = false, lastX = 0, lastY = 0, releasedAt = 0;
  const down = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    offYaw += (e.clientX - lastX) * 0.004;
    offPitch = Math.max(-1.2, Math.min(1.2, offPitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const up = () => {
    dragging = false;
    releasedAt = performance.now();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  let hint: DemoHint = null;
  let hintAt = 0;
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const t0 = performance.now();
  let raf = 0;

  const frame = () => {
    const now = performance.now();
    const t = (now - t0) / 1000;
    world.update(t, cam);

    euler.setFromQuaternion(cam.quaternion, 'YXZ');
    // Small handheld wobble so tracks move like a real phone.
    euler.y += Math.sin(t * 1.7) * 0.006 + Math.sin(t * 3.1) * 0.003;
    euler.x += Math.sin(t * 2.3) * 0.004;

    if (hint) {
      const age = (now - hintAt) / 1000;
      const inOut = smoothstep(0.8, 2.2, age) * (1 - smoothstep(7, 9, age));
      if (hint === 'look-up') euler.x += (0.95 - euler.x) * inOut;
      if (hint === 'look-down') euler.x += (-0.95 - euler.x) * inOut;
      if (hint === 'circle') euler.y += smoothstep(0.8, 10, age) * Math.PI * 2;
      if (age > 11) hint = null;
    }
    if (!dragging && releasedAt && now - releasedAt > 2500) {
      offYaw *= 0.95;
      offPitch *= 0.95;
      if (Math.abs(offYaw) + Math.abs(offPitch) < 0.002) offYaw = offPitch = releasedAt = 0;
    }
    euler.y += offYaw;
    euler.x = Math.max(-1.3, Math.min(1.3, euler.x + offPitch));
    cam.quaternion.setFromEuler(euler);

    renderer.render(world.scene, cam);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  let unwrapped = 0;
  let lastYaw: number | null = null;
  const v2 = new THREE.Vector2();

  return {
    kind: 'demo',
    label: 'Demo scene',
    source: canvas,
    cover: false,
    get hfov() {
      return 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect);
    },
    size: () => ({ w: canvas.width, h: canvas.height }),
    pose: () => {
      const e = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
      if (lastYaw === null) unwrapped = e.y;
      else {
        let d = e.y - lastYaw;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        unwrapped += d;
      }
      lastYaw = e.y;
      return { yaw: unwrapped, pitch: e.x, pos: [cam.position.x, cam.position.y, cam.position.z] };
    },
    depthAt: (u, v) => {
      v2.set(u, v);
      ray.setFromCamera(v2, cam);
      const hit = ray.intersectObjects(world.scene.children, true)[0];
      return hit ? hit.distance : null;
    },
    hint: (h) => {
      hint = h;
      hintAt = performance.now();
    },
    capture: () => grabJpeg(canvas, canvas.width, canvas.height),
    stop: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      world.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      disposeTextures();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

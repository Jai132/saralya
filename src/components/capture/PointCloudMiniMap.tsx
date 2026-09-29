import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { Pose } from '../../lib/sensors';

export interface MiniMapHandle {
  add(points: Float32Array, count: number): void;
  setPose(p: Pose): void;
  size(): number;
  clear(): void;
}

const MAX = 25000;
const VOXEL = 0.05;

/**
 * Corner panel with a slowly rotating 3D point cloud that grows as the user sweeps.
 * Points are de-duplicated on a 5 cm voxel hash and coloured by height.
 */
export const PointCloudMiniMap = forwardRef<MiniMapHandle, { size?: number; coverage: number[] }>(function PointCloudMiniMap(
  { size = 128, coverage },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<MiniMapHandle | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.95 });
    scene.add(new THREE.Points(geo, mat));

    // Floor ring and the "you are here" marker.
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.9, 3, 64), new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const me = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    me.geometry.rotateX(-Math.PI / 2);
    scene.add(me);

    const voxels = new Set<number>();
    let count = 0;
    let write = 0;
    let centroid = new THREE.Vector3();
    let groundY = 0;
    const low = new THREE.Color(0x0f766e);
    const high = new THREE.Color(0xccfbf1);
    const tmp = new THREE.Color();
    let pose: Pose | null = null;

    api.current = {
      add(pts, n) {
        for (let i = 0; i < n; i++) {
          const x = pts[3 * i], y = pts[3 * i + 1], z = pts[3 * i + 2];
          // Integer voxel key; coordinates are within ±50 m in practice.
          const key = (Math.round(x / VOXEL) + 1024) * 4194304 + (Math.round(y / VOXEL) + 1024) * 2048 + (Math.round(z / VOXEL) + 1024);
          if (voxels.has(key)) continue;
          voxels.add(key);
          const o = write * 3;
          positions[o] = x;
          positions[o + 1] = y;
          positions[o + 2] = z;
          const hn = Math.max(0, Math.min(1, (y - groundY) / 3));
          tmp.copy(low).lerp(high, hn);
          colors[o] = tmp.r;
          colors[o + 1] = tmp.g;
          colors[o + 2] = tmp.b;
          write = (write + 1) % MAX;
          count = Math.min(MAX, count + 1);
          centroid.lerp(new THREE.Vector3(x, y, z), 1 / Math.min(count, 400));
        }
        geo.setDrawRange(0, count);
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
      },
      setPose(p) {
        if (!pose) {
          groundY = (p.pos?.[1] ?? 1.5) - 1.5;
          centroid = new THREE.Vector3(p.pos?.[0] ?? 0, groundY + 1, p.pos?.[2] ?? 0);
        }
        pose = p;
      },
      size: () => count,
      clear() {
        voxels.clear();
        count = write = 0;
        geo.setDrawRange(0, 0);
      },
    };

    let raf = 0;
    let last = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      const t = (now - t0) / 1000;
      const a = t * 0.25;
      cam.position.set(centroid.x + Math.cos(a) * 7.5, groundY + 5.5, centroid.z + Math.sin(a) * 7.5);
      cam.lookAt(centroid.x, groundY + 0.6, centroid.z);
      ring.position.set(centroid.x, groundY + 0.01, centroid.z);
      if (pose) {
        const p = pose.pos ?? [0, groundY + 1.5, 0];
        me.position.set(p[0], p[1], p[2]);
        me.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
      }
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      api.current = null;
    };
  }, [size]);

  useImperativeHandle(ref, () => ({
    add: (p, n) => api.current?.add(p, n),
    setPose: (p) => api.current?.setPose(p),
    size: () => api.current?.size() ?? 0,
    clear: () => api.current?.clear(),
  }));

  const R = size / 2 + 7;
  const C = R + 3;
  const seg = (2 * Math.PI) / coverage.length;
  return (
    <div className="relative" style={{ width: size + 20, height: size + 20 }}>
      <svg className="absolute inset-0" width={size + 20} height={size + 20} viewBox={`0 0 ${2 * C} ${2 * C}`}>
        {coverage.map((v, i) => {
          // Bin 0 at the top, bins increase anticlockwise to match yaw.
          const a0 = -Math.PI / 2 - i * seg + 0.03;
          const a1 = -Math.PI / 2 - (i + 1) * seg - 0.03;
          const p = (a: number) => `${C + R * Math.cos(a)} ${C + R * Math.sin(a)}`;
          return (
            <path
              key={i}
              d={`M ${p(a0)} A ${R} ${R} 0 0 0 ${p(a1)}`}
              stroke={v ? '#2dd4bf' : 'rgba(255,255,255,0.18)'}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              style={{ transition: 'stroke .4s' }}
            />
          );
        })}
      </svg>
      <div ref={host} className="absolute left-[10px] top-[10px] overflow-hidden rounded-full bg-navy/90" style={{ width: size, height: size }} />
    </div>
  );
});

import * as THREE from 'three';
import {
  boxTexture,
  brickTexture,
  carSideTexture,
  concreteTexture,
  glassTexture,
  grilleTexture,
  plateTexture,
  posterTexture,
  rng,
  sackTexture,
  sideWindowTexture,
  signTexture,
  tileTexture,
  tyreTexture,
  wallTexture,
  woodTexture,
} from './demoTextures';
import type { DemoVariant } from './types';

export interface DemoWorld {
  scene: THREE.Scene;
  /** Sets the camera for time t (seconds). */
  update(t: number, cam: THREE.PerspectiveCamera): void;
}

type Mat = THREE.Material | THREE.Material[];

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });

function box(parent: THREE.Object3D, w: number, h: number, d: number, mat: Mat, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

function plane(parent: THREE.Object3D, w: number, h: number, mat: THREE.Material, pos: [number, number, number], rot: [number, number, number]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  parent.add(m);
  return m;
}

function lights(scene: THREE.Scene, warm = true) {
  scene.add(new THREE.HemisphereLight(warm ? 0xfff4e0 : 0xe0f2fe, 0x4b3b2a, 1.4));
  const d = new THREE.DirectionalLight(0xffffff, 1.3);
  d.position.set(3, 6, 4);
  scene.add(d);
}

/** Camera from position + yaw/pitch (three.js YXZ: yaw 0 looks down −Z, positive yaw turns left). */
function aim(cam: THREE.PerspectiveCamera, x: number, y: number, z: number, yaw: number, pitch: number) {
  cam.position.set(x, y, z);
  cam.rotation.order = 'YXZ';
  cam.rotation.set(pitch, yaw, 0);
}

// ————————————————————————————— Kirana shop —————————————————————————————

const GOODS: [string, string, string][] = [
  ['#dc2626', 'SUNRISE', 'ATTA 5 KG'],
  ['#15803d', 'GOLDLEAF', 'TEA 500 G'],
  ['#2563eb', 'PEARL', 'SOAP ×4'],
  ['#d97706', 'MASALA', 'KING 200 G'],
  ['#7c3aed', 'NOVA', 'DETERGENT'],
  ['#0891b2', 'RIVER', 'BASMATI'],
  ['#db2777', 'CRISP', 'BISCUITS'],
  ['#65a30d', 'SPROUT', 'DAL 1 KG'],
  ['#ea580c', 'ZING', 'NOODLES'],
  ['#0f766e', 'PURE', 'GHEE 1 L'],
];

const goodsMats = new Map<number, THREE.Material[]>();
function goodsMaterial(i: number): THREE.Material[] {
  const hit = goodsMats.get(i);
  if (hit) return hit;
  const [bg, label, sub] = GOODS[i];
  const side = std({ color: bg });
  const front = std({ map: boxTexture(bg, label, sub) });
  const mats = [side, side, side, side, front, side];
  goodsMats.set(i, mats);
  return mats;
}

function shelfUnit(width: number, height: number, depth: number, levels: number, seed: number) {
  const g = new THREE.Group();
  const r = rng(seed);
  const wood = std({ map: woodTexture(), color: 0xc8a27a });
  const back = std({ color: 0x6b4a2f });
  box(g, 0.05, height, depth, wood, -width / 2, height / 2, 0);
  box(g, 0.05, height, depth, wood, width / 2, height / 2, 0);
  plane(g, width, height, back, [0, height / 2, -depth / 2 + 0.01], [0, 0, 0]);
  const step = (height - 0.1) / levels;
  for (let i = 0; i <= levels; i++) {
    const y = 0.08 + i * step;
    box(g, width, 0.03, depth, wood, 0, y, 0);
    if (i === levels) break;
    let x = -width / 2 + 0.06;
    const maxH = step - 0.06;
    while (x < width / 2 - 0.12) {
      const kind = r();
      const gi = Math.floor(r() * GOODS.length);
      if (kind < 0.62) {
        const w = 0.16 + r() * 0.2;
        const h = Math.min(maxH, 0.18 + r() * 0.26);
        if (x + w > width / 2 - 0.05) break;
        box(g, w, h, depth * 0.8, goodsMaterial(gi), x + w / 2, y + 0.015 + h / 2, 0);
        x += w + 0.01 + r() * 0.02;
      } else if (kind < 0.82) {
        // A row of jars.
        const rad = 0.045 + r() * 0.02;
        const h = Math.min(maxH, 0.14 + r() * 0.1);
        const m = std({ color: GOODS[gi][0], roughness: 0.4 });
        const lid = std({ color: 0xf1f5f9 });
        for (let k = 0; k < 3 && x + rad * 2 < width / 2 - 0.05; k++) {
          const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 14), m);
          c.position.set(x + rad, y + 0.015 + h / 2, 0.05);
          g.add(c);
          const l = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.02, rad * 1.02, 0.025, 14), lid);
          l.position.set(x + rad, y + 0.015 + h + 0.012, 0.05);
          g.add(l);
          x += rad * 2 + 0.012;
        }
        x += 0.02;
      } else {
        // Tall thin packs.
        const w = 0.07;
        const h = Math.min(maxH, 0.3 + r() * 0.1);
        for (let k = 0; k < 4 && x + w < width / 2 - 0.05; k++) {
          box(g, w, h, depth * 0.6, goodsMaterial(gi), x + w / 2, y + 0.015 + h / 2, 0.02);
          x += w + 0.008;
        }
        x += 0.02;
      }
    }
  }
  return g;
}

function buildShop(): DemoWorld {
  goodsMats.clear();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2118);
  lights(scene, true);

  const floor = std({ map: tileTexture('#d6cbb8', '#c4b69e', 8, [3, 3]) });
  plane(scene, 6.2, 6.4, floor, [0, 0, -0.9], [-Math.PI / 2, 0, 0]);
  const wall = std({ map: wallTexture('#e8dfc9', [2, 1]) });
  const ceiling = std({ color: 0xf5f1e8 });
  plane(scene, 6.2, 3, wall, [0, 1.5, -4.1], [0, 0, 0]);
  plane(scene, 6.4, 3, wall, [-3.1, 1.5, -0.9], [0, Math.PI / 2, 0]);
  plane(scene, 6.4, 3, wall, [3.1, 1.5, -0.9], [0, -Math.PI / 2, 0]);
  plane(scene, 6.2, 6.4, ceiling, [0, 3, -0.9], [Math.PI / 2, 0, 0]);
  // Front wall with a shutter opening onto the street.
  box(scene, 2.2, 3, 0.15, wall, -2.0, 1.5, 2.3);
  box(scene, 2.2, 3, 0.15, wall, 2.0, 1.5, 2.3);
  box(scene, 1.8, 0.7, 0.15, wall, 0, 2.65, 2.3);
  plane(scene, 6, 3, std({ map: brickTexture([3, 2]) }), [0, 1.5, 4.5], [0, Math.PI, 0]);

  const back = shelfUnit(5.8, 2.5, 0.42, 5, 1);
  back.position.set(0, 0, -3.85);
  scene.add(back);
  const left = shelfUnit(4.6, 2.4, 0.42, 5, 2);
  left.position.set(-2.86, 0, -1.2);
  left.rotation.y = Math.PI / 2;
  scene.add(left);
  const right = shelfUnit(4.6, 2.4, 0.42, 5, 3);
  right.position.set(2.86, 0, -1.2);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);

  plane(scene, 3.6, 0.63, std({ map: signTexture('SHREE GANESH KIRANA', 'General & Provision Store') }), [0, 2.75, -4.05], [0, 0, 0]);
  plane(scene, 0.5, 0.62, std({ map: posterTexture('2026') }), [3.08, 2.6, 0.9], [0, -Math.PI / 2, 0]);

  // Sacks of grain along the left shelves.
  const r = rng(21);
  const labels = ['RICE', 'SUGAR', 'WHEAT', 'CHANA', 'RICE'];
  labels.forEach((l, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), std({ map: sackTexture(l) }));
    s.scale.set(0.34, 0.42, 0.26);
    s.position.set(-2.35, 0.2, -2.8 + i * 0.62 + r() * 0.1);
    s.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.4;
    scene.add(s);
  });

  // Counter with a weighing scale and a cash tray.
  const counterTop = std({ color: 0x3f3f46, roughness: 0.4 });
  const counterFront = std({ map: woodTexture(), color: 0xb08968 });
  box(scene, 2.4, 0.9, 0.62, counterFront, 0.5, 0.45, 0.35);
  box(scene, 2.5, 0.05, 0.7, counterTop, 0.5, 0.92, 0.35);
  box(scene, 0.36, 0.09, 0.3, std({ color: 0xe5e7eb }), 1.2, 0.99, 0.3);
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.03, 24), std({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.3 }));
  pan.position.set(1.2, 1.06, 0.3);
  scene.add(pan);
  plane(scene, 0.16, 0.05, std({ color: 0x111111, emissive: 0xef4444, emissiveIntensity: 0.6 }), [1.2, 0.99, 0.452], [0, 0, 0]);
  box(scene, 0.4, 0.08, 0.3, std({ color: 0x1e3a8a }), -0.2, 0.99, 0.3);

  // Tube lights.
  const tube = std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 });
  box(scene, 1.2, 0.04, 0.06, tube, -1, 2.97, -1.5);
  box(scene, 1.2, 0.04, 0.06, tube, 1, 2.97, -1.5);

  return {
    scene,
    update(t, cam) {
      const yaw = Math.sin((t * 2 * Math.PI) / 34) * 1.3;
      const pitch = -0.12 + Math.sin((t * 2 * Math.PI) / 11) * 0.06;
      aim(cam, Math.sin(t / 13) * 0.45, 1.55, 1.45, yaw, pitch);
    },
  };
}

// ————————————————————————————— Two-room house —————————————————————————————

function wallWithWindow(parent: THREE.Object3D, len: number, h: number, mat: THREE.Material, winCenter: number, winW: number, sill: number, head: number) {
  const g = new THREE.Group();
  const t = 0.12;
  const left = winCenter - winW / 2 + len / 2;
  const right = len / 2 - (winCenter + winW / 2);
  box(g, left, h, t, mat, -len / 2 + left / 2, h / 2, 0);
  box(g, right, h, t, mat, len / 2 - right / 2, h / 2, 0);
  box(g, winW, sill, t, mat, winCenter, sill / 2, 0);
  box(g, winW, h - head, t, mat, winCenter, head + (h - head) / 2, 0);
  const frame = std({ color: 0x475569 });
  box(g, winW, 0.05, 0.14, frame, winCenter, sill, 0);
  box(g, winW, 0.05, 0.14, frame, winCenter, head, 0);
  box(g, 0.05, head - sill, 0.14, frame, winCenter, (sill + head) / 2, 0);
  box(g, 0.05, head - sill, 0.14, frame, winCenter - winW / 2, (sill + head) / 2, 0);
  box(g, 0.05, head - sill, 0.14, frame, winCenter + winW / 2, (sill + head) / 2, 0);
  for (let i = 1; i < 5; i++) box(g, 0.02, head - sill, 0.02, frame, winCenter - winW / 2 + (i * winW) / 5, (sill + head) / 2, 0.05);
  plane(g, winW, head - sill, std({ color: 0xbfe3f5, emissive: 0x9fd5ef, emissiveIntensity: 0.5 }), [winCenter, (sill + head) / 2, -0.03], [0, 0, 0]);
  parent.add(g);
  return g;
}

function fan(parent: THREE.Object3D, x: number, z: number) {
  const m = std({ color: 0xf1f5f9 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), m);
  hub.position.set(x, 2.6, z);
  parent.add(hub);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), m);
  rod.position.set(x, 2.8, z);
  parent.add(rod);
  for (let i = 0; i < 3; i++) {
    const b = box(parent, 0.6, 0.015, 0.1, std({ color: 0xcbd5e1 }), x, 2.58, z);
    b.geometry.translate(0.35, 0, 0);
    b.rotation.y = (i * 2 * Math.PI) / 3;
  }
}

function buildHouse(): DemoWorld {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdbeafe);
  lights(scene, false);
  const H = 2.9;
  const wallA = std({ map: wallTexture('#e7e1f0', [2, 1]) });
  const wallB = std({ map: wallTexture('#f3e8d2', [2, 1]) });
  plane(scene, 8.2, 6.2, std({ map: tileTexture('#e5e7eb', '#d1d5db', 6, [5, 4]) }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  plane(scene, 8.2, 6.2, std({ color: 0xfafafa }), [0, H, 0], [Math.PI / 2, 0, 0]);

  // North wall: one window per room.
  const nA = wallWithWindow(scene, 4, H, wallA, 0, 1.4, 0.9, 2.1);
  nA.position.set(-2, 0, -3);
  const nB = wallWithWindow(scene, 4, H, wallB, 0.2, 1.2, 0.9, 2.1);
  nB.position.set(2, 0, -3);
  // South wall with the main door in room A and a window in room B.
  box(scene, 1.4, H, 0.12, wallA, -3.3, H / 2, 3);
  box(scene, 1.6, H, 0.12, wallA, -0.8, H / 2, 3);
  box(scene, 1.0, H - 2.1, 0.12, wallA, -2.1, 2.1 + (H - 2.1) / 2, 3);
  const door = std({ map: woodTexture(), color: 0x9a6b3f });
  box(scene, 0.95, 2.05, 0.05, door, -2.1, 1.03, 3.02);
  const sB = wallWithWindow(scene, 4, H, wallB, 0, 1.2, 0.9, 2.1);
  sB.position.set(2, 0, 3);
  sB.rotation.y = Math.PI;
  // East/west walls.
  plane(scene, 6, H, wallA, [-4, H / 2, 0], [0, Math.PI / 2, 0]);
  plane(scene, 6, H, wallB, [4, H / 2, 0], [0, -Math.PI / 2, 0]);
  // Divider with a doorway at z ∈ [−0.5, 0.5].
  box(scene, 0.12, H, 2.5, wallA, 0, H / 2, -1.75);
  box(scene, 0.12, H, 2.5, wallA, 0, H / 2, 1.75);
  box(scene, 0.12, H - 2.1, 1.0, wallA, 0, 2.1 + (H - 2.1) / 2, 0);
  const frame = std({ color: 0x78350f });
  box(scene, 0.16, 2.1, 0.06, frame, 0, 1.05, -0.5);
  box(scene, 0.16, 2.1, 0.06, frame, 0, 1.05, 0.5);

  // Room A: sofa, table, TV unit, electricity meter and doorplate by the main door.
  const fabric = std({ map: tileTexture('#4f46e5', '#4338ca', 8, [2, 1]) });
  box(scene, 1.9, 0.45, 0.85, fabric, -2.6, 0.23, -2.3);
  box(scene, 1.9, 0.5, 0.2, fabric, -2.6, 0.7, -2.65);
  box(scene, 0.9, 0.42, 0.55, std({ map: woodTexture() }), -2.6, 0.21, -1.1);
  box(scene, 1.6, 0.5, 0.4, std({ map: woodTexture(), color: 0xa47148 }), -3.75, 0.25, 0.3, Math.PI / 2);
  plane(scene, 1.2, 0.7, std({ color: 0x0f172a, roughness: 0.2 }), [-3.93, 1.2, 0.3], [0, Math.PI / 2, 0]);
  box(scene, 0.28, 0.36, 0.12, std({ color: 0xe5e7eb }), -0.9, 1.6, 2.92);
  plane(scene, 0.12, 0.12, std({ map: posterTexture('kWh') }), [-0.9, 1.64, 2.855], [0, Math.PI, 0]);
  plane(scene, 0.34, 0.12, std({ map: plateTexture('H.NO. 14') }), [-2.85, 1.55, 3.07], [0, 0, 0]);
  plane(scene, 0.5, 0.62, std({ map: posterTexture('2026') }), [-3.98, 1.7, -1.8], [0, Math.PI / 2, 0]);

  // Room B: bed, cupboard, study table.
  const blanket = std({ map: tileTexture('#be123c', '#f43f5e', 6, [1, 1]) });
  box(scene, 1.6, 0.45, 2.0, std({ map: woodTexture() }), 2.9, 0.23, -1.9);
  box(scene, 1.55, 0.12, 1.9, blanket, 2.9, 0.51, -1.9);
  box(scene, 1.5, 0.9, 0.08, std({ map: woodTexture() }), 2.9, 0.75, -2.92);
  box(scene, 0.55, 0.12, 0.35, std({ color: 0xf8fafc }), 2.5, 0.63, -2.6);
  box(scene, 0.55, 0.12, 0.35, std({ color: 0xf8fafc }), 3.25, 0.63, -2.6);
  const cup = box(scene, 1.2, 2.0, 0.6, std({ map: tileTexture('#94a3b8', '#8190a5', 2, [1, 1]) }), 3.65, 1.0, 1.6, Math.PI / 2);
  cup.scale.set(1, 1, 1);
  box(scene, 1.0, 0.75, 0.55, std({ map: woodTexture() }), 1.0, 0.38, 2.5);

  fan(scene, -2, 0);
  fan(scene, 2, 0);

  return {
    scene,
    update(t, cam) {
      const s = 0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 52);
      const x = -2.2 + 4.4 * s;
      const z = 1.3 - 1.3 * Math.sin(Math.PI * s);
      const yaw = Math.sin((t * 2 * Math.PI) / 17) * 1.45;
      aim(cam, x, 1.5, z, yaw, -0.1 + Math.sin(t / 5) * 0.05);
    },
  };
}

// ————————————————————————————— Vehicles —————————————————————————————

function wheel(parent: THREE.Object3D, r: number, w: number, x: number, y: number, z: number) {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 28), [
    std({ map: tyreTexture() }),
    std({ color: 0x111827 }),
    std({ color: 0x111827 }),
  ]);
  tyre.rotation.z = Math.PI / 2;
  tyre.position.set(x, y, z);
  parent.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 20), std({ color: 0x9ca3af, metalness: 0.5, roughness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  hub.position.set(x, y, z);
  parent.add(hub);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const nut = new THREE.Mesh(new THREE.SphereGeometry(r * 0.06, 8, 6), std({ color: 0x374151 }));
    nut.position.set(x + Math.sign(x) * (w / 2 + 0.012), y + Math.sin(a) * r * 0.32, z + Math.cos(a) * r * 0.32);
    parent.add(nut);
  }
}

function yard(scene: THREE.Scene) {
  scene.background = new THREE.Color(0xcfe3f0);
  lights(scene, false);
  plane(scene, 40, 40, std({ map: concreteTexture([10, 10]) }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const brick = std({ map: brickTexture([8, 2]) });
  plane(scene, 30, 5, brick, [0, 2.5, -9], [0, 0, 0]);
  plane(scene, 30, 5, brick, [-12, 2.5, 3], [0, Math.PI / 2, 0]);
  plane(scene, 30, 5, std({ map: wallTexture('#e2e8f0', [6, 1]) }), [12, 2.5, 3], [0, -Math.PI / 2, 0]);
  const paint = std({ color: 0xfacc15 });
  for (const x of [-3.2, 3.2]) plane(scene, 0.12, 10, paint, [x, 0.01, 0], [-Math.PI / 2, 0, 0]);
  const cone = std({ color: 0xf97316 });
  [[-4.5, 3], [4.6, -3.5], [-4, -4]].forEach(([x, z]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), cone);
    c.position.set(x, 0.3, z);
    scene.add(c);
  });
}

function buildTruck(): DemoWorld {
  const scene = new THREE.Scene();
  yard(scene);
  const g = new THREE.Group();
  scene.add(g);
  const cabColor = '#e0a526';
  const cab = std({ color: cabColor });
  const cabFront = std({ map: grilleTexture(cabColor) });
  const cabSide = std({ map: sideWindowTexture(cabColor) });
  // Cabin faces: +x, −x, +y, −y, +z (front), −z.
  box(g, 2.3, 2.0, 1.8, [cabSide, cabSide, cab, cab, cabFront, cab], 0, 1.95, 2.3);
  box(g, 1.0, 0.25, 6.2, std({ color: 0x1f2937 }), 0, 0.75, 0);
  box(g, 2.45, 0.28, 0.25, std({ color: 0x374151 }), 0, 0.95, 3.25);
  plane(g, 0.55, 0.12, std({ map: plateTexture('RJ 19 GA 4821') }), [0, 0.95, 3.38], [0, 0, 0]);
  // Tipper body with ribbed sides.
  const bodyMat = std({ map: tileTexture('#9a3412', '#7c2d12', 8, [1, 1]) });
  box(g, 2.4, 0.15, 3.9, bodyMat, 0, 1.2, -0.75);
  box(g, 0.1, 1.1, 3.9, bodyMat, -1.18, 1.8, -0.75);
  box(g, 0.1, 1.1, 3.9, bodyMat, 1.18, 1.8, -0.75);
  box(g, 2.4, 1.1, 0.1, bodyMat, 0, 1.8, -2.7);
  box(g, 2.4, 1.3, 0.1, bodyMat, 0, 1.9, 1.2);
  plane(g, 0.55, 0.12, std({ map: plateTexture('RJ 19 GA 4821') }), [0, 1.0, -2.76], [0, Math.PI, 0]);
  const tail = std({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.5 });
  box(g, 0.25, 0.12, 0.05, tail, -0.95, 1.0, -2.76);
  box(g, 0.25, 0.12, 0.05, tail, 0.95, 1.0, -2.76);
  for (const z of [2.2, -0.9, -2.0]) {
    wheel(g, 0.52, 0.36, -1.05, 0.52, z);
    wheel(g, 0.52, 0.36, 1.05, 0.52, z);
  }
  box(g, 0.5, 0.35, 0.8, std({ color: 0x111827 }), -0.8, 1.0, 0.6);
  return orbit(scene, 7.8, 1.7, new THREE.Vector3(0, 1.3, 0));
}

function buildCar(): DemoWorld {
  const scene = new THREE.Scene();
  yard(scene);
  const g = new THREE.Group();
  scene.add(g);
  const body = '#1e3a8a';
  const paint = std({ color: body, roughness: 0.35, metalness: 0.3 });
  const side = std({ map: carSideTexture(body), roughness: 0.35, metalness: 0.3 });
  const front = std({ map: grilleTexture(body), roughness: 0.35 });
  box(g, 1.72, 0.66, 3.9, [side, side, paint, paint, front, paint], 0, 0.62, 0);
  const glass = std({ map: glassTexture(), roughness: 0.15 });
  const roof = std({ color: body, roughness: 0.35, metalness: 0.3 });
  box(g, 1.52, 0.56, 2.1, [glass, glass, roof, roof, glass, glass], 0, 1.23, -0.2);
  box(g, 1.76, 0.18, 0.2, std({ color: 0x111827 }), 0, 0.42, 1.98);
  box(g, 1.76, 0.18, 0.2, std({ color: 0x111827 }), 0, 0.42, -1.98);
  plane(g, 0.5, 0.11, std({ map: plateTexture('MH 12 KX 7730') }), [0, 0.45, 2.09], [0, 0, 0]);
  plane(g, 0.5, 0.11, std({ map: plateTexture('MH 12 KX 7730') }), [0, 0.45, -2.09], [0, Math.PI, 0]);
  const tail = std({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.5 });
  box(g, 0.32, 0.14, 0.04, tail, -0.62, 0.78, -1.96);
  box(g, 0.32, 0.14, 0.04, tail, 0.62, 0.78, -1.96);
  box(g, 0.05, 0.1, 0.18, paint, -0.9, 1.0, 0.8);
  box(g, 0.05, 0.1, 0.18, paint, 0.9, 1.0, 0.8);
  for (const z of [1.25, -1.3]) {
    wheel(g, 0.33, 0.24, -0.8, 0.33, z);
    wheel(g, 0.33, 0.24, 0.8, 0.33, z);
  }
  return orbit(scene, 5.6, 1.5, new THREE.Vector3(0, 0.75, 0));
}

function orbit(scene: THREE.Scene, radius: number, height: number, target: THREE.Vector3): DemoWorld {
  return {
    scene,
    update(t, cam) {
      // Start at the front, walk counter-clockwise (front → front-¾ left → left …), pausing slightly at each 45°.
      const u = t / 6;
      const a = (Math.floor(u) + smooth(u - Math.floor(u))) * (Math.PI / 4) + Math.PI / 2;
      const r = radius + Math.sin(t / 4) * 0.25;
      cam.position.set(Math.cos(a) * r, height + Math.sin(t / 3) * 0.08, Math.sin(a) * r);
      cam.lookAt(target);
    },
  };
}

function smooth(x: number) {
  const e = Math.min(1, Math.max(0, (x - 0.35) / 0.65));
  return e * e * (3 - 2 * e);
}

export function buildWorld(v: DemoVariant): DemoWorld {
  switch (v) {
    case 'shop':
      return buildShop();
    case 'house':
      return buildHouse();
    case 'car':
      return buildCar();
    case 'truck':
      return buildTruck();
  }
}

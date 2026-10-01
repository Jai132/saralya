// Generates vehicle part templates and capture silhouettes into public/.
// Usage: node scripts/make-vehicle-assets.mjs
//
// Templates (public/templates/<id>.json + .svg, plus index.json):
//   Canonical sizes are ILLUSTRATIVE, not OEM data. Number plate sizes are placeholders based on standard HSRP
//   sizes — verify against the current spec (src/data/hsrp.ts overrides them at runtime).
// Silhouettes (public/silhouettes/<type>-<angle>.svg):
//   Original, generic line drawings projected from simple box models. No brands.
import { mkdirSync, writeFileSync } from 'node:fs';

// ———————————————————————————— Templates ————————————————————————————

const rect = (w, h, r = 0) =>
  r
    ? `M${r} 0H${w - r}Q${w} 0 ${w} ${r}V${h - r}Q${w} ${h} ${w - r} ${h}H${r}Q0 ${h} 0 ${h - r}V${r}Q0 0 ${r} 0Z`
    : `M0 0H${w}V${h}H0Z`;
const zone = (id, label, x, y, w, h) => ({ id, label, rect: [x, y, w, h] });

function doorZones(w, h, windowFrac = 0.4) {
  const wy = h * windowFrac;
  return [
    zone('window', 'Window frame', 0, 0, w, wy),
    zone('upper', 'Upper panel', 0, wy, w, (h - wy) * 0.35),
    zone('handle', 'Handle area', w * 0.62, wy + (h - wy) * 0.12, w * 0.3, (h - wy) * 0.22),
    zone('lower', 'Lower panel', 0, wy + (h - wy) * 0.35, w, (h - wy) * 0.5),
    zone('sill', 'Sill', 0, h - (h - wy) * 0.15, w, (h - wy) * 0.15),
  ];
}

function doorOutline(w, h, frontAtLeft, windowFrac = 0.4) {
  // Door skin with the window opening drawn as a sub-path.
  const wy = h * windowFrac;
  const slant = w * 0.18;
  const win = frontAtLeft
    ? `M${slant} ${wy * 0.12}L${w * 0.94} ${wy * 0.12}L${w * 0.94} ${wy * 0.92}L${w * 0.06} ${wy * 0.92}Z`
    : `M${w * 0.06} ${wy * 0.12}L${w - slant} ${wy * 0.12}L${w * 0.94} ${wy * 0.92}L${w * 0.06} ${wy * 0.92}Z`;
  return `${rect(w, h, 30)} ${win}`;
}

function door(id, cls, label, w, h, frontAtLeft, windowFrac) {
  return { id, vehicleClass: cls, part: label, widthMm: w, heightMm: h, planar: true, outline: doorOutline(w, h, frontAtLeft, windowFrac), zones: doorZones(w, h, windowFrac) };
}

const PLATE = { widthMm: 500, heightMm: 120 }; // placeholder HSRP size — verify against spec

const TEMPLATES = [
  // Cars
  {
    id: 'car-bonnet', vehicleClass: 'car', part: 'Bonnet', widthMm: 1400, heightMm: 1000, planar: true,
    outline: 'M150 0H1250Q1400 0 1400 120V880Q1400 1000 1250 1000H150Q0 1000 0 880V120Q0 0 150 0Z M200 120L1200 120',
    zones: [zone('leading', 'Leading edge', 0, 820, 1400, 180), zone('centre', 'Centre', 250, 250, 900, 570), zone('left', 'Left edge', 0, 0, 250, 1000), zone('right', 'Right edge', 1150, 0, 250, 1000)],
  },
  door('car-door-fl', 'car', 'Front-left door', 1100, 950, true, 0.42),
  door('car-door-rl', 'car', 'Rear-left door', 950, 950, true, 0.42),
  door('car-door-fr', 'car', 'Front-right door', 1100, 950, false, 0.42),
  door('car-door-rr', 'car', 'Rear-right door', 950, 950, false, 0.42),
  {
    id: 'car-boot', vehicleClass: 'car', part: 'Boot / tailgate', widthMm: 1100, heightMm: 800, planar: true,
    outline: `${rect(1100, 800, 60)} M120 60H980L940 360H160Z`,
    zones: [zone('glass', 'Rear glass', 120, 60, 860, 300), zone('panel', 'Lower panel', 0, 360, 1100, 300), zone('lip', 'Lip / plate area', 250, 660, 600, 140)],
  },
  {
    id: 'car-roof', vehicleClass: 'car', part: 'Roof', widthMm: 1200, heightMm: 1300, planar: true,
    outline: rect(1200, 1300, 120),
    zones: [zone('front', 'Front third', 0, 0, 1200, 430), zone('mid', 'Middle third', 0, 430, 1200, 440), zone('rear', 'Rear third', 0, 870, 1200, 430)],
  },
  {
    id: 'car-bumper-f', vehicleClass: 'car', part: 'Front bumper', widthMm: 1650, heightMm: 450, planar: false,
    outline: 'M80 0H1570Q1650 0 1650 90V360Q1650 450 1570 450H80Q0 450 0 360V90Q0 0 80 0Z M500 200H1150V330H500Z',
    zones: [zone('left', 'Left corner', 0, 0, 400, 450), zone('centre', 'Centre / grille', 400, 0, 850, 450), zone('right', 'Right corner', 1250, 0, 400, 450)],
  },
  {
    id: 'car-bumper-r', vehicleClass: 'car', part: 'Rear bumper', widthMm: 1650, heightMm: 450, planar: false,
    outline: 'M80 0H1570Q1650 0 1650 90V360Q1650 450 1570 450H80Q0 450 0 360V90Q0 0 80 0Z',
    zones: [zone('left', 'Left corner', 0, 0, 400, 450), zone('centre', 'Centre', 400, 0, 850, 450), zone('right', 'Right corner', 1250, 0, 400, 450)],
  },
  // Commercial vehicles
  {
    id: 'cv-cabin-front', vehicleClass: 'cv', part: 'Cabin front', widthMm: 2200, heightMm: 1500, planar: true,
    outline: `${rect(2200, 1500, 60)} M120 80H2080V700H120Z M500 900H1700V1250H500Z`,
    zones: [zone('screen', 'Windscreen', 120, 80, 1960, 620), zone('grille', 'Grille', 500, 900, 1200, 350), zone('lamps', 'Headlamp corners', 0, 850, 2200, 300), zone('lower', 'Lower panel', 0, 1250, 2200, 250)],
  },
  door('cv-door-l', 'cv', 'Cabin left door', 900, 1300, true, 0.45),
  door('cv-door-r', 'cv', 'Cabin right door', 900, 1300, false, 0.45),
  {
    id: 'cv-body-l', vehicleClass: 'cv', part: 'Load body left side', widthMm: 3900, heightMm: 1100, planar: true,
    outline: `${rect(3900, 1100)} ${[1, 2, 3, 4, 5, 6].map((i) => `M${i * 557} 0V1100`).join(' ')}`,
    zones: [zone('top', 'Top rail', 0, 0, 3900, 150), zone('panels', 'Side panels', 0, 150, 3900, 800), zone('bottom', 'Bottom rail', 0, 950, 3900, 150)],
  },
  {
    id: 'cv-body-r', vehicleClass: 'cv', part: 'Load body right side', widthMm: 3900, heightMm: 1100, planar: true,
    outline: `${rect(3900, 1100)} ${[1, 2, 3, 4, 5, 6].map((i) => `M${i * 557} 0V1100`).join(' ')}`,
    zones: [zone('top', 'Top rail', 0, 0, 3900, 150), zone('panels', 'Side panels', 0, 150, 3900, 800), zone('bottom', 'Bottom rail', 0, 950, 3900, 150)],
  },
  {
    id: 'cv-tailgate', vehicleClass: 'cv', part: 'Tailgate', widthMm: 2300, heightMm: 1100, planar: true,
    outline: `${rect(2300, 1100)} M0 550H2300 M575 0V1100 M1150 0V1100 M1725 0V1100`,
    zones: [zone('upper', 'Upper half', 0, 0, 2300, 550), zone('lower', 'Lower half', 0, 550, 2300, 550), zone('hinges', 'Hinge line', 0, 950, 2300, 150)],
  },
  {
    id: 'cv-bumper', vehicleClass: 'cv', part: 'Bumper', widthMm: 2400, heightMm: 300, planar: false,
    outline: `${rect(2400, 300, 30)} M950 80H1450V220H950Z`,
    zones: [zone('left', 'Left end', 0, 0, 600, 300), zone('centre', 'Centre / plate', 600, 0, 1200, 300), zone('right', 'Right end', 1800, 0, 600, 300)],
  },
  // Both
  {
    id: 'number-plate', vehicleClass: 'both', part: 'Number plate', ...PLATE, planar: true,
    outline: `${rect(PLATE.widthMm, PLATE.heightMm, 8)} M12 12H70V108H12Z`,
    zones: [zone('ind', 'IND / hologram strip', 0, 0, 80, 120), zone('chars', 'Registration characters', 80, 0, 420, 120)],
    note: 'Plate size is a placeholder based on standard HSRP sizes — verify against spec.',
  },
  {
    id: 'chassis-plate', vehicleClass: 'both', part: 'Chassis number (stamped)', widthMm: 300, heightMm: 60, planar: true,
    outline: rect(300, 60, 4),
    zones: [zone('wmi', 'Manufacturer code', 0, 0, 60, 60), zone('vds', 'Descriptor', 60, 0, 120, 60), zone('serial', 'Serial', 180, 0, 120, 60)],
    note: 'Stamped area dimensions are illustrative.',
  },
];

function templateSvg(t) {
  const zones = t.zones
    .map((z) => `<rect x="${z.rect[0]}" y="${z.rect[1]}" width="${z.rect[2]}" height="${z.rect[3]}" fill="none" stroke="#0F766E" stroke-opacity="0.35" stroke-dasharray="12 10" stroke-width="${Math.max(2, t.widthMm / 300)}"/>`)
    .join('');
  const sw = Math.max(3, t.widthMm / 160);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t.widthMm} ${t.heightMm}"><path d="${t.outline}" fill="none" stroke="#0B1B34" stroke-width="${sw}" stroke-linejoin="round"/>${zones}</svg>\n`;
}

mkdirSync('public/templates', { recursive: true });
for (const t of TEMPLATES) {
  // Reference corners: TL, TR, BR, BL of the canonical rectangle, in mm.
  const json = { ...t, corners: [[0, 0], [t.widthMm, 0], [t.widthMm, t.heightMm], [0, t.heightMm]], illustrative: true };
  writeFileSync(`public/templates/${t.id}.json`, JSON.stringify(json, null, 2) + '\n');
  writeFileSync(`public/templates/${t.id}.svg`, templateSvg(t));
}
writeFileSync('public/templates/index.json', JSON.stringify(TEMPLATES.map((t) => t.id), null, 2) + '\n');

// ———————————————————————————— Silhouettes ————————————————————————————
// Vehicles face +z; their left side is +x; y is up. Units are metres.

const box = (x0, x1, y0, y1, z0, z1) => hexa([
  [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
  [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
]);
/** Eight vertices: 0-3 the −z face (bottom-left, bottom-right, top-right, top-left seen from −z), 4-7 the +z face. */
function hexa(v) {
  const faces = [
    [0, 3, 2, 1], // −z (rear)
    [4, 5, 6, 7], // +z (front)
    [0, 4, 7, 3], // −x side (vehicle right)
    [1, 2, 6, 5], // +x side (vehicle left)
    [3, 7, 6, 2], // top
    [0, 1, 5, 4], // bottom
  ];
  return { v, faces };
}
/** A frustum-like block: separate x/z extents for bottom (y0) and top (y1). */
const taper = (xb, xt, y0, y1, zb, zt) => hexa([
  [-xb, y0, zb[0]], [xb, y0, zb[0]], [xt, y1, zt[0]], [-xt, y1, zt[0]],
  [-xb, y0, zb[1]], [xb, y0, zb[1]], [xt, y1, zt[1]], [-xt, y1, zt[1]],
]);
const wheel = (x, y, z, r) => ({ wheel: [x, y, z, r] });

const MODELS = {
  car: [
    box(-0.85, 0.85, 0.25, 0.95, -1.95, 1.95),
    taper(0.82, 0.68, 0.95, 1.45, [-1.5, 1.1], [-1.05, 0.55]),
    wheel(0.86, 0.32, 1.25, 0.32), wheel(-0.86, 0.32, 1.25, 0.32), wheel(0.86, 0.32, -1.3, 0.32), wheel(-0.86, 0.32, -1.3, 0.32),
  ],
  pickup: [
    box(-0.9, 0.9, 0.45, 1.05, -2.3, 2.6),
    box(-0.88, 0.88, 1.05, 1.95, 0.8, 2.15),
    box(-0.9, 0.9, 1.05, 1.5, -2.3, 0.8),
    wheel(0.92, 0.38, 1.75, 0.38), wheel(-0.92, 0.38, 1.75, 0.38), wheel(0.92, 0.38, -1.5, 0.38), wheel(-0.92, 0.38, -1.5, 0.38),
  ],
  truck: [
    box(-0.5, 0.5, 0.62, 0.9, -3.1, 3.3),
    box(-1.15, 1.15, 0.9, 2.95, 2.0, 3.3),
    box(-1.22, 1.22, 1.1, 3.4, -3.1, 1.85),
    wheel(1.08, 0.52, 2.5, 0.52), wheel(-1.08, 0.52, 2.5, 0.52), wheel(1.08, 0.52, -1.1, 0.52), wheel(-1.08, 0.52, -1.1, 0.52), wheel(1.08, 0.52, -2.2, 0.52), wheel(-1.08, 0.52, -2.2, 0.52),
  ],
  tipper: [
    box(-0.5, 0.5, 0.62, 0.9, -2.9, 3.3),
    box(-1.15, 1.15, 0.9, 2.95, 2.0, 3.3),
    taper(1.15, 1.22, 1.1, 2.35, [-2.6, 1.55], [-2.95, 1.85]),
    wheel(1.08, 0.52, 2.5, 0.52), wheel(-1.08, 0.52, 2.5, 0.52), wheel(1.08, 0.52, -0.9, 0.52), wheel(-1.08, 0.52, -0.9, 0.52), wheel(1.08, 0.52, -2.0, 0.52), wheel(-1.08, 0.52, -2.0, 0.52),
  ],
};

export const ANGLES = ['front', 'front34-left', 'left', 'rear34-left', 'rear', 'rear34-right', 'right', 'front34-right'];

function project(model, phiDeg, elevDeg = 6) {
  const phi = (phiDeg * Math.PI) / 180;
  const el = (elevDeg * Math.PI) / 180;
  // Camera direction (from vehicle towards camera).
  const cd = [Math.sin(phi) * Math.cos(el), Math.sin(el), Math.cos(phi) * Math.cos(el)];
  const right = [Math.cos(phi), 0, -Math.sin(phi)];
  const up = [-Math.sin(phi) * Math.sin(el), Math.cos(el), -Math.cos(phi) * Math.sin(el)];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const P = (p) => [dot(p, right), -dot(p, up)];
  const lines = [];
  const circles = [];
  for (const part of model) {
    if (part.wheel) {
      const [x, y, z, r] = part.wheel;
      // Only wheels on the side facing the camera (or seen nearly end-on from front/rear).
      if (Math.sign(x) * cd[0] < -0.05) continue;
      const pts = [];
      for (let k = 0; k <= 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        pts.push(P([x, y + Math.sin(a) * r, z + Math.cos(a) * r]));
      }
      circles.push(pts);
      continue;
    }
    const { v, faces } = part;
    const visible = faces.map((f) => {
      const [a, b, c] = [v[f[0]], v[f[1]], v[f[2]]];
      const u1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const u2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u1[1] * u2[2] - u1[2] * u2[1], u1[2] * u2[0] - u1[0] * u2[2], u1[0] * u2[1] - u1[1] * u2[0]];
      return dot(n, cd) > 1e-6;
    });
    const edges = new Map();
    faces.forEach((f, fi) => {
      if (!visible[fi]) return;
      for (let k = 0; k < 4; k++) {
        const a = f[k], b = f[(k + 1) % 4];
        edges.set(a < b ? `${a}-${b}` : `${b}-${a}`, [a, b]);
      }
    });
    edges.forEach(([a, b]) => lines.push([P(v[a]), P(v[b])]));
  }
  return { lines, circles };
}

function silhouetteSvg(model, phi) {
  const { lines, circles } = project(model, phi);
  const all = [...lines.flat(), ...circles.flat()];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  // Tight viewBox (100 units per metre) so the drawing fills whatever box the app places it in, and the
  // relative size between angles stays physical.
  const k = 100, pad = 4;
  const W = Math.ceil((maxX - minX) * k + 2 * pad), H = Math.ceil((maxY - minY) * k + 2 * pad);
  const f = ([x, y]) => `${((x - minX) * k + pad).toFixed(1)} ${((y - minY) * k + pad).toFixed(1)}`;
  const d = lines.map(([a, b]) => `M${f(a)}L${f(b)}`).join("") + circles.map((c) => `M${c.map(f).join("L")}`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="#fff" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;
}

mkdirSync('public/silhouettes', { recursive: true });
for (const [type, model] of Object.entries(MODELS)) {
  ANGLES.forEach((a, i) => writeFileSync(`public/silhouettes/${type}-${a}.svg`, silhouetteSvg(model, i * 45)));
}
console.log(`wrote ${TEMPLATES.length} templates and ${Object.keys(MODELS).length * ANGLES.length} silhouettes`);

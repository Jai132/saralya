import * as THREE from 'three';

/** Deterministic PRNG so the demo scenes look the same on every run. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, THREE.CanvasTexture>();

function tex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const k = `${key}|${repeat?.join('x') ?? ''}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(k, t);
  return t;
}

export function disposeTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

function shade(hex: string, f: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

/** Packaged-goods carton or pack face: coloured field, label band, fictitious brand text, barcode ticks. */
export function boxTexture(bg: string, label: string, sub: string) {
  return tex(`box:${bg}:${label}`, 256, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = shade(bg, 0.7);
    g.fillRect(0, 0, w, 18);
    g.fillRect(0, h - 18, w, 18);
    g.fillStyle = '#fdfaf3';
    g.fillRect(14, 70, w - 28, 92);
    g.fillStyle = shade(bg, 0.55);
    g.font = 'bold 34px Inter, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(label, w / 2, 118, w - 40);
    g.font = '600 20px Inter, Arial, sans-serif';
    g.fillText(sub, w / 2, 148, w - 40);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(52, 205, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#111';
    for (let i = 0; i < 22; i++) g.fillRect(120 + i * 5, 192, i % 3 ? 2 : 3, 34);
  });
}

export function sackTexture(label: string) {
  return tex(`sack:${label}`, 256, 256, (g, w, h) => {
    g.fillStyle = '#d8c7a0';
    g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(120,95,60,0.18)' : 'rgba(255,255,255,0.15)';
      g.fillRect(r() * w, r() * h, 3, 1);
    }
    g.strokeStyle = '#8a6d45';
    g.lineWidth = 3;
    g.setLineDash([8, 6]);
    g.strokeRect(10, 10, w - 20, h - 20);
    g.setLineDash([]);
    g.fillStyle = '#1d4ed8';
    g.font = 'bold 40px Inter, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(label, w / 2, h / 2);
    g.fillStyle = '#b91c1c';
    g.font = 'bold 26px Inter, Arial, sans-serif';
    g.fillText('25 KG', w / 2, h / 2 + 40);
  });
}

export function tileTexture(a: string, b: string, n: number, repeat: [number, number]) {
  return tex(`tile:${a}:${b}:${n}`, 256, 256, (g, w) => {
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? a : b;
        g.fillRect(x * s, y * s, s, s);
      }
    g.strokeStyle = 'rgba(60,50,40,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, w);
      g.moveTo(0, i * s);
      g.lineTo(w, i * s);
      g.stroke();
    }
  }, repeat);
}

export function wallTexture(color: string, repeat: [number, number]) {
  return tex(`wall:${color}`, 256, 256, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    // A few stains and cracks so plain walls still carry some texture.
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(40, 30);
    g.lineTo(55, 60);
    g.lineTo(50, 90);
    g.stroke();
  }, repeat);
}

export function brickTexture(repeat: [number, number]) {
  return tex('brick', 256, 256, (g, w, h) => {
    g.fillStyle = '#c9c1b5';
    g.fillRect(0, 0, w, h);
    const r = rng(11);
    const bh = 32;
    for (let y = 0; y < h / bh; y++) {
      const off = y % 2 ? 32 : 0;
      for (let x = -1; x < w / 64 + 1; x++) {
        const v = 0.8 + r() * 0.35;
        g.fillStyle = `rgb(${Math.round(168 * v)},${Math.round(82 * v)},${Math.round(60 * v)})`;
        g.fillRect(x * 64 + off + 2, y * bh + 2, 60, bh - 4);
      }
    }
  }, repeat);
}

export function concreteTexture(repeat: [number, number]) {
  return tex('concrete', 256, 256, (g, w, h) => {
    g.fillStyle = '#8e8e88';
    g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 2500; i++) {
      const v = 100 + r() * 80;
      g.fillStyle = `rgba(${v},${v},${v - 8},0.35)`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(40,40,40,0.4)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  }, repeat);
}

export function woodTexture() {
  return tex('wood', 256, 64, (g, w, h) => {
    g.fillStyle = '#8b5a2b';
    g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(60,30,10,${0.15 + r() * 0.2})`;
      g.beginPath();
      const y = r() * h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + r() * 6 - 3, w * 0.6, y + r() * 6 - 3, w, y);
      g.stroke();
    }
  });
}

export function plateTexture(text: string) {
  return tex(`plate:${text}`, 512, 110, (g, w, h) => {
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#111';
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#1d4ed8';
    g.fillRect(12, 12, 40, h - 24);
    g.fillStyle = '#fff';
    g.font = 'bold 16px Arial';
    g.fillText('IND', 16, h - 22);
    g.fillStyle = '#111';
    g.font = 'bold 66px "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(text, w / 2 + 20, h / 2 + 24);
  });
}

export function tyreTexture() {
  return tex('tyre', 256, 64, (g, w, h) => {
    g.fillStyle = '#1f2937';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#374151';
    for (let x = 0; x < w; x += 16) {
      g.fillRect(x, 8, 7, h - 16);
    }
  });
}

export function grilleTexture(body: string) {
  return tex(`grille:${body}`, 256, 256, (g, w, h) => {
    g.fillStyle = body;
    g.fillRect(0, 0, w, h);
    // Windscreen occupies the top half.
    g.fillStyle = '#1e293b';
    g.fillRect(14, 12, w - 28, h * 0.46);
    g.fillStyle = 'rgba(148,163,184,0.35)';
    g.beginPath();
    g.moveTo(30, 20);
    g.lineTo(90, 20);
    g.lineTo(40, h * 0.44);
    g.fill();
    // Grille slats.
    g.fillStyle = '#111827';
    g.fillRect(60, h * 0.6, w - 120, h * 0.24);
    g.fillStyle = '#6b7280';
    for (let y = h * 0.62; y < h * 0.82; y += 9) g.fillRect(64, y, w - 128, 3);
    // Headlamps.
    g.fillStyle = '#fef9c3';
    g.fillRect(16, h * 0.64, 34, 24);
    g.fillRect(w - 50, h * 0.64, 34, 24);
  });
}

export function sideWindowTexture(body: string) {
  return tex(`side:${body}`, 256, 256, (g, w, h) => {
    g.fillStyle = body;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e293b';
    g.fillRect(40, 20, w - 80, h * 0.4);
    g.strokeStyle = shade(body, 0.6);
    g.lineWidth = 4;
    g.strokeRect(30, h * 0.52, w - 60, h * 0.4);
    g.fillStyle = '#111';
    g.fillRect(w - 80, h * 0.6, 30, 8);
  });
}

export function carSideTexture(body: string) {
  return tex(`carside:${body}`, 512, 128, (g, w, h) => {
    g.fillStyle = body;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = shade(body, 0.55);
    g.lineWidth = 3;
    // Door shut lines and handles.
    g.beginPath();
    g.moveTo(w * 0.36, 6);
    g.lineTo(w * 0.36, h - 6);
    g.moveTo(w * 0.62, 6);
    g.lineTo(w * 0.62, h - 6);
    g.stroke();
    g.fillStyle = '#111';
    g.fillRect(w * 0.44, h * 0.3, 26, 7);
    g.fillRect(w * 0.7, h * 0.3, 26, 7);
    g.fillStyle = shade(body, 0.7);
    g.fillRect(0, h - 16, w, 16);
  });
}

export function glassTexture() {
  return tex('glass', 256, 128, (g, w, h) => {
    g.fillStyle = '#0f172a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#334155';
    g.fillRect(w * 0.48, 0, 10, h);
    g.fillStyle = 'rgba(148,163,184,0.3)';
    g.beginPath();
    g.moveTo(20, 10);
    g.lineTo(70, 10);
    g.lineTo(30, h - 10);
    g.fill();
  });
}

export function posterTexture(title: string) {
  return tex(`poster:${title}`, 256, 320, (g, w, h) => {
    g.fillStyle = '#fff7ed';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c2410c';
    g.fillRect(0, 0, w, 60);
    g.fillStyle = '#fff';
    g.font = 'bold 28px Inter, Arial';
    g.textAlign = 'center';
    g.fillText(title, w / 2, 40);
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 1;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 7; c++) {
        g.strokeRect(12 + c * 33, 80 + r * 44, 33, 44);
        g.fillStyle = '#334155';
        g.font = '14px Inter, Arial';
        g.fillText(String(r * 7 + c + 1), 28 + c * 33, 100 + r * 44);
      }
  });
}

export function signTexture(text: string, sub: string) {
  return tex(`sign:${text}`, 1024, 180, (g, w, h) => {
    g.fillStyle = '#b91c1c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fde68a';
    g.lineWidth = 8;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#fde68a';
    g.font = 'bold 80px Inter, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(text, w / 2, 100);
    g.fillStyle = '#fff';
    g.font = '600 32px Inter, Arial, sans-serif';
    g.fillText(sub, w / 2, 150);
  });
}

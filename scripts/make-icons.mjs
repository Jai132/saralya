// Rasterises the Saralya mark to PNG icons without any image dependencies.
// Usage: node scripts/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const NAVY = [11, 27, 52];
const TEAL = [20, 184, 166];
const WHITE = [255, 255, 255];
const EMBER = [194, 65, 12];

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, maskable) {
  const S = 4; // supersampling
  const raw = Buffer.alloc(size * (size * 4 + 1));
  // Mark geometry in a 64-unit box; maskable icons get extra safe-zone padding.
  const pad = maskable ? 0.12 : 0;
  const scale = (1 - 2 * pad) * size;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          const u = ((px - pad * size) / scale) * 64;
          const v = ((py - pad * size) / scale) * 64;
          const col = sample(u, v, px / size, py / size, maskable);
          if (col) {
            acc[0] += col[0];
            acc[1] += col[1];
            acc[2] += col[2];
            acc[3] += 255;
          }
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const n = S * S;
      const a = acc[3] / n;
      raw[o] = a ? acc[0] / (acc[3] / 255) : 0;
      raw[o + 1] = a ? acc[1] / (acc[3] / 255) : 0;
      raw[o + 2] = a ? acc[2] / (acc[3] / 255) : 0;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function sample(u, v, nx, ny, maskable) {
  // Background: full-bleed square for maskable, rounded square otherwise.
  if (!maskable) {
    const r = 16;
    const cx = Math.min(Math.max(u, r), 64 - r);
    const cy = Math.min(Math.max(v, r), 64 - r);
    if (u < 0 || v < 0 || u > 64 || v > 64 || Math.hypot(u - cx, v - cy) > r) return null;
  } else if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return null;

  const d = Math.hypot(u - 32, v - 32);
  if (Math.hypot(u - 46.5, v - 19) <= 3.2) return EMBER;
  if (d <= 6.5) return WHITE;
  if (Math.abs(d - 17) <= 2.5) {
    // Ring with a gap (dash 88 of circumference ~107), rotated -50°.
    let ang = (Math.atan2(v - 32, u - 32) * 180) / Math.PI + 50;
    ang = ((ang % 360) + 360) % 360;
    const arc = (ang / 360) * 2 * Math.PI * 17;
    if (arc <= 88) return TEAL;
  }
  return NAVY;
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, false));
writeFileSync('public/icons/icon-512.png', png(512, false));
writeFileSync('public/icons/maskable-512.png', png(512, true));
console.log('icons written');

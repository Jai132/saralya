/**
 * Planar homography from four point correspondences (direct linear transform) and a perspective warp.
 *
 * For each pair (x, y) → (u, v) with H = [[h0 h1 h2], [h3 h4 h5], [h6 h7 1]]:
 *   u = (h0·x + h1·y + h2) / (h6·x + h7·y + 1)
 *   v = (h3·x + h4·y + h5) / (h6·x + h7·y + 1)
 * which rearranges into two linear equations per pair, giving an 8×8 system solved with Gaussian elimination
 * and partial pivoting.
 */

export type Pt = [number, number];
/** Row-major 3×3 matrix as 9 numbers. */
export type Mat3 = number[];

/** Solves A·x = b in place (A is n×n, row-major arrays). Returns null if singular. */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Partial pivoting: bring the row with the largest |value| in this column up.
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    if (pivot !== col) [M[pivot], M[col]] = [M[col], M[pivot]];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
  }
  return x;
}

/** Homography mapping each src[i] to dst[i]. Needs exactly four pairs, no three collinear. */
export function solveHomography(src: Pt[], dst: Pt[]): Mat3 | null {
  if (src.length !== 4 || dst.length !== 4) throw new Error('solveHomography needs 4 correspondences');
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solveLinear(A, b);
  return h ? [...h, 1] : null;
}

export function applyH(H: Mat3, [x, y]: Pt): Pt {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

export function invert3(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const inv = [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d];
  return inv.map((v) => v / det);
}

/** True if the quad's corners are in a consistent winding with no self-intersection (convex). */
export function isConvexQuad(q: Pt[]): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = q[i];
    const [bx, by] = q[(i + 1) % 4];
    const [cx, cy] = q[(i + 2) % 4];
    const z = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (Math.abs(z) < 1e-9) return false;
    const s = Math.sign(z);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

export interface RGBAImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Rectifies the quad `srcQuad` (TL, TR, BR, BL in source pixels) into an outW×outH image by inverse-mapping
 * every output pixel through the homography and sampling the source bilinearly.
 */
export function warpQuad(src: RGBAImage, srcQuad: Pt[], outW: number, outH: number, out?: Uint8ClampedArray): RGBAImage | null {
  const dstQuad: Pt[] = [
    [0, 0],
    [outW, 0],
    [outW, outH],
    [0, outH],
  ];
  // Map output → source directly, so no inversion is needed.
  const H = solveHomography(dstQuad, srcQuad);
  if (!H) return null;
  const data = out && out.length === outW * outH * 4 ? out : new Uint8ClampedArray(outW * outH * 4);
  const { data: s, width: sw, height: sh } = src;
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H;
  let o = 0;
  for (let y = 0; y < outH; y++) {
    const yy = y + 0.5;
    for (let x = 0; x < outW; x++) {
      const xx = x + 0.5;
      const w = h6 * xx + h7 * yy + h8;
      const u = (h0 * xx + h1 * yy + h2) / w - 0.5;
      const v = (h3 * xx + h4 * yy + h5) / w - 0.5;
      if (u < 0 || v < 0 || u > sw - 1 || v > sh - 1) {
        data[o] = data[o + 1] = data[o + 2] = 20;
        data[o + 3] = 255;
        o += 4;
        continue;
      }
      const x0 = u | 0;
      const y0 = v | 0;
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = u - x0;
      const fy = v - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      for (let c = 0; c < 3; c++) {
        const top = s[i00 + c] + (s[i10 + c] - s[i00 + c]) * fx;
        const bot = s[i01 + c] + (s[i11 + c] - s[i01 + c]) * fx;
        data[o + c] = top + (bot - top) * fy;
      }
      data[o + 3] = 255;
      o += 4;
    }
  }
  return { data, width: outW, height: outH };
}

/** Mean pixels-per-millimetre along the quad's edges, given the real size of the rectangle it covers. */
export function scalePxPerMm(quad: Pt[], widthMm: number, heightMm: number): number {
  const d = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const top = d(quad[0], quad[1]);
  const bottom = d(quad[3], quad[2]);
  const left = d(quad[0], quad[3]);
  const right = d(quad[1], quad[2]);
  return ((top + bottom) / 2 / widthMm + (left + right) / 2 / heightMm) / 2;
}

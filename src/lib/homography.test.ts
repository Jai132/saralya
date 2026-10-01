import { describe, expect, it } from 'vitest';
import { applyH, invert3, isConvexQuad, Pt, scalePxPerMm, solveHomography, solveLinear, warpQuad } from './homography';

const unit: Pt[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function close(a: Pt, b: Pt, eps = 1e-6) {
  expect(a[0]).toBeCloseTo(b[0], Math.round(-Math.log10(eps)));
  expect(a[1]).toBeCloseTo(b[1], Math.round(-Math.log10(eps)));
}

describe('solveLinear', () => {
  it('solves a system that needs pivoting', () => {
    // First pivot is 0, so naive elimination would divide by zero.
    const x = solveLinear(
      [
        [0, 2, 1],
        [1, 1, 1],
        [2, 1, 3],
      ],
      [5, 5, 12],
    )!;
    expect(x[0]).toBeCloseTo(1);
    expect(x[1]).toBeCloseTo(1);
    expect(x[2]).toBeCloseTo(3);
  });

  it('returns null for a singular matrix', () => {
    expect(
      solveLinear(
        [
          [1, 2],
          [2, 4],
        ],
        [1, 2],
      ),
    ).toBeNull();
  });
});

describe('solveHomography', () => {
  it('gives the identity for identical quads', () => {
    const H = solveHomography(unit, unit)!;
    const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    H.forEach((v, i) => expect(v).toBeCloseTo(I[i], 9));
  });

  it('recovers a known scaling and translation', () => {
    const dst: Pt[] = unit.map(([x, y]) => [3 * x + 10, 2 * y - 5]);
    const H = solveHomography(unit, dst)!;
    close(applyH(H, [0.5, 0.25]), [11.5, -4.5]);
    expect(H[6]).toBeCloseTo(0, 9);
    expect(H[7]).toBeCloseTo(0, 9);
  });

  it('maps all four corners of a perspective quad exactly, and inverts', () => {
    const src: Pt[] = [
      [102, 87],
      [530, 140],
      [498, 410],
      [80, 380],
    ];
    const dst: Pt[] = [
      [0, 0],
      [600, 0],
      [600, 300],
      [0, 300],
    ];
    const H = solveHomography(src, dst)!;
    src.forEach((p, i) => close(applyH(H, p), dst[i], 1e-6));
    const Hi = invert3(H)!;
    dst.forEach((p, i) => close(applyH(Hi, p), src[i], 1e-6));
    // A straight line stays straight: the midpoint of the top edge maps onto the top edge (v = 0).
    const mid: Pt = [(src[0][0] + src[1][0]) / 2, (src[0][1] + src[1][1]) / 2];
    expect(applyH(H, mid)[1]).toBeCloseTo(0, 6);
  });

  it('fails for degenerate (collinear) input', () => {
    const line: Pt[] = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ];
    expect(solveHomography(line, unit)).toBeNull();
  });
});

describe('warpQuad', () => {
  it('rectifies an axis-aligned region exactly', () => {
    // 4×4 source with a distinct value per pixel; rectify the central 2×2 block into a 2×2 output.
    const w = 4;
    const data = new Uint8ClampedArray(w * w * 4);
    for (let i = 0; i < w * w; i++) data.set([i * 10, 0, 0, 255], i * 4);
    const out = warpQuad({ data, width: w, height: w }, [
      [1, 1],
      [3, 1],
      [3, 3],
      [1, 3],
    ], 2, 2)!;
    expect([out.data[0], out.data[4], out.data[8], out.data[12]]).toEqual([50, 60, 90, 100]);
  });
});

describe('helpers', () => {
  it('detects convex vs self-intersecting quads', () => {
    expect(isConvexQuad(unit)).toBe(true);
    expect(
      isConvexQuad([
        [0, 0],
        [1, 1],
        [1, 0],
        [0, 1],
      ]),
    ).toBe(false);
  });

  it('recovers pixels per millimetre from a known plate size', () => {
    // A 500×120 mm plate seen at exactly 2 px/mm.
    const q: Pt[] = [
      [10, 10],
      [1010, 10],
      [1010, 250],
      [10, 250],
    ];
    expect(scalePxPerMm(q, 500, 120)).toBeCloseTo(2, 9);
  });
});

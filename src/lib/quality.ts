import type { Gray } from './features';

export interface Quality {
  /** Mean luma, 0–255. */
  brightness: number;
  /** Variance of the 4-neighbour Laplacian — higher is sharper. */
  sharpness: number;
}

export function measureQuality(img: Gray): Quality {
  const { data, width: w, height: h } = img;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const brightness = sum / data.length;

  let n = 0, m = 0, m2 = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = data[i - 1] + data[i + 1] + data[i - w] + data[i + w] - 4 * data[i];
      n++;
      const d = lap - m;
      m += d / n;
      m2 += d * (lap - m);
    }
  }
  return { brightness, sharpness: n > 1 ? m2 / (n - 1) : 0 };
}

export type QualityVerdict = 'ok' | 'dark' | 'bright' | 'blur' | 'moving';

export const QUALITY_LIMITS = {
  minBrightness: 45,
  maxBrightness: 235,
  minSharpness: 40,
  /** Median image flow in analysis pixels per frame above which we ask the user to hold steady. */
  maxMotion: 6,
};

export function verdict(q: Quality, motion: number): QualityVerdict {
  if (q.brightness < QUALITY_LIMITS.minBrightness) return 'dark';
  if (q.brightness > QUALITY_LIMITS.maxBrightness) return 'bright';
  if (motion > QUALITY_LIMITS.maxMotion) return 'moving';
  if (q.sharpness < QUALITY_LIMITS.minSharpness) return 'blur';
  return 'ok';
}

export const VERDICT_TEXT: Record<QualityVerdict, string> = {
  ok: 'Good light · sharp',
  dark: 'Too dark — turn on a light or the torch',
  bright: 'Too bright — avoid pointing at the sun',
  blur: 'Hold steady — image is blurry',
  moving: 'Hold steady — moving too fast',
};

import { describe, expect, it } from 'vitest';
import { areaRangeSqft, ASBUILT_ROOMS, PLAN_ROOMS, parcelFor, parcelPolygon, SHADOW } from './property';

describe('property dummy data', () => {
  it('as-built area reads 640–720 sq ft, 25% over the plan', () => {
    expect(areaRangeSqft(ASBUILT_ROOMS)).toEqual([640, 720]);
    const a = (rs: typeof PLAN_ROOMS) => rs.reduce((s, r) => s + r.w * r.h, 0);
    expect(a(ASBUILT_ROOMS) / a(PLAN_ROOMS)).toBeCloseTo(1.25, 2);
  });
  it('gives a 14-character ULPIN starting 28, stable per location', () => {
    const p = parcelFor(26.27412, 73.00594);
    expect(p.ulpin).toMatch(/^28\d{12}$/);
    expect(parcelFor(26.27412, 73.00594).ulpin).toBe(p.ulpin);
  });
  it('draws a parcel of roughly the plot size around the point', () => {
    const poly = parcelPolygon(26.27, 73.0);
    expect(poly).toHaveLength(4);
    const dLat = Math.max(...poly.map((p) => p[0])) - Math.min(...poly.map((p) => p[0]));
    expect(dLat * 111320).toBeGreaterThan(10);
    expect(dLat * 111320).toBeLessThan(20);
  });
  it('shadow explainer: 16 m at 34° ≈ 10.8 m ≈ 3 floors', () => {
    const h = SHADOW.shadowM * Math.tan((SHADOW.sunElevDeg * Math.PI) / 180);
    expect(h).toBeCloseTo(10.8, 1);
    expect(Math.round(h / SHADOW.floorHeightM)).toBe(3);
  });
});

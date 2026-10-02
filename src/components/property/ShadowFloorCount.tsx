import { SHADOW } from '../../data/property';

/** Illustrative: building height from its shadow length and the sun's elevation at capture time. */
export function ShadowFloorCount() {
  const { shadowM, sunElevDeg, floorHeightM, sanctionedFloors } = SHADOW;
  const th = (sunElevDeg * Math.PI) / 180;
  const h = shadowM * Math.tan(th);
  const floors = Math.round(h / floorHeightM);
  // Diagram: ground line at gy, building between x0 and x1, shadow running right.
  const s = 7; // px per metre
  const bh = h * s;
  const L = shadowM * s;
  const x0 = 34, x1 = 70, gy = 128;
  const tip = x1 + L;
  return (
    <div>
      <svg viewBox="0 0 300 150" className="w-full">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e0f2fe" />
            <stop offset="1" stopColor="#f8fafc" />
          </linearGradient>
        </defs>
        <rect width="300" height="150" rx="10" fill="url(#sky)" />
        <line x1="8" x2="292" y1={gy} y2={gy} stroke="#64748b" strokeWidth="1.5" />
        <rect x={x1} y={gy - 3} width={L} height={6} fill="#334155" opacity="0.4" />
        <rect x={x0} y={gy - bh} width={x1 - x0} height={bh} fill="#f5e6c8" stroke="#a16207" />
        {Array.from({ length: floors - 1 }, (_, i) => (
          <line key={i} x1={x0} x2={x1} y1={gy - ((i + 1) * bh) / floors} y2={gy - ((i + 1) * bh) / floors} stroke="#a16207" strokeDasharray="3 2" />
        ))}
        {/* Sun ray over the roof edge to the shadow tip. */}
        <line x1={tip} y1={gy} x2={x1 - 14} y2={gy - bh - 14 * Math.tan(th)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx={x1 - 22} cy={gy - bh - 22 * Math.tan(th) - 2} r="8" fill="#fbbf24" />
        <path d={`M ${tip - 28} ${gy} A 28 28 0 0 1 ${tip - 28 * Math.cos(th)} ${gy - 28 * Math.sin(th)}`} fill="none" stroke="#b45309" />
        <text x={tip - 64} y={gy - 6} fontSize="10" fill="#92400e">
          θ = {sunElevDeg}°
        </text>
        <text x={x1 + L / 2} y={gy + 16} textAnchor="middle" fontSize="10" fill="#334155">
          shadow L = {shadowM} m
        </text>
        <text x={x0 - 5} y={gy - bh / 2} textAnchor="end" fontSize="11" fill="#334155">
          h
        </text>
      </svg>
      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-center font-mono text-[13px] text-navy">
        h = L × tan θ = {shadowM} × tan {sunElevDeg}° ≈ {h.toFixed(1)} m ≈ {floors} floors
      </div>
      <p className="mt-1.5 text-center text-xs text-ink-soft">
        {floors} floors seen · {sanctionedFloors} on the sanctioned plan
      </p>
    </div>
  );
}

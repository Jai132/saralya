import { ANGLE_FILES, SilhouetteType } from '../../data/vehicles';
import { asset } from '../../lib/storage';
import { GHOST_BOX } from '../capture/engines/types';

/** Ghost outline of the vehicle for the current angle, centred over the camera view. */
export function VehicleGhost({ type, angle }: { type: SilhouetteType; angle: number }) {
  const b = GHOST_BOX;
  return (
    <div className="absolute" style={{ left: `${b.left * 100}%`, width: `${b.width * 100}%`, top: `${b.top * 100}%`, height: `${b.height * 100}%` }}>
      <img
        key={`${type}-${angle}`}
        src={asset(`silhouettes/${type}-${ANGLE_FILES[angle]}.svg`)}
        alt=""
        className="h-full w-full animate-fadeUp object-contain opacity-75 drop-shadow-[0_0_5px_rgba(0,0,0,0.7)]"
        draggable={false}
      />
    </div>
  );
}

/**
 * Top-down vehicle icon ringed by 8 segments, one per capture angle. Segment 0 is the front (top),
 * then anticlockwise round the vehicle's left side, matching the walkaround order.
 */
export function AngleRing({ done, current, size = 96 }: { done: boolean[]; current: number; size?: number }) {
  const c = size / 2;
  const R = size / 2 - 6;
  const seg = (Math.PI * 2) / 8;
  const arc = (i: number) => {
    // Angle i sits at the front rotated towards the vehicle's left; on screen (top-down, front up) left is on the left.
    const mid = -Math.PI / 2 - i * seg;
    const a0 = mid + seg / 2 - 0.06;
    const a1 = mid - seg / 2 + 0.06;
    const p = (a: number) => `${c + R * Math.cos(a)} ${c + R * Math.sin(a)}`;
    return `M ${p(a0)} A ${R} ${R} 0 0 0 ${p(a1)}`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow">
      <circle cx={c} cy={c} r={R + 4} fill="rgba(11,27,52,0.65)" />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d={arc(i)}
          fill="none"
          strokeWidth={i === current ? 7 : 5}
          strokeLinecap="round"
          stroke={done[i] ? '#2dd4bf' : i === current ? '#ffffff' : 'rgba(255,255,255,0.22)'}
          className={i === current && !done[i] ? 'animate-pulseDot' : ''}
        />
      ))}
      {/* Top-down vehicle, front up. */}
      <g transform={`translate(${c - 11} ${c - 22})`}>
        <rect x="0" y="0" width="22" height="44" rx="7" fill="none" stroke="#fff" strokeWidth="2" />
        <rect x="4" y="9" width="14" height="9" rx="2" fill="rgba(255,255,255,0.35)" />
        <rect x="4" y="30" width="14" height="6" rx="2" fill="rgba(255,255,255,0.2)" />
      </g>
      <text x={c} y={size - 3} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">
        {done.filter(Boolean).length}/8
      </text>
    </svg>
  );
}

import { ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react';
import type { ShellState } from '../../../components/capture/CaptureShell';
import { AngleRing, VehicleGhost } from '../../../components/vehicle/AngleRing';
import type { SilhouetteType } from '../../../data/vehicles';

export function walkaroundOverlay(type: SilhouetteType) {
  return function Overlay(s: ShellState) {
    const done = Array.from({ length: 8 }, (_, i) => (s.shots[`angle-${i}`] ?? 0) > 0);
    return (
      <>
        <VehicleGhost type={type} angle={s.stepIdx} />
        <div className="absolute bottom-[31%] right-3">
          <AngleRing done={done} current={s.stepIdx} size={92} />
        </div>
      </>
    );
  };
}

const GUIDES: Record<string, { aspect: number; label: string; width: string }> = {
  plate: { aspect: 500 / 120, label: 'Number plate', width: '78%' },
  'chassis-l': { aspect: 300 / 60, label: 'Stamped chassis number', width: '80%' },
  'chassis-c': { aspect: 300 / 60, label: 'Stamped chassis number', width: '80%' },
  'chassis-r': { aspect: 300 / 60, label: 'Stamped chassis number', width: '80%' },
  engine: { aspect: 4, label: 'Engine number', width: '70%' },
  odometer: { aspect: 2.4, label: 'Odometer', width: '62%' },
  tyres: { aspect: 1, label: 'Tyre sidewall · DOT code', width: '58%' },
};

/** Framing guide for each identity close-up, with the torch position hint for the relief captures. */
export function closeupOverlay(s: ShellState) {
  const g = GUIDES[s.step.id];
  if (!g) return null;
  const torch = s.step.id.startsWith('chassis-') ? s.step.id.slice(-1) : null;
  return (
    // Centred on the view, which is where the camera (and the demo autopilot) aims.
    <div className="absolute inset-0 flex flex-col items-center justify-center pt-[calc(2.4rem+6%)]">
      <div className="relative rounded-xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" style={{ width: g.width, aspectRatio: `${g.aspect}` }}>
        {['-left-1 -top-1 border-l-4 border-t-4', '-right-1 -top-1 border-r-4 border-t-4', '-bottom-1 -left-1 border-b-4 border-l-4', '-bottom-1 -right-1 border-b-4 border-r-4'].map((c) => (
          <span key={c} className={`absolute h-5 w-5 rounded-sm border-teal-light ${c}`} />
        ))}
      </div>
      <div className="mt-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">{g.label}</div>
      {torch && (
        <div className="mt-1.5 flex items-center gap-2 rounded-full bg-yellow-300/90 px-3 py-1 text-xs font-bold text-navy">
          {torch === 'l' ? <ArrowLeft className="h-4 w-4" /> : torch === 'r' ? <ArrowRight className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          Torch {torch === 'l' ? 'from the left' : torch === 'r' ? 'from the right' : 'straight on'}
        </div>
      )}
    </div>
  );
}

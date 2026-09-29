import type { DemoHint } from '../components/capture/engines/types';

export interface ChallengeDef {
  id: string;
  /** Instruction; `{code}` is replaced by a fresh random 4-digit code. */
  text: string;
  demoHint?: DemoHint;
}

/**
 * Server-style liveness challenges: unpredictable, time-boxed physical actions that a pre-recorded or staged
 * video cannot satisfy. In production the server issues them and a small classifier verifies each one.
 */
export const CHALLENGES: Record<string, ChallengeDef> = {
  ceiling: { id: 'ceiling', text: 'Pan to the ceiling now', demoHint: 'look-up' },
  floor: { id: 'floor', text: 'Point the camera at the floor', demoHint: 'look-down' },
  code: { id: 'code', text: 'Write this code on paper and show it: {code}' },
  circle: { id: 'circle', text: 'Turn slowly in a full circle', demoHint: 'circle' },
  carton: { id: 'carton', text: 'Open the third carton on the left' },
  scale: { id: 'scale', text: 'Place any item on the weighing scale' },
  door: { id: 'door', text: 'Stand at the main door and pan a full circle', demoHint: 'circle' },
  meter: { id: 'meter', text: 'Show the electricity meter now' },
  plate: { id: 'plate', text: 'Show the rear number plate now' },
  hand: { id: 'hand', text: 'Hold up three fingers in front of the camera' },
};

export const CHALLENGE_WINDOW_S = 15;

export function randomCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

import type { DemoHint, DemoVariant, FlowKind } from '../components/capture/engines/types';

export interface CaptureStep {
  id: string;
  title: string;
  /** Plain-language instruction shown in the prompt banner. */
  prompt: string;
  /** photo: tap the shutter `shots` times. sweep: pan steadily; keyframes are sealed automatically. */
  kind: 'photo' | 'sweep';
  shots?: number;
  /** Degrees of new heading a sweep must cover. */
  sweepDeg?: number;
  /** Challenge id from data/challenges, or 'random' to draw from the script's pool. */
  challenge?: string;
  demoHint?: DemoHint;
}

export interface CaptureScript {
  id: string;
  title: string;
  flow: FlowKind;
  demo: DemoVariant;
  steps: CaptureStep[];
  challengePool: string[];
}

export const MSME_SCRIPT: CaptureScript = {
  id: 'msme-walkthrough',
  title: 'Walk us through your shop',
  flow: 'msme',
  demo: 'shop',
  challengePool: ['ceiling', 'code', 'carton', 'scale', 'hand'],
  steps: [
    { id: 'frontage', title: 'Frontage & signboard', prompt: 'Stand outside and capture the shop front with the signboard readable', kind: 'photo', shots: 1 },
    { id: 'counter', title: 'Counter & weighing scale', prompt: 'Show the counter and the weighing scale', kind: 'photo', shots: 1, challenge: 'random' },
    { id: 'shelf-left', title: 'Left shelf wall', prompt: 'Slowly pan across the left shelf wall, top to bottom', kind: 'sweep', sweepDeg: 50 },
    { id: 'shelf-back', title: 'Back shelf wall', prompt: 'Slowly pan across the back wall of shelves', kind: 'sweep', sweepDeg: 50, challenge: 'carton' },
    { id: 'shelf-right', title: 'Right shelf wall', prompt: 'Slowly pan across the right shelf wall', kind: 'sweep', sweepDeg: 50 },
    { id: 'storage', title: 'Back room / storage', prompt: 'Show the back room or wherever extra stock is kept', kind: 'photo', shots: 2, challenge: 'ceiling' },
  ],
};

export const LAP_SCRIPT: CaptureScript = {
  id: 'lap-walkaround',
  title: 'Show us the property',
  flow: 'lap',
  demo: 'house',
  challengePool: ['door', 'meter', 'code', 'ceiling'],
  steps: [
    { id: 'road', title: 'Approach road', prompt: 'Capture the road leading to the property', kind: 'photo', shots: 1 },
    { id: 'frontage', title: 'Frontage', prompt: 'Capture the full front of the building', kind: 'photo', shots: 1 },
    { id: 'elevations', title: 'Side elevations', prompt: 'Walk around and capture each accessible side', kind: 'photo', shots: 2 },
    { id: 'interior', title: 'Room-by-room interior', prompt: 'Walk slowly through every room, panning each wall', kind: 'sweep', sweepDeg: 160, challenge: 'door' },
    { id: 'meter', title: 'Electricity meter & doorplate', prompt: 'Show the electricity meter, then the doorplate', kind: 'photo', shots: 2, challenge: 'meter' },
  ],
};

export function vehicleScript(kind: 'car' | 'cv'): CaptureScript {
  const angles = ['Front', 'Front-¾ left', 'Left side', 'Rear-¾ left', 'Rear', 'Rear-¾ right', 'Right side', 'Front-¾ right'];
  return {
    id: `vehicle-8angle-${kind}`,
    title: '8-angle walkaround',
    flow: 'vehicle',
    demo: kind === 'car' ? 'car' : 'truck',
    challengePool: ['plate', 'code', 'hand'],
    steps: angles.map((a, i) => ({
      id: `angle-${i}`,
      title: a,
      prompt: `Line the vehicle up with the outline — ${a.toLowerCase()}`,
      kind: 'photo' as const,
      shots: 1,
      ...(i === 4 ? { challenge: 'code' } : {}),
    })),
  };
}

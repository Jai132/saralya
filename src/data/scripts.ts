import type { DemoHint, DemoVariant, FlowKind } from '../components/capture/engines/types';

export interface CaptureStep {
  id: string;
  title: string;
  /** Plain-language instruction shown in the prompt banner. */
  prompt: string;
  /**
   * photo: tap the shutter `shots` times. sweep: pan steadily; keyframes are sealed automatically.
   * challenge: the step is the challenge itself — it completes once the challenge is verified (a frame is sealed then).
   */
  kind: 'photo' | 'sweep' | 'challenge';
  /** Demo-scene camera target for this step (e.g. 'angle-3', 'plate'). */
  focus?: string;
  /** Switch the torch on for this step where supported. */
  torch?: boolean;
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
    { id: 'frontage', title: 'Frontage & signboard', prompt: 'Stand outside and capture the shop front with the signboard readable', kind: 'photo', shots: 1, focus: 'frontage' },
    { id: 'counter', title: 'Counter & weighing scale', prompt: 'Show the counter and the weighing scale', kind: 'photo', shots: 1, focus: 'counter', challenge: 'code' },
    { id: 'shelf-left', title: 'Left shelf wall', prompt: 'Slowly pan across the left shelf wall, top to bottom', kind: 'sweep', sweepDeg: 50, focus: 'shelf-left' },
    { id: 'shelf-back', title: 'Back shelf wall', prompt: 'Slowly pan across the back wall of shelves', kind: 'sweep', sweepDeg: 50, focus: 'shelf-back', challenge: 'carton' },
    { id: 'shelf-right', title: 'Right shelf wall', prompt: 'Slowly pan across the right shelf wall', kind: 'sweep', sweepDeg: 50, focus: 'shelf-right' },
    { id: 'storage', title: 'Back room / storage', prompt: 'Show the back room or wherever extra stock is kept', kind: 'photo', shots: 2, focus: 'storage', challenge: 'ceiling' },
  ],
};

export const MSME_METER_SCRIPT: CaptureScript = {
  id: 'msme-meter',
  title: 'Electricity meter',
  flow: 'msme',
  demo: 'shop',
  challengePool: [],
  steps: [{ id: 'meter', title: 'Electricity meter', prompt: 'Fill the box with the meter so the kWh reading is sharp', kind: 'photo', shots: 1, focus: 'meter' }],
};

export const LAP_SCRIPT: CaptureScript = {
  id: 'lap-walkaround',
  title: 'Show us the property',
  flow: 'lap',
  demo: 'house',
  challengePool: ['door', 'meter', 'code', 'ceiling'],
  steps: [
    { id: 'road', title: 'Approach road', prompt: 'Capture the road leading to the property', kind: 'photo', shots: 1, focus: 'road' },
    { id: 'frontage', title: 'Frontage', prompt: 'Stand back and capture the full front of the building', kind: 'photo', shots: 1, focus: 'frontage' },
    { id: 'elev-east', title: 'Side elevation (right)', prompt: 'Walk to the right side and capture that wall', kind: 'photo', shots: 1, focus: 'elev-east' },
    { id: 'elev-west', title: 'Side elevation (left)', prompt: 'Now the left side, if you can reach it', kind: 'photo', shots: 1, focus: 'elev-west' },
    { id: 'roof', title: 'Roof', prompt: 'If it’s safe, capture the roof from the stairs or terrace', kind: 'photo', shots: 1, focus: 'roof' },
    { id: 'interior', title: 'Room-by-room interior', prompt: 'Walk slowly through every room, panning each wall', kind: 'sweep', sweepDeg: 160, focus: 'interior', challenge: 'door' },
    { id: 'meter', title: 'Electricity meter', prompt: 'Capture the electricity meter', kind: 'photo', shots: 1, focus: 'meter', challenge: 'meter' },
    { id: 'doorplate', title: 'Doorplate', prompt: 'Capture the house number or doorplate', kind: 'photo', shots: 1, focus: 'doorplate' },
  ],
};

export const LAP_PLAN_SCRIPT: CaptureScript = {
  id: 'lap-plan',
  title: 'Sanctioned plan',
  flow: 'lap',
  demo: 'house',
  challengePool: [],
  steps: [{ id: 'plan', title: 'Sanctioned plan', prompt: 'Lay the sanctioned plan flat and fill the box with it', kind: 'photo', shots: 1, focus: 'plan' }],
};

const ANGLES = ['Front', 'Front-¾ left', 'Left side', 'Rear-¾ left', 'Rear', 'Rear-¾ right', 'Right side', 'Front-¾ right'];

function vehicleDemo(kind: 'car' | 'cv', sub?: string): DemoVariant {
  if (kind === 'car') return 'car';
  return sub === 'tipper' ? 'tipper' : sub === 'pickup' ? 'pickup' : 'truck';
}

export function vehicleScript(kind: 'car' | 'cv', sub?: string): CaptureScript {
  return {
    id: `vehicle-8angle-${kind}`,
    title: '8-angle walkaround',
    flow: 'vehicle',
    demo: vehicleDemo(kind, sub),
    challengePool: ['plate', 'code', 'hand'],
    steps: ANGLES.map((a, i) => ({
      id: `angle-${i}`,
      title: a,
      prompt: `Walk to the ${a.toLowerCase()} and fit the vehicle inside the outline`,
      kind: 'photo' as const,
      shots: 1,
      focus: `angle-${i}`,
      ...(i === 4 ? { challenge: 'code' } : {}),
    })),
  };
}

export function vehicleCloseupScript(kind: 'car' | 'cv', sub?: string): CaptureScript {
  return {
    id: `vehicle-closeups-${kind}`,
    title: 'Identity close-ups',
    flow: 'vehicle',
    demo: vehicleDemo(kind, sub),
    challengePool: ['code', 'hand'],
    steps: [
      { id: 'plate', title: 'Number plate', prompt: 'Fill the box with the front number plate, straight on', kind: 'photo', shots: 1, focus: 'plate' },
      { id: 'chassis-l', title: 'Chassis no. · torch left', prompt: 'Torch on. Hold the phone to the LEFT of the stamped chassis number', kind: 'photo', shots: 1, focus: 'chassis-l', torch: true },
      { id: 'chassis-c', title: 'Chassis no. · torch centre', prompt: 'Now hold the phone straight in front of the chassis number', kind: 'photo', shots: 1, focus: 'chassis-c', torch: true },
      { id: 'chassis-r', title: 'Chassis no. · torch right', prompt: 'Now hold the phone to the RIGHT of the chassis number', kind: 'photo', shots: 1, focus: 'chassis-r', torch: true },
      { id: 'engine', title: 'Engine number', prompt: 'Open the bonnet and capture the stamped engine number', kind: 'photo', shots: 1, focus: 'engine' },
      { id: 'odometer', title: 'Odometer', prompt: 'Ignition on — capture the odometer reading', kind: 'photo', shots: 1, focus: 'odo' },
      { id: 'tyres', title: 'Tyres', prompt: 'Capture a tyre sidewall so the DOT code is readable', kind: 'photo', shots: 1, focus: 'tyre' },
    ],
  };
}

export function actuationScript(kind: 'car' | 'cv', sub: string | undefined, actions: string[]): CaptureScript {
  return {
    id: `vehicle-actuation-${kind}`,
    title: 'Prove you have the vehicle',
    flow: 'vehicle',
    demo: vehicleDemo(kind, sub),
    challengePool: actions,
    steps: actions.map((a, i) => ({
      id: `act-${i}`,
      title: `Action ${i + 1} of ${actions.length}`,
      prompt: 'Do the action shown below, keeping it in view, then tap Done',
      kind: 'challenge' as const,
      challenge: a,
      focus: 'angle-1',
    })),
  };
}

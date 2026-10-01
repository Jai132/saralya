import type { Pt } from '../../../lib/homography';
import type { RcRecord } from '../../../data/vehicles';
import type { CaptureSummary } from '../../../components/capture/CaptureShell';

export type VehicleStage = 'rc' | 'walkaround' | 'closeups' | 'identity' | 'calibrate' | 'actuation-intro' | 'actuation' | 'condition';

export interface Calibration {
  corners: Pt[];
  captureId: string;
  rectBlobId: string;
  pxPerMm?: number;
  at: number;
}

/** Everything the vehicle flow collects, kept in application.flow.vehicle so a refresh resumes. */
export interface VehicleFlowState {
  stage: VehicleStage;
  rc?: RcRecord;
  /** stepId → latest captureId, for the walkaround angles and the identity close-ups. */
  angleCaps: Record<string, string>;
  closeCaps: Record<string, string>;
  calibrations: Record<string, Calibration>;
  actions?: string[];
  sessions: Partial<Record<'walkaround' | 'closeups' | 'actuation', CaptureSummary>>;
}

export const initialVehicleState: VehicleFlowState = {
  stage: 'rc',
  angleCaps: {},
  closeCaps: {},
  calibrations: {},
  sessions: {},
};

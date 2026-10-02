import type { CaptureSummary } from '../../../components/capture/CaptureShell';
import type { PropertyProduct, PropertyType } from '../../../data/property';

export type PropertyStage = 'type' | 'location' | 'records' | 'walkaround' | 'plan-intro' | 'plan-capture' | 'plan' | 'summary';

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy: number;
  fixes: number;
  /** True when no GPS fix was available and the demo location was used. */
  demo: boolean;
  ulpin: string;
  survey: string;
  village: string;
  at: number;
}

/** Everything the property flow collects, kept in application.flow.property so a refresh resumes. */
export interface PropertyFlowState {
  stage: PropertyStage;
  type?: PropertyType;
  product?: PropertyProduct;
  location?: LocationFix;
  recordsPulled?: boolean;
  /** stepId → latest captureId. */
  caps: Record<string, string>;
  sessions: Partial<Record<'walkaround' | 'plan', CaptureSummary>>;
}

export const initialPropertyState: PropertyFlowState = { stage: 'type', caps: {}, sessions: {} };

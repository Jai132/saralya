import type { CaptureSummary } from '../../../components/capture/CaptureShell';

export type MsmeStage = 'intro' | 'walkthrough' | 'qr' | 'meter' | 'meter-result' | 'done';

export interface QrScan {
  /** Exactly what the QR decoded to. */
  text: string;
  captureId: string;
  at: number;
}

/** Everything the shop walkthrough collects, kept in application.flow.msme so a refresh resumes. */
export interface MsmeFlowState {
  stage: MsmeStage;
  /** stepId → latest captureId. */
  caps: Record<string, string>;
  upi?: QrScan;
  gst?: QrScan;
  gstSkipped?: boolean;
  sessions: Partial<Record<'walkthrough' | 'meter', CaptureSummary>>;
  /** When snapshot 1 was sealed, and the window for the snapshot-2 re-capture. */
  snapshot1At?: number;
  snapshot2Due?: { from: number; to: number };
}

export const initialMsmeState: MsmeFlowState = { stage: 'intro', caps: {}, sessions: {} };

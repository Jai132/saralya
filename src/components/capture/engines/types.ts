import type { EngineKind } from '../../../store/captures';
import type { Pose } from '../../../lib/sensors';

export type FlowKind = 'msme' | 'lap' | 'vehicle';
export type DemoVariant = 'shop' | 'house' | 'car' | 'truck';

/** Hints a capture step can send to the synthetic scene so the autopilot acts out a challenge. */
export type DemoHint = 'look-up' | 'look-down' | 'circle' | null;

/**
 * A frame engine owns the full-bleed background (video, WebGL canvas…) and exposes a frame source that the
 * shared analyser samples for feature points and quality. The HUD is identical across engines.
 */
export interface FrameEngine {
  kind: EngineKind;
  /** Short label for the HUD, e.g. "Camera" or "Demo scene". */
  label: string;
  /** Element drawn with drawImage() by the analyser and the frame grabber. */
  source: CanvasImageSource;
  /** Natural size of `source` in pixels. */
  size(): { w: number; h: number };
  /** Whether `source` is displayed object-fit: cover (video) or already matches the viewport (canvas). */
  cover: boolean;
  /** Device/scene pose when the engine knows it (demo scene, WebXR). */
  pose?(): Pose | null;
  /** Metric-ish distance along the view ray at normalised image coords (u,v ∈ [−1,1]), when known. */
  depthAt?(u: number, v: number): number | null;
  /** Horizontal field of view in radians. */
  hfov: number;
  torch?: { supported: boolean; set(on: boolean): Promise<void> };
  hint?(h: DemoHint): void;
  /** Full-resolution JPEG of the current frame. */
  capture(): Promise<{ blob: Blob | null; width: number; height: number }>;
  stop(): void;
}

import { CaptureMeta, EngineKind, useCaptures } from '../store/captures';
import { linkHash, sha256Hex } from './hashchain';
import { blobs } from './storage';

export interface SealInput {
  appId: string;
  stepId: string;
  label: string;
  engine: EngineKind;
  blob: Blob | null;
  width: number;
  height: number;
  brightness?: number;
  sharpness?: number;
  geo?: { lat?: number; lng?: number; accuracy?: number } | null;
  note?: string;
}

// One queue for the whole app, so two sealers (capture shell, QR scanner) can never fork the chain.
let queue: Promise<unknown> = Promise.resolve();

/** Hashes a frame, links it to the application's chain head, stores the JPEG and the metadata. */
export function sealCapture(input: SealInput): Promise<CaptureMeta> {
  const run = async () => {
    const { appId, blob } = input;
    const id = `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const ts = Date.now();
    const imageHash = blob ? await sha256Hex(await blob.arrayBuffer()) : await sha256Hex(`${id}|${ts}|no-frame`);
    const prevHash = useCaptures.getState().head(appId);
    const g = input.geo;
    const meta: Omit<CaptureMeta, 'hash'> = {
      id,
      appId,
      stepId: input.stepId,
      label: input.label,
      ts,
      lat: g?.lat,
      lng: g?.lng,
      accuracy: g?.accuracy != null ? Math.round(g.accuracy) : undefined,
      engine: input.engine,
      brightness: Math.round(input.brightness ?? 0),
      sharpness: Math.round(input.sharpness ?? 0),
      width: input.width,
      height: input.height,
      imageHash,
      prevHash,
      blobId: blob ? id : undefined,
      note: input.note,
    };
    const hash = await linkHash(prevHash, imageHash, meta);
    if (blob) await blobs.put(id, blob);
    const full: CaptureMeta = { ...meta, hash };
    useCaptures.getState().add(full);
    return full;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

/** Resolves once every queued seal has been written. */
export function sealsSettled(): Promise<unknown> {
  return queue;
}

import { grabJpeg, openRearCamera } from '../../../lib/camera';
import type { FrameEngine } from './types';

/** Engine B: getUserMedia rear camera under the overlay. */
export async function startCameraEngine(container: HTMLElement): Promise<FrameEngine> {
  const video = document.createElement('video');
  video.className = 'absolute inset-0 h-full w-full object-cover';
  container.appendChild(video);
  try {
    const cam = await openRearCamera(video);
    return {
      kind: 'camera',
      label: 'Camera',
      source: video,
      cover: true,
      // Typical phone main camera: ~65–70° horizontal in landscape; the long axis gets the wide angle.
      hfov: (video.videoWidth >= video.videoHeight ? 66 : 50) * (Math.PI / 180),
      size: () => ({ w: video.videoWidth || 1280, h: video.videoHeight || 720 }),
      torch: { supported: cam.torchSupported, set: cam.setTorch },
      capture: () => grabJpeg(video, video.videoWidth, video.videoHeight),
      stop: () => {
        cam.stop();
        video.remove();
      },
    };
  } catch (e) {
    video.remove();
    throw e;
  }
}

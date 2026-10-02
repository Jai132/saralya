import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';

export interface QrHit {
  text: string;
  /** Corners in the source image's pixels: top-left, top-right, bottom-right, bottom-left. */
  corners: { x: number; y: number }[];
}

/** Decodes the first QR code in an image. */
export function decodeQr(img: ImageData): QrHit | null {
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  if (!r || !r.data) return null;
  const l = r.location;
  return { text: r.data, corners: [l.topLeftCorner, l.topRightCorner, l.bottomRightCorner, l.bottomLeftCorner] };
}

/** Draws a QR code (with a quiet zone) into `size`×`size` at (x, y). Used for the demo props only. */
export function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, ecc: 'L' | 'M' | 'Q' | 'H' = 'M') {
  const q = qrcode(0, ecc);
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount();
  const cell = size / (n + 8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + (c + 4) * cell, y + (r + 4) * cell, Math.ceil(cell), Math.ceil(cell));
}

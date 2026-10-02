import { drawQr } from '../../lib/qr';
import { indian } from '../../lib/format';

/**
 * Printed props for the demo-mode QR scanner: a UPI standee and a supplier's tax invoice. The QR on each is
 * a real QR code, which the scanner then decodes with jsQR exactly as it would a camera frame.
 */

function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function upiStandee(payload: string, name: string, vpa: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 520;
  c.height = 720;
  const g = c.getContext('2d')!;
  rounded(g, 0, 0, 520, 720, 28);
  g.fillStyle = '#fff';
  g.fill();
  g.fillStyle = '#0B1B34';
  rounded(g, 0, 0, 520, 120, 28);
  g.fill();
  g.fillRect(0, 90, 520, 30);
  g.fillStyle = '#fff';
  g.font = 'bold 34px Inter, Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('Scan & Pay', 260, 58);
  g.font = '20px Inter, Arial, sans-serif';
  g.fillText('with any UPI app', 260, 92);
  drawQr(g, payload, 50, 140, 420, 'M');
  g.fillStyle = '#0B1B34';
  g.font = 'bold 26px Inter, Arial, sans-serif';
  g.fillText(name.toUpperCase().slice(0, 28), 260, 610);
  g.fillStyle = '#475569';
  g.font = '20px Inter, Arial, sans-serif';
  g.fillText(vpa, 260, 645);
  g.fillStyle = '#0F766E';
  g.font = 'bold 16px Inter, Arial, sans-serif';
  g.fillText('BHIM · UPI', 260, 690);
  return c;
}

export function taxInvoice(payload: string, inv: { supplier: string; gstin: string; docNo: string; date: string; value: number; buyer: string }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 820;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbfaf6';
  g.fillRect(0, 0, 600, 820);
  g.fillStyle = '#111827';
  g.textAlign = 'left';
  g.font = 'bold 26px Arial';
  g.fillText(inv.supplier.toUpperCase(), 30, 50);
  g.font = '15px Arial';
  g.fillStyle = '#374151';
  g.fillText('Wholesale FMCG · Jodhpur', 30, 74);
  g.fillText(`GSTIN: ${inv.gstin}`, 30, 96);
  g.font = 'bold 20px Arial';
  g.fillStyle = '#111827';
  g.fillText('TAX INVOICE', 30, 140);
  g.font = '15px Arial';
  g.fillText(`Invoice no: ${inv.docNo}`, 30, 166);
  g.fillText(`Date: ${inv.date}`, 30, 188);
  g.fillText(`Bill to: ${inv.buyer}`, 30, 210);
  // E-invoice QR, top right, as printed by billing software after IRP registration.
  drawQr(g, payload, 330, 112, 250, 'L');
  g.font = '11px Arial';
  g.fillStyle = '#6b7280';
  g.fillText('e-Invoice · signed QR', 395, 372);
  // Line items.
  g.strokeStyle = '#d1d5db';
  g.lineWidth = 1;
  const rows = ['Basmati rice 25 kg × 8', 'Atta 10 kg × 12', 'Toor dal 1 kg × 40', 'Sunflower oil 1 L × 36', 'Tea 500 g × 24', 'Detergent 1 kg × 30'];
  let y = 410;
  g.font = 'bold 14px Arial';
  g.fillStyle = '#111827';
  g.fillText('Item', 30, y);
  g.fillText('Amount', 480, y);
  rows.forEach((r, i) => {
    y += 40;
    g.beginPath();
    g.moveTo(30, y - 26);
    g.lineTo(570, y - 26);
    g.stroke();
    g.font = '14px Arial';
    g.fillStyle = '#374151';
    g.fillText(r, 30, y);
    g.fillText(indian([9600, 6480, 5200, 6120, 7680, 6000][i]), 480, y);
  });
  y += 50;
  g.beginPath();
  g.moveTo(30, y - 30);
  g.lineTo(570, y - 30);
  g.stroke();
  g.font = 'bold 18px Arial';
  g.fillStyle = '#111827';
  g.fillText('Total (incl. GST)', 30, y);
  g.fillText(`₹${indian(inv.value)}`, 460, y);
  g.font = '12px Arial';
  g.fillStyle = '#9ca3af';
  g.fillText('Fictitious supplier · prototype demo document', 30, 790);
  return c;
}

/** Shop counter backdrop the prop sits on. */
export function drawCounter(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#5b4330');
  grd.addColorStop(1, '#3b2a1d');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = (i / 14) * h + Math.sin(i * 3.1) * 8;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.3, y + 10, w * 0.7, y - 10, w, y + Math.sin(t + i) * 2);
    g.stroke();
  }
  // A few things on the counter.
  g.fillStyle = '#1e3a8a';
  g.fillRect(w * 0.06, h * 0.78, w * 0.22, h * 0.07);
  g.fillStyle = '#d4d4d8';
  g.beginPath();
  g.ellipse(w * 0.84, h * 0.86, w * 0.12, h * 0.035, 0, 0, Math.PI * 2);
  g.fill();
}

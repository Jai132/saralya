import { useEffect, useRef } from 'react';

/**
 * Illustrative photometric-stereo result: a height field from stamped characters, shown as a normal map and as
 * relief shaded under a moving light. In production, the normals come from the three torch-lit captures
 * (I_k = ρ · n·l_k, solved per pixel); here the height field is synthesised.
 */
export function ReliefMap({ text }: { text: string }) {
  const normalRef = useRef<HTMLCanvasElement>(null);
  const shadeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const W = 360;
    const H = 72;
    const src = document.createElement('canvas');
    src.width = W;
    src.height = H;
    const g = src.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.filter = 'blur(1.6px)';
    g.fillStyle = '#fff';
    g.font = 'bold 34px "Courier New", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2 + 2);
    const hd = g.getImageData(0, 0, W, H).data;
    // Stamped characters are pressed *into* the steel, so height is negative where the glyphs are.
    const hgt = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) hgt[i] = -hd[i * 4] / 255;
    const nx = new Float32Array(W * H);
    const ny = new Float32Array(W * H);
    const nz = new Float32Array(W * H);
    const k = 3.2;
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const dx = (hgt[i + 1] - hgt[i - 1]) * k;
        const dy = (hgt[i + W] - hgt[i - W]) * k;
        const l = Math.hypot(dx, dy, 1);
        nx[i] = -dx / l;
        ny[i] = -dy / l;
        nz[i] = 1 / l;
      }

    const nc = normalRef.current!;
    nc.width = W;
    nc.height = H;
    const ng = nc.getContext('2d')!;
    const nimg = ng.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      nimg.data[i * 4] = (nx[i] * 0.5 + 0.5) * 255;
      nimg.data[i * 4 + 1] = (-ny[i] * 0.5 + 0.5) * 255;
      nimg.data[i * 4 + 2] = (nz[i] * 0.5 + 0.5) * 255 || 255;
      nimg.data[i * 4 + 3] = 255;
    }
    ng.putImageData(nimg, 0, 0);

    const sc = shadeRef.current!;
    sc.width = W;
    sc.height = H;
    const sg = sc.getContext('2d')!;
    const simg = sg.createImageData(W, H);
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      // Sweep the light left → centre → right like the three torch captures.
      const lx = Math.sin(t * 1.4) * 0.8;
      const ly = -0.35;
      const lz = 0.6;
      const ll = Math.hypot(lx, ly, lz);
      for (let i = 0; i < W * H; i++) {
        const d = Math.max(0, (nx[i] * lx + ny[i] * ly + (nz[i] || 1) * lz) / ll);
        const v = 40 + d * 190;
        simg.data[i * 4] = v * 0.92;
        simg.data[i * 4 + 1] = v * 0.95;
        simg.data[i * 4 + 2] = v;
        simg.data[i * 4 + 3] = 255;
      }
      sg.putImageData(simg, 0, 0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <div className="space-y-1.5">
      <div>
        <div className="mb-0.5 text-[10px] uppercase tracking-wider text-ink-faint">Surface normals</div>
        <canvas ref={normalRef} className="w-full rounded-md" />
      </div>
      <div>
        <div className="mb-0.5 text-[10px] uppercase tracking-wider text-ink-faint">Relief under moving light</div>
        <canvas ref={shadeRef} className="w-full rounded-md" />
      </div>
    </div>
  );
}

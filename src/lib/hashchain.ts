/**
 * SHA-256 hash chain over captured frames.
 *
 *   imageHash = SHA-256(jpeg bytes)
 *   hash      = SHA-256(prevHash | imageHash | canonical JSON of the metadata)
 *
 * Changing any frame, any metadata field, or the order of captures breaks every later link.
 */

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return hex(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
}

/** JSON with sorted keys, so the same metadata always hashes the same way. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(',')}}`;
}

export async function linkHash(prevHash: string, imageHash: string, meta: Record<string, unknown>): Promise<string> {
  return sha256Hex(`${prevHash}|${imageHash}|${canonical(meta)}`);
}

export interface Sealable {
  hash: string;
  prevHash: string;
  imageHash: string;
}

/** Fields that are part of the seal. Everything except the hash itself. */
export function sealedFields<T extends Sealable>(c: T): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, ...rest } = c;
  return rest;
}

/** Recompute every link; returns the index of the first broken link, or -1 if the chain is intact. */
export async function verifyChain<T extends Sealable>(items: T[], genesis: string): Promise<number> {
  let prev = genesis;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (c.prevHash !== prev) return i;
    const h = await linkHash(prev, c.imageHash, sealedFields(c));
    if (h !== c.hash) return i;
    prev = c.hash;
  }
  return -1;
}

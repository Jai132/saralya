import { createStore, del, get, set, clear, keys } from 'idb-keyval';

/** All zustand persist keys share this prefix so "Reset demo data" can find them. */
export const LS_PREFIX = 'saralya:';

const blobStore = createStore('saralya-blobs', 'captures');

export const blobs = {
  put: (id: string, blob: Blob) => set(id, blob, blobStore),
  get: (id: string) => get<Blob>(id, blobStore),
  remove: (id: string) => del(id, blobStore),
  ids: () => keys(blobStore),
};

export async function resetDemoData(): Promise<void> {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(LS_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
  await clear(blobStore);
}

/** Load a blob as an object URL; caller should revoke. */
export async function blobUrl(id: string): Promise<string | null> {
  const b = await blobs.get(id);
  return b ? URL.createObjectURL(b) : null;
}

export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

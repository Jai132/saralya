import { useEffect, useState } from 'react';
import { blobs } from './storage';

/** Object URL for a blob stored in IndexedDB; revoked automatically. */
export function useBlobUrl(id?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let u: string | null = null;
    let live = true;
    blobs.get(id).then((b) => {
      if (!live || !b) return;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return url;
}

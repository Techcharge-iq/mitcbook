import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { api, isRemoteEnabled, getServerUrl } from '@/lib/apiClient';

/**
 * Drop-in replacement for useLocalStorage<T[]> that also syncs the array
 * with the LAN server when one is configured.
 *
 * - Standalone mode (no server URL): behaves exactly like useLocalStorage.
 * - Client mode: fetches from server on mount, polls for changes every
 *   5s, and pushes every local change to the server. Failures are logged
 *   but never break the UI — the localStorage copy is always the source
 *   of truth for offline use.
 */
export function useRemoteCollection<T extends { id: string }>(
  collection: string,
  storageKey: string,
  initial: T[] = []
): [T[], (next: T[] | ((prev: T[]) => T[])) => void] {
  const [value, setValue] = useLocalStorage<T[]>(storageKey, initial);
  const lastSync = useRef<number>(0);
  const remote = isRemoteEnabled();
  const serverUrl = getServerUrl();
  const previousRef = useRef<T[]>(value);

  // Initial pull
  useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    api.list(collection)
      .then((rows: any[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        if (rows.length > 0 || value.length === 0) {
          setValue(rows as T[]);
          previousRef.current = rows as T[];
        }
        lastSync.current = Date.now();
    })
      .catch(err => console.warn(`[remote] list ${collection} failed:`, err.message));
    return () => { cancelled = true; };
  }, [collection, remote, serverUrl]);

  // Poll for changes
  useEffect(() => {
    if (!remote) return;
    const id = setInterval(async () => {
      try {
        const since = lastSync.current || 0;
        const res = await api.changes(collection, since);
        if (!res?.changes?.length) {
          lastSync.current = res?.serverTime ?? lastSync.current;
          return;
        }
        setValue(prev => {
          const map = new Map(prev.map(r => [r.id, r]));
          for (const c of res.changes) {
            if (c.deleted) map.delete(c.id);
            else map.set(c.id, c.data as T);
          }
          const next = Array.from(map.values()) as T[];
          previousRef.current = next;
          return next;
        });
        lastSync.current = res.serverTime;
      } catch (err: any) {
        // Silent — we'll try again on the next tick.
      }
    }, 5000);
    return () => clearInterval(id);
  }, [collection, remote, serverUrl]);

  // Push local mutations to server (diff against previous)
  const setAndPush = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      setValue(prev => {
        const computed = typeof next === 'function' ? (next as (p: T[]) => T[])(prev) : next;
        if (remote) {
          const before = new Map(previousRef.current.map(r => [r.id, r]));
          const after = new Map(computed.map(r => [r.id, r]));
          // Upserts
          for (const [id, row] of after) {
            const old = before.get(id);
            if (!old || JSON.stringify(old) !== JSON.stringify(row)) {
              api.upsert(collection, row).catch(err =>
                console.warn(`[remote] upsert ${collection}/${id} failed:`, err.message)
              );
            }
          }
          // Deletes
          for (const id of before.keys()) {
            if (!after.has(id)) {
              api.remove(collection, id).catch(err =>
                console.warn(`[remote] delete ${collection}/${id} failed:`, err.message)
              );
            }
          }
          previousRef.current = computed;
        }
        return computed;
      });
    },
    [collection, remote, setValue]
  );

  return [value, setAndPush];
}

export default useRemoteCollection;

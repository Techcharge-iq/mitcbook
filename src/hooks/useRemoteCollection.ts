import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { api, isRemoteEnabled, getServerUrl } from '@/lib/apiClient';
import {
  cloudDelete,
  cloudLoadAll,
  cloudSubscribe,
  cloudUpsert,
  getUserId,
  isSyncedCollection,
} from '@/lib/cloudSync';
import { supabase } from '@/integrations/supabase/client';

/**
 * Drop-in replacement for useLocalStorage<T[]> that also syncs the array
 * with (a) the LAN server when one is configured, and (b) Supabase when
 * the user is signed in. localStorage remains the offline source of truth.
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
  const [userId, setUserId] = useState<string | null>(null);
  const syncable = isSyncedCollection(collection);

  // Track auth session
  useEffect(() => {
    let mounted = true;
    getUserId().then((id) => {
      if (mounted) setUserId(id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // -------- LAN server: initial pull --------
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

  // -------- LAN server: poll for changes --------
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
      } catch {
        // silent retry next tick
      }
    }, 5000);
    return () => clearInterval(id);
  }, [collection, remote, serverUrl]);

  // -------- Supabase: initial pull on login --------
  useEffect(() => {
    if (!syncable || !userId) return;
    let cancelled = false;
    cloudLoadAll<T>(collection).then((rows) => {
      if (cancelled || !rows) return;
      // Merge: cloud wins for any id present in cloud; keep local-only rows
      // (e.g. queued offline) until they upsert.
      setValue((prev) => {
        const cloudMap = new Map(rows.map((r) => [r.id, r]));
        const merged: T[] = [...rows];
        for (const local of prev) {
          if (!cloudMap.has(local.id)) merged.push(local);
        }
        previousRef.current = merged;
        // Push any local-only rows up to the cloud.
        for (const local of prev) {
          if (!cloudMap.has(local.id)) {
            void cloudUpsert(collection, local);
          }
        }
        return merged;
      });
    });
    return () => { cancelled = true; };
  }, [collection, syncable, userId]);

  // -------- Supabase: realtime subscription --------
  useEffect(() => {
    if (!syncable || !userId) return;
    const unsub = cloudSubscribe(collection, userId, (event, row, oldRow) => {
      setValue((prev) => {
        const map = new Map(prev.map((r) => [r.id, r]));
        if (event === 'DELETE') {
          if (oldRow?.id) map.delete(oldRow.id);
        } else if (row?.id) {
          map.set(row.id, row as T);
        }
        const next = Array.from(map.values()) as T[];
        previousRef.current = next;
        return next;
      });
    });
    return unsub;
  }, [collection, syncable, userId]);

  // -------- Push local mutations --------
  const setAndPush = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      setValue(prev => {
        const computed = typeof next === 'function' ? (next as (p: T[]) => T[])(prev) : next;
        const before = new Map(previousRef.current.map(r => [r.id, r]));
        const after = new Map(computed.map(r => [r.id, r]));

        // Upserts
        for (const [id, row] of after) {
          const old = before.get(id);
          if (!old || JSON.stringify(old) !== JSON.stringify(row)) {
            if (remote) {
              api.upsert(collection, row).catch(err =>
                console.warn(`[remote] upsert ${collection}/${id} failed:`, err.message)
              );
            }
            if (syncable && userId) {
              void cloudUpsert(collection, row);
            }
          }
        }
        // Deletes
        for (const id of before.keys()) {
          if (!after.has(id)) {
            if (remote) {
              api.remove(collection, id).catch(err =>
                console.warn(`[remote] delete ${collection}/${id} failed:`, err.message)
              );
            }
            if (syncable && userId) {
              void cloudDelete(collection, id);
            }
          }
        }
        previousRef.current = computed;
        return computed;
      });
    },
    [collection, remote, setValue, syncable, userId]
  );

  return [value, setAndPush];
}

export default useRemoteCollection;

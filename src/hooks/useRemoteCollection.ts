import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
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
 * with Supabase when the user is signed in. localStorage remains the
 * offline cache so the app works without a connection.
 */
export function useRemoteCollection<T extends { id: string }>(
  collection: string,
  storageKey: string,
  initial: T[] = []
): [T[], (next: T[] | ((prev: T[]) => T[])) => void] {
  const [value, setValue] = useLocalStorage<T[]>(storageKey, initial);
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

  // -------- Supabase: initial pull on login --------
  useEffect(() => {
    if (!syncable || !userId) return;
    let cancelled = false;
    cloudLoadAll<T>(collection).then((rows) => {
      if (cancelled || !rows) return;
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

        for (const [id, row] of after) {
          const old = before.get(id);
          if (!old || JSON.stringify(old) !== JSON.stringify(row)) {
            if (syncable && userId) {
              void cloudUpsert(collection, row);
            }
          }
        }
        for (const id of before.keys()) {
          if (!after.has(id)) {
            if (syncable && userId) {
              void cloudDelete(collection, id);
            }
          }
        }
        previousRef.current = computed;
        return computed;
      });
    },
    [collection, setValue, syncable, userId]
  );

  return [value, setAndPush];
}

export default useRemoteCollection;

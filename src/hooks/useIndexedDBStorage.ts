import { useCallback, useEffect, useRef, useState } from 'react';
import { idbGet, idbSet, idbRemove } from '@/lib/indexedDB';

/**
 * useIndexedDBStorage mirrors useLocalStorage but persists to IndexedDB.
 * It returns [value, setValue] and updates in-memory state synchronously
 * while performing async writes to IndexedDB to avoid blocking the UI.
 */
export function useIndexedDBStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const initialRef = useRef(initialValue);
  const [state, setState] = useState<T>(initialRef.current);
  const stateRef = useRef<T>(initialRef.current);

  // Load from IDB once on mount / when key changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fromDb = await idbGet<T>(key);
        if (!mounted) return;
        if (fromDb !== null) {
          stateRef.current = fromDb;
          setState(fromDb);
        } else {
          // seed initial value into IDB
          await idbSet<T>(key, initialRef.current);
          stateRef.current = initialRef.current;
          setState(initialRef.current);
        }
      } catch (error) {
        console.warn('[useIndexedDBStorage] failed to read', key, error);
        setState(initialRef.current);
      }
    })();
    return () => { mounted = false; };
  }, [key]);

  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<number | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const toWrite = pendingRef.current;
    pendingRef.current = null;
    if (toWrite === null) return;
    try {
      await idbSet<T>(key, toWrite);
    } catch (error) {
      console.error('[useIndexedDBStorage] failed to write', key, error);
    }
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    const newValue = value instanceof Function ? (value as (p: T) => T)(stateRef.current) : value;
    stateRef.current = newValue;
    setState(newValue);
    pendingRef.current = newValue;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
    // debounce writes slightly
    timerRef.current = window.setTimeout(() => void flush(), 100);
  }, [flush]);

  // flush on unmount/key change
  useEffect(() => {
    return () => {
      if (pendingRef.current !== null) {
        try {
          // best-effort synchronous write via navigator.storage? fallback to async
          idbSet<T>(key, pendingRef.current).catch((err) => console.error(err));
        } catch (err) {
          console.error(err);
        }
        pendingRef.current = null;
      }
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [key]);

  return [state, setValue];
}

export default useIndexedDBStorage;

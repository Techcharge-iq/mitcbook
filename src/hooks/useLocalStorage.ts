import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A storage-error event is dispatched when a write fails so any listener
 * (e.g. a global toast handler) can surface it without coupling this hook
 * to the toast system directly.
 */
function dispatchStorageError(key: string, isQuota: boolean) {
  const message = isQuota
    ? `Storage is full — could not save "${key}". Please export a backup to free up space.`
    : `Could not save data for "${key}". Check your browser's storage permissions.`;
  window.dispatchEvent(new CustomEvent('bookit:storage-error', { detail: { key, isQuota, message } }));
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Keep initialValue in a ref so callers can pass fresh literals (e.g. `[]`)
  // without changing the identity of our read function on every render.
  const initialRef = useRef(initialValue);

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialRef.current;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialRef.current;
    } catch (error) {
      console.warn(`[localStorage] Error reading key "${key}":`, error);
      return initialRef.current;
    }
  }, [key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Keep latest value in a ref so setValue can stay stable across renders.
  const storedRef = useRef(storedValue);
  useEffect(() => {
    storedRef.current = storedValue;
  }, [storedValue]);

  // Debounced async write to avoid blocking the main thread when serializing
  // large objects. We update in-memory state synchronously but schedule the
  // expensive JSON.stringify + localStorage.setItem work to run during idle
  // time (or after a short timeout) so the UI remains responsive.
  const writeTimer = useRef<number | null>(null);
  const pendingValue = useRef<T | null>(null);

  const flushWrite = useCallback(() => {
    if (writeTimer.current != null) {
      window.clearTimeout(writeTimer.current);
      writeTimer.current = null;
    }

    const toWrite = pendingValue.current;
    pendingValue.current = null;
    if (toWrite === null) return;

    const doWrite = () => {
      try {
        window.localStorage.setItem(key, JSON.stringify(toWrite));
      } catch (error) {
        console.error(`[localStorage] Error writing key "${key}":`, error);
        const isQuota =
          error instanceof DOMException &&
          (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
        dispatchStorageError(key, isQuota);
      }
    };

    // Prefer requestIdleCallback when available so serialization happens
    // during browser idle periods; fall back to a short timeout.
    if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(() => doWrite(), { timeout: 200 });
    } else {
      // small delay to batch rapid updates
      writeTimer.current = window.setTimeout(doWrite, 60);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const newValue = value instanceof Function ? (value as (p: T) => T)(storedRef.current) : value;
      // update synchronous refs/state so UI reads latest value immediately
      storedRef.current = newValue;
      setStoredValue(newValue);

      // schedule an async write; keep only the latest pending value
      pendingValue.current = newValue;

      // debounce previous timer and schedule flush
      if (writeTimer.current != null) {
        window.clearTimeout(writeTimer.current);
      }

      // schedule flush shortly — this batches rapid consecutive writes
      writeTimer.current = window.setTimeout(() => {
        flushWrite();
      }, 80);
    },
    [flushWrite],
  );

  // Re-read only when the key itself changes (e.g. switching companies).
  const lastKeyRef = useRef(key);
  useEffect(() => {
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const fresh = readValue();
    storedRef.current = fresh;
    setStoredValue(fresh);
  }, [key, readValue]);

  // Ensure any pending writes are flushed when the component unmounts or
  // when the key changes (e.g., switching companies).
  useEffect(() => {
    return () => {
      if (pendingValue.current !== null) {
        try {
          window.localStorage.setItem(key, JSON.stringify(pendingValue.current));
        } catch (error) {
          const isQuota =
            error instanceof DOMException &&
            (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
          dispatchStorageError(key, isQuota);
        }
        pendingValue.current = null;
      }
      if (writeTimer.current != null) {
        window.clearTimeout(writeTimer.current);
        writeTimer.current = null;
      }
    };
  }, [key]);

  return [storedValue, setValue];
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Stato persistito in localStorage.
 * - Al primo avvio usa `init()` (es. seed demo) e lo salva.
 * - `hydrated` diventa true solo lato client dopo la lettura, così evitiamo mismatch SSR.
 */
export function useLocalStorage<T>(
  key: string,
  init: () => T,
  validate?: (value: unknown) => value is T,
): [T | null, (updater: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const initRef = useRef(init);
  const validateRef = useRef(validate);

  useEffect(() => {
    let loaded: T | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!validateRef.current || validateRef.current(parsed)) {
          loaded = parsed as T;
        }
      }
    } catch {
      loaded = null;
    }

    if (loaded === null) {
      loaded = initRef.current();
      try {
        window.localStorage.setItem(key, JSON.stringify(loaded));
      } catch {
        /* storage pieno o disabilitato: si lavora in memoria */
      }
    }

    setValue(loaded);
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        if (prev === null) return prev;
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key],
  );

  return [value, update, hydrated];
}

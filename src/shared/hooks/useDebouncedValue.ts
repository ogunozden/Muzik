"use client";

import {useEffect, useState} from "react";

/**
 * Bir degeri verilen gecikmeyle geciktirir. Arama girdisi gibi hizli degisen
 * degerlerin her tus vurusunda istek tetiklemesini engeller.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

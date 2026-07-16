/**
 * useLearningProgress — rehberli ogrenme ilerlemesini localStorage'da tutar.
 *
 * "Ogrendim" isaretlenen usul id'leri kalici bir kumede saklanir. SSR/hidrasyon
 * uyumu icin ilk render bos baslar; kalici deger client'ta effect'te yuklenir.
 */

"use client";

import {useCallback, useEffect, useState} from "react";

// Varsayilan: usul ekseni. Makam ekseni ayri anahtar gecirir (ilerlemeler
// birbirinden bagimsiz sayilir).
const DEFAULT_PROGRESS_KEY = "muzik.learn.completed";

function readStored(key: string): string[] {
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function persist(key: string, ids: string[]): void {
  try {
    window.localStorage?.setItem(key, JSON.stringify(ids));
  } catch {
    // localStorage kullanilamiyor (gizli mod) — sessizce gec.
  }
}

export interface LearningProgress {
  completed: ReadonlySet<string>;
  isCompleted: (usulId: string) => boolean;
  markCompleted: (usulId: string) => void;
  markIncomplete: (usulId: string) => void;
  toggle: (usulId: string) => void;
  reset: () => void;
  completedCount: number;
}

export function useLearningProgress(storageKey: string = DEFAULT_PROGRESS_KEY): LearningProgress {
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const stored = readStored(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted(stored.length > 0 ? new Set(stored) : new Set());
  }, [storageKey]);

  // Fonksiyonel updater: ardisik cagrilar stale closure yuzunden birbirini
  // ezmesin (ayni render'da iki isaretleme). Persist, hesaplanan yeni degerle
  // yapilir (idempotent — StrictMode cift cagrida ayni degeri yazar).
  const mutate = useCallback(
    (fn: (prev: ReadonlySet<string>) => Set<string>) => {
      setCompleted((prev) => {
        const next = fn(prev);
        persist(storageKey, [...next]);
        return next;
      });
    },
    [storageKey],
  );

  const markCompleted = useCallback(
    (usulId: string) => mutate((prev) => new Set(prev).add(usulId)),
    [mutate],
  );

  const markIncomplete = useCallback(
    (usulId: string) =>
      mutate((prev) => {
        const next = new Set(prev);
        next.delete(usulId);
        return next;
      }),
    [mutate],
  );

  const toggle = useCallback(
    (usulId: string) =>
      mutate((prev) => {
        const next = new Set(prev);
        if (next.has(usulId)) next.delete(usulId);
        else next.add(usulId);
        return next;
      }),
    [mutate],
  );

  const reset = useCallback(() => mutate(() => new Set()), [mutate]);

  const isCompleted = useCallback((usulId: string) => completed.has(usulId), [completed]);

  return {
    completed,
    isCompleted,
    markCompleted,
    markIncomplete,
    toggle,
    reset,
    completedCount: completed.size,
  };
}

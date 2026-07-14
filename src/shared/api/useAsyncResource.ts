"use client";

import {useEffect, useState} from "react";
import {fetchJson} from "./fetch-json";

export interface AsyncResource<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface SettledResult<T> {
  url: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Bir URL'den JSON kaynagi ceker; loading/error/data durumlarini standart
 * sekilde yonetir ve unmount/URL degisiminde onceki istegi iptal eder.
 *
 * `url` null oldugunda istek yapilmaz (kosullu veri icin). Ortak client
 * veri katmani (F5.3); ham fetch-in-useEffect tekrarini engeller.
 *
 * Yukleme durumu turetilir (settled sonucun URL'i mevcut URL'e esit degilse
 * yuklenmektedir), boylece effect govdesinde senkron setState yapilmaz.
 */
export function useAsyncResource<T>(url: string | null): AsyncResource<T> {
  const [settled, setSettled] = useState<SettledResult<T>>({url: null, data: null, error: null});

  useEffect(() => {
    if (url === null) return;

    const controller = new AbortController();

    fetchJson<T>(url, controller.signal)
      .then((data) => setSettled({url, data, error: null}))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setSettled({
          url,
          data: null,
          error: cause instanceof Error ? cause.message : "Beklenmeyen hata",
        });
      });

    return () => controller.abort();
  }, [url]);

  if (url === null) {
    return {data: null, isLoading: false, error: null};
  }

  if (settled.url === url) {
    return {data: settled.data, isLoading: false, error: settled.error};
  }

  return {data: null, isLoading: true, error: null};
}

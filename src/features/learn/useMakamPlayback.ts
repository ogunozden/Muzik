/**
 * useMakamPlayback — makam gamini (koma perde dizisi) calan yeniden-kullanilabilir
 * hook. Usul calmasindan basit: dongu/imlec yok, dizi bir kez cikici calinir.
 *
 * Otantik 53-EDO koma frekanslariyla calar (12-TET degil): hicaz'in 113c ikilisi,
 * ussak'in 158c ikilisi duyulur (getMakamKomaFrequencies korpus-turevli). Korpus
 * disi/koma'siz makamda calmaz (mufredattaki 24 makamin tumu korpus-destekli).
 */

"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import type {Makam} from "@/core/domain/models";
import {getMakamKomaFrequencies} from "@/engines/makam/data";
import {playScaleAtFrequencies, stopAll} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";

const DEFAULT_INSTRUMENT: InstrumentType = "ney";
const NOTE_DURATION = 0.5;

export interface MakamPlayback {
  isPlaying: boolean;
  play: (makam: Makam, instrument?: InstrumentType) => Promise<void>;
  stop: () => void;
}

export function useMakamPlayback(): MakamPlayback {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  // Calma "nesli": stop veya yeni play, onceki calmanin finally'sini gecersizler
  // (eski calma bittiginde yeni durumu ezmesin).
  const genRef = useRef(0);

  const stop = useCallback(() => {
    genRef.current += 1;
    isPlayingRef.current = false;
    stopAll();
    setIsPlaying(false);
  }, []);

  const play = useCallback(async (makam: Makam, instrument: InstrumentType = DEFAULT_INSTRUMENT) => {
    if (isPlayingRef.current) return;
    const frequencies = getMakamKomaFrequencies(makam);
    if (!frequencies || frequencies.length === 0) return;
    const gen = (genRef.current += 1);
    isPlayingRef.current = true;
    setIsPlaying(true);
    try {
      await playScaleAtFrequencies(frequencies, NOTE_DURATION, instrument);
    } finally {
      if (genRef.current === gen) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    }
  }, []);

  useEffect(() => stop, [stop]);

  return {isPlaying, play, stop};
}

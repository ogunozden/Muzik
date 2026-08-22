/**
 * useUsulPlayback — usul calma mantiginin yeniden-kullanilabilir hook'u.
 *
 * Rhythm sayfasindaki dikissiz calma cekirdegini kapsuller (WebAudio ileriye-
 * bakisli planlama + rAF imperatif imlec + tur/vurgu takibi) ki hem rehberli
 * ogrenme akisi (/ogren) hem de ileride /rhythm ayni tek kaynaktan kullansin.
 *
 * Kalibrasyon: ses-gorsel ofsetini /rhythm ile AYNI localStorage anahtarindan
 * okur; kullanicinin bir kez ayarladigi kalibrasyon burada da gecerlidir.
 *
 * Imlec IMPERATIF surulur (notationRef.setProgress) — SVG re-render yok; vurgu
 * ve tur sayaci yalniz DEGISINCE setState edilir (yuksek-frekansli animasyonu
 * ref ile sur, state ile degil).
 */

"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import type {Usul} from "@/core/domain/models";
import {getUsulBeatDuration} from "@/engines/usul/data";
import {startRhythmLoop, stopAll, type RhythmLoopController} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";
import type {UsulNotationHandle} from "@/shared/ui/organisms/UsulNotation";

// /rhythm ile paylasilan kalibrasyon anahtari (bkz. app/rhythm/page.tsx).
const SYNC_OFFSET_KEY = "muzik.rhythm.syncOffsetMs";

function readStoredSyncOffset(): number {
  try {
    const stored = Number(window.localStorage?.getItem(SYNC_OFFSET_KEY));
    return Number.isFinite(stored) ? stored : 0;
  } catch {
    return 0;
  }
}

export interface PlayOptions {
  bpm: number;
  velvele?: boolean;
  loop?: boolean;
  instrument?: InstrumentType;
}

export interface UsulPlayback {
  isPlaying: boolean;
  /** Aktif darp/velvele dizisindeki gecerli sembol dizini (-1 = yok). */
  currentSymbolIndex: number;
  /** Kacinci turda (1-tabanli); durunca 0. */
  cycleCount: number;
  /** UsulNotation'a verilecek ref (imperatif imlec). */
  notationRef: React.RefObject<UsulNotationHandle | null>;
  play: (usul: Usul, opts: PlayOptions) => Promise<void>;
  stop: () => void;
}

export function useUsulPlayback(): UsulPlayback {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(-1);
  const [cycleCount, setCycleCount] = useState(0);

  const isPlayingRef = useRef(false);
  const cursorRafRef = useRef<number | null>(null);
  const loopControllerRef = useRef<RhythmLoopController | null>(null);
  const notationRef = useRef<UsulNotationHandle | null>(null);
  const activeIndexRef = useRef(-1);
  const cycleCountRef = useRef(0);
  const playbackBeatSecondsRef = useRef(0);
  const syncOffsetRef = useRef(0);

  useEffect(() => {
    syncOffsetRef.current = readStoredSyncOffset();
  }, []);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    cursorRafRef.current = null;
    loopControllerRef.current?.stop();
    loopControllerRef.current = null;
    stopAll();
    notationRef.current?.clearProgress();
    activeIndexRef.current = -1;
    cycleCountRef.current = 0;
    setIsPlaying(false);
    setCurrentSymbolIndex(-1);
    setCycleCount(0);
  }, []);

  const play = useCallback(
    async (usul: Usul, opts: PlayOptions) => {
      if (isPlayingRef.current) return;
      const loop = opts.loop ?? true;
      const pattern = opts.velvele && usul.velvele?.length ? usul.velvele : usul.symbols;

      const controller = await startRhythmLoop(
        usul.beats,
        pattern,
        opts.bpm,
        opts.instrument,
        usul.unit,
        loop,
      );
      if (!controller || isPlayingRef.current) {
        controller?.stop();
        return;
      }

      loopControllerRef.current = controller;
      isPlayingRef.current = true;
      activeIndexRef.current = 0;
      cycleCountRef.current = 1;
      setIsPlaying(true);
      setCurrentSymbolIndex(0);
      setCycleCount(1);
      notationRef.current?.setProgress(0);
      playbackBeatSecondsRef.current = getUsulBeatDuration(usul, opts.bpm);

      const tick = () => {
        if (!isPlayingRef.current) return;
        const beatSeconds = playbackBeatSecondsRef.current;
        const offsetBeats = beatSeconds > 0 ? syncOffsetRef.current / 1000 / beatSeconds : 0;
        const positionBeats = controller.getPositionBeats() - offsetBeats;
        if (!loop && positionBeats >= usul.beats) {
          stop();
          return;
        }
        const beatInCycle = ((positionBeats % usul.beats) + usul.beats) % usul.beats;
        notationRef.current?.setProgress(beatInCycle);

        let active = 0;
        for (let index = 0; index < pattern.length; index += 1) {
          if (pattern[index].beat <= beatInCycle + 1 + 1e-6) active = index;
        }
        if (active !== activeIndexRef.current) {
          activeIndexRef.current = active;
          setCurrentSymbolIndex(active);
        }
        const cycle = controller.getCycleCount();
        if (cycle !== cycleCountRef.current) {
          cycleCountRef.current = cycle;
          setCycleCount(cycle);
        }
        cursorRafRef.current = requestAnimationFrame(tick);
      };
      cursorRafRef.current = requestAnimationFrame(tick);
    },
    [stop],
  );

  // Unmount'ta calmayi durdur (kaynak sizintisi/animasyon kacagi olmasin).
  useEffect(() => stop, [stop]);

  return {isPlaying, currentSymbolIndex, cycleCount, notationRef, play, stop};
}

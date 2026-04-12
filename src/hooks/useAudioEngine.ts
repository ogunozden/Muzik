/**
 * useAudioEngine - Lazy Audio Service
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InstrumentType } from "@/engines/ses/engine";

// ============================================
// TYPES
// ============================================

interface AudioEngineState {
  isInitialized: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  currentInstrument: InstrumentType;
  error: string | null;
}

// ============================================
// ENGINE TYPES
// ============================================

type AudioEngine = {
  initAudio: () => Promise<boolean>;
  playNote: (midi: number, dur: number, inst: InstrumentType) => Promise<void>;
  playScale: (notes: number[], dur: number, inst: InstrumentType) => Promise<void>;
  playRhythm: (beats: number, sym: Array<{beat: number; symbol: string; isAccent: boolean}>, bpm: number, inst?: InstrumentType) => Promise<void>;
  stopAll: () => void;
};

// ============================================
// HOOK
// ============================================

export function useAudioEngine(initialInstrument: InstrumentType = "ney") {
  const [state, setState] = useState<AudioEngineState>({
    isInitialized: false,
    isLoading: false,
    isPlaying: false,
    currentInstrument: initialInstrument,
    error: null,
  });

  const engineRef = useRef<AudioEngine | null>(null);
  const loadingRef = useRef<boolean>(false);

  const loadEngine = useCallback(async (): Promise<boolean> => {
    if (engineRef.current) return true;
    if (loadingRef.current) return false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      loadingRef.current = true;
      const engine = await import("@/engines/ses/engine") as unknown as AudioEngine;
      engineRef.current = engine;
      
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
      }));
      
      return true;
    } catch (error) {
      console.error("AudioEngine: Failed to load", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Audio engine yüklenemedi",
      }));
      return false;
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const init = useCallback(async () => {
    const loaded = await loadEngine();
    if (!loaded || !engineRef.current) return false;

    try {
      await engineRef.current.initAudio();
      setState((prev) => ({ ...prev, isInitialized: true }));
      return true;
    } catch (error) {
      console.error("AudioEngine: Failed to init", error);
      setState((prev) => ({
        ...prev,
        error: "Audio context başlatılamadı",
      }));
      return false;
    }
  }, [loadEngine]);

  const playNote = useCallback(
    async (midiNumber: number, duration: number = 0.5) => {
      await loadEngine();
      if (!engineRef.current) return;

      setState((prev) => ({ ...prev, isPlaying: true }));
      try {
        await engineRef.current.playNote(midiNumber, duration, state.currentInstrument);
      } finally {
        setState((prev) => ({ ...prev, isPlaying: false }));
      }
    },
    [loadEngine, state.currentInstrument]
  );

  const playScale = useCallback(
    async (notes: number[], instrument?: InstrumentType) => {
      await loadEngine();
      if (!engineRef.current) return;

      setState((prev) => ({ ...prev, isPlaying: true }));
      try {
        await engineRef.current.playScale(notes, 0.4, instrument ?? state.currentInstrument);
      } finally {
        setState((prev) => ({ ...prev, isPlaying: false }));
      }
    },
    [loadEngine, state.currentInstrument]
  );

  const stop = useCallback(() => {
    engineRef.current?.stopAll();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const setInstrument = useCallback((instrument: InstrumentType) => {
    setState((prev) => ({ ...prev, currentInstrument: instrument }));
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.stopAll();
    };
  }, []);

  return {
    ...state,
    init,
    playNote,
    playScale,
    stop,
    setInstrument,
  };
}

// ============================================
// PRESET HOOKS
// ============================================

export function usePlayNote() {
  const { playNote, init, isInitialized } = useAudioEngine();

  const play = useCallback(
    async (midi: number) => {
      if (!isInitialized) {
        await init();
      }
      await playNote(midi);
    },
    [playNote, init, isInitialized]
  );

  return { play, isInitialized };
}

export function useStopAudio() {
  const { stop } = useAudioEngine();
  return { stop };
}

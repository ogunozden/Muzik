"use client";

import {useState, useCallback} from "react";
import {Makam} from "@/types";
import {MAKAM_DATA, getMakamScale} from "@/engines/makam/data";
import {Usul, UsulSymbol} from "@/types";
import {USUL_DATA} from "@/engines/usul/data";
import {noteNameToMidi} from "@/engines/nota/data";
import {playScale, playRhythm, initAudio, stopAll} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";

export interface AppState {
  selectedMakam: Makam | null;
  selectedUsul: Usul | null;
  selectedInstrument: InstrumentType;
  selectedPercussionInstrument: InstrumentType;
  currentScale: string[];
  isPlaying: boolean;
  bpm: number;
}

const DEFAULT_INSTRUMENT: InstrumentType = "ney";
const DEFAULT_PERCUSSION_INSTRUMENT: InstrumentType = "kudum";

export function useOrchestrator() {
  const [state, setState] = useState<AppState>({
    selectedMakam: null,
    selectedUsul: null,
    selectedInstrument: DEFAULT_INSTRUMENT,
    selectedPercussionInstrument: DEFAULT_PERCUSSION_INSTRUMENT,
    currentScale: [],
    isPlaying: false,
    bpm: 120,
  });

  const selectMakam = useCallback((makamId: string) => {
    const makam = MAKAM_DATA.find((m) => m.id === makamId);
    if (!makam) return;
    const scale = getMakamScale(makam);
    setState((prev) => ({
      ...prev,
      selectedMakam: makam,
      currentScale: scale,
    }));
  }, []);

  const selectUsul = useCallback((usulId: string) => {
    const usul = USUL_DATA.find((u) => u.id === usulId);
    if (!usul) return;
    setState((prev) => ({...prev, selectedUsul: usul}));
  }, []);

  const playMakamScale = useCallback(async () => {
    if (!state.selectedMakam || state.currentScale.length === 0) {
      return;
    }

    setState((prev) => ({...prev, isPlaying: true}));
    await initAudio();
    let octave = 4;
    let previousMidi = -1;
    const scaleMidi = state.currentScale.map((note) => {
      let midi = noteNameToMidi(note, octave);
      if (previousMidi >= 0 && midi <= previousMidi) {
        octave += 1;
        midi = noteNameToMidi(note, octave);
      }
      previousMidi = midi;
      return midi;
    });
    await playScale(scaleMidi, 0.5, state.selectedInstrument);
    setState((prev) => ({...prev, isPlaying: false}));
  }, [state.selectedMakam, state.currentScale, state.selectedInstrument]);

  const playUsulRhythm = useCallback(async () => {
    if (!state.selectedUsul) {
      return;
    }

    stopAll();
    setState((prev) => ({...prev, isPlaying: true}));
    await initAudio();
    const symbols: UsulSymbol[] = state.selectedUsul.symbols;
    await playRhythm(state.selectedUsul.beats, symbols, state.bpm, state.selectedPercussionInstrument);
    setState((prev) => ({...prev, isPlaying: false}));
  }, [state.selectedUsul, state.bpm, state.selectedPercussionInstrument]);

  const setBpm = useCallback((bpm: number) => {
    setState((prev) => ({...prev, bpm}));
  }, []);

  const setInstrument = useCallback((instrument: InstrumentType) => {
    setState((prev) => ({...prev, selectedInstrument: instrument}));
  }, []);

  const setPercussionInstrument = useCallback((instrument: InstrumentType) => {
    setState((prev) => ({...prev, selectedPercussionInstrument: instrument}));
  }, []);

  return {
    state,
    selectMakam,
    selectUsul,
    playMakamScale,
    playUsulRhythm,
    setBpm,
    setInstrument,
    setPercussionInstrument,
  };
}

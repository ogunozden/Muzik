/**
 * Orchestrator Context - Global State Management
 * 
 * useOrchestrator hook'unu context'e çevirerek
 * sayfa geçişlerinde state kaybını önler.
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {Makam, Usul, UsulSymbol} from "@/types";
import {MAKAM_DATA, getMakamScale} from "@/engines/makam/data";
import {USUL_DATA} from "@/engines/usul/data";
import {noteNameToMidi} from "@/engines/nota/data";
import {playScale, playRhythm, initAudio, stopAll} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";

// ============================================
// TYPES
// ============================================
export interface OrchestratorState {
  selectedMakam: Makam | null;
  selectedUsul: Usul | null;
  selectedInstrument: InstrumentType;
  selectedPercussionInstrument: InstrumentType;
  currentScale: string[];
  isPlaying: boolean;
  bpm: number;
}

export interface OrchestratorActions {
  selectMakam: (makamId: string) => void;
  selectUsul: (usulId: string) => void;
  playMakamScale: () => Promise<void>;
  playUsulRhythm: () => Promise<void>;
  setBpm: (bpm: number) => void;
  setInstrument: (instrument: InstrumentType) => void;
  setPercussionInstrument: (instrument: InstrumentType) => void;
}

type OrchestratorContextValue = OrchestratorState & OrchestratorActions;

// ============================================
// DEFAULT VALUES
// ============================================
const DEFAULT_STATE: OrchestratorState = {
  selectedMakam: null,
  selectedUsul: null,
  selectedInstrument: "ney",
  selectedPercussionInstrument: "kudum",
  currentScale: [],
  isPlaying: false,
  bpm: 120,
};

// ============================================
// CONTEXT
// ============================================
const OrchestratorContext = createContext<OrchestratorContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================
export function OrchestratorProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<OrchestratorState>(DEFAULT_STATE);

  // Actions - useCallback with stable references
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
    
    setState((prev) => ({
      ...prev,
      selectedUsul: usul,
    }));
  }, []);

  const playMakamScale = useCallback(async () => {
    const {selectedMakam, currentScale, selectedInstrument} = state;
    
    if (!selectedMakam || currentScale.length === 0) {
      return;
    }

    setState((prev) => ({...prev, isPlaying: true}));
    
    try {
      await initAudio();
      
      let octave = 4;
      let previousMidi = -1;
      const scaleMidi = currentScale.map((note) => {
        let midi = noteNameToMidi(note, octave);
        if (previousMidi >= 0 && midi <= previousMidi) {
          octave += 1;
          midi = noteNameToMidi(note, octave);
        }
        previousMidi = midi;
        return midi;
      });
      
      await playScale(scaleMidi, 0.5, selectedInstrument);
    } finally {
      setState((prev) => ({...prev, isPlaying: false}));
    }
  }, [state]);

  const playUsulRhythm = useCallback(async () => {
    const {selectedUsul, bpm, selectedPercussionInstrument} = state;
    
    if (!selectedUsul) {
      return;
    }

    stopAll();
    setState((prev) => ({...prev, isPlaying: true}));
    
    try {
      await initAudio();
      const symbols: UsulSymbol[] = selectedUsul.symbols;
      await playRhythm(selectedUsul.beats, symbols, bpm, selectedPercussionInstrument);
    } finally {
      setState((prev) => ({...prev, isPlaying: false}));
    }
  }, [state]);

  const setBpm = useCallback((bpm: number) => {
    setState((prev) => ({...prev, bpm}));
  }, []);

  const setInstrument = useCallback((instrument: InstrumentType) => {
    setState((prev) => ({...prev, selectedInstrument: instrument}));
  }, []);

  const setPercussionInstrument = useCallback((instrument: InstrumentType) => {
    setState((prev) => ({...prev, selectedPercussionInstrument: instrument}));
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<OrchestratorContextValue>(
    () => ({
      ...state,
      selectMakam,
      selectUsul,
      playMakamScale,
      playUsulRhythm,
      setBpm,
      setInstrument,
      setPercussionInstrument,
    }),
    [state, selectMakam, selectUsul, playMakamScale, playUsulRhythm, setBpm, setInstrument, setPercussionInstrument]
  );

  return (
    <OrchestratorContext.Provider value={contextValue}>
      {children}
    </OrchestratorContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================
export function useOrchestrator(): OrchestratorContextValue {
  const context = useContext(OrchestratorContext);
  
  if (!context) {
    throw new Error("useOrchestrator must be used within OrchestratorProvider");
  }
  
  return context;
}

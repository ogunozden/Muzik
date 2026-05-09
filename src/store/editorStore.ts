import { create } from 'zustand';
import type { InstrumentType } from '@/engines/ses/instruments';
import type { NotaEvent, Makam, Usul, UsulSymbol } from '@/types';
import { MAKAM_DATA, getMakamScale } from '@/engines/makam/data';
import { USUL_DATA } from '@/engines/usul/data';
import { noteNameToMidi } from '@/engines/nota/data';
import { playScale, playRhythm, initAudio, stopAll } from '@/engines/ses/engine';

interface EditorState {
  // Veri (Data)
  recordedNotes: NotaEvent[];
  activeNotes: number[]; // Mevcut basılan MIDI numaraları
  scoreTitle: string; // Kaydedilecek eserin başlığı
  isSaving: boolean;
  saveError: string | null;

  selectedMakamId: string;
  selectedMakamObj: Makam | null;
  currentScale: string[]; // Makam seçilince hesaplanan notalar

  selectedUsulId: string;
  selectedUsulObj: Usul | null;

  selectedInstrument: InstrumentType;
  selectedPercussionInstrument: InstrumentType;
  bpm: number;

  // Çalma ve Kayıt Durumu (Playback & Recording State)
  isRecording: boolean;
  isPlaying: boolean;
  playbackPosition: number; // Çalma çubuğu konumu (saniye)

  // Actions (Metotlar)
  setRecordedNotes: (notes: NotaEvent[]) => void;
  addRecordedNote: (note: NotaEvent) => void;
  clearRecordedNotes: () => void;

  setActiveNotes: (notes: number[] | ((prev: number[]) => number[])) => void;
  setScoreTitle: (title: string) => void;

  setSelectedMakam: (makamId: string) => void;
  setSelectedUsul: (usulId: string) => void;
  setSelectedInstrument: (instrument: InstrumentType) => void;
  setSelectedPercussionInstrument: (instrument: InstrumentType) => void;
  setBpm: (bpm: number) => void;

  setIsRecording: (recording: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackPosition: (position: number) => void;

  playMakamScale: () => Promise<void>;
  playUsulRhythm: () => Promise<void>;
  stopAudio: () => void;
  saveScore: () => Promise<boolean>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  recordedNotes: [],
  activeNotes: [],
  scoreTitle: "",
  isSaving: false,
  saveError: null,

  selectedMakamId: "",
  selectedMakamObj: null,
  currentScale: [],

  selectedUsulId: "",
  selectedUsulObj: null,

  selectedInstrument: "ud",
  selectedPercussionInstrument: "kudum",
  bpm: 120,

  isRecording: false,
  isPlaying: false,
  playbackPosition: -1,

  setRecordedNotes: (notes) => set({ recordedNotes: notes }),
  addRecordedNote: (note) => set((state) => ({ recordedNotes: [...state.recordedNotes, note] })),
  clearRecordedNotes: () => set({ recordedNotes: [] }),

  setActiveNotes: (notesOrUpdater) => set((state) => ({
    activeNotes: typeof notesOrUpdater === 'function' ? notesOrUpdater(state.activeNotes) : notesOrUpdater
  })),

  setScoreTitle: (title) => set({ scoreTitle: title }),

  setSelectedMakam: (makamId) => {
    const makamObj = MAKAM_DATA.find((m) => m.id === makamId) || null;
    const scale = makamObj ? getMakamScale(makamObj) : [];
    set({ selectedMakamId: makamId, selectedMakamObj: makamObj, currentScale: scale });
  },

  setSelectedUsul: (usulId) => {
    const usulObj = USUL_DATA.find((u) => u.id === usulId) || null;
    set({ selectedUsulId: usulId, selectedUsulObj: usulObj });
  },

  setSelectedInstrument: (instrument) => set({ selectedInstrument: instrument }),
  setSelectedPercussionInstrument: (instrument) => set({ selectedPercussionInstrument: instrument }),
  setBpm: (bpm) => set({ bpm }),

  setIsRecording: (recording) => set({ isRecording: recording }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackPosition: (position) => set({ playbackPosition: position }),

  playMakamScale: async () => {
    const { selectedMakamObj, currentScale, selectedInstrument, isPlaying } = get();
    if (!selectedMakamObj || currentScale.length === 0 || isPlaying) return;

    set({ isPlaying: true });

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
      set({ isPlaying: false });
    }
  },

  playUsulRhythm: async () => {
    const { selectedUsulObj, bpm, selectedPercussionInstrument, isPlaying } = get();
    if (!selectedUsulObj || isPlaying) return;

    stopAll();
    set({ isPlaying: true });

    try {
      await initAudio();
      const symbols: UsulSymbol[] = selectedUsulObj.symbols;
      await playRhythm(selectedUsulObj.beats, symbols, bpm, selectedPercussionInstrument);
    } finally {
      set({ isPlaying: false });
    }
  },

  stopAudio: () => {
    stopAll();
    set({ isPlaying: false, playbackPosition: -1 });
  },

  saveScore: async () => {
    const { recordedNotes, scoreTitle, selectedMakamId, selectedUsulId } = get();
    if (recordedNotes.length === 0) return false;

    set({ isSaving: true, saveError: null });

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: scoreTitle || "Adsız Eser",
          makam: selectedMakamId || "bilinmeyen",
          usul: selectedUsulId || "bilinmeyen",
          notesData: recordedNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kaydetme başarısız");
      }

      set({ isSaving: false });
      return true;
    } catch (error) {
      set({ isSaving: false, saveError: (error as Error).message });
      return false;
    }
  },
}));

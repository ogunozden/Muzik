"use client";

import {
  InstrumentType,
  PercussionSymbol,
  playInstrumentNote,
  playScaleWithInstrument,
  playRhythmWithPercussion,
  playInstrumentNoteScheduled,
  initAudio as initAudioBase,
  stopAll as stopAllBase,
  getAudioContext,
} from "./instruments";

export type ScheduledNote = {
  midiNumber: number;
  startTime: number;
  duration: number;
  gain?: number;
  type?: string;
};

export async function initAudio(): Promise<boolean> {
  return initAudioBase();
}

export async function playNote(
  midiNumber: number,
  duration: number = 0.5,
  instrument: InstrumentType = "ud"
): Promise<void> {
  await playInstrumentNote(midiNumber, instrument, duration, 0.22);
}

export async function playScale(
  notes: number[],
  duration: number = 0.4,
  instrument: InstrumentType = "ney"
): Promise<void> {
  await playScaleWithInstrument(notes, instrument, duration);
}

export async function playRhythm(
  beats: number,
  symbols: Array<{beat: number; symbol: string; isAccent: boolean}>,
  bpm: number = 120
): Promise<void> {
  const percussionSymbols: Array<{beat: number; symbol: PercussionSymbol; isAccent: boolean}> = symbols.map(
    (s) => ({
      beat: s.beat,
      symbol: s.symbol as PercussionSymbol,
      isAccent: s.isAccent,
    })
  );
  await playRhythmWithPercussion(beats, percussionSymbols, bpm);
}

export async function playSequence(notes: ScheduledNote[]): Promise<number> {
  const ok = await initAudio();
  if (!ok) return 0;

  const context = getAudioContext();
  if (!context) return 0;

  const baseTime = context.currentTime + 0.02;

  for (const note of notes) {
    const noteStartTime = baseTime + note.startTime;
    playInstrumentNoteAtTime(note.midiNumber, "ud", note.duration, note.gain ?? 0.2, noteStartTime);
  }

  return notes.reduce((maxDuration, note) => Math.max(maxDuration, note.startTime + note.duration), 0);
}

function playInstrumentNoteAtTime(
  midiNumber: number,
  instrument: InstrumentType,
  duration: number,
  gain: number,
  startTime: number
): void {
  const context = getAudioContext();
  if (!context) return;

  playInstrumentNoteScheduled(midiNumber, instrument, duration, gain, startTime);
}

export function stopAll(): void {
  stopAllBase();
}

export type {InstrumentType, PercussionSymbol};

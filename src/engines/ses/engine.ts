"use client";

import {
  playInstrumentNote,
  playScaleWithInstrument,
  playRhythmWithPercussion,
  playInstrumentNoteScheduled,
  playPercussionSymbolScheduled,
  preloadInstrumentSamples,
  preloadPercussionSamples,
  clearSampleCache as clearSampleCacheBase,
  initAudio as initAudioBase,
  stopAll as stopAllBase,
  getAudioContext,
} from "./instruments";
import type {InstrumentType, PercussionSymbol} from "./instruments";

export type ScheduledNote = {
  midiNumber: number;
  targetFrequency?: number;
  startTime: number;
  duration: number;
  gain?: number;
  instrument?: InstrumentType;
};

export type ScheduledPercussionHit = {
  startTime: number;
  beatDuration: number;
  symbol: PercussionSymbol;
  isAccent?: boolean;
  percussionInstrument?: InstrumentType;
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
  bpm: number = 120,
  percussionInstrument?: InstrumentType,
): Promise<void> {
  const percussionSymbols: Array<{beat: number; symbol: string; isAccent: boolean}> = symbols.map(
    (s) => ({
      beat: s.beat,
      symbol: s.symbol,
      isAccent: s.isAccent,
    })
  );
  await playRhythmWithPercussion(beats, percussionSymbols, bpm, percussionInstrument);
}

export async function playSequence(
  notes: ScheduledNote[],
  instrument: InstrumentType = "ud",
): Promise<number> {
  const ok = await initAudio();
  if (!ok) return 0;

  const context = getAudioContext();
  if (!context) return 0;

  const instruments = Array.from(new Set(notes.map((note) => note.instrument ?? instrument)));
  await Promise.all(instruments.map((noteInstrument) => preloadInstrumentSamples(noteInstrument)));

  const baseTime = context.currentTime + 0.02;

  for (const note of notes) {
    const noteStartTime = baseTime + note.startTime;
    playInstrumentNoteAtTime(
      note.midiNumber,
      note.instrument ?? instrument,
      note.duration,
      note.gain ?? 0.2,
      noteStartTime,
      note.targetFrequency,
    );
  }

  return notes.reduce((maxDuration, note) => Math.max(maxDuration, note.startTime + note.duration), 0);
}

export async function playArrangement(
  notes: ScheduledNote[],
  percussionHits: ScheduledPercussionHit[] = [],
  fallbackInstrument: InstrumentType = "ud",
): Promise<number> {
  const ok = await initAudio();
  if (!ok) return 0;

  const context = getAudioContext();
  if (!context) return 0;

  const instruments = Array.from(new Set(notes.map((note) => note.instrument ?? fallbackInstrument)));
  await Promise.all(instruments.map((noteInstrument) => preloadInstrumentSamples(noteInstrument)));

  const percussionGroups = new Map<InstrumentType | "default", Set<PercussionSymbol>>();
  for (const hit of percussionHits) {
    const key = hit.percussionInstrument ?? "default";
    const group = percussionGroups.get(key) ?? new Set<PercussionSymbol>();
    group.add(hit.symbol);
    percussionGroups.set(key, group);
  }

  await Promise.all(
    Array.from(percussionGroups.entries()).map(([instrument, symbols]) =>
      preloadPercussionSamples(
        Array.from(symbols),
        instrument === "default" ? undefined : instrument,
      ),
    ),
  );

  const baseTime = context.currentTime + 0.04;

  for (const note of notes) {
    playInstrumentNoteAtTime(
      note.midiNumber,
      note.instrument ?? fallbackInstrument,
      note.duration,
      note.gain ?? 0.2,
      baseTime + note.startTime,
      note.targetFrequency,
    );
  }

  for (const hit of percussionHits) {
    playPercussionSymbolScheduled(
      hit.symbol,
      hit.isAccent ?? false,
      baseTime + hit.startTime,
      hit.beatDuration,
      hit.percussionInstrument,
    );
  }

  const melodyDuration = notes.reduce((maxDuration, note) => Math.max(maxDuration, note.startTime + note.duration), 0);
  const rhythmDuration = percussionHits.reduce(
    (maxDuration, hit) => Math.max(maxDuration, hit.startTime + hit.beatDuration),
    0,
  );

  return Math.max(melodyDuration, rhythmDuration);
}

function playInstrumentNoteAtTime(
  midiNumber: number,
  instrument: InstrumentType,
  duration: number,
  gain: number,
  startTime: number,
  targetFrequency?: number,
): void {
  const context = getAudioContext();
  if (!context) return;

  playInstrumentNoteScheduled(midiNumber, instrument, duration, gain, startTime, targetFrequency);
}

export function stopAll(): void {
  stopAllBase();
}

export function clearSampleCache(): void {
  clearSampleCacheBase();
}

// Re-export for convenience
export {getAudioContext};

export type {InstrumentType, PercussionSymbol};

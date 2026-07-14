"use client";

import {
  playInstrumentNote,
  playScaleWithInstrument,
  playScaleFrequencies,
  playRhythmWithPercussion,
  playInstrumentNoteScheduled,
  playPercussionSymbolScheduled,
  preloadInstrumentSamples,
  preloadPercussionSamples,
  preloadPercussionSymbolSamples,
  startRhythmLoop as startRhythmLoopBase,
  clearSampleCache as clearSampleCacheBase,
  initAudio as initAudioBase,
  stopAll as stopAllBase,
  getAudioContext,
  type RhythmLoopController,
} from "./instruments";
import {isPercussionSymbol} from "./profiles";
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

export type RhythmSymbolInput = {
  beat: number;
  symbol: string;
  isAccent: boolean;
  timeValue?: number;
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

/**
 * Diziyi OTANTIK FREKANSLARDA calar (makam koma perdeleri; 12-TET degil).
 * Bkz. getMakamKomaFrequencies (53-EDO / AEU koma).
 */
export async function playScaleAtFrequencies(
  frequencies: number[],
  duration: number = 0.4,
  instrument: InstrumentType = "ney"
): Promise<void> {
  await playScaleFrequencies(frequencies, instrument, duration);
}

// Nazariyat darplarinin vurmali sample kanallarina eslenmesi: te/hek sol-el
// hafif vurus ailesinden (tek), ka ke ailesinden, ta sag-el kuvvetli vurus
// (dum) ailesindendir ("Turk Musikisinde Usuller ve Kudum", s.14).
const PERCUSSION_SYMBOL_ALIASES: Record<string, string> = {
  te: "tek",
  hek: "tek",
  ka: "ke",
  ta: "dum",
};

/** Nazariyat darbini calinabilir sample sembolune indirger (bilinmeyen -> ""). */
export function normalizePercussionSymbol(symbol: string): PercussionSymbol | "" {
  const mapped = PERCUSSION_SYMBOL_ALIASES[symbol] ?? symbol;
  return isPercussionSymbol(mapped) ? mapped : "";
}

export async function playRhythm(
  beats: number,
  symbols: RhythmSymbolInput[],
  bpm: number = 120,
  percussionInstrument?: InstrumentType,
  unit: string = "4",
): Promise<void> {
  const percussionSymbols: RhythmSymbolInput[] = symbols.map(
    (s) => ({
      beat: s.beat,
      symbol: PERCUSSION_SYMBOL_ALIASES[s.symbol] ?? s.symbol,
      isAccent: s.isAccent,
      timeValue: s.timeValue,
    })
  );
  await playRhythmWithPercussion(beats, percussionSymbols, bpm, percussionInstrument, unit);
}

export type {RhythmLoopController};

/**
 * Dikissiz ritim dongusu: heceler sample ailesine indirgenir, planlama
 * WebAudio saatinde ileriye-bakisli yapilir (tur basi duraksama yok).
 */
export async function startRhythmLoop(
  beats: number,
  symbols: RhythmSymbolInput[],
  bpm: number,
  percussionInstrument: InstrumentType | undefined,
  unit: string,
  loop: boolean,
): Promise<RhythmLoopController | null> {
  const normalized = symbols.map((s) => ({
    beat: s.beat,
    symbol: PERCUSSION_SYMBOL_ALIASES[s.symbol] ?? s.symbol,
    isAccent: s.isAccent,
    timeValue: s.timeValue,
  }));
  return startRhythmLoopBase(beats, normalized, bpm, percussionInstrument, unit, loop);
}

/**
 * Ritim sample'larini calmadan ONCE isitir: usul sayfasi gorsel sayaci
 * baslatmadan bunu bekler; aksi halde ilk turda imlec, sample indirme
 * gecikmesi kadar sesin onune geciyordu (2026-07-14 duzeltmesi).
 */
export async function preloadRhythm(
  symbols: RhythmSymbolInput[],
  percussionInstrument?: InstrumentType,
): Promise<boolean> {
  return preloadPercussionSymbolSamples(
    symbols
      .map((symbol) => PERCUSSION_SYMBOL_ALIASES[symbol.symbol] ?? symbol.symbol)
      .filter(isPercussionSymbol),
    percussionInstrument,
  );
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

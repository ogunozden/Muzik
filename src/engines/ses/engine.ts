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
    startRhythmLoop as startRhythmLoopBase,
  clearSampleCache as clearSampleCacheBase,
  initAudio as initAudioBase,
  stopAll as stopAllBase,
  getAudioContext,
  heardContextTime,
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
  /** Vurus bazli gain olcegi (1 = normal). Master volume ile carpilir. */
  gainScale?: number;
};

export type RhythmSymbolInput = {
  beat: number;
  symbol: string;
  isAccent: boolean;
  timeValue?: number;
  /** Velvele dolgu vurusu (ana darba denk gelmeyen) — susleme kismasi icin. */
  isOrnament?: boolean;
};

export interface PlaybackGainOptions {
  /** 0..1 master volume carpani (1 = tam). Tutarli sekilde kirpilir. */
  gainScale?: number;
}

function clampGainScale(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

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

/**
 * Tek notayi OTANTIK FREKANSTA calar (makam koma perdesi; 12-TET disi). En
 * yakin sample'a demirlenir, targetFrequency ile tam perdeye kaydirilir.
 * Bkz. snapMidiToMakamFrequency (mikrotonal klavye).
 */
export async function playNoteAtFrequency(
  frequency: number,
  duration: number = 0.5,
  instrument: InstrumentType = "ud"
): Promise<void> {
  const nearestMidi = Math.round(69 + 12 * Math.log2(frequency / 440));
  await playInstrumentNote(nearestMidi, instrument, duration, 0.22, frequency);
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

// Nazariyat darplarinin vurmali sample kanallarina eslenmesi
// ("Turk Musikisinde Usuller ve Kudum", s.14 "OLCULERIN VURULMASI"):
//   dum/ta -> sag el, KUVVETLI vurus            -> `dum` ailesi
//   tek/te -> sol el, hafif vurus               -> `tek` ailesi
//   ke/ka  -> sol el, hafif/uzun                -> `ke` ailesi
//   hek    -> IKI ELIN BIRLIKTE vurusu          -> KENDI kanali (K4)
//
// `hek` once `tek`e (en hafif aile), sonra `dum`a esleniyordu; ikisi de
// yaklasimdi. Artik kendi sample slotu var: dosyalar `dum + tek` toplamindan
// TURETILIR (`scripts/derive-hek-samples.mjs`) — bu, kaynagin "iki elin
// birlikte vurusu" tanimini birebir gercekler, ses uydurmaz. Korpusta 36
// `hek` darbi var (Berefsan / Muhammes / Remel velveleleri).
const PERCUSSION_SYMBOL_ALIASES: Record<string, string> = {
  te: "tek",
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
      isOrnament: s.isOrnament,
    })
  );
  await playRhythmWithPercussion(beats, percussionSymbols, bpm, percussionInstrument, unit);
}

export type {RhythmLoopController};

export type ArrangementPlayback = {
  /** Planlanan toplam sure (saniye). 0 ise hicbir sey planlanmadi. */
  durationSeconds: number;
  /**
   * Sesin planlandigi MUTLAK AudioContext zamani. Gorsel imlec bunu
   * `getHeardPlaybackPosition` ile birlikte kullanmali — duvar saati
   * (`performance.now`) ses saatinden ayrisir ve cikis gecikmesini bilmez.
   */
  baseTime: number;
};

const NO_PLAYBACK: ArrangementPlayback = {durationSeconds: 0, baseTime: 0};

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
    isOrnament: s.isOrnament,
  }));
  return startRhythmLoopBase(beats, normalized, bpm, percussionInstrument, unit, loop);
}

export async function playSequence(
  notes: ScheduledNote[],
  instrument: InstrumentType = "ud",
  options: PlaybackGainOptions = {},
): Promise<ArrangementPlayback> {
  const ok = await initAudio();
  if (!ok) return NO_PLAYBACK;

  const context = getAudioContext();
  if (!context) return NO_PLAYBACK;

  const instruments = Array.from(new Set(notes.map((note) => note.instrument ?? instrument)));
  await Promise.all(instruments.map((noteInstrument) => preloadInstrumentSamples(noteInstrument)));

  const gainScale = clampGainScale(options.gainScale);
  const baseTime = context.currentTime + 0.02;

  for (const note of notes) {
    const noteStartTime = baseTime + note.startTime;
    playInstrumentNoteAtTime(
      note.midiNumber,
      note.instrument ?? instrument,
      note.duration,
      (note.gain ?? 0.2) * gainScale,
      noteStartTime,
      note.targetFrequency,
    );
  }

  const durationSeconds = notes.reduce((maxDuration, note) => Math.max(maxDuration, note.startTime + note.duration), 0);
  // D6: donus degeri `baseTime` tasir — gorsel imlec `getHeardPlaybackPosition`
  // ile SES saatinden okunmalidir; duvar saati ayristikca sapar.
  return {durationSeconds, baseTime};
}

/**
 * Su an DUYULAN calma konumu (saniye), `playArrangement`in dondurdugu
 * `baseTime`e gore (D6).
 *
 * Ritim motorunda bu problem cozulmustu (`heardContextTime`: getOutputTimestamp,
 * yoksa currentTime - outputLatency; bu sistemde olculen fark ~53 ms) ama nota
 * motoru ile eser-takip sayfasi duvar saatinde kalmisti: imlec sesin onunde
 * gidiyor, iki saat ayristikca sapma buyuyordu.
 */
export function getHeardPlaybackPosition(baseTime: number): number {
  const context = getAudioContext();
  if (!context) return 0;
  return Math.max(0, heardContextTime(context) - baseTime);
}

export async function playArrangement(
  notes: ScheduledNote[],
  percussionHits: ScheduledPercussionHit[] = [],
  fallbackInstrument: InstrumentType = "ud",
  options: PlaybackGainOptions = {},
): Promise<ArrangementPlayback> {
  const ok = await initAudio();
  if (!ok) return NO_PLAYBACK;

  const context = getAudioContext();
  if (!context) return NO_PLAYBACK;

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

  const gainScale = clampGainScale(options.gainScale);
  const baseTime = context.currentTime + 0.04;

  for (const note of notes) {
    playInstrumentNoteAtTime(
      note.midiNumber,
      note.instrument ?? fallbackInstrument,
      note.duration,
      (note.gain ?? 0.2) * gainScale,
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
      (hit.gainScale ?? 1) * gainScale,
    );
  }

  const melodyDuration = notes.reduce((maxDuration, note) => Math.max(maxDuration, note.startTime + note.duration), 0);
  const rhythmDuration = percussionHits.reduce(
    (maxDuration, hit) => Math.max(maxDuration, hit.startTime + hit.beatDuration),
    0,
  );

  return {durationSeconds: Math.max(melodyDuration, rhythmDuration), baseTime};
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

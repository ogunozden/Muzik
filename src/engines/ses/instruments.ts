import { midiToFrequency } from "@/engines/nota/data";
import { MELODIC_SAMPLE_LIBRARY } from "./sample-library";
import { getOrCreateAudioContext, getAudioContext, stopAll, getMasterGain, trackOscillator, trackSource, getOrCreateNoiseBuffer } from "./core";
import type { BrowserAudioContext } from "./core";
import { INSTRUMENT_PROFILES, isPercussionSymbol } from "./profiles";
import type { InstrumentProfile, InstrumentType, PercussionSymbol } from "./profiles";
import { preloadSampleUrls, scheduleSampledMelodicNote, scheduleSampledPercussionHit, clearSampleCache, getPercussionSampleSet } from "./samples";
import { schedulePercussionHit, applyADSREnvelope } from "./synth";

const SYNTHETIC_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK !== "false";

type RhythmSymbolInput = {
  beat: number;
  symbol: string;
  isAccent: boolean;
  timeValue?: number;
};

export type RhythmScheduleHit = {
  startOffset: number;
  beatDuration: number;
  symbol: PercussionSymbol;
  isAccent: boolean;
};

export async function initAudio(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const context = getOrCreateAudioContext();
    if (!context || !getMasterGain()) {
      return false;
    }
    if (context.state === "suspended") {
      await context.resume();
    }
    return context.state === "running";
  } catch {
    return false;
  }
}

export async function preloadInstrumentSamples(instrument: InstrumentType): Promise<boolean> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return false;

  const melodicSamples = MELODIC_SAMPLE_LIBRARY[instrument];
  if (melodicSamples) {
    return preloadSampleUrls(context, melodicSamples.map((sample) => sample.url));
  }
  return false;
}

export async function preloadPercussionSymbolSamples(
  symbols: PercussionSymbol[],
  percussionInstrument?: InstrumentType,
): Promise<boolean> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return false;

  const urls = new Set<string>();
  for (const symbol of symbols) {
    const sampleSet = getPercussionSampleSet(symbol, percussionInstrument);
    sampleSet.urls.forEach((url) => urls.add(url));
    sampleSet.accentUrls?.forEach((url) => urls.add(url));
  }
  return preloadSampleUrls(context, Array.from(urls));
}

function scheduleSynthMelodicNote(
  context: BrowserAudioContext,
  midiNumber: number,
  instrument: InstrumentType,
  startTime: number,
  duration: number,
  gain: number,
  targetFrequency?: number,
): void {
  const masterGain = getMasterGain();
  if (!masterGain) return;

  const frequency =
    typeof targetFrequency === "number" && Number.isFinite(targetFrequency)
      ? targetFrequency
      : midiToFrequency(midiNumber);
  const profile = INSTRUMENT_PROFILES[instrument];
  if (!profile.harmonics) return;

  const oscillators: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];

  for (let i = 0; i < profile.harmonics.length; i++) {
    const osc = context.createOscillator();
    const gainNode = context.createGain();

    osc.type = "sine";

    const baseFreq = frequency * profile.harmonics[i];
    const pitchDepth = profile.pitchEnvelopeDepth ?? 0;
    if (pitchDepth > 0 && profile.pitchEnvelopeTime && profile.pitchEnvelopeTime > 0) {
      osc.frequency.setValueAtTime(baseFreq * (1 + pitchDepth), startTime);
      osc.frequency.linearRampToValueAtTime(baseFreq, startTime + profile.pitchEnvelopeTime);
    } else {
      osc.frequency.setValueAtTime(baseFreq, startTime);
    }

    if (profile.vibratoRate && profile.vibratoDepth && profile.vibratoDepth > 0) {
      const vibratoOsc = context.createOscillator();
      const vibratoGain = context.createGain();
      vibratoOsc.frequency.value = profile.vibratoRate;
      vibratoGain.gain.value = frequency * profile.vibratoDepth * profile.harmonics[i];
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibratoOsc.start(startTime);
      vibratoOsc.stop(startTime + duration + profile.releaseTime + 0.1);
      trackOscillator(vibratoOsc);
    }

    const harmonicGain = gain * (profile.harmonicGains?.[i] ?? 0.1);
    applyADSREnvelope(
      gainNode,
      startTime,
      profile.attackTime,
      profile.decayTime,
      profile.sustainLevel,
      profile.releaseTime,
      duration,
      harmonicGain,
    );

    osc.connect(gainNode);
    oscillators.push(osc);
    gainNodes.push(gainNode);
    trackOscillator(osc);
  }

  if (profile.formants && profile.formants.length > 0) {
    const masterOscGain = context.createGain();
    masterOscGain.gain.value = 1;

    for (const gn of gainNodes) {
      gn.connect(masterOscGain);
    }

    let lastNode: AudioNode = masterOscGain;

    for (const formant of profile.formants) {
      const filter = context.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = formant.frequency;
      filter.Q.value = formant.q;
      filter.gain.value = formant.gain * 10;
      lastNode.connect(filter);
      lastNode = filter;
    }

    lastNode.connect(masterGain);
  } else {
    for (const gn of gainNodes) {
      gn.connect(masterGain);
    }
  }

  for (const osc of oscillators) {
    osc.start(startTime);
    osc.stop(startTime + duration + profile.releaseTime + 0.1);
  }

  if (profile.noiseAmount && profile.noiseAmount > 0) {
    const buffer = getOrCreateNoiseBuffer(context);
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = context.createGain();
    const noiseFilter = context.createBiquadFilter();

    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = frequency * 1.5;
    noiseFilter.Q.value = 1;

    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(
      gain * profile.noiseAmount,
      startTime + Math.min(profile.attackTime * 0.5, 0.02),
    );
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + profile.attackTime + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(startTime);
    noise.stop(startTime + profile.attackTime + 0.1);
    trackSource(noise);
  }
}

export async function playInstrumentNote(
  midiNumber: number,
  instrument: InstrumentType,
  duration: number = 0.5,
  gain: number = 0.22,
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const startAt = context.currentTime + 0.01;
  const profile = INSTRUMENT_PROFILES[instrument];

  if (profile.type === "melodic") {
    await preloadInstrumentSamples(instrument);
    if (scheduleSampledMelodicNote(context, midiNumber, instrument, startAt, duration, gain)) {
      return;
    }
    if (!SYNTHETIC_FALLBACK_ENABLED) return;
    scheduleSynthMelodicNote(context, midiNumber, instrument, startAt, duration, gain);
  } else if (profile.type === "percussion") {
    await preloadPercussionSymbolSamples(["tek"]);
    if (!scheduleSampledPercussionHit(context, "tek", false, startAt, duration)) {
      if (!SYNTHETIC_FALLBACK_ENABLED) return;
      schedulePercussionHit(context, "tek", false, startAt, duration, instrument);
    }
  }
}

export async function playPercussionSymbol(
  symbol: PercussionSymbol,
  isAccent: boolean = false,
  bpm: number = 120,
  percussionInstrument?: InstrumentType,
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const beatDuration = 60 / bpm;
  const startAt = context.currentTime + 0.02;

  await preloadPercussionSymbolSamples([symbol], percussionInstrument);
  if (scheduleSampledPercussionHit(context, symbol, isAccent, startAt, beatDuration, percussionInstrument)) {
    return;
  }
  if (!SYNTHETIC_FALLBACK_ENABLED) return;
  schedulePercussionHit(context, symbol, isAccent, startAt, beatDuration, percussionInstrument);
}

export async function preloadPercussionSamples(
  symbols: PercussionSymbol[],
  percussionInstrument?: InstrumentType,
): Promise<boolean> {
  return preloadPercussionSymbolSamples(symbols, percussionInstrument);
}

export async function playScaleWithInstrument(
  notes: number[],
  instrument: InstrumentType,
  noteDuration: number = 0.4,
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const spacing = noteDuration + 0.08;
  const startAt = context.currentTime + 0.02;
  const profile = INSTRUMENT_PROFILES[instrument];

  await preloadInstrumentSamples(instrument);

  notes.forEach((midiNumber, index) => {
    const noteStartAt = startAt + index * spacing;
    if (profile.type === "melodic") {
      if (scheduleSampledMelodicNote(context, midiNumber, instrument, noteStartAt, noteDuration, 0.28)) return;
      if (!SYNTHETIC_FALLBACK_ENABLED) return;
      scheduleSynthMelodicNote(context, midiNumber, instrument, noteStartAt, noteDuration, 0.2);
    }
  });
}

export async function playRhythmWithPercussion(
  beats: number,
  symbols: RhythmSymbolInput[],
  bpm: number = 120,
  percussionInstrument?: InstrumentType,
  unit: string = "4",
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const schedule = buildRhythmSchedule(beats, symbols, bpm, unit);
  await preloadPercussionSymbolSamples(
    symbols.map((symbol) => symbol.symbol).filter(isPercussionSymbol),
    percussionInstrument,
  );

  const baseTime = context.currentTime + 0.02;

  for (const hit of schedule) {
    const startAt = baseTime + hit.startOffset;

    if (!scheduleSampledPercussionHit(context, hit.symbol, hit.isAccent, startAt, hit.beatDuration, percussionInstrument)) {
      if (!SYNTHETIC_FALLBACK_ENABLED) continue;
      schedulePercussionHit(context, hit.symbol, hit.isAccent, startAt, hit.beatDuration, percussionInstrument);
    }
  }
}

export function buildRhythmSchedule(
  beats: number,
  symbols: RhythmSymbolInput[],
  bpm: number = 120,
  unit: string = "4",
): RhythmScheduleHit[] {
  // Vurus suresi olcu birimine olceklenir (usul sayfasindaki
  // getUsulBeatDuration ile ayni formul). Ceyreklik varsayimi, 8'lik 14
  // usulde sesi gorsel imlecten 2x ayristiriyordu (2026-07-14 duzeltmesi).
  const beatUnit = Number.parseInt(unit, 10) || 4;
  const beatDuration = (60 / bpm) * (4 / beatUnit);

  return symbols
    .filter((symbol): symbol is RhythmSymbolInput & {symbol: PercussionSymbol} =>
      Number.isFinite(symbol.beat) &&
      symbol.beat >= 1 &&
      // Kesirli kuyruk vuruslari (orn. Hafif'te 32.5'teki ke) dongu icinde
      // kalir: sinir `beat < beats + 1`; eski `<= beats` bunlari dusuruyordu.
      symbol.beat < beats + 1 &&
      isPercussionSymbol(symbol.symbol),
    )
    .sort((left, right) => left.beat - right.beat)
    .map((symbol) => ({
      startOffset: (symbol.beat - 1) * beatDuration,
      // Zarf penceresi EN FAZLA bir vurus: uzun degerli darplarda (orn.
      // Devr-i Kebir'in 2 vurusluk Tek'leri) pencere degerle olceklenince
      // sample kaydindaki dogal seken ikinci vurus da duyuluyordu
      // (2026-07-14 kullanici raporu: "teklerde iki vurus geliyor").
      beatDuration: beatDuration * Math.min(Math.max(symbol.timeValue ?? 1, 0.25), 1),
      symbol: symbol.symbol,
      isAccent: symbol.isAccent,
    }));
}

export function playInstrumentNoteScheduled(
  midiNumber: number,
  instrument: InstrumentType,
  duration: number,
  gain: number,
  startTime: number,
  targetFrequency?: number,
): void {
  const context = getAudioContext();
  if (!context || !getMasterGain()) return;

  const profile = INSTRUMENT_PROFILES[instrument];
  if (profile.type !== "melodic") return;

  if (scheduleSampledMelodicNote(context, midiNumber, instrument, startTime, duration, gain, targetFrequency)) return;
  if (!SYNTHETIC_FALLBACK_ENABLED) return;

  scheduleSynthMelodicNote(context, midiNumber, instrument, startTime, duration, gain, targetFrequency);
}

export function playPercussionSymbolScheduled(
  symbol: PercussionSymbol,
  isAccent: boolean,
  startTime: number,
  beatDuration: number,
  percussionInstrument?: InstrumentType,
): boolean {
  const context = getAudioContext();
  if (!context || !getMasterGain()) return false;

  if (scheduleSampledPercussionHit(context, symbol, isAccent, startTime, beatDuration, percussionInstrument)) {
    return true;
  }

  if (!SYNTHETIC_FALLBACK_ENABLED) return false;

  schedulePercussionHit(context, symbol, isAccent, startTime, beatDuration, percussionInstrument);
  return true;
}

export interface RhythmLoopController {
  /** Ses saatine gore dongudeki kesirli vurus konumu (0..beats). */
  getPositionBeats: () => number;
  /** Kacinci turda oldugumuz (1-tabanli). */
  getCycleCount: () => number;
  stop: () => void;
}

/**
 * Dikissiz ritim dongusu (2026-07-14): tum turlar TEK mutlak ses-saati
 * ekseninden ileriye-bakisli planlanir. Onceki surum her turu ayri
 * setTimeout ile playRhythm cagirarak kuruyordu; timer titremesi tur
 * baslarinda duyulur duraksamalar yaratiyordu ("duzgun calismiyor").
 * Gorsel imlec de getPositionBeats ile AYNI saate kilitlenir.
 */
export async function startRhythmLoop(
  beats: number,
  symbols: RhythmSymbolInput[],
  bpm: number,
  percussionInstrument: InstrumentType | undefined,
  unit: string,
  loop: boolean,
): Promise<RhythmLoopController | null> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return null;

  const schedule = buildRhythmSchedule(beats, symbols, bpm, unit);
  await preloadPercussionSymbolSamples(
    symbols.map((symbol) => symbol.symbol).filter(isPercussionSymbol),
    percussionInstrument,
  );
  if (schedule.length === 0) return null;

  const beatUnit = Number.parseInt(unit, 10) || 4;
  const beatSeconds = (60 / bpm) * (4 / beatUnit);
  const cycleSeconds = beats * beatSeconds;
  const LOOKAHEAD_SECONDS = 0.6;
  const PUMP_INTERVAL_MS = 150;

  const startAtCtx = context.currentTime + 0.08;
  let cycleIndex = 0;
  let hitIndex = 0;
  let stopped = false;

  const scheduleDueHits = () => {
    if (stopped) return;
    const horizon = context.currentTime + LOOKAHEAD_SECONDS;
    for (;;) {
      if (hitIndex >= schedule.length) {
        if (!loop) break;
        hitIndex = 0;
        cycleIndex += 1;
      }
      const hit = schedule[hitIndex];
      const at = startAtCtx + cycleIndex * cycleSeconds + hit.startOffset;
      if (at > horizon) break;
      if (!scheduleSampledPercussionHit(context, hit.symbol, hit.isAccent, at, hit.beatDuration, percussionInstrument)) {
        if (SYNTHETIC_FALLBACK_ENABLED) {
          schedulePercussionHit(context, hit.symbol, hit.isAccent, at, hit.beatDuration, percussionInstrument);
        }
      }
      hitIndex += 1;
    }
  };

  scheduleDueHits();
  const pump = window.setInterval(scheduleDueHits, PUMP_INTERVAL_MS);

  return {
    getPositionBeats: () => Math.max(0, (context.currentTime - startAtCtx) / beatSeconds),
    getCycleCount: () => Math.max(1, Math.floor((context.currentTime - startAtCtx) / cycleSeconds) + 1),
    stop: () => {
      stopped = true;
      window.clearInterval(pump);
    },
  };
}

// Re-exports
export { getAudioContext, stopAll, clearSampleCache, INSTRUMENT_PROFILES };
export type { InstrumentType, PercussionSymbol, InstrumentProfile };

import { getOrCreateAudioContext, getAudioContext, getMasterGain } from "@/engines/ses/core";
import { MELODIC_PROFILES } from "@/engines/ses/instruments/melodic";
import { PERCUSSION_PROFILES } from "@/engines/ses/instruments/percussion";
import type { InstrumentType, PercussionSymbol } from "@/engines/ses/instruments/types";
import { isPercussionSymbol } from "@/engines/ses/instruments/types";
import {
  preloadSampleUrls,
  scheduleSampledPercussionHit,
  getPercussionSampleSet,
} from "@/engines/ses/samples";
import { schedulePercussionHit } from "@/engines/ses/synth";
import { initAudio } from "@/engines/ses/instruments/playback";

const SYNTHETIC_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK !== "false";

const INSTRUMENT_PROFILES = {
  ...MELODIC_PROFILES,
  ...PERCUSSION_PROFILES,
} as Record<InstrumentType, import("@/engines/ses/instruments/types").InstrumentProfile>;

type RhythmSymbolInput = {
  beat: number;
  symbol: string;
  isAccent: boolean;
  timeValue?: number;
  isOrnament?: boolean;
};

export type RhythmScheduleHit = {
  startOffset: number;
  beatDuration: number;
  notatedBeats: number;
  symbol: PercussionSymbol;
  isAccent: boolean;
  gainScale: number;
};

const ORNAMENT_GAIN_SCALE = 0.68;

async function preloadPercussionSymbolSamples(
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

    if (
      !scheduleSampledPercussionHit(
        context,
        hit.symbol,
        hit.isAccent,
        startAt,
        hit.beatDuration,
        percussionInstrument,
        hit.gainScale,
      )
    ) {
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
  const beatUnit = Number.parseInt(unit, 10) || 4;
  const beatDuration = (60 / bpm) * (4 / beatUnit);

  return symbols
    .filter(
      (symbol): symbol is RhythmSymbolInput & { symbol: PercussionSymbol } =>
        Number.isFinite(symbol.beat) &&
        symbol.beat >= 1 &&
        symbol.beat < beats + 1 &&
        isPercussionSymbol(symbol.symbol),
    )
    .sort((left, right) => left.beat - right.beat)
    .map((symbol) => ({
      startOffset: (symbol.beat - 1) * beatDuration,
      beatDuration: beatDuration * Math.max(symbol.timeValue ?? 1, 0.25),
      notatedBeats: beatDuration * Math.max(symbol.timeValue ?? 1, 0.25),
      symbol: symbol.symbol,
      isAccent: symbol.isAccent,
      gainScale: symbol.isOrnament ? ORNAMENT_GAIN_SCALE : 1,
    }));
}

export function playPercussionSymbolScheduled(
  symbol: PercussionSymbol,
  isAccent: boolean,
  startTime: number,
  beatDuration: number,
  percussionInstrument?: InstrumentType,
  gainScale: number = 1,
): boolean {
  const context = getAudioContext();
  if (!context || !getMasterGain()) return false;

  if (
    scheduleSampledPercussionHit(context, symbol, isAccent, startTime, beatDuration, percussionInstrument, gainScale)
  ) {
    return true;
  }

  if (!SYNTHETIC_FALLBACK_ENABLED) return false;

  schedulePercussionHit(context, symbol, isAccent, startTime, beatDuration, percussionInstrument);
  return true;
}

export interface RhythmLoopController {
  getPositionBeats: () => number;
  getCycleCount: () => number;
  getOutputLatencySeconds: () => number;
  retune: (nextBpm: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
}

export function seamlessRetuneStart(
  nextHitTime: number,
  cycleIndex: number,
  beats: number,
  nextHitBeatOffset: number,
  newBeatSeconds: number,
): number {
  return nextHitTime - (cycleIndex * beats + nextHitBeatOffset) * newBeatSeconds;
}

export interface OutputTimingContext {
  currentTime: number;
  outputLatency?: number;
  baseLatency?: number;
  getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number };
}

export function heardContextTime(context: OutputTimingContext): number {
  const timestamp = context.getOutputTimestamp?.();
  if (timestamp && typeof timestamp.contextTime === "number" && timestamp.contextTime > 0) {
    return timestamp.contextTime;
  }
  const latency = context.outputLatency || context.baseLatency || 0;
  return context.currentTime - latency;
}

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

  let schedule = buildRhythmSchedule(beats, symbols, bpm, unit);
  await preloadPercussionSymbolSamples(
    symbols.map((symbol) => symbol.symbol).filter(isPercussionSymbol),
    percussionInstrument,
  );
  if (schedule.length === 0) return null;

  const beatUnit = Number.parseInt(unit, 10) || 4;
  let beatSeconds = (60 / bpm) * (4 / beatUnit);
  let cycleSeconds = beats * beatSeconds;
  const LOOKAHEAD_SECONDS = 0.6;
  const PUMP_INTERVAL_MS = 150;

  let startAtCtx = context.currentTime + 0.08;
  let cycleIndex = 0;
  let hitIndex = 0;
  let stopped = false;

  const masterGain = getMasterGain();
  const loopGain = context.createGain();
  if (masterGain) loopGain.connect(masterGain);

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
      if (
        !scheduleSampledPercussionHit(
          context,
          hit.symbol,
          hit.isAccent,
          at,
          hit.beatDuration,
          percussionInstrument,
          hit.gainScale,
          loopGain,
        )
      ) {
        if (SYNTHETIC_FALLBACK_ENABLED) {
          schedulePercussionHit(context, hit.symbol, hit.isAccent, at, hit.beatDuration, percussionInstrument, loopGain);
        }
      }
      hitIndex += 1;
    }
  };

  scheduleDueHits();
  const pump = window.setInterval(scheduleDueHits, PUMP_INTERVAL_MS);

  return {
    getPositionBeats: () => Math.max(0, (heardContextTime(context) - startAtCtx) / beatSeconds),
    getCycleCount: () =>
      Math.max(1, Math.floor((heardContextTime(context) - startAtCtx) / cycleSeconds) + 1),
    getOutputLatencySeconds: () => context.outputLatency || context.baseLatency || 0,
    retune: (nextBpm) => {
      if (stopped || nextBpm <= 0) return;
      const nextBeatSeconds = (60 / nextBpm) * (4 / beatUnit);
      if (nextBeatSeconds === beatSeconds) return;

      const nextCycle = hitIndex >= schedule.length ? cycleIndex + 1 : cycleIndex;
      const nextIdx = hitIndex >= schedule.length ? 0 : hitIndex;
      const nextHitTime = startAtCtx + nextCycle * cycleSeconds + schedule[nextIdx].startOffset;
      const nextHitBeatOffset = schedule[nextIdx].startOffset / beatSeconds;

      beatSeconds = nextBeatSeconds;
      cycleSeconds = beats * beatSeconds;
      schedule = buildRhythmSchedule(beats, symbols, nextBpm, unit);
      startAtCtx = seamlessRetuneStart(nextHitTime, nextCycle, beats, nextHitBeatOffset, beatSeconds);
    },
    setVolume: (volume) => {
      const next = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
      loopGain.gain.setTargetAtTime(next, context.currentTime, 0.05);
    },
    stop: () => {
      stopped = true;
      window.clearInterval(pump);
      const now = context.currentTime;
      loopGain.gain.cancelScheduledValues(now);
      loopGain.gain.setValueAtTime(loopGain.gain.value, now);
      loopGain.gain.linearRampToValueAtTime(0, now + 0.02);
      window.setTimeout(() => loopGain.disconnect(), 200);
    },
  };
}

export type { RhythmSymbolInput };

import { midiToFrequency } from "@/engines/nota/data";
import { MELODIC_SAMPLE_LIBRARY } from "@/engines/ses/sample-library";
import {
  getOrCreateAudioContext,
  getAudioContext,
  getMasterGain,
  trackOscillator,
  trackSource,
  getOrCreateNoiseBuffer,
} from "@/engines/ses/core";
import type { BrowserAudioContext } from "@/engines/ses/core";
import { MELODIC_PROFILES } from "@/engines/ses/instruments/melodic";
import { PERCUSSION_PROFILES } from "@/engines/ses/instruments/percussion";
import type { InstrumentType, PercussionSymbol } from "@/engines/ses/instruments/types";
import {
  preloadSampleUrls,
  scheduleSampledMelodicNote,
  scheduleSampledPercussionHit,
  getPercussionSampleSet,
} from "@/engines/ses/samples";
import { schedulePercussionHit, applyADSREnvelope } from "@/engines/ses/synth";

const SYNTHETIC_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK !== "false";

const INSTRUMENT_PROFILES = {
  ...MELODIC_PROFILES,
  ...PERCUSSION_PROFILES,
} as Record<InstrumentType, import("@/engines/ses/instruments/types").InstrumentProfile>;

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
    return preloadSampleUrls(
      context,
      melodicSamples.map((sample) => sample.url),
    );
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

export async function preloadPercussionSamples(
  symbols: PercussionSymbol[],
  percussionInstrument?: InstrumentType,
): Promise<boolean> {
  return preloadPercussionSymbolSamples(symbols, percussionInstrument);
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
  targetFrequency?: number,
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const startAt = context.currentTime + 0.01;
  const profile = INSTRUMENT_PROFILES[instrument];

  if (profile.type === "melodic") {
    await preloadInstrumentSamples(instrument);
    if (
      scheduleSampledMelodicNote(context, midiNumber, instrument, startAt, duration, gain, targetFrequency)
    ) {
      return;
    }
    if (!SYNTHETIC_FALLBACK_ENABLED) return;
    scheduleSynthMelodicNote(context, midiNumber, instrument, startAt, duration, gain, targetFrequency);
  } else if (profile.type === "percussion") {
    await preloadPercussionSymbolSamples(["tek"], instrument);
    if (!scheduleSampledPercussionHit(context, "tek", false, startAt, duration, instrument)) {
      if (!SYNTHETIC_FALLBACK_ENABLED) return;
      schedulePercussionHit(context, "tek", false, startAt, duration, instrument);
    }
  }
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
      if (scheduleSampledMelodicNote(context, midiNumber, instrument, noteStartAt, noteDuration, 0.28))
        return;
      if (!SYNTHETIC_FALLBACK_ENABLED) return;
      scheduleSynthMelodicNote(context, midiNumber, instrument, noteStartAt, noteDuration, 0.2);
    }
  });
}

const frequencyToNearestMidi = (frequency: number): number =>
  Math.round(69 + 12 * Math.log2(frequency / 440));

export async function playScaleFrequencies(
  frequencies: number[],
  instrument: InstrumentType,
  noteDuration: number = 0.4,
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const spacing = noteDuration + 0.08;
  const startAt = context.currentTime + 0.02;
  const profile = INSTRUMENT_PROFILES[instrument];
  if (profile.type !== "melodic") return;

  await preloadInstrumentSamples(instrument);

  frequencies.forEach((frequency, index) => {
    if (!Number.isFinite(frequency) || frequency <= 0) return;
    const nearestMidi = frequencyToNearestMidi(frequency);
    const noteStartAt = startAt + index * spacing;
    if (
      scheduleSampledMelodicNote(context, nearestMidi, instrument, noteStartAt, noteDuration, 0.28, frequency)
    ) {
      return;
    }
    if (!SYNTHETIC_FALLBACK_ENABLED) return;
    scheduleSynthMelodicNote(context, nearestMidi, instrument, noteStartAt, noteDuration, 0.2, frequency);
  });
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

  if (scheduleSampledMelodicNote(context, midiNumber, instrument, startTime, duration, gain, targetFrequency))
    return;
  if (!SYNTHETIC_FALLBACK_ENABLED) return;

  scheduleSynthMelodicNote(context, midiNumber, instrument, startTime, duration, gain, targetFrequency);
}

import {midiToFrequency} from "@/engines/nota/data";
import {
  MELODIC_SAMPLE_LIBRARY,
  PERCUSSION_SAMPLE_LIBRARY,
  PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT,
} from "@/engines/ses/sample-library";
import type {MelodicSampleRef, PercussionSampleSet} from "@/engines/ses/sample-library";

export type PercussionSymbol = "dum" | "tek" | "ke";

export type InstrumentType =
  | "ney"
  | "ud"
  | "kemençe"
  | "tanpura"
  | "bendir"
  | "kudum"
  | "davul"
  | "def";

interface Formant {
  frequency: number;
  gain: number;
  q: number;
}

interface InstrumentProfile {
  type: "melodic" | "percussion";
  harmonics?: number[];
  harmonicGains?: number[];
  attackTime: number;
  decayTime: number;
  sustainLevel: number;
  releaseTime: number;
  brightness?: number;
  noiseAmount?: number;
  formants?: Formant[];
  vibratoRate?: number;
  vibratoDepth?: number;
}

const INSTRUMENT_PROFILES: Record<InstrumentType, InstrumentProfile> = {
  ney: {
    type: "melodic",
    harmonics: [1, 2, 3, 4, 5, 6],
    harmonicGains: [1, 0.5, 0.22, 0.08, 0.035, 0.015],
    attackTime: 0.08,
    decayTime: 0.15,
    sustainLevel: 0.85,
    releaseTime: 0.25,
    brightness: 0.4,
    noiseAmount: 0.12,
    formants: [
      {frequency: 800, gain: 0.4, q: 3},
      {frequency: 1500, gain: 0.25, q: 4},
    ],
    vibratoRate: 5.5,
    vibratoDepth: 0.08,
  },
  ud: {
    type: "melodic",
    harmonics: [1, 2, 3, 4, 5, 6, 7, 8],
    harmonicGains: [1, 0.45, 0.25, 0.15, 0.08, 0.045, 0.025, 0.012],
    attackTime: 0.003,
    decayTime: 0.35,
    sustainLevel: 0.15,
    releaseTime: 0.3,
    brightness: 0.65,
    noiseAmount: 0.03,
    formants: [
      {frequency: 600, gain: 0.35, q: 2.5},
      {frequency: 1200, gain: 0.2, q: 3},
    ],
  },
  kemençe: {
    type: "melodic",
    harmonics: [1, 2, 3, 4, 5, 6, 7, 8],
    harmonicGains: [1, 0.6, 0.35, 0.2, 0.12, 0.07, 0.04, 0.02],
    attackTime: 0.04,
    decayTime: 0.2,
    sustainLevel: 0.75,
    releaseTime: 0.22,
    brightness: 0.55,
    noiseAmount: 0.08,
    formants: [
      {frequency: 900, gain: 0.45, q: 3.5},
      {frequency: 1800, gain: 0.3, q: 4},
    ],
    vibratoRate: 6.5,
    vibratoDepth: 0.06,
  },
  tanpura: {
    type: "melodic",
    harmonics: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    harmonicGains: [1, 0.55, 0.38, 0.28, 0.2, 0.14, 0.1, 0.07, 0.05, 0.035, 0.022, 0.015],
    attackTime: 0.06,
    decayTime: 0.08,
    sustainLevel: 0.9,
    releaseTime: 0.6,
    brightness: 0.35,
    noiseAmount: 0.02,
    formants: [
      {frequency: 250, gain: 0.5, q: 2},
      {frequency: 600, gain: 0.3, q: 2.5},
    ],
  },
  bendir: {
    type: "percussion",
    harmonics: [1, 2.4, 3.5, 5.2],
    harmonicGains: [1, 0.6, 0.3, 0.15],
    attackTime: 0.001,
    decayTime: 0.25,
    sustainLevel: 0,
    releaseTime: 0.3,
    brightness: 0.4,
    noiseAmount: 0.15,
  },
  kudum: {
    type: "percussion",
    harmonics: [1, 3.1, 5.2, 7.8],
    harmonicGains: [1, 0.5, 0.25, 0.12],
    attackTime: 0.001,
    decayTime: 0.12,
    sustainLevel: 0,
    releaseTime: 0.15,
    brightness: 0.7,
    noiseAmount: 0.2,
  },
  davul: {
    type: "percussion",
    harmonics: [1, 1.8, 2.9],
    harmonicGains: [1, 0.7, 0.35],
    attackTime: 0.001,
    decayTime: 0.35,
    sustainLevel: 0,
    releaseTime: 0.4,
    brightness: 0.3,
    noiseAmount: 0.25,
  },
  def: {
    type: "percussion",
    harmonics: [1, 4.2, 6.8, 9.5],
    harmonicGains: [1, 0.45, 0.22, 0.1],
    attackTime: 0.001,
    decayTime: 0.08,
    sustainLevel: 0,
    releaseTime: 0.2,
    brightness: 0.85,
    noiseAmount: 0.3,
  },
};

const MAX_SAMPLE_TRANSPOSITION_SEMITONES = 7;
const SYNTHETIC_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK === "true";
const sampleBufferPromises = new Map<string, Promise<AudioBuffer | null>>();
const decodedSampleBuffers = new Map<string, AudioBuffer | null>();
let availableSampleUrls: Set<string> | null = null;
let availableSampleUrlsPromise: Promise<Set<string>> | null = null;

function isPercussionSymbol(symbol: string): symbol is PercussionSymbol {
  return symbol === "dum" || symbol === "tek" || symbol === "ke";
}

type BrowserAudioContext = AudioContext & {
  close?: () => Promise<void>;
};

// Audio Context Lifecycle Management
let audioContext: BrowserAudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

// Active oscillators tracking for stopAll
const activeOscillators = new Set<OscillatorNode>();
const activeSources = new Set<AudioBufferSourceNode>();

export function getAudioContext(): BrowserAudioContext | null {
  return audioContext;
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.AudioContext ?? (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
}

function getOrCreateAudioContext(): BrowserAudioContext | null {
  // If context exists but is closed, clean up and create new
  if (audioContext?.state === "closed") {
    disposeAudioContext();
  }

  if (audioContext) {
    return audioContext;
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor() as BrowserAudioContext;
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(audioContext.destination);

  return audioContext;
}

function getOrCreateNoiseBuffer(context: BrowserAudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;

  noiseBuffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * 0.5),
    context.sampleRate
  );
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  return noiseBuffer;
}

function disposeAudioContext(): void {
  if (audioContext?.state !== "closed") {
    audioContext?.close().catch(() => undefined);
  }
  audioContext = null;
  masterGain = null;
  noiseBuffer = null;
  activeOscillators.clear();
  activeSources.clear();
}

function trackOscillator(osc: OscillatorNode): void {
  activeOscillators.add(osc);
  osc.addEventListener("ended", () => {
    activeOscillators.delete(osc);
  });
}

function trackSource(source: AudioBufferSourceNode): void {
  activeSources.add(source);
  source.addEventListener("ended", () => {
    activeSources.delete(source);
  });
}

function applyADSREnvelope(
  gainNode: GainNode,
  startAt: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  duration: number,
  peakGain: number,
): void {
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.0001), startAt + attack);
  gainNode.gain.exponentialRampToValueAtTime(
    Math.max(sustain * peakGain, 0.0001),
    startAt + attack + decay
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    startAt + Math.max(duration, attack + decay) + release
  );
}

function scheduleHarmonicOscillator(
  context: BrowserAudioContext,
  baseFrequency: number,
  harmonic: number,
  gainValue: number,
  startAt: number,
  duration: number,
  profile: InstrumentProfile,
): void {
  if (!masterGain) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(baseFrequency * harmonic, startAt);

  // HATA DÜZELTME: gainValue zaten hesaplanmış gain içeriyor, tekrar çarpma!
  const peakGain = gainValue;
  applyADSREnvelope(
    gainNode,
    startAt,
    profile.attackTime,
    profile.decayTime,
    profile.sustainLevel,
    profile.releaseTime,
    duration,
    peakGain
  );

  oscillator.connect(gainNode);
  gainNode.connect(masterGain);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + profile.releaseTime + 0.1);
}

function scheduleNoiseBurst(
  context: BrowserAudioContext,
  startAt: number,
  duration: number,
  gainValue: number,
  brightness: number,
): void {
  if (!masterGain) return;

  const buffer = getOrCreateNoiseBuffer(context);
  const noiseSource = context.createBufferSource();
  noiseSource.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(brightness * 8000 + 500, startAt);
  filter.Q.value = 0.5;

  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.0001), startAt + 0.002);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);

  noiseSource.start(startAt);
  noiseSource.stop(startAt + duration + 0.05);
}

async function loadSampleBuffer(context: BrowserAudioContext, url: string): Promise<AudioBuffer | null> {
  if (!sampleBufferPromises.has(url)) {
    const promise = fetch(url, {cache: "reload"})
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return context.decodeAudioData(arrayBuffer);
      })
      .catch(() => null)
      .then((buffer) => {
        decodedSampleBuffers.set(url, buffer);
        if (!buffer) {
          sampleBufferPromises.delete(url);
          decodedSampleBuffers.delete(url);
        }
        return buffer;
      });

    sampleBufferPromises.set(url, promise);
  }

  return sampleBufferPromises.get(url)!;
}

export function clearSampleCache(): void {
  sampleBufferPromises.clear();
  decodedSampleBuffers.clear();
  availableSampleUrls = null;
  availableSampleUrlsPromise = null;
}

async function preloadSampleUrls(context: BrowserAudioContext, urls: string[]): Promise<boolean> {
  const availableUrls = await getAvailableSampleUrls();
  const loadableUrls = urls.filter((url) => availableUrls.has(url));
  if (loadableUrls.length === 0) return false;

  const buffers = await Promise.all(loadableUrls.map((url) => loadSampleBuffer(context, url)));
  return buffers.some((buffer) => buffer !== null);
}

async function getAvailableSampleUrls(): Promise<Set<string>> {
  if (availableSampleUrls) return availableSampleUrls;

  if (!availableSampleUrlsPromise) {
    availableSampleUrlsPromise = fetch("/api/samples", {cache: "no-store"})
      .then(async (response) => {
        if (!response.ok) return new Set<string>();

        const data = await response.json() as {
          slots?: Array<{url: string; installed: boolean}>;
        };

        return new Set(
          (data.slots ?? [])
            .filter((slot) => slot.installed)
            .map((slot) => slot.url)
        );
      })
      .catch(() => new Set<string>())
      .then((urls) => {
        availableSampleUrls = urls;
        return urls;
      });
  }

  return availableSampleUrlsPromise;
}

function getLoadedBuffer(url: string): AudioBuffer | null {
  return decodedSampleBuffers.get(url) ?? null;
}

function getNearestLoadedMelodicSample(
  samples: MelodicSampleRef[] | undefined,
  midiNumber: number,
): {sample: MelodicSampleRef; buffer: AudioBuffer} | null {
  if (!samples) return null;

  let best: {sample: MelodicSampleRef; buffer: AudioBuffer; distance: number} | null = null;

  for (const sample of samples) {
    const buffer = getLoadedBuffer(sample.url);
    if (!buffer) continue;

    const distance = Math.abs(sample.midiNumber - midiNumber);
    if (distance > MAX_SAMPLE_TRANSPOSITION_SEMITONES) continue;

    if (!best || distance < best.distance) {
      best = {sample, buffer, distance};
    }
  }

  return best ? {sample: best.sample, buffer: best.buffer} : null;
}

function getFirstLoadedPercussionSample(
  symbol: PercussionSymbol,
  isAccent: boolean,
  percussionInstrument?: InstrumentType,
): AudioBuffer | null {
  const sampleSet = getPercussionSampleSet(symbol, percussionInstrument);
  const urls = isAccent ? [...(sampleSet.accentUrls ?? []), ...sampleSet.urls] : sampleSet.urls;

  for (const url of urls) {
    const buffer = getLoadedBuffer(url);
    if (buffer) return buffer;
  }

  return null;
}

function getPercussionSampleSet(symbol: PercussionSymbol, percussionInstrument?: InstrumentType): PercussionSampleSet {
  if (percussionInstrument) {
    const instrumentSet = PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT[percussionInstrument]?.[symbol];
    if (instrumentSet) return instrumentSet;
  }

  return PERCUSSION_SAMPLE_LIBRARY[symbol];
}

function scheduleSampleBuffer(
  context: BrowserAudioContext,
  buffer: AudioBuffer,
  playbackRate: number,
  startAt: number,
  duration: number,
  gainValue: number,
  releaseTime: number,
): void {
  if (!masterGain) return;

  const source = context.createBufferSource();
  const gainNode = context.createGain();
  const releaseStart = startAt + duration;
  const stopAt = releaseStart + releaseTime + 0.05;

  source.buffer = buffer;
  source.playbackRate.setValueAtTime(playbackRate, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.0001), startAt + 0.005);
  gainNode.gain.setValueAtTime(Math.max(gainValue, 0.0001), releaseStart);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  source.connect(gainNode);
  gainNode.connect(masterGain);

  source.start(startAt);
  source.stop(stopAt);
  trackSource(source);
}

function scheduleSampledMelodicNote(
  context: BrowserAudioContext,
  midiNumber: number,
  instrument: InstrumentType,
  startAt: number,
  duration: number,
  gain: number,
): boolean {
  const match = getNearestLoadedMelodicSample(MELODIC_SAMPLE_LIBRARY[instrument], midiNumber);
  if (!match) return false;

  const profile = INSTRUMENT_PROFILES[instrument];
  const playbackRate = Math.pow(2, (midiNumber - match.sample.midiNumber) / 12);
  scheduleSampleBuffer(context, match.buffer, playbackRate, startAt, duration, gain, profile.releaseTime);
  return true;
}

function scheduleSampledPercussionHit(
  context: BrowserAudioContext,
  symbol: PercussionSymbol,
  isAccent: boolean,
  startAt: number,
  beatDuration: number,
  percussionInstrument?: InstrumentType,
): boolean {
  const buffer = getFirstLoadedPercussionSample(symbol, isAccent, percussionInstrument);
  if (!buffer) return false;

  const durationBySymbol: Record<PercussionSymbol, number> = {
    dum: beatDuration * 0.8,
    tek: beatDuration * 0.4,
    ke: beatDuration * 0.3,
  };
  const gainBySymbol: Record<PercussionSymbol, number> = {
    dum: isAccent ? 0.75 : 0.55,
    tek: isAccent ? 0.62 : 0.46,
    ke: isAccent ? 0.55 : 0.4,
  };

  scheduleSampleBuffer(context, buffer, 1, startAt, durationBySymbol[symbol], gainBySymbol[symbol], 0.05);
  return true;
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

export async function initAudio(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const context = getOrCreateAudioContext();

    if (!context || !masterGain) {
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

export async function playInstrumentNote(
  midiNumber: number,
  instrument: InstrumentType,
  duration: number = 0.5,
  gain: number = 0.22,
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const frequency = midiToFrequency(midiNumber);
  const startAt = context.currentTime + 0.01;
  const profile = INSTRUMENT_PROFILES[instrument];

  if (profile.type === "melodic") {
    await preloadInstrumentSamples(instrument);
    if (scheduleSampledMelodicNote(context, midiNumber, instrument, startAt, duration, gain)) {
      return;
    }

    if (!SYNTHETIC_FALLBACK_ENABLED) return;
  }

  if (profile.type === "melodic" && profile.harmonics) {
    // Her harmonik için osilatör oluştur
    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];

    for (let i = 0; i < profile.harmonics.length; i++) {
      const osc = context.createOscillator();
      const gainNode = context.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency * profile.harmonics[i], startAt);

      // Vibrato ekle (eğer tanımlıysa)
      if (profile.vibratoRate && profile.vibratoDepth && profile.vibratoDepth > 0) {
        const vibratoOsc = context.createOscillator();
        const vibratoGain = context.createGain();
        vibratoOsc.frequency.value = profile.vibratoRate;
        vibratoGain.gain.value = frequency * profile.vibratoDepth * profile.harmonics[i];
        vibratoOsc.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibratoOsc.start(startAt);
        vibratoOsc.stop(startAt + duration + profile.releaseTime + 0.1);
      }

      const harmonicGain = gain * (profile.harmonicGains?.[i] ?? 0.1);
      applyADSREnvelope(
        gainNode,
        startAt,
        profile.attackTime,
        profile.decayTime,
        profile.sustainLevel,
        profile.releaseTime,
        duration,
        harmonicGain
      );

      osc.connect(gainNode);
      oscillators.push(osc);
      gainNodes.push(gainNode);
    }

    // Formant filtreleri uygula
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

      lastNode.connect(masterGain!);
    } else {
      for (const gn of gainNodes) {
        gn.connect(masterGain!);
      }
    }

    for (const osc of oscillators) {
      osc.start(startAt);
      osc.stop(startAt + duration + profile.releaseTime + 0.1);
    }

    // Attack noise (hışırtı) ekle
    if (profile.noiseAmount && profile.noiseAmount > 0) {
      const buffer = getOrCreateNoiseBuffer(context);
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = context.createGain();
      const noiseFilter = context.createBiquadFilter();

      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = frequency * 1.5;
      noiseFilter.Q.value = 1;

      noiseGain.gain.setValueAtTime(0.0001, startAt);
      noiseGain.gain.exponentialRampToValueAtTime(
        gain * profile.noiseAmount,
        startAt + Math.min(profile.attackTime * 0.5, 0.02)
      );
      noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + profile.attackTime + 0.05
      );

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain!);
      noise.start(startAt);
      noise.stop(startAt + profile.attackTime + 0.1);
    }
  } else if (profile.type === "percussion") {
    // Perküsyon için özel ses
    await preloadPercussionSymbolSamples(["tek"]);
    if (!scheduleSampledPercussionHit(context, "tek", false, startAt, duration)) {
      if (!SYNTHETIC_FALLBACK_ENABLED) return;
      schedulePercussionHit(context, "tek", false, startAt, duration);
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

  let instrument: InstrumentType;
  let baseFreq: number;
  let duration: number;
  let gain: number;

  switch (symbol) {
    case "dum":
      instrument = "bendir";
      baseFreq = 80;
      duration = beatDuration * 0.8;
      gain = isAccent ? 0.45 : 0.3;
      break;
    case "tek":
      instrument = "kudum";
      baseFreq = 200;
      duration = beatDuration * 0.4;
      gain = isAccent ? 0.3 : 0.2;
      break;
    case "ke":
      instrument = "def";
      baseFreq = 800;
      duration = beatDuration * 0.3;
      gain = isAccent ? 0.28 : 0.18;
      break;
  }

  const profile = INSTRUMENT_PROFILES[instrument];

  await preloadPercussionSymbolSamples([symbol], percussionInstrument);
  if (scheduleSampledPercussionHit(context, symbol, isAccent, startAt, beatDuration, percussionInstrument)) {
    return;
  }

  if (!SYNTHETIC_FALLBACK_ENABLED) return;

  if (profile.type === "percussion" && profile.harmonics) {
    for (let i = 0; i < profile.harmonics.length; i++) {
      const harmonicFreq = profile.harmonics[i] * baseFreq;
      scheduleHarmonicOscillator(
        context,
        harmonicFreq,
        1,
        gain * (profile.harmonicGains?.[i] ?? 0.3),
        startAt,
        duration,
        profile
      );
    }

    if (profile.noiseAmount && profile.noiseAmount > 0) {
      scheduleNoiseBurst(
        context,
        startAt,
        duration * 0.4,
        gain * profile.noiseAmount,
        profile.brightness ?? 0.5
      );
    }
  }
}

export async function playMelodicNote(
  midiNumber: number,
  instrument: InstrumentType,
  duration: number = 0.5,
  gain: number = 0.2,
): Promise<void> {
  const profile = INSTRUMENT_PROFILES[instrument];
  if (profile.type !== "melodic") return;
  await playInstrumentNote(midiNumber, instrument, duration, gain);
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
    const frequency = midiToFrequency(midiNumber);
    const noteStartAt = startAt + index * spacing;

    if (profile.type === "melodic") {
      if (scheduleSampledMelodicNote(
        context,
        midiNumber,
        instrument,
        noteStartAt,
        noteDuration,
        0.28,
      )) {
        return;
      }

      if (!SYNTHETIC_FALLBACK_ENABLED) return;
    }

    if (profile.type === "melodic" && profile.harmonics) {
      for (let i = 0; i < profile.harmonics.length; i++) {
        scheduleHarmonicOscillator(
          context,
          frequency,
          profile.harmonics[i],
          0.2 * (profile.harmonicGains?.[i] ?? 0.1),
          noteStartAt,
          noteDuration,
          profile
        );
      }
    }
  });
}

export async function playRhythmWithPercussion(
  beats: number,
  symbols: Array<{beat: number; symbol: string; isAccent: boolean}>,
  bpm: number = 120,
  percussionInstrument?: InstrumentType,
): Promise<void> {
  const ok = await initAudio();
  const context = getOrCreateAudioContext();
  if (!ok || !context) return;

  const beatDuration = 60 / bpm;
  await preloadPercussionSymbolSamples(
    symbols
      .map((symbol) => symbol.symbol)
      .filter(isPercussionSymbol),
    percussionInstrument,
  );

  for (let i = 0; i < beats; i++) {
    const symbol = symbols[i];
    if (!symbol || !isPercussionSymbol(symbol.symbol)) continue;

    const startAt = context.currentTime + 0.02 + i * beatDuration;
    const accent = symbol.isAccent;

    if (!scheduleSampledPercussionHit(context, symbol.symbol, accent, startAt, beatDuration, percussionInstrument)) {
      if (!SYNTHETIC_FALLBACK_ENABLED) continue;
      schedulePercussionHit(context, symbol.symbol, accent, startAt, beatDuration);
    }
  }
}

function schedulePercussionHit(
  context: BrowserAudioContext,
  symbol: PercussionSymbol,
  isAccent: boolean,
  startAt: number,
  beatDuration: number,
): void {
  if (!masterGain) return;

  switch (symbol) {
    case "dum": {
      const drumFreq = isAccent ? 66 : 62;
      const drumDuration = beatDuration * 0.6;

      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(drumFreq, startAt);
      osc.frequency.exponentialRampToValueAtTime(drumFreq * 0.5, startAt + drumDuration);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(isAccent ? 0.5 : 0.35, startAt + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + drumDuration);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startAt);
      osc.stop(startAt + drumDuration + 0.05);

      {
        const buffer = getOrCreateNoiseBuffer(context);
        const noise = context.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 150;
        noiseGain.gain.setValueAtTime(0.0001, startAt);
        noiseGain.gain.exponentialRampToValueAtTime(isAccent ? 0.2 : 0.12, startAt + 0.002);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.03);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(startAt);
        noise.stop(startAt + 0.05);
      }
      break;
    }

    case "tek": {
      const baseFreq = isAccent ? 110 : 100;
      const tekDuration = beatDuration * 0.25;
      const gain = isAccent ? 0.35 : 0.25;

      const osc = context.createOscillator();
      const gainNode = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, startAt);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startAt + tekDuration);

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.002);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + tekDuration);

      osc.connect(gainNode);
      gainNode.connect(masterGain!);
      osc.start(startAt);
      osc.stop(startAt + tekDuration + 0.05);

      {
        const buffer = getOrCreateNoiseBuffer(context);
        const noise = context.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 3000;
        filter.Q.value = 1;
        noiseGain.gain.setValueAtTime(0.0001, startAt);
        noiseGain.gain.exponentialRampToValueAtTime(gain * 0.15, startAt + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.02);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain!);
        noise.start(startAt);
        noise.stop(startAt + 0.05);
      }
      break;
    }

    case "ke": {
      const keDuration = beatDuration * 0.15;

      {
        const buffer = getOrCreateNoiseBuffer(context);
        const noise = context.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 4000;
        noiseGain.gain.setValueAtTime(0.0001, startAt);
        noiseGain.gain.exponentialRampToValueAtTime(isAccent ? 0.18 : 0.1, startAt + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + keDuration);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(startAt);
        noise.stop(startAt + keDuration + 0.02);
      }
      break;
    }
  }
}

export function stopAll(): void {
  // Stop all active oscillators
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // Already stopped
    }
  });
  activeOscillators.clear();

  // Stop all active buffer sources
  activeSources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // Already stopped
    }
  });
  activeSources.clear();

  // Suspend audio context
  if (audioContext?.state === "running") {
    audioContext.suspend().catch(() => undefined);
  }
}

export function playInstrumentNoteScheduled(
  midiNumber: number,
  instrument: InstrumentType,
  duration: number,
  gain: number,
  startTime: number,
): void {
  const context = getAudioContext();
  if (!context || !masterGain) return;

  const frequency = midiToFrequency(midiNumber);
  const profile = INSTRUMENT_PROFILES[instrument];

  if (profile.type !== "melodic") return;

  if (scheduleSampledMelodicNote(context, midiNumber, instrument, startTime, duration, gain)) {
    return;
  }

  if (!SYNTHETIC_FALLBACK_ENABLED) return;

  if (!profile.harmonics) return;

  // Her harmonik için osilatör oluştur
  const oscillators: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];

  for (let i = 0; i < profile.harmonics.length; i++) {
    const osc = context.createOscillator();
    const gainNode = context.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency * profile.harmonics[i], startTime);

    // Vibrato ekle (eğer tanımlıysa)
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

  // Formant filtreleri uygula
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

  // Attack noise (hışırtı) ekle
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

export {INSTRUMENT_PROFILES};

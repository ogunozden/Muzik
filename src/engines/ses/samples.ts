import { getMasterGain, trackSource } from "./core";
import type { BrowserAudioContext } from "./core";
import { midiToFrequency } from "@/engines/nota/data";
import { INSTRUMENT_PROFILES } from "./profiles";
import type { InstrumentType, PercussionSymbol } from "./profiles";
import {
  MELODIC_SAMPLE_LIBRARY,
  PERCUSSION_SAMPLE_LIBRARY,
  PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT,
} from "./sample-library";
import type { MelodicSampleRef, PercussionSampleSet } from "./sample-library";

const MAX_SAMPLE_TRANSPOSITION_SEMITONES = 7;
const sampleBufferPromises = new Map<string, Promise<AudioBuffer | null>>();
const decodedSampleBuffers = new Map<string, AudioBuffer | null>();
let availableSampleUrls: Set<string> | null = null;
let availableSampleUrlsPromise: Promise<Set<string>> | null = null;

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

export async function preloadSampleUrls(context: BrowserAudioContext, urls: string[]): Promise<boolean> {
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
        // Sunucu hatasi (5xx/404): gecici kabul et, KALICI cache'leme.
        if (!response.ok) throw new Error(`samples endpoint ${response.status}`);

        const data = await response.json() as {
          slots?: Array<{url: string; installed: boolean}>;
        };

        const urls = new Set(
          (data.slots ?? [])
            .filter((slot) => slot.installed)
            .map((slot) => slot.url)
        );
        // Yalniz BASARILI yanit kalici cache'lenir (bos olsa da: gercekten kurulu
        // sample yok demektir). Boylece sonraki cagrilar hizli yol izler.
        availableSampleUrls = urls;
        return urls;
      })
      .catch(() => {
        // Gecici hata (ag reddi / 5xx): sonucu cache'LEME; promise'i sifirla ki
        // bir sonraki cagri yeniden denesin — yoksa oturum boyu sessiz ses kaybi.
        availableSampleUrlsPromise = null;
        return new Set<string>();
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

function frequencyToMidiNumber(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function getPercussionSampleSet(symbol: PercussionSymbol, percussionInstrument?: InstrumentType): PercussionSampleSet {
  if (percussionInstrument) {
    const instrumentSet = PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT[percussionInstrument]?.[symbol];
    if (instrumentSet) return instrumentSet;
  }

  return PERCUSSION_SAMPLE_LIBRARY[symbol];
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

function scheduleSampleBuffer(
  context: BrowserAudioContext,
  buffer: AudioBuffer,
  playbackRate: number,
  startAt: number,
  duration: number,
  gainValue: number,
  releaseTime: number,
): void {
  const masterGain = getMasterGain();
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

export function scheduleSampledMelodicNote(
  context: BrowserAudioContext,
  midiNumber: number,
  instrument: InstrumentType,
  startAt: number,
  duration: number,
  gain: number,
  targetFrequency?: number,
): boolean {
  const targetMidiNumber =
    typeof targetFrequency === "number" && Number.isFinite(targetFrequency)
      ? frequencyToMidiNumber(targetFrequency)
      : midiNumber;
  const match = getNearestLoadedMelodicSample(MELODIC_SAMPLE_LIBRARY[instrument], targetMidiNumber);
  if (!match) return false;

  const profile = INSTRUMENT_PROFILES[instrument];
  const desiredFrequency =
    typeof targetFrequency === "number" && Number.isFinite(targetFrequency)
      ? targetFrequency
      : midiToFrequency(midiNumber);
  const playbackRate = desiredFrequency / midiToFrequency(match.sample.midiNumber);
  scheduleSampleBuffer(context, match.buffer, playbackRate, startAt, duration, gain, profile.releaseTime);
  return true;
}

export function scheduleSampledPercussionHit(
  context: BrowserAudioContext,
  symbol: PercussionSymbol,
  isAccent: boolean,
  startAt: number,
  beatDuration: number,
  percussionInstrument?: InstrumentType,
  gainScale: number = 1,
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

  // gainScale: velvele susleme vuruslarini (F12.4) ana darplardan kisar.
  scheduleSampleBuffer(context, buffer, 1, startAt, durationBySymbol[symbol], gainBySymbol[symbol] * gainScale, 0.05);
  return true;
}

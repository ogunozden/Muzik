import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MELODIC_SAMPLE_LIBRARY} from "../sample-library";
import {midiToFrequency} from "@/engines/nota/data";
import type {InstrumentType} from "../profiles";

// KRITIK: ../samples GERCEK calisir (mevcut scheduled-percussion.test'in tersine,
// o tumuyle mock'luyor). Yalniz ../core stub'lanir. Bu test playbackRate
// (makam koma-perde dogrulugunun ozu) + transpozisyon sinirini kapsar.
vi.mock("../core", () => ({
  getMasterGain: () => ({}), // truthy olmali, yoksa scheduleSampleBuffer erken doner
  trackSource: vi.fn(),
}));

// Kutuphaneden gercek bir (enstruman, midi, url) uclusu sec (deterministik).
const instrument = Object.keys(MELODIC_SAMPLE_LIBRARY).find(
  (key) => MELODIC_SAMPLE_LIBRARY[key].length > 0,
) as InstrumentType;
const sampleRef = MELODIC_SAMPLE_LIBRARY[instrument][0];
const sampleFreq = midiToFrequency(sampleRef.midiNumber);

let capturedRate: number | undefined;

function makeContext() {
  return {
    currentTime: 0,
    decodeAudioData: vi.fn(async () => ({duration: 1}) as unknown as AudioBuffer),
    createBufferSource: () => ({
      buffer: null,
      playbackRate: {
        setValueAtTime: (v: number) => {
          capturedRate = v;
        },
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    createGain: () => ({
      gain: {setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn()},
      connect: vi.fn(),
    }),
  } as never;
}

function installFetch(installedUrls: string[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (String(input).startsWith("/api/samples")) {
        return {ok: true, json: async () => ({slots: installedUrls.map((url) => ({url, installed: true}))})};
      }
      return {ok: true, arrayBuffer: async () => new ArrayBuffer(8)};
    }),
  );
}

describe("scheduleSampledMelodicNote — mikrotonal playbackRate", () => {
  beforeEach(() => {
    capturedRate = undefined;
  });
  afterEach(async () => {
    const {clearSampleCache} = await import("../samples");
    clearSampleCache();
    vi.unstubAllGlobals();
  });

  it("koma-kaydirilmis targetFrequency icin dogru playbackRate uretir", async () => {
    const {preloadSampleUrls, scheduleSampledMelodicNote} = await import("../samples");
    const ctx = makeContext();
    installFetch([sampleRef.url]);
    await preloadSampleUrls(ctx, [sampleRef.url]);

    const target = sampleFreq * Math.pow(2, 1 / 53); // +1 koma (53-EDO)
    const ok = scheduleSampledMelodicNote(ctx, sampleRef.midiNumber, instrument, 0, 1, 0.5, target);
    expect(ok).toBe(true);
    expect(capturedRate).toBeCloseTo(target / sampleFreq, 5);
  });

  it("7 yaritona kadar transpoze eder, 8'de basarisiz (null -> false)", async () => {
    const {preloadSampleUrls, scheduleSampledMelodicNote} = await import("../samples");
    const ctx = makeContext();
    installFetch([sampleRef.url]); // yalniz TEK sample yuklu
    await preloadSampleUrls(ctx, [sampleRef.url]);

    expect(scheduleSampledMelodicNote(ctx, sampleRef.midiNumber + 7, instrument, 0, 1, 0.5)).toBe(true);
    expect(scheduleSampledMelodicNote(ctx, sampleRef.midiNumber + 8, instrument, 0, 1, 0.5)).toBe(false);
  });

  it("targetFrequency yoksa playbackRate = 2^((midi - sampleMidi)/12)", async () => {
    const {preloadSampleUrls, scheduleSampledMelodicNote} = await import("../samples");
    const ctx = makeContext();
    installFetch([sampleRef.url]);
    await preloadSampleUrls(ctx, [sampleRef.url]);

    scheduleSampledMelodicNote(ctx, sampleRef.midiNumber + 2, instrument, 0, 1, 0.5);
    expect(capturedRate).toBeCloseTo(Math.pow(2, 2 / 12), 5);
  });
});

describe("getPercussionSampleSet — enstruman fallback", () => {
  it("bir sembol icin bos olmayan sample seti dondurur", async () => {
    const {getPercussionSampleSet} = await import("../samples");
    const set = getPercussionSampleSet("dum");
    expect(set.urls.length).toBeGreaterThan(0);
  });
});

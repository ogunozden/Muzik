import {describe, expect, it, vi} from "vitest";

const scheduleSampledPercussionHitMock = vi.hoisted(() => vi.fn(() => false));
const schedulePercussionHitMock = vi.hoisted(() => vi.fn());

vi.mock("../core", () => ({
  getAudioContext: () => ({currentTime: 0}),
  getMasterGain: () => ({}),
  getOrCreateAudioContext: () => ({currentTime: 0}),
  getOrCreateNoiseBuffer: vi.fn(),
  stopAll: vi.fn(),
  trackOscillator: vi.fn(),
  trackSource: vi.fn(),
}));

vi.mock("../samples", () => ({
  clearSampleCache: vi.fn(),
  getPercussionSampleSet: vi.fn(() => ({urls: []})),
  preloadSampleUrls: vi.fn(async () => false),
  scheduleSampledMelodicNote: vi.fn(() => false),
  scheduleSampledPercussionHit: scheduleSampledPercussionHitMock,
}));

vi.mock("../synth", () => ({
  applyADSREnvelope: vi.fn(),
  schedulePercussionHit: schedulePercussionHitMock,
}));

describe("playPercussionSymbolScheduled", () => {
  it("uses synthetic percussion fallback when scheduled samples are missing", async () => {
    const {playPercussionSymbolScheduled} = await import("../instruments");

    const scheduled = playPercussionSymbolScheduled("dum", true, 1.25, 0.5, "kudum");

    expect(scheduled).toBe(true);
    expect(scheduleSampledPercussionHitMock).toHaveBeenCalledWith(
      {currentTime: 0},
      "dum",
      true,
      1.25,
      0.5,
      "kudum",
    );
    expect(schedulePercussionHitMock).toHaveBeenCalledWith(
      {currentTime: 0},
      "dum",
      true,
      1.25,
      0.5,
      "kudum",
    );
  });
});

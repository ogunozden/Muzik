import {describe, expect, it} from "vitest";
import {INSTRUMENTS, MELODIC_INSTRUMENTS, PERCUSSION_INSTRUMENTS} from "@/shared/config/instruments";
import {SAMPLE_SLOTS} from "../sample-library";
import {summarizeSampleCoverage} from "../sample-coverage";

describe("sample coverage summary", () => {
  it("covers every central instrument with a melodic or percussion sample slot group", () => {
    const coverage = summarizeSampleCoverage(SAMPLE_SLOTS.map((slot) => ({...slot, installed: true})));
    const instrumentIds = coverage.instruments.map((instrument) => instrument.instrumentId).sort();

    expect(instrumentIds).toEqual(INSTRUMENTS.map((instrument) => instrument.id).sort());
    expect(coverage.instrumentCount).toBe(INSTRUMENTS.length);
    expect(coverage.melodicInstrumentCount).toBe(MELODIC_INSTRUMENTS.length);
    expect(coverage.percussionInstrumentCount).toBe(PERCUSSION_INSTRUMENTS.length);
  });

  it("keeps missing melodic samples playable through synth fallback and requires percussion samples", () => {
    const coverage = summarizeSampleCoverage(SAMPLE_SLOTS.map((slot) => ({
      ...slot,
      installed: slot.category === "percussion",
    })));

    expect(coverage.playableInstrumentCount).toBe(INSTRUMENTS.length);
    expect(coverage.synthFallbackInstrumentCount).toBe(MELODIC_INSTRUMENTS.length);
    expect(coverage.instruments.filter((instrument) => instrument.category === "percussion").every((instrument) => instrument.installedSlots > 0)).toBe(true);
  });
});

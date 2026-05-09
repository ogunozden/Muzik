import {describe, expect, it} from "vitest";
import {koma53ToFrequency, parseSymbtrScore} from "../hicazkarPesrev";

const FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset",
  "1\t51\t\t\t0\t0\t28\t4\t0\t60\t0\tDevr-i Kebîr\t0.0",
  "2\t9\tFa5#4\tF5#4\t344\t344\t1\t4\t833\t95\t96\t1. HANE\t0.0357142857143",
  "3\t9\tLa5\tA5\t358\t358\t1\t4\t833\t95\t96\t\t0.0714285714286",
  "4\t9\tEs\tEs\t0\t0\t1\t8\t417\t95\t96\t\t0.0892857142857",
].join("\n");

describe("Hicazkar Pesrev SymbTr parser", () => {
  it("derives exact 53-comma frequencies from SymbTr Koma53 values", () => {
    const events = parseSymbtrScore(FIXTURE, 72);

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      sourcePitch: "F5#4",
      koma53: 344,
      midiNumber: 78,
      section: "1. HANE",
    });
    expect(events[0].targetFrequency).toBeCloseTo(koma53ToFrequency(344), 5);
    expect(events[1].targetFrequency).toBeCloseTo(880, 5);
  });

  it("keeps rests silent while preserving timing", () => {
    const events = parseSymbtrScore(FIXTURE, 72);

    expect(events[2]).toMatchObject({
      sourcePitch: "Es",
      midiNumber: null,
      koma53: null,
      targetFrequency: null,
      isRest: true,
      startBeat: 2,
      durationBeats: 0.5,
    });
  });
});

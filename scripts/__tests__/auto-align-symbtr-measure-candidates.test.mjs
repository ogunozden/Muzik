import {describe, expect, it} from "vitest";
import {buildMeasureRanges, readWrittenMeter} from "../auto-align-symbtr-measure-candidates.mjs";

const HEADER = "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset";

describe("auto-align-symbtr-measure-candidates", () => {
  it("mu2 yazili mertebeyi ilk veri satirindan okur", () => {
    const mu2 = ["9\t8\tPay\tPayda", "51\t\t28\t4\t\t\t\tDevr-i Kebir", "52\t\t1\t8\t168"].join("\n");
    expect(readWrittenMeter(mu2)).toEqual({numerator: 28, denominator: 4});
  });

  it("kanonik kurallarla olcu sinirlarini beat cinsinden uretir", () => {
    const txt = [
      HEADER,
      "1\t51\t\t\t0\t0\t4\t4\t0\t60\t0\tSofyan\t0.0",
      "2\t9\tDo5\tC5\t318\t318\t1\t4\t833\t95\t96\t\t0.1",
      "3\t9\tRe5\tD5\t322\t322\t1\t4\t833\t95\t96\t\t0.4",
      "4\t9\tMi5\tE5\t326\t326\t2\t4\t1667\t95\t96\t\t0.8",
      "5\t9\tFa5\tF5\t330\t330\t1\t4\t833\t95\t96\t\t1.6",
      "6\t9\tSol5\tG5\t334\t334\t1\t4\t833\t95\t96\t\t2.0",
      "7\t9\tLa5\tA5\t338\t338\t1\t4\t833\t95\t96\t\t2.4",
      "8\t9\tSi5\tB5\t342\t342\t1\t4\t833\t95\t96\t\t2.8",
    ].join("\n");

    const {measures, totalBeats} = buildMeasureRanges(txt, {numerator: 4, denominator: 4});
    expect(measures).toHaveLength(2);
    expect(measures[0]).toMatchObject({index: 1, startBeat: 0, endBeat: 4});
    expect(measures[1]).toMatchObject({index: 2, startBeat: 4, endBeat: 8});
    expect(totalBeats).toBe(8);
  });

  it("kod 52 (tempo) zamani ilerletmez; kod 51 mertebe degistirir", () => {
    const txt = [
      HEADER,
      "1\t9\tDo5\tC5\t318\t318\t1\t4\t833\t95\t96\t\t0.0",
      "2\t52\t\t\t\t\t1\t8\t\t\t\t\t",
      "3\t9\tRe5\tD5\t322\t322\t1\t4\t833\t95\t96\t\t0.5",
    ].join("\n");
    const {measures, totalBeats} = buildMeasureRanges(txt, {numerator: 2, denominator: 4});
    expect(measures).toHaveLength(1);
    expect(totalBeats).toBe(2);
  });
});

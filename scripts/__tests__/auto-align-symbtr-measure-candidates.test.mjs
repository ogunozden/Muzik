import {describe, expect, it} from "vitest";
import {
  buildMeasureRanges,
  buildStoredBoxLookup,
  classifyRepairActions,
  pickBetterAlignment,
  readWrittenMeter,
} from "../auto-align-symbtr-measure-candidates.mjs";

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

  it("kutu-bazli siniflandirma: ayni olcu/aday keep, farkli aday replace", () => {
    const boxes = [
      {measureIndex: 1, sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 1, leftPercent: 21.1, deltaPercent: 0.5},
      {measureIndex: 2, sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 2, leftPercent: 49.7, deltaPercent: 0.7},
    ];
    const storedByMeasure = new Map([
      [1, {measureIndex: 1, rowIndex: 0, indexInRow: 1, leftPercent: 21.1}],
      [2, {measureIndex: 2, rowIndex: 1, indexInRow: 0, leftPercent: 2.4}],
      [3, {measureIndex: 3, rowIndex: 0, indexInRow: 3, leftPercent: 80.1}],
    ]);

    const {actions, counts} = classifyRepairActions({boxes, storedByMeasure});

    expect(counts).toEqual({keep: 1, replace: 1, review: 1, add: 0});
    expect(actions.find((action) => action.measureIndex === 1)).toMatchObject({action: "keep"});
    const replace = actions.find((action) => action.measureIndex === 2);
    expect(replace).toMatchObject({
      action: "replace",
      reason: "different-candidate",
      proposed: {sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 2, leftPercent: 49.7},
    });
    expect(actions.find((action) => action.measureIndex === 3)).toMatchObject({action: "review", reason: "no-new-box"});
  });

  it("kutu-bazli siniflandirma: yeni hizalamanin ekledigi olculer add olur", () => {
    const boxes = [
      {measureIndex: 1, sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 0, leftPercent: 14.2},
      {measureIndex: 2, sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 1, leftPercent: 35.6},
    ];
    const storedByMeasure = new Map([[1, {measureIndex: 1, rowIndex: 0, indexInRow: 0, leftPercent: 14.2}]]);

    const {actions, counts} = classifyRepairActions({boxes, storedByMeasure});

    expect(counts).toEqual({keep: 1, replace: 0, review: 0, add: 1});
    expect(actions.find((action) => action.measureIndex === 2)).toMatchObject({action: "add"});
  });

  it("kutu-bazli siniflandirma: beklenen aralik disindaki yeni atama review olur (hint ile)", () => {
    const boxes = [
      {measureIndex: 1, sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 0, leftPercent: 2.4, deltaPercent: 9.1, contained: false},
    ];
    const storedByMeasure = new Map([
      [1, {measureIndex: 1, rowIndex: 2, indexInRow: 0, leftPercent: 2.389}],
    ]);

    const {actions, counts} = classifyRepairActions({boxes, storedByMeasure});

    expect(counts).toEqual({keep: 0, replace: 0, review: 1, add: 0});
    expect(actions[0]).toMatchObject({
      action: "review",
      reason: "proposed-outside-range",
      hint: {sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 0, leftPercent: 2.4},
    });
  });

  it("buildStoredBoxLookup stored manifest kutularini olcu indeksine gore indeksler", () => {
    const lookup = buildStoredBoxLookup({
      measureBoxes: [
        {measureIndex: 1, sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 1, leftPercent: 21.1},
        {measureIndex: 1, sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 2, leftPercent: 49.7},
      ],
    });

    expect(lookup.size).toBe(1);
    expect(lookup.get(1)).toEqual({measureIndex: 1, rowIndex: 0, indexInRow: 2, leftPercent: 49.7});
  });

  it("pickBetterAlignment anchor yalnizca deltayi dusurup coverage'i koruyorsa secer", () => {
    const projected = {medianDeltaPercent: 6.5, coverage: 0.95, confidence: "medium"};
    const anchored = {medianDeltaPercent: 4.1, coverage: 0.94, confidence: "high", anchorSource: "note-anchors"};
    expect(pickBetterAlignment(projected, anchored)).toBe(anchored);
  });

  it("pickBetterAlignment coverage cok dusuyorsa anchoru reddeder", () => {
    const projected = {medianDeltaPercent: 6.5, coverage: 0.95, confidence: "medium"};
    const anchored = {medianDeltaPercent: 4.1, coverage: 0.80, confidence: "medium", anchorSource: "note-anchors"};
    expect(pickBetterAlignment(projected, anchored)).toBe(projected);
  });

  it("pickBetterAlignment deltasi dusmeyen anchoru reddeder", () => {
    const projected = {medianDeltaPercent: 4.0, coverage: 0.95, confidence: "high"};
    const anchored = {medianDeltaPercent: 4.5, coverage: 1.0, confidence: "high", anchorSource: "note-anchors"};
    expect(pickBetterAlignment(projected, anchored)).toBe(projected);
  });

  it("pickBetterAlignment farkli tabanda (written-expanded) delta toleransiyla kabul eder", () => {
    const projected = {measureIndexBasis: "meter-walk-v2", medianDeltaPercent: 6.4, coverage: 0.63, confidence: "low"};
    const anchored = {
      measureIndexBasis: "written-expanded-v1",
      medianDeltaPercent: 9.0,
      coverage: 0.94,
      confidence: "medium",
      importable: false,
    };
    expect(pickBetterAlignment(projected, anchored)).toBe(anchored);
  });

  it("pickBetterAlignment farkli tabanda cok kotu deltayi reddeder", () => {
    const projected = {measureIndexBasis: "meter-walk-v2", medianDeltaPercent: 6.4, coverage: 0.63, confidence: "low"};
    const anchored = {
      measureIndexBasis: "written-expanded-v1",
      medianDeltaPercent: 12.0,
      coverage: 0.94,
      confidence: "low",
      importable: false,
    };
    expect(pickBetterAlignment(projected, anchored)).toBe(projected);
  });
});

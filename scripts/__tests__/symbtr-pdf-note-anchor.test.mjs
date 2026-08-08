import {describe, expect, it} from "vitest";
import {
  buildAnchorMeasureRanges,
  calibrateRowsSequential,
  countSymbTrEvents,
  extractNoteAnchors,
  extractTextRuns,
  interpolateBeatToX,
  matchAnchorsToEvents,
  tokenizeContent,
} from "../lib/symbtr-pdf-note-anchor.mjs";

const HEADER = "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset";

describe("symbtr-pdf-note-anchor", () => {
  it("countSymbTrEvents kanonik kurallarla event sayar", () => {
    const txt = [
      HEADER,
      "1\t51\t\t\t0\t0\t4\t4\t0\t60\t0\tSofyan\t0.0",
      "2\t9\tDo5\tC5\t318\t318\t1\t4\t833\t95\t96\t\t0.1",
      "3\t52\t\t\t\t\t1\t8\t\t\t\t\t",
      "4\t9\tRe5\tD5\t322\t322\t1\t4\t833\t95\t96\t\t0.4",
      "5\t9\tMi5\tE5\t326\t326\t2\t4\t1667\t95\t96\t\t0.8",
    ].join("\n");
    const {events, totalBeats} = countSymbTrEvents(txt);
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.beat)).toEqual([0, 1, 2]);
    expect(totalBeats).toBe(4);
  });

  it("extractTextRuns Tm/Tj mutlak konum verir, TD kaydirir", () => {
    const content = [
      "BT",
      "/F3 1 Tf",
      "21 0 0 21 100 700 Tm",
      "(x)Tj",
      "1.5 0.2 TD",
      "(*)Tj",
      "ET",
    ].join("\n");
    const runs = extractTextRuns(content);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({glyph: "x", x: 100, y: 700, font: "F3", fontSize: 1});
    expect(runs[1]).toMatchObject({glyph: "*", x: 100 + 1.5 * 21, y: 700 + 0.2 * 21});
  });

  it("extractTextRuns TJ dizisinde kerning ve glif konumlari isler", () => {
    const content = [
      "BT",
      "/TT7 1 Tf",
      "20 0 0 20 50 720 Tm",
      "[(x)-500(y)]TJ",
      "ET",
    ].join("\n");
    const runs = extractTextRuns(content);
    expect(runs).toHaveLength(2);
    expect(runs[0].x).toBe(50);
    expect(runs[1].x).toBeGreaterThan(runs[0].x);
  });

  it("extractNoteAnchors imza kumesini sol girintiyle eler, ayni x gliflerini kumeler", () => {
    const content = [
      "BT",
      "/F3 1 Tf",
      "21 0 0 21 14.2 722.7 Tm",
      "(q)Tj",
      "25 0 0 25 29 722.5 Tm",
      "(T)Tj",
      "21 0 0 21 124.38 728.6 Tm",
      "(x)Tj",
      "0 0 TD",
      "(x)Tj",
      "21 0 0 21 175.08 731.2 Tm",
      "(*)Tj",
      "ET",
    ].join("\n");
    const staffRows = [{rowIndex: 0, top: 733.08, bottom: 712.08, left: 14.22, right: 580.68}];
    const anchors = extractNoteAnchors({content, staffRows, pageSize: {width: 595.22, height: 842}});
    expect(anchors).toHaveLength(2);
    expect(anchors[0].x).toBe(124.38);
    expect(anchors[0].glyphs).toHaveLength(2);
    expect(anchors[1].x).toBe(175.08);
  });

  it("extractNoteAnchors satir basi imza gliflerini (q/T) anchor yapmaz", () => {
    const content = [
      "BT",
      "/F3 1 Tf",
      "21 0 0 21 14.2 722.7 Tm",
      "(q)Tj",
      "21 0 0 21 90 730 Tm",
      "(x)Tj",
      "ET",
    ].join("\n");
    const staffRows = [{rowIndex: 0, top: 733.08, bottom: 712.08, left: 14.22, right: 580.68}];
    const anchors = extractNoteAnchors({content, staffRows, pageSize: {width: 595.22, height: 842}});
    expect(anchors).toHaveLength(1);
    expect(anchors[0].x).toBe(90);
  });

  it("matchAnchorsToEvents sirali eslesme ile kalibrasyon kurar", () => {
    const anchors = [
      {rowIndex: 0, x: 100, xPercent: 20},
      {rowIndex: 0, x: 200, xPercent: 40},
      {rowIndex: 0, x: 300, xPercent: 60},
    ];
    const events = [
      {index: 1, beat: 0},
      {index: 2, beat: 1},
      {index: 3, beat: 2},
    ];
    const staffRows = [{rowIndex: 0, top: 733, bottom: 712, left: 14, right: 580}];
    const matched = matchAnchorsToEvents({anchors, events, rowIndex: 0, staffRows, totalBeats: 12});
    expect(matched.reason).toBe("calibrated");
    expect(matched.ratio).toBe(1);
    expect(matched.pairs.map((pair) => pair.beat)).toEqual([0, 1, 2]);
    expect(matched.pairs.map((pair) => pair.x)).toEqual([100, 200, 300]);
  });

  it("matchAnchorsToEvents oran disinda kalibrasyon kurmaz", () => {
    const anchors = Array.from({length: 6}, (_, index) => ({rowIndex: 0, x: 100 + index * 50, xPercent: 20}));
    const events = [{index: 1, beat: 0}];
    const staffRows = [{rowIndex: 0, top: 733, bottom: 712, left: 14, right: 580}];
    const matched = matchAnchorsToEvents({anchors, events, rowIndex: 0, staffRows, totalBeats: 12});
    expect(matched.reason).toBe("count-mismatch");
    expect(matched.pairs).toBeNull();
  });

  it("interpolateBeatToX aralik ici dogrusal, disarida egim uzatmasi ile kirpilir", () => {
    const pairs = [
      {beat: 0, x: 100},
      {beat: 4, x: 300},
      {beat: 8, x: 500},
    ];
    expect(interpolateBeatToX(pairs, 2, 0, 600)).toBe(200);
    expect(interpolateBeatToX(pairs, 10, 0, 600)).toBe(600);
    expect(interpolateBeatToX(pairs, -2, 0, 600)).toBe(0);
    expect(interpolateBeatToX(pairs, 6, 0, 600)).toBe(400);
  });

  it("buildAnchorMeasureRanges olcu sinirlarini anchor kalibrasyonuyla uretir", () => {
    const measures = [
      {index: 1, startBeat: 0, endBeat: 4},
      {index: 2, startBeat: 4, endBeat: 8},
    ];
    const calibrations = [
      {
        rowIndex: 0,
        totalBeats: 16,
        pairs: [
          {beat: 0, x: 100},
          {beat: 8, x: 300},
          {beat: 16, x: 500},
        ],
      },
    ];
    const staffRows = [{rowIndex: 0, top: 733, bottom: 712, left: 14, right: 580}];
    const ranges = buildAnchorMeasureRanges({measures, calibrations, staffRows, pageSize: {width: 595.22, height: 842}});
    expect(ranges).toHaveLength(2);
    expect(ranges[0].measureIndex).toBe(1);
    expect(ranges[0].leftPercent).toBeCloseTo((100 / 595.22) * 100, 1);
    expect(ranges[1].leftPercent).toBeCloseTo((200 / 595.22) * 100, 1);
  });

  it("tokenizeContent font adlarini tek token olarak ayirir", () => {
    const tokens = tokenizeContent("/F3 1 Tf\n(x)Tj");
    expect(tokens).toContain("/F3");
    expect(tokens).toContain("(x)");
  });

  it("calibrateRowsSequential imza gliflerini dusurup satir bazli kalibrasyon kurar", () => {
    const anchors = [];
    const events = [];
    // satir 0: 3 imza glifi (x 44-99) + 4 nota (x 130-550)
    const sigXs = [44.34, 52.02, 66.72];
    const noteXs = [130, 250, 380, 520];
    for (const x of [...sigXs, ...noteXs]) anchors.push({rowIndex: 0, x, xPercent: x / 5.9522});
    for (let beat = 0; beat < 7; beat += 1) events.push({beat});
    const staffRows = [{rowIndex: 0, top: 733, bottom: 712, left: 14, right: 580}];

    const {results} = calibrateRowsSequential({anchors, writtenEvents: events, staffRows});
    expect(results).toHaveLength(1);
    expect(results[0].reason).toBe("calibrated");
    // imza glifleri elenmis olmali: kalan pair'ler nota x'lerinde
    expect(results[0].pairs.every((pair) => pair.x >= 130)).toBe(true);
  });
});

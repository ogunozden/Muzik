import {describe, expect, it} from "vitest";
import {
  buildAnchorMeasureRanges,
  calibrateRowsSequential,
  countSymbTrEvents,
  expandWrittenMeasures,
  expandWrittenMeasuresGuided,
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

  it("expandWrittenMeasures basit tekrari acar", () => {
    const xml = [
      "<score-partwise>",
      "<part id=\"P1\">",
      "<measure number=\"1\"><note><pitch><step>C</step></pitch><duration>1</duration></note></measure>",
      "<measure number=\"2\"><note><pitch><step>D</step></pitch><duration>1</duration></note></measure>",
      "<measure number=\"3\"><note><pitch><step>E</step></pitch><duration>1</duration></note></measure>",
      "<measure number=\"4\"><note><pitch><step>F</step></pitch><duration>1</duration></note></measure>",
      "<measure number=\"5\"><note><pitch><step>G</step></pitch><duration>1</duration></note></measure>",
      "</part>",
      "</score-partwise>",
    ].join("");
    // 2. olcude fwd, 4. olcude bwd (A |:B C:| D)
    const xmlWithRepeats = xml
      .replace(
        "<measure number=\"2\">",
        "<measure number=\"2\"><barline location=\"right\"><repeat direction=\"forward\"/></barline>",
      )
      .replace(
        "<measure number=\"4\">",
        "<measure number=\"4\"><barline location=\"right\"><repeat direction=\"backward\" times=\"2\"/></barline>",
      );
    const result = expandWrittenMeasures(xmlWithRepeats);
    // A |: B C :| D  ->  A B C B C D
    expect(result.expanded).toEqual([1, 2, 3, 4, 3, 4, 5]);
    expect(result.navigation).toBe("repeat");
    expect(result.firstExpandedIndexByWritten[3]).toBe(3);
  });

  it("expandWrittenMeasures volta (1. ve 2. son) gecislerini yonetir", () => {
    const xml = [
      "<score-partwise><part id=\"P1\">",
      "<measure number=\"1\"><barline location=\"right\"><repeat direction=\"forward\"/></barline><note><pitch><step>C</step></pitch><duration>1</duration></note></measure>",
      "<measure number=\"2\"><ending number=\"1\"/><barline location=\"right\"><repeat direction=\"backward\" times=\"2\"/></barline><note><pitch><step>D</step></pitch><duration>1</duration></note></measure>",
      "<measure number=\"3\"><ending number=\"2\"/><note><pitch><step>E</step></pitch><duration>1</duration></note></measure>",
      "<measure number=\"4\"><note><pitch><step>F</step></pitch><duration>1</duration></note></measure>",
      "</part></score-partwise>",
    ].join("");
    const result = expandWrittenMeasures(xml);
    // A |: 1. B :| 2. C | D  ->  A B C D (B 1. son, C 2. son)
    expect(result.expanded).toEqual([1, 2, 3, 4]);
  });

  it("expandWrittenMeasures segno + D.S. navigasyonunu acar", () => {
    const measures = [1, 2, 3, 4, 5, 6, 7].map((number) =>
      `<measure number="${number}"><note><pitch><step>C</step></pitch><duration>1</duration></note></measure>`,
    );
    // olcu 4'te segno, olcu 6'da dalsegno (sound attribute)
    measures[3] = measures[3].replace("<measure number=\"4\">", "<measure number=\"4\"><direction><direction-type><segno/></direction-type><sound segno=\"segno\"/></direction>");
    measures[5] = measures[5].replace("<measure number=\"6\">", "<measure number=\"6\"><direction><direction-type><words>D.S.</words></direction-type><sound dalsegno=\"segno\"/></direction>");
    const xml = `<score-partwise><part id="P1">${measures.join("")}</part></score-partwise>`;
    const result = expandWrittenMeasures(xml);
    // 1-6 calinir, sonra segno (4) den sona: 4 5 6 7
    expect(result.expanded).toEqual([1, 2, 3, 4, 5, 6, 4, 5, 6, 7]);
    expect(result.navigation).toBe("ds");
    expect(result.segnoMeasure).toBe(4);
    expect(result.dalsegnoMeasure).toBe(6);
  });

  it("expandWrittenMeasures targetLength ile D.S. bolumunun bitisini walk'a gore cozer", () => {
    const measures = [1, 2, 3, 4, 5, 6, 7, 8].map((number) =>
      `<measure number="${number}"><note><pitch><step>C</step></pitch><duration>1</duration></note></measure>`,
    );
    measures[2] = measures[2].replace("<measure number=\"3\">", "<measure number=\"3\"><direction><direction-type><segno/></direction-type><sound segno=\"segno\"/></direction>");
    measures[7] = measures[7].replace("<measure number=\"8\">", "<measure number=\"8\"><direction><direction-type><words>D.S.</words></direction-type><sound dalsegno=\"segno\"/></direction>");
    const xml = `<score-partwise><part id="P1">${measures.join("")}</part></score-partwise>`;
    // Plain: 1-8 + 3-8 = 14. Walk 11 ise: DS bolumu 3..5 (3 olcu) -> 1-8 + 3-5 = 11
    const plain = expandWrittenMeasures(xml);
    expect(plain.expanded).toHaveLength(14);
    const guided = expandWrittenMeasures(xml, {targetLength: 11});
    expect(guided.expanded).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 3, 4, 5]);
    expect(guided.dsEndGuided).toBe(true);
  });

  it("expandWrittenMeasuresGuided DS bolumunu ic tekrarsiz (after-raw) cozer", () => {
    const measures = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) =>
      `<measure number="${number}"><note><pitch><step>C</step></pitch><duration>1</duration></note></measure>`,
    );
    // 3. olcude segno + fwd; 4. olcude bwd (ic tekrar 3..4); 9. olcude dalsegno
    measures[2] = measures[2].replace("<measure number=\"3\">", "<measure number=\"3\"><barline location=\"right\"><repeat direction=\"forward\"/></barline><direction><direction-type><segno/></direction-type><sound segno=\"segno\"/></direction>");
    measures[3] = measures[3].replace("<measure number=\"4\">", "<measure number=\"4\"><barline location=\"right\"><repeat direction=\"backward\" times=\"2\"/></barline>");
    measures[8] = measures[8].replace("<measure number=\"9\">", "<measure number=\"9\"><direction><direction-type><words>D.S.</words></direction-type><sound dalsegno=\"segno\"/></direction>");
    const xml = `<score-partwise><part id="P1">${measures.join("")}</part></score-partwise>`;
    // Plain: 1-9 (fwd 3..4 ikinci kez) + DS 3-9 = 10 + 7 = 17.
    // Walk 12 ise: DS bolumu 3..5 (3 olcu), ic tekrarsiz -> 1..4,3,4,5..9 + 3,4,5 = 14? Degil; hedefe gore cozum:
    // once = 1..9 ile 3..4 tekrari = 10; DS sonu = 3 + (12-10) - 1 = 4 -> 3..4 raw = 2 -> 12 ✓
    const result = expandWrittenMeasuresGuided(xml, {targetLength: 12});
    expect(result.expanded.length).toBe(12);
    expect(result.guidedMode).toContain("ds-guided");
  });
});

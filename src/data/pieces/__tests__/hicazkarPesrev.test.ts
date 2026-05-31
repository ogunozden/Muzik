import {describe, expect, it} from "vitest";
import {
  DEVRI_KEBIR_DARB_PATTERN,
  HICAZKAR_REFERENCE_SOURCES,
  HICAZKAR_VISUAL_MAP,
  KIZ_NEYI_FOUR_VOICE_A_AHENK,
  createDefaultVisualMap,
  createVisualMeasureSegments,
  getActiveVisualMeasureSegment,
  getSymbtrMeasureRanges,
  getVisualBeatPosition,
  koma53ToFrequency,
  parseSymbtrScore,
} from "../hicazkarPesrev";

const FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset",
  "1\t51\t\t\t0\t0\t28\t4\t0\t60\t0\tDevr-i Kebîr\t0.0",
  "2\t9\tFa5#4\tF5#4\t344\t344\t1\t4\t833\t95\t96\t1. HANE\t0.0357142857143",
  "3\t9\tLa5\tA5\t358\t358\t1\t4\t833\t95\t96\t\t0.0714285714286",
  "4\t9\tEs\tEs\t0\t0\t1\t8\t417\t95\t96\t\t0.0892857142857",
].join("\n");

const MEASURE_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset",
  "1\t9\tDo5\tC5\t318\t318\t1\t4\t833\t95\t96\t1. HANE\t0.25",
  "2\t9\tRe5\tD5\t327\t327\t1\t4\t833\t95\t96\t\t0.5",
  "3\t9\tMi5\tE5\t340\t340\t1\t4\t833\t95\t96\t\t0.75",
  "4\t9\tFa5\tF5\t344\t344\t1\t4\t833\t95\t96\t\t1",
  "5\t9\tSol5\tG5\t349\t349\t1\t4\t833\t95\t96\t\t1.25",
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

  it("reads SymbTr offset values as measure boundary metadata", () => {
    const events = parseSymbtrScore(MEASURE_FIXTURE, 72);

    expect(events[0]).toMatchObject({
      offsetUnits: 0.25,
      measureIndex: 1,
      isMeasureEnd: false,
    });
    expect(events[3]).toMatchObject({
      offsetUnits: 1,
      measureIndex: 1,
      isMeasureEnd: true,
    });
    expect(events[4]).toMatchObject({
      offsetUnits: 1.25,
      measureIndex: 2,
      isMeasureEnd: false,
    });
  });

  it("can transpose playback frequencies to the Kız Neyi four-voice A ahenk", () => {
    const events = parseSymbtrScore(FIXTURE, 72, KIZ_NEYI_FOUR_VOICE_A_AHENK.koma53Offset);

    expect(events[0].targetFrequency).toBeCloseTo(koma53ToFrequency(353), 5);
    expect(events[0].midiNumber).toBe(80);
    expect(events[1].targetFrequency).toBeCloseTo(koma53ToFrequency(367), 5);
  });

  it("keeps the Devr-i Kebir darb starts on the documented 28/4 cycle", () => {
    expect(DEVRI_KEBIR_DARB_PATTERN.map((hit) => hit.beat)).toEqual([
      1,
      3,
      5,
      7,
      8,
      9,
      9.5,
      10,
      11,
      13,
      15,
      17,
      19,
      21,
      23,
      25,
      26,
      27,
      28,
    ]);
    expect(DEVRI_KEBIR_DARB_PATTERN.reduce((total, hit) => total + hit.timeValue, 0)).toBe(28);
  });

  it("keeps reference recording metadata as verified external source data", () => {
    const youtubeReference = HICAZKAR_REFERENCE_SOURCES.find((source) => source.provider === "youtube");

    expect(youtubeReference).toEqual(
      expect.objectContaining({
        id: "youtube-nwbnzn75br8",
        label: "Referans kayıt",
        access: "external-link",
        verification: "oembed",
      }),
    );
    expect(youtubeReference?.title).toContain("Hicazkâr Peşrev");
    expect(youtubeReference?.author).toBe("Bekir GÜLSÜN");
  });

  it("maps visual score pages to ordered staff bands in musical time", () => {
    expect(HICAZKAR_VISUAL_MAP.method).toBe("manual-percent");
    expect(new Set(HICAZKAR_VISUAL_MAP.staffBands.map((band) => band.pageIndex))).toEqual(new Set([0, 1, 2]));

    for (let index = 1; index < HICAZKAR_VISUAL_MAP.staffBands.length; index += 1) {
      expect(HICAZKAR_VISUAL_MAP.staffBands[index].startBeat).toBeGreaterThanOrEqual(
        HICAZKAR_VISUAL_MAP.staffBands[index - 1].endBeat,
      );
    }

    expect(HICAZKAR_VISUAL_MAP.staffBands[0]).toMatchObject({
      id: "p1-r1",
      startBeat: 0,
      endBeat: 28,
    });
  });

  it("creates default visual maps for uploaded notation images", () => {
    const visualMap = createDefaultVisualMap(2, {beatsPerStaff: 16});

    expect(visualMap.staffBands).toHaveLength(6);
    expect(visualMap.staffBands[0]).toMatchObject({
      id: "p1-r1",
      label: "1. sayfa üst satır",
      startBeat: 0,
      endBeat: 16,
      leftPercent: 6,
      widthPercent: 88,
    });
    expect(visualMap.staffBands[3]).toMatchObject({
      id: "p2-r1",
      pageIndex: 1,
      startBeat: 48,
      endBeat: 64,
    });
  });

  it("projects a current beat to a visual score coordinate inside the active staff", () => {
    const visualMap = createDefaultVisualMap(1);
    const position = getVisualBeatPosition(visualMap.staffBands[0], 14);

    expect(position).toMatchObject({
      pageIndex: 0,
      bandId: "p1-r1",
      label: "1. sayfa üst satır",
      progressPercent: 50,
      xPercent: 50,
      yPercent: 22,
    });
  });

  it("binds SymbTr measure ranges to visual staff coordinates", () => {
    const events = parseSymbtrScore(MEASURE_FIXTURE, 72);
    const visualMap = createDefaultVisualMap(1);
    const ranges = getSymbtrMeasureRanges(events);
    const segments = createVisualMeasureSegments(events, visualMap.staffBands);
    const activeSegment = getActiveVisualMeasureSegment(segments, 3.5);

    expect(ranges[0]).toMatchObject({
      measureIndex: 1,
      startBeat: 0,
      endBeat: 4,
      source: "symbtr-offset",
    });
    expect(segments[0]).toMatchObject({
      id: "m1-p1-r1",
      measureIndex: 1,
      leftPercent: 6,
      topPercent: 15,
      heightPercent: 14,
    });
    expect(segments[0].widthPercent).toBeCloseTo(88 * (4 / 28), 5);
    expect(activeSegment?.measureIndex).toBe(1);
  });
});

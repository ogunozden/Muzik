import {describe, expect, it} from "vitest";
import {
  getTupletContext,
  getTupletNotatedBeats,
  mapDurationBeatsToVex,
  mapEventDurationToVex,
  splitDurationIntoTiedParts,
} from "../notation";
import type {CanonicalScoreEvent} from "../canonical-score";

/**
 * Sure merdiveni (D5).
 *
 * Eski merdivenin TABANI 16'likti ve her esik "asagi yuvarla" mantigindaydi:
 * 32'lik ve daha kisa HER nota 16'lik cizilyor, 5/8 (2,5 vurus) ikilik,
 * 5/4 (5 vurus) birlik oluyordu. Olcum (SymbTr-3.0, 401 dosya / 146.477 event):
 * 5.678 event (%3,88) yanlis sureyle ciziliyordu — en sik: 1/32 (2.099x),
 * triole 1/12+1/24+1/48 (2.255x), 3/32 (708x), 5/8 (289x).
 *
 * Artik 32'lik/64'luk ve noktali varyantlari da var; TEMSIL EDILEMEYEN sureler
 * (triole, >4 vurus, 5/8...) `approximated` ile ISARETLENIR — sessizce yanlis
 * cizilmez, dispatch tablosu bunu raporlar.
 */
describe("mapDurationBeatsToVex — sure merdiveni (D5)", () => {
  const exact: Array<[number, string, boolean]> = [
    [4, "w", false],
    [3, "h", true],
    [2, "h", false],
    [1.5, "q", true],
    [1, "q", false],
    [0.75, "8", true],
    [0.5, "8", false],
    [0.375, "16", true],
    [0.25, "16", false],
    [0.1875, "32", true],
    [0.125, "32", false],
    [0.0625, "64", false],
  ];

  it.each(exact)("%s vurus -> %s (noktali: %s), yaklasik DEGIL", (beats, duration, dotted) => {
    const mapped = mapDurationBeatsToVex(beats, false);

    expect(mapped.duration).toBe(duration);
    expect(mapped.dotted).toBe(dotted);
    expect(mapped.approximated ?? false).toBe(false);
  });

  it("32'lik artik 16'lik olarak cizilmiyor (en sik eski hata: 2.099 event)", () => {
    expect(mapDurationBeatsToVex(0.125, false)).toMatchObject({duration: "32", dotted: false});
  });

  it("noktali 32'lik (3/32) artik tam temsil ediliyor (708 event)", () => {
    expect(mapDurationBeatsToVex(0.375, false)).toMatchObject({duration: "16", dotted: true});
  });

  it("es'lerde de ayni merdiven, 'r' ekiyle", () => {
    expect(mapDurationBeatsToVex(0.125, true)).toMatchObject({duration: "32r", dotted: false});
    expect(mapDurationBeatsToVex(3, true)).toMatchObject({duration: "hr", dotted: true});
  });

  describe("temsil edilemeyen sureler ISARETLENIR", () => {
    const approximated: Array<[string, number]> = [
      ["triole sekizlik (1/12)", 1 / 3],
      ["triole onaltilik (1/24)", 1 / 6],
      ["5/8 (2,5 vurus)", 2.5],
      ["7/8 (3,5 vurus)", 3.5],
      ["5/4 (5 vurus)", 5],
      ["3/2 (6 vurus)", 6],
      ["9/8 (4,5 vurus)", 4.5],
      ["5/16 (1,25 vurus)", 1.25],
    ];

    it.each(approximated)("%s yaklasik isaretlenir", (_label, beats) => {
      expect(mapDurationBeatsToVex(beats, false).approximated).toBe(true);
    });

    it("yaklasik deger kaynagi ASMAZ (olcu tasmasi olmaz)", () => {
      const VEX_BEATS: Record<string, number> = {w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25, "32": 0.125, "64": 0.0625};
      for (const [, beats] of approximated) {
        const mapped = mapDurationBeatsToVex(beats, false);
        const drawn = VEX_BEATS[mapped.duration] * (mapped.dotted ? 1.5 : 1);
        expect(drawn, `${beats} vurus -> ${mapped.duration}`).toBeLessThanOrEqual(beats + 1e-9);
      }
    });
  });
});
/**
 * Triole (K2). SymbTr `pay/payda` TAM NOTAYA goredir; payda 3'un kati ve
 * payda/3 ikinin kuvvetiyse uclu bolunmedir. Olcum: 2.173 event, 83 eser —
 * yaklasik cizilenlerin %79'u. Eskiden en yakin dyadic degere yuvarlanip
 * BRACKET'SIZ ciziliyorlardi.
 */
describe("tuplet tespiti ve yazili sure (K2)", () => {
  it.each([
    [12, true],
    [24, true],
    [48, true],
    [6, true],
    [8, false],
    [16, false],
    [32, false],
    [5, false],
    [0, false],
  ])("payda %s -> tuplet mi: %s", (denominator, expected) => {
    expect(Boolean(getTupletContext({numerator: 1, denominator}))).toBe(expected);
  });

  /**
   * Kesir once SADELESTIRILMELI. Ham paydaya bakmak yanlis siniflandiriyordu:
   * 3/12 aslinda 1/4 (duz ceyreklik), 9/24 = 3/8 (noktali ceyreklik),
   * 3/48 = 1/16 — hicbiri uclu bolunme degil. Korpusta 5 event boyle yanlis
   * triole isaretlenmisti (2178 -> 2173).
   */
  it.each([
    ["3/12 = 1/4 (duz ceyreklik)", 3, 12],
    ["9/24 = 3/8 (noktali ceyreklik)", 9, 24],
    ["3/48 = 1/16", 3, 48],
    ["6/12 = 1/2", 6, 12],
  ])("%s triole DEGILDIR", (_label, numerator, denominator) => {
    expect(getTupletContext({numerator, denominator})).toBeNull();
  });

  it("sadelesmeyen gercek trioleler tuplet KALIR", () => {
    expect(getTupletContext({numerator: 1, denominator: 12})).not.toBeNull();
    expect(getTupletContext({numerator: 5, denominator: 12})).not.toBeNull();
    expect(getTupletContext({numerator: 1, denominator: 24})).not.toBeNull();
  });

  it("triole 3:2 oranindadir", () => {
    expect(getTupletContext({numerator: 1, denominator: 12})).toMatchObject({
      numNotes: 3,
      notesOccupied: 2,
      sourceDenominator: 12,
    });
  });

  it("yazili sure paydayi 3/2 oraninda kucultur", () => {
    expect(getTupletNotatedBeats({numerator: 1, denominator: 12})).toBeCloseTo(0.5, 9); // sekizlik
    expect(getTupletNotatedBeats({numerator: 1, denominator: 24})).toBeCloseTo(0.25, 9); // onaltilik
    expect(getTupletNotatedBeats({numerator: 1, denominator: 48})).toBeCloseTo(0.125, 9); // otuzikilik
  });

  it("tuplet event'i YAZILI degerle eslenir ve approximated TASIMAZ", () => {
    const event = {
      durationBeats: 1 / 3,
      durationFraction: {numerator: 1, denominator: 12},
      isRest: false,
    } as CanonicalScoreEvent;

    const mapped = mapEventDurationToVex(event);

    expect(mapped).toMatchObject({duration: "8", dotted: false});
    expect(mapped.approximated ?? false).toBe(false);
    expect(mapped.tuplet).toMatchObject({numNotes: 3, notesOccupied: 2});
  });

  it("dyadic event tuplet baglami TASIMAZ", () => {
    const event = {
      durationBeats: 0.5,
      durationFraction: {numerator: 1, denominator: 8},
      isRest: false,
    } as CanonicalScoreEvent;

    expect(mapEventDurationToVex(event).tuplet).toBeUndefined();
  });
});
/**
 * Bag ile bolme (K3). Tuplet destegi sonrasi geriye 583 event kaliyordu:
 * 5/8 (289), 7/8 (80), 5/4 (76), 3/2 (62), 5/16 (38), 9/8 (33). Bunlar
 * eskiden SESSIZCE asagi yuvarlaniyordu (5 vurusluk nota birlik cizilip
 * 1 vurus kayboluyordu). Artik standart degerlere bolunup bagla baglaniyor.
 */
describe("bag ile bolme (K3)", () => {
  const VEX_BEATS: Record<string, number> = {w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25, "32": 0.125, "64": 0.0625};
  const sum = (parts: Array<{beats: number}>) => parts.reduce((total, part) => total + part.beats, 0);

  it.each([
    ["5/8 (2,5 vuruş)", 2.5, ["h", "8"]],
    ["7/8 (3,5 vuruş)", 3.5, ["h", "8"]], // noktalı ikilik + sekizlik
    ["5/4 (5 vuruş)", 5, ["w", "q"]],
    ["3/2 (6 vuruş)", 6, ["w", "h"]],
    ["5/16 (1,25 vuruş)", 1.25, ["q", "16"]],
    ["9/8 (4,5 vuruş)", 4.5, ["w", "8"]],
    ["2/1 (8 vuruş)", 8, ["w", "w"]],
  ])("%s parcalara bolunur", (_label, beats, expectedDurations) => {
    const parts = splitDurationIntoTiedParts(beats, false);

    expect(parts.map((part) => part.duration)).toEqual(expectedDurations);
    expect(sum(parts)).toBeCloseTo(beats, 9);
  });

  it("bolunmus event artik YAKLASIK degil", () => {
    const event = {
      durationBeats: 2.5,
      durationFraction: {numerator: 5, denominator: 8},
      isRest: false,
    } as CanonicalScoreEvent;

    const mapped = mapEventDurationToVex(event);

    expect(mapped.approximated ?? false).toBe(false);
    expect(mapped.tiedParts).toHaveLength(2);
    expect(mapped.duration).toBe("h"); // ilk parca
  });

  it("cizilen parcalarin toplami kaynagi TAM verir (kayip yok)", () => {
    for (const beats of [2.5, 3.5, 5, 6, 1.25, 4.5, 8]) {
      const parts = splitDurationIntoTiedParts(beats, false);
      const drawn = parts.reduce(
        (total, part) => total + VEX_BEATS[part.duration.replace("r", "")] * (part.dotted ? 1.5 : 1),
        0,
      );
      expect(drawn, `${beats} vuruş`).toBeCloseTo(beats, 9);
    }
  });

  it("es'lerde de bolme calisir", () => {
    expect(splitDurationIntoTiedParts(2.5, true).map((part) => part.duration)).toEqual(["hr", "8r"]);
  });

  it("tam temsil edilebilen sure BOLUNMEZ", () => {
    const event = {
      durationBeats: 2,
      durationFraction: {numerator: 1, denominator: 2},
      isRest: false,
    } as CanonicalScoreEvent;

    expect(mapEventDurationToVex(event).tiedParts).toBeUndefined();
  });
});

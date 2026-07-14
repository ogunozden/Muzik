import {describe, expect, it} from "vitest";
import {HICAZKAR_PESREV} from "@/data/pieces/hicazkarPesrev";
import {SCORE_ENGINE_CALIBRATION_PIECES} from "../calibration";
import {inferMeterFromSymbtrEvents, parseSymbtrToCanonical} from "../importer";
import {parseSymbtrScore} from "@/data/symbtr/parser";
import {validateCanonicalScore} from "../validator";

const SYMBTR_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tLNS\tPay\tPayda\tMs\tLNS2\tBas\tSoz1\tOffset\tSoz2",
  "1\t51\t\t\t\t\t0\t0\t0\t\t\t\t0\t",
  "2\t9\t\tF5#4\t341\t\t1\t4\t0\t\t\t1. hane\t0.25\t",
  "3\t9\t\tA5\t358\t\t1\t4\t0\t\t\t1. hane\t0.5\t",
  "4\t9\t\tEs\t0\t\t1\t4\t0\t\t\t1. hane\t0.75\t",
  "5\t9\t\tG5\t349\t\t1\t4\t0\t\t\t1. hane\t1\t",
].join("\n");

const DEVRI_KEBIR_MEASURE_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tLNS\tPay\tPayda\tMs\tLNS2\tBas\tSoz1\tOffset\tSoz2",
  "1\t51\t\t\t\t\t0\t0\t0\t\t\t\t0\t",
  "2\t9\t\tF5#4\t341\t\t28\t4\t0\t\t\t1. hane\t0.5\t",
  "3\t9\t\tA5\t358\t\t1\t4\t0\t\t\t1. hane\t1.0357142857143\t",
].join("\n");

const AKSAK_METER_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tLNS\tPay\tPayda\tMs\tLNS2\tBas\tSoz1\tOffset\tSoz2",
  "1\t51\t\t\t\t\t0\t0\t0\t\t\t\t0\t",
  "2\t9\t\tF5#4\t341\t\t1\t4\t0\t\t\t1. hane\t0.2\t",
  "3\t9\t\tA5\t358\t\t1\t4\t0\t\t\t1. hane\t0.4\t",
  "4\t9\t\tG5\t349\t\t5\t8\t0\t\t\t1. hane\t0.9\t",
].join("\n");

describe("ScoreEngine SymbTr importer and validator", () => {
  it("imports raw SymbTr into a fingerprinted canonical v2 document", () => {
    const result = parseSymbtrToCanonical({
      raw: SYMBTR_FIXTURE,
      piece: HICAZKAR_PESREV,
      scoreId: "score:test-fixture",
      sourceReference: "fixture",
    });

    expect(result.summary.ok).toBe(true);
    expect(result.document).toMatchObject({
      schemaVersion: "score-engine-v2",
      id: "score:test-fixture",
      sourceKind: "symbtr",
      sourceFingerprint: expect.stringMatching(/^fnv1a:/),
    });
    expect(result.document.events[0]).toMatchObject({
      eventId: "score:test-fixture:m1:n2",
      durationFraction: {numerator: 1, denominator: 4},
      pitch: {
        source: "F5#4",
        vexKey: "f#/5",
        komaAccidental: "#4",
      },
    });
    expect(result.document.usulCycle.length).toBeGreaterThan(0);
    expect(result.document.sourceAnchors.length).toBeGreaterThan(0);
    expect(result.document.notationPolicy.keySignature).toMatchObject({
      source: "musicxml",
      status: "source-proven",
    });
    expect(result.document.notationPolicy.keySignature.accidentals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({accidental: "sharp", step: "F"}),
        expect.objectContaining({accidental: "slash-flat", step: "A"}),
        expect.objectContaining({accidental: "slash-flat", step: "E"}),
        expect.objectContaining({accidental: "quarter-flat", step: "B"}),
      ]),
    );
  });

  it("keeps measureBeat relative to the real SymbTr measure start, not a 4/4 fallback", () => {
    const result = parseSymbtrToCanonical({
      raw: DEVRI_KEBIR_MEASURE_FIXTURE,
      piece: HICAZKAR_PESREV,
      scoreId: "score:devri-kebir-fixture",
      sourceReference: "fixture",
    });

    expect(result.document.events[1]).toMatchObject({
      measureId: "score:devri-kebir-fixture:m2",
      measureBeat: 0,
      startBeat: 28,
    });
  });

  it("registers five reachable calibration catalog pieces without making up scores", () => {
    expect(SCORE_ENGINE_CALIBRATION_PIECES).toHaveLength(5);
    expect(SCORE_ENGINE_CALIBRATION_PIECES.every((piece) => piece.symbtrRawUrl.endsWith(`${piece.symbtrCatalogId}.txt`))).toBe(
      true,
    );
    expect(SCORE_ENGINE_CALIBRATION_PIECES.every((piece) => piece.meter === "auto")).toBe(true);
  });

  it("infers a renderable meter from SymbTr measure spans for auto-meter catalog imports", () => {
    const events = parseSymbtrScore(AKSAK_METER_FIXTURE, 72);

    expect(inferMeterFromSymbtrEvents(events)).toBe("9/8");
  });

  it("reports deterministic validation issues instead of accepting malformed events", () => {
    const result = parseSymbtrToCanonical({
      raw: SYMBTR_FIXTURE,
      piece: HICAZKAR_PESREV,
      scoreId: "score:test-fixture",
    });
    result.document.events[0].pitch.source = "BAD";

    const issues = validateCanonicalScore(result.document);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "pitch-unparseable",
          severity: "error",
          eventId: "score:test-fixture:m1:n2",
        }),
      ]),
    );
  });
});

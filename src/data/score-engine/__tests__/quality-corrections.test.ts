import {describe, expect, it} from "vitest";
import {HICAZKAR_PESREV} from "@/data/pieces/hicazkarPesrev";
import {applyScoreCorrectionEvents, createScoreCorrectionEvent} from "../corrections";
import {parseSymbtrToCanonical} from "../importer";
import {evaluateCanonicalScoreQuality} from "../quality";

const SYMBTR_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tLNS\tPay\tPayda\tMs\tLNS2\tBas\tSoz1\tOffset\tSoz2",
  "1\t51\t\t\t\t\t0\t0\t0\t\t\t\t0\t",
  "2\t9\t\tF5#4\t341\t\t1\t4\t0\t\t\t1. hane\t0.25\t",
  "3\t9\t\tA5\t358\t\t1\t4\t0\t\t\t1. hane\t0.5\t",
].join("\n");

function createCanonicalFixture() {
  return parseSymbtrToCanonical({
    raw: SYMBTR_FIXTURE,
    piece: HICAZKAR_PESREV,
    scoreId: "score:correction-fixture",
    sourceReference: "fixture",
  }).document;
}

describe("ScoreEngine quality evaluator and correction reducer", () => {
  it("reports duration, pitch, anchor, usul, fingerprint and playback metrics", () => {
    const document = createCanonicalFixture();
    const report = evaluateCanonicalScoreQuality(document);

    expect(report.documentId).toBe(document.id);
    expect(report.metrics.map((metric) => metric.id)).toEqual([
      "source-fingerprint",
      "measure-duration-usul",
      "pitch-vex-mapping",
      "source-anchors",
      "usul-cycle",
      "playback-sync",
    ]);
    expect(report.metrics.find((metric) => metric.id === "pitch-vex-mapping")).toMatchObject({status: "pass"});
  });

  it("applies correction events to a derived document and revalidates it", () => {
    const document = createCanonicalFixture();
    const targetEventId = document.events[0].id;
    const targetMeasureId = document.measures[0].id;

    const pitchChanged = createScoreCorrectionEvent({
      documentId: document.id,
      type: "pitch_changed",
      targetId: targetEventId,
      payload: {sourcePitch: "G5"},
      authorId: "test-user",
    });
    const durationChanged = createScoreCorrectionEvent({
      documentId: document.id,
      type: "duration_changed",
      targetId: targetEventId,
      payload: {durationBeats: 2},
      authorId: "test-user",
    });
    const anchorAdded = createScoreCorrectionEvent({
      documentId: document.id,
      type: "source_anchor_added",
      targetId: targetMeasureId,
      payload: {
        bboxPercent: {x: 10, y: 20, width: 30, height: 12},
        confidence: 0.7,
        measureId: targetMeasureId,
        sourceId: document.sources[0].id,
      },
      authorId: "test-user",
    });
    const verified = createScoreCorrectionEvent({
      documentId: document.id,
      type: "verified",
      targetId: targetEventId,
      payload: {},
      authorId: "test-user",
    });
    const rollback = createScoreCorrectionEvent({
      documentId: document.id,
      type: "rollback",
      targetId: targetEventId,
      payload: {targetCorrectionId: pitchChanged.id},
      authorId: "test-user",
    });

    const result = applyScoreCorrectionEvents(document, [pitchChanged, durationChanged, anchorAdded, verified, rollback]);

    expect(result.rejectedEventIds).toEqual([]);
    expect(result.appliedEventIds).toHaveLength(5);
    expect(result.document.events[0]).toMatchObject({
      durationBeats: 2,
      pitch: {source: "G5", vexKey: "g/5"},
      verificationState: "verified",
    });
    expect(result.document.sourceAnchors.some((anchor) => anchor.id.startsWith("correction-anchor:"))).toBe(true);
    expect(result.document.validationIssues.some((issue) => issue.severity === "error")).toBe(false);
  });
});

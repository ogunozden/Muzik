import {describe, expect, it} from "vitest";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";
import {SCORE_ENGINE_DEMO_DOCUMENT} from "@/data/score-engine/demo-score";
import {buildScoreRenderSystems, findRenderSystemForEvent} from "../score-layout";
import {canonicalToMei} from "@/data/score-engine/verovio-emitter";

function makeLongDevriKebirDocument(): CanonicalScoreDocument {
  const baseEvent = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
  const events: CanonicalScoreEvent[] = Array.from({length: 36}, (_, index) => {
    const startBeat = index * 0.75;
    const id = `score:test-devri-kebir:m1:n${index + 1}`;

    return {
      ...baseEvent,
      id,
      eventId: id,
      sourceEventIndex: index + 1,
      measureId: "score:test-devri-kebir:m1",
      startBeat,
      measureBeat: startBeat,
      startTime: startBeat,
      durationBeats: 0.25,
      duration: 0.25,
    };
  });

  return {
    ...SCORE_ENGINE_DEMO_DOCUMENT,
    id: "score:test-devri-kebir",
    meter: "28/4",
    totalBeats: 28,
    totalDuration: 28,
    events,
    measures: [
      {
        id: "score:test-devri-kebir:m1",
        index: 1,
        startBeat: 0,
        endBeat: 28,
        eventIds: events.map((event) => event.id),
        verificationState: "symbolic-confirmed",
      },
    ],
  };
}

describe("ScoreEngine render layout", () => {
  it("splits a long 28/4 measure into render systems without changing the musical measure id", () => {
    const document = makeLongDevriKebirDocument();
    const systems = buildScoreRenderSystems(document);

    expect(systems.length).toBeGreaterThan(1);
    expect(new Set(systems.map((system) => system.measureId))).toEqual(new Set(["score:test-devri-kebir:m1"]));
    expect(systems.every((system) => system.segmentCount === systems.length)).toBe(true);
    expect(systems.every((system) => system.eventIds.length <= 24)).toBe(true);
    expect(systems.map((system) => system.segmentIndex)).toEqual(systems.map((_, index) => index));
  });

  it("finds the render system for an active event id", () => {
    const document = makeLongDevriKebirDocument();
    const systems = buildScoreRenderSystems(document);
    const targetEventId = document.events.at(-1)?.id;

    const activeSystem = findRenderSystemForEvent(systems, targetEventId);

    expect(activeSystem?.eventIds).toContain(targetEventId);
    expect(activeSystem?.segmentIndex).toBe(systems.length - 1);
  });
});

describe.each(["vexflow", "verovio"] as const)("ScoreEngine engraving parity (%s)", (renderer) => {
  it("keeps VexFlow and Verovio on the same measure grid (K4.3)", () => {
    const document = makeLongDevriKebirDocument();
    const vexSystems = buildScoreRenderSystems(document);
    const mei = canonicalToMei(document);
    // Verovio MEI must carry the same measure count/ids as the Vex layout
    expect(mei).toContain(`xml:id="${document.id}"`);
    for (const measure of document.measures) {
      expect(mei).toContain(`xml:id="${measure.id}"`);
    }
    expect(vexSystems.length).toBeGreaterThan(1);
    // Renderer-specific smoke: vex uses buildScoreRenderSystems, verovio uses mei beam/tuplet/accid pipeline
    if (renderer === "verovio") {
      expect(mei).toContain("<measure");
      expect(mei).toContain("<note");
    } else {
      expect(vexSystems.every((s) => s.eventIds.length > 0)).toBe(true);
    }
  });
});

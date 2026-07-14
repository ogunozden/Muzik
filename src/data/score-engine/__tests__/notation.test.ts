import {describe, expect, it} from "vitest";
import {
  computePolicyDerivedNaturals,
  mapCanonicalEventToVex,
  mapCanonicalPitchToVex,
  mapDurationBeatsToVex,
} from "../notation";
import {SCORE_ENGINE_DEMO_DOCUMENT} from "../demo-score";
import type {CanonicalScoreEvent} from "../canonical-score";

function getDemoEvent(sourceEventIndex: number) {
  const event = SCORE_ENGINE_DEMO_DOCUMENT.events.find((item) => item.sourceEventIndex === sourceEventIndex);
  if (!event) throw new Error(`Missing demo event ${sourceEventIndex}`);
  return event;
}

describe("canonical score notation mapping", () => {
  it("maps SymbTr source pitches to VexFlow stave keys without visual coordinates", () => {
    expect(mapCanonicalPitchToVex(getDemoEvent(2))).toMatchObject({
      accidental: "#",
      key: "f#/5",
      komaAccidental: "#4",
    });

    expect(mapCanonicalPitchToVex(getDemoEvent(5))).toMatchObject({
      accidental: "b",
      key: "bb/5",
      komaAccidental: "b5",
    });
  });

  it("maps rests and dotted durations into VexFlow durations", () => {
    expect(mapCanonicalEventToVex(getDemoEvent(16))).toMatchObject({
      duration: {dotted: false, duration: "qr"},
      pitch: {key: "b/4"},
    });

    expect(mapDurationBeatsToVex(getDemoEvent(4).durationBeats, false)).toEqual({
      dotted: true,
      duration: "8",
    });
  });
});

function makePolicyEvent(overrides: {
  id: string;
  measureId: string;
  sourcePitch: string;
  isRest?: boolean;
}): CanonicalScoreEvent {
  const base = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
  return {
    ...base,
    id: overrides.id,
    eventId: overrides.id,
    measureId: overrides.measureId,
    isRest: overrides.isRest ?? false,
    pitch: {...base.pitch, source: overrides.sourcePitch},
  };
}

describe("computePolicyDerivedNaturals (ENGRAVING_POLICY bolum 3)", () => {
  it("marks a same-step plain note after an accidental in the same measure", () => {
    const events = [
      makePolicyEvent({id: "e1", measureId: "m1", sourcePitch: "F5#4"}),
      makePolicyEvent({id: "e2", measureId: "m1", sourcePitch: "F5"}),
    ];

    expect(computePolicyDerivedNaturals(events)).toEqual(new Set(["e2"]));
  });

  it("does not carry cancellation across measures", () => {
    const events = [
      makePolicyEvent({id: "e1", measureId: "m1", sourcePitch: "F5#4"}),
      makePolicyEvent({id: "e2", measureId: "m2", sourcePitch: "F5"}),
    ];

    expect(computePolicyDerivedNaturals(events).size).toBe(0);
  });

  it("does not mark different steps or already-accidental notes", () => {
    const events = [
      makePolicyEvent({id: "e1", measureId: "m1", sourcePitch: "F5#4"}),
      makePolicyEvent({id: "e2", measureId: "m1", sourcePitch: "G5"}),
      makePolicyEvent({id: "e3", measureId: "m1", sourcePitch: "F5#4"}),
    ];

    expect(computePolicyDerivedNaturals(events).size).toBe(0);
  });

  it("marks only the first plain note; state resets after the natural", () => {
    const events = [
      makePolicyEvent({id: "e1", measureId: "m1", sourcePitch: "B5b5"}),
      makePolicyEvent({id: "e2", measureId: "m1", sourcePitch: "B5"}),
      makePolicyEvent({id: "e3", measureId: "m1", sourcePitch: "B5"}),
    ];

    expect(computePolicyDerivedNaturals(events)).toEqual(new Set(["e2"]));
  });

  it("ignores rests", () => {
    const events = [
      makePolicyEvent({id: "e1", measureId: "m1", sourcePitch: "F5#4"}),
      makePolicyEvent({id: "rest", measureId: "m1", sourcePitch: "Es", isRest: true}),
      makePolicyEvent({id: "e2", measureId: "m1", sourcePitch: "F5"}),
    ];

    expect(computePolicyDerivedNaturals(events)).toEqual(new Set(["e2"]));
  });
});

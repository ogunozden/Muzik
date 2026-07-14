import {describe, expect, it} from "vitest";
import {
  getActiveCanonicalEvent,
  getCanonicalMeasure,
  getCanonicalScheduledNotes,
} from "../canonical-score";
import {SCORE_ENGINE_DEMO_DOCUMENT} from "../demo-score";

describe("canonical score engine demo", () => {
  it("builds stable note and measure ids from symbolic events", () => {
    const document = SCORE_ENGINE_DEMO_DOCUMENT;

    expect(document.id).toBe("score-engine-demo:hicazkar-pesrev");
    expect(document.events.length).toBeGreaterThan(10);
    expect(document.measures[0]).toMatchObject({
      id: "score-engine-demo:hicazkar-pesrev:m1",
      verificationState: "symbolic-confirmed",
    });
    expect(document.events[0]).toMatchObject({
      id: "score-engine-demo:hicazkar-pesrev:m1:n2",
      measureId: "score-engine-demo:hicazkar-pesrev:m1",
      verificationState: "symbolic-confirmed",
    });
  });

  it("finds active events by canonical time instead of visual x/y", () => {
    const document = SCORE_ENGINE_DEMO_DOCUMENT;
    const secondEvent = document.events[1];
    const active = getActiveCanonicalEvent(document, secondEvent.startTime + 0.01);

    expect(active?.id).toBe(secondEvent.id);
    expect(getCanonicalMeasure(document, active?.measureId)?.index).toBe(1);
  });

  it("keeps noteId lineage on scheduled playback notes", () => {
    const scheduledNotes = getCanonicalScheduledNotes(SCORE_ENGINE_DEMO_DOCUMENT, "ud");

    expect(scheduledNotes[0]).toMatchObject({
      noteId: "score-engine-demo:hicazkar-pesrev:m1:n2",
      measureId: "score-engine-demo:hicazkar-pesrev:m1",
      instrument: "ud",
    });
    expect(scheduledNotes.every((note) => typeof note.targetFrequency === "number")).toBe(true);
  });
});

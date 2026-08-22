import {describe, expect, it} from "vitest";
import {SCORE_ENGINE_DEMO_DOCUMENT} from "../demo-score";
import {canonicalToMei, durationToMeiAttrs, komaAccidentalToGes, pitchToMeiAttrs} from "../verovio-emitter";

describe("verovio-emitter", () => {
  it("converts koma accidental to ges", () => {
    expect(komaAccidentalToGes(null)).toBeNull();
    expect(komaAccidentalToGes("#")).toBe("s");
    expect(komaAccidentalToGes("b")).toBe("f");
    expect(komaAccidentalToGes("#4")).toContain("s4c:");
    expect(komaAccidentalToGes("b5")).toContain("f5c:");
    expect(komaAccidentalToGes("invalid")).toBe("invalid");
  });

  it("maps pitch to MEI attrs with fallback", () => {
    const event = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
    const attrs = pitchToMeiAttrs(event);
    expect(attrs.pname).toMatch(/^[a-g]$/);
    expect(attrs.oct).toMatch(/^\d$/);
    // fallback for missing source
    const fake = {...event, pitch: {...event.pitch, source: "invalid", playback: "C4"}} as typeof event;
    const fallback = pitchToMeiAttrs(fake);
    expect(fallback.pname).toBe("c");
  });

  it("maps duration to MEI", () => {
    const event = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
    const dur = durationToMeiAttrs(event);
    expect(dur.dur).toMatch(/^[124816]|32|64$/);
    expect(typeof dur.dots).toBe("number");
    expect(typeof dur.tiedParts).toBe("number");
  });

  it("emits valid MEI for demo document", () => {
    const mei = canonicalToMei(SCORE_ENGINE_DEMO_DOCUMENT);
    expect(mei).toContain('<?xml version="1.0"');
    expect(mei).toContain("<mei");
    expect(mei).toContain(SCORE_ENGINE_DEMO_DOCUMENT.title);
    expect(mei).toContain("<measure");
    expect(mei).toContain("<note");
    expect(mei).toContain('meter.count');
  });

  it("handles rest and tied parts", () => {
    const doc = SCORE_ENGINE_DEMO_DOCUMENT;
    const restEvent = doc.events.find((e) => e.isRest);
    if (restEvent) {
      const mei = canonicalToMei({...doc, events: [restEvent], measures: [{...doc.measures[0], eventIds: [restEvent.id]}]});
      expect(mei).toContain("<rest");
    }
  });

  it("escapes xml chars", () => {
    const doc = {...SCORE_ENGINE_DEMO_DOCUMENT, title: 'A & B <C> "D" \'E\''};
    const mei = canonicalToMei(doc);
    expect(mei).toContain("&amp;");
    expect(mei).toContain("&lt;");
  });
});

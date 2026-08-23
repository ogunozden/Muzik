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

  it("emits <beam> for consecutive eighths and <accid> with ges for koma 53-EDO", () => {
    const base = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
    const e1: typeof base = {
      ...base,
      id: "beam-e1",
      eventId: "beam-e1",
      measureId: SCORE_ENGINE_DEMO_DOCUMENT.measures[0].id,
      durationBeats: 0.5,
      durationFraction: {numerator: 1, denominator: 8},
      pitch: {...base.pitch, source: "A5", koma53: null, komaAccidental: null},
      isRest: false,
    };
    const e2: typeof base = {
      ...base,
      id: "beam-e2",
      eventId: "beam-e2",
      measureId: SCORE_ENGINE_DEMO_DOCUMENT.measures[0].id,
      durationBeats: 0.5,
      durationFraction: {numerator: 1, denominator: 8},
      pitch: {...base.pitch, source: "B5", koma53: null, komaAccidental: null},
      isRest: false,
    };
    const komaEvent: typeof base = {
      ...base,
      id: "koma-e",
      eventId: "koma-e",
      measureId: SCORE_ENGINE_DEMO_DOCUMENT.measures[0].id,
      durationBeats: 1,
      durationFraction: {numerator: 1, denominator: 4},
      pitch: {
        ...base.pitch,
        source: "F5#4",
        koma53: 344,
        komaAccidental: "#4",
        solfege: "Fa#4",
      },
      isRest: false,
    };
    const doc = {
      ...SCORE_ENGINE_DEMO_DOCUMENT,
      events: [e1, e2, komaEvent],
      measures: [
        {
          ...SCORE_ENGINE_DEMO_DOCUMENT.measures[0],
          eventIds: [e1.id, e2.id, komaEvent.id],
        },
      ],
    };
    const mei = canonicalToMei(doc);
    expect(mei).toContain("<beam>");
    expect(mei).toContain("</beam>");
    // koma 4 => accid + accid.ges with cents (4*1200/53≈90.6)
    expect(mei).toContain("<accid");
    expect(mei).toContain("accid.ges");
    const cents = (4 * 1200) / 53;
    expect(mei).toContain(cents.toFixed(1));
  });

  it("emits <tuplet> for triole (1/12) and splits tied durations", () => {
    const base = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
    const makeTri = (id: string, pitch: string): typeof base => ({
      ...base,
      id,
      eventId: id,
      measureId: SCORE_ENGINE_DEMO_DOCUMENT.measures[0].id,
      durationBeats: 1 / 3,
      durationFraction: {numerator: 1, denominator: 12},
      pitch: {...base.pitch, source: pitch, koma53: null, komaAccidental: null},
      isRest: false,
    });
    const t1 = makeTri("tup-e1", "C5");
    const t2 = makeTri("tup-e2", "D5");
    const t3 = makeTri("tup-e3", "E5");
    const tiedEvent: typeof base = {
      ...base,
      id: "tied-e",
      eventId: "tied-e",
      measureId: SCORE_ENGINE_DEMO_DOCUMENT.measures[0].id,
      durationBeats: 2.5,
      durationFraction: {numerator: 5, denominator: 8},
      pitch: {...base.pitch, source: "G5", koma53: null, komaAccidental: null},
      isRest: false,
    };
    const doc = {
      ...SCORE_ENGINE_DEMO_DOCUMENT,
      events: [t1, t2, t3, tiedEvent],
      measures: [{...SCORE_ENGINE_DEMO_DOCUMENT.measures[0], eventIds: [t1.id, t2.id, t3.id, tiedEvent.id]}],
    };
    const mei = canonicalToMei(doc);
    expect(mei).toContain("<tuplet");
    expect(mei).toContain('num="3"');
    expect(mei).toContain('numbase="2"');
    // tied 5/8 -> h+8 with internal tie attributes
    expect(mei).toContain('tie="i"');
    expect(mei).toContain('tie="t"');
    // dotted handling not needed here but ensure still valid
    expect(mei).toContain('dur="2"');
    expect(mei).toContain('dur="8"');
  });

  it("groups only consecutive beamable notes into a single <beam>", () => {
    const base = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
    const makeEighth = (id: string, source: string): typeof base => ({
      ...base,
      id,
      eventId: id,
      measureId: SCORE_ENGINE_DEMO_DOCUMENT.measures[0].id,
      durationBeats: 0.5,
      durationFraction: {numerator: 1, denominator: 8},
      pitch: {...base.pitch, source, koma53: null, komaAccidental: null},
      isRest: false,
    });
    const makeQuarter = (id: string, source: string): typeof base => ({
      ...makeEighth(id, source),
      durationBeats: 1,
      durationFraction: {numerator: 1, denominator: 4},
    });

    const a1 = makeEighth("grp-a1", "C5");
    const a2 = makeEighth("grp-a2", "D5");
    const a3 = makeEighth("grp-a3", "E5");
    const a4 = makeEighth("grp-a4", "F5");
    const runDoc = {
      ...SCORE_ENGINE_DEMO_DOCUMENT,
      events: [a1, a2, a3, a4],
      measures: [{...SCORE_ENGINE_DEMO_DOCUMENT.measures[0], eventIds: [a1.id, a2.id, a3.id, a4.id]}],
    };
    const runMei = canonicalToMei(runDoc);
    const beamOpenCount = runMei.split("<beam>").length - 1;
    expect(beamOpenCount).toBe(1);
    const beamInner = runMei.slice(runMei.indexOf("<beam>") + "<beam>".length, runMei.indexOf("</beam>"));
    expect(beamInner).toContain('xml:id="grp-a1"');
    expect(beamInner).toContain('xml:id="grp-a2"');
    expect(beamInner).toContain('xml:id="grp-a3"');
    expect(beamInner).toContain('xml:id="grp-a4"');

    // A non-beamable quarter breaks the run into two separate beams.
    const q = makeQuarter("grp-q", "G5");
    const b1 = makeEighth("grp-b1", "A5");
    const b2 = makeEighth("grp-b2", "B5");
    const breakDoc = {
      ...SCORE_ENGINE_DEMO_DOCUMENT,
      events: [b1, b2, q, a3, a4],
      measures: [{...SCORE_ENGINE_DEMO_DOCUMENT.measures[0], eventIds: [b1.id, b2.id, q.id, a3.id, a4.id]}],
    };
    const breakMei = canonicalToMei(breakDoc);
    const brokenBeamCount = breakMei.split("<beam>").length - 1;
    expect(brokenBeamCount).toBe(2);
    const firstBeam = breakMei.slice(breakMei.indexOf("<beam>") + "<beam>".length, breakMei.indexOf("</beam>"));
    expect(firstBeam).toContain('xml:id="grp-b1"');
    expect(firstBeam).toContain('xml:id="grp-b2"');
    expect(firstBeam).not.toContain('xml:id="grp-a3"');
  });

  it("emits <barLine> at end of each measure with form=regular/end", () => {
    const base = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
    const makeNote = (id: string, measureId: string): typeof base => ({
      ...base,
      id,
      eventId: id,
      measureId,
      durationBeats: 1,
      durationFraction: {numerator: 1, denominator: 4},
      pitch: {...base.pitch, source: "C5", koma53: null, komaAccidental: null},
      isRest: false,
    });
    const n1 = makeNote("bl-e1", "score:test-bl:m1");
    const n2 = makeNote("bl-e2", "score:test-bl:m2");
    const m1 = {...SCORE_ENGINE_DEMO_DOCUMENT.measures[0], id: "score:test-bl:m1", index: 1, eventIds: [n1.id]};
    const m2 = {...SCORE_ENGINE_DEMO_DOCUMENT.measures[0], id: "score:test-bl:m2", index: 2, eventIds: [n2.id]};
    const doc = {
      ...SCORE_ENGINE_DEMO_DOCUMENT,
      events: [n1, n2],
      measures: [m1, m2],
    };
    const mei = canonicalToMei(doc);
    // Every measure carries a barline
    const barLineCount = mei.split("<barLine").length - 1;
    expect(barLineCount).toBe(2);
    // Non-final measures use regular single bars
    expect(mei).toContain('<barLine xml:id="score:test-bl:m1-barline" form="regular" />');
    // Final measure uses end barline (light-heavy)
    expect(mei).toContain('<barLine xml:id="score:test-bl:m2-barline" form="end" />');
    // Barlines sit inside their measure element
    const m1Block = mei.slice(mei.indexOf('<measure xml:id="score:test-bl:m1"'), mei.indexOf('<measure xml:id="score:test-bl:m2"'));
    expect(m1Block).toContain("<barLine");
  });
});

import {describe, expect, it} from "vitest";
import {dispatchGlyphClasses, buildGlyphClassMapText} from "../workbench/score-format";
import {SCORE_ENGINE_DEMO_DOCUMENT} from "@/data/score-engine/demo-score";

/**
 * E3/F8.3 glyph dispatch sozlesmesi: hicbir sinif siniflandirilmadan render
 * edilemez; `rendered` yalniz source-proven/policy-derived durumlarinda true.
 */
describe("dispatchGlyphClasses", () => {
  const dispatch = dispatchGlyphClasses(SCORE_ENGINE_DEMO_DOCUMENT);

  it("never renders a class that is not source-proven or policy-derived", () => {
    for (const entry of dispatch) {
      if (entry.rendered) {
        expect(["source-proven", "policy-derived"]).toContain(entry.status);
      }
    }
  });

  it("keeps zero-source classes as visual-evidence-only and not rendered", () => {
    const repeat = dispatch.find((entry) => entry.id === "repeat-volta-endings");
    const slur = dispatch.find((entry) => entry.id === "slur-tie");

    expect(repeat).toMatchObject({status: "visual-evidence-only", rendered: false});
    expect(slur).toMatchObject({status: "visual-evidence-only", rendered: false});
  });

  it("covers every class exactly once with a stable id set", () => {
    const ids = dispatch.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "staff-clef-meter",
        "note-heads-durations",
        "inline-koma-accidentals",
        "key-signature",
        "section-usul-labels",
        "natural-accidental",
        "tuplet-time-modification",
        "repeat-volta-endings",
        "slur-tie",
      ]),
    );
  });

  it("reports the dispatch table inside the glyph-class manifest", () => {
    const manifest = buildGlyphClassMapText(SCORE_ENGINE_DEMO_DOCUMENT);
    expect(manifest).toContain("dispatch:staff-clef-meter:source-proven:rendered");
    expect(manifest).toContain("dispatch:repeat-volta-endings:visual-evidence-only:not-rendered");
  });
});

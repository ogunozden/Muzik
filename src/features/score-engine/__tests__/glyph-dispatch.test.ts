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

    expect(repeat).toMatchObject({status: "source-proven", rendered: true});
    expect(slur).toMatchObject({status: "visual-evidence-only", rendered: false});
  });

  it("renders slur-tie as source-proven when a validated tie feature exists (F8.7 / SymbTr v3)", () => {
    // Demo dokumanin 2. ve 5. event'i ayni perdedir (A5) — dogrulama gecer.
    const withTie = {
      ...SCORE_ENGINE_DEMO_DOCUMENT,
      sourceFeatures: [
        {
          id: "musicxml-tie:1-4",
          kind: "tie" as const,
          status: "source-proven" as const,
          source: "symbtr-musicxml" as const,
          label: "tie A5",
          value: "1:4:A5",
          evidence: "test",
        },
      ],
    };

    const tieDispatch = dispatchGlyphClasses(withTie);
    const slur = tieDispatch.find((entry) => entry.id === "slur-tie");

    expect(slur).toMatchObject({status: "source-proven", rendered: true});
    expect(slur?.evidence).toContain("source-proven tie");
    expect(buildGlyphClassMapText(withTie)).toContain("tie-token:source-proven:");
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
    expect(manifest).toContain("dispatch:repeat-volta-endings:source-proven:rendered");
  });
});

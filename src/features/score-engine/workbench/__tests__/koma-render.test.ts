import {describe, expect, it} from "vitest";
import {komaAccidentalGlyphName} from "../score-format";

/**
 * F13.3 uctan uca render sozlesmesi: koma arizasi glyph'i (setText ile kesin
 * SMuFL codepoint) VexFlow StaveNote'a eklenip SVG'ye cizilir. Bu test gercek
 * VexFlow SVG backend'ini (jsdom) surer; render hatasi/hang regresyonunu tutar.
 */
describe("koma arizasi VexFlow render (F13.3)", () => {
  it("Hicazkar arizalarini (#4, b5, b1) hatasiz cizer ve SVG uretir", async () => {
    const vexflow = await import("vexflow");
    const {Accidental, Formatter, Renderer, Stave, StaveNote} = vexflow;
    const GLYPHS = (vexflow as unknown as {Glyphs: Record<string, string>}).Glyphs;

    const div = document.createElement("div");
    document.body.appendChild(div);

    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(400, 200);
    const context = renderer.getContext();

    const stave = new Stave(10, 40, 360);
    stave.addClef("treble").setContext(context).draw();

    // Hicazkar'in gercek koma arizalari + hangi perde-adimina bindikleri.
    const cases: Array<{key: string; koma: string}> = [
      {key: "c/5", koma: "#4"}, // bakiye diyez
      {key: "e/5", koma: "b5"}, // kucuk mucenneb bemol
      {key: "a/4", koma: "b1"}, // koma bemol
    ];

    const notes = cases.map(({key, koma}) => {
      const note = new StaveNote({clef: "treble", keys: [key], duration: "q"});
      const glyphName = komaAccidentalGlyphName(koma)!;
      const acc = new Accidental(koma.startsWith("b") ? "b" : "#");
      acc.setText(GLYPHS[glyphName]);
      note.addModifier(acc, 0);
      return note;
    });

    expect(() => Formatter.FormatAndDraw(context, stave, notes)).not.toThrow();

    const svg = div.querySelector("svg");
    expect(svg, "SVG uretildi").not.toBeNull();
    expect(svg!.querySelectorAll("*").length, "SVG bos degil").toBeGreaterThan(5);

    document.body.removeChild(div);
  });

  it("her koma glyph adi VexFlow Glyphs enum'unda gercek bir codepoint (PUA)", async () => {
    const vexflow = await import("vexflow");
    const GLYPHS = (vexflow as unknown as {Glyphs: Record<string, string>}).Glyphs;
    for (const acc of ["#1", "b1", "#4", "b4", "#5", "b5", "#8", "b8"]) {
      const name = komaAccidentalGlyphName(acc)!;
      const glyph = GLYPHS[name];
      expect(glyph, `${acc} -> ${name} codepoint`).toBeTruthy();
      const cp = glyph.codePointAt(0)!;
      expect(cp, `${name} SMuFL PUA`).toBeGreaterThanOrEqual(0xe000);
      expect(cp).toBeLessThanOrEqual(0xf8ff);
    }
  });
});

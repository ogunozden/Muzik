import {describe, expect, it} from "vitest";
import {komaAccidentalGlyphName, formatKomaAccidental} from "../score-format";

/**
 * Koma arizasi -> otantik AEU glyph adi eslemesi (F13.3). VexFlow Glyphs
 * enum'undaki SMuFL adlarina eslenir; kod-alias'i olmayanlar bile setText ile
 * cizilir. Standart-disi koma metin annotation'a duser.
 */
describe("komaAccidentalGlyphName (AEU glyph eslemesi)", () => {
  it("standart 4 AEU koma arizasini dogru glyph'e esler (koma/bakiye/kucuk/buyuk mucenneb)", () => {
    expect(komaAccidentalGlyphName("#1")).toBe("accidentalKomaSharp");
    expect(komaAccidentalGlyphName("b1")).toBe("accidentalKomaFlat");
    expect(komaAccidentalGlyphName("#4")).toBe("accidentalBakiyeSharp");
    expect(komaAccidentalGlyphName("b4")).toBe("accidentalBakiyeFlat");
    expect(komaAccidentalGlyphName("#5")).toBe("accidentalKucukMucennebSharp");
    expect(komaAccidentalGlyphName("b5")).toBe("accidentalKucukMucennebFlat");
    expect(komaAccidentalGlyphName("#8")).toBe("accidentalBuyukMucennebSharp");
    expect(komaAccidentalGlyphName("b8")).toBe("accidentalBuyukMucennebFlat");
  });

  it("Hicazkar eserinin gercek arizalari (#4, b5, b1) glyph'e eslenir", () => {
    for (const acc of ["#4", "b5", "b1"]) {
      expect(komaAccidentalGlyphName(acc), `${acc} glyph`).not.toBeNull();
    }
  });

  it("null/standart-disi koma icin null doner (metin annotation'a duser)", () => {
    expect(komaAccidentalGlyphName(null)).toBeNull();
    expect(komaAccidentalGlyphName("#3")).toBeNull(); // standart AEU arizasi degil
    expect(komaAccidentalGlyphName("#9")).toBeNull(); // tanini ~ tam ses
    // fallback yolu hala calisir
    expect(formatKomaAccidental("#9")).toBe("♯9");
  });
});

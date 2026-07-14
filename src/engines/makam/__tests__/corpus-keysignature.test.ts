import {describe, expect, it} from "vitest";
import {MAKAM_DATA, getMakamById} from "../data";

/**
 * OTONOM MAKAM ARIZASI ("full otonom"): makamin koma arizasi elle yazilmaz;
 * SymbTr korpusundan turetilen `makam-corpus.json`den makam adiyla baglanir.
 * Bu test kapsamin saglikli oldugunu ve otantik arizalarin dogru baglandigini
 * dogrular; boylece hem elle-hata riski biter hem de veri gercek notasyona
 * dayanir.
 */
describe("makam ariza korpustan otonom baglanir", () => {
  it("attaches corpus-derived key signatures to most curated makams", () => {
    const withSignature = MAKAM_DATA.filter((makam) => makam.keySignature && makam.keySignature.length > 0);
    // Curated makamlarin cogu korpusta var; yazim varyantlari (Nihavend/Nihavent,
    // Bayati/Beyati) tek-harf fallback ile eslenir. Kalan azinlik korpusta <3
    // eserli/nadir makamlardir (ariza baglanmaz, undefined kalir).
    expect(withSignature.length).toBeGreaterThanOrEqual(25);
  });

  it("every attached signature is well-formed and high-consensus", () => {
    for (const makam of MAKAM_DATA) {
      if (!makam.keySignature) continue;
      expect(makam.keySignatureConsensus ?? 0).toBeGreaterThan(0.6);
      for (const accidental of makam.keySignature) {
        expect(accidental.step).toMatch(/^[A-G]$/);
        expect(accidental.accidental.length).toBeGreaterThan(0);
      }
    }
  });

  it("derives authentic key signatures for canonical makams (corpus)", () => {
    const sig = (id: string) =>
      (getMakamById(id)?.keySignature ?? []).map((a) => `${a.step}:${a.accidental}`).join(" ");

    expect(sig("rast")).toBe("B:quarter-flat F:sharp");
    expect(sig("ussak")).toBe("B:quarter-flat");
    expect(sig("hicaz")).toBe("B:slash-flat F:sharp C:sharp");
    expect(sig("segah")).toBe("B:quarter-flat E:quarter-flat F:sharp");
    // Nihavend korpusta "nihavent" yazilir — tek-harf fallback baglar.
    expect(sig("nihavend")).toBe("B:flat E:flat");
  });
});

import {describe, expect, it} from "vitest";
import {MAKAM_DATA, formatPerdeName, getMakamGuclu, getMakamKarar} from "../data";
import aeuReference from "../__generated__/aeu-reference.json";

/**
 * Karar (durak) ve guclu KAYNAKTAN gelir (D3/D4).
 *
 * Onceki surumde 48 makamin HEPSINDE `tonic: "C"` yaziliydi ve `MakamStepper`
 * bunu "Karar: C" diye ogrenciye basiyordu — Rast, Hicaz, Segah, Evic icin de.
 * `dominant` ise elle yazilmisti: 11/48 makamda makamin KENDI dizisinde bile
 * yoktu (ussak "E", huseyni "A", segah "D"...), ve tek testi kendi yorumunda
 * turetilemedigini itiraf ediyordu.
 *
 * Kaynak (ikisi de repoda, capraz-dogrulanmis — bkz. aeu-cross-validation):
 *  - `aeu-reference.json` makamTonicDominant: Murat Aydemir, Turkish Music
 *    Makam Guide (2010); perdeKoma: tomato (AEU perde -> 53-EDO koma).
 *  - `makam-corpus.json` komaScales: SymbTr korpusundan turetilmis
 *    kararPerde/gucluPerde.
 */

const perdeKoma = aeuReference.perdeKoma as Record<string, number>;

describe("makam karar/guclu kaynak baglama (D3/D4)", () => {
  it("kaynakli karar/guclu tasiyan makam sayisi korunur", () => {
    const withKarar = MAKAM_DATA.filter((makam) => getMakamKarar(makam));
    const withGuclu = MAKAM_DATA.filter((makam) => getMakamGuclu(makam));

    expect(withKarar.length).toBeGreaterThanOrEqual(35);
    expect(withGuclu.length).toBeGreaterThanOrEqual(35);
  });

  it("her kaynakli karar/guclu AEU perde tablosunda cozumlenebilir", () => {
    for (const makam of MAKAM_DATA) {
      const karar = getMakamKarar(makam);
      const guclu = getMakamGuclu(makam);
      if (karar) expect(perdeKoma[karar.perde], `${makam.id}: karar ${karar.perde}`).toBeDefined();
      if (guclu) expect(perdeKoma[guclu.perde], `${makam.id}: guclu ${guclu.perde}`).toBeDefined();
    }
  });

  it("bilinen makamlarin karar/guclusu nazariyatla uyusur", () => {
    const expected: Record<string, {karar: string; guclu: string}> = {
      rast: {karar: "rast", guclu: "neva"},
      ussak: {karar: "dugah", guclu: "neva"},
      huseyni: {karar: "dugah", guclu: "huseyni"},
      segah: {karar: "segah", guclu: "neva"},
      hicaz: {karar: "dugah", guclu: "neva"},
    };

    for (const [id, want] of Object.entries(expected)) {
      const makam = MAKAM_DATA.find((candidate) => candidate.id === id);
      expect(getMakamKarar(makam!)?.perde, `${id}: karar`).toBe(want.karar);
      expect(getMakamGuclu(makam!)?.perde, `${id}: guclu`).toBe(want.guclu);
    }
  });

  it("kaynagi olmayan makamda karar/guclu UYDURULMAZ (null doner)", () => {
    const unsourced = MAKAM_DATA.filter((makam) => !makam.komaScale?.kararPerde);

    expect(unsourced.length).toBeGreaterThan(0);
    for (const makam of unsourced) {
      expect(getMakamKarar(makam), `${makam.id}: karar kaynaksiz`).toBeNull();
    }
  });

  it("her kaynakli deger provenance tasir", () => {
    const rast = MAKAM_DATA.find((makam) => makam.id === "rast")!;

    expect(getMakamKarar(rast)).toMatchObject({perde: "rast", source: "corpus+aeu"});
    expect(getMakamGuclu(rast)).toMatchObject({perde: "neva", source: "corpus+aeu"});
  });

  it("perde adi Turkce ortografiyle gosterilir", () => {
    expect(formatPerdeName("dugah")).toBe("Dügâh");
    expect(formatPerdeName("neva")).toBe("Nevâ");
    expect(formatPerdeName("cargah")).toBe("Çârgâh");
    expect(formatPerdeName("huseyni")).toBe("Hüseyni");
    // Tabloda olmayan bir anahtar UYDURULMAZ; ham deger doner.
    expect(formatPerdeName("bilinmeyen")).toBe("bilinmeyen");
  });
});

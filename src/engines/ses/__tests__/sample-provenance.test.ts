import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {SAMPLE_SLOTS} from "../sample-library";
import {
  RECORDED_MELODIC_RANGES,
  describeExtrapolation,
  describeMelodicSampleUse,
} from "../sample-provenance";
import type {InstrumentType} from "../instruments";

/**
 * KAYIT DISI PERDE GERCEK KAYIT DIYE SUNULMASIN (PLAN.md §10/F2)
 *
 * Her melodik klasorde 36 kromatik yuva var, ama kaynak paketler bu araligin
 * tamamini kaydetmemis olabilir. Aralik disinda kalan yuva en yakin kayittan
 * GERILEREK uretilir; gerilme formantlari da kaydirdigi icin o ses, o
 * perdenin gercek tinisi DEGILDIR.
 *
 * Ney'de olculen kayit araligi **D3–C6**; 36 yuvadan yalniz C3 ve Cs3 disarida
 * kaliyor. (Onceki Freesound kaynaginda aralik B3–Fs5 idi ve 16 yuva
 * disaridaydi — kaynak degisince bu sayi 16'dan 2'ye dustu.)
 *
 * ── BU TEST NEYI SABITLEMIYOR ───────────────────────────────────────────
 * Enstrumanin ORGANOLOJIK ses sahasini iddia etmiyoruz — o musiki bilgisi
 * kaynak ister ve ADR 0001 uyarinca uydurulmaz. Sabitlenen sey OLCULEN
 * kaynak araligi. Kaynagi olculmemis enstruman icin cevap "bilinmiyor";
 * "sinirsiz" degil.
 */

const NEY: InstrumentType = "ney" as InstrumentType;

describe("Kayıt dışı perde bildirilmeli (F2)", () => {
  it("ney araligi olculen degerlerde", () => {
    const range = RECORDED_MELODIC_RANGES.ney;

    // D3 = 50, C6 = 84. Olcum: TURKISH-ARAB3.sf2, 22 uzlasan bolge.
    expect(range?.minMidi).toBe(50);
    expect(range?.maxMidi).toBe(84);
    expect(range?.evidence).toContain("TURKISH-ARAB3");
  });

  it("aralik icindeki perde kayit araliginda sayilir", () => {
    expect(describeMelodicSampleUse(NEY, 50).kind).toBe("recorded-span"); // D3, tam sinir
    expect(describeMelodicSampleUse(NEY, 69).kind).toBe("recorded-span"); // A4
    expect(describeMelodicSampleUse(NEY, 83).kind).toBe("recorded-span"); // B5, en tiz yuva
  });

  it("aralik disindaki perde mesafesiyle birlikte bildirilir", () => {
    const belowRange = describeMelodicSampleUse(NEY, 48); // C3
    expect(belowRange.kind).toBe("extrapolated");
    if (belowRange.kind === "extrapolated") expect(belowRange.semitonesBeyond).toBe(2);

    // Ust sinir 36 yuvanin disinda kaldigi icin (C6 = 84 > B5 = 83) artik
    // TIZ tarafta gerilmis yuva YOK. Kanit: kaynak yuva aralligini asiyor.
    expect(describeMelodicSampleUse(NEY, 84).kind).toBe("recorded-span");
    expect(describeMelodicSampleUse(NEY, 85).kind).toBe("extrapolated");
  });

  it("olculmemis enstruman icin cevap 'bilinmiyor' — 'sorun yok' DEGIL", () => {
    // En sinsi hata burada olurdu: olcmedigimiz enstrumani sessizce temiz
    // saymak. Bu testin varlik sebebi o.
    for (const instrument of ["ud", "kanun", "santur", "lavta"] as InstrumentType[]) {
      expect(describeMelodicSampleUse(instrument, 48).kind).toBe("unknown");
      expect(describeExtrapolation(instrument, 48)).toBeNull();
    }
  });

  it("ney yuvalarinin tam olarak kayit disi olanlari isaretli", () => {
    const neySlots = SAMPLE_SLOTS.filter(
      (slot) => slot.category === "melodic" && slot.instrumentId === "ney",
    );
    expect(neySlots).toHaveLength(36);

    const marked = neySlots
      .filter((slot) => slot.extrapolatedFrom)
      .map((slot) => slot.midiNumber as number)
      .sort((left, right) => left - right);

    // Yalniz C3 ve Cs3 (48–49). Onceki kaynakta 16 yuva gerilmisti.
    expect(marked).toEqual([48, 49]);
  });

  it("uyari yonu ve mesafeyi okunur bicimde soyluyor", () => {
    expect(describeExtrapolation(NEY, 48)).toContain("2 yarım ton");
    expect(describeExtrapolation(NEY, 48)).toContain("pes");
    expect(describeExtrapolation(NEY, 90)).toContain("tiz");
    expect(describeExtrapolation(NEY, 69)).toBeNull();
  });

  it("API ve /samples sayfasi bilgiyi disari veriyor", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "samples", "route.ts"), "utf8");
    expect(route.split("extrapolatedFrom").length - 1).toBeGreaterThanOrEqual(2);

    const samplesDir = path.join(process.cwd(), "src", "app", "samples");
    const allSamplesCode = fs
      .readdirSync(samplesDir, {recursive: true, withFileTypes: true} as never)
      .filter((e: never) => (e as {isFile: () => boolean}).isFile())
      .map((e: never) => {
        const entry = e as {parentPath: string; name: string};
        return fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8");
      })
      .join("\n");
    expect(allSamplesCode).toContain("slot.extrapolatedFrom");
    expect(allSamplesCode).toContain("Gerilmiş perde");
  });
});

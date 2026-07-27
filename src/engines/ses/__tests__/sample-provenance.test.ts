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
 * tamamini kaydetmemis. Ney'de olculen gercek kayit araligi B3–Fs5; alttaki
 * 11 ve ustteki 5 yuva en yakin kayittan GERILEREK uretiliyor. Gerilme
 * formantlari da kaydirdigi icin, gerilmis ses o perdenin gercek tinisi
 * degildir.
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

    // B3 = 59, Fs5 = 78. Olcum: Freesound 27726, 10 uzlasan kayit.
    expect(range?.minMidi).toBe(59);
    expect(range?.maxMidi).toBe(78);
    expect(range?.evidence).toContain("27726");
  });

  it("aralik icindeki perde kayit araliginda sayilir", () => {
    expect(describeMelodicSampleUse(NEY, 59).kind).toBe("recorded-span"); // B3, tam sinir
    expect(describeMelodicSampleUse(NEY, 69).kind).toBe("recorded-span"); // A4
    expect(describeMelodicSampleUse(NEY, 78).kind).toBe("recorded-span"); // Fs5, tam sinir
  });

  it("aralik disindaki perde mesafesiyle birlikte bildirilir", () => {
    const belowRange = describeMelodicSampleUse(NEY, 48); // C3
    expect(belowRange.kind).toBe("extrapolated");
    if (belowRange.kind === "extrapolated") expect(belowRange.semitonesBeyond).toBe(11);

    const aboveRange = describeMelodicSampleUse(NEY, 83); // B5
    expect(aboveRange.kind).toBe("extrapolated");
    if (aboveRange.kind === "extrapolated") expect(aboveRange.semitonesBeyond).toBe(5);
  });

  it("olculmemis enstruman icin cevap 'bilinmiyor' — 'sorun yok' DEGIL", () => {
    // En sinsi hata burada olurdu: olcmedigimiz enstrumani sessizce temiz
    // saymak. Bu testin varlik sebebi o.
    for (const instrument of ["ud", "kanun", "tanpura", "lavta"] as InstrumentType[]) {
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

    // C3..As3 (48–58) ve G5..B5 (79–83) — toplam 16 yuva.
    const expected = [...Array(11).keys()].map((i) => 48 + i).concat([79, 80, 81, 82, 83]);
    expect(marked).toEqual(expected);
  });

  it("uyari yonu ve mesafeyi okunur bicimde soyluyor", () => {
    expect(describeExtrapolation(NEY, 48)).toContain("11 yarım ton");
    expect(describeExtrapolation(NEY, 48)).toContain("pes");
    expect(describeExtrapolation(NEY, 83)).toContain("tiz");
    expect(describeExtrapolation(NEY, 69)).toBeNull();
  });

  it("API ve /samples sayfasi bilgiyi disari veriyor", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "samples", "route.ts"), "utf8");
    expect(route.split("extrapolatedFrom").length - 1).toBeGreaterThanOrEqual(2);

    const page = fs.readFileSync(path.join(process.cwd(), "src", "app", "samples", "page.tsx"), "utf8");
    expect(page).toContain("slot.extrapolatedFrom");
    expect(page).toContain("Gerilmiş perde");
  });
});

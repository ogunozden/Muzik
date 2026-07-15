import {describe, expect, it} from "vitest";
import accentProfile from "../__generated__/usul-accent-profile.json";

/**
 * Usul metrik-agirlik profili — SymbTr korpusundan (sure-agirlikli onset
 * yogunlugu) OTONOM turetilen TANILAYICI referans.
 *
 * ONEMLI: bu bir darp DOGRULAMA kapisi DEGIL. Korpus onset yogunlugu usulun
 * darp (DUM/tek) desenini guvenilir kodlamaz (compound usullerde duz, faz
 * belirsizligi). Usul strokes'un dogrulugu data.test'teki dosum-degismezleri +
 * kitap-aktarimiyla garanti; meter+tempo korpustan turetilir. Bu testler
 * yalniz profilin YAPISAL gecerliligini (dagilim) kilitler. Bkz. docs/adr/0003.
 */
type UsulProfile = {
  beats: number;
  unit: number;
  pieceCount: number;
  profile: number[];
  downbeatIsPeak: boolean;
};

const USULS = accentProfile.usuls as Record<string, UsulProfile>;

describe("usul metrik-agirlik profili (korpus-turevi tanilayici)", () => {
  it("her profil gecerli bir dagilim: uzunluk=beats, toplam ~100, negatif yok", () => {
    let checked = 0;
    for (const [id, entry] of Object.entries(USULS)) {
      expect(entry.profile, `${id}: profil uzunlugu = beats`).toHaveLength(entry.beats);
      const sum = entry.profile.reduce((a, b) => a + b, 0);
      expect(sum, `${id}: toplam ~100%`).toBeGreaterThan(99);
      expect(sum, `${id}: toplam ~100%`).toBeLessThan(101);
      for (const beat of entry.profile) expect(beat, `${id}: negatif olmayan`).toBeGreaterThanOrEqual(0);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it("her usul MIN_PIECES esiginin uzerinde eserden turetilir", () => {
    for (const [id, entry] of Object.entries(USULS)) {
      expect(entry.pieceCount, `${id}: eser sayisi`).toBeGreaterThanOrEqual(5);
    }
  });

  it("meter (beats/unit) profilde pozitif tam sayidir", () => {
    for (const [id, entry] of Object.entries(USULS)) {
      expect(Number.isInteger(entry.beats) && entry.beats > 0, `${id}: beats`).toBe(true);
      expect(Number.isInteger(entry.unit) && entry.unit > 0, `${id}: unit`).toBe(true);
    }
  });
});

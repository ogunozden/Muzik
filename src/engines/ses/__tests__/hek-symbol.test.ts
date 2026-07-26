import {describe, expect, it} from "vitest";
import {normalizePercussionSymbol} from "../engine";
import {isPercussionSymbol} from "../profiles";
import {PERCUSSION_SAMPLE_LIBRARY, PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT, SAMPLE_SLOTS} from "../sample-library";
import {USUL_DATA} from "@/engines/usul/data";

/**
 * `hek` kendi kanalidir (K4).
 *
 * Kaynak (Kudum kitabi s.14): dum/ta sag el kuvvetli, tek/te/ke/ka sol el
 * hafif, `hek` IKI ELIN BIRLIKTE vurusu. Motor `hek`i once `tek`e (en hafif
 * aile, gain 0.46), sonra `dum`a esliyordu; ikisi de yaklasimdi. Artik kendi
 * sample slotu var — dosyalar `dum + tek` toplamindan turetilir
 * (`scripts/derive-hek-samples.mjs`), yani kaynagin tanimi birebir gerceklenir.
 */
describe("hek darbi kendi kanalinda (K4)", () => {
  it("gecerli bir vurmali sembolu", () => {
    expect(isPercussionSymbol("hek")).toBe(true);
  });

  it("baska bir sembole ESLENMEZ", () => {
    expect(normalizePercussionSymbol("hek")).toBe("hek");
  });

  it("el ailesi eslemeleri korunur (te->tek, ka->ke, ta->dum)", () => {
    expect(normalizePercussionSymbol("te")).toBe("tek");
    expect(normalizePercussionSymbol("ka")).toBe("ke");
    expect(normalizePercussionSymbol("ta")).toBe("dum");
    expect(normalizePercussionSymbol("bilinmeyen")).toBe("");
  });

  it("her vurmali enstrumanda hek slotu var (vurgulu + vurgusuz)", () => {
    const instruments = Object.keys(PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT);

    expect(instruments.length).toBeGreaterThanOrEqual(9);
    for (const instrument of instruments) {
      const set = PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT[instrument].hek;
      expect(set.urls.length, `${instrument}: hek`).toBeGreaterThan(0);
      expect(set.accentUrls.length, `${instrument}: hek-accent`).toBeGreaterThan(0);
    }
    expect(PERCUSSION_SAMPLE_LIBRARY.hek.urls.length).toBeGreaterThan(0);
  });

  it("slot listesi hek dosyalarini tanir", () => {
    const hekSlots = SAMPLE_SLOTS.filter((slot) => slot.symbol === "hek");

    expect(hekSlots.length).toBe(18); // 9 enstruman × (vurgusuz + vurgulu)
    expect(hekSlots.every((slot) => slot.fileName.startsWith("hek"))).toBe(true);
  });

  it("korpusta hek darbi gercekten kullaniliyor", () => {
    const hekStrokes = USUL_DATA.flatMap((usul) => [...usul.symbols, ...(usul.velvele ?? [])]).filter(
      (symbol) => symbol.symbol === "hek",
    );

    expect(hekStrokes.length).toBeGreaterThanOrEqual(20);
    // Kaynak hek'i kuvvetli sayar -> hepsi vurgulu olmali (D7).
    expect(hekStrokes.every((symbol) => symbol.isAccent)).toBe(true);
  });
});

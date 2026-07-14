import {describe, expect, it} from "vitest";
import {getUsulById, getUsulBeatDuration, USUL_DATA} from "../data";

/**
 * Usul verisi sozlesme testleri (2026-07-14 kaynakli yeniden yazim).
 *
 * Desenler "Turk Musikisinde Usuller ve Kudum" kitabindaki ZAMAN VE
 * VURGULARI bolumlerinden aktarildi; buradaki degismezler aktarim
 * hatalarini (eksik/fazla darb, deger toplami, sira) yakalar.
 */
describe("usul/data", () => {
  describe("getUsulById", () => {
    it("returns the usul for a valid id", () => {
      const aksaksemai = getUsulById("aksaksemai");
      expect(aksaksemai).toBeDefined();
      expect(aksaksemai?.beats).toBe(10);
      expect(aksaksemai?.unit).toBe("8");
    });

    it("returns undefined for an unknown id", () => {
      expect(getUsulById("nonexistent")).toBeUndefined();
    });
  });

  describe("kaynakli desen degismezleri (kitap sozlesmesi)", () => {
    it("every usul's stroke timeValues sum exactly to its beat count", () => {
      for (const usul of USUL_DATA) {
        const total = usul.symbols.reduce((sum, symbol) => sum + symbol.timeValue, 0);
        expect(total, `${usul.id}: timeValue toplami`).toBe(usul.beats);
      }
    });

    it("strokes are strictly ordered and tile the cycle without gaps", () => {
      for (const usul of USUL_DATA) {
        let cursor = 1;
        for (const symbol of usul.symbols) {
          expect(symbol.beat, `${usul.id}: vurus ${symbol.beat} beklenen ${cursor}`).toBe(cursor);
          cursor += symbol.timeValue;
        }
        expect(cursor, `${usul.id}: dongu sonu`).toBe(usul.beats + 1);
      }
    });

    it("velvele patterns tile the cycle exactly like the main pattern", () => {
      const withVelvele = USUL_DATA.filter((usul) => usul.velvele?.length);
      expect(withVelvele.length).toBeGreaterThanOrEqual(17);
      for (const usul of withVelvele) {
        let cursor = 1;
        for (const symbol of usul.velvele!) {
          expect(symbol.beat, `${usul.id} velvele: vurus ${symbol.beat} beklenen ${cursor}`).toBe(cursor);
          cursor += symbol.timeValue;
        }
        expect(cursor, `${usul.id} velvele: dongu sonu`).toBe(usul.beats + 1);
      }
    });

    it("Aksak velvelesi is Düm TeKe Tek Kâ DüMe Düm Hek Tek (s.47)", () => {
      const velvele = getUsulById("aksak")?.velvele;
      expect(velvele?.map((s) => s.syllable ?? s.symbol)).toEqual([
        "dum", "te", "ke", "tek", "ka", "Dü", "Me", "dum", "hek", "tek",
      ]);
    });

    it("accents are exactly the right-hand strong strokes (dum/ta)", () => {
      for (const usul of USUL_DATA) {
        for (const symbol of usul.symbols) {
          expect(symbol.isAccent, `${usul.id}:${symbol.beat}`).toBe(
            symbol.symbol === "dum" || symbol.symbol === "ta",
          );
        }
        expect(usul.stressPattern).toHaveLength(usul.beats);
      }
    });
  });

  describe("kitaptan ornek desenler", () => {
    it("Sofyan is Düm(2) Te Ke — not a stroke on every beat (s.18)", () => {
      const sofyan = getUsulById("sofyan");
      expect(sofyan?.symbols.map((s) => [s.beat, s.symbol, s.timeValue])).toEqual([
        [1, "dum", 2],
        [3, "te", 1],
        [4, "ke", 1],
      ]);
    });

    it("Aksak is Düm(2) Te Ke Düm(2) Tek(2) Tek (s.47) and Çifte Sofyan shares it (s.46)", () => {
      const aksak = getUsulById("aksak");
      expect(aksak?.symbols.map((s) => s.symbol)).toEqual(["dum", "te", "ke", "dum", "tek", "tek"]);
      expect(getUsulById("ciftesofyan")?.symbols).toEqual(aksak?.symbols);
    });

    it("Curcuna is the 10/16 mertebe of Aksak Semai (s.66)", () => {
      const curcuna = getUsulById("curcuna");
      expect(curcuna?.unit).toBe("16");
      expect(curcuna?.symbols).toEqual(getUsulById("aksaksemai")?.symbols);
    });

    it("Düyek is Düm Tek(2) Tek Düm(2) Tek(2) at 8/8, with Ağırdüyek as its 8/4 mertebe (s.40)", () => {
      const duyek = getUsulById("duyek");
      expect(duyek?.unit).toBe("8");
      expect(duyek?.symbols.map((s) => [s.beat, s.symbol])).toEqual([
        [1, "dum"],
        [2, "tek"],
        [4, "tek"],
        [5, "dum"],
        [7, "tek"],
      ]);
      expect(getUsulById("agirduyek")?.unit).toBe("4");
      expect(getUsulById("agirduyek")?.symbols).toEqual(duyek?.symbols);
    });

    it("Devr-i Kebir carries the te-ke half beats and ta-hek pair (s.181)", () => {
      const devrikebir = getUsulById("devrikebir");
      expect(devrikebir?.beats).toBe(28);
      expect(
        devrikebir?.symbols.filter((s) => s.symbol === "te" || s.symbol === "ke").map((s) => s.beat),
      ).toEqual([9, 9.5]);
      expect(
        devrikebir?.symbols.filter((s) => s.symbol === "ta" || s.symbol === "hek").map((s) => s.beat),
      ).toEqual([21, 23]);
    });

    it("Darb-ı Türki is 18 beats, not 20 (s.131)", () => {
      expect(getUsulById("darbiturki")?.beats).toBe(18);
    });

    it("Zincir chains the five great usuls into 120 beats (s.234)", () => {
      const zincir = getUsulById("zincir");
      expect(zincir?.beats).toBe(120);
      // Halka baslari: Cifte Duyek(1) + Fahte(17) + Cember(37) +
      // Devr-i Kebir(61) + Berefsan(89) — hepsi dum ile acilir.
      for (const linkStart of [1, 17, 37, 61, 89]) {
        expect(
          zincir?.symbols.find((s) => s.beat === linkStart)?.symbol,
          `halka ${linkStart}`,
        ).toBe("dum");
      }
    });

    it("Darb-ı Fetih is fully patterned at 88 beats ending with the Nim Hafif tail (s.227-228)", () => {
      const darbifeth = getUsulById("darbifeth");
      expect(darbifeth?.beats).toBe(88);
      expect(darbifeth?.symbols.length).toBeGreaterThan(60);
      expect(darbifeth?.symbols.slice(-4).map((s) => [s.beat, s.symbol])).toEqual([
        [87, "te"],
        [87.5, "ke"],
        [88, "te"],
        [88.5, "ke"],
      ]);
    });
  });

  describe("getUsulBeatDuration", () => {
    it("scales beat duration by the mertebe unit", () => {
      expect(getUsulBeatDuration(getUsulById("yuruksemai")!, 120)).toBeCloseTo(0.25); // 6/8
      expect(getUsulBeatDuration(getUsulById("senginsemai")!, 120)).toBeCloseTo(0.5); // 6/4
      expect(getUsulBeatDuration(getUsulById("agirsemai")!, 120)).toBeCloseTo(1); // 6/2
      expect(getUsulBeatDuration(getUsulById("curcuna")!, 120)).toBeCloseTo(0.125); // 10/16
    });

    it("returns a positive duration for every usul", () => {
      for (const usul of USUL_DATA) {
        expect(getUsulBeatDuration(usul, 60)).toBeGreaterThan(0);
      }
    });
  });
});

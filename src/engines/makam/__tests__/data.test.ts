import { describe, it, expect } from "vitest";
import { getMakamById, getMakamScale, MAKAM_DATA } from "../data";

describe("makam/data", () => {
  describe("getMakamById", () => {
    it("should return makam for valid id", () => {
      const rast = getMakamById("rast");
      expect(rast).toBeDefined();
      expect(rast?.id).toBe("rast");
      expect(rast?.name).toBe("Rast");
      expect(rast?.tonic).toBe("C");
    });

    it("should return undefined for invalid id", () => {
      const result = getMakamById("nonexistent");
      expect(result).toBeUndefined();
    });

    it("returns corpus-derived intervals for huseyni (not hand-authored)", () => {
      // `intervals` artik SymbTr koma dizisinden OTONOM turetilir. Huseyni'nin
      // korpus-turevi 12-TET izdusumu, eski el-yazimi [2,2,1,2,1,2,2] yerine
      // makamin gercek notr/minor 3.'sunu yansitir.
      const huseyni = getMakamById("huseyni");
      expect(huseyni).toBeDefined();
      expect(huseyni?.intervals).toEqual([2, 1, 2, 2, 2, 1, 2]);
      expect(huseyni?.intervals.reduce((a, b) => a + b, 0)).toBe(12); // oktav
    });

    it("should return all makams have required properties", () => {
      MAKAM_DATA.forEach((makam) => {
        expect(makam.id).toBeDefined();
        expect(makam.name).toBeDefined();
        expect(makam.tonic).toBeDefined();
        expect(makam.intervals).toHaveLength(7);
        expect(makam.dominant).toBeDefined();
      });
    });
  });

  describe("getMakamScale", () => {
    it("should generate correct scale for Rast makam", () => {
      const rast = getMakamById("rast")!;
      const scale = getMakamScale(rast);
      expect(scale).toEqual(["C", "D", "E", "F", "G", "A", "B", "C"]);
    });

    it("should generate correct scale for Hicaz makam", () => {
      const hicaz = getMakamById("hicaz")!;
      const scale = getMakamScale(hicaz);
      expect(scale).toEqual(["C", "C#", "E", "F", "G", "G#", "A#", "C"]);
    });

    it("should generate 8 notes (7 intervals + tonic)", () => {
      const nihavend = getMakamById("nihavend")!;
      const scale = getMakamScale(nihavend);
      expect(scale).toHaveLength(8);
    });

    it("should return tonic as first note", () => {
      const segah = getMakamById("segah")!;
      const scale = getMakamScale(segah);
      expect(scale[0]).toBe(segah.tonic);
    });
  });

  describe("otoriter seyir tarifi (Gonul s.307+)", () => {
    it("attaches seyir text to main makams", () => {
      for (const id of ["rast", "huseyni", "hicaz", "ussak", "segah", "nihavend", "saba"]) {
        const seyir = getMakamById(id)?.seyir;
        expect(seyir?.metin.length, `${id} seyir`).toBeGreaterThan(50);
        expect(seyir?.yon, `${id} yon`).toMatch(/Çıkıcı|İnici/);
      }
    });

    it("rast seyir mentions its karar perde", () => {
      expect(getMakamById("rast")?.seyir?.metin).toContain("Rast");
    });
  });

  describe("korpus-destekli ek makamlar (E9)", () => {
    // Yeni makamlar korpus koma dizisini (SymbTr) attachCorpusData ile alir;
    // intervals otonom turetilir, otantik mikrotonal frekanslar hesaplanabilir.
    it.each(["hicazkar", "ferahfeza"])(
      "%s korpus koma dizisi + gecerli oktav tasir",
      (id) => {
        const makam = getMakamById(id);
        expect(makam, id).toBeDefined();
        expect(makam?.komaScale, `${id} komaScale`).toBeDefined();
        expect(makam?.intervals).toHaveLength(7);
        expect(makam?.intervals.reduce((a, b) => a + b, 0)).toBe(12);
      },
    );

    // REGRESYON GUARD: iki makam ayni normalize-anahtara dusmemeli. Aksi halde
    // UI seciciside yinelenen ("Hüzzam" iki kez) secenekler + korpus-eslesme
    // belirsizligi olusur (E9'da huzzam vs hüzzam duplicate'i boyle olmustu).
    it("hicbir makam id'si normalize edilince cakismaz (duplicate yok)", () => {
      const normalize = (name: string) =>
        name
          .toLocaleLowerCase("tr")
          .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"})[m] ?? m)
          .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"})[m] ?? m)
          .replace(/[^a-z0-9]/g, "");
      const byNorm = new Map<string, string[]>();
      for (const makam of MAKAM_DATA) {
        const key = normalize(makam.id);
        byNorm.set(key, [...(byNorm.get(key) ?? []), makam.id]);
      }
      const collisions = [...byNorm.entries()].filter(([, ids]) => ids.length > 1);
      expect(collisions, `normalize cakismasi: ${JSON.stringify(collisions)}`).toEqual([]);
    });
  });
});

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
});

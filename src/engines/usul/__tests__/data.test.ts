import { describe, it, expect } from "vitest";
import { getUsulById, getUsulBeatDuration, USUL_DATA } from "../data";

describe("usul/data", () => {
  describe("getUsulById", () => {
    it("should return usul for valid id", () => {
      const aksaksemai = getUsulById("aksaksemai");
      expect(aksaksemai).toBeDefined();
      expect(aksaksemai?.id).toBe("aksaksemai");
      expect(aksaksemai?.beats).toBe(10);
    });

    it("should return undefined for invalid id", () => {
      const result = getUsulById("nonexistent");
      expect(result).toBeUndefined();
    });

    it("should return correct beats for duyek", () => {
      const duyek = getUsulById("duyek");
      expect(duyek).toBeDefined();
      expect(duyek?.beats).toBe(8);
      expect(duyek?.unit).toBe("4");
    });

    it("should return all usuls have required properties", () => {
      USUL_DATA.forEach((usul) => {
        expect(usul.id).toBeDefined();
        expect(usul.name).toBeDefined();
        expect(usul.beats).toBeGreaterThan(0);
        expect(usul.unit).toBeDefined();
        expect(usul.symbols).toHaveLength(usul.beats);
        expect(usul.stressPattern).toHaveLength(usul.beats);
      });
    });

    it("should model Devr-i Kebir as 6+4+6+4+4+4 instead of a flat four-beat repeat", () => {
      const devriKebir = getUsulById("devrikebir");

      expect(devriKebir).toBeDefined();
      expect(devriKebir?.symbols.filter((symbol) => symbol.symbol === "dum").map((symbol) => symbol.beat)).toEqual([
        1,
        4,
        7,
        11,
        14,
        17,
        21,
        25,
      ]);
      expect(devriKebir?.symbols.filter((symbol) => symbol.symbol === "ke").map((symbol) => symbol.beat)).toEqual([
        9,
        19,
        23,
        27,
      ]);
      expect(devriKebir?.stressPattern).toEqual([
        1, 0, 0, 1, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 1, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0,
      ]);
    });
  });

  describe("getUsulBeatDuration", () => {
    it("should calculate correct duration for 4/4 at 60 bpm", () => {
      const duyek = getUsulById("duyek")!;
      const duration = getUsulBeatDuration(duyek, 60);
      expect(duration).toBe(1);
    });

    it("should calculate correct duration for 8 at 60 bpm", () => {
      const aksaksemai = getUsulById("aksaksemai")!;
      const duration = getUsulBeatDuration(aksaksemai, 60);
      expect(duration).toBe(0.5);
    });

    it("should calculate correct duration for 9 at 120 bpm", () => {
      const aksaksemai = getUsulById("aksaksemai")!;
      const duration = getUsulBeatDuration(aksaksemai, 120);
      expect(duration).toBe(0.25);
    });

    it("should return positive duration", () => {
      USUL_DATA.forEach((usul) => {
        const duration = getUsulBeatDuration(usul, 60);
        expect(duration).toBeGreaterThan(0);
      });
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  midiToFrequency,
  noteNameToMidi,
  midiToNoteName,
  PIANO_KEYS,
} from "../data";

describe("nota/data", () => {
  describe("midiToFrequency", () => {
    it("should return 440 for midi 69 (A4)", () => {
      const freq = midiToFrequency(69);
      expect(freq).toBeCloseTo(440, 2);
    });

    it("should return ~261.63 for midi 60 (C4)", () => {
      const freq = midiToFrequency(60);
      expect(freq).toBeCloseTo(261.63, 2);
    });

    it("should return ~523.25 for midi 72 (C5)", () => {
      const freq = midiToFrequency(72);
      expect(freq).toBeCloseTo(523.25, 2);
    });

    it("should follow logarithmic scale", () => {
      const freq60 = midiToFrequency(60);
      const freq72 = midiToFrequency(72);
      expect(freq72 / freq60).toBeCloseTo(2, 1);
    });
  });

  describe("noteNameToMidi", () => {
    it("should return 60 for C4", () => {
      const midi = noteNameToMidi("C", 4);
      expect(midi).toBe(60);
    });

    it("should return 69 for A4", () => {
      const midi = noteNameToMidi("A", 4);
      expect(midi).toBe(69);
    });

    it("should return 61 for C#4", () => {
      const midi = noteNameToMidi("C#", 4);
      expect(midi).toBe(61);
    });

    it("should handle different octaves", () => {
      const midiC4 = noteNameToMidi("C", 4);
      const midiC5 = noteNameToMidi("C", 5);
      expect(midiC5 - midiC4).toBe(12);
    });
  });

  describe("midiToNoteName", () => {
    it("should return C4 for midi 60", () => {
      const name = midiToNoteName(60);
      expect(name).toBe("C4");
    });

    it("should return A4 for midi 69", () => {
      const name = midiToNoteName(69);
      expect(name).toBe("A4");
    });

    it("should return C#5 for midi 73", () => {
      const name = midiToNoteName(73);
      expect(name).toBe("C#5");
    });

    it("should return D5 for midi 74", () => {
      const name = midiToNoteName(74);
      expect(name).toBe("D5");
    });
  });


  describe("PIANO_KEYS", () => {
    it("should have white and black keys", () => {
      expect(PIANO_KEYS.white).toBeDefined();
      expect(PIANO_KEYS.black).toBeDefined();
      expect(Array.isArray(PIANO_KEYS.white)).toBe(true);
      expect(Array.isArray(PIANO_KEYS.black)).toBe(true);
    });

    it("should have correct number of white keys", () => {
      expect(PIANO_KEYS.white.length).toBe(21);
    });

    it("should have correct number of black keys", () => {
      expect(PIANO_KEYS.black.length).toBe(15);
    });

    it("white keys should not be black", () => {
      PIANO_KEYS.white.forEach((key) => {
        expect(key.isBlack).toBe(false);
      });
    });

    it("black keys should be black", () => {
      PIANO_KEYS.black.forEach((key) => {
        expect(key.isBlack).toBe(true);
      });
    });

    it("all keys should have valid midi numbers", () => {
      const allKeys = [...PIANO_KEYS.white, ...PIANO_KEYS.black];
      allKeys.forEach((key) => {
        expect(key.midiNumber).toBeGreaterThanOrEqual(48);
        expect(key.midiNumber).toBeLessThanOrEqual(84);
      });
    });
  });
});

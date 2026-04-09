import { describe, it, expect } from "vitest";
import {
  detectPitchFromData,
  convertPitchToNotaEvents,
  PitchDetectionResult,
} from "../recording";

describe("ses/recording", () => {
  describe("detectPitchFromData", () => {
    it("should return null for empty data", () => {
      const data = new Float32Array(0);
      const result = detectPitchFromData(data, 44100);
      expect(result).toBeNull();
    });

    it("should return PitchDetectionResult with valid properties", () => {
      const sampleRate = 44100;
      const duration = 0.1;
      const frequency = 440;
      const samples = Math.floor(sampleRate * duration);
      const data = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      }

      const result = detectPitchFromData(data, sampleRate);
      expect(result).not.toBeNull();
      expect(result!.frequency).toBeGreaterThan(0);
      expect(result!.confidence).toBeGreaterThan(0);
      expect(result!.midiNumber).toBeGreaterThanOrEqual(0);
      expect(result!.noteName).toBeDefined();
    });
  });

  describe("convertPitchToNotaEvents", () => {
    it("should return empty array for empty input", () => {
      const result = convertPitchToNotaEvents([]);
      expect(result).toEqual([]);
    });

    it("should return single event for single pitch", () => {
      const pitches: PitchDetectionResult[] = [
        {
          frequency: 440,
          confidence: 0.9,
          midiNumber: 69,
          noteName: "A4",
        },
      ];
      const events = convertPitchToNotaEvents(pitches);
      expect(events).toHaveLength(1);
      expect(events[0].pitch).toBe("A4");
    });

    it("should merge consecutive same pitches", () => {
      const pitches: PitchDetectionResult[] = [
        { frequency: 440, confidence: 0.9, midiNumber: 69, noteName: "A4" },
        { frequency: 441, confidence: 0.9, midiNumber: 69, noteName: "A4" },
        { frequency: 439, confidence: 0.9, midiNumber: 69, noteName: "A4" },
      ];
      const events = convertPitchToNotaEvents(pitches);
      expect(events).toHaveLength(1);
    });

    it("should create separate events for different pitches", () => {
      const pitches: PitchDetectionResult[] = [
        { frequency: 440, confidence: 0.9, midiNumber: 69, noteName: "A4" },
        { frequency: 493.88, confidence: 0.9, midiNumber: 71, noteName: "B4" },
        { frequency: 523.25, confidence: 0.9, midiNumber: 72, noteName: "C5" },
      ];
      const events = convertPitchToNotaEvents(pitches);
      expect(events).toHaveLength(3);
    });

    it("should set duration to at least minDuration", () => {
      const pitches: PitchDetectionResult[] = [
        { frequency: 440, confidence: 0.9, midiNumber: 69, noteName: "A4" },
      ];
      const events = convertPitchToNotaEvents(pitches, 0.5);
      expect(events[0].duration).toBeGreaterThanOrEqual(0.5);
    });

    it("should include velocity based on confidence", () => {
      const pitches: PitchDetectionResult[] = [
        { frequency: 440, confidence: 0.8, midiNumber: 69, noteName: "A4" },
      ];
      const events = convertPitchToNotaEvents(pitches);
      expect(events[0].velocity).toBeGreaterThan(0);
      expect(events[0].velocity).toBeLessThanOrEqual(127);
    });

    it("should include startTime for events", () => {
      const pitches: PitchDetectionResult[] = [
        { frequency: 440, confidence: 0.9, midiNumber: 69, noteName: "A4" },
        { frequency: 493.88, confidence: 0.9, midiNumber: 71, noteName: "B4" },
      ];
      const events = convertPitchToNotaEvents(pitches);
      expect(events[0].startTime).toBeDefined();
      expect(events[1].startTime).toBeDefined();
    });
  });
});

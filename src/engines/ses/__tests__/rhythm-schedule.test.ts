import {describe, expect, it} from "vitest";
import {buildRhythmSchedule} from "../instruments";

describe("buildRhythmSchedule", () => {
  it("uses explicit beat positions instead of array index order", () => {
    const schedule = buildRhythmSchedule(
      4,
      [
        {beat: 3, symbol: "ke", isAccent: false},
        {beat: 1, symbol: "dum", isAccent: true},
      ],
      120,
    );

    expect(schedule).toEqual([
      {startOffset: 0, beatDuration: 0.5, symbol: "dum", isAccent: true},
      {startOffset: 1, beatDuration: 0.5, symbol: "ke", isAccent: false},
    ]);
  });

  it("preserves half-beat te-ke strokes without merging them into one double hit", () => {
    const schedule = buildRhythmSchedule(
      10,
      [
        {beat: 9, symbol: "tek", isAccent: false, timeValue: 0.5},
        {beat: 9.5, symbol: "ke", isAccent: false, timeValue: 0.5},
      ],
      60,
    );

    expect(schedule).toEqual([
      {startOffset: 8, beatDuration: 0.5, symbol: "tek", isAccent: false},
      {startOffset: 8.5, beatDuration: 0.5, symbol: "ke", isAccent: false},
    ]);
  });
});

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

  it("scales beat duration by the usul unit (9/8 aksak is eighth-note based)", () => {
    // Onceki surumde birim yok sayilip ceyreklik varsayiliyordu; 8'lik 14
    // usulde ses, sayfadaki gorsel imlecten 2x yavas akiyordu (2026-07-14).
    const schedule = buildRhythmSchedule(
      9,
      [
        {beat: 1, symbol: "dum", isAccent: true},
        {beat: 3, symbol: "tek", isAccent: false},
      ],
      120,
      "8",
    );

    expect(schedule).toEqual([
      {startOffset: 0, beatDuration: 0.25, symbol: "dum", isAccent: true},
      {startOffset: 0.5, beatDuration: 0.25, symbol: "tek", isAccent: false},
    ]);
  });

  it("keeps the quarter-note default when unit is omitted (backward compat)", () => {
    const schedule = buildRhythmSchedule(2, [{beat: 2, symbol: "dum", isAccent: true}], 60);

    expect(schedule).toEqual([{startOffset: 1, beatDuration: 1, symbol: "dum", isAccent: true}]);
  });

  it("caps the hit envelope at one beat so long-valued strokes do not expose sample rebound", () => {
    // Devr-i Kebir'in 2 vurusluk Tek'lerinde pencere degerle olceklenince
    // kudum kaydindaki seken ikinci vurus da duyuluyordu.
    const schedule = buildRhythmSchedule(4, [{beat: 1, symbol: "tek", isAccent: false, timeValue: 2}], 60);

    expect(schedule).toEqual([{startOffset: 0, beatDuration: 1, symbol: "tek", isAccent: false}]);
  });
});

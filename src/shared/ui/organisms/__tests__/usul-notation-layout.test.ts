import {describe, expect, it} from "vitest";
import {usulBeatCenterX, usulPlayheadX} from "../UsulNotation";

/**
 * Oynatma cizgisi ile nota merkezi ayni x-eslemesini kullanmali. Kullanici
 * ekran goruntusuyle bildirdi: cizgi, yanan notanin YARIM SUTUN SOLUNDAYDI
 * (playhead `gridStart + p*perBeat`, nota `beatCenterX` = +perBeat/2).
 */
describe("usul notation playhead alignment", () => {
  const gridStart = 77;
  const perBeat = 84;
  const beats = 4;

  it("places the playhead exactly on the note center of the sounding beat", () => {
    // progressBeat p (0-tabanli) -> muzikal vurus (p+1); cizgi o notanin merkezinde.
    expect(usulPlayheadX(gridStart, perBeat, beats, 0)).toBeCloseTo(usulBeatCenterX(gridStart, perBeat, 1), 6);
    expect(usulPlayheadX(gridStart, perBeat, beats, 2)).toBeCloseTo(usulBeatCenterX(gridStart, perBeat, 3), 6);
    expect(usulPlayheadX(gridStart, perBeat, beats, 2.5)).toBeCloseTo(usulBeatCenterX(gridStart, perBeat, 3.5), 6);
  });

  it("does NOT sit on the left grid line (the old half-column-off bug)", () => {
    // Eski hatali deger: gridStart + p*perBeat. Yeni deger ondan tam perBeat/2 sagda.
    const buggy = gridStart + 0 * perBeat;
    expect(usulPlayheadX(gridStart, perBeat, beats, 0) - buggy).toBeCloseTo(perBeat / 2, 6);
  });

  it("clamps at the last beat so it never runs past the staff", () => {
    expect(usulPlayheadX(gridStart, perBeat, beats, 99)).toBeCloseTo(usulBeatCenterX(gridStart, perBeat, beats + 1), 6);
  });
});

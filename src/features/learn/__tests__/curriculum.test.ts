import {describe, it, expect} from "vitest";
import {CURRICULUM, CURRICULUM_STEPS, TOTAL_STEPS} from "../curriculum";
import {getUsulById} from "@/engines/usul/data";

describe("learn/curriculum", () => {
  it("her adim var olan bir usulu referanslar", () => {
    for (const step of CURRICULUM_STEPS) {
      expect(getUsulById(step.usulId), `eksik usul: ${step.usulId}`).toBeDefined();
    }
  });

  it("usul id'leri tekil (mukerrer adim yok)", () => {
    const ids = CURRICULUM_STEPS.map((s) => s.usulId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("TOTAL_STEPS duzlestirilmis adim sayisiyla ayni", () => {
    expect(TOTAL_STEPS).toBe(CURRICULUM.reduce((n, level) => n + level.steps.length, 0));
  });

  it("adimlar kucukten buyuge zaman sayisina gore siralanmis (azalmayan)", () => {
    const beats = CURRICULUM_STEPS.map((s) => getUsulById(s.usulId)!.beats);
    for (let i = 1; i < beats.length; i += 1) {
      expect(beats[i], `adim ${i} (${CURRICULUM_STEPS[i].usulId})`).toBeGreaterThanOrEqual(beats[i - 1]);
    }
  });

  it("her adimin faktuel bir notu var", () => {
    for (const step of CURRICULUM_STEPS) {
      expect(step.note.length, step.usulId).toBeGreaterThan(10);
    }
  });

  it("ilk adim en kucuk usul (Nimsofyan, 2 zaman)", () => {
    const first = getUsulById(CURRICULUM_STEPS[0].usulId)!;
    expect(first.beats).toBe(2);
  });
});

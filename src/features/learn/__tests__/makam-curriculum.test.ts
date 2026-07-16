import {describe, it, expect} from "vitest";
import {MAKAM_CURRICULUM, MAKAM_CURRICULUM_STEPS, MAKAM_TOTAL_STEPS} from "../makam-curriculum";
import {getMakamById} from "@/engines/makam/data";

describe("learn/makam-curriculum", () => {
  it("her adim var olan bir makami referanslar", () => {
    for (const step of MAKAM_CURRICULUM_STEPS) {
      expect(getMakamById(step.makamId), `eksik makam: ${step.makamId}`).toBeDefined();
    }
  });

  it("her mufredat makami otoriter seyir tasir (tam kaynakli adim)", () => {
    for (const step of MAKAM_CURRICULUM_STEPS) {
      const seyir = getMakamById(step.makamId)?.seyir;
      expect(seyir?.metin.length, `${step.makamId} seyir`).toBeGreaterThan(20);
    }
  });

  it("makam id'leri tekil (mukerrer adim yok)", () => {
    const ids = MAKAM_CURRICULUM_STEPS.map((s) => s.makamId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("MAKAM_TOTAL_STEPS duzlestirilmis adim sayisiyla ayni", () => {
    expect(MAKAM_TOTAL_STEPS).toBe(MAKAM_CURRICULUM.reduce((n, level) => n + level.steps.length, 0));
  });

  it("her adimin faktuel bir notu var", () => {
    for (const step of MAKAM_CURRICULUM_STEPS) {
      expect(step.note.length, step.makamId).toBeGreaterThan(10);
    }
  });

  it("ilk adim temel makam Rast", () => {
    expect(MAKAM_CURRICULUM_STEPS[0].makamId).toBe("rast");
  });
});

import {describe, expect, it} from "vitest";
import {buildTriageEntry, buildVerificationEntry} from "../ai-verify-symbtr-layout.mjs";

const catalogId = "hicazkar--pesrev--duyek--test--besteci";
const layoutData = {
  generatedAt: "2026-06-04T00:00:00.000Z",
  entries: {
    [catalogId]: {
      source: {archiveMemberPath: "pdf/test.pdf"},
      measureCandidates: [{}, {}],
    },
  },
};

describe("ai-verify-symbtr-layout triage safety", () => {
  it("does not build verification entries from LLM results", () => {
    expect(buildVerificationEntry({
      status: "triage-only",
      measureBoxes: [{measureIndex: 1}],
    }, catalogId, layoutData)).toBeNull();
  });

  it("builds triage entries that cannot be promoted", () => {
    const entry = buildTriageEntry({
      status: "triage-only",
      triageStatus: "needs-human-review",
      confidence: "low",
      failureMode: "barline-ambiguity",
      reason: "Barline sınırı belirsiz.",
      recommendedAction: "human-review",
      rejectedCandidates: [1],
      raw: "{\"triageStatus\":\"needs-human-review\"}",
    }, catalogId, layoutData, {checks: {pageBounds: {valid: true}}});

    expect(entry).toEqual(expect.objectContaining({
      type: "symbtr-layout-llm-triage-entry",
      method: "llm-triage-only",
      promotionEligible: false,
      rejectedCandidateIndexes: [1],
    }));
    expect(entry).not.toHaveProperty("measureBoxes");
  });
});

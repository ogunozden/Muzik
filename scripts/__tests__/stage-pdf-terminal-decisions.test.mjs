import {describe, expect, it} from "vitest";
import {buildPdfTerminalDecisions} from "../stage-pdf-terminal-decisions.mjs";

describe("PDF terminal decision staging", () => {
  it("stages only unresolved PDF layout entries as needs-human-review without promoting boxes", () => {
    const layoutData = {
      schemaVersion: 1,
      generatedAt: "2026-05-10",
      entries: {
        verified_entry: {
          source: {archiveMemberPath: "pdf_v3/verified_entry.pdf"},
          pageSize: {width: 1, height: 1},
          measureCandidates: [{rowIndex: 0, candidateIndexInRow: 0, leftPercent: 1}],
        },
        unresolved_entry: {
          source: {archiveMemberPath: "pdf_v3/unresolved_entry.pdf"},
          pageSize: {width: 1, height: 1},
          measureCandidates: [{rowIndex: 0, candidateIndexInRow: 0, leftPercent: 2}],
        },
      },
    };
    const verificationData = {
      entries: {
        verified_entry: {
          measureBoxes: [{measureIndex: 1, confidence: "verified"}],
        },
      },
    };

    const payload = buildPdfTerminalDecisions({
      layoutData,
      verificationData,
      verificationSummary: {
        scoreMeasureSummaries: [
          {catalogId: "verified_entry"},
          {catalogId: "unresolved_entry"},
        ],
      },
      generatedAt: "2026-06-04T00:00:00.000Z",
    });

    expect(payload.summary).toEqual({
      layoutEntryCount: 2,
      scopedCandidateEntryCount: 2,
      existingVerifiedEntryCount: 1,
      terminalDecisionEntryCount: 1,
      measureBoxesPromoted: 0,
    });
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0]).toEqual(expect.objectContaining({
      catalogId: "unresolved_entry",
      status: "needs-human-review",
      promotionEligible: false,
      measureBoxesPromoted: 0,
      nextAction: "human-review",
    }));
    expect(payload.entries[0].candidateGeometryFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not stage layout entries outside the validator candidate summary scope", () => {
    const payload = buildPdfTerminalDecisions({
      layoutData: {
        schemaVersion: 1,
        generatedAt: "2026-05-10",
        entries: {
          in_scope: {
            source: {archiveMemberPath: "pdf_v3/in_scope.pdf"},
            pageSize: {width: 1, height: 1},
            measureCandidates: [{rowIndex: 0, candidateIndexInRow: 0}],
          },
          out_of_scope: {
            source: {archiveMemberPath: "pdf_v3/out_of_scope.pdf"},
            pageSize: {width: 1, height: 1},
            measureCandidates: [{rowIndex: 0, candidateIndexInRow: 0}],
          },
        },
      },
      verificationData: {entries: {}},
      verificationSummary: {
        scoreMeasureSummaries: [{catalogId: "in_scope"}],
      },
      generatedAt: "2026-06-04T00:00:00.000Z",
    });

    expect(payload.summary.scopedCandidateEntryCount).toBe(1);
    expect(payload.summary.terminalDecisionEntryCount).toBe(1);
    expect(payload.entries.map((entry) => entry.catalogId)).toEqual(["in_scope"]);
  });
});

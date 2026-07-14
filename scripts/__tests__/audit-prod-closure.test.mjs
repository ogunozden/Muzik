import {describe, expect, it} from "vitest";
import {buildProdClosureReadinessSummary} from "../audit-prod-closure.mjs";

describe("prod closure readiness", () => {
  it("keeps the holistic closure incomplete while source and PDF queues are unresolved", () => {
    const summary = buildProdClosureReadinessSummary({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageSummary: {
        missingCuratedEntries: 2978,
        candidateReviewGroupEntries: 2978,
      },
      providerVerificationCoverage: {
        networkProviderRemainingGroupCount: 2930,
        safety: {directAutoAttachCount: 0},
        byProvider: [{verifiedOrClassifiedGroupCount: 48}],
      },
      providerVerificationBatchRun: {
        completedBatchCount: 1,
        directAutoAttachCount: 0,
        mediaDownloadCount: 0,
        sourceContentCopiedCount: 0,
      },
      pdfSummary: {
        candidateEntries: 1805,
        verificationEntries: 520,
        verifiedEntries: 520,
        verifiedMeasureBoxes: 18334,
        unresolvedCandidateEntries: 1285,
      },
      prodCycleSummary: {ok: true},
    });

    expect(summary.ok).toBe(false);
    expect(summary.sourceClosure.unresolvedGroupCount).toBe(2978);
    expect(summary.pdfClosure.unresolvedEntryCount).toBe(1285);
    expect(summary.blockers).toEqual([
      "source unresolved groups: 2978",
      "PDF unresolved entries: 1285",
    ]);
    expect(summary.nextCommands).toContain("npm run run:prod-closure-source-batches -- --batches 1 --limit 250 --rows 3 --timeout-ms 600000");
    expect(summary.nextCommands).toContain("npm run verify:symbtr-measures:aligned && npm run verify:symbtr-measures");
  });

  it("marks closure ready only when every target is terminal and safety gates stay clean", () => {
    const sourceDecisions = {
      entries: Array.from({length: 2978}, (_, index) => ({
        catalogId: `catalog-${index}`,
        status: index % 2 === 0 ? "accepted" : "verified-unavailable",
      })),
    };
    const pdfDecisions = {
      entries: Array.from({length: 1285}, (_, index) => ({
        catalogId: `pdf-${index}`,
        status: index % 2 === 0 ? "verified" : "needs-human-review",
      })),
    };

    const summary = buildProdClosureReadinessSummary({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageSummary: {
        missingCuratedEntries: 2978,
        candidateReviewGroupEntries: 2978,
      },
      providerVerificationCoverage: {
        networkProviderRemainingGroupCount: 0,
        safety: {directAutoAttachCount: 0},
        byProvider: [{verifiedOrClassifiedGroupCount: 2978}],
      },
      providerVerificationBatchRun: {
        completedBatchCount: 116,
        directAutoAttachCount: 0,
        mediaDownloadCount: 0,
        sourceContentCopiedCount: 0,
      },
      sourceTerminalDecisions: sourceDecisions,
      pdfSummary: {
        candidateEntries: 1805,
        verificationEntries: 520,
        verifiedEntries: 520,
        verifiedMeasureBoxes: 18334,
        unresolvedCandidateEntries: 1285,
      },
      pdfTerminalDecisions: pdfDecisions,
      prodCycleSummary: {ok: true},
    });

    expect(summary.ok).toBe(true);
    expect(summary.blockers).toEqual([]);
    expect(summary.sourceClosure.terminalDecisionGroupCount).toBe(2978);
    expect(summary.sourceClosure.unresolvedGroupCount).toBe(0);
    expect(summary.pdfClosure.terminalDecisionEntryCount).toBe(1285);
    expect(summary.pdfClosure.unresolvedEntryCount).toBe(0);
    expect(summary.nextCommands).toEqual(["npm run audit:prod-cycle"]);
  });
});

import {describe, expect, it} from "vitest";
import {buildProdCycleSummary} from "../audit-prod-cycle.mjs";

const REQUIRED_FLOW = [
  "ingest",
  "normalize",
  "dedupe",
  "provider-profile-classify",
  "candidate-generate",
  "confidence-score",
  "status-assign",
  "safe-auto-attach-accepted-only",
  "validate",
  "coverage-report",
];

describe("prod cycle audit summary", () => {
  it("allows verified PDF measure boxes when deterministic promotion evidence is present", () => {
    const securityAudit = {
      id: "security-audit",
      ok: true,
      exitCode: 0,
      stdoutTail: ["found 0 vulnerabilities"],
      stderrTail: [],
    };

    const summary = buildProdCycleSummary({
      baseUrl: "http://localhost:4015",
      commandResults: [securityAudit],
      coverageSummary: {
        totalCatalogEntries: 3000,
        curatedReferenceEntries: 22,
        missingCuratedEntries: 2978,
        duplicateRowsAfterDedupe: 0,
        candidateReviewQueueEntries: 14890,
        candidateReviewGroupEntries: 2978,
        sourceIntakeTemplateRowEntries: 2891,
        candidateReviewQueueByStatus: [{value: "needs-review", count: 14890}],
        candidateReviewGroupsByStatus: [{value: "needs-review", count: 2978}],
        candidateReviewQueueByProfile: [{value: "internet-archive", count: 2978}],
        batchReport: {
          flow: REQUIRED_FLOW,
          processedCatalogEntries: 3000,
          duplicateRowsAfterDedupe: 0,
          autoAttachPolicy: "Only accepted bulk candidates are eligible for auto-attach.",
        },
      },
      sourceIntakeDryRun: {
        dryRun: true,
        errors: [],
        validationGates: [
          "accepted-candidates-present",
          "accepted-evidence-complete",
          "https-url-policy",
          "research-profile-match",
          "accepted-identity-dedupe",
          "dry-run-import-no-write",
        ],
        summary: {
          acceptedCandidateCount: 7,
          httpsAcceptedCount: 7,
          evidenceCompleteCount: 7,
          dryRunSkippedDuplicateCount: 7,
        },
      },
      sourceDiscoveryVerification: {
        ok: true,
        errors: [],
        summary: {
          processedMissingCatalogEntries: 2978,
          directAutoAttachCount: 0,
          providerCount: 4,
          candidateCount: 11912,
          acceptedReadyCount: 0,
          needsReviewCount: 11892,
          conflictCount: 4,
          negativeCacheCount: 11912,
        },
      },
      sourceProviderVerificationRun: {
        ok: true,
        dryRun: true,
        processedGroupCount: 25,
        totalBacklogGroupCount: 2978,
        providerCount: 5,
        verificationPacketCount: 125,
        directAutoAttachCount: 0,
        mediaDownloadCount: 0,
        sourceContentCopiedCount: 0,
        warnings: [],
      },
      sourceProviderVerificationPlan: {
        totalBacklogGroupCount: 2978,
        safety: {
          directAutoAttachCount: 0,
          searchOnlyCandidatesAccepted: 0,
        },
      },
      sourceProviderVerificationCoverage: {
        totalBacklogGroupCount: 2978,
        networkProviderRemainingGroupCount: 2930,
        safety: {directAutoAttachCount: 0},
        byProvider: [{verifiedOrClassifiedGroupCount: 23}],
      },
      sourceProviderVerificationBatchRun: {
        completedBatchCount: 1,
        directAutoAttachCount: 0,
        mediaDownloadCount: 0,
        sourceContentCopiedCount: 0,
        finalInternetArchiveVerifiedCount: 23,
        finalInternetArchiveRemainingCount: 2955,
      },
      pdfSummary: {
        errors: [],
        candidateEntries: 1805,
        verificationEntries: 520,
        verifiedEntries: 520,
        verifiedMeasureBoxes: 18334,
        unresolvedCandidateEntries: 1285,
        fingerprintAlgorithm: "sha256-staff-barline-page",
        candidateStatus: "verified-measure-boxes-present",
        promotionPolicy: "Only human-reviewed, visual-regression, or symbtr-txt-aligned PDF measure boxes may be promoted.",
        emptyImportDryRun: {
          dryRunVerifiedMeasureBoxCount: 0,
          verificationManifestUnchanged: true,
          verificationManifestBeforeSha256: "abc",
          verificationManifestAfterSha256: "abc",
        },
      },
      prodClosureReadiness: {
        ok: true,
        blockers: [],
        sourceClosure: {
          complete: true,
          terminalDecisionGroupCount: 2978,
          unresolvedGroupCount: 0,
        },
        pdfClosure: {
          complete: true,
          terminalDecisionEntryCount: 1285,
          unresolvedEntryCount: 0,
        },
        safety: {
          directAutoAttachCount: 0,
          mediaDownloadCount: 0,
          sourceContentCopiedCount: 0,
        },
      },
      studioFollowAudit: {
        ok: true,
        browserWarningOrErrorCount: 0,
      },
      referencesRuntimeAudit: {
        ok: true,
        metrics: {
          hasRawPacketArrays: false,
          hasSourceIntakeRowFields: false,
        },
      },
      securityAudit,
    });

    expect(summary.ok).toBe(true);
    expect(summary.errors).toEqual([]);
    expect(summary.pdfVerification.verifiedMeasureBoxes).toBe(18334);
    expect(summary.pdfVerification.unresolvedCandidateEntries).toBe(1285);
    expect(summary.prodClosure).toEqual(expect.objectContaining({
      ok: true,
      sourceTerminalGroups: 2978,
      sourceUnresolvedGroups: 0,
      pdfTerminalEntries: 1285,
      pdfUnresolvedEntries: 0,
    }));
    expect(summary.openWork).toEqual([
      expect.objectContaining({id: "external-reference-coverage", status: "terminal-closed", count: 0}),
      expect.objectContaining({id: "pdf-measure-verification", status: "terminal-closed", count: 0}),
    ]);
  });
});

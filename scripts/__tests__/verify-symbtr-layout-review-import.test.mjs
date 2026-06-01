import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  buildSymbTrLayoutReviewImportDryRun,
  runSymbTrLayoutReviewImportDryRun,
} from "../verify-symbtr-layout-review-import.mjs";

const catalogId = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";

function writeJson(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-layout-review-import-proof-"));
  const candidateGeometryFingerprint = "a".repeat(64);

  writeJson(root, "src/data/symbtr/layout.generated.json", {
    schemaVersion: 1,
    generatedAt: "2026-05-10",
    entries: {
      [catalogId]: {
        catalogId,
        source: {archiveMemberPath: `pdf_v3/${catalogId}.PDF`},
        measureCandidates: [
          {
            rowIndex: 0,
            candidateIndexInRow: 0,
          },
        ],
      },
    },
  });
  writeJson(root, "src/data/symbtr/layout-verification.generated.json", {
    schemaVersion: 1,
    generatedAt: "2026-05-10",
    policy: "Only human-reviewed or visual-regression-approved PDF measure boxes may be promoted.",
    entries: {},
  });
  writeJson(root, "output/symbtr-layout-review/layout-verification-review-template.json", {
    schemaVersion: 1,
    type: "symbtr-pdf-layout-verification-review-template",
    generatedAt: "2026-06-01",
    entries: {
      [catalogId]: {
        catalogId,
        sourceLayoutGeneratedAt: "2026-05-10",
        sourceArchiveMemberPath: `pdf_v3/${catalogId}.PDF`,
        sourceMeasureCandidateCount: 1,
        candidateGeometryFingerprint,
        candidateReviewRows: [
          {
            sourceCandidateRowIndex: 0,
            sourceCandidateIndexInRow: 0,
            suggestedMeasureIndex: null,
            confidence: "pdf-vector-candidate",
          },
        ],
        measureBoxes: [],
      },
    },
  });
  writeJson(root, "output/symbtr-layout-review/layout-verification-review-batch-plan.json", {
    schemaVersion: 1,
    type: "symbtr-pdf-layout-verification-review-batch-plan",
    generatedAt: "2026-06-01",
    entryCount: 1,
    candidateReviewRows: 1,
    packets: [
      {
        packetId: "symbtr-pdf-review-packet-0001",
        status: "needs-visual-review",
        candidateReviewRows: [
          {
            catalogId,
            sourceCandidateRowIndex: 0,
            sourceCandidateIndexInRow: 0,
            suggestedMeasureIndex: null,
            reviewDecision: "unreviewed",
            confidence: "pdf-vector-candidate",
          },
        ],
        promotionTemplate: {
          measureBoxes: [],
        },
      },
    ],
  });
  mkdirSync(path.join(root, "scripts"), {recursive: true});
  writeFileSync(path.join(root, "scripts/validate-symbtr-layout-verification.mjs"), "process.exit(0);\n");

  return root;
}

describe("verify-symbtr-layout-review-import", () => {
  it("proves PDF review packets through a no-write empty import dry-run", () => {
    const root = createRoot();
    const report = runSymbTrLayoutReviewImportDryRun({
      root,
      generatedAt: "2026-06-01",
    });
    const written = JSON.parse(readFileSync(
      path.join(root, "output/symbtr-layout-review/layout-verification-empty-import-dry-run.json"),
      "utf8",
    ));

    expect(report).toEqual(expect.objectContaining({
      type: "symbtr-pdf-layout-verification-empty-import-dry-run",
      dryRun: true,
      summaryOutput: "output/symbtr-layout-review/layout-verification-empty-import-dry-run.json",
    }));
    expect(report.summary).toEqual(expect.objectContaining({
      reviewTemplateEntryCount: 1,
      reviewTemplateCandidateRows: 1,
      reviewBatchPacketCount: 1,
      reviewBatchCandidateRows: 1,
      dryRunInputEntryCount: 0,
      dryRunOutputEntryCount: 0,
      dryRunVerifiedMeasureBoxCount: 0,
      verificationManifestBeforeSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      verificationManifestAfterSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      verificationManifestUnchanged: true,
    }));
    expect(report.summary.verificationManifestBeforeSha256).toBe(report.summary.verificationManifestAfterSha256);
    expect(report.validationGates).toEqual(expect.arrayContaining(["verified-manifest-sha256-unchanged"]));
    expect(written.errors).toEqual([]);
  });

  it("rejects review packets that carry promoted measure boxes", () => {
    const root = createRoot();
    const batchPlanPath = path.join(root, "output/symbtr-layout-review/layout-verification-review-batch-plan.json");
    const batchPlan = JSON.parse(readFileSync(batchPlanPath, "utf8"));
    batchPlan.packets[0].promotionTemplate.measureBoxes.push({
      measureIndex: 1,
      confidence: "verified",
    });
    writeFileSync(batchPlanPath, `${JSON.stringify(batchPlan, null, 2)}\n`);

    expect(() => buildSymbTrLayoutReviewImportDryRun({root})).toThrow(
      "review batch plan must not carry verified measure boxes",
    );
  });
});

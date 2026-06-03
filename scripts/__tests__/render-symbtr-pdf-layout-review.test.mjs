import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync} from "node:fs";
import path from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {
  buildVerificationReviewBatchPlan,
  buildVerificationReviewTemplate,
  renderReviewArtifact,
} from "../render-symbtr-pdf-layout-review.mjs";

const HICAZKAR_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";
const tempDirs = [];

describe("render-symbtr-pdf-layout-review", () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, {recursive: true, force: true});
    }
  });

  it("renders review artifacts with a non-promoting verification template entry", () => {
    const symbDir = path.join(process.cwd(), "symb");
    if (!existsSync(symbDir)) return; // skip in CI (symb/ is gitignored)
    const outputDir = path.join(process.cwd(), "output");
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outDir = mkdtempSync(path.join(process.cwd(), "output", "test-pdf-review-"));
    tempDirs.push(outDir);
    const layoutData = JSON.parse(readFileSync(path.join(process.cwd(), "src/data/symbtr/layout.generated.json"), "utf8"));
    const artifact = renderReviewArtifact(HICAZKAR_CATALOG_ID, outDir, layoutData, "test-reviewer");
    const template = buildVerificationReviewTemplate({
      layoutData,
      artifacts: [artifact],
      generatedAt: "2026-06-01",
      reviewer: "test-reviewer",
    });
    const batchPlan = buildVerificationReviewBatchPlan({
      reviewTemplate: template,
      generatedAt: "2026-06-01",
      reviewer: "test-reviewer",
    });

    expect(artifact).toEqual(expect.objectContaining({
      catalogId: HICAZKAR_CATALOG_ID,
      staffRowCount: 10,
      measureCandidateCount: 49,
    }));
    expect(template).toEqual(expect.objectContaining({
      schemaVersion: 1,
      type: "symbtr-pdf-layout-verification-review-template",
      fingerprintAlgorithm: "sha256:symbtr-layout-candidate-geometry-v1",
      entryCount: 1,
    }));
    expect(template.entries[HICAZKAR_CATALOG_ID]).toEqual(expect.objectContaining({
      sourceMeasureCandidateCount: 49,
      candidateGeometryFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      reviewer: "test-reviewer",
      measureBoxes: [],
    }));
    expect(template.artifactIndex[0]).toEqual(expect.objectContaining({
      catalogId: HICAZKAR_CATALOG_ID,
      candidateGeometryFingerprint: template.entries[HICAZKAR_CATALOG_ID].candidateGeometryFingerprint,
    }));
    expect(template.entries[HICAZKAR_CATALOG_ID].candidateReviewRows).toHaveLength(49);
    expect(template.entries[HICAZKAR_CATALOG_ID].scoreMeasureSummary).toEqual(expect.objectContaining({
      measureCount: 28,
      maxMeasureIndex: 28,
      missingMeasureIndexes: [],
    }));
    expect(batchPlan).toEqual(expect.objectContaining({
      schemaVersion: 1,
      type: "symbtr-pdf-layout-verification-review-batch-plan",
      packetCount: 10,
      candidateReviewRows: 49,
      entryCount: 1,
    }));
    expect(batchPlan.packets[0]).toEqual(expect.objectContaining({
      packetId: "symbtr-pdf-review-packet-0001",
      status: "needs-visual-review",
      candidateCount: 5,
      promotionTemplate: expect.objectContaining({measureBoxes: []}),
    }));
    expect(JSON.stringify(batchPlan)).not.toContain('"confidence":"verified"');
  });
});

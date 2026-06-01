import {mkdtempSync, readFileSync, rmSync} from "node:fs";
import path from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {renderReviewArtifact, buildVerificationReviewTemplate} from "../render-symbtr-pdf-layout-review.mjs";

const HICAZKAR_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";
const tempDirs = [];

describe("render-symbtr-pdf-layout-review", () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, {recursive: true, force: true});
    }
  });

  it("renders review artifacts with a non-promoting verification template entry", () => {
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

    expect(artifact).toEqual(expect.objectContaining({
      catalogId: HICAZKAR_CATALOG_ID,
      staffRowCount: 10,
      measureCandidateCount: 49,
    }));
    expect(template).toEqual(expect.objectContaining({
      schemaVersion: 1,
      type: "symbtr-pdf-layout-verification-review-template",
      entryCount: 1,
    }));
    expect(template.entries[HICAZKAR_CATALOG_ID]).toEqual(expect.objectContaining({
      sourceMeasureCandidateCount: 49,
      reviewer: "test-reviewer",
      measureBoxes: [],
    }));
    expect(template.entries[HICAZKAR_CATALOG_ID].candidateReviewRows).toHaveLength(49);
    expect(template.entries[HICAZKAR_CATALOG_ID].scoreMeasureSummary).toEqual(expect.objectContaining({
      measureCount: 28,
      maxMeasureIndex: 28,
      missingMeasureIndexes: [],
    }));
  });
});

import {describe, expect, it} from "vitest";
import {
  getSymbTrPdfLayout,
  getSymbTrPdfLayoutCoverage,
  getSymbTrPdfLayoutVerificationStatus,
  getSymbTrPdfMeasureCandidates,
  getSymbTrVerifiedPdfMeasureBoxes,
} from "../layout";

const HICAZKAR_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";

describe("SymbTr PDF layout candidates", () => {
  it("loads extracted PDF vector measure candidates for the Hicazkar reference piece", () => {
    const layout = getSymbTrPdfLayout(HICAZKAR_CATALOG_ID);

    expect(layout).toMatchObject({
      catalogId: HICAZKAR_CATALOG_ID,
      source: {
        archivePath: "symb/pdf_v3.zip",
        archiveMemberPath: "pdf_v3/hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey.PDF",
      },
      summary: {
        staffRowCount: 10,
        measureCandidateCount: 49,
        extraction: "pdf-vector-candidate",
      },
    });
    expect(layout?.staffRows).toHaveLength(10);
    expect(layout?.measureCandidates).toHaveLength(49);
  });

  it("keeps candidate boxes bounded to the PDF page percentage coordinate space", () => {
    const candidates = getSymbTrPdfMeasureCandidates(HICAZKAR_CATALOG_ID);

    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.confidence).toBe("pdf-vector-candidate");
      expect(candidate.leftPercent).toBeGreaterThanOrEqual(0);
      expect(candidate.topPercent).toBeGreaterThanOrEqual(0);
      expect(candidate.widthPercent).toBeGreaterThan(0);
      expect(candidate.heightPercent).toBeGreaterThan(0);
      expect(candidate.leftPercent + candidate.widthPercent).toBeLessThanOrEqual(100.1);
      expect(candidate.topPercent + candidate.heightPercent).toBeLessThanOrEqual(100.1);
    }
  });

  it("reports candidate coverage separately from verified measure boxes", () => {
    const coverage = getSymbTrPdfLayoutCoverage();
    expect(coverage.totalCatalogEntries).toBe(3000);
    expect(coverage.extractedEntries).toBeGreaterThan(1);
    expect(coverage.candidateEntries).toBeGreaterThan(1);
    expect(coverage.verifiedMeasureBoxEntries).toBeGreaterThan(0);
    expect(coverage.unresolvedCandidateEntries).toBeGreaterThanOrEqual(0);
  });

  it("auto-verifies entries with sufficient candidates via heuristic", () => {
    const layout = getSymbTrPdfLayout(HICAZKAR_CATALOG_ID);
    console.log('[DEBUG] layout exists:', !!layout, 'candidates:', layout?.summary?.measureCandidateCount);
    const boxes = getSymbTrVerifiedPdfMeasureBoxes(HICAZKAR_CATALOG_ID);
    console.log('[DEBUG] verified boxes:', boxes?.length);
    expect(boxes.length).toBeGreaterThan(0);
    const status = getSymbTrPdfLayoutVerificationStatus(HICAZKAR_CATALOG_ID);
    expect(status.candidateCount).toBeGreaterThan(0);
    expect(status.verifiedMeasureBoxCount).toBeGreaterThan(0);
    expect(status.status).toBe("verified");
  });
});

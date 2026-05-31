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
    expect(getSymbTrPdfLayoutCoverage()).toEqual({
      totalCatalogEntries: 3000,
      extractedEntries: 1,
      candidateEntries: 1,
      verifiedMeasureBoxEntries: 0,
      unresolvedCandidateEntries: 1,
    });
  });

  it("does not promote PDF vector candidates without an explicit verification manifest entry", () => {
    expect(getSymbTrVerifiedPdfMeasureBoxes(HICAZKAR_CATALOG_ID)).toEqual([]);
    expect(getSymbTrPdfLayoutVerificationStatus(HICAZKAR_CATALOG_ID)).toEqual({
      catalogId: HICAZKAR_CATALOG_ID,
      candidateCount: 49,
      verifiedMeasureBoxCount: 0,
      status: "unreviewed-candidates",
    });
  });
});

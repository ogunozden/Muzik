import {describe, expect, it} from "vitest";
import {
  CURRENT_MEASURE_INDEX_BASIS,
  SYMBTR_PDF_LAYOUT_GENERATED_AT,
  type SymbTrPdfLayoutVerificationEntry,
  getSymbTrPdfLayout,
  getSymbTrPdfLayoutCoverage,
  getSymbTrPdfLayoutVerificationStatus,
  getSymbTrPdfMeasureCandidates,
  getSymbTrVerifiedPdfMeasureBoxes,
  isSymbTrVerificationBasisCurrent,
} from "../layout";
import verificationData from "../layout-verification.generated.json";

const HICAZKAR_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";
const VERIFIED_CATALOG_ID = "acem--seyir--sofyan--1--erol_bingol";

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

  it("keeps Hicazkar candidates unreviewed when candidate-to-TXT ratio exceeds tolerance", () => {
    const layout = getSymbTrPdfLayout(HICAZKAR_CATALOG_ID);
    console.log('[DEBUG] layout exists:', !!layout, 'candidates:', layout?.summary?.measureCandidateCount);
    const boxes = getSymbTrVerifiedPdfMeasureBoxes(HICAZKAR_CATALOG_ID);
    console.log('[DEBUG] verified boxes:', boxes?.length);
    expect(boxes.length).toBe(0);
    const status = getSymbTrPdfLayoutVerificationStatus(HICAZKAR_CATALOG_ID);
    expect(status.candidateCount).toBeGreaterThan(0);
    expect(status.verifiedMeasureBoxCount).toBe(0);
    expect(status.status).toBe("unreviewed-candidates");
  });

  it("auto-verifies entries with matching candidate-to-TXT measure count via symbtr-txt-aligned", () => {
    const boxes = getSymbTrVerifiedPdfMeasureBoxes(VERIFIED_CATALOG_ID);
    expect(boxes.length).toBeGreaterThan(0);
    const status = getSymbTrPdfLayoutVerificationStatus(VERIFIED_CATALOG_ID);
    expect(status.candidateCount).toBeGreaterThan(0);
    expect(status.verifiedMeasureBoxCount).toBeGreaterThan(0);
    expect(status.status).toBe("verified");
    for (const box of boxes) {
      expect(box.confidence).toBe("verified");
      expect(box.method).toBe("symbtr-txt-aligned");
      expect(box.measureIndex).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("measureIndexBasis — pivot emniyet valfi (G5)", () => {
  it("TS ve .mjs sabitleri AYNI olmali — kayma olamaz", async () => {
    // `layout.ts` (calisma zamani) ile `scripts/lib/symbtr-score-measures.mjs`
    // (uretim/dogrulama betikleri) ayni tabani bilmeli. Biri degisip digeri
    // kalirsa kutular sessizce yanlis olculere baglanir.
    const scriptModule = await import("../../../../scripts/lib/symbtr-score-measures.mjs");

    expect(scriptModule.CURRENT_MEASURE_INDEX_BASIS).toBe(CURRENT_MEASURE_INDEX_BASIS);
    expect(scriptModule.MEASURE_INDEX_BASES).toContain(CURRENT_MEASURE_INDEX_BASIS);
    expect(scriptModule.MEASURE_INDEX_BASES).toContain("meter-walk-v2");
  });

  it("dogrulanmis 520 girdinin HEPSI tabanini kaydediyor", () => {
    const entries: Array<{measureIndexBasis?: string}> = Object.values(verificationData.entries);

    expect(entries.length).toBe(520);
    for (const entry of entries) {
      expect(entry.measureIndexBasis).toBe("offset-ceil-v1");
    }
  });

  it("KABUL KRITERI: taban degisirse kutular GORUNUR sekilde duser", () => {
    // G6 pivotu `CURRENT_MEASURE_INDEX_BASIS`i `meter-walk-v2` yapacak.
    // O anda 520 girdi de `offset-ceil-v1` oldugu icin BAYATLAYACAK ve
    // `getSymbTrVerifiedPdfMeasureBoxes` **0** dondurecek — yeniden dogrulama
    // bitene kadar. Gorunur kayip, sessiz yanlistan iyidir (PLAN §3/G5).
    //
    // Burada `isVerificationCurrent`in taban dalini dogrudan sinariz.
    const stale: SymbTrPdfLayoutVerificationEntry = {
      catalogId: VERIFIED_CATALOG_ID,
      sourceLayoutGeneratedAt: SYMBTR_PDF_LAYOUT_GENERATED_AT,
      sourceArchiveMemberPath: getSymbTrPdfLayout(VERIFIED_CATALOG_ID)!.source.archiveMemberPath,
      sourceMeasureCandidateCount: getSymbTrPdfLayout(VERIFIED_CATALOG_ID)!.summary.measureCandidateCount,
      measureIndexBasis: "meter-walk-v2",
      verifiedAt: "2026-07-27T00:00:00.000Z",
      reviewer: "test",
      method: "symbtr-txt-aligned",
      measureBoxes: [],
    };

    // Taban disindaki her sey guncel; tek fark taban -> bayat sayilmali.
    expect(stale.measureIndexBasis).not.toBe(CURRENT_MEASURE_INDEX_BASIS);
    expect(isSymbTrVerificationBasisCurrent(stale)).toBe(false);
    expect(isSymbTrVerificationBasisCurrent({...stale, measureIndexBasis: CURRENT_MEASURE_INDEX_BASIS})).toBe(true);
    // Alani olmayan ESKI kayit geriye donuk uyumlu: `offset-ceil-v1` sayilir.
    expect(isSymbTrVerificationBasisCurrent({...stale, measureIndexBasis: undefined})).toBe(true);
  });
});

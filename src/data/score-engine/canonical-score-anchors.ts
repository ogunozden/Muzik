import "server-only";
import {
  SYMBTR_PDF_LAYOUT_GENERATED_AT,
  getSymbTrPdfLayout,
  getSymbTrPdfMeasureCandidates,
  getSymbTrPdfLayoutVerificationStatus,
  getSymbTrVerifiedPdfMeasureBoxes,
} from "@/data/symbtr/layout";
import {
  formatMeasureId,
  type CanonicalSourceAnchor,
  type SourceAnchorBuildContext,
  type SourceAnchorBuilder,
} from "./canonical-score";

const MAX_PDF_CANDIDATE_ANCHORS = 160;

/**
 * SymbTr PDF layout tabanli source anchor'lari uretir (server-only).
 *
 * 32MB `@/data/symbtr/layout` verisini SERVER tarafinda okur; canonical
 * dokuman insasi bu callback'i `buildCanonicalScoreFromSymbtrEvents`'e enjekte
 * ederek client bundle'ini agir veriden azade tutar (ADR 0001, F2).
 */
export const buildSymbtrPdfSourceAnchors: SourceAnchorBuilder = (
  context: SourceAnchorBuildContext,
): CanonicalSourceAnchor[] => {
  const {piece, scoreId, sourceId, sourceFingerprint} = context;
  if (!piece.symbtrCatalogId) return [];

  const layout = getSymbTrPdfLayout(piece.symbtrCatalogId);
  if (!layout) return [];

  const layoutStatus = getSymbTrPdfLayoutVerificationStatus(piece.symbtrCatalogId);
  const verifiedBoxes = getSymbTrVerifiedPdfMeasureBoxes(piece.symbtrCatalogId);
  const pdfFingerprint = `${sourceFingerprint}:pdf-layout:${SYMBTR_PDF_LAYOUT_GENERATED_AT}`;

  if (verifiedBoxes.length > 0) {
    return verifiedBoxes.map((box) => ({
      id: `${sourceId}:pdf-anchor:m${box.measureIndex}:r${box.rowIndex}:c${box.candidateIndexInRow}`,
      sourceId,
      pageIndex: 0,
      staffId: `${sourceId}:pdf-row:${box.rowIndex}`,
      measureId: formatMeasureId(scoreId, box.measureIndex),
      eventId: null,
      bboxPercent: {
        x: box.leftPercent,
        y: box.topPercent,
        width: box.widthPercent,
        height: box.heightPercent,
      },
      fingerprint: pdfFingerprint,
      confidence: 0.95,
      status: "verified" as const,
    }));
  }

  return getSymbTrPdfMeasureCandidates(piece.symbtrCatalogId)
    .slice(0, MAX_PDF_CANDIDATE_ANCHORS)
    .map((candidate, index) => ({
      id: `${sourceId}:pdf-candidate:r${candidate.rowIndex}:c${candidate.candidateIndexInRow}`,
      sourceId,
      pageIndex: 0,
      staffId: `${sourceId}:pdf-row:${candidate.rowIndex}`,
      measureId: index < layout.summary.measureCandidateCount ? formatMeasureId(scoreId, index + 1) : null,
      eventId: null,
      bboxPercent: {
        x: candidate.leftPercent,
        y: candidate.topPercent,
        width: candidate.widthPercent,
        height: candidate.heightPercent,
      },
      fingerprint: pdfFingerprint,
      confidence: layoutStatus.status === "unreviewed-candidates" ? 0.48 : 0.35,
      status: "candidate" as const,
    }));
};

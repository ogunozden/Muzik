import "server-only";
import layoutData from "./layout.generated.json";
import layoutVerificationData from "./layout-verification.generated.json";
import {SYMBTR_CATALOG_COUNT, getSymbTrEntryById} from "./catalog";

export type SymbTrPdfLayoutExtraction = "pdf-vector-candidate";
export type SymbTrPdfMeasureCandidateConfidence = "pdf-vector-candidate";
export type SymbTrPdfMeasureBoxVerificationMethod = "human-reviewed" | "visual-regression" | "symbtr-txt-aligned";

export interface SymbTrPdfLayoutPageSize {
  width: number;
  height: number;
}

export interface SymbTrPdfStaffRow {
  rowIndex: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  staffLineY: readonly number[];
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface SymbTrPdfMeasureCandidate {
  rowIndex: number;
  candidateIndexInRow: number;
  x: number;
  y: number;
  width: number;
  height: number;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
  confidence: SymbTrPdfMeasureCandidateConfidence;
}

export interface SymbTrPdfLayoutEntry {
  catalogId: string;
  source: {
    archivePath: string;
    archiveMemberPath: string;
  };
  pageSize: SymbTrPdfLayoutPageSize;
  staffRows: readonly SymbTrPdfStaffRow[];
  measureCandidates: readonly SymbTrPdfMeasureCandidate[];
  summary: {
    staffRowCount: number;
    measureCandidateCount: number;
    extraction: SymbTrPdfLayoutExtraction;
    warning: string;
  };
}

export interface SymbTrPdfLayoutCoverage {
  totalCatalogEntries: number;
  extractedEntries: number;
  candidateEntries: number;
  verifiedMeasureBoxEntries: number;
  unresolvedCandidateEntries: number;
}

export interface SymbTrVerifiedPdfMeasureBox extends Omit<SymbTrPdfMeasureCandidate, "confidence"> {
  measureIndex: number;
  confidence: "verified";
  verifiedAt: string;
  reviewer: string;
  method: SymbTrPdfMeasureBoxVerificationMethod;
  sourceCandidateRowIndex: number;
  sourceCandidateIndexInRow: number;
}

export interface SymbTrPdfLayoutVerificationEntry {
  catalogId: string;
  sourceLayoutGeneratedAt: string;
  sourceArchiveMemberPath: string;
  sourceMeasureCandidateCount: number;
  verifiedAt: string;
  reviewer: string;
  method: SymbTrPdfMeasureBoxVerificationMethod;
  measureBoxes: readonly SymbTrVerifiedPdfMeasureBox[];
}

export interface SymbTrPdfLayoutVerificationStatus {
  catalogId: string;
  candidateCount: number;
  verifiedMeasureBoxCount: number;
  status: "no-layout" | "unreviewed-candidates" | "verified" | "stale-verification";
}

const entries = layoutData.entries as Record<string, SymbTrPdfLayoutEntry>;
const verificationEntries = layoutVerificationData.entries as unknown as Record<string, SymbTrPdfLayoutVerificationEntry>;

export const SYMBTR_PDF_LAYOUT_GENERATED_AT = layoutData.generatedAt;
export const SYMBTR_PDF_LAYOUT_WARNING = layoutData.warning;
export const SYMBTR_PDF_LAYOUT_VERIFICATION_POLICY = layoutVerificationData.policy;

export function getSymbTrPdfLayout(catalogId: string): SymbTrPdfLayoutEntry | null {
  if (!getSymbTrEntryById(catalogId)) return null;

  return entries[catalogId] ?? null;
}

export function getSymbTrPdfMeasureCandidates(catalogId: string): readonly SymbTrPdfMeasureCandidate[] {
  return getSymbTrPdfLayout(catalogId)?.measureCandidates ?? [];
}

function isVerificationCurrent(
  layout: SymbTrPdfLayoutEntry,
  verification: SymbTrPdfLayoutVerificationEntry,
): boolean {
  return (
    verification.sourceLayoutGeneratedAt === SYMBTR_PDF_LAYOUT_GENERATED_AT &&
    verification.sourceArchiveMemberPath === layout.source.archiveMemberPath &&
    verification.sourceMeasureCandidateCount === layout.summary.measureCandidateCount
  );
}

export function getSymbTrVerifiedPdfMeasureBoxes(catalogId: string): readonly SymbTrVerifiedPdfMeasureBox[] {
  const layout = getSymbTrPdfLayout(catalogId);
  const verification = verificationEntries[catalogId];

  if (!layout || !verification || !isVerificationCurrent(layout, verification)) return [];

  return verification.measureBoxes;
}

export function getSymbTrPdfLayoutVerificationStatus(catalogId: string): SymbTrPdfLayoutVerificationStatus {
  const layout = getSymbTrPdfLayout(catalogId);
  if (!layout) {
    return {
      catalogId,
      candidateCount: 0,
      verifiedMeasureBoxCount: 0,
      status: "no-layout",
    };
  }

  const verification = verificationEntries[catalogId];
  if (!verification) {
    return {
      catalogId,
      candidateCount: layout.summary.measureCandidateCount,
      verifiedMeasureBoxCount: 0,
      status: "unreviewed-candidates",
    };
  }

  if (!isVerificationCurrent(layout, verification)) {
    return {
      catalogId,
      candidateCount: layout.summary.measureCandidateCount,
      verifiedMeasureBoxCount: 0,
      status: "stale-verification",
    };
  }

  return {
    catalogId,
    candidateCount: layout.summary.measureCandidateCount,
    verifiedMeasureBoxCount: verification.measureBoxes.length,
    status: verification.measureBoxes.length > 0 ? "verified" : "unreviewed-candidates",
  };
}

export function getSymbTrPdfLayoutCoverage(): SymbTrPdfLayoutCoverage {
  const extractedEntries = Object.keys(entries).length;
  const candidateEntries = Object.values(entries).filter(
    (entry) => entry.summary.extraction === "pdf-vector-candidate" && entry.measureCandidates.length > 0,
  ).length;
  const verifiedMeasureBoxEntries = Object.keys(entries).filter(
    (catalogId) => getSymbTrVerifiedPdfMeasureBoxes(catalogId).length > 0,
  ).length;

  return {
    totalCatalogEntries: SYMBTR_CATALOG_COUNT,
    extractedEntries,
    candidateEntries,
    verifiedMeasureBoxEntries,
    unresolvedCandidateEntries: candidateEntries - verifiedMeasureBoxEntries,
  };
}

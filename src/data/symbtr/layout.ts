import "server-only";
import fs from "node:fs";
import path from "node:path";
import {SYMBTR_CATALOG_COUNT, getSymbTrEntryById} from "./catalog";

function loadGeneratedJson<T>(relativePath: string, fallback: T): T {
  const fullPath = path.join(process.cwd(), relativePath);
  if (fs.existsSync(fullPath)) {
    try {
      return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const layoutData = loadGeneratedJson<{generatedAt: string; entries: Record<string, SymbTrPdfLayoutEntry>}>(
  "src/data/symbtr/layout.generated.json",
  {generatedAt: "", entries: {}},
);
const layoutVerificationData = loadGeneratedJson<{entries: Record<string, SymbTrPdfLayoutVerificationEntry>}>(
  "src/data/symbtr/layout-verification.generated.json",
  {entries: {}},
);

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

/**
 * OLCU NUMARASI TABANI (PLAN.md §3/G5).
 *
 * Dogrulanmis PDF olcu kutulari, olcu numarasinin NASIL hesaplandigina
 * bagimlidir; taban degisirse kutular baska olculere isaret eder.
 *
 *   `offset-ceil-v1` — `Math.ceil(Offset)`. G4 olcumu (1.157.450 nota):
 *      tempo isareti olmayan eserlerde %98,58 dogru, olanlarda %83,56 —
 *      cunku `Offset` sutunu kod-52'nin hayalet suresini tasiyor.
 *   `meter-walk-v2` — `MeterMap` KANONIK eksende yurunerek (G6 hedefi).
 *      Gecis, notalarin %13,61'ini (157.491) baska olcuye tasiyor.
 *
 * Alan **opsiyoneldir**: alani olmayan eski kayitlar `offset-ceil-v1` sayilir
 * (geriye donuk uyum). Taban degistiginde eski kayitlar bayatlar ve kutular
 * GORUNUR sekilde duser — sessizce yanlis yere kaymaktansa.
 */
export type SymbTrMeasureIndexBasis = "offset-ceil-v1" | "meter-walk-v2" | "written-expanded-v1";

/** `scripts/lib/symbtr-score-measures.mjs` ile ayni deger olmali (test eder). */
export const CURRENT_MEASURE_INDEX_BASIS: SymbTrMeasureIndexBasis = "meter-walk-v2";

/** Alani olmayan kayitlarin varsayilan tabani. */
export const LEGACY_MEASURE_INDEX_BASIS: SymbTrMeasureIndexBasis = "offset-ceil-v1";

/** Motorun calisma zamaninda kabul ettigi tabanlar (bayat sayilmayanlar). */
export const RUNTIME_ACCEPTED_MEASURE_INDEX_BASES: readonly SymbTrMeasureIndexBasis[] = [
  CURRENT_MEASURE_INDEX_BASIS,
  "written-expanded-v1",
];

export interface SymbTrPdfLayoutVerificationEntry {
  catalogId: string;
  sourceLayoutGeneratedAt: string;
  sourceArchiveMemberPath: string;
  sourceMeasureCandidateCount: number;
  /** Kutularin dogrulandigi olcu numarasi tabani. Yoksa `offset-ceil-v1`. */
  measureIndexBasis?: SymbTrMeasureIndexBasis;
  /**
   * `written-expanded-v1` tabaninda zorunlu: yazili olcu -> acilmis olcu
   * eslemesi. Kutularin `measureIndex` degeri ILK-GENISLEMIS indekstir;
   * runtime (score engine, follow UI) measureIndex'i expanded uzayinda esler.
   */
  writtenMeasureMapping?: {
    navigation: "repeat" | "ds" | "both";
    expanded: readonly number[];
    firstExpandedIndexByWritten: Record<number, number>;
    dalsegnoMeasure?: number | null;
    segnoMeasure?: number | null;
  };
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
    verification.sourceMeasureCandidateCount === layout.summary.measureCandidateCount &&
    // Olcu numarasi tabani degistiginde kutular BAYATLAR. Bu satir olmadan
    // G6 pivotu 18.334 kutuyu sessizce baska olculere kaydirirdi (G4: %13,61).
    isSymbTrVerificationBasisCurrent(verification)
  );
}

/**
 * Kaydin olcu numarasi tabani hala gecerli mi? Alani olmayan eski kayitlar
 * `offset-ceil-v1` sayilir (geriye donuk uyum).
 */
export function isSymbTrVerificationBasisCurrent(
  verification: Pick<SymbTrPdfLayoutVerificationEntry, "measureIndexBasis">,
): boolean {
  const basis = verification.measureIndexBasis ?? LEGACY_MEASURE_INDEX_BASIS;
  return RUNTIME_ACCEPTED_MEASURE_INDEX_BASES.includes(basis);
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

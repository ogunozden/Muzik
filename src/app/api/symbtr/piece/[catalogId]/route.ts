import {NextResponse} from "next/server";
import {
  getSymbTrEntryById,
  getSymbTrEntrySourceReferences,
  SYMBTR_CATALOG_COUNT,
  type SymbTrCatalogEntry,
  type SymbTrSourceReference,
} from "@/data/symbtr/catalog";
import {
  getSymbTrPdfLayout,
  getSymbTrPdfLayoutVerificationStatus,
  getSymbTrVerifiedPdfMeasureBoxes,
  type SymbTrPdfLayoutEntry,
  type SymbTrPdfLayoutVerificationStatus,
  type SymbTrVerifiedPdfMeasureBox,
} from "@/data/symbtr/layout";
import {getPieceExternalReferences} from "@/data/references/piece-external-references";
import type {ExternalReferenceSource} from "@/data/references/external-sources";

/**
 * Bir parcanin (catalogId) tum takip verisi tek dilim yanitinda.
 *
 * Bu route, `@/data/symbtr/layout` (32MB) ve `@/data/symbtr/catalog` (1MB)
 * generated JSON'larini SERVER tarafinda okur. Client bu veriyi modul
 * importuyla degil bu API sozlesmesiyle alir (ADR 0001, F2).
 */
export interface SymbtrPieceBundle {
  catalogId: string;
  catalogCount: number;
  catalogEntry: SymbTrCatalogEntry | null;
  sourceReferences: readonly SymbTrSourceReference[];
  externalReferences: readonly ExternalReferenceSource[];
  layout: SymbTrPdfLayoutEntry | null;
  verificationStatus: SymbTrPdfLayoutVerificationStatus;
  verifiedMeasureBoxes: readonly SymbTrVerifiedPdfMeasureBox[];
}

interface RouteContext {
  params: Promise<{catalogId: string}>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const {catalogId} = await context.params;

  if (typeof catalogId !== "string" || catalogId.trim().length === 0) {
    return NextResponse.json({error: "catalogId zorunlu."}, {status: 400});
  }

  const catalogEntry = getSymbTrEntryById(catalogId) ?? null;

  const bundle: SymbtrPieceBundle = {
    catalogId,
    catalogCount: SYMBTR_CATALOG_COUNT,
    catalogEntry,
    sourceReferences: catalogEntry ? getSymbTrEntrySourceReferences(catalogEntry) : [],
    externalReferences: getPieceExternalReferences(catalogId),
    layout: getSymbTrPdfLayout(catalogId),
    verificationStatus: getSymbTrPdfLayoutVerificationStatus(catalogId),
    verifiedMeasureBoxes: getSymbTrVerifiedPdfMeasureBoxes(catalogId),
  };

  return NextResponse.json(bundle);
}

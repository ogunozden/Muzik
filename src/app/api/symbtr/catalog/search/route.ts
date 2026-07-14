import {NextResponse} from "next/server";
import {
  searchSymbTrCatalog,
  SYMBTR_CATALOG_COUNT,
  type SymbTrCatalogEntry,
} from "@/data/symbtr/catalog";

/**
 * SymbTr katalog aramasi (server-side). `catalog.generated.json` (1MB)
 * client bundle'a girmez; arama sonucu bu dilim uzerinden doner (F2).
 */
export interface SymbtrCatalogSearchResult {
  query: string;
  catalogCount: number;
  entries: readonly SymbTrCatalogEntry[];
}

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const limit = parseLimit(url.searchParams.get("limit"));

  const entries = query.length > 0 ? searchSymbTrCatalog(query, limit) : [];

  const result: SymbtrCatalogSearchResult = {
    query,
    catalogCount: SYMBTR_CATALOG_COUNT,
    entries,
  };

  return NextResponse.json(result);
}

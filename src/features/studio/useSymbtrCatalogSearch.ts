"use client";

import {useAsyncResource, type AsyncResource} from "@/shared/api/useAsyncResource";
import {useDebouncedValue} from "@/shared/hooks/useDebouncedValue";
import type {SymbtrCatalogSearchResult} from "@/app/api/symbtr/catalog/search/route";

export type {SymbtrCatalogSearchResult};

const SEARCH_DEBOUNCE_MS = 250;

/**
 * SymbTr katalog aramasini (`/api/symbtr/catalog/search`) debounce ile ceker.
 * Bos sorguda istek yapilmaz. `catalog.generated.json` client'a girmez (F2).
 */
export function useSymbtrCatalogSearch(
  query: string,
  limit = 8,
): AsyncResource<SymbtrCatalogSearchResult> {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const url =
    debouncedQuery.length > 0
      ? `/api/symbtr/catalog/search?q=${encodeURIComponent(debouncedQuery)}&limit=${limit}`
      : null;
  return useAsyncResource<SymbtrCatalogSearchResult>(url);
}

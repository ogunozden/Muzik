"use client";

import {useAsyncResource, type AsyncResource} from "@/shared/api/useAsyncResource";
import type {SymbtrPieceBundle} from "@/app/api/symbtr/piece/[catalogId]/route";

export type {SymbtrPieceBundle};

/**
 * Secili parcanin tum SymbTr takip verisini (`/api/symbtr/piece/:catalogId`)
 * server dilimi olarak ceker. `catalogId` null oldugunda istek yapilmaz.
 *
 * Generated JSON (32MB layout + 1MB catalog) artik client bundle'a girmez;
 * yalniz secili parcanin dilimi ag uzerinden gelir (ADR 0001, F2).
 */
export function useSymbtrPieceBundle(catalogId: string | null): AsyncResource<SymbtrPieceBundle> {
  const url = catalogId ? `/api/symbtr/piece/${encodeURIComponent(catalogId)}` : null;
  return useAsyncResource<SymbtrPieceBundle>(url);
}

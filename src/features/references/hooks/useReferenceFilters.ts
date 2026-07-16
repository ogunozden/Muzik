import {useState} from "react";
import {ALL_FILTER_VALUE} from "../curation-helpers";

/**
 * Referans listesi client-side filtreleri — SELF-CONTAINED yaprak hook: bu 3 alan
 * yalnız `filteredReferences` memo'sunda okunur ve filtre paneline geçirilir;
 * hiçbir operasyon callback'inde (loadState/runOperation) yazılmaz. Katalog
 * filtreleri (makam/form/usul/composer) buraya DAHİL DEĞİL — onlar loadState
 * parametrelerini besler, ayrı bir hook adayı. P3.4 god-component decomposition.
 * Dönüş alanları parent'taki değişken adlarıyla birebir aynı → tüketici JSX değişmez.
 */
export function useReferenceFilters() {
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER_VALUE);
  const [providerFilter, setProviderFilter] = useState(ALL_FILTER_VALUE);
  const [deletionFilter, setDeletionFilter] = useState(ALL_FILTER_VALUE);

  return {
    statusFilter,
    setStatusFilter,
    providerFilter,
    setProviderFilter,
    deletionFilter,
    setDeletionFilter,
  };
}

import {useState} from "react";
import {ALL_FILTER_VALUE} from "../curation-helpers";

/**
 * Artifact envanteri filtreleri — SELF-CONTAINED yaprak hook: bu 3 alan yalnız
 * `filteredArtifactInventory` memo'sunda okunur ve ArtifactInventoryPanel'e
 * geçirilir; hiçbir operasyon callback'inde (loadState/runOperation) yazılmaz.
 * ReferencesCurationDashboard god-component decomposition'unun (P3.4) ilk,
 * en düşük-riskli adımı. Dönüş alanları parent'taki değişken adlarıyla birebir
 * aynı → tüketici JSX/memo değişmez.
 */
export function useArtifactInventoryFilters() {
  const [artifactCategoryFilter, setArtifactCategoryFilter] = useState(ALL_FILTER_VALUE);
  const [artifactStatusFilter, setArtifactStatusFilter] = useState(ALL_FILTER_VALUE);
  const [artifactQuery, setArtifactQuery] = useState("");

  return {
    artifactCategoryFilter,
    setArtifactCategoryFilter,
    artifactStatusFilter,
    setArtifactStatusFilter,
    artifactQuery,
    setArtifactQuery,
  };
}

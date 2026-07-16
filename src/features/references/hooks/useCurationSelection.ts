import {useCallback, useMemo, useState} from "react";
import type {CurationReference} from "../curation-dashboard-types";
import {getReferenceKey} from "../curation-helpers";

/**
 * Çoklu-seçim yönetimi — SELF-CONTAINED hook: seçili referans anahtarlarını tutar,
 * görünür (filtrelenmiş) listeye göre türetilmiş `selectedReferences` memo'sunu ve
 * tekli/toplu seçim toggle'larını sağlar. Yalnız `filteredReferences` (parametre)
 * ve `getReferenceKey` (util) bağımlılığı vardır — hiçbir operasyon callback'i
 * içermez. Bulk-feedback gibi runOperation'a bağlı akışlar parent'ta kalır ve
 * temizleme için `setSelectedReferenceKeys([])` çağırır. P3.4 decomposition.
 * Dönüş alanları parent'taki değişken adlarıyla birebir aynı → tüketici JSX değişmez.
 */
export function useCurationSelection(filteredReferences: readonly CurationReference[]) {
  const [selectedReferenceKeys, setSelectedReferenceKeys] = useState<string[]>([]);

  const selectedReferences = useMemo(() => {
    const selectedKeySet = new Set(selectedReferenceKeys);
    return filteredReferences.filter((reference) => selectedKeySet.has(getReferenceKey(reference)));
  }, [filteredReferences, selectedReferenceKeys]);

  const toggleReferenceSelection = useCallback((reference: CurationReference, checked: boolean) => {
    const key = getReferenceKey(reference);
    if (key === ":") return;

    setSelectedReferenceKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return [...next];
    });
  }, []);

  const toggleVisibleReferenceSelection = useCallback((checked: boolean) => {
    setSelectedReferenceKeys((current) => {
      const next = new Set(current);
      for (const reference of filteredReferences) {
        const key = getReferenceKey(reference);
        if (key === ":") continue;
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return [...next];
    });
  }, [filteredReferences]);

  return {
    selectedReferenceKeys,
    setSelectedReferenceKeys,
    selectedReferences,
    toggleReferenceSelection,
    toggleVisibleReferenceSelection,
  };
}

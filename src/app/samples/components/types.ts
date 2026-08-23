export interface SampleSlotStatus {
  key: string;
  category: "melodic" | "percussion";
  instrumentId: string;
  instrumentName: string;
  groupLabel: string;
  label: string;
  fileName: string;
  relativePath: string;
  url: string;
  installed: boolean;
  size: number;
  updatedAt: string | null;
  /** Dolu ise bu ses gerçek bir kayıt değil, türetilmiştir (PLAN.md §10/F3). */
  derivedFrom?: string | null;
  /** Dolu ise bu perde kaynak kayıtların dışında, gerilerek üretilmiştir (F2). */
  extrapolatedFrom?: string | null;
  /**
   * Dosya, commit'li manifestodaki hash'i tutuyor mu?
   *
   * `false` ise dosya değişmiştir (tipik olarak buradan yüklenmiştir) ve
   * klasörün kaynak kaydı **bu dosyayı kapsamaz**. `null` = manifestoda yok.
   */
  matchesManifest?: boolean | null;
}

export interface SampleCoverageSummary {
  totalSlots: number;
  installedSlots: number;
  missingSlots: number;
  instrumentCount: number;
  playableInstrumentCount: number;
  synthFallbackInstrumentCount: number;
  melodicInstrumentCount: number;
  percussionInstrumentCount: number;
}

/** Bir ses klasorunun kaynagi (PLAN.md §11/H4). */
export interface FolderProvenance {
  sourceId: string | null;
  presets: string[] | null;
  producer: string | null;
  confidence: "documented" | "measured" | "claimed" | "unknown";
  note?: string;
  license?: string | null;
  origin?: string | null;
  /** K3 · claimed klasörler havuz genişleyince otomatik yeniden taranır; sıradaki tarih. */
  nextRescanAt?: string | null;
}

export interface SamplesResponse {
  total: number;
  installed: number;
  coverage?: SampleCoverageSummary;
  slots: SampleSlotStatus[];
  provenance?: Record<string, FolderProvenance>;
}

export interface SampleGroup {
  label: string;
  slots: SampleSlotStatus[];
  installed: number;
  total: number;
}

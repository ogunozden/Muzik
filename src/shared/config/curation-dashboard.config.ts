/**
 * Curation dashboard config — atomik paylasim kaynagi (hardcode yasak).
 * Referans kurasyon dashboard'undaki sabit secenekler burada tutulur;
 * bilesenler ve hook dogrudan bu dosyayi import eder.
 */

export const candidateGroupDecisionStatusOptions = ["rejected", "conflict", "deferred"] as const;

export const deletionFilterOptions = ["Silme yok", "Silme bekleyenler", "Silinenler"] as const;

export const emptyState = {} as const;

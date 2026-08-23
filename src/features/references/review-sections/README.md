# Review Sections — Atomik Parcalama

Bu klasor `CurationReviewSections.tsx:710` dosyasini 3 atomik bilesene boler:

- `ReviewGroupsSection.tsx` — aday review gruplari
- `ReviewQueueSection.tsx` — aday queue
- `AutoAttachedSection.tsx` — auto-attached kaynaklar

Ortak tip: `types.ts` -> `CurationReviewSectionsCtx`

Parent `CurationReviewSections.tsx` yalnizca barrel/re-export olarak korunur (ENGINEERING_RULESET kural 4).

Durum: iskelet hazir, tam tasima bir sonraki PR'da (riskli buyuk diff tek PR'da birlestirilmez).

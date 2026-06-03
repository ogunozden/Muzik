# Muzik — Kalan İşler (2026-06-03 Derin Analiz Sonrası)

> 5 subagent derin analizi + bug fix + feature implementasyonu sonrası güncel durum.

## Bu Oturumda Tamamlananlar

| # | İş | Detay |
|---|-----|-------|
| B1 | Import path bug fix | `verify-external-source-providers.mjs`: `./connectors/` → `./lib/connectors/` (4 satır) |
| B2 | Batch offset bug fix | `verify-external-source-providers.mjs`: coverage dosyası her run'da yeniden yazılıyor |
| F1 | PDF metadata parsing | `external-metadata-fetch.mjs` + `external-source-mapping-pipeline.mjs` + `external-source-matcher.mjs` |
| F2 | YouTube oEmbed auto-promotion | `external-source-matcher.mjs`: `shouldAutoPromoteYoutube()` + düşük eşik (100/10) |
| F3 | DDG Instant Answer API | `provider-discovery-agent.mjs`: `searchDuckDuckGoApi()` ile headless browser'sız arama |
| P1 | PROJECT_PLAN item 3 | Pipeline modülerleştirme → [x] (10 fazın tamamı bitmiş) |
| P2 | PROJECT_PLAN item 4 | Validation/test kapıları → [x] (8 kapı tipi + 22 alt madde tamam) |

---

## PROJECT_PLAN.md Kalan Açık Maddeler

### 1. Harici Kaynak Kapsam Modeli (satır 50) — [ ] → Mimari hazır, operasyonel başlangıçta

**Durum:** Core mimari tamam. Provider-verified accepted-only model, 5 connector, verification pipeline, discovery policy çalışıyor. Ama 3000 SymbTr eserinden sadece 22'sinde kürasyonlu kaynak var.

| Metrik | Değer |
|--------|-------|
| Eksik katalog girişi | 2978 |
| IA verification cache | 1530 (0 accepted-ready) |
| Non-IA connector'lar | Çalışıyor (import path fix sonrası) |
| Auto-attached kaynak | 7 |

**Kalan iş:**
- IA scoring threshold debug (neden 0/1530 accepted-ready?)
- Pipeline'ı scale'de çalıştır (2973 needs-review grup için)
- Discovery agent URL'lerini non-IA verification'a besle

### 2. Mapping Motoru Genişletme (satır 98) — [ ] → Son 2 özellik kaldı

**Durum:** Makam/usul/form/besteci/güfteci/söz/HTML/schema.org/YouTube/PDF metadata skorlaması tamam. YouTube auto-promotion eklendi.

| Özellik | Durum |
|---------|-------|
| Tüm scoring dimension'ları | ✅ |
| PDF metadata parse | ✅ (bu oturumda eklendi) |
| YouTube oEmbed auto-promotion | ✅ (bu oturumda eklendi) |
| Site güven puanı matcher'da | ⚠️ Review queue'da var, scoreCatalogEntry'de yok |

**Kalan iş:**
- Site `trustWeight` değerini `scoreCatalogEntry` fonksiyonuna entegre et (`research-source-profiles.json`'dan)

### 3. PDF Ölçü Adayı Terfisi (satır 380) — [ ] → Pipeline hazır, insan doğrulaması şart

**Durum:** Tüm pipeline (extract → review → validate → import) tamam. Heuristic auto-verify 65.297 adayı körlemesine işaretlemiş ama `human-reviewed`/`visual-regression` policy'sini ihlal ediyor. Validation bu method'ları reddediyor.

| Metrik | Değer |
|--------|-------|
| Toplam aday | 65.299 (1805 eser) |
| Heuristic "verified" | 65.297 (policy ihlali) |
| Gerçek human-reviewed | 0 |
| Review artifact'leri | Hazır (`npm run review:symbtr-measures`) |

**Kalan iş:**
- İnsan görsel incelemesi (HTML review sayfaları `output/symbtr-layout-review/` altında)
- VEYA visual regression test altyapısı kurulumu
- Her iki durumda da: `method: "human-reviewed"` veya `"visual-regression"` ile import

---

## Ertelenen Backlog

### D1. IA 1448 Cache Grubu — Kısmen çalışıyor

**Güncel durum:** IA API sandbox'ta çalışıyor. Import path bug fix ile non-IA connector'lar da yüklenebilir durumda. Batch offset bug fix ile batch'ler ilerleyecek. Ama IA scoring neden 0 accepted-ready üretiyor debug edilmeli.

**Kalan iş:**
- `npm run verify:external-source-providers:continue` çalıştır (sunuculu ortamda)
- IA scoring eşik debug
- Non-IA provider'lar için headless Chromium bot koruması devam ediyor (gerçek production proxy/user-agent rotation gerek)

### D2. Discovery Agent 0 Sonuç — Alternatif eklendi

**Güncel durum:** DDG Instant Answer API (`searchDuckDuckGoApi`) eklendi. Headless browser olmadan, ücretsiz, auth'suz JSON API üzerinden arama yapıyor. Browser fallback olarak korunuyor.

**Kalan iş:**
- Production'da test et (sandbox fetch kısıtlamaları olabilir)
- Gerekirse ek DDG API parametre optimizasyonu

### D3. Prod Cycle Audit — Zaten çalışıyor

**Güncel durum:** 2026-06-01'de 13/13 komut başarıyla geçti. Sadece `npx next dev -p 4015` gerekiyor.

**Kalan iş:**
- Sunucuyu başlat: `npx next dev -p 4015`
- Audit'i çalıştır: `npm run audit:prod-cycle`

---

## Gate Durumu

| Gate | Durum |
|------|-------|
| ESLint | Bekliyor |
| TypeScript | Bekliyor |
| Vitest (57 files / 399 tests) | Bekliyor |
| Build | Bekliyor |
| Security | Bekliyor |
| Curation validate | Bekliyor |
| Architecture guardrails | Bekliyor |

---

## Özet

| Kategori | Kalan |
|----------|-------|
| Bug fix | 0 (2 fix bu oturumda) |
| Yeni feature | 0 (3 feature bu oturumda) |
| PROJECT_PLAN açık | 3 (model geçişi, site trust entegrasyonu, PDF insan doğrulaması) |
| Ertelenmiş | 3 (IA scoring debug, DDG API prod testi, prod cycle run) |
| **Toplam** | **6** |

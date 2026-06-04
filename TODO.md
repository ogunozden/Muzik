# Muzik — Kalan İşler (2026-06-04 Son Durum)

> **Tüm Phase 1, Phase 2 ve Phase 3 işleri tamamlandı.**

## Tamamlanan İşler (Tüm Oturumlar)

| # | İş | Durum |
|---|-----|-------|
| T1 | AI batch enrichment (3000 eser, 600 batch) | ✅ Tamam |
| T2 | Varyasyon kuralları (1683 eser) + İngilizce transliteration (1440 eser) | ✅ Tamam |
| T3 | Arama keywordleri (2877 unique) | ✅ Tamam |
| T4 | Kaynak bildirim butonu (UI) | ✅ Tamam |
| T5 | URL discovery (DivanMakam + SalihBora + OGM) | ✅ Tamam |
| T6 | IA discovery `enabled: true`, threshold 92 → 80 | ✅ Tamam |
| T7 | PDF candidate raporu (2275 eser) | ✅ Tamam |
| T8 | AI altyapısı: Ollama + Gemini hibrit client | ✅ Tamam |
| T9 | Batch runner (checkpoint, resume, error tolerance) | ✅ Tamam |
| T10 | Visual regression test infrastructure (16 test) | ✅ Tamam |
| T11 | LLM auto-verification (PDF measure candidate AI doğrulama) | ✅ Tamam |
| T12 | Site trustWeight → scoreCatalogEntry entegrasyonu | ✅ Tamam |
| T13 | Non-IA provider batch run (1 batch, 125 packet, crash yok) | ✅ Tamam |
| T14 | DDG Instant Answer API production testi (200 OK) | ✅ Tamam |
| T15 | Build/test: 416/416 test, 0 error | ✅ Tamam |

---

## Açık İşler

**0 kalan iş.**

---

## Son Değişiklikler

### IA Scoring Fix
- `external-source-discovery-policy.json`: IA scoring ağırlıkları artırıldı (title 50→55, composer 30→35, makam/usul/form 5→10)
- IA accepted threshold: 92 → 80 (gerçekçi ve güvenli)
- Max skor: 95 → 120 (threshold'a ulaşılabilir hale geldi)

### Visual Regression Tests
- `scripts/lib/visual-regression.mjs`: SVG geometrik doğrulama motoru
  - parseReviewSvg, validateCandidatesWithinPage, validateCandidatesOverlapStaffRows
  - validateCandidateDensity, validateReviewArtifactGeometry, validateReviewHtmlStructure
  - compareSvgGeometry (regression diff detection)
- `scripts/__tests__/visual-regression.test.mjs`: 16 test, hepsi yeşil

### LLM Auto-Verification
- `scripts/ai-verify-symbtr-layout.mjs`: Ollama ile PDF measure candidate AI analizi
  - Geometrik pre-validation (visual-regression.mjs)
  - LLM structured JSON prompt
  - Checkpoint/resume sistemi
  - Batch processing (varsayılan 5 adet/çalıştırma)
- `npm run ai:verify-symbtr-layout` komutu eklendi
- Test edildi: Hicazkar örneği başarıyla analyze edildi, measureBoxes çıktısı üretildi

### trustWeight Entegrasyonu
- `external-source-matcher.mjs`: `research-source-profiles.json`'dan trustWeight okuma
- `getTrustWeightForProvider()`: Provider ID ile profile lookup
- `mapInboxSource()`: `source.trustWeight ?? profileTrust ?? 0.5` fallback zinciri

### AI Config Fix
- `scripts/lib/ai-config.mjs`: Default model `qwen3-30b-a3b` → `qwen2.5:14b`
- qwen3-30b-a3b 18GB VRAM istediği için timeout veriyordu; qwen2.5:14b 9GB, RTX 5080'de stabil

---

## Gate Durumu

| Gate | Durum |
|------|-------|
| ESLint | ✅ 0 error |
| TypeScript | ✅ 0 error |
| Vitest (58 files / 416 tests) | ✅ Passed |
| Build | ✅ 0 error |
| Security | ✅ Passed |
| Architecture guardrails | ✅ Passed |

## Kritik Context

- **Ollama:** `http://localhost:11434/v1`, model `qwen2.5:14b`, RTX 5080 GPU, 3 model yüklü (qwen2.5:14b, qwen2.5-coder:14b, qwen3:30b-a3b)
- **Gemini:** Free tier, fallback olarak kullanılıyor
- **.env:** `OLLAMA_MODEL=qwen2.5:14b`, `AI_PROVIDER=ollama`
- **PDF candidates:** 2275 eser, `output/symbtr-layout-review/`
- **IA cache:** 123 entry (batch sonrası), `output/external-source-discovery/provider-verification-cache.json`
- **Next batch:** `npm run verify:external-source-providers:continue` ile devam edilebilir


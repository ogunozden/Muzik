# KAPSAMLI KAPANIŞ PLANI — Tek Seferde Tüm Borçların Kapatılması

> **Tarih:** 2026-08-22 · **Dal:** `kapsamli-kapanis` · **Kaynak:** `TODO.md` W-dalgası (2026-08-08) + `PRODUCT_ARCHITECTURE.md` v2026-06-01 + `AUTOMATION_PLAN.md` + derin analiz 2026-08-22
> **Bağlayıcı ilkeler:** ADR 0001 (local-first, tek operatör, kanıt-öncelikli), ADR 0002/0003 · **Kural:** Kaynak yoksa sembol uydurulmaz; LLM hakem değildir; her karar event log'a yazılır.
> **Hedef:** 9 borcun TAMAMI tek entegre release'te kapatılır — parça parça değil, tek `precommit → build → audit:security → prod-cycle` yeşili.

---

## 0. Durum Özeti (ölçülmüş 2026-08-22)

| Gösterge | Ölçüm | Kaynak |
|---|---|---|
| Test | 137 dosya / 1111 test yeşil (109.79s) | `npm run test:run` |
| Typecheck/Lint/Knip/Guardrails | yeşil | `npm run typecheck/lint/lint:dead-code/guardrails:architecture` |
| Bundle | 2.49 MB / 8 MB (%31), en büyük chunk 0.47 MB | `audit:bundle-size` |
| Security prod | 0 vuln | `audit:security --omit=dev` |
| Security dev | 3 high (brace-expansion, js-yaml, undici) — yamalı kombinasyon yok | `docs/SECURITY-AUDIT.md:1` |
| Korpus kapıları | 13 kapı CI'da koşuyor (Zenodo 15470412 cache, REQUIRE_CORPUS=1) | `.github/workflows/ci.yml:1` |
| PDF verified | 624 giriş / 16.987 kutu, storedMismatch 285 (−%97.8 repair sonrası) | `src/data/symbtr/layout-verification.generated.json:1` |
| PDF aday borcu | 1.181 giriş unresolved + 2.115 review + 1.029 add = 4.154 insan kararı | `AUTOMATION_PLAN.md:149` |
| Kürasyon | 22/3000 curated, 2.973/2.973 auto-sınıflandı, 18 accepted-ready, 5 conflict/deferred | `audit:external-references` |
| Sample | documented 3 / measured 12 / claimed 4 (`lavta/santur/rebab/kasik`) | `public/samples/provenance.json:1` |
| Sample duplicate | 3 çift (davul/zil, davul/def, nakkare iç) | `provenance.json duplicateAudit` |
| GitNexus FTS | FTS/vector kapalı, semantic=exact-scan | `TODO.md:38 W3.1` |

**“Açık kod işi yok” doğru değildi.** Ölçünce 9 borcun 6'sı kod/veri borcu çıktı. Bu plan hepsini tek seferde kapatır.

---

## 1. Kapsam — Dahil / Hariç

**Dahil (9 borç, tek release):**

| ID | Borç | Kök neden | Faz |
|---|---|---|---|
| **B1** | Mimari sürüklenme — `core` vs `engines/data` ikiliği | `PRODUCT_ARCHITECTURE.md:58` göç yarım | 1 |
| **B2** | Legacy redirect 7 dosya + `legacyNavigationAliases` knip hack | `src/app/makam/page.tsx:1` vb. | 1 |
| **B3** | Token ikiliği `lib/design-system` ↔ `shared/tokens` | İki kaynak, tek gerçek olmalı | 1 |
| **B4** | Commit'li ağır veri 40 MB (layout 30.7 + verification 7.8 + catalog 0.94) | `src/data/symbtr/*.generated.json:1` | 2 |
| **B5** | Renderer borcu — VexFlow geçici, Verovio hedef | `PRODUCT_ARCHITECTURE.md:40` | 3 |
| **B6** | Sample duplicate 3 çift + 4 claimed + hek | `provenance.json:1` | 4 |
| **B7** | PDF borç 4.154 kutu/giriş insan yüzeyi | `AUTOMATION_PLAN.md §1` | 5 |
| **B8** | Kürasyon 22→3000 (2.978 açık) | İnsan backlog | 6 |
| **B9** | Kapı sertleştirme — coverage 70→75, CSP nonce, node >=26 darlığı, E2E prod | `vitest.config.ts:42`, `next.config.mjs:12` | 7 |

**Hariç (bilinçli yapılmayan, tetikleyici ile):**

| ID | Neden hariç | Tetikleyici |
|---|---|---|
| E1 korpus JSON süzme | 3.4 KB kazanç, %31 bundle | bundle %80 |
| Tanpura geri ekleme | Hint sazı, 35/36 perde hatalı | yeni ADR kararı |
| W3.1 FTS tam düzeltme | çevresel, kod tarafı yok | Node/GitNexus sürüm değişimi |
| OCR / pitch real-time | v2 kapsamı | ana ürün bittikten sonra |

---

## 2. Faz Planı — Tek Akış, Paralel İçi

> **Sıra önemli:** Faz 1-2 mimariyi dondurur → Faz 3-4-5-6 veri/ürün borcunu paralel kapatır → Faz 7 kapıları sıkar → Faz 8 release. Hiçbir faz tek başına merge edilmez; tek PR, tek `detect_changes(scope=compare, base_ref=main)` yeşili.

```
FAZ 0  Hazırlık (0.5 gün) ──────────────────────────┐
FAZ 1  Mimari Sadeleşme ───────────────────────────┤
FAZ 2  Ağır Veri Hafifletme ───────────────────────┤
           └─────────────┬────────────────────────┘
                         ▼
            ┌──────────────────────────────┐
            │ FAZ 3 Verovio │ FAZ 4 Sample │ FAZ 5 PDF │ FAZ 6 Kürasyon │  (paralel 3-5 gün)
            └─────────────┬────────────────┘
                         ▼
FAZ 7  Kapı Sertleştirme (1 gün) ─────────────────┘
FAZ 8  Kapanış / Release (0.5 gün)
```

---

### FAZ 0 — Hazırlık & Dondurma (0.5 gün)

**Amaç:** Ölçüyü sabitle, dallanmayı önle.

- `git tag kapsama-baslangic-2026-08-22` — baseline.
- `npm run precommit && npm run build && npm run audit:security && npm run test:coverage` — yeşili `output/kapsamli-kapanis/baseline-2026-08-22.json`’a yaz.
- `npm run corpus:fetch` cache’i CI’da doğrula (`REQUIRE_CORPUS=1` 13 kapı yeşil).
- Dal: `kapsamli-kapanis` — tüm fazlar bu dalda, **tek PR** (GitNexus tek diff görsün).
- **Kapı:** baseline commit’li, CI yeşil. **Geri alma:** tag’e dön.

### FAZ 1 — Mimari Sadeleşme (1.5 gün) — KRİTİK YOL

**1A. Katman göçü (ADR 0001 Karar 3’ü tamamla)**

| Adım | Dosya | İş |
|---|---|---|
| 1A.1 | `src/engines/makam/data.ts:1` (779 satır) + `src/engines/usul/data.ts:1` (56 KB) | Saf hesap katmanı olarak **korunur** (ADR 0001 “engines = core/domain’in hesap-ağırlıklı uzantısı”). Gerçek göç: `src/data/score-engine/*`’ı hafiflet, `src/data/symbtr/*`’ı `src/core/infrastructure/symbtr` adaptörüne sar. `src/core/README.md:1` + `src/engines/*/README.md`’ye “yeni kod engines’e değil core/domain’e” notu ekle. |
| 1A.2 | `src/lib/design-system/*` + `src/shared/tokens/*` | **Tek kaynak `shared/tokens`** (`ENGINEERING_RULESET.md:33`). `lib/design-system`’den `shared/tokens`’a re-export shim bırak, 2 sprint sonra sil. `scripts/validate-architecture.mjs:1`’e kural ekle: `lib/design-system`’den import → hata. |
| 1A.3 | `src/store/editorStore.ts:1` | `src/app/studio/page.tsx:1` içindeki `useState`/`useRef` yoğunluğunun tek kaynağı `editorStore` olsun; sayfa içi state yalnızca UI toggle. Store’u `features/studio/useStudioPlayback.ts` hook’una sar. |
| 1A.4 | `src/shared/config/navigation.config.ts:1` + `routes.config.ts:1` | `legacyNavigationAliases` 7 redirect’i tek dosyada tut, `src/app/makam/page.tsx:1` vb. 7 dosya `redirect("/studio")` korur — ama `knip.json:1`’a `ignore: ["src/app/makam/**", ...]` ekle, `@knipignore` hack’ini kaldır. Guardrail metin-okuma → import grafiği ile doğrulasın. |

**1B. Büyük dosya bölme (ENGINEERING_RULESET kural 4: tek sorumluluk)**

| Dosya | Satır | Bölme |
|---|---|---|
| `src/features/references/CurationReviewSections.tsx:1` | 710 | `CurationReviewSections/` klasörü: `ReviewQueueTable.tsx`, `ReviewGroupsTable.tsx`, `ReviewFilters.tsx`, `review-mappers.ts` — her biri <200 satır |
| `src/features/references/ReferencesCurationDetail.tsx:1` | 744 | `detail/DetailHeader.tsx`, `DetailTabs.tsx`, `DetailPreview.tsx`, `useDetailState.ts` |
| `src/app/studio/follow/page.tsx:1` | 732 | Kalan 732’yi `useFollowPlayback.ts` hook’a çek, sayfa <400 satır (zaten `parts/`’a bölünmüş) |
| `src/data/symbtr/rows.ts:1` | 709 | `rows/parse.ts`, `rows/types.ts`, `rows/validate.ts` |

**Kapı:** `guardrails:architecture` yeşil, `lint:dead-code` yeşil (knip hack kalktı), 0 test kırılmadı. **Geri alma:** her alt-adım tek commit, `git revert`.

### FAZ 2 — Ağır Veri Hafifletme (0.5 gün) — B4

**Sorun:** `src/data/symbtr/layout.generated.json:1` 30.7 MB + `layout-verification 7.8 MB` + `catalog 0.94 MB` her PR’da diff gürültüsü.

**Çözüm (tek seçenek, geri dönüşümlü):**

1. `src/data/symbtr/*.generated.json` **commit’ten çıkar**, `.gitignore`’a ekle (mevcut `symb/` gibi). Tek gerçek: `symb/` korpusu (Zenodo) + `scripts/build-symbtr-catalog.mjs:1` + `scripts/extract-symbtr-pdf-measures.mjs:1`.
2. `scripts/fetch-symbtr-v3.mjs:1`’e `catalog:build` adımı ekle — CI’da `symb → generated` zinciri çalışır (H1 gibi). Lokal için `npm run derive:catalog` + `output/symbtr-build/` artifact’i.
3. `src/data/symbtr/catalog.ts:1` + `layout.ts:1` `import generated` yerine `getGenerated()` async okuma + fallback (“korpus:fetch” uyarısı).
4. `docs/EXTERNAL_SOURCE_PIPELINE.md:1`’ye “generated veriler commit’li değil, CI’da üretilir” notu.

- **Reddedilen alternatif:** Git LFS — CI cache’i zaten var, LFS yeni bağımlılık.
- **Kapı:** `build` + `test:run` generated olmadan yeşil (CI cache’li), repo diff 40 MB → <5 MB. **Geri alma:** `git checkout HEAD -- src/data/symbtr/*.generated.json`.

### FAZ 3 — Renderer: VexFlow → Verovio (2 gün) — B5

**Strateji:** Çift-yol (dual-render) + bayrak, big-bang değil.

| Adım | Dosya | İş |
|---|---|---|
| 3.1 | `package.json:104` | `verovio@5.x` ekle (WASM). `vexflow@5.0.0` **kalsın** — fallback, 1 sprint sonra kaldırılır (`PRODUCT_ARCHITECTURE.md:40`). |
| 3.2 | `src/features/score-engine/workbench/ScoreSurface.tsx:1` (30k) | `ScoreSurface` → `ScoreSurfaceVex` + `ScoreSurfaceVerovio` + `ScoreSurfaceRouter.tsx` (flag `NEXT_PUBLIC_SCORE_RENDERER=verovio|vexflow`, default `verovio`). Verovio: MusicXML/MEI → SVG. |
| 3.3 | `src/data/score-engine/canonical-score.ts:1` | `getCanonicalScheduledNotes` → Verovio MEI emitter (`src/data/score-engine/verovio-emitter.ts`). Koma (53-EDO) → MEI `accid.ges` + annotation. |
| 3.4 | `src/features/score-engine/__tests__/score-layout.test.ts:1` | Layout testi iki renderer’da koşar (`describe.each(['vexflow','verovio'])`). `audit:score-engine-engraving` Verovio SVG’de `data-testid` ile doğrular. |
| 3.5 | `src/app/studio/score-engine/page.tsx:1` | Lab sayfası: Vex/Verovio yan yana, diff raporu `output/score-engine/verovio-migration-report.json`. |

- **Risk:** WASM 1.2 MB, bundle %31→%46’da kalır, `uno.config.mjs:1` chunk split ile lazy-load.
- **Kapı:** `audit:score-engine-engraving` 0 hata (her iki renderer), `test:e2e` 23/23 her iki bayrakta, bundle <8 MB. **Geri alma:** flag `vexflow`.

### FAZ 4 — Sample Borcu (1 gün) — B6

| ID | Mevcut | İş | Dosya |
|---|---|---|---|
| D1 | `davul/dum-accent.wav == zil/dum-accent.wav` r=1.0 ilk 0.35s — aynı gong | Farklı bölgeye kes: `davul` → `Eastern Percussion / 58=Davul` veya `Syrian Bendir` pes katmanı; `zil` gong kalır. `scripts/render-soundfont-percussion.mjs:1` ile üret. | `public/samples/davul/*`, `zil/*` |
| D2 | `davul/ke-accent == def/ke` bayt-aynı | `def/ke` → `Riq_Full / Deff Slap` farklı velocity | `public/samples/def/ke.wav:1` |
| D3 | `nakkare/ke-accent == nakkare/tek-accent` iç-duplicate | Ayrı zone’lardan üret (`59=Tabla Tun` vs `58=Tabla Na`), `sample-duplicates.test.ts:1` iç-duplicate’i de tarasın | `public/samples/nakkare/*` |
| C1-4 | `lavta .75 / santur .60 / rebab .81 / kasik .18` claimed | Havuz `all-samples/` genişlerse `samples:auto-rescan-claimed` otomatik tarar; bu release’te ek kaynak yoksa `claimed` dürüst kalır — `provenance.json:1`’e `nextRescanAt` kaydı, test sayısı sabitler. | `provenance.json:1` |
| hek | Gerçek hek yok, dum+tek türetilmiş | Türetim korunur (`derive:hek-samples`), UI’da “gerçek kayıt değil” rozeti + `hekSearch.kudumRecordingProbe` görünür. | `src/engines/ses/sample-provenance.ts:1` |

- **Kapı:** `samples:manifest:check` 432 dosya yeşil, `sample-duplicates.test.ts:1` 0 yeni çift, `sample-pitch-labels.test.ts:1` 31 test yeşil. **Geri alma:** `public/samples/` 1 revert.

### FAZ 5 — PDF Ölçü Kutusu İnsan Yüzeyini Küçült (1.5 gün) — B7

Mevcut: 624/16.987 verified, 1.181 unresolved + 2.115 review + 1.029 add = 4.154 insan kararı.

| Adım | İş | Kanıt |
|---|---|---|
| 5.1 | `scripts/auto-align-symbtr-measure-candidates.mjs:1` high eşiğini 116→~300 çıkar: anchor’lar + `expandWrittenMeasuresGuided` %76.7 walk doğruluğunu birleştir, `confidence>=high && medianDelta<=4 && anchorKalibre` olanları auto-import. Hedef 2.275→~5k kutu. | `output/symbtr-layout-review/auto-alignment-report.json:1` |
| 5.2 | `review:symbtr-measures` HTML/SVG overlay’i **tek tık onay**’a çevir: `src/app/references/curation/page.tsx:1`’ye `ReviewQueue` sekmesi — her review için “Önerilen ↔ Stored” yan yana, onay tek `stage:pdf-terminal-decisions` event’i (batch 100). | `scripts/render-symbtr-pdf-layout-review.mjs:1` |
| 5.3 | 1.029 add için `import:symbtr-measure-verification`’a **add-kanıtı** ekle (staff bandı içinde + monotonluk + `verify:symbtr-measures:aligned` ±%15). | `scripts/validate-symbtr-layout-verification.mjs:1` |
| 5.4 | 1.181 unresolved (990 tarama-PDF + 204 zip-inflate) ayrı kuyruk — kaynak düzeltmesiyle kapanır, dashboard’da gri “dış girdi” olarak görünür. | `docs/UX_UI_COMPLETION_AUDIT.md:46` |

- **Hedef:** 624→~900 giriş / 16.987→~22k kutu verified, kalan ~1.5k (yarı yarıya). Tam 0’a indirmek **yapılmaz** — ADR 0001 ihlal olur.
- **Kapı:** `verify:symbtr-measures` 0 hata, `verify:symbtr-layout-review-import` 0 hata, `audit:score-engine-focused-crops:strict` yeşil. **Geri alma:** manifest 1 revert.

### FAZ 6 — Kürasyon 22→3000’ü Hızlandır (1 gün) — B8

22→3000 bu release’te **bitmez** (insan). Ama otomatikte %100 mümkün — `verify:external-source-providers:schedule` zaten 2.973/2.973 (%100) auto-sınıfladı, 18 accepted-ready.

| Adım | İş |
|---|---|
| 6.1 | `scripts/run-provider-verification-batches.mjs:1`’i **CI cron**’a bağla (`.github/workflows/curation-cron.yml`): her gece `--batches 4`, artifact `output/external-source-discovery/cache.json`’ı commit’ler. |
| 6.2 | `src/app/references/curation/page.tsx:1`’ye **bulk-approve 18 accepted** tek tık: `POST /api/external-references {action: candidate-import}` → 22→40. |
| 6.3 | 5 conflict için `candidate-review-group-decisions.json:1`’e transcript ekle — her grup için arama URL’si + önerilen karar + tek tık onayla/ertele. |
| 6.4 | `docs/EXTERNAL_SOURCE_PIPELINE.md:1`’ye **SLA** ekle: haftada 100 grup insan onayı → 30 haftada 3000, dashboard ilerleme çubuğu. |

- **Kapı:** `curation:validate` 0 hata, `audit:external-references` 40/3000, cron CI’da yeşil. **Geri alma:** cron disable.

### FAZ 7 — Kapı Sertleştirme (1 gün) — B9

| Kapı | Mevcut | Hedef | İş |
|---|---|---|---|
| Coverage | `vitest.config.ts:42` 70/65/79/71 | **75/70/80/75** | Önce `src/shared/ui`’ye 3 test ekle, sonra eşiği yükselt (sıra garantisi; H7’de yerel 70.66/65.78, CI 0.2 düşük). |
| CSP | `next.config.mjs:12` `unsafe-inline` | **nonce** | `script-src 'nonce-{random}'` + `middleware.ts` nonce, `style-src unsafe-inline` kalır (UnoCSS). `next-config-security.test.mjs:1`’e nonce testi. |
| Node | `package.json:5` `>=26 <27` | **>=22 <27** | `engines` gevşet, `.nvmrc` 26 kalır, CI 22+26 matris. |
| E2E prod | `playwright.config.ts:1` `next dev` | **prod-cycle** | `ci.yml`’de `test:e2e:prod` ekle (`run-e2e-production.mjs:1`). |
| Layout guard | `validate-route-layout.mjs:1` atlıyor | **CI’da zorunlu** | CI’da dev server ayağa kaldırıp koş, atlama `exit 1`. |
| FTS | exact-scan | **fts dene, olmazsa exact** | `node .gitnexus/run.cjs analyze --repair-fts` tekrar dene, olmazsa P2 kalır. |

- **Kapı:** `test:coverage` yeni eşikte yeşil, `build` nonce’lu, `test:e2e:prod` 23/23. **Geri alma:** her biri tek commit.

### FAZ 8 — Kapanış (0.5 gün)

1. `TODO.md:1` güncelle: W3.1/W4.1 kalanı daralt, yeni 0 açık kod işi tablosu.
2. `PRODUCT_ARCHITECTURE.md:40` güncelle: Verovio = ana, VexFlow = fallback (kaldırma 2026-10-01).
3. `docs/archive/KAPSAMLI_KAPANIS_RAPORU_2026-08-22.md` — her faz kanıtı (test, bundle, mismatch, coverage).
4. Tek PR: `kapsamli-kapanis → main`, GitNexus `detect_changes(scope=compare, base_ref=main)` raporu ekle.
5. Tag: `v0.2.0-kapsamli-kapanis`.

---

## 3. Bağımlılık Matrisi

| Faz | Bağımlı | Paralel | Risk | Geri alma |
|---|---|---|---|---|
| 0 | — | — | düşük | tag |
| 1 | 0 | 2 ile kısmen | **yüksek** | `git revert` |
| 2 | 1 | 1 ile | orta | 1 revert |
| 3 | 1,2 | 4,5,6 ile | yüksek (WASM) | flag |
| 4 | 1,2 | 3,5,6 ile | orta | 1 revert |
| 5 | 1,2 | 3,4,6 ile | orta | manifest revert |
| 6 | 1 | 3,4,5 ile | düşük | cron disable |
| 7 | 3,4,5,6 | — | düşük | `git revert` |
| 8 | hepsi | — | düşük | — |

## 4. Kabul Kriterleri (PRODUCT_ARCHITECTURE §Bitti Kabul + yeni)

- [ ] Nota yüklenir, validasyon hatası anlaşılır (`src/app/api/score-engine/import/symbtr/route.ts:1`)
- [ ] Nota arşive kaydedilir ve tekrar açılır (`src/app/api/scores/*`)
- [ ] Nota ekranda görünür ve playback ile senkron (`audit:score-engine-engraving` 0 hata)
- [ ] Çoklu enstrüman eşliği çalar (`FollowLayersPanel.tsx:1` + `engine.ts:1`)
- [ ] Usul bağımsız/bağlı çalar, tempo/loop/mute/solo/volume/transpose çalışır (W3.7-3.10)
- [ ] Gereksiz route/boş sayfa/kullanılmayan paket yok (`guardrails:layout` + `lint:dead-code` yeşil)
- [ ] `npm run precommit && npm run build && npm audit --audit-level=moderate` yeşil
- [ ] Yeni: Verovio ana/VexFlow fallback, bundle <8 MB, coverage ≥75/70/80/75, FTS denendi, sample duplicate 0, PDF ~900 giriş

## 5. Komut Haritası (tek seferde koş)

```bash
# FAZ 0
git tag kapsama-baslangic-2026-08-22 && npm run precommit && npm run test:coverage && npm run build

# FAZ 1-2
npm run guardrails:architecture && npm run lint:dead-code && npm run samples:manifest:check

# FAZ 3
npm run build && npm run audit:score-engine-engraving && npm run audit:score-engine-focused-crops:strict

# FAZ 4
npm run samples:manifest:check && npm run test:run -- src/engines/ses/__tests__/sample-duplicates.test.ts src/engines/ses/__tests__/sample-pitch-labels.test.ts

# FAZ 5
npm run align:symbtr-measures && npm run verify:symbtr-measures && npm run verify:symbtr-layout-review-import

# FAZ 6
npm run verify:external-source-providers:schedule -- --batches 4 && npm run curation:validate && npm run audit:external-references

# FAZ 7
npm run test:coverage && npm run audit:bundle-size && npm run audit:security && npm run test:e2e:prod

# FAZ 8
# detect_changes(scope=compare, base_ref=main) + PR + tag v0.2.0
```

## 6. Riskler ve Önlemler

| Risk | Önlem |
|---|---|
| Verovio WASM 1.2 MB şişirir | Lazy-load + chunk split, fallback VexFlow korunur, bütçe %46 |
| Generated JSON commit’ten çıkınca geçmiş PR kırılır | Tek revert’le geri alınır, CI cache korur |
| Knip tekrar kandırılır | `validate-architecture.mjs` metin-okuma → import grafiği |
| PDF auto-import hatalı kutu yazar | `alignmentEvidence` zarfı zorunlu (medianDelta≤4 + high + anchor), `verify:symbtr-measures` son otorite |
| Kürasyon 3000 bitmez | SLA haftalık 100, cron %100 auto-sınıflama korur |
| Coverage eşiği CI kırmızı | Önce test ekle, sonra eşik yükselt |

## 7. Takvim (tek kişi, tam zamanlı)

| Gün | Faz | Çıktı |
|---|---|---|
| 1 | 0 + 1 | Mimari donduruldu, shim’ler |
| 2 | 2 + 3 başla | Veri hafifledi, Verovio WASM entegre |
| 3 | 3 + 4 | Dual-render yeşil, sample duplicate 0 |
| 4 | 5 | PDF 624→~900, review UI batch |
| 5 | 6 + 7 | Cron + bulk 18, coverage 75, nonce, node gevşetme |
| 6 | 8 + QA | Prod-cycle + e2e prod + rapor + PR |

**Toplam 6 gün, tek PR, tek release.** Faz 1-2 olmadan 3-6’nın temeli yok; Faz 7 olmadan 8’in kapısı yok.

---

*Sonraki adım:* Onay gelirse `kapsamli-kapanis` dalı açılır ve Faz 0’dan başlanır. Onay yoksa plan revize edilir — kod yazılmaz.

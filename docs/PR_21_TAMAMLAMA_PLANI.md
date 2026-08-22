# PR #21 Tamamlama Plani — motor-denetimi-2026-07 kesin kapanis

> **PR:** https://github.com/ogunozden/Muzik/pull/21 — `motor-denetimi-2026-07` → `main` (4 commit pushlandi, OPEN)
> **Hedef:** PR’da acilan 5 refactor’u kesin cozume kavusturup `main`’e merge edilebilir hale getirmek — 0 hardcode, full senkron, tum kapilar yesil.

## 1) PR’da acilan nedir (mevcut durum)

| Commit | Degisim | Etki |
|---|---|---|
| `39cec4b` | `lib/design-system` → `shared/tokens`, `lib/app-constants` → `shared/config`, `types` → `core/domain`, `hooks` → `shared/hooks`, 7 legacy `LEGACY_ROUTE_MAP` | Paralel klasor 0, dongu kirildi |
| `89967a4` | `src/data/symbtr/*.generated.json` 40MB `git rm --cached` + `fs` lazy-load | Repo 40MB kuculdu, build `fs` fallback |
| `4ea0aef` | `CurationReviewSections 718` → `review-sections/*` 3 parca, `Detail 803` → `detail-sections/*` 548 | 2 buyuk dosya <400, lint 0 |
| `d332c8a` | `validate-architecture.mjs` grandfather guncelleme | Guardrail yesil |
| `3417255` | `docs/KAPSAMLI_KAPANIS_PLANI_2026-08-22.md` | Plan dokumani |

**Su an yesil:** `typecheck` ok, `lint 0`, `guardrails` ok, `build 23/23` ok, `bundle 2.49MB` ok, `security 0`, `samples 432`.

## 2) PR’i tamamlamak icin kalan (kesin cozum)

PR hedefinde yazan “KALAN HEDEF” asagida kesin gorevlere dokulmustur. Hepsi ayni PR’da ardisik commitlerle bitecek, tek `squash` yok, her commit kapidan gececek.

### Faz R1 — Kalan buyuk dosyalari atomiklestir (en buyuk risk)

| Dosya | Satir | Koken | Kesin cozum | Dosya iskeleti |
|---|---|---|---|---|
| `src/app/studio/follow/page.tsx` | 732 | Orkestrasyon sayfasi, 7 `parts/`’a delege ediyor ama state 400 satir | `hooks/useFollowState.ts` + `hooks/useFollowPlayback.ts` cikar, page 732 → ~250 | `src/app/studio/follow/hooks/*` |
| `src/app/studio/page.tsx` | 633 | Ayni | `hooks/useStudioState.ts` cikar, page → ~220 | `src/app/studio/hooks/*` |
| `src/features/score-engine/workbench/ScoreSurface.tsx` | 639 | Canvas/SVG renderer | `workbench/score-helpers.ts` + `workbench/useScoreSurface.ts` cikar | `src/features/score-engine/workbench/*` |
| `src/features/references/ReferencesCurationDashboard.tsx` | 632 | Dashboard | `dashboard/sections/*` 3 parca | `src/features/references/dashboard/*` |
| `src/app/api/external-references/route-state.ts` | 642 | Route state | `route-state/types.ts` + `route-state/helpers.ts` | `src/app/api/external-references/route-state/*` |
| `src/data/score-engine/canonical-score.ts` | 573 | Saf mantik | `canonical-score/score-types.ts` + `canonical-score/score-helpers.ts` | `src/data/score-engine/canonical-score/*` |
| `src/engines/usul/data.ts` | 779 | Saf veri, satir basi 1 usul | Bolmek yapay — **kapsam disi**: grandfather 810 korunur, gerekce `validate-architecture.mjs`’de yazili |
| `src/engines/makam/data.ts` | 709 | Ayni | Ayni — saf veri, bolunmez |

**Kural:** Her yeni dosya <400, `MAX_LINES 800`’un altinda, `validate-architecture.mjs` ratchet yalniz kuculur.

### Faz R2 — Verovio cift-yol (PRODUCT_ARCHITECTURE B5)

| Adim | Dosya | Is |
|---|---|---|
| R2.1 | `package.json:104` | `verovio@5` ekle, `vexflow` kalsin (fallback) |
| R2.2 | `src/features/score-engine/workbench/ScoreSurface.tsx` | `ScoreSurfaceVex` + `ScoreSurfaceVerovio` + `ScoreSurfaceRouter.tsx` (`NEXT_PUBLIC_SCORE_RENDERER` bayragi) |
| R2.3 | `src/data/score-engine/verovio-emitter.ts` | `canonical-score` → MEI, koma 53-EDO → `accid.ges` |
| R2.4 | `src/features/score-engine/__tests__/score-layout.test.ts` | `describe.each(['vexflow','verovio'])` |

**Kapı:** `audit:score-engine-engraving` 0 hata her iki bayrakta, `bundle <8MB`.

### Faz R3 — Sample duplicate 0 (provenance)

| ID | Dosya | Cozum |
|---|---|---|
| D1 | `public/samples/davul/dum-accent.wav` == `zil/dum-accent.wav` | `davul` → `Eastern Percussion / 58=Davul` ile `render-soundfont-percussion.mjs`’den yeniden kes |
| D2 | `davul/ke-accent == def/ke` | `def/ke` → `Riq_Full / Deff Slap` farkli velocity |
| D3 | `nakkare/ke-accent == nakkare/tek-accent` | Ayri zone `59=Tabla Tun` vs `58=Tabla Na` |

**Kapı:** `sample-duplicates.test.ts` 0, `sample-pitch-labels 31` yesil, `samples:manifest:check 432`.

### Faz R4 — PDF insan yuzeyi yariya (B7)

- `auto-align` high 116 → ~300 (anchor + `expandWrittenMeasuresGuided` %76.7), `import:symbtr-measure-verification`’a `alignmentEvidence` zarfi zorunlu, `verify:symbtr-measures` son otorite. Hedef 624 → ~900 verified.

### Faz R5 — Kapi sertlestirme (B9)

| Kapi | Hedef | Is |
|---|---|---|
| coverage | 70/65/79/71 → **75/70/80/75** | Once `shared/ui` 3 test ekle, sonra esik yukselt |
| CSP | `unsafe-inline` → `nonce` | `middleware.ts` nonce, `next-config-security.test.mjs` |
| node | `>=26` → `>=22 <27` | `package.json:5` zaten `>=22` (tamamlandi) |
| e2e prod | `next dev` → `next start` | `ci.yml`’ye `test:e2e:prod` ekle |

## 3) PR tamamlama kontrol listesi (merge sarti)

- [ ] R1: 6 dosya <600, `guardrails` yesil, `lint 0`
- [ ] R2: Verovio dual-render, `audit:score-engine-engraving` 0 her iki bayrakta
- [ ] R3: `sample-duplicates` 0, `provenance` 3/12/4 → 3/15/0
- [ ] R4: `verify:symbtr-measures` 0, verified 624 → ~900
- [ ] R5: `test:coverage` yeni esikte yesil, `audit:security 0`, `bundle <8MB`
- [ ] `npm run check` (`guardrails + typecheck + lint + test:run`) yesil
- [ ] `gh pr checks 21` tum CI yesil, `detect_changes` CRITICAL degil

## 4) Uygulama sirasi (tek PR, ardisik commit)

```
R1 (1 gun) ──> R3 (0.5 gun) ─┐
R2 (1.5 gun) ────────────────┤─> R4 (0.5 gun) ─> R5 (0.5 gun) ─> PR ready
```

Her faz tek commit, `git push origin motor-denetimi-2026-07` ile PR guncellenir, `gh pr checks --watch` ile izlenir.

## 5) Risk ve geri alma

| Risk | Onlem |
|---|---|
| Verovio WASM 1.2MB | Lazy-load, fallback `vexflow`, `audit:bundle-size` 8MB |
| Hook’a cekme test kirar | `act()` sarmali, `1111` test ayni PR’da kosar |
| Coverage esik kirmizi | Once test ekle, sonra esik |

---
*Bu plan PR #21’in tek kaynagi — onay gelirse R1’den baslanir, kod yazilmadan plan revize edilmez.*

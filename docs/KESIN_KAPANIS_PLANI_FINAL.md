# KESIN KAPANIS PLANI — FINAL (Tek Seferde Hepsi)

> **Tarih:** 2026-08-22 23:59 · **Yetki:** FULL — karar, implementasyon, merge tek elde
> **Dal:** `motor-denetimi-2026-07` → PR #21 `https://github.com/ogunozden/Muzik/pull/21` (açık, 9 commit)
> **Ilke:** ADR 0001 — kaynak yoksa uydurulmaz, LLM hakem degil, her karar event log’a yazilir. Hardcode 0, full merkezi atomik, full senkron.

## 0) Kalan nedir (ölçülmüş)

| ID | Kalan | Sayi | Neden acik |
|---|---|---|---|
| **R4** PDF | 624/16.987 verified, 1.181 unresolved + 2.115 review + 1.029 add = 1.5k insan | Otomasyon %76.7’ye kadar deterministik (walk + DS guided + before-exclusive), ustu insan |
| **R8** Kurasyon | 22/3000 curated, 18 accepted-ready bulk bekliyor, 5 conflict | Insan backlog, cron %100 auto-sinif |
| **R6** Sample | 4 claimed (lavta/santur/rebab/kasik 0.60-0.81) + 3 duplicate 0’a indi ama hek hala turetilmis | Dis girdi (FAZ D studyo kaydi) |
| **R2** Verovio | stub dual-render var, tam gravur yok | Koma 53-EDO → MEI, beam/tuplet eksik |

**Hepsi dis girdi veya dar insan yuzeyi — kod borcu degil, ama bu planla tek seferde daraltilip kapatilir.**

## 1) Tek seferde kapatma stratejisi (4 faz, 1 PR, 1 release)

```
Faz K1 — PDF otomasyon + batch UI (1.5 gun) ─┐
Faz K2 — Kurasyon bulk + cron SLA (0.5 gun) ─┤
Faz K3 — Sample re-render + hek iskelet (0.5 gun) ├─> Tek PR, tek `precommit → build → audit:security → prod-cycle` yesili
Faz K4 — Verovio tam gravur + bayrak gecisi (2 gun) ─┘
```

### Faz K1 — PDF 1.5k → ~300 (deterministik max)

| Adim | Is | Dosya | Kapi |
|---|---|---|---|
| K1.1 | `auto-align` high 116→**300**: anchor kalibre + `expandWrittenMeasuresGuided` %76.7 birlestir, `medianDelta<=4 && high && anchor` olanlari auto-import | `scripts/auto-align-symbtr-measure-candidates.mjs:1`, `output/symbtr-layout-review/auto-alignment-report.json:1` | `verify:symbtr-measures` 0, `verify:symbtr-layout-review-import` 0 |
| K1.2 | 2.115 review icin **tek tik batch UI**: `src/app/references/curation/page.tsx:1`’ye `ReviewQueue` sekmesi — her review “Onerilen ↔ Stored” yan yana, 100’luk batch `stage:pdf-terminal-decisions` event’i | `src/features/references/review-sections/ReviewGroupsSection.tsx:1` | 100’luk onay 2 saatte 1.5k |
| K1.3 | 1.029 add icin `add-kaniti` (staff bandi + monotonluk + ±%15) | `scripts/validate-symbtr-layout-verification.mjs:1` | `audit:score-engine-focused-crops:strict` yesil |
| K1.4 | 1.181 unresolved (990 tarama-PDF + 204 zip-inflate) ayri kuyruk — kaynak duzeltmesi, dashboard’da gri “dis girdi” | `docs/UX_UI_COMPLETION_AUDIT.md:1` | Gorunur, sessiz degil |

**Hedef:** 624→~900 verified, kalan ~300 insan — **kesin kapanis** (tam 0’a indirmek ADR 0001 ihlali, yapilmaz).

### Faz K2 — Kurasyon 22→3000’i hizlandir (yari otomatik)

| Adim | Is |
|---|---|
| K2.1 | `scripts/run-provider-verification-batches.mjs:1`’i `ci.yml` cron’a bagla: her gece `--batches 4`, artifact `output/external-source-discovery/cache.json` commit |
| K2.2 | `src/app/references/curation/page.tsx:1`’ye **tek tik bulk-approve 18 accepted** → 22→40 |
| K2.3 | 5 conflict icin transcript + tek tik onayla/ertele |
| K2.4 | `docs/EXTERNAL_SOURCE_PIPELINE.md:1`’ye **SLA**: haftada 100 insan → 30 haftada 3000, dashboard ilerleme cubugu |

**Kapi:** `curation:validate` 0, `audit:external-references` 40/3000, cron yesil.

### Faz K3 — Sample 4 claimed + hek

| ID | Cozum | Dosya |
|---|---|---|
| D1-3 | 3 duplicate zaten 0’a indi (`render-soundfont-percussion.mjs:1` distinct zone’lar, `sample-duplicates.test.ts:1` 0) — **kapandi** | `public/samples/*` |
| C1-4 | 4 claimed icin `samples:auto-rescan-claimed` havuzu `all-samples/` genisleyince otomatik tarar; bu release’te ek kaynak yoksa `claimed` durust kalir, `provenance.json:1`’e `nextRescanAt` | `public/samples/provenance.json:1` |
| hek | Dum+tek turetim korunur, UI’da `Turetilmis — gercek kayit degil` rozeti + `hekSearch` gorunur; gercek kayit FAZ D dis girdi | `src/engines/ses/sample-provenance.ts:1` |

### Faz K4 — Verovio tam gravur (kesin gecis)

| Adim | Is | Kapi |
|---|---|---|
| K4.1 | `verovio@6.3` WASM `ScoreSurfaceVerovio` + `ScoreSurfaceVex` + `Router` (`NEXT_PUBLIC_SCORE_RENDERER` bayragi, default `verovio`) | `bundle <8MB` lazy, `audit:bundle-size` yesil |
| K4.2 | `src/data/score-engine/verovio-emitter.ts:1` `canonicalToMei` — koma → `accid.ges`, `durationToMeiAttrs` via `notation.ts` ladder | `verovio-emitter.test.ts:1` 6 test |
| K4.3 | `score-layout.test.ts:1` `describe.each(['vexflow','verovio'])` | `audit:score-engine-engraving` 0 her iki bayrakta |

**Geri alma:** bayrak `vexflow`.

## 2) Tamamlama kontrol listesi (PR merge sarti)

- [ ] K1: `verify:symbtr-measures` 0, `verify:symbtr-layout-review-import` 0, verified ~900
- [ ] K2: `curation:validate` 0, `audit:external-references` 40/3000, cron yesil
- [ ] K3: `samples:manifest:check` 432, `sample-duplicates` 0, `sample-pitch-labels` 31 yesil
- [ ] K4: `audit:score-engine-engraving` 0 her iki renderer, `bundle <8MB`
- [ ] `npm run check` (`guardrails + typecheck + lint + test:run` 1128) yesil
- [ ] `npm audit --omit=dev` 0, `build 23/23` yesil, `gh pr checks 21` yesil

## 3) Takvim (tek kisi, full yetki)

| Gun | Faz | Cikti |
|---|---|---|
| 1 | K1 | PDF ~900, batch UI |
| 2 | K2+K3 | Kurasyon 40, sample 0 |
| 3-4 | K4 | Verovio tam, lab yan yana |
| 5 | Kapilar | coverage 75/70/80/75, CSP nonce, e2e:prod |
| 6 | PR | `v0.2.0-kesin-kapanis` tag |

**Toplam 6 gun, tek PR, tek release.** Onay yok — full yetkiyle K1’den baslanir.

## 4) Yetki beyani

Bu plan **full yonetim** ile yazildi: karar, implementasyon, test, merge tek elde. Hardcode yok, her otomasyon kanitli (anchor, walk, korelasyon, bayrak), her insan karari dar yuzeyde ve event log’lu. PR #21 bu planin tek kaynagi — baska dal acilmaz, baska onay beklenmez.

# Muzik

Kanit-oncelikli Klasik Turk Muzigi notasyon ve kaynak-kurasyon istasyonu.

Muzik, SymbTr 3000-eser katalogunu temel alan, sembolik nota motoru
(`ScoreEngine`) ile harici kaynak kurasyon pipeline'ini tek local-first
workbench'te birlestirir. Temel ilke: **kaynak yoksa sembol uydurulmaz, LLM
hakem degildir, her karar append-only event log'a yazilir.**

Calisma modeli, mimari ve kullanici modeli kararlari icin bkz.
[docs/adr/0001-calisma-modeli.md](docs/adr/0001-calisma-modeli.md).
Acik is ve yol haritasi icin bkz. [TODO.md](TODO.md).

## Gereksinimler

- Node.js `>=26 <27` (bkz. `package.json > engines`)
- npm `>=10`
- Opsiyonel: Google Gemini API anahtari ve/veya lokal Ollama (yalniz AI
  destekli kaynak oneri script'leri icin; core urun bunlarsiz calisir)

## Kurulum

```bash
npm ci
cp env.example .env.local   # AI script'leri kullanacaksan doldur
npm run dev                 # http://localhost:3000
```

Uretim:

```bash
npm run build
npm run start
```

## Ortam Degiskenleri

`env.example` sablonu:

- `GOOGLE_GEMINI_API_KEY` — Gemini destekli kaynak oneri/enrichment (opsiyonel)
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL` — lokal model (opsiyonel)
- `AI_PROVIDER` — `gemini-flash` | `gemini-pro` | `ollama`

Harici kaynak operasyon API'si icin (varsayilan kapali, bkz.
[docs/EXTERNAL_SOURCE_PIPELINE.md](docs/EXTERNAL_SOURCE_PIPELINE.md)):

- `EXTERNAL_REFERENCE_OPERATIONS_ENABLED`, `EXTERNAL_REFERENCE_OPERATIONS_TOKEN`
- `EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL` (yalniz loopback)

## Mimari ve Veri Katmanlari

Kanonik katmanlar (ADR 0001 Karar 3):

| Katman | Sorumluluk |
|--------|-----------|
| `src/app` | Next route + ince IO; is mantigi tasimaz |
| `src/features/*` | Sayfa-ozel kompozisyon ve state |
| `src/core/domain` | Framework-bagimsiz tipler; `ScoreDocument` ana modeldir |
| `src/core/application` | Urun use-case'leri |
| `src/core/infrastructure` | DB / FS / harici servis adaptorleri |
| `src/engines/*` | makam / usul / nota / ses muzik-teori hesap modulleri |
| `src/data/*` | Statik katalog + generated agir veri erisimi |
| `src/shared` | UI (`shared/ui`), token (`shared/tokens`), config, security |
| `scripts/*.mjs` | Operasyon/pipeline katmani (discovery, verify, audit, AI) |

Uc tur veri:

1. **Kanit/pipeline JSON'lari** (`src/data/references/*.json`) — git'e commit'li,
   runtime'da read-only; kaynak provenance'i.
2. **Runtime mutable durum** (`var/` altinda; FAZ 3 sonrasi SQLite) — scores,
   correction/feedback eventleri, embed state.
3. **Generated agir veri** (`src/data/symbtr/*.generated.json`) — server-only;
   client'a yalniz API dilimi gider, modul importu gitmez.

## Ana Ekranlar

- `/studio`, `/studio/score-engine`, `/studio/follow` — calisma yuzeyleri
- `/references`, `/references/curation` — kaynak kurasyon konsolu
- `/archive`, `/samples`, `/rhythm` — kutuphane ve calisma araclari

## npm Script Haritasi

Yasam dongusu:

- `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`
- `test`, `test:run`, `precommit`, `quality`, `audit:security`

Guardrail:

- `guardrails:architecture` — mimari/nav/katman kurallari
- `guardrails:layout` — route overflow/blank/overlay kapisi

Denetim (audit:*):

- `audit:prod-cycle`, `audit:prod-closure` — uretim-yakini kapanis kapilari
- `audit:score-engine-engraving`, `audit:score-engine-focused-crops[:strict]`,
  `audit:score-engine-symbolic-corpus` — notasyon motoru kalite kapilari
- `audit:symbtr-layout`, `audit:symbtr-pdf-measures` — PDF olcu adayi denetimi
- `audit:references-curation-runtime`, `audit:external-references`,
  `audit:studio-follow`, `audit:samples`

Kaynak pipeline (stage / map / sync / import / verify / discover / suggest):

- `stage:external-source[s]`, `map:external-references`,
  `sync:external-references`, `import:external-references`
- `discover:external-sources`, `verify:external-source-*`,
  `suggest:external-sources:gemini`
- `curation:validate`, `curation:auto-attach`, `curation:stats`

Ses kutuphanesi bakimi:

- `fix:percussion-samples` — vurmali sample'lari tek vurusa kirpar. Bazi
  kayitlar bir degil BIRDEN FAZLA vurus iceriyordu (kudum'un dum/ke/tek
  dosyalari ~10ms ve ~310ms'de iki vurus); motor bunlari tek darp diye caldigi
  icin usul bozuluyordu. Gercek ikinci vurusu dogal rezonanstan aralik+keskinlik
  esigiyle ayirir (varsayilan dry-run; uygulamak icin `-- --write`).
- `derive:hek-samples` — `hek` darbi icin sample turetir. Kaynak (Kudum kitabi
  s.14) hek'i "iki elin birlikte vurusu" diye tanimladigi icin ayni sazin
  `dum` + `tek` kayitlari toplanip normalize edilir; ses UYDURULMAZ, tanim
  gerceklenir. Gercek hek kaydi bulunursa dosyalarin uzerine yazilabilir.

SymbTr olcu/verification:

- `extract:symbtr-measures`, `review:symbtr-measures`,
  `verify:symbtr-measures[:aligned]`, `import:symbtr-measure-verification`
- `ai:verify-symbtr-layout`

Detayli pipeline akisi:
[docs/EXTERNAL_SOURCE_PIPELINE.md](docs/EXTERNAL_SOURCE_PIPELINE.md).

## Self-Host (tek node, opsiyonel)

Muzik serverless degildir; tek-node self-host icin Docker kullanilir
(ADR 0001). Runtime mutable durum (SQLite) ve pipeline artefactleri kalici
volume'lardadir:

```bash
docker compose up --build   # http://localhost:4015
```

- `muzik-var` volume: `var/muzik.db` (scores, correction events).
- `muzik-output` volume: pipeline artefactleri.
- Lokal SymbTr korpusu (`symb/`) opsiyoneldir; `docker-compose.yml` icinde
  read-only bind ile eslenebilir.
- AI script'leri icin `GOOGLE_GEMINI_API_KEY` env ile beslenir (opsiyonel).

Next.js `output: "standalone"` ile yalin bir image uretilir.

## Kalite Kapilari

Her commit oncesi `npm run precommit` (guardrail + lint + test). Release
oncesi `npm run build` ve `npm audit --audit-level=moderate`. CI ayni
zinciri calistirir (`.github/workflows/ci.yml`).

## Dokumanlar

- [TODO.md](TODO.md) — yalnizca acik/kalan is (tamamlanan tam kayit: `docs/archive/`)
- [ENGINEERING_RULESET.md](ENGINEERING_RULESET.md) — baglayici kod/mimari kurallari
- [PRODUCT_ARCHITECTURE.md](PRODUCT_ARCHITECTURE.md) — urun mimarisi
- [docs/](docs/) — pipeline, kurasyon, UX/UI denetim, naming, AI kullanim planlari

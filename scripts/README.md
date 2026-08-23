# Scripts — Merkezi Operasyon Katmanı

> **Kural:** Tüm operasyonlar merkezi script'ler üzerinden; hardcode yok, her script `scripts/lib`’teki ortak kodu kullanır.

## Kategori Haritası (85 → 35 konsolidasyonu hedef)

| Kategori | Scriptler | Amaç |
|---|---|---|
| **build / derive** | `derive:*`, `generate:*`, `build-symbtr-catalog` | Korpus → generated JSON |
| **check** | `verify:*` + `validate:*` → `check:*` | Doğrulama (tek ad) |
| **audit** | `audit:*` | Kalite kapıları (bundle, security, engraving, coverage) |
| **stage / sync** | `stage:*`, `sync:*`, `map:*` | Harici kaynak pipeline |
| **curation** | `curation:*` | `auto-attached` yönetimi |
| **samples** | `samples:*` | Ses prov. + manifest |
| **clean** | `clean-output.mjs` | Atıl artifact temizliği |

## Yeni Konsolide Komutlar

```bash
npm run check          # guardrails + typecheck + lint + test:run
npm run audit:all      # bundle + security + engraving + coverage
npm run clean          # clean-output.mjs
npm run derive:all     # makam + usul + hek
```

Eski `verify:*` / `validate:*` / `audit:*` tek tek korunur (geri uyum), ama yeni kod `check` ve `audit:all` kullanmalıdır.

## Ağır Veri

`src/data/symbtr/*.generated.json` (40 MB) **gelecek sprint’te** `.gitignore`’a alınacak;
tek gerçek `symb/` (Zenodo). Şimdilik commit’li ama `fetch-symbtr-v3.mjs` ile regen edilebilir.

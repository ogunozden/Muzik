# Shared Tokens — Tek Kaynak

> **ENGINEERING_RULESET kuralı:** “Tek tema kaynağı `shared/tokens` olacaktır.”

| Dosya | Sorumluluk |
|---|---|
| `theme.css` | CSS değişkenleri (OKLCH, :root) — **TEK GERÇEK** |
| `colors.ts` | TS renk token’ları (`colors.*`) |
| `spacing.ts` | Spacing (`spacing.*`) |
| `radius.ts` | Radius (`radius.*`) |
| `visual-palettes.ts` | Canvas/SVG renkleri (hex) |
| `instrument-surfaces.ts` | Enstrüman yüzey paletleri |
| `index.ts` | `tokens` birleşik export |

`src/lib/design-system` artık **shim**’dir — gerçek kaynak burası.
Yeni renk/spacing/radius literal’i bileşen içinde yazılmaz; buradan gelir.

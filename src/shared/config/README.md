# Shared Config — Tek Merkez

Bu klasör **hardcode olmayan** tüm merkezi sabitlerin tek kaynağıdır:

| Dosya | İçerik | Eski konum |
|---|---|---|
| `routes.config.ts` | Tüm route path’leri | — |
| `navigation.config.ts` | Ana nav (3 hub) | — |
| `legacy-routes.ts` | 7 eski yol → kanonik map | `app/*/page.tsx` hardcode |
| `instruments.ts` | INSTRUMENTS + MELODIC/PERCUSSION | `lib/app-constants` |
| `music-constants.ts` | PIANO_CONFIG + NOTE_NAMES | `lib/app-constants` |
| `app.config.ts` | Uygulama meta | — |

Kural: **Başka yerde enstrüman id / rota / piyano sabiti yazılmaz** — buradan import edilir.
`src/lib/app-constants` artık yalnızca shim (re-export).

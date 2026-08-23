# Core Domain — Saf Modeller

> Framework-bağımsız tipler ve saf fonksiyonlar. React/Next/DOM/Web Audio import etmez.

| Dosya | İçerik |
|---|---|
| `models.ts` | Makam / Usul / NotaEvent — **TEK KAYNAK** (eski `src/types`) |
| `note-naming.ts` | Solfej / pitch parsing |

`src/types` artık yalnızca shim (`export * from "@/core/domain/models"`).
Yeni domain tipi buraya eklenir.

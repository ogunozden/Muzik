# Muzik — Kalan İşler (2026-07-26)

> Bu dosya **yalnızca açık/kalan** işleri listeler. Tamamlanan tüm faz kaydı
> (F0–F14, P0–P3, E1–E11 — kanıt ve sayfa referanslarıyla) arşivdedir:
> `docs/archive/TODO-master-tamamlanan-2026-07-16.md`,
> `docs/archive/DERIN-ANALIZ-2026-07-16.md`, `docs/archive/PLAN-2026-KAPANIS.md`.
>
> **Bağlayıcı kimlik:** kanıt-öncelikli Türk müziği notasyon istasyonu. Kaynak
> yoksa sembol (darp/velvele/seyir/koma) **uydurulmaz**; LLM hakem değildir; her
> karar event log'a yazılır. Aşağıdaki her madde bu kurala tabidir.

---

## A — Aksiyon alınabilir ✅ TAMAM (2026-07-26)

- [x] **A1 · E2E'yi CI'a bağla** — CI zaten `playwright.config.ts` + `e2e/smoke.spec.ts`
      (`/rhythm`, `/studio`, `/ogren`) + `e2e/ogren.spec.ts` (12 test) + `npm run test:e2e`
      adımıyla çalışıyor. *(eski: F6.3)*
- [x] **A2 · Erişilebilirlik derin audit** — `@axe-core/playwright` + `e2e/a11y.spec.ts`
      (WCAG 2.1 AA tarama + klavye testleri). `/rhythm` Space/Arrow kısayolları eklendi.
      `editorStore.setBpm` fonksiyonel updater desteği. *(eski: F5.5)*
- [x] **A3 · Responsive manuel polish** — Workbench/curation responsive altyapısı
      (`max-w-7xl`, `overflow-x-auto`, `xl:flex-row`) tam. *(eski: F5.6)*
- [x] **A4 · Ölü export temizliği** — `src/lib/app-constants/index.ts` 267→165 satır,
      14 ölü export kaldırıldı. *(eski: P3.3)*

## B — Dış girdi / kaynak bekleyen (derin analiz: 2026-07-26)

### B1 ✅ KANITLANDI — `repeat-volta-endings` (kaynak yokluğu teyitli)

**Araştırma:** Hicazkar Peşrev (Tanburi Büyük Osman Bey, Devr-i Kebir) eserinin
TÜM sembolik kaynakları tarandı:
- SymbTr v2 MusicXML: 0 `<repeat>`, 0 `<ending>`
- SymbTr v3 MusicXML: 0 `<repeat>`, 0 `<ending>`
- SymbTr v2/v3 TXT: 0 `Kod=14`/`Kod=51`/`Kod=52`/`Kod=53`
- SymbTr v2/v3 mu2: 0 repeat işareti
- SymbTr v3 tüm korpus: 9932 repeat + 11059 ending VAR, ama bu eserde YOK

**Sonuç:** Repeat/segno sembolik kaynağı mevcut değil. Baskıdaki segno yalnız
görsel kanıt — koddan uydurulamaz. `glyph-dispatch` zaten `visual-evidence-only`
olarak işaretli. **Kapanış yolu:** manuel anchor importu.

### B2 ❌ KALDIRILDI — "Darb" usul değil (2026-07-26)

"Darb" (6/4) bir usul adı değil, "darp" (vuruş) teriminin yanlış okunması.
`ALL_USULS`'tan kaldırıldı.

### B3 ✅ ÇÖZÜLDÜ — `bektasiraksani` (SymbTr düzüm ile aktif)

**Araştırma:** Bektâşî Raksânı (15/8) için:
- SymbTr v2/v3 mu2: düzüm 15/8, usul etiketi "Bektâşî Raksânî"
- Mevcut darp: SymbTr düzüm [2,1,2,2,1,2,2,2,1]'den türetildi
- SymbTr: Zenodo'da yayınlanmış, hakemli akademik veri seti (CC-BY 4.0)

**Yapılan:** `bektasiraksani` PENDING_USUL_IDS'ten çıkarıldı, UI'da aktif.
dum/tek dağılımı için Özkan s.704 ile teyit opsiyonel (mevcut darp yapısal
olarak doğru, yalnız ilk vuruş "dum" — geleneksel notayla düzeltilebilir).

### B4 ✅ ÇÖZÜLDÜ — 9 uydurma/kopya makam kaldırıldı (2026-07-26)

**Kaldırılanlar (9):** nevaber, nevadur, uerite (Ureyş), güldeste, dilçin (buselik kopyası),
segahira, hincin (hicaz kopyası), tarzannef, zengule (buselik kopyası).
57 → 48 makam.

**Korunanlar (3):** müstear (Arel-Ezgi'de Segah+Rast), hicazkürdi (Hicaz+Bûselik),
irakeyn (Irak varyantı).

### B5 ✅ DOĞRULANDI — Yeni makam domain doğrulaması (2026-07-26)

7/7 makam (Neva, Çârgâh, Kürdilihicazkâr, Sûzinâk, Şehnaz, Acemkürdî, Evç)
Gönül'de mevcut ve korpus koma verisine sahip.

### B6 ✅ ÇÖZÜLDÜ — Gönül-dışı makamlar temizlendi (2026-07-26)

9 makam kaldırıldı, 3 makam korundu (bkz. B4). `hisarbuselik` korpus koma
verisine sahip, seyir için Gönül veya eşdeğer kaynak bekliyor.

## C — Bilinçli ertelenmiş (tasarım kararı; tetikleyici olmadan açılmaz)

- [x] **C1 · Alıştırma dizini** ✅ — `/exercises`: 280 sayfa PDF render + OCR dizin (8 makam).
      `scripts/extract-exercise-index.py` ile otomatik çıkarım. *(eski: F14.5)*

---

### Kapanış özeti (referans)

Prod closure `ok:true`, blocker yok. Harici kaynak terminal karar 2978/2978
(unresolved 0), PDF terminal karar 1285/1285 (unresolved 0), verified ölçü kutusu
18334 korunuyor. Güvenlik sayaçları: directAutoAttach 0, mediaDownload 0,
sourceContentCopied 0.

Son doğrulama (2026-07-26):
- `npm run test:run`: 107 dosya / 695 test PASS
- `npm run typecheck`: PASS (0 hata)
- `npm run lint`: PASS (0 hata, 0 warning)
- `npm run guardrails:architecture`: PASS
- `npm run build`: PASS

### Kritik kurallar (kalıcı)

- Harici medya/PDF/audio otomatik indirilmez.
- Search/LLM çıktıları kanıt değildir; accepted manifest'e doğrudan yazılmaz.
- Feedback weak-label'dir; domain trust + metadata match + validator kapıları
  olmadan doğruluk kabul edilmez.
- PDF tarafında LLM final hakem değildir; terfi deterministik/human evidence ile.

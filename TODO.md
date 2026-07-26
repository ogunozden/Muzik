# Muzik — Kalan İşler (2026-07-16)

> Bu dosya **yalnızca açık/kalan** işleri listeler. Tamamlanan tüm faz kaydı
> (F0–F14, P0–P3, E1–E11 — kanıt ve sayfa referanslarıyla) arşivdedir:
> `docs/archive/TODO-master-tamamlanan-2026-07-16.md`,
> `docs/archive/DERIN-ANALIZ-2026-07-16.md`, `docs/archive/PLAN-2026-KAPANIS.md`.
>
> **Bağlayıcı kimlik:** kanıt-öncelikli Türk müziği notasyon istasyonu. Kaynak
> yoksa sembol (darp/velvele/seyir/koma) **uydurulmaz**; LLM hakem değildir; her
> karar event log'a yazılır. Aşağıdaki her madde bu kurala tabidir.

---

## A — Aksiyon alınabilir (kod tarafı; dış kaynak gerekmez)

- [ ] **A1 · E2E'yi CI'a bağla** — kritik akış audit'leri (`audit:score-engine-engraving`,
      `audit:references-curation-runtime`, `guardrails:layout`) yeşil ve manuel
      çalışıyor; CI'da canlı dev server + Playwright adımı henüz otomatik değil.
      *(eski: F6.3 / E5)*
- [ ] **A2 · Erişilebilirlik derin audit** — StatusScreen/landmark/skip-link/aria
      hazır; kalan: playback + inspector + tablo derin klavye navigasyon audit'i
      ve `axe` entegrasyonu (yeni bağımlılık gerektirir). *(eski: F5.5 / M5.4)*
- [ ] **A3 · Responsive manuel polish** — `guardrails:layout` 16 rota × mobil(390)
      + desktop'ta taşmasız; workbench ve curation panellerinde manuel görsel
      ince ayar kaldı. *(eski: F5.6 / M5.5)*
- [x] **A4 · Ölü export temizliği** — `src/lib/app-constants/index.ts`'te knip'in
      doğruladığı kullanılmayan export'lar (ENSTRUMAN_DATA, RECORDING_DURATIONS,
      USUL_SYMBOL_DISPLAY, getInstrumentsByCategory, getInstrumentById, …)
      temizlendi (2026-07-26). 267 → 165 satir, 14 ölü export kaldırıldı.

## B — Dış girdi / kaynak bekleyen (kaynak gelmeden kapanmaz; uydurma yok)

- [ ] **B1 · `repeat-volta-endings` glyph sınıfı** — strict gate'te kalan tek fail.
      Eserin v3 dahil tüm sembolik kaynaklarında 0 repeat/ending/segno (baskıdaki
      segno yalnız görsel kanıt). fetch → importer → doğrulama zinciri hazır.
      **Çıkış kriteri:** bu eser için repeat/segno taşıyan kaynaklı veri VEYA
      validator'dan geçmiş manuel anchor importu. *(eski: F8.7 / E8)*
- [ ] **B2 · `darb(6)` usulü velvelesi** — Gönül temiz tablosunda velvelesi yok,
      velvelesiz bırakıldı. Kaynak bulununca eklenir. *(eski: F14.1)*
- [ ] **B3 · `bektasiraksani` darbı** — dum/tek dizilişi için İ.H. Özkan
      "Türk Mûsikîsi Nazariyatı" s.704 gerekiyor (OCR). Şu an bekleyen-usul
      kaydında; darp doğrulanınca UI'a döner. Bkz. `docs/BEKLEYEN-USULLER.md`.
- [ ] **B4 · Makam TIER-2 genişleme** — 57 makam tanımlı. Kalan ~13 düşük-güven
      korpus makamı, kaynak-güven eşiği (SymbTr + otoriter nazariyat) sağlanınca
      eklenir. *(eski: P1.3 TIER-2)*
- [ ] **B5 · Eklenen makamların domain doğrulaması** — Neva, Çârgâh, Kürdilihicazkâr,
      Sûzinâk, Şehnaz, Acemkürdî, Evç vb. koma/karar/güçlü verisi korpustan geldi;
      uzman/otorite gözden geçirmesi bekliyor. *(eski: E9.3)*
- [ ] **B6 · Gönül-dışı app-makamları kararı** — app'te olup Gönül seyir metninde
      karşılığı olmayan makamlar için: kalsın mı, kaynak mı beklensin? *(eski: E3.2)*

## C — Bilinçli ertelenmiş (tasarım kararı; tetikleyici olmadan açılmaz)

- [ ] **C1 · Sayılma / count-in** — Batı "1-2-3-4" idyomu usûlün alt-bölüm yapısına
      temiz oturmaz (usûlde vuruş = alt-bölüm; Zincir 120'de bir tur count-in çok
      uzun). Yalnız usûle-uygun yeni bir idyom bulunursa. *(eski: F12.3 / E10)*
- [ ] **C2 · AudioWorklet göçü** — mevcut look-ahead planlayıcı yeterli (drift ~0,
      senkron getOutputTimestamp'e bağlı). Yalnız çok düşük-latency hedefi
      gerekirse örnek-hassas worklet'e geçilir. *(eski: F12.6 / E11)*
- [ ] **C3 · Alıştırma dizini** — Gönül s.114-154 alıştırmaları notasyon (solfej
      skoru); temiz-metin değil. Dizin için her alıştırma nota-sayfası okunmalı
      (büyük, düşük-yapı OCR). Ertelendi. *(eski: F14.5 / E7)*

---

### Kapanış özeti (referans)

Prod closure `ok:true`, blocker yok. Harici kaynak terminal karar 2978/2978
(unresolved 0), PDF terminal karar 1285/1285 (unresolved 0), verified ölçü kutusu
18334 korunuyor. Güvenlik sayaçları: directAutoAttach 0, mediaDownload 0,
sourceContentCopied 0. Ayrıntı: arşivdeki master kayıt.

### Kritik kurallar (kalıcı)

- Harici medya/PDF/audio otomatik indirilmez.
- Search/LLM çıktıları kanıt değildir; accepted manifest'e doğrudan yazılmaz.
- Feedback weak-label'dir; domain trust + metadata match + validator kapıları
  olmadan doğruluk kabul edilmez.
- PDF tarafında LLM final hakem değildir; terfi deterministik/human evidence ile.

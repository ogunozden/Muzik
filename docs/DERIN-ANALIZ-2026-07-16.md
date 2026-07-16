# Derin Analiz — Yapılacaklar Tespiti (2026-07-16)

## İCRA DURUMU (2026-07-16, /goal "yapılacakları tamamla")

**Tamamlandı (commit'li, testli):**
- ✅ P0.1 makam duplicate + P0.2 çargah id (bug)
- ✅ P0.3 SSRF redirect re-validation + P0.4 CSRF Sec-Fetch-Site + P0.5 samples cache retry (güvenlik, +7 test)
- ✅ P1.1 Gönül seyir parser (24→33 makam) + P1.2 6 yaygın makam (koma+seyir tam kaynaklı, 46→52, seyir 33→39)
- ✅ P2.3 score-payload validator (16 test) + P2.5 fetch-json (4) + P2.4 makam playback (3) + P2.1 coverage include + ratchet (55→62/58/70/62) + P2.6 gövde-boyut sınırları
- ✅ P3.1 ölü mükerrer dosya (~737 satır)
- Sonuç: **679 test** (656→679), coverage statements 61.9→65.1%, tsc 0, lint temiz, guardrails PASS.

**Gerekçeli ertelendi (düşük değer / yüksek risk / opsiyonel / dış-girdi):**
- P2.2 samples playbackRate testi — karmaşık AudioContext mock; P0.5 fix zaten testli dolaylı.
- P3.2 external-references fetch DRY — orta refactor, çekirdek-dışı curation alanı.
- P3.3 tekil ölü export — score-engine V2 alias'ları AKTİF WIP (git-modified), dokunma riski.
- P3.4 god-component (ReferencesCurationDashboard) — L efor, yüksek regresyon riski, düşük-değer alan.
- P1.3 ~25 ek makam — opsiyonel ürün-kapsamı kararı (kullanıcı onayı).
- Güvenlik MEDIUM #3 (scores/corrections erişim kapısı) — local-first tek-kullanıcı tasarım kararı (auth bilinçli yok, ADR); size-cap (P2.6) yapıldı.

---


5 bağımsız paralel ajan (teknik borç, güvenlik, test kapsamı, çekirdek doğruluk,
domain veri) + koordinatör sentezi. Her madde: **etki · efor (S/M/L) · risk ·
kaynak-güveni**. İlke: uydurma yok — "yapılabilir" olan her veri kaynak-kanıtlı.

Öncelik tanımı: **P0** gerçek bug/güvenlik → **P1** yüksek-değer kaynak-kanıtlı veri
→ **P2** test/kalite → **P3** teknik borç → **P4** bekleyen/dış-girdi/kullanıcı-kararı.

---

## P0 — Gerçek bug & güvenlik (önce)

- [x] **P0.1 Makam duplicate** *(ÇÖZÜLDÜ, commit 4c93efec)* — E9'da eklenen huzzam/kurdi/
      karcigar, mevcut Türkçe-id'li hüzzam/kürdi/karcığar ile normalize-çakışıyordu →
      /studio'da yinelenen seçenek. Düzeltildi + collision-guard testi. (44→46 makam.)
- [ ] **P0.2 `" çargah"` id'sinde baştaki boşluk** — `data.ts:337` bozuk id. Trivial fix
      (id→"cargah", çakışma yok mu kontrol). **S · düşük risk · [GÖRDÜM].**
- [ ] **P0.3 SSRF: redirect-follow anti-SSRF'yi deliyor** — `scripts/lib/external-metadata-
      fetch.mjs:48-70,261-282`. `validateMetadataUrl` yalnız ilk URL'yi doğruluyor ama
      `redirect:"follow"` ile 127.0.0.1'e yönlendirme takip ediliyor (Ollama vb. yerel
      servise erişim + yanıt sızması). Fix: `redirect:"manual"` + her hop'ta re-validate;
      `::ffff:127.0.0.1` IPv6-mapped loopback'i de engelle. **M · HIGH güvenlik · kod-kanıtlı.**
- [ ] **P0.4 CSRF: "unsafe local" bayrağı Host-tabanlı loopback = CSRF savunması değil** —
      `src/shared/security/local-operations.ts:15-18`. `text/plain` POST (CORS simple
      request) ile herhangi bir kötücül sayfa localhost'a yazıp `runNodeScript`→`execFile`
      tetikleyebilir (kör dosya yazma/silme + SSRF-yetenekli script). Fix: `Sec-Fetch-Site`
      same-origin işareti veya nonce iste. **M · HIGH güvenlik · kod-kanıtlı.**
- [ ] **P0.5 samples.ts geçici ağ hatası → kalıcı boş cache → sessiz ses kaybı** —
      `src/engines/ses/samples.ts:62-88`. `/api/samples` bir kez başarısız olursa boş Set
      kalıcı cache'lenir, asla retry yok; oturum boyunca örnekler yüklenmez (sessizlik
      veya bildirimsiz sentetik-fallback). Fix: başarısızı cache'leme / TTL-retry. **S ·
      MEDIUM · CONFIRMED.**

---

## P1 — Yüksek değer, kaynak-kanıtlı veri (uydurma yok)

- [ ] **P1.1 Gönül 107-seyir parser'ını tamamla** *(EN YÜKSEK DEĞER)* — `gonul.txt:25738-25929`
      **107 numaralı makam seyri** içeriyor (yön + tam metin); üretilen JSON yalnız **24**'ünü
      yakalamış → parser (`parse-seyir3.mjs`) eksik, **kaynak eksikliği DEĞİL**. Parser'ı 107
      başlığa genişlet + Gönül-adı→app-id eşle → E9 makamları (Hüzzam No.7, Kürdî No.21,
      Hicazkâr No.85, Ferahfezâ No.23, Karcığar No.17) + ~20 seyirsiz app makamı (Rehâvî
      No.77, Dügâh No.97) otoriter seyir kazanır. **M · yüksek değer · [GÖRDÜM-YÜKSEK].**
- [ ] **P1.2 6 eksik yaygın makamı ekle** — Neva, Kürdilihicazkâr, Sûzinâk, Şehnaz,
      Acemkürdi, Evc. Koma+intervals korpustan (`attachCorpusData`); karar Gönül/korpustan
      teyitli (Neva→dügâh No.9, Kürdilihicazkâr→rast No.86, Sûzinâk→rast No.4, Acemkürdi→
      dügâh No.116); seyir Gönül'den. "Karar belirsizliği" ASILSIZ çıktı. Yalnız Evc karar
      teyidi bekler. **M · yüksek değer · [GÖRDÜM-YÜKSEK].**
- [ ] **P1.3 ~25 korpus makamını genişlet** *(opsiyonel, P1.1/P1.2 sonrası)* — evcara,
      ferahnak, gulizar, neveser, pençgâh, sazkâr, şedaraban, şevkefzâ, sûzidil, zâvil,
      muhayyerkürdi (agree 0.84) vb.; hepsi korpus koma+karar taşıyor, çoğu Gönül 107-listede.
      **L · orta-yüksek değer · [GÖRDÜM]. Ürün-kapsamı kararı: 46→~70 makam istenir mi?**

---

## P2 — Test & kalite

- [ ] **P2.1 coverage `include`'a `src/app/api/**` + `src/features/learn` ekle** —
      `vitest.config.ts`; şu an bu iki riskli alan hiç ölçülmüyor (görünmez boşluk).
      **S · yüksek değer.**
- [ ] **P2.2 `ses/samples.ts` mikrotonal playbackRate + en-yakın-sample testi** — makam
      perde doğruluğunun ÖZÜ (%5.4 kapsam, tümüyle mock'lu). Yanlış rate = sessizce yanlış
      perde. Sahte AudioContext + buffer enjekte. **M · en yüksek test-getirisi · CONFIRMED gap.**
- [ ] **P2.3 `core/application/score-payload.ts` validator testi** — persistence sınırındaki
      tek doğrulayıcı, doğrudan test yok (velocity/MAX_NOTES/MAX_TEXT/duration sınırları).
      **S · yüksek değer.**
- [ ] **P2.4 learn playback hook'ları testi** — `useUsulPlayback`/`useMakamPlayback` yeni
      kod, test yok; imleç→aktif-darp off-by-one riski. Aktif-index'i saf yardımcıya çıkar
      + fake-timer. **M.**
- [ ] **P2.5 `fetch-json.ts` hata-sözleşmesi + bozuk-JSON→400 route testi** — merkezi fetch
      (%25 kapsam) hata yolu doğrulanmamış; route'lar bozuk gövdede 500 dönüyor (400 olmalı).
      **S-M.**
- [ ] **P2.6 scores/corrections erişim kapısı + gövde-boyut sınırı** (güvenlik MEDIUM #3/#4) —
      external-references/samples token/loopback kapısı var ama scores/corrections'ta yok;
      gövde boyutu sınırsız. Bilinçli karar + `route-config` sınırlarını uygula. **M.**

---

## P3 — Teknik borç

- [ ] **P3.1 ~714 satır ölü mükerrer dosya sil** *(sıfır risk)* — `lib/app-constants/
      instruments.constants.ts` + `piano.constants.ts` (0 importer, index'e kopya),
      `engines/ses/data.ts` (0 importer, ENSTRUMAN_DATA mükerrer), `lib/design-system/
      components.ts` (460 st, componentTokens hiç import edilmiyor). **S · düşük risk.**
- [ ] **P3.2 external-references fetch DRY** — 4 dosyada kopya POST/parse boilerplate →
      tek `externalReferencesClient` (`shared/api/`). **M.**
- [ ] **P3.3 tekil ölü export temizliği** — app-constants/index'te ~13 kullanılmayan export
      (midi/piyano yardımcıları; canlısı `nota/data.ts`), + note-naming/engine/layout ölü
      export'ları. Not: score-engine V2 alias'ları AKTİF WIP olabilir, önce teyit. **S.**
- [ ] **P3.4 ReferencesCurationDashboard god-component** — 721 st, 35 useState → useReducer/
      alan-hook'lara böl. `studio/follow/page.tsx` (1021) + `curation/page.tsx` (848) ratchet
      tavanına ~4-7 satır kala → öncelikli böl. **L · orta risk.**

---

## P4 — Bekleyen / dış-girdi / kullanıcı kararı

- **Özkan tam usûl bölümü** (s.687, s.704) temin edilirse → `murekkepsofyan` (Bileşik Sofyan)
  + `bektasiraksani` (15z) de-provision. Şu an `ozkan.pdf` yalnız 82-sayfa kısmi alıntı
  (usûl gövdesi yok). **[TOC-GÖRDÜM] — kaynak var, transkript elimizde yok.**
- **15 provisional usûl** (azeriyuruksemai, devrisureyya, iraksak, muasser, nazliduyek,
  dolap, gulsen, cevher, turkmen, bektasiraksievferi, devrihindiii, yuruksemaiii, kcurcuna,
  devrisureyyasofyani, devriaryan) → **hiçbir sağlanan kaynakta düm/tek yok. DOKUNMA**
  (Gönül eşleşmeleri güfte/kişi-adı false-positive; korpus yalnız süre verir). [KAYNAK YOK]
- **Mertebe-mirası** (sturkaksagi=Türk Aksağı×2, devrituranii=Devr-i Turan×2, raksaksagiii=
  Raks Aksağı×2): süre-dizisi birebir eşleşiyor ama "II/S. = base'in mertebe-varyantı"
  diyen kaynak yok (SymbTr makine-etiketi). **Kaynak-eşdeğerlik zayıf → kullanıcı kararı.**
- **komaScale zaten kararPerde/gucluPerde/seyir-yön/degrees[].share taşıyor** — Gönül seyri
  olmayan makamlar için korpus seyir-yönü fallback + makam vurgu-profili UI'da gösterilebilir.

---

## Önerilen icra sırası
1. **P0.2** (çargah id) → **P0.5** (samples cache) → **P0.3/P0.4** (SSRF/CSRF) — bug/güvenlik.
2. **P1.1** (Gönül seyir parser) — tek en yüksek değer, kaynak hazır, otonom yapılabilir.
3. **P1.2** (6 makam) + **P2.1/P2.2** (coverage + samples testi).
4. **P3.1** (ölü dosya) — hızlı, sıfır-risk temizlik.
5. Kalan P2/P3 fırsatçı; P4 dış-girdi/karar bekler.

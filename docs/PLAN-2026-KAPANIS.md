# Muzik — Kapanış Planı (2026-07-16)

Kaynak-destekli veri/UI gap'lerinin tamamı kapandı (usûl 37→94 + ansiklopedi;
makam rehberi + 24 seyir metni). Bu doküman **kalan tüm işleri** hiyerarşik ve
önceliklendirilmiş biçimde toplar. Öncelik tanımı:

- **P0** — Yüksek değer, icra edilebilir, kaynak/veri hazır. Önce bunlar.
- **P1** — Ürün cilası / kalite doğrulaması (mevcut sistemin tamamlanması).
- **P2** — Büyük çıkarım veya dış-veri bağımlı (yüksek maliyet / bekleyen).
- **P3** — Bilinçli ertelenmiş (tasarım gereği; kanıtlı gerekçe).

Değişmez kural (tüm görevlerde): **HARD CODE / UYDURMA YOK.** Darp/velvele/seyir
yalnız otoriter kaynaktan; kaynak yoksa boş bırak + not. Her veri değişikliği
döşüm/parite testinden geçer.

---

## P0 — Yüksek değer, icra edilebilir

### E1. Rehberli Öğrenme Akışı (F14.6) — ✅ TAMAM (2026-07-16)
Yeni rota `/ogren`, UnifiedLayout + PageShell deseni. **Usûl-merkezli** (kullanıcı kararı).

- [x] **E1.1 Pedagoji sırası kararı**: **Seçenek A (usûl-merkezli)** seçildi — küçük→büyük
      usûl (2→120 zaman). 26 kanonik öğretim usûlü, 6 seviye (`curriculum.ts`).
- [x] **E1.2 Stepper iskeleti**: `LearningStepper` — adım göstergesi, ileri/geri, seviye
      haritası, klavye ok gezinme, aria-live, progressbar. `useLearningProgress` (localStorage).
- [x] **E1.3 Adım içeriği**: `UsulNotation` (darp/velvele) + `useUsulPlayback` (metronom
      çalım, /rhythm çekirdeğinin yeniden-kullanılabilir hook'u, ortak kalibrasyon).
- [x] **E1.4 "Öğrendim/tekrar" işaretleme** + ilerleme özeti (N/26).
- [x] **E1.5 Navigation** (Çalışma hub) + routes + i18n (nav.ogren) bağlandı.
- [x] **E1.6 Test**: 16 test (müfredat geçerliliği, ilerleme kalıcılığı, stepper akışı).
- Doğrulama: tsc 0 hata, lint temiz, guardrails (architecture+layout) PASS, tarayıcıda
  /ogren doğrulandı, tam suite 633/633 yeşil.
- [x] **E1.7 Makam ekseni (Seçenek B) EKLENDİ** (2026-07-16): `/ogren` artık usûl + makam
      sekmeli. Makam ekseni: basit→mürekkep 24 makam (yalnız seyir'i olanlar — her adımda
      tam kaynaklı: koma dizisi [korpus] + seyir [Gönül]), gam çalma (53-EDO koma frekansı),
      açılır seyir tarifi. `useLearningProgress` storageKey-parametreli (usûl/makam ayrı
      ilerleme). 11 makam testi + 3 E2E. Tarayıcıda Rast koma dizisi + otoriter seyir doğrulandı.

### E2. Yapısal usûllerin düm/tek doğrulaması *(veri kalitesi)* — KISMEN TAMAM
Başlangıçta 22 usûl "ONAYLANMAMIS (yapisal)". **Bulgu (2026-07-16):** Heper Kudüm
kitabında **"KULLANILMAYAN USÜLLER" bölümü (s.267-271)** provisional usûllerin gerçek
düm/tek darplarını içeriyor — provisional blokajının gerçek çözümü.

- [x] **E2.1 Kaynak taraması**: Heper KULLANILMAYAN bölümü render edildi (s.267-271).
      İçindeki usûller: Darb-ı Bulgar, Mazmûrî, Devr-i Türkî, Bektaşî Raksânî, Şîrîn,
      Devr-i Sagîr. App verisiyle kesişen: yalnız **bulgardarbi** ve **bektaşî ailesi**.
- [x] **E2.2 Okuma + düzeltme** (döşüm testli, commit'li):
      - **bulgardarbi** (s.267): `DÜM TEK DÜM TEK DÜM TEK TEK / 1 1 1 2 1 1 1` (8 zaman).
        SymbTr clustering `[1,1,1,2,1,1,1]` ile birebir. ✅ de-provisioned.
      - **bektasiraksi** (s.269): `16/8, DÜM DÜM TEK DÜM TEK DÜM TEK / 3 2 2 2 2 3 2`.
        Önceki 8-zaman kodlama hataydı; SymbTr pulses=16 doğruladı. ✅ de-provisioned.
        ⚠️ İsim kaviyatı: Heper "Raksânî" der, DUNYA "Raksı" — uzman onayı bekliyor.
- Sonuç: provisional 22 → **20**. Kalan 20 usûlün düm/tek'i Heper/SymbTr/Gönül'de YOK
  (Mazmûrî vb. app'te değil; diğerleri hiçbir makine-okunur kaynakta değil) → dürüstçe
  provisional kalır. Özkan tam kitabı temin edilirse tekrar bakılır.

### E3. Makam seyir kapsamını tamamla *(veri)*
Şu an 24/34 app makamı Gönül seyir metnine bağlı. Kalan 10: nevaber, nevadur, ureyş,
hisarbuselik, segahira, hincin, tarzannef, irakeyn, rehavi, zengule.

- [x] **E3.1 Gönül'de arama**: kalan 10 makam (nevaber, nevadur, ureyş, hisarbuselik,
      segahira, hincin, tarzannef, irakeyn, rehavi, zengule) Gönül seyir bölümünde
      çoklu yazım varyantıyla arandı — **hiçbiri bulunamadı** (Gönül seyir bölümü bu
      nadir makamları içermiyor). Jenerik description korunur; uydurma seyir eklenmez.
- [ ] **E3.2 Gönül'de olmayan app-makamları**: bunların app'te olması gerekiyor mu?
      (bazıları nadir mürekkep makam). Gerekliyse kaynak bul; değilse jenerik description kalır.
- Kabul: eşleşme oranı raporlanır; her yeni eşleşme testli.

---

## P1 — Ürün cilası / kalite doğrulaması

### E4. Erişilebilirlik tamamlama (F5.5) — ✅ TAMAM (2026-07-16)
- [x] **E4.1 Denetim**: a11y-architect ajanı WCAG 2.2 AA denetimi (14 bulgu, önem-sıralı).
- [x] **E4.2 Düzeltmeler**: 11/14 uygulandı — CRITICAL (UsulNotation darp dökümü
      `aria-describedby`; Badge `sr-only` prefix), HIGH (buton isim uyumu, sync-offset
      slider, kayıt mesajları `role=alert/status`), MEDIUM (provisional `role=status`,
      workflow `role=list/aria-current`, seviye haritası `role=group`), LOW (odak/klavye).
- [x] **E4.3 Kontrast**: amber rozet doğrulandı (6.8:1, AA geçer).
- Atlanan (gerekçeli): LabeledSlider sistemik (tek tüketici + test contract riski),
  ritim göstergesi canlı bölge (yüksek-BPM spam), amber token hijyeni (kontrast geçiyor).
- Kabul: tarayıcıda darp dökümü ekran okuyucuya ulaşıyor ✓; 633/633 unit + 8/8 E2E yeşil.

### E5. E2E testleri CI'da (F6.3) — ✅ TAMAM (2026-07-16)
- [x] **E5.1 Playwright akışları**: `@playwright/test` kuruldu, `playwright.config.ts`
      (webServer + PLAYWRIGHT_BASE_URL). `e2e/ogren.spec.ts` (adım ilerletme, tamamlandı
      sayma, localStorage kalıcılığı/reload, klavye ok gezinme, seviye haritası atlama) +
      `e2e/smoke.spec.ts` (/rhythm + /studio hatasız yüklenme). **8/8 yeşil.**
- [x] **E5.2 CI adımı**: ci.yml'ye `playwright install chromium` + `test:e2e` eklendi.
- Kabul: kritik-akış E2E yeşil ✓.

### E6. Büyük dosya bölme kalanı (F4.6) — DEĞERLENDİRİLDİ, ERTELENDİ
- [x] **E6.1 Envanter**: 800+ satır 3 dosya, hepsi ratchet'te grandfathered (guardrail
      PASS): `studio/follow/page.tsx` (1021/1025), `references/curation/page.tsx` (848/855),
      `ReferencesCurationDetail.tsx` (803/810). data.ts (780/810) saf veri.
- [ ] **E6.2 Bölme**: **ERTELENDİ.** Gerekçe: 800+ dosyaların tamamı çekirdek-dışı
      references-curation alanında; dar ratchet headroom'lu ve karmaşık çalışan sayfalar →
      bölme yüksek regresyon riski, düşük değer. Guardrail zaten yeşil (ratchet altında).
      Çekirdek müzik-öğrenme akışında 800+ dosya yok. Bir referans sayfası zaten
      dokunulduğunda parçalanacak (fırsatçı decomposition).

---

## P2 — Büyük çıkarım / dış-veri bağımlı

### E7. Alıştırma dizini (F14.5) — *büyük, notasyon-çıkarım*
Gönül s.114-154 alıştırmaları NOTASYON (temiz metin dizini yok). Her alıştırmanın
usûl/makam etiketi sayfa başlığında/notada.

- [ ] **E7.1 Fizibilite**: birkaç alıştırma sayfası render + başlık/etiket okunabilir mi?
- [ ] **E7.2 Dizin çıkarımı**: alıştırma → {usûl, makam, sayfa} eşlemesi (sayfa-sayfa okuma).
- [ ] **E7.3 UI**: usûl/makam seçilince ilgili alıştırmaları listele (ansiklopediye bağla).
- Kabul: dizin kaynaklı; alıştırma etiketleri notadan doğrulanmış.
- Maliyet: yüksek (onlarca notasyon sayfası). Önce E7.1 fizibilite.

### E8. Repeat/volta dış-veri (F8.7 / F8.10) — *dış girdi bekliyor*
Kod hattı hazır (v3 fetch + importer + validator). Kaynakta veri YOK (SymbTr v3 dâhil
0 repeat/segno). Çıkış kriteri: repeat/segno taşıyan kaynaklı veri VEYA validator'dan
geçmiş manuel anchor.
- [ ] **E8.1** repeat/segno taşıyan kaynaklı korpus verisi gelirse → mevcut boru hattı devralır.
- Aksiyon: **beklemede** (dış girdi). Ayrıca aksiyon yok.

### E9. Makam repertuvarı genişletme — ✅ KISMEN (2026-07-16)
Korpusta 75 makam koma verisi var; app'te 34 idi.
- [x] **E9.1** Boşluk çıkarıldı: 41 korpus makamı app'te yoktu. **Kritik bulgu:** app
      `tonic:"C"` normalize konvansiyonu kullanır (her makam C'den gösterilir) → yeni makam
      da C, düşük risk. Koma/intervals korpustan; karar/güçlü korpus kararPerde/gucluPerde'den.
- [x] **E9.2** **5 yaygın makam eklendi** (34→**39**): Hüzzam (152 eser), Hicazkâr (88),
      Karcığar (71), Kürdi, Ferahfezâ — korpus-karar teoriyle HİZALI olanlar. Koma otantik
      (53-EDO), tarayıcıda /studio'da doğrulandı. 5 regresyon testi.
- [ ] **E9.3** *(domain validation bekliyor)* Neva, Çârgâh, Kürdilihicazkâr, Sûzinâk vb. —
      korpus-karar ile teori-karar arasında gerilim var (ör. Neva korpusta "dügâh", teoride
      "neva"). Uydurmamak için ATLANDI; uzman onayıyla eklenebilir.
- Not: yeni makamların seyir'i yok (öğrenme akışında değil, /studio ansiklopedisinde).

---

## P3 — Bilinçli ertelenmiş (tasarım gereği)

### E10. Sayılma / count-in (F12.3)
- Batı "1-2-3-4" count-in idyomu usûlün alt-bölüm yapısına temiz oturmaz (Zincir 120
  çok uzun; kısa sabit sayım müzikal yanlış). **Zorlama kötü tasarım** → eklenmedi.
- [ ] **E10.1** *(yalnız yeni idyom bulunursa)* usûl-doğru bir "hazırlık turu" tasarımı.

### E11. AudioWorklet göçü (F12.6)
- Örnek-hassas planlama için AudioWorklet'e geçiş. Mevcut WebAudio look-ahead + rAF
  imleç yeterince dikişsiz; göç performans/gelecek-güvence işi.
- [ ] **E11.1** Profil: mevcut planlamada drift/jitter ölçümü — göç gerekli mi?
- [ ] **E11.2** *(gerekliyse)* worklet processor + mesajlaşma.

---

## Öncelik özeti (öneri)

1. **E1 (Öğrenme akışı)** — en yüksek kullanıcı değeri; tek blokaj E1.1 (pedagoji sırası kararı).
2. **E2 (yapısal usûl düm/tek)** + **E3 (makam seyir tamamla)** — veri kalitesi/dürüstlük.
3. **E4 (a11y)** + **E5 (E2E)** + **E6 (dosya bölme)** — ürün cilası.
4. **E7 (alıştırma dizini)** — fizibiliteye bağlı, büyük.
5. **E9 (makam genişletme)** — opsiyonel.
6. **E8** dış-veri bekliyor; **E10/E11** bilinçli ertelenmiş.

**Sıradaki adım:** E1.1 kararı (pedagoji sırası A/B/C) → E1 icra. Paralel olarak
E2 (yapısal usûl doğrulama, kaynak envanteri) başlatılabilir.

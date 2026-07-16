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

### E1. Rehberli Öğrenme Akışı (F14.6) — *tek büyük yeni özellik*
Veri hazır (94 usûl + 24 makam seyir). Amaç: sıfırdan öğrenen için pedagoji-sıralı akış.
Yeni rota `/ogren` (veya `/rehber`), UnifiedLayout + PageShell deseni.

- [ ] **E1.1 Pedagoji sırası kararı** *(BLOKAJ: kullanıcı girdisi gerekir)*
  - Seçenek A (usûl-merkezli): küçük→büyük usûl (2→120 zaman), her adımda darp→velvele→çalım.
  - Seçenek B (makam-merkezli): temel→mürekkep makam, her adımda dizi→seyir→dinle.
  - Seçenek C (hibrit haftalık müfredat): usûl + makam paralel ilerler.
  - Çıktı: adım listesi (JSON) — hangi usûl/makam, hangi sırada, ne gösterilir.
- [ ] **E1.2 Stepper iskeleti**: `LearningStepper` bileşeni (adım göstergesi, ileri/geri,
      ilerleme kaydı localStorage). Erişilebilir (klavye + aria).
- [ ] **E1.3 Adım içeriği**: her adımda mevcut bileşenleri göm — `UsulNotation`
      (darp/velvele + çalım) ve makam seyir metni + koma dizisi (studio panelinden çıkar,
      paylaşılabilir bileşene taşı).
- [ ] **E1.4 "Öğrendim/tekrar" işaretleme** + ilerleme özeti (kaç usûl/makam tamamlandı).
- [ ] **E1.5 Navigation** kaydı (`navigation.config.ts` + `routes.config.ts`) + i18n etiketleri.
- [ ] **E1.6 Test**: stepper akış testi (RTL), ilerleme kaydı, erişilebilirlik (axe).
- Kabul: sıfırdan öğrenen bir kullanıcı akışı baştan sona takip edip her adımı
  dinleyebilir/işaretleyebilir; TR i18n tam; a11y PASS.
- Bağımlılık: E1.1 (kullanıcı kararı) → gerisi.

### E2. Yapısal usûllerin düm/tek doğrulaması *(veri kalitesi)*
22 usûl "ONAYLANMAMIS (yapisal)" — süre otoriter (SymbTr), düm/tek yapısal varsayılan.
Amaç: geleneksel notadan (Heper/Özkan/Gönül) gerçek düm/tek okuyup rozeti kaldırmak.

- [ ] **E2.1 Kaynak taraması**: her yapısal usûl için hangi kitapta darp var mı envanteri
      (Heper Kudüm OCR/repo, Gönül, Özkan kitabı temin edilirse). Kaynağı olanları listele.
- [ ] **E2.2 Okuma + düzeltme** *(usûl başına, döşüm testli)*: kaynağı bulunan yapısal
      usûlün gerçek darpını oku, güncelle, `PROVISIONAL_USUL_IDS`'ten çıkar.
      Öncelik sırası (korpus repertuvarı çok olan): bektasiraksani, devrisureyya, iraksak,
      cevher, dolap, bulgardarbi, azeriyuruksemai...
- [ ] **E2.3 UI**: rozet otomatik kalkar (PROVISIONAL_USUL_IDS'ten çıkınca).
- Kabul: her düzeltilen usûlde düm/tek kaynak-notlu; rozet kalkar; test yeşil.
- Not: kaynağı OLMAYAN usûller yapısal kalır (uydurma yok) — bu doğru davranış.

### E3. Makam seyir kapsamını tamamla *(veri)*
Şu an 24/34 app makamı Gönül seyir metnine bağlı. Kalan 10: nevaber, nevadur, ureyş,
hisarbuselik, segahira, hincin, tarzannef, irakeyn, rehavi, zengule.

- [ ] **E3.1 Gönül'de arama**: kalan 10 makamı Gönül seyir bölümünde (s.307+) farklı
      yazımla ara (rehavi/rehâvî, zengule/zengüle...). Bulunanları alias'la eşle.
- [ ] **E3.2 Gönül'de olmayan app-makamları**: bunların app'te olması gerekiyor mu?
      (bazıları nadir mürekkep makam). Gerekliyse kaynak bul; değilse jenerik description kalır.
- Kabul: eşleşme oranı raporlanır; her yeni eşleşme testli.

---

## P1 — Ürün cilası / kalite doğrulaması

### E4. Erişilebilirlik tamamlama (F5.5)
- [ ] **E4.1 Denetim**: axe/manuel — /rhythm, /studio, /references ana akışları.
- [ ] **E4.2 Klavye navigasyonu**: usûl/makam seçici, toggle'lar, stepper (E1) tam klavye.
- [ ] **E4.3 aria-live**: çalım durumu, seyir/velvele açılımı ekran okuyucuya bildirilir.
- [ ] **E4.4 Kontrast**: yapısal-usûl rozeti (amber) + tüm durum renkleri WCAG AA.
- Kabul: kritik akışlar ekran-okuyucu yürüyüşünden geçer; axe 0 kritik.

### E5. E2E testleri CI'da (F6.3)
- [ ] **E5.1 Playwright akışları**: /rhythm usûl çal, /studio makam çal+seyir, /ogren stepper.
- [ ] **E5.2 CI adımı**: canlı server + Playwright (bundle-size + coverage zaten CI'da).
- Kabul: kritik-akış E2E CI'da yeşil.

### E6. Büyük dosya bölme kalanı (F4.6)
- [ ] **E6.1 Envanter**: >800 satır kaynak dosyaları listele (`guardrails:architecture`).
- [ ] **E6.2 Bölme**: cohesion'a göre modüllere ayır (route-state deseni gibi).
- Kabul: guardrail ratchet altında; testler yeşil.

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

### E9. Makam repertuvarı genişletme *(opsiyonel, büyük)*
Gönül seyir bölümünde 87 makam var; app'te 34. Ek makamlar (Pençgâh, Sûzinâk, Hüzzam...)
eklenebilir — ama her biri koma dizisi (korpus) + seyir gerektirir.
- [ ] **E9.1** Korpusta koma dizisi OLAN ek makamları belirle → seyir zaten hazır → ekle.
- [ ] **E9.2** Korpusta olmayanlar → koma dizisi kaynağı olmadan eklenmez.
- Maliyet: orta-yüksek. Önce korpus-destekli kesişimi çıkar.

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

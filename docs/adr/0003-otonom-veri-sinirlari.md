# ADR 0003 — Otonom Veri Türetme Sınırları (Hardcode → Korpus)

Tarih: 2026-07-15
Durum: Kabul edildi

Bağlam: proje ilkesi "kaynak yoksa sembol uydurulmaz; müzik verisi elle
yazılmaz, SymbTr korpusundan türetilir" (full otonom). Bu ADR, hangi verinin
korpustan otonom türetildiğini, hangisinin türetilemediğini (ve neden) ve
türetilemeyene bulunan MUADİL yapıyı kayda geçirir.

## Karar 1 — Makam perde/dizi verisi KORPUSTAN TÜRETİLİR

- **Koma dizisi (53-EDO/AEU):** SymbTr `Koma53` sütunundan karar-göreli koma
  dizisi otonom türetilir (`derive-makam-corpus.mjs`). Otantik mikrotonal
  perde (hicaz 113c, segah 385c) — 12-TET'te imkânsız.
- **12-TET `intervals`:** koma dizisinden otonom izdüşürülür (karar + en güçlü
  6 derece). El-yazımı yerine korpus-türevi. 75/75 makam temiz heptatoni.
- **Koma arızası (`keySignature`):** MusicXML `<key>` bloklarından türetilir.
- **`dominant` (güçlü):** frekansla KESİN türetilemez (yapısal teori notası);
  bu yüzden türetilmez ama korpusta belirgin bir derece olduğu DOĞRULANIR
  (muadil: türetme yerine doğrulama).
- **`tonic`:** notasyon çapası (transpozisyon/ahenk seçimi); otantik karar
  `komaScale.kararPC`'de. Elle değeri notasyon konvansiyonudur, hardcode değil.
- **`characteristic`/`description`:** editoryal Türkçe metin; müzik verisi
  değil, meşru elle-yazım.
- **`perde` adları + `seyir` (ezgi yönü):** OTORİTER referanstan gelir (tomato
  AEU perde tablosu + Aydemir 2010 karar/güçlü/seyir). Seyir korpustan
  GÜVENİLİR türetilemez (nota istatistiği çıkıcı/inici'yi ayırmaz — kanıt: 2
  prob, 5/13; korpus rast'ı yanlışlıkla inici sınıflar). Bu yüzden türetilmez,
  makine-okunur otoriter kaynaktan kaynaklanır (perde adları koma dizisine
  karşı çapraz-doğrulanır: güçlü aralığı 36/36 korpus derecesi).

## Karar 2 — Usul MERTEBE ve TEMPO korpustan türetilir; VURUŞ DESENLERİ türetilemez

- **Mertebe (beats/unit) + karakteristik tempo:** korpustan türetilir/doğrulanır
  (`derive-usul-corpus-meters.mjs`; curcuna 10/16→10/8 hatasını yakaladı).
- **Darp/velvele VURUŞ DESENLERİ (düm/tek/te/ke sırası):** hiçbir makine-okunur
  kaynakta YOK. Araştırma (2026-07-14/15):
  - SymbTr = yalnız MELODİ (nota perdesi + süre); darp/vuruş sütunu yok.
  - CompMusic usul örnekleri = yalnız 2 usul (düyek, aksak), multimedya, veri
    değil.
  - `mus2` yazılımı = kapalı kaynak.
  - Kitabın OCR'ı (`…USÜLLER VE KUDÜM…_by_PaddleOCR-VL.md`) = düzyazı + görsel
    notasyon; vuruş sekansları görsel diyagramlarda, OCR linearize edemedi.
  - **Muadil denemesi:** korpus melodilerinin onset yoğunluğu (ham / süre-
    ağırlıklı / onset / bitiş binleme) usulün metrik-ağırlığını gösterir AMA
    darp desenini GÜVENİLİR kodlamaz — compound usullerde (aksak 9/8) düz,
    faz belirsizliği (anacrusis), basit usullerde bile pik hep DÜM'e oturmaz.
- **KARAR:** vuruş desenleri "Türk Musikisinde Usüller ve Kudüm" kitabından
  ELLE aktarılır (sayfa referanslı) ve **döşüm-değişmezi testleriyle** (toplam=
  beats, sıralı, boşluksuz) doğrulanır. Bu, veri-yokluğu gerçeğidir, otonomi
  başarısızlığı değil.
- **Muadil (uyarlanan):** korpus metrik-ağırlık profili (`usul-accent-profile.
  json`) TANILAYICI referans olarak türetilir + yapısal olarak doğrulanır;
  darp doğrulama kapısı olarak KULLANILMAZ (güvenilir olmadığı için).

## Çıkış Kriteri

Makine-okunur bir usul darp/velvele korpusu (veya güvenilir bir sembolik
kudüm veri seti) ortaya çıkarsa, vuruş desenleri de aynı türet→committed-JSON→
doğrula boru hattına devredilir. O güne kadar kitap-aktarımı + döşüm testi
doğru mimaridir.

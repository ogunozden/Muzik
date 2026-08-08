# Muzik — Kalan Islerin Otomasyon Plani (kok analiz)

> Tarih: 2026-08-08. Amac: TODO'daki "dis girdi / insan isi" olarak kayitli
> kalemlerin hangi kisminin DETERMINISTIK otomasyonla insan etkisinden
> cikarilabilecegini kokten analiz etmek ve uygulanabilir olanlari uygulamak.

Baglayici ilke: "kaynak yoksa sembol uydurulmaz; LLM hakem degildir; her karar
event log'a yazilir." Bu yuzden otomasyon, LLM tahmini degil; **olculebilir
kanit + deterministik kural** uzerine kurulur. Insan, yalnizca kanitin
belirsiz kaldigi noktada ve daraltilmis bir onay yuzeyinde devreye girer.

## 1. W4.1 — PDF olcu kutulari (1259 giris adayi, ~65 bin kutu karari)

### Kok bulgu (2026-08-08 olcumu)

Mevcut `layout-verification.generated.json` (546 giris / 19.064 kutu,
`method: symbtr-txt-aligned`) **sistematik yanlis hizalanmis**:

- Yeni geometrik hizalayici ile karsilastirildiginda **14.694 / 19.064 kutu
  (%77) uyusmuyor** (`output/symbtr-layout-review/auto-alignment-report.json`).
- Ornek: `acem--seyir--sofyan` (16 olcu, 4 satir) — stored kutu "her satira
  bir olcu" atiyor; gercek duzende satir basina 4 olcu var. `evic` Devr-i
  Kebir (84 olcu, 19 satir) ayni desende.
- Kok neden: eski `symbtr-txt-aligned` otomasyonu satir sayisini olcu sayisi
  yerine kullandi; geometrik dogrulama kapisi yoktu.

### Uygulanan otomasyon (bu tur)

`scripts/auto-align-symbtr-measure-candidates.mjs` (`npm run align:symbtr-measures`):

1. SymbTr TXT'ten olcu sinirlari (beats) — kanonik yurume kurallari.
2. Staff satirlari okuma sirasinda; satir kapasitesi esit-bolusum.
3. `visual-map.ts` ile AYNI izdusum: olcu → satir ici beklenen x-araligi.
4. Aday merkezine gore olcu atamasi + satir ici monotonluk + olcu basina en
   iyi kutu.
5. Giris bazinda guven (coverage + medyan delta) ve **rapor**.

Sonuc (2.795 giris): high 85 · medium 770 · low 1.940; medyan delta <= %6:
1.471 giris.

`npm run align:symbtr-measures:import-ready` → 85 yuksek-guvenli giris icin
on-doldurulmus import dosyasi; **dry-run import gecti** (1.676 yeni kutu,
0 hata). Import kapisi artik `symbtr-txt-aligned` icin **kanit zarfini**
(rapor yolu + medyan delta <= 4 + confidence high) zorunlu tutuyor —
eski otomasyonun acigi boylece kapatildi.

### Uygulanan onarim onerisi (W4.1b — bu tur)

`--repair-proposal` bayragi ile kutu-bazli siniflandirma eklendi:
`output/symbtr-layout-review/repair-proposals.json` (546 verified giris,
fingerprint kapisi gecti; 0 dislama):

| Sinif | Kutu sayisi | Anlam |
|---|---|---|
| `replace` | 13.651 | Ayni olcu, farkli aday — yeni aday geometrik kanitli |
| `keep` | 736 | Stored kutu yeni hizalama ile ayni |
| `review` | 4.677 | Kanit yok (3.634 no-new-box) veya yeni atama beklenen aralik disinda (1.043, `hint` tasir) |
| `add` | 636 | Yeni hizalama stored manifestte olmayan olcuyu kapsiyor |

Toplam 19.064 stored kutu eksiksiz siniflandi (13.651+736+4.677=19.064).
Yalnizca `replace`'ler yazma onerisidir; `review`'ler insan/gorsel onaya kalir.
Dogrulama: 3 ornek giris (acem seyir sofyan, evic Devr-i Kebir pesrev, hicazkar
pesrev muhammes) bagimsiz geometriyle kontrol edildi — **125/125 replace onerisi
icinde, tum keep'ler dogru**. Manifeste YAZMA ise operatör onayı gerektirir
(import kapisi `alignmentEvidence` zarfini zorunlu tutuyor); onay sonrasi
`npm run import:symbtr-measure-verification` akisi kullanilir.

### Kalan teknoloji gereksinimleri

| Gereksinim | Neden | Oncelik |
|---|---|---|
| **Nota-anchor cikarici**: PDF vektor katmanindan staff satirlarina nota basi x-konumlarini da cikar (yalniz dikey cizgiler degil) | Esit-bolusum kapasitesi yaklasiktir; anchor'lar olcu sinirlarini KESIN yapar (`note-anchor-percent`, `visual-map.ts`'te zaten tanimli dogrulanmis yontem) | P1 |
| **Anchor esleyici**: cikarilan nota baslarini SymbTr event sirasiyla esle → satir icin sparse beat→x kalibrasyonu → olcu sinirlari enterpolasyonu | W4.1'in "kesin" kademesi; 770 medium + 1.940 low girisin cogunu high'a tasir | P1 |
| **Medium girislere on-doldurma**: review template'i alignment'dan gelen `suggestedMeasureIndex` ile doldur | Insan isini "65 bin karar"dan "medyan-delta spot-kontrolu"ne indirir | P2 |
| **14.694 uyumsuz kutu onariminin UYGULANMASI**: `repair-proposals.json` uretildi (13.651 replace + 4.677 review); demote/replace islemi operatör onayı sonrasi import kapisindan gecer | Veri butunlugu: yanlis "verified" veri, kurasyon/arastirma kararlarini kirletir | P1 (onay bekliyor) |

## 2. W4.2 — 2978 harici kaynak kurasyonu

### Kok durum

Pipeline (stage → map → verify → dry-run import) ZATEN otomatik; engel kod
degil, **zaman**: 2978 grup × saglayici taramasi ag-bagimli ve saatler surer
(su an Internet Archive 75/2978). `verify:external-source-providers:continue`
devamli kosucu mevcut.

### Uygulanabilir otomasyon (gereksinim)

| Gereksinim | Neden | Oncelik |
|---|---|---|
| **Zamanlanmis devamli kosucu** ✅: `verify:external-source-providers:schedule` (4x25 grup, throttle-ms 1000). Cache-bazli kaldigi-yer (offset sayisi degil), parti arasi throttle, offline/stall algilama (`network-outage` / `deterministic-failures`), 0 kalanla aninda terminasyon | Uygulandi; Windows Gorev Zamanlayici veya CI cron ile gunluk cagrilabilir | P1 — TAMAM |
| **Deterministik otomatik kabul esigi** ✅: skor >= esik + completeEvidence + HTTPS profil + URL-kimligi dedupe (en yuksek skor kazanir) — LLM yok, mevcut alanlardan | `provider-verification-accepted-import-ready.json` kumulatif manifest; import dry-run gecti | P2 — TAMAM |

### W4.2 kosu sonuclari (2026-08-08, bu tur)

Kosucudaki kok hatalar bulundu ve duzeltildi:

1. **Offset bugi:** devamli kosucu "cache sayisini" sirali indeks olarak
   kullaniyordu; cache seti listenin on eki olmadigi icin ayni 25 grup
   tekrar tekrar isleniyor, coverage 2.904'te takiliyordu. Yerine
   `excludeCached` secimi (yalniz cache'siz gruplar) geldi.
2. **ogm-materyal connector kusuru:** `respectRateLimit`/`rateLimitState`
   parametreleri alinmiyordu → 25 grupta ReferenceError. Duzeltildi.
3. **Bos sorgu:** baslik+besteci bos gruplarda IA URL'si `null` oluyor,
   `fetch(null)` hatasi her partide tekrarliyordu. Deterministik
   `deferred: internet-archive-empty-query` + cache'e yazim eklendi.
4. **Politika siniri:** archive.org ~479KB JSON donuyordu; `maxResponseBytes`
   262144 → 786432 (olculebilir ihtiyac: 479.240).
5. **TDZ:** `warnings` dizisi strateji-kesfinin try/catch'inden SONRA
   tanimlaniyordu (catch tetiklenirse ReferenceError). Onune alindi.
6. **Kabul manifesti kaybi:** her parti manifesti uzerine yaziyordu; son
   partide 0 kabul cikinca onceki kabul edilenler siliniyordu. Kumulatif
   birlestirme + cache'ten deterministik yeniden kurulum eklendi.

Sonuc: otomatik dogrulanabilir backlog **2.973/2.973 (%100)** siniflandi;
18 accepted-ready aday import dry-run'dan gecti (19 duplicate-URL aday
deterministik elendi — daha ozel URL veya demotion icin insan kurasyonu).
Kalan 5 grup `conflict`/`deferred` statüsünde — tasarim geregi insan
karari bekler; kosucu bunlarda donmez.

## 3. W4.3 — Ses kaynak dogrulama (hek, 4 claimed klasor)

### Kok durum (2026-08-08 olcumu)

`identify-sample-provenance.mjs` (hiz-bilincli korelasyon) 4 claimed klasor
icin koculdu: lavta r=0.75 · santur r=0.60 · rebab r=0.81 · kasik r=0.18 —
hepsi esik alti; 8 soundfont havuzunda karsiliklari yok. Sonuc DURUST:
`claimed` kalirlar (uydurma yok). `hek` icin de onceki H13 olcumu ayni
sonucu verdi: mevcut kayitta ayri bir cift-vurus yok.

### Teknoloji gereksinimi

| Gereksinim | Neden | Oncelik |
|---|---|---|
| **Genisletilmis kaynak havuzu** (harici lisansli kayitlar) | Korelasyon havuzu genisledikce claimed klasorlerin kimligi olculebilir | P2 (dis girdi) |
| **Alternatif kimlik sinyali**: perde-bagimsiz spektral imza (FFT/centroid) kaydi | Hiz-ayarli korelasyon esik altinda kalan dosyalar icin ikinci bagimsiz kanit | P2 |
| **Oto-yeniden-tarama kancasi**: yeni kaynak havuzu eklendiginde claimed klasorlerini otomatik yeniden korelasyonla tara | Kaynak girdiginde insan hatirlatmasi gerekmeden dogrulama akisi | P3 |

## 4. W3.1 — GitNexus FTS (environment)

4 deneme + `gitnexus doctor`: uzanti INIYOR ama Node SQLite `LOAD` edemiyor
(ABI/platform kısiti). Kod tarafi cozumu yok; gereksinim: Node veya GitNexus
sürümü yukseltilince `node .gitnexus/run.cjs analyze --repair-fts` tekrar
denenir (TODO W3.1'de kayitli).

## 5. W3.3 — Verovio (kosullu)

Strateji karari bekliyor; tetikleyici gelirse `verovio` paketi + renderer
degisimi ayri dalda planlanir (PRODUCT_ARCHITECTURE kosullu parcadir).

## 6. Guvenlik ilkesi ozeti

- Otomasyon kanit uretir, kanit yerine gecmez: alignment raporu + import
  kanit zarfı, korelasyon katsayilari, coverage artifact'leri.
- LLM hicbir kapida hakem degildir.
- Insan onay yuzeyi: yalnizca dusuk guven / celiskili / esik alti kayitlar —
  ve bu yuzey bile kanitla daraltilmistir.

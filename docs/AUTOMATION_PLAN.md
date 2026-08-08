# Muzik — Kalan Islerin Otomasyon Plani (kok analiz)

> Tarih: 2026-08-08. Amac: TODO'daki "dis girdi / insan isi" olarak kayitli
> kalemlerin hangi kisminin DETERMINISTIK otomasyonla insan etkisinden
> cikarilabilecegini kokten analiz etmek ve uygulanabilir olanlari uygulamak.

Baglayici ilke: "kaynak yoksa sembol uydurulmaz; LLM hakem degildir; her karar
event log'a yazilir." Bu yuzden otomasyon, LLM tahmini degil; **olculebilir
kanit + deterministik kural** uzerine kurulur. Insan, yalnizca kanitin
belirsiz kaldigi noktada ve daraltilmis bir onay yuzeyinde devreye girer.

## 1. W4.1 — PDF olcu kutulari (624 giris verified / 20.594 kutu; 1.181 giris adayi)

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

### Manifeste yazma (W4.1 — KAPANDI, 2026-08-08)

Operatör onayi verildi; 116 import-ready giris (84 meter-walk-v2 + 32
written-expanded-v1) `--write` ile manifeste yazildi:

- Manifest: **624 giris / 20.594 kutu** (592 meter-walk-v2 + 32
  written-expanded-v1; 32'sinde `writtenMeasureMapping` zarfı var).
- Kapilar: `verify:symbtr-layout-review-import` errors `[]` (dry-run
  outputEntryCount 624, manifest sha256 degismedi); `verify:symbtr-measures`
  errors `[]` (624 verified / 20.594 kutu, 1.181 unresolved aday).
- Testler: layout.test.ts yeni sayimlara guncellendi (coverage >546, her entry
  basis `RUNTIME_ACCEPTED_MEASURE_INDEX_BASES` icinde; Hicazkar pesrev artık
  verified, unreviewed örneği acem--ilahi--duyek--aldanma_dunya--zekai_dede).
- Artefaktlar tazelendi: aligner raporu (116 high / 932 medium / 1.747 low,
  storedMismatch 12.863), import-ready (116 giris), review template + batch
  plan (1.805 giris / 65.299 satir), repair-proposals (624 giris: 12.008
  replace / 2.864 keep / 5.722 review / 459 add, writeReady 84).
- Runtime: `audit:prod-cycle` OK — studio-follow denetiminin eski `: 0`/`: 1`
  eslesmesi gercek sayiya (`· durum {status}`) guncellendi; desktop+mobile
  verifiedPdfStatus true.

### Repair uygulamasi (W4.1h — KAPANDI, 2026-08-08)

Operatör onayi ile `scripts/apply-symbtr-repair-proposals.mjs`
(`npm run apply:symbtr-repair [--write]`) calistirildi. Siniflandirma
semantigi birebir korundu:

- **replace (12.008 kutu)** — onerilen adayin geometrisiyle degisti
  (reviewer: symbtr-txt-aligner-v1; kanitli onarim).
- **keep (2.864 kutu)** — stored aynen korundu.
- **review (5.722 kutu)** — dokunulmadi; ancak ayni PDF adayina iki olcu
  isaret edemez (dogrulayici kurali): adayi bir replace'in sahiplendigi
  3.607 review kutusu verified'dan dustu (aday kumesinde kaldi, insan
  yuzeyi korunur); kalan 2.115 review kutusu verified olarak duruyor.
- **add (459 kutu)** — YAZILMADI: yeni kutu, ayri import-ready kapisindan
  gecer.

Preview once son otorite (`validate-symbtr-layout-verification.mjs`) tarafindan
dogrulandi (0 hata) ve yalnizca ondan sonra `--write` manifesti guncelledi.

Sonuc:

- Manifest: **624 giris / 16.987 kutu** (503 giris `repairEvidence` tasir).
- storedMismatch **12.863 → 285 (−%97,8)** — sistematik yanlis hizalama
  giderildi.
- Taze repair-proposals: **replace 0** (hepsi uygulandi), keep 14.872,
  review 2.115, add 1.029 (review-dusen olcülerin alignment kapsamasi).
- Kapilar: `verify:symbtr-measures` + `verify:symbtr-layout-review-import`
  errors `[]`; tam suite 1.111 test yesil; lint/typecheck/guardrails/build/
  prod-cycle OK (studio-follow dahil).

Kalan insan/gorsel yuzey: 2.115 review kutusu + 1.029 add adayi + 1.181
unresolved candidate giris.

### Kalan teknoloji gereksinimleri

| Gereksinim | Neden | Oncelik |
|---|---|---|
| **Nota-anchor cikarici** ✅ v1: PDF metin katmanindaki muzik fontu glifleri (TT7/F3 gibi) font-genislik tablosuyla GLIF BAZINDA x konumuna cevrildi (Tc/Tw/Tz/kerning dogru ilerleme); staff bandi filtresi + akor kumeleme. Korpus: 2.795/2.999 PDF islendi; 1.157 giris kalibre (4.727 satir artik <=3pt), 990 PDF'te staff cizgisi YOK (tarama), 204 zip-inflate (mevcut extractor ile ayni kume) | `extract:symbtr-note-anchors` (38s, 2.999 PDF) | P1 — CIKARICI TAMAM |
| **Anchor esleyici + aligner entegrasyonu** ✅ v1: MusicXML YAZILI event yapisi + satir-sirali kalibrasyon. Aligner artifact'i OTOMATIK kullanir; giris bazinda en iyi hizalama secilir (regresyon garantisi). Sonuc: **89 high** (baseline 85, +4), import dry-run 1.716 kutuyla gecti | — | P1 — TAMAM |
| **Written↔expanded olcu eslemesi + motor sozlesmesi** ✅: `expandWrittenMeasures` (repeat+volta+segno/D.S.); kutular ilk-genislemis 1-bazli olcu indeksini tasir. Motor sozlesmesi genisletildi: `RUNTIME_ACCEPTED_MEASURE_INDEX_BASES` (TS+mjs esitlik testli), import kapisi + dogrulayici written-expanded-v1'i mapping zarfıyla kabul eder, temizlik script'i korur. Import-ready 104 giris (89+16) dry-run gecti (1.981 kutu, 0 hata); rapor 104 high / 860 medium / 1.831 low, storedMismatch 14.370 (−324) | Manifeste YAZMA operatör onayı bekliyor; karmaşık volta/yuvalanmış acilim (korpus %56) P2 | P1 — SOZLESME TAMAM, YAZIM ONAY BEKLIYOR |
| **Walk-rehberli D.S. acilimi** ✅: TXT walk olcu sayisi hedef alinir; D.S. bolumunun bitisi deterministik cozulur (`<fine>` cogu TXT'te isaretli degil; segno→son varsayimi 1.215 vakada fazla uzatiyordu). Korpus birebir eslesme %43,8 → %59,5 (+469). Rapor 110 high / 886 medium / 1.799 low, storedMismatch 13.925 (−769), import-ready 110 giris dry-run gecti (2.159 kutu, 0 hata) | Kalan %40,5 (volta/nested/repeat-DS etkilesimi) P2; yazim onayi P1 | P1 — ACILIM IYILESTIRILDI |
| **Yapisal yorum aramasi** ✅ (`expandWrittenMeasuresGuided`): repeat+DS etkilesiminde aday yorumlar (segno konumlari x once/sonra segment tekrarli/ham x DS-sonu walk-rehberli x dalsegno inclusive/exclusive) uretilir; TXT walk ile birebir eslesen secilir. Baskin cozum: DS bolumu ic tekrarlar olmadan calinir. Korpus birebir eslesme %59,5 → %76,7 (2.292, +514). Rapor 116 high / 932 medium / 1.747 low, storedMismatch 13.391 (−1.303), import-ready 116 giris dry-run gecti (2.275 kutu, 0 hata) | Kalan %23,3 (volta/nested) P2; yazim onayi P1 | P1 — ACILIM %76,7 |

### Olculen negatif sonuclar (2026-08-08)

- **Volta genellemesi (ending N yalniz N. geciste)**: korpus kazanci 0 —
  1/2 sonlu eserlerde davranis ayni; 3+ sonlu eserlerin uyumsuzlugu bundan
  kaynaklanmiyor.
- **Volta maxEnding adayi (bwd times = son sayisi)**: 0 giris cozuldu —
  kalan volta uyumsuzluklari times degeriyle ilgili degil.
- **Yuvalanmis tekrar deseni**: fwd/bwd diziliminden walk'in hangi yorumu
  kullandigini belirleyen DETERMINISTIK sinyal yok (orn.
  `acem--selam--devrikebir` 80 yazili / 86 model / 97 walk).
- **"none" kaynak farki (written = walk + 1)**: son olcu BOS degil (0/87);
  TXT ile MusicXML gercekten farkli — hangi olcunun dusurulecegini tahmin
  etmek "kaynak yoksa sembol uydurulmaz" ilkesini ihlal ederdi.

Sonuc: kalan %23,3 uyumsuzluk, isaret-duzeyi deterministik otomasyonla
cozulemiyor; tam muzikal yorum (insan/uzman) veya kaynak duzeltmesi gerektirir.
| **Medium girislere on-doldurma**: review template'i alignment'dan gelen `suggestedMeasureIndex` ile doldur | Insan isini "65 bin karar"dan "medyan-delta spot-kontrolu"ne indirir | P2 |
| **Uyumsuz kutu onarimi UYGULANDI** ✅: `apply:symbtr-repair --write` — 12.008 replace uygulandi, 3.607 cakisan review verified'dan dustu, 459 add yazilmadi; storedMismatch 12.863 → 285; taze proposal replace 0 / review 2.115 / add 1.029 | Preview + son otorite dogrulayicisindan gecti | KAPANDI (2026-08-08) — kalan yuzey: 2.115 review + 1.029 add (insan/gorsel) |

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

### Duplicate-URL demotion (W4.2b — KAPANDI, 2026-08-08)

`scripts/demote-duplicate-url-candidates.mjs` eklendi: accepted-ready cache
satirlari URL kimligine gore deterministik ayrilir (kazanan: en yuksek
evidence.score; esitlikte catalogId — `dedupeAcceptedCandidatesByIdentity`
ile ayni mantik). 37 satir → 18 kazanan; 19 kaybeden `conflict`'e demote
edildi (`reason: duplicate-url-identity-excluded`, kazanan + `demotedAt`
kayitli; liste: `output/external-source-discovery/duplicate-url-demote-list.json`).
`conflict`, kosucunun AUTO_VERIFIABLE_STATUSES disindadir — schedule AYNI
kaldi: 0 parti, 0 kalan, 18 accepted, duplicateUrlExcludedCount 0. Kalan
insan yuzeyi yalnizca 5 conflict/deferred gruptur.

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
| **Oto-yeniden-tarama kancasi** ✅: `samples:auto-rescan-claimed` — sample manifest sha256'si degisince claimed klasorleri otomatik yeniden korelasyonla tarar (idempotent; `output/samples/claimed-pool-fingerprint.json`). Ilk kosu 4 klasoru yeniden olctu (lavta .75 / santur .60 / rebab .81 / kasik .18 — esik alti, onceki olcumle tutarli); tekrar kosu 0,7s'de durur | — | P3 — TAMAM |

## 4. W3.1 — GitNexus FTS (environment)

5 deneme + `gitnexus doctor` (2026-08-08): `node .gitnexus/run.cjs analyze
--repair-fts` → "Cannot repair FTS indexes: the LadybugDB FTS extension is
unavailable (not pre-installed and could not be installed on this machine)".
Doctor: FTS "available" gosterir, native `lbugjs.node` yuklenir, ancak analyze
sureci `load-only` (offline) politikayla calisir ve "LOAD fts failed after
successful INSTALL" ile uzantiyi Node SQLite'a yukleyemez; VECTOR bu platformda
kapalidir (semantic = exact-scan). Kod tarafi cozumu yok — CERVESEL:
Node/GitNexus surumu veya makine yukleme politikasi degisince
`node .gitnexus/run.cjs analyze --repair-fts` tekrar denenir (TODO W3.1).

## 5. W3.3 — Verovio (kosullu)

Strateji karari bekliyor; tetikleyici gelirse `verovio` paketi + renderer
degisimi ayri dalda planlanir (PRODUCT_ARCHITECTURE kosullu parcadir).

## 6. Guvenlik ilkesi ozeti

- Otomasyon kanit uretir, kanit yerine gecmez: alignment raporu + import
  kanit zarfı, korelasyon katsayilari, coverage artifact'leri.
- LLM hicbir kapida hakem degildir.
- Insan onay yuzeyi: yalnizca dusuk guven / celiskili / esik alti kayitlar —
  ve bu yuzey bile kanitla daraltilmistir.

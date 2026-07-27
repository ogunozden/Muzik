# PLAN — Ana Motor İnşası ve Kalan İşler

> **Bu belge ne?** Açık işlerin *nasıl* yapılacağı. Kısa checklist için
> [TODO.md](TODO.md); bu belge her adımın amacını, dokunduğu dosyaları, geçiş
> kapısını, riskini ve geri alma yolunu taşır.
>
> **Tarih:** 2026-07-27 · **Dal:** `motor-denetimi-2026-07`
>
> **Bağlayıcı kural (ADR 0001):** kaynak yoksa sembol uydurulmaz; LLM hakem
> değildir; her karar kanıta bağlanır. Aşağıdaki her madde bu kurala tabidir.

---

## 0. Durum özeti

> **GÜNCEL DURUM (2026-07-27 · uygulama sonrası):**
> **FAZ A (G0–G9) ✅ · FAZ B (B1–B7) ✅ · FAZ C (C1–C4 + C1.1/C4.1) ✅ ·
> FAZ F (F0–F5) ✅ · E1 ölçüldü→yapılmadı ✅**
> 127 dosya / **1044 birim testi** + **23 e2e** (dev *ve* üretim derlemesi) yeşil.
>
> **G9 ile göç tamamlandı:** parser artık `rows.ts`'ten besleniyor, hiçbir
> satır atılmıyor. **Ölçü doluluğu %88,81 → %98,03**; olay akışı
> 1.163.593 → 1.192.643. Motorun metrik bağlamı yok diye başlayan teşhis,
> ölçülebilir bir sonla kapandı.
> Tarayıcı denetimleri: `score-engine-engraving` **0 hata**, `studio-follow` `ok`.
>
> **Ölçüm planı (ve beni) yedi kez çürüttü** — yedisi de kapılar sayesinde
> yakalandı: `TICKS_PER_WHOLE` 40320 → **524160** · pivot `floor(offset)+1`
> **daha kötü** (sorun formül değil eksen) · tempo `127+Bas` kuralı **%87,3**
> (reddedildi, mu2'den okunuyor) · "mu2 tekrarı korur" örtüşmesi **%32**
> (adlandırılmadı) · sample yeniden üretiminde **53 dosyada sessiz kuyruk**
> (çıktı uzunluğu kaynağı aşıyordu) · tanpura için uydurduğum "tepe aralığı =
> temel" gerekçesi (tepeler yazdırılınca **çöktü**; dem telleri oktav arayla) ·
> "iki bağımsız yöntem uzlaşırsa doğrudur" (YIN ve HPS **birlikte** bir oktav
> kaçabiliyor; ayırt eden kanıt spektrumda — F5).
>
> **Kalan:** yalnız **FAZ D** (stüdyo kaydı — kod işi değil). Ney'in
> CC BY-NC lisans borcu F5'te kapandı: ses, depodaki Art Libre soundfont'tan
> yeniden üretildi.
> E1 ölçüldü, tetikleyici ateşlenmediği için **yapılmadı** (§10).
> `setStrict(false)` ölçüldü: **kaldırılamaz ve bu bir kusur değil** —
> `Voice` ölçü başına değil *render sistemi* başına kuruluyor, sistem ise
> ölçünün keyfî bir dilimi (TODO.md §L1).

Aşağıdaki bölümler tarihsel plandır; her adımın altında **ne olduğu** ve
ölçülen sonuç kayıtlıdır.

D ve K fazları kapandı (bkz. TODO.md §D, §K): 15 + 6 bulgu uygulandı,
111 dosya / 768 test PASS. Ama L1 (ölçü sınırında bölme) inmedi ve inmemesinin
sebebi bir yaprak kusuru değil: **motorun metrik bağlamı yok.**

Bu plan o gövdeyi kurar (FAZ A) ve gövde kurulunca açılan işleri sıraya koyar
(FAZ B–E).

---

## 1. Teşhis — ölçülmüş olgular

Tüm sayılar SymbTr-3.0 korpusundan (3000 TXT dosyası, 1.211.994 veri satırı)
ölçüldü. Üretim yöntemi §9'da.

### 1.1 Motor kaynağın yapısını okumuyor

TXT'de **19 satır kodu** var; parser yalnız `9`'u okuyor (`parser.ts:117`).

| kod | satır | dosya | ne olduğu | kanıt |
|---|---|---|---|---|
| **9** | 1.164.854 | 3000 | nota / es | okunuyor |
| **8** | 15.984 | 1427 | süsleme (grace) | MusicXML çapraz: 218/221 dosya (%99) |
| 10 | 6.793 | 791 | çözülemedi | süre taşıyor |
| 1 | 6.009 | 275 | çözülemedi | süre taşıyor |
| 11 | 5.533 | 457 | çözülemedi | süre taşıyor |
| **7** | 3.807 | 348 | tremolo | MusicXML çapraz: 10/10 (%100) |
| **12** | 3.443 | 423 | trill | MusicXML çapraz: 57/57 (%100) |
| **52** | 2.576 | 2239 | tempo | Ms=0 ama Offset'i ilerletiyor |
| **23** | 841 | 144 | mordent | MusicXML çapraz: 22/25 (%88) |
| 24 | 554 | 87 | çözülemedi | süre taşıyor |
| 0 | 514 | 13 | sus/boş | Pay=Payda=Ms=0 |
| 4 | 484 | 79 | çözülemedi | süre taşıyor |
| **51** | 382 | 128 | mertebe/usul değişimi | Pay/Payda = yeni ölçü imi |
| 32 · 43 · 28 · 44 · 14 · 16 | 78 · 71 · 40 · 28 · 2 · 1 | — | çözülemedi | — |

**Atılan süre taşıyan satır: 31.605.** Bu, "davranış değişmeden satır ekle"
adımını imkânsız kılar (bkz. §3 pivot uyarısı).

### 1.2 Offset formülü çözüldü — 2.987/3.000 dosyada birebir

```
sig = mu2 satır-1 alan 0,1  (yazılı mertebe; TXT'de YOK)
her satır:  offset += (Pay/Payda) ÷ (sigPay/sigPayda)
  code 51 → sig'i günceller, 0 ekler   (380/380 satırda delta = 0.000000)
  code 52 → KENDİ Pay/Payda'sını ekler (korpus kusuru, bkz. 1.3)
```

Dönüşüm katsayısı tahmin gerektirmiyor. 13 sapma: 10'u serbest/gazel, 3'ü
bozuk code-51.

**Sonuç:** `Pay/Payda` (tam nota) ile `Offset` (yazılı ölçü) uyuşmuyor değil —
aralarındaki katsayı yazılı mertebe ve o katsayı atılıyor.

### 1.3 code-52 ölçü ızgarasını kaydırıyor

`Ms=0` (2573/2576) yani gerçek süre taşımıyor, **ama Offset eksenini
ilerletiyor**. Somut: `acem--ilahi--duyek` satır 137 nota 1/4 → Offset 16 ·
satır 138 code-52 (1/8) → Offset **16.125** · satır 139 nota 1/4 → 16.375.

| ölçüt | 52 sayılırken | 52 hariç |
|---|---|---|
| eser toplamı tam sayıda ölçü | 621/3000 | **2350/3000** |
| ölçü nominal uzunlukta | %64,9 | **%86,0** |

52 satırı olan 2239 dosyanın **2235'inde** ölçü çizgileri kayıyor. Daha önce
raporlanan "%32 ölçü dolmuyor" bulgusunun tek sebebi budur — bar geçişi değil.

### 1.4 `measureIndex` yuvarlaması yanlış yönde

`parser.ts:127` `Math.ceil(bitişOffset)` kullanıyor; doğrusu
`floor(başlangıçOffset)+1`. Barı **aşan** nota tamamen bittiği ölçüye yazılıyor.
Fark: **73.470 / 1.164.854 nota (%6,3)**.

`ceil(offset)` yine de yazılı ölçü indeksi olarak **%96,0** doğru — bu formül
kaldırılmayacak, *yuvarlaması* düzeltilecek.

### 1.5 Mertebe ile usul iki ayrı şeydir

`acem--selam--devrikebir`: mu2 satır-1 mertebe **14/8**, code-51 etiketi
**"Devr-i Kebir (28/8)"**. Büyük usuller küçük yazılı barlara bölünüyor
(hicazkâr peşrev: 28/4 usul, **4/4** yazılı, 28 bar = 4 devir).

Eser ortası değişim: 118 dosyada birden fazla code-51 (16'ya kadar).
**343 gerçek mertebe değişiminin 278'i ölçü sınırına oturmuyor.**

### 1.6 Doğrulama kapıları çalışmıyor

- `validator.ts:64-72` **totoloji**: `canonical-score.ts:496,511` `endBeat`i
  `max(startBeat+duration)` olarak kuruyor, validator aynı maksimumu yeniden
  hesaplayıp `>` karşılaştırıyor → **hiçbir zaman tetiklenemez**. *(doğrulandı)*
- `quality.ts:36-44` `measure-duration-usul` metriği bar açıklığını **usul**
  mertebesiyle karşılaştırıyor; büyük usullerde (28/4 vs ~4 çeyreklik) sürekli
  uyumsuz sayıyor.
- `importer.ts:107-129` kaynak-kanıtlı mertebe feature'ı çıkarıyor ama
  **tüketen yok**.

### 1.7 Aynı formülün dört kopyası

`parser.ts:126` · `canonical-score.ts:252` · `data/pieces/visual-map.ts:145` ·
`scripts/lib/symbtr-score-measures.mjs:26`

Sonuncusu PDF tarafı: **18.334 doğrulanmış ölçü kutusu** bu formüle bağlı.
Formül değişirse kutular sessizce kayar — `layout.ts:112` `isVerificationCurrent`
bunu yakalayacak alan **taşımıyor**.

### 1.8 mu2 temiz kaynak, TXT türev

- mu2 başlık bloğu **3000/3000** dosyada: makam+karar (50), usul adı (51),
  tempo (52), form (57), bestekâr (58), güftekâr (59), eser adı (60), tür (63).
  **Hiçbiri TXT'de yok.**
- mu2 `code-14` = **ölçü çizgisi**: 46.214 satır / 2586 dosya. Söz-1'i o ölçünün
  **darp gruplaması** (`22221` = 9/8 aksak, `242222` = 14/8 devrikebir); rakam
  toplamı ölçü iminin payına eşit (%81).
- mu2 `code-21` = ezgi cümlesi sınırı: 11.985 satır / 2192 dosya.
- **mu2'nun Offset'i code-52 kaymasını taşımıyor** — aynı eserde ilk notanın
  Offset'i mu2'de 0.166666 (doğru), TXT'de 0.2777778 (kaymış).
- TXT **açılmış** (unrolled) partisyon, mu2 tekrar işaretlerini korur:
  code-9 oranı TXT/mu2 = **1,488×**.
- v3 regresyonu: code-51 `Soz1` (usul adı) **382/382 boş**; v2.0.0'da 319/411
  doluydu.

---

## 2. Mimari karar

Üç bağımsız tasarım üretildi, üç kriterle jürilendi (doğruluk / göç
edilebilirliği / sadelik). **Üç farklı kazanan çıktı**, bu yüzden tek öneri
alınmadı; sentez uygulanır.

### 2.1 Çekirdek

**Tamsayı tick, markalı tip.** `TICKS_PER_WHOLE = 524160`.

> **Düzeltildi (G1, ölçüldü):** plan `40320` diyordu; kapı testi bunu
> **çürüttü**. 3000 TXT + 2999 mu2'nun *tüm* satır kodları tarandığında gerçek
> payda kümesi şu çıktı:
>
> `1 2 3 4 6 7 8 12 13 16 20 24 32 36 48 64 72 78 120 128`
>
> `40320 = 2⁷·3²·5·7` — **13** ve **78 (=2·3·13)** paydalarını bölmüyor.
> EKOK alındı: `524160 = 2⁷·3²·5·7·13`. Payda **120** ve **20** (quintuplet)
> de bu sayı tarafından bölünüyor.
>
> Taşma payı: korpusun en uzun eseri 1122,75 tam nota = **588.491.040** tick;
> `Number.MAX_SAFE_INTEGER`'ın ~15 milyonda biri.

Markalı tip (`type Ticks = number & {readonly __ticks: unique symbol}`) float
atamasını **derleme zamanında** reddeder → NaN zinciri ve
`0,5999999999999999` artıkları tip düzeyinde kapanır.

### 2.2 İki ayrı harita, aynı eksende

```ts
MeterMap  // yazılı mertebe segmentleri (mu2 satır-1 + TXT code-51)
UsulMap   // usul devri (usul adı/ID; mu2 code-51 etiketi)
```

Bunlar farklı şeyler (§1.5). Ölçü numarası **sürelerden tahmin edilmez**,
`MeterMap` yürünerek türetilir.

### 2.3 code-52: tek fonksiyon, iki sayı

Kalıcı bir mod enum'u **yok**. Satır ilerlemesi:

```ts
interface RowAdvance {
  canonical: Ticks;    // kanonik zaman (code-52 KATMAZ)
  offsetReplay: Ticks; // TXT Offset yeniden üretimi (code-52 KATAR)
}
```

Böylece TXT'nin Offset sütunu birebir yeniden üretilebilir (2.987/3.000) ve
bu bir **regresyon kapısına** dönüşür; sistemde kalıcı mod bayrağı olmaz.

### 2.4 Emniyet valfi

Mertebesi kanıtlanamayan dosyalarda (serbest/gazel, `0/0` code-51) ızgara
**devre dışı** (`unmetered`) → bugünkü davranış birebir korunur, bölme kapanır.
Uydurma ızgara kurulmaz.

### 2.5 ADR'ye yazılacak kural

> **Ses metrik katmana bağlıdır, gravür katmanına değil.**
> Bir notanın nasıl *yazıldığı* (bağla bölünmesi, tuplet bracket'i), nasıl
> *duyulduğunu* değiştirmez.

Test edilebilir karşılığı: bar-bölme sonrası `getCanonicalScheduledNotes`
çıktısının nota sayısı ve toplam süresi **değişmemeli**.

---

## 3. FAZ A — Ana motor (öncelik 1)

> **Pivot uyarısı — jürinin ortak bulduğu ölümcül kusur.**
> Üç tasarımın da "legacy çıktı değişmedi" diyen bir pivot adımı vardı ve bu
> **yanlış**: yeni saat, `parser.ts:117`'nin attığı **31.605 süreli satır**
> üzerinden de birikir. Çıktıdan süzmek o satırların kattığı ilerlemeyi geri
> almaz. Davranış değişimi **kaçınılmaz**; gizlenmeyecek, ölçülüp
> raporlanacak (G6).

### G0 · Baseline ve fixture borcu

**Neden ilk:** `src/data/score-engine/__tests__/fixtures/symbtr/` altında
yalnız `mu2/` ve `MusicXML/` var, **0 adet `.txt`** *(doğrulandı)*. TXT
fixture'ı olmadan hiçbir baseline kurulamaz.

- Korpustan **8 temsilci TXT** seç ve fixture olarak commit et. Seçim ölçütü:
  (a) mertebe 1 tam nota olan (düyek 8/8) · (b) olmayan (aksak 9/8) ·
  (c) büyük usul küçük mertebe (devrikebir 4/4 yazılı) ·
  (d) eser ortası code-51 değişimi olan · (e) code-52 yoğun ·
  (f) code-8 süsleme yoğun · (g) serbest/gazel (mertebesiz) ·
  (h) `0/0` yer-tutucu satırı olan.
- Fotoğraf testi: mevcut `parseSymbtrScore` çıktısının event sayısı,
  `measureIndex` dağılımı, son `startBeat`, `durationFraction` histogramı.
- **Kapı:** fotoğraf testi yeşil; `symb/` gitignore'da olduğu için CI'da
  çalışabilen tek kaynak bu fixture'lar.
- **Risk:** düşük. **Geri alma:** dosyaları sil.

### G1 · Tick primitifi (sıfır bağlantı) — ✅ TAMAM

- `src/core/time/ticks.ts`: markalı `Ticks`, `ticksFromFraction`,
  `ticksFromInteger`, `add`/`sub`/`mul`/`cmp`, `floorDiv`, `mod`, `sum`.
  **Float çıkışı tek fonksiyonda** (`wholeNotesOf`; mevcut `durationBeats`
  eksenine köprü için `quarterBeatsOf`), yalnız adaptör katmanı çağırır.
- **Kapı (kritik) — geçti, ama sabiti DEĞİŞTİRDİ.** Korpustaki *tüm* paydaları
  (code-9 dâhil ve hariç) tarayan test yazıldı. Plandaki `40320` **13** ve
  **78**'i bölmedi → sabit EKOK'a yükseltildi: **`524160`** (ayrıntı §2.1).
  Test hem ölçülen payda listesini sabitler (CI'da çalışır) hem de canlı
  `symb/` taramasını yapar (`it.skipIf`) → **55 test yeşil**.
- Bölmeyen payda geldiğinde `ticksFromFraction` **`null` döner** — sessizce
  yuvarlamaz. `0/0` yer-tutucusu da bu yoldan kapanıyor (D1 ile aynı davranış).
- `scripts/validate-architecture.mjs`'e kural eklendi: `src/core/time`
  **hiçbir şeyi** import edemez (`@/…` ve `../` yasak) — çekirdek her yerden
  çağrılabilir kalsın diye.
- **Ölçülen kanıt (teste pinlendi):** 24 adet `1/24` float ekseninde
  `3.9999999999999996`, tick ekseninde tam `4`.
- **Risk:** düşük (hiçbir üretim dosyası import etmiyor). **Geri alma:** klasörü sil.

### G2 · Satır okuyucu + MeterMap + UsulMap (tüketicisiz) — ✅ TAMAM

- `src/data/symbtr/rows.ts`: **hiçbir satır atılmıyor.** Her satır `timed` /
  `meter-change` / `untimed` olarak tipleniyor; `code` ve **tüm sütunlar** ham
  taşınıyor. Anlamı kanıtlanmayan kod için anlam **üretilmiyor**.
- `src/data/symbtr/meter-map.ts`: mu2 satır-1 + TXT code-51 → `MeterMap`,
  `measureAt()`. Mertebesiz eserde **`null`** döner (izgara uydurulmaz).
- `src/data/symbtr/usul-map.ts` + `encoding.ts`: usul **adı** mu2 code-51'den.
- `parser.ts` **dokunulmadı.** 74 test yeşil (47'si yeni).

**Ölçülen ve kapıya bağlanan yeni gerçekler**

1. **Zaman ilerletme kuralı — 1.211.994 satırda sıfır istisna:**
   `Pay>0 && Payda>0 && kod!==51`. Süresiz bir satırın Offset'i ilerlettiği
   **tek bir örnek yok**. Testte canlı korpus taranıyor.
2. **Offset formülü doğrulandı:** `delta = (Pay/Payda) ÷ yazılıMertebe`.
   `1/8` süresi 13/8'de 0,076920 · 14/8'de 0,071430 · 10/8'de 0,100000.
3. **Kod 52 = TEMPO işareti, kanonik zamanı İLERLETMEZ.** mu2 kardeşi kendini
   belgeliyor (`52 · 1 8 168` = "sekizlik=168"); TXT'de `Ms` her zaman 0.
   2999 eserde "toplam süre tam ölçüye oturuyor mu?" testi:
   **hariç 2274 (%75,8) · dâhil 629 (%21,0)**; yalnız-hariç doğru 1672 eser,
   yalnız-dâhil doğru 27 → **62:1**. PLAN §2.3'teki `canonical`/`offsetReplay`
   ayrımı bu yüzden doğru çıktı.
4. **Kod anlamları MusicXML kardeşiyle hizalanarak türetildi** (444 dosya /
   133.241 nota): `8`=çarpma (%100 `<grace>`), `12`=tril, `23`/`24`=mordent,
   `7`=tremolo. Kalanlar süreli perdeli nota; **uydurulmadı**.
5. **mu2 formatı kendini belgeliyor:** `50`=makam · `51`=usul (Pay/Payda+**ad**)
   · `52`=tempo · `57`=form · `58`/`59`=besteci/söz · `60`=başlık.
   Korpusta **134 farklı usul adı** var (Aksak 449, Düyek 432, Sofyan 378…) ve
   motor bugün **hiçbirini okumuyor**. Hizalama kuralı: mu2 = TXT + 1
   (2814/3000); tutmayan dosyada ad **atanmıyor** (122 ad bağlanabiliyor).
6. **mu2 kodlaması Windows-1254**, latin1 değil. `Ağıraksak` bugüne kadar
   `Aðýraksak` olarak okunurdu. `decodeWindows1254` bunu kapatıyor.
7. **12 eserde `Offset` sütunu bir noktadan sonra donuyor** (çoğu
   `serbest`/`gazel`, yani mertebesiz). Kaynak verinin özelliği; liste testte
   sabitlendi ki değişirse görülsün.

- **Risk:** sıfır (hiçbir üretim dosyası import etmiyor). **Geri alma:** dosyaları sil.

### G3 · Offset yeniden üretim kapısı — ✅ TAMAM · **kapı geçti**

- `src/data/symbtr/offset-replay.ts`: `RowAdvance {canonical, offsetReplay}`
  (§2.3) — **tek fonksiyon, iki sayı**; kalıcı mod enum'u yok.
- **Kapı sonucu: `2987 / 2999` (%99,6)** — hedef ≥2.987 idi, tam tutturdu.
  Hata medyanı 3,3e-6 · p95 3,3e-5 (dosya 7 anlamlı hane yazıyor; tolerans
  bu yüzden **göreli**: `max(2e-6, |offset|·2e-6)`).
- **§1.2 formülü kanıtlandı:** `offsetDelta = (Pay/Payda) ÷ yazılıMertebe`.
- **İki eksenin de gerekli olduğu karşıt kanıtla gösterildi:**

  | eksen | `Offset` yeniden üretimi | eser tam ölçüye oturuyor |
  |---|---|---|
  | kod-52 **dâhil** (`offsetReplay`) | **%99,6** | %21,0 |
  | kod-52 **hariç** (`canonical`) | %25,4 | **%75,8** |

  Tek eksen seçmek iki durumdan birini bozardı. `RowAdvance` tasarımı doğru.
- **Eşleşmeyen 12 eser sabitlendi** (kaynak verinin özelliği, motorun değil):
  11'inde `Offset` sütunu donuyor (çoğu `serbest`/`gazel`);
  `hicaz_uzzal--zeybek--aksak----izmir` ise korpustaki **tek mu2/TXT
  çelişkisi** — mu2 `9/4` diyor, `Offset` sütunu `9/8` ile yazılmış.
- **Risk:** sıfır (tüketicisiz). 93 symbtr testi yeşil.

### G4 · Keşif koşusu (commit YOK) — ✅ TAMAM · **G6'yı ÇÜRÜTTÜ**

Ölçüm: 2987 eser / 1.157.450 kod-9 nota. Karşılaştırma tabanı, `MeterMap`
**yürünerek** bulunan gerçek ölçü numarası.

| formül | doğru |
|---|---|
| **MEVCUT** `ceil(offset)` | 999.959 (**%86,39**) |
| **PLANLI (G6)** `floor(offset)+1` | 882.363 (**%76,23**) |

**Planlanan pivot, mevcut halden 10 puan DAHA KÖTÜ.** Neden olduğu da bulundu
— kohortlara ayırınca ortaya çıkıyor:

| kohort | `ceil(offset)` | `floor(offset)+1` |
|---|---|---|
| tempo işareti **YOK** (218.564 nota) | **%98,58** | %87,49 |
| tempo işareti **VAR** (938.886 nota) | %83,56 | — |

**Sorun formül değil, EKSEN.** `Offset` sütunu kod-52'nin hayalet süresini
içeriyor (G3), kanonik müzikal zaman içermiyor. Tempo işareti olmayan
eserlerde `ceil(offset)` zaten **%98,58** doğru; olanlarda %83,56'ya düşüyor.
Sapma dağılımı da bunu söylüyor: **+1: 155.876** (eserdeki tempo işareti
sayısı kadar kayma), +2: 1.131, +3: 122.

> **KARAR — plan değişti:** ölçü numarası `Offset` sütunundan **hiç**
> türetilmeyecek. `measureAt(kanonikBaşlangıç)` ile `MeterMap` yürünecek.
> Bu, G2/G3'ün zaten inşa ettiği şey. Formül değişimi değil, **kaynak
> değişimi**.

Yan ölçüm: doğru ızgarayla **ölçülerin %93,13'ü tam dolu** (159.560 ölçüde
148.606). TODO'daki %64,9 rakamı bozuk ızgarayla hesaplanmıştı. Bar-aşan nota
yalnız **%0,50** (5.787 nota) — G7'nin gerçek kapsamı bu.

- **Risk:** sıfır (commit yok, geçici test dosyası silindi).

### G5 · PDF taban alanı (pivottan ÖNCE) — ✅ TAMAM

- `layout.ts`: `SymbTrPdfLayoutVerificationEntry.measureIndexBasis?:
  "offset-ceil-v1" | "meter-walk-v2"` + `isSymbTrVerificationBasisCurrent()`.
  `isVerificationCurrent` artık bu dalı da kontrol ediyor.
- **520 girdinin hepsi damgalandı** (`offset-ceil-v1`) — çıkarım değil, kayıt.
- **Tek kaynak, iki dil:** sabit `scripts/lib/symbtr-score-measures.mjs`'te
  (`CURRENT_MEASURE_INDEX_BASIS`) ve `layout.ts`te. `layout.test.ts` ikisinin
  **eşitliğini test ediyor** → TS ile `.mjs` arasında kayma olamaz.
- İki doğrulayıcıya kapı eklendi: `import-symbtr-layout-verification.mjs` ve
  `validate-symbtr-layout-verification.mjs` — taban uyuşmazsa **hata**.
- **Kabul kriteri karşılandı:** taban değişince kutuların görünür şekilde
  düştüğü `layout.test.ts`te doğrudan test ediliyor; alanı olmayan eski kayıt
  geriye dönük `offset-ceil-v1` sayılıyor.
- **Neden önce:** G4 ölçtü — yürünmüş ızgaraya geçiş notaların **%13,61'ini**
  (157.491) başka ölçüye taşıyor. Bu alan olmadan 18.334 kutu **sessizce**
  kayardı. *Görünür kayıp, sessiz yanlıştan iyidir.*
- **Risk:** düşük çıktı (alan opsiyonel, geriye dönük uyumlu). 904 test yeşil.

### G6 · Pivot — ✅ TAMAM · hedef G4 ölçümüyle değişmişti

- ~~`measureIndex = floor(başlangıçOffset)+1`~~ **ÇÜRÜTÜLDÜ** (G4: %76,23).
- **Yapılan:** `measureIndex = measureAt(kanonikBaşlangıç).measure`.
  `MeterMap` yürünüyor; `Offset` sütunu ölçü için **artık hiç kullanılmıyor**
  (yalnız G3 kapısında, kaynak doğrulamada kalıyor).
- **Yazılı mertebe kaynağı:** `mu2` satır-1. `parseSymbtrScore`'a
  `options.writtenMeter` eklendi; `parseSymbtrToCanonical` bunu `mu2`
  kardeşinden okuyor. `SymbtrCanonicalImportInput.writtenMeter` ile açıkça
  geçersiz kılınabiliyor (sentetik fixture'lar için gerekli).
- **Taban her olayda taşınıyor:** `SymbtrScoreEvent.measureIndexBasis` —
  mertebe bilinmiyorsa `offset-ceil-v1`, biliniyorsa `meter-walk-v2`.
  Hangi tabanın kullanıldığı **asla örtülü kalmıyor**.
- **Yan kazanç:** `piece.meter === "auto"` artık süre dağılımından **tahmin
  etmiyor**; `mu2`'nun yazılı mertebesini kullanıyor. `inferMeter…` yalnız
  arşiv dışı girdiler için kalıyor.

**Ölçülen kayma (2999 eser / 1.163.593 nota)**

| kohort | başka ölçüye taşınan |
|---|---|
| tümü | **160.860 (%13,82)** |
| tempo işareti **olmayan** eserler | 3.314 / 218.770 (**%1,51**) |

G4 tahmini %13,61 ve %1,42 idi — ölçüm tutuyor. Toplam ölçü sayısı değişen
eser: **1.768 / 2.999**.

**İki dil, tek davranış.** Projede TS runner yok *(doğrulandı)*, bu yüzden
`scripts/lib/symbtr-score-measures.mjs` yürüyüşü tekrar uyguluyor. Kopya
kaçınılmaz, **sessiz ayrışma değil**: `symbtr-score-measures.test.mjs` iki
uygulamayı 8 fixture üzerinde koşturup **birebir aynı ölçü kümesini**
ürettiklerini doğruluyor, sabitlerin (`TICKS_PER_WHOLE`, taban) eşitliğini de.

**G5 emniyet valfi tetiklendi — tasarlandığı gibi.** 520 doğrulanmış girdi
`offset-ceil-v1` olduğu için bayatladı; `getSymbTrVerifiedPdfMeasureBoxes`
artık **0** dönüyor ve `verify:symbtr-measures` 520 hatayı **adıyla**
raporluyor. Veri silinmedi, yalnız geçersiz sayılıyor.

- **Risk:** YÜKSEK'ti; 919 test yeşil. **Geri alma:** tek commit, `git revert`.

### G6.1 · PDF ölçü kutularını yeniden doğrula — ✅ TAMAM

Pivot 520 girdiyi bayatlatmıştı; yeni tabanla yeniden üretildiler.

| | önce | sonra |
|---|---|---|
| doğrulanmış girdi | 520 | **546** |
| ölçü kutusu | 18.334 | **19.064** |
| taban | `offset-ceil-v1` | `meter-walk-v2` |

`npm run verify:symbtr-measures` **0 hata**. Kutular pivotta 0'a düşmüş,
yeniden doğrulamayla geri gelmişti — üstelik daha fazlası.

**Zincirleme bayatlama.** Pivot tek bir dosyayı değil **dört** türev
artefaktı geçersiz kıldı; her biri sırayla yenilendi:
`layout-verification.generated.json` → review template (`scoreMeasureSummary`
önbelleği) → empty-import dry-run sayacı → doğrulama özeti. Üçüncüsü
yenilenmeden import geçmiyordu — kapılar birbirini tuttu.

**İki tutarsızlık kapatıldı** (pivotu taşırken çıktı):
1. `.mjs` doğrulayıcılar alanı olmayan kaydı **güncel** sayıyordu, `layout.ts`
   ise **eski**. Alanı unutulmuş yeni bir kayıt import'tan geçip çalışma
   zamanında sessizce bayatlardı. İkisi de artık `LEGACY_…` varsayıyor.
2. Yeniden doğrulama betiği tabanı **yazmıyordu**; artık `summary`nin kendi
   bildirdiği tabanı kaydediyor (varsaymıyor).

**Yıkıcı işlem sınırı:** temizlik yalnız `symbtr-txt-aligned` (makine üretimi,
yeniden üretilebilir) kayıtları siler. `human-reviewed` / `visual-regression`
kayıtları **silinmez** — bayat sayılır ve `staleBasisKeptForReview` ile
raporlanır. İnsan emeği sessizce atılmaz.

### G7 · L1 — bar-aşan nota bölme + bağ — ✅ TAMAM

`src/data/symbtr/barline-split.ts`. Daha önce denenip **geri alınmıştı**:
ölçü ızgarası `Offset` sütunundan tahmin ediliyordu ve o sütun kendi içinde
tutarsızdı, bölme noktaları saçma yerlere düşüyordu. G6'dan sonra ızgara
yazılı mertebeden yürünüyor — blokaj kalktı.

**Üç kapı, 2999 eserde:**

1. **Toplam süre değişmedi** — 0 eserde sapma.
2. **Çalınan nota sayısı değişmedi** — 0 eserde sapma (bağlı parçalar tek
   nota sayılır). Çalma yolu (`follow/page.tsx`) zaten `parseSymbtrScore`'u
   doğrudan çağırıyor; bölme yalnız gravür/kanonik yolda.
3. **Bölünen nota sayısı, bağımsız ölçümle BİREBİR aynı: 5.984 (%0,51).**

**Üçüncü kapı bir hata yakaladı.** İlk uygulamada konum, olayların
sürelerinden toplanıyordu — ama `parseSymbtrScore` yalnız kod-9 üretiyor.
Korpustaki **31.605 süreli kod-9-dışı satır** atlandığı için ilk böyle
satırdan sonraki **tüm** bar çizgileri kayıyordu ve bölünen nota **%2,07**
çıkıyordu. Konum artık satırlardan (`rowAdvance().canonical`) yürünüyor ve
iki bağımsız hesap **tam olarak** buluşuyor. Bu, göçün başındaki teşhisin
son adımda yeniden karşımıza çıkması — ve kapının işini yapması.

---

#### G7 · özgün plan notu

Artık bar çizgisi ve nota süresi **aynı eksende** olduğu için doğru.

- `src/core/timeline/measure-split.ts`: `splitSpanAtBarlines(map, span)` →
  `{measureIndex, start, duration, tieRole}[]`.
- Çizim: mevcut `tiedParts` mekanizması (K3'te yazıldı) yeniden kullanılır.
- Çalma: §2.5 kuralı — bölünmüş parçalar **tek nota** olarak duyulur.
- **Kapı:** ölçü doluluğu **%64,9 → ~%86** (52 hariç ölçümüyle uyumlu);
  `getCanonicalScheduledNotes` nota sayısı ve toplam süresi **değişmemeli**.
- **Risk:** orta.

### G8 · Doğrulamayı totolojiden çıkar — ✅ TAMAM

**İki kontrol de kendi ürettiği veriyle karşılaştırıyordu.**

`validator.ts` — `measure.endBeat`, o ölçünün event'lerinin
`max(startBeat + durationBeats)` değeri olarak **üretiliyor**
(`canonical-score.ts:499-514`). Onu yine aynı event'lerle karşılaştırmak
matematiksel olarak sağlanamaz bir koşuldu. Artık **bir sonraki ölçünün
başlangıcıyla** karşılaştırıyor — bağımsız bir büyüklük; G7 bölmesi
çalışmazsa ya da ölçü numarası yanlış atanırsa burada patlar.

`quality.ts` — `endBeat - startBeat` de aynı event'lerden türüyordu
(`min`/`max`), yani "ilk notadan son notaya **yayılım**". Ölçünün başındaki
veya sonundaki boşluk görünmüyordu: metrik doluluk değil yayılım ölçüyordu.
Artık ölçü içindeki **sürelerin toplamı** yazılı mertebeyle karşılaştırılıyor.
Son ölçü hariç tutuluyor (eserlerin çoğu tam ölçüyle bitmez — ölçüldü: %75,8).

- **Kapı karşılandı:** yeni `validator-tautology.test.ts` her iki kontrolün de
  **tetiklenebildiğini** kanıtlıyor; ayrıca eski kontrolün neden imkânsız
  olduğunu ve yeni metriğin "ölçü başında boşluk" vakasını yakaladığını
  pinliyor. *Geçen bir test, hiç tetiklenemeyen bir kontrol için de geçerdi.*
- `inferMeterFromSymbtrEvents` **silinmedi** — G6'da arşiv dışı girdiler için
  yedek yol olarak kaldı; `mu2` varsa artık hiç çağrılmıyor.

---

## 4. FAZ B — Kaynak zenginliği (öncelik 2, FAZ A'ya bağlı)

Gövde kurulmadan bunlar yapılamaz; kurulunca hepsi aynı mekanizmayı kullanır.

- **B1 · Süslemeler.** code-8 grace (15.984 satır / 1427 dosya), code-12 trill
  (3.443/423), code-7 tremolo (3.807/348), code-23 mordent (841/144).
  VexFlow'da `GraceNote`, `Ornament` karşılıkları var. Dispatch tablosuna
  kaynak-kanıtlı sınıf olarak girer.
- **B2 · Çözülemeyen kodlar.** code-1 (6.009), 10 (6.793), 11 (5.533),
  24 (554), 4 (484), 32, 43, 28, 44. MusicXML çapraz-doğrulamayla anlamlarını
  çöz; çözülemeyeni `unsupported` olarak **dürüstçe** raporla.
- **B3 · mu2 metadata bloğu.** 3000/3000 dosyada makam+karar, usul adı, form,
  bestekâr, güftekâr, eser adı, tür var; hiçbiri TXT'de yok. Katalog bu
  bloktan beslenmeli (bugün dosya adından parse ediliyor).
- **B4 · mu2 code-14 darp gruplaması.** 46.214 satır / 2586 dosya; Söz-1'i
  ölçünün darp gruplaması (`22221`). Bu, usul vurgusunu **kaynaktan** verir —
  bugün `USUL_DATA`dan geliyor. Çapraz-doğrulama fırsatı.
- **B5 · Tekrar işaretleri.** TXT açılmış (1,488×), mu2 tekrarı koruyor
  (Söz-1'de `(` `)` `:` `[`). `repeat-volta-endings` dispatch'i bugün yalnız
  segno biliyor.
- **B6 · code-51 usul adı regresyonu.** v3'te `Soz1` 382/382 boş, v2.0.0'da
  319/411 doluydu. v2'den tamamlama veya mu2'den okuma.
- **B7 · Tempo.** code-52 `LNS` = BPM ama 7-bit kırpılmış;
  `BPM = (LNS>=127 ? 127+Bas : LNS)` kuralı %87,3. Bugün tempo eser başına
  sabit; `TempoMap` gerekiyor.

---

## 5. FAZ C — Doğrulama borcu (öncelik 3)

- **C1 · e2e BLOKE.** 3000 portunu takılmış bir `next dev` (PID 12356) tutuyor;
  HTTP'ye yanıt vermiyor, Playwright webServer'ı başlayamıyor. **23 e2e testi
  hiç çalışmadı** — oysa `ScoreSurface`'te esaslı değişiklikler var (tuplet,
  bağla bölme, sanallaştırma, responsive). Kullanıcı eylemi gerekiyor:
  `taskkill /PID 12356 /F`
- **C2 · K5 geometrisi doğrulanmadı.** Sanallaştırma ve responsive genişlik
  jsdom'da test edilemez (layout yok, `getBoundingClientRect` 0 döner).
  C1 açılınca tarayıcıda doğrulanmalı.
- **C3 · Browser audit script'leri.** `audit:score-engine-*` hiç çalışmadı
  (server gerektiriyor). C1'e bağlı.
- **C4 · Dört tek-kalan triole notası** (%0,18). G7 sonrası yeniden ölç;
  bir kısmı orada çözülebilir.

---

## 6. FAZ D — Ses kütüphanesi (öncelik 4, kod işi değil)

- **D1 · Ney kapsamı.** 10/36 slot dolu; `D3(50)` → `B3(59)` arası **9
  yarım-ton delik**, o aralık 4–6 yarım-ton pitch-shift'le üretiliyor
  (formant kayması duyulur). Ney `playScale`'in varsayılanı.
  Kırpılacak kusur **yok** (10 dosyanın hepsinde ses 0 ms'de başlıyor,
  tepe 0 ms'de) — eksik perdelerin **kaydedilmesi** gerekiyor.
- **D2 · `hek` gerçek kaydı.** Şu an dum+tek toplamından türetiliyor
  (`derive:hek-samples`), tanımın birebir gerçeklenmesi ama kayıt değil.
  Gerçek kayıt bulunursa dosyaların üzerine yazılabilir.

---

## 7. FAZ E — Tetikleyici bekleyenler (öncelik 5)

- **E1 · Korpus JSON süzme.** gzip 6,8 KB → süzülse 3,4 KB (bundle'ın %0,14'ü).
  Makine maliyeti (yeni üretilmiş dosya + derive script + senkron testi +
  kalıcı drift riski) kazancı aşıyor. **Tetikleyici:** bundle bütçesi zorlanırsa.

---

## 8. Öncelik matrisi

| # | iş | etki | risk | bağımlılık |
|---|---|---|---|---|
| 1 | **FAZ A / G0–G4** (ölçüm, davranış değişmez) | gövdeyi kurar | düşük | — |
| 2 | **FAZ A / G5** (PDF taban alanı) | 18.334 kutuyu korur | orta | G0–G4 |
| 3 | **FAZ A / G6** (pivot) | %6,3 nota doğru ölçüye | **yüksek** | G5 |
| 4 | **FAZ A / G7–G8** (L1 + kapılar) | %64,9 → %86 doluluk | orta | G6 |
| 5 | **FAZ C / C1** (e2e portu) | mevcut işi doğrular | düşük | *kullanıcı* |
| 6 | **FAZ B / B1–B2** (süslemeler) | 30k+ satır görünür olur | orta | FAZ A |
| 7 | FAZ B / B3–B7 | katalog + tempo + tekrar | orta | FAZ A |
| 8 | FAZ C / C2–C4 | doğrulama borcu | düşük | C1, G7 |
| 9 | FAZ D | ses kalitesi | — | *stüdyo* |
| 10 | FAZ E | — | — | *tetikleyici* |

**G0–G4 hiçbir davranış değiştirmez** ve pivot kararı için gereken listeyi
üretir; en düşük riskli ilk hamle budur.

---

## 9. Ölçüm sözlüğü

Bu belgedeki her sayı aşağıdaki yöntemlerle üretildi. Yeniden üretilebilir.

| sayı | yöntem |
|---|---|
| kod dağılımı, sütun doluluğu | 3000 TXT taraması, kod başına gruplama |
| süsleme kod anlamları | MusicXML çapraz-doğrulama, **yalnız tekrar açılmamış 648 dosyada** (dosya başına sayı birebir eşleşmesi) |
| Offset formülü 2.987/3.000 | mu2 satır-1 mertebesi + TXT code-51 değişimleri + pickup hizalaması ile satır satır yeniden üretim |
| code-52 hasarı | aynı korpus, 52 satırları dâhil/hariç iki koşu |
| %6,3 yuvarlama farkı | `ceil(bitiş)` vs `floor(başlangıç)+1`, nota başına |
| 18.334 kutu | `src/data/symbtr/layout-verification.generated.json`, 520 girdi |
| PDF ↔ ceil uyumu | `verify-pdf-measures-symbtr-aligned.mjs`, ±%15 kapısı; ayırt edici eserlerde oran 0,86–1,13 |
| repo olguları (fixture, TS runner, totoloji) | doğrudan dosya okuması, §1.6/§1.7'de satır referanslı |

### Bilinen belirsizlikler

- Payda kümesi: jüri üç tasarımın da eksik saydığını buldu (payda **120**
  code-9 dışı satırlarda var). **G1'in kapısı bunu kesinleştirecek.**
- Offset formülünün %5,31 satır artığı: muhtemel sebepler eser içi mertebe
  değişimi, anacrusis, tekrar işaretleri. İncelenmedi.
- code-1, 4, 10, 11, 24, 28, 32, 43, 44'ün anlamı **çözülemedi** (B2).
- 1 dosyanın mu2 karşılığı yok (`saba--miraciye--serbest`, sig `1/0`).

---

## 10. FAZ F — Sample doğruluğu, kalan borçlar (2026-07-27)

> **Tetikleyen bulgu:** ney'de 5 dosyanın yanlış perde etiketiyle durduğu
> ortaya çıktı (D1). Aynı tarama tüm melodik klasörlere uygulanınca **132
> sample sapıyor** göründü. Ama sapmanın *yapısı* incelenince ölçümün
> kendisinin bir kısım tınıda güvenilmez olduğu anlaşıldı.

### F0 · Ölçümü önce güvenilir yap — **hiçbir dosyaya dokunmadan**

Oktav kayması çıkarıldıktan sonra kalan sapmanın standart sapması:

| enstrüman | kalan sd | ölçüm |
|---|---|---|
| tambur 8c · miskal 9c · kemençe 10c | dar | **güvenilir** |
| ney 77c · bağlama 81c | orta | şüpheli |
| kanun 112c · santur 137c · ud 143c · tanpura 173c · lavta 190c · rebab 241c | geniş | **güvenilmez** |

150–240 cent belirsizlikle "bu dosya yanlış" denemez. Tellilerde/vurmalılarda
YIN kısa pencerede temel frekansı kaçırıyor (attack transiyenti + zayıf temel).

- **Yapılacak:** ikinci bağımsız yöntem (harmonic product spectrum) ekle;
  yalnız **iki yöntem aynı sonucu verdiğinde** karar ver. Attack'i tınıya göre
  atla, pencereyi uzat.
- **Kapı:** her enstrüman için iki yöntemin uyuşma oranı raporlanır.
  Uyuşma <%90 olan enstrüman **"doğrulanamıyor"** diye işaretlenir — sessizce
  geçilmez, yanlış da düzeltilmez.
- **Risk:** sıfır (yalnız ölçüm).

### F1 · Yalnız kanıtlanan sapmaları düzelt — **TAMAM**

Üç yöntem (YIN · HPS · tepe aralığı), **en az ikisi uzlaşmadan karar yok**.
`scripts/rebuild-instrument-samples.mjs` her yuvayı en yakın *sağlam* kaynaktan
kapalı döngüyle üretir ve **yalnız doğrulananı** diske yazar.

| enstrüman | uzlaşma önce → sonra | sapan dosya |
|---|---|---|
| lavta | 0,44 → **1,00** | 0 |
| ud | 0,75 → **1,00** | 0 |
| bağlama | 0,39 → **0,64** | 0 |
| rebab | 0,25 (oktav düzeltmesi) | 0 |
| ney · kemençe · tambur | 1,00 | 0 |
| kanun 0,92 · mıskal/santur 0,83 | değişmedi | 0 |
| **tanpura** | **0,00** | ölçülemiyor → **dokunulmadı** |

**Ölçüm planı üç kez çürüttü — üçü de kayıtta** (`sample-pitch-labels.test.ts`
başlığı ve betik yorumları):

1. *Serbest otokorelasyon* alt-harmoniğe kilitlendi; "beklenen perdede
   korelasyon yüksek mi" kapısı ise **yanlış etiketli dosyayı onayladı**.
2. *Yeniden üretim uzunluğu* sabit 1,6 s isteniyordu; kaynak `step` katı
   hızla okunduğu için erken tükeniyor, kalan çerçeveler **sıfırla**
   doluyordu — `tanpura/C5` sesin %14'ünden sonrası sessizdi (lavta 19,
   ud 7, bağlama 3 dosya aynı). Ayrıca betik doğrulanmayan çıktıyı da yazıp
   hepsini "üretildi" diye sayıyordu. İkisi de düzeltildi; **yeni kapı:**
   *hiçbir dosyanın kuyruğu sessiz değil*.
3. *Tanpura için "tepe aralığı = temel"* gerekçesi uydurulmuştu. Tepeler tek
   tek yazdırılınca çöktü: `C3` tepeleri 132'nin **2,5 ve 3,5 katını** da
   içeriyor — sinyalde bir oktav aşağıda ikinci bir dizi var (dem telleri
   oktav arayla gerilir). Aralık f ile f/2 arasında belirsiz. Tepe aralığı
   **üçüncü oy** olarak kaldı, hakem yapılmadı; tanpura dosyalarına
   dokunulmadı ve borç testte görünür.

- **Yan düzeltme:** perde yukarı kaydırılırken **anti-alias alçak geçiren**
  (pencerelenmiş sinc FIR) eklendi; yoksa Nyquist üstü içerik katlanıp
  inharmonik gürültüye dönüşüyordu.
- **İkinci kapı — sayısal çekirdek:**
  `scripts/__tests__/rebuild-instrument-samples.test.mjs` (11 iddia).
  Çıktı dosyalarına bakan kapı kusuru ancak *sonradan* yakalayabildiği için
  `lowPass`/`resample`/`detectByPeakSpacing` artık **doğrudan** ölçülüyor —
  kusur dosyalara ulaşmadan yakalansın. Tepe aralığının iki dizi üst üste
  binince **alttakini** verdiği de burada sabit (tanpura'nın tam durumu).
- **Risk:** orta. **Geri alma:** dosyalar git'te.

### F5 · Ney lisans sebebiyle yeniden üretildi — **TAMAM**

`ney/` tek başına bütün projeyi kısıtlıyordu: kaynağı **CC BY-NC 4.0** bir
Freesound paketiydi, diğer bütün ses klasörleri ise Art Libre / CC-BY 4.0 ile
ticarete açıktı.

**Çözüm indirmeden geldi:** depoda zaten duran ve ticarete açık olan
`all-samples/TURKISH-ARAB3.sf2` (Musical Artifacts 947, Art Libre) içinde
**yedi ayrı ney/nay preset'i** bulundu. Yeni üretici
`scripts/render-soundfont-instrument.mjs` + `scripts/lib/soundfont.mjs`
(SF2 okuyucu) yazıldı; `scripts/build-ney-samples.mjs` **kaldırıldı** —
çalıştırılması NC lisanslı içeriği sessizce geri getirirdi.

| ölçüt | eski (CC BY-NC) | yeni (Art Libre) |
|---|---|---|
| ölçülebilen kaynak | 10 kayıt / **7 perde** | **22 bölge** |
| kayıt aralığı | B3–Fs5 | **D3–C6** |
| aralık dışı yuva | **16/36** | **2/36** |
| en çok gerilme | ~11 yarım ton | **2,23 yarım ton** |
| ticari kullanım | **kısıtlı** | **serbest** |

**Ölçüm yine iki kez çürüttü:**
1. SF2 başlığındaki kök perde güvenilmez — `NEY-YEN-1-C`in sekiz bölgesi de
   tam **+2 oktav** sapmalı. Perde başlıktan değil sesten ölçülüyor.
2. **YIN+HPS uzlaşması da yetmiyor:** ikisi *birlikte* bir oktav kaçabiliyor
   (`Moss_NayB3` gerçekte 248,7 Hz iken 124,4 okundu). Kapalı döngü bunu
   yakalayamaz, çünkü aynı yanlı dedektör hem kaynağı hem üretileni ölçer.
   Ayırt eden kanıt spektrumda: `Moss_NayB3`in tepeleri 248'in tam katları ve
   124'te **tepe yok**; `Moss_NayD4`ünkiler ise 298'in 1,5 katını içeriyor,
   yani temel 149. `resolveFundamental` bu gözlemi kural hâline getirir.

**Bedeli açıkça kayıtta:** yeni kaynağın pes bölgesinde temel frekans zayıf,
uzlaşma oranı 1,00 → **0,81**. Sapan dosya **yok**; ölçülemeyen 7 dosya tepe
aralığı ve doğrudan spektrum incelemesiyle ayrıca doğrulandı.

> Denenen ve **işe yaramayan** yol da kayıtta: harmonik merdiven kapısını
> *bütün* enstrümanlara genişletmek. Ölçüldü — bağlama/rebab/kanun'da
> −1200…−10231 cent "çelişki" üretiyor (alt-harmonik belirsizliği), yani
> sağlam dosyaları kırardı. `resolveFundamental` de nefesli ney için
> türetilmiş bir kuraldır; telli/vurmalıda daha da kötüleştiriyor. İkisi de
> **ney yoluna sınırlı** tutuldu.

### F2 · Kayıt dışı perde bildirilsin — **TAMAM (kapsamı daraltıldı, sebebi aşağıda)**

**Plan "enstrümanın gerçek ses sahası" diyordu; o iddia atılmadı.** Bir sazın
organolojik ses sahası (neyin ahengi, bağlamanın düzeni) kaynak isteyen bir
musiki bilgisidir; elimizde her enstrüman için böyle bir kaynak **yok** ve
ADR 0001 uyarınca uydurulmaz. Onun yerine **ölçülebilen** şey bildirildi:
kaynak kayıtların kapsadığı perde aralığı.

Ölçüm (`ney`, Freesound 27726, YIN+HPS uzlaşması):

| ölçü | değer |
|---|---|
| uzlaşan kayıt | 10 / 13 |
| benzersiz perde | **7** (README'de 8 yazıyordu — düzeltildi) |
| kayıt aralığı | **B3 (243,2 Hz) – Fs5 (737,5 Hz)** = MIDI 59–78 |
| aralık dışı yuva | **16** (C3–As3 ve G5–B5) |

- `sample-provenance.ts` → `RECORDED_MELODIC_RANGES` + `describeMelodicSampleUse`.
  Ölçülmemiş enstrüman için cevap **"bilinmiyor"**, "sorun yok" değil — en
  sinsi hata orada olurdu.
- `SampleSlot.extrapolatedFrom` → API → `/samples` sayfasında **"Gerilmiş
  perde — en yakın gerçek kayıttan 11 yarım ton pese gerildi"** uyarısı.
- **Kapı:** `sample-provenance.test.ts` — 7 iddia; aralık sınırları (59 ve 78
  dâhil), mesafe (11 pes / 5 tiz), işaretlenen tam 16 yuva, ve ölçülmemiş
  enstrümanların **"unknown"** dönmesi.

**Yapılmayan:** `getNearestLoadedMelodicSample`'ın 7 yarım tonluk transpoze
sınırı değiştirilmedi. Bugünkü davranış zaten "en yakın gerçek sample'ı
kullan, yoksa sentetiğe düş"; eksik olan **bildirme**ydi ve o kapatıldı.
Sınırın kendisini değiştirmek için elimde ölçü yok.

### F3 · `hek` — türetilmiş olduğu görünür kalsın (D2) — **TAMAM**

Yerel vurmalı paketleri arandı: **gerçek `hek` kaydı yok** (`all-samples`
altında `hek` geçen tek dosya bile bulunmadı). Dolayısıyla dum+tek türetimi
kalıyor, ama artık **iddia edilmiyor**:

- `SampleSlot.derivedFrom` alanı eklendi — türetim, veri olarak taşınıyor
  (sembol adına bakan string kontrolüyle değil).
- `/api/samples` alanı her iki dalda da dışarı veriyor (dosya var / yok).
- `/samples` sayfası "**Türetilmiş ses** — gerçek kayıt değil, dum + tek
  toplamı ile üretildi" uyarısını gösteriyor.
- **Kapı:** `derived-sample-provenance.test.ts` — 6 iddia. Ters yönü de
  sabitliyor: gerçek kayıttan gelen darplar türetilmiş **diye
  işaretlenmemiş** olmalı. Ayrıca "gerçek hek kaydı yok" iddiası test
  edilir; bir gün bulunursa test **kırılır** ve türetimi bırakmayı hatırlatır.

### F4 · Dev güvenlik borcunu izlenebilir yap — **TAMAM**

`security-debt.test.ts` borcu **çevrimdışı** izler. `npm audit` çağrılmadı:
ağ ister, CI'da kırılgandır ve uzaktaki advisory veritabanı değiştiğinde
sonuç *bizim değişikliğimiz olmadan* döner. Bunun yerine borcun **kökü**
`package-lock.json`'dan okunur — deterministik ve belgede yazan sebebe bağlı.

Ölçülen kök (2026-07-27): 4 adet iç içe `brace-expansion@1.1.16`, dördü de
`eslint` zincirinde, hepsi `dev: true`. Üst düzey kopya zaten `5.0.8`.

Test iki yönde de kırılır:
- borç **azalırsa** (eslint zinciri `minimatch@3`ten kurtulursa) → belge
  güncellensin, override yeniden denensin;
- borç **büyürse** (açık sürüm üretim ağacına sızarsa) → gerçek regresyon.

### E1 · Tetikleyici ölçülsün, körlemesine yapılmasın — **ÖLÇÜLDÜ · YAPILMADI**

Ölçüm (`npm run audit:bundle-size`, 2026-07-27):

| ölçü | değer | bütçe | kullanım |
|---|---|---|---|
| toplam client chunk | 2,47 MB | 8 MB | **%31** |
| en büyük tek chunk | 0,47 MB | 1,5 MB | **%31** |

Kalan pay **5,53 MB**. E1'in kazancı gzip **3,4 KB** — kalan payın
**‰0,6**'sı. Tetikleyici ("bundle bütçesi zorlanırsa") **ateşlenmedi**.

**Karar: yapılmadı.** Sebep, planın kendi gerekçesinin hâlâ geçerli olması:
yeni üretilmiş dosya + derive betiği + senkron testi + kalıcı drift riski,
ölçülen kazancı aşıyor. Tetikleyici ölçülmeden "yapmayalım" demek de
"yapalım" demek kadar keyfî olurdu; ölçüldü, kayda geçti.

Yeniden bakılacak an: `audit:bundle-size` bütçenin %80'ini geçtiğini
raporladığında.

---

## 11. FAZ H — Kanıtın CI'da görünmesi (derin analiz: 2026-07-27)

> **Bu faz bir "kalan işler" listesi değil, bir teşhis.** "Kod işi kalmadı"
> dediğim yer kendi TODO'ma bakarak doğruydu; kodun kendisine ölçerek
> bakınca kök bir boşluk çıktı.

### 11.0 Kök bulgu — en güçlü kapılarımız CI'da koşmuyor

Projenin doğrulama gücü iki büyük girdiye dayanıyor ve **ikisi de gitignored**:

| girdi | durum | sonucu |
|---|---|---|
| `symb/` (SymbTr korpusu, 3000 eser) | `.gitignore:51` | **13 kapı CI'da atlanıyor** |
| `all-samples/` (ses kaynak arşivi) | `.gitignore:47` · 0 dosya izleniyor | sample üreticileri CI'da koşamaz |

Atlanan 13 kapı sıradan testler değil; projenin **manşet kanıtları** onlar:
`ticks` · `rows` · `meter-map` · `offset-replay` · `ornaments` ·
`repeat-structure` · `barline-split`. "1.192.643 olay", "5.802 bar-aşan nota",
"%98,03 ölçü doluluğu" — hepsi yalnız **bu makinede** doğrulanıyor.

Yani bugün bir refactor parser'ı bozsa **CI yeşil kalır**. Bu,
`docs/SECURITY-AUDIT.md`'de yazdığımız dersin simetriği: orada CI hep
kırmızıydı ve insanlara görmezden gelmeyi öğretiyordu; burada CI hep yeşil ve
**bakmadığı için** yeşil.

### 11.1 İkinci bulgu — yerel korpus koşusu zaman aşımına giriyor

`barline-split.test.ts` canlı korpus kapısı tek başına **13 s**, `test:coverage`
altında **44 s** sürüyor; `vitest.config` `testTimeout: 20000`. Yani coverage
koşusunda **deterministik olarak** düşüyor (rastgelelik değil, yük).

CI'da görünmüyor çünkü orada korpus yok → test zaten atlanıyor. Kusur tam da
11.0'ın gölgesinde saklanmış.

### 11.2 Üçüncü bulgu — "hepsini yeniden üret" fikri ÇÜRÜDÜ

F5'te ney'i soundfont'tan üretmek işe yarayınca doğal sonraki adım "aynısını
19 klasöre uygula" görünüyordu. **Ölçüldü, yanlış çıktı:**

| enstrüman | bugünkü uzlaşma | kaynaktan yeniden üretilse en çok gerilme |
|---|---|---|
| kemençe | **1,00** | 16,02 yarım ton · 20/36 yuva >3 |
| tambur | **1,00** | 14,23 · 12/36 |
| ud | **1,00** | 6,96 · 4/36 |
| bağlama | 0,64 | 13,32 (en iyi 3'lü kombinasyon) |
| rebab | 0,25 | **23,97** · 21/36 |
| *ney (yapıldı)* | 0,81 | **2,23** · 0/36 |

**Ney bir istisnaydı:** `Moss_Nay` + `NEY_05`in ölçülebilir bölgeleri tesadüfen
C3–B5'in tamamını kaplıyor. Diğerlerinde kaplamıyor — yeniden üretmek bugün
kusursuz olan dört enstrümanı **bozardı**. Bu faz o yüzden yeniden üretim
değil, **kaynağı kayda geçirme** üzerine kurulu.

### 11.3 Dördüncü bulgu — tanpura'nın iki ayrı sorunu var

1. **Ölçüm:** kaynağı olan Proteus `Tamburas` preset'inin 4 bölgesinin
   **hiçbiri ölçülemiyor**. Yani sorun bizim render'ımızda değil, malzemede.
2. **Domain:** tanpura bir **Hint** sazıdır; Türk müziğinin dem sazı değildir
   ve projede zaten `tambur` var. Türk soundfont'unda (113 preset) tanpura
   yok — olmaması beklenen şey.

Bu ikincisi bir mühendislik kararı değil; **kullanıcının kararı** (§11.7).

---

### H1 · Korpus kapılarını CI'da koşturulabilir yap — **TAMAM**

**Planlanan çözüm terk edildi, daha iyisi vardı.** Plan "korpustan özet türet,
özeti commit et" diyordu. Ama o yol CI'da **kodu koşturmaz**, yalnız iki
commit'li dosyayı karşılaştırır — regresyon yakalar, doğrulama yapmaz.

**Yapılan:** korpus zaten indirilebilir (Zenodo 15470412, CC-BY 4.0) ve depoda
`scripts/fetch-symbtr-v3.mjs` **vardı**. Arşivler yalnız **27 MB** (PDF hariç).
CI artık korpusu indirip önbelleğe alıyor; **13 kapı gerçekten koşuyor**.

Yol boyunca çıkan iki kusur:

1. **Betik Linux'ta kırılırdı.** Zip'i `tar` ile açıyordu; bu Windows/macOS'ta
   bsdtar olduğu için çalışır ama CI'daki (`ubuntu-latest`) GNU tar **zip
   okuyamaz**. Kimse görmemişti çünkü korpus CI'da hiç indirilmiyordu.
   Linux'ta `unzip` kullanılacak şekilde düzeltildi.
2. **Atlama sessizdi.** `it.skipIf(!hasCorpus)` korpus yoksa hiçbir iz
   bırakmadan geçiyordu. `REQUIRE_CORPUS=1` eklendi: CI bunu verir, indirme
   başarısız olursa `corpus-gate.test.ts` **kırmızı** olur.

- **Kapı:** `corpus-gate.test.ts` — 3 iddia. Kırılma yolu **gerçekten
  sınandı**: `symb/` geçici olarak kaldırılıp `REQUIRE_CORPUS=1` ile koşuldu,
  test düştü, korpus geri alındı.
- Üçüncü iddia mekanik: korpusa bağlı **yeni** bir kapı açık timeout almadan
  eklenemez (H2'nin kuralını kalıcı kılar). Bu iddia yazılır yazılmaz kendi
  dosyamdaki eksik timeout'u yakaladı.
- **Ortak zemin:** `corpus-gate.ts` — korpus yolu on dosyada tekrar ediyordu.

### H2 · Korpus kapılarının zaman aşımını düzelt — **TAMAM**

Ölçülen süreler (paralel koşu): barline-split **7,5 s** / 6,2 · meter-map
4,9 / 3,8 · offset-replay 4,4 / 3,6 · repeat-structure 3,4 / 2,9 / 2,4 ·
ornaments 2,4 · rows 2,4 / 2,0 · ticks 2,0.

En yavaş kapı 7,5 s; ama aynı kapı `test:coverage` altında **44 s** sürüyor —
enstrümantasyon ~6 kat yavaşlatıyor. Genel 20 s bu yüzden **deterministik**
olarak düşüyordu (rastgelelik değil, yük).

- 13 kapının hepsine `CORPUS_TIMEOUT_MS = 120_000` verildi (ölçülen en kötü
  halin ~3 katı).
- **Kapı geçti:** `npm run test:coverage` artık yeşil (exit 0).

### H3 · Ses kaynak arşivinin kimliğini sabitle — **TAMAM**

`public/samples/sources.json` — dört kaynak dosyanın `sha256`, boyut, köken
URL, lisans ve **ticari kullanım** durumu. (Arşiv 200 MB+; `TURKISH-ARAB3.sf2`
tek başına 206 MB — plandaki "56 MB" tahmini yanlıştı, ölçüldü.)

- **Kapı:** dosya yerelde varsa hash **tutmalı**; tutmazsa üretim
  tekrarlanamaz demektir ve test kırılır. Yoksa iddia edilmez.
- **İkinci kapı:** her kaynağın `commercialUse` alanı `serbest` olmalı —
  ney'in CC BY-NC borcu F5'te tam bu yüzden kapatıldı; kısıtlı bir kaynak
  yeniden eklenirse burada durur.

### H4 · Sample provenance'ını 20 klasörün tamamına yay — **TAMAM**

`public/samples/provenance.json` — her klasör için kaynak + preset + üretici +
**güven düzeyi**. Amaç klasörleri "belgeli" göstermek değil, belgesizliği
**sayılabilir** kılmak:

| güven | sayı | anlamı |
|---|---|---|
| `documented` | **1** | kaynak + preset + üretici biliniyor, yeniden üretilebilir (`ney`) |
| `claimed` | **17** | README preset *adını* yazıyor, üretim parametreleri kayıtsız |
| `unknown` | **2** | kaynağı hiçbir yerde yazmıyor |

**Yeni bulgu — `unknown` olan ikisi:** `bendir` ve `kudum`. README kaynak
eşlemesinde ikisi de yok, ve soundfont'un 113 preset'inde **`kudum` hiç yok**.
Yani uygulamanın **varsayılan vurmalısı** (`DEFAULT_PERCUSSION_INSTRUMENT`) —
en çok duyulan ses — kaynağı en belirsiz olanı.

- `/samples` sayfası artık her enstrümanın kaynağını yazıyor; üç düzeyin üçü
  de canlı doğrulandı (ney "yeniden üretilebilir" · ud "üretim parametreleri
  kayıtlı değil" · kudüm "**Kaynak bilinmiyor**").
- **Kapı:** kayıtsız klasör olamaz, bayat kayıt (klasörü silinmiş) olamaz,
  `documented` diyen bir klasörün üreticisi gerçekten depoda olmalı, ve
  sayılar sabit — belgesizlik sessizce artamaz.

### H5 · `hek` için gerçek kayıt ara — **TAMAM (bulunmadı, ama artık ölçümle)**

Önceki "arandı, yok" ifadesi yalnız **dosya adına** bakıyordu. Bu kez kaynağın
iç yapısı tarandı: 9 vurmalı preset, **354 benzersiz bölge adı**.

- Görülen vuruş sözlüğü: `finger` `bass` `trill` `phrase` `tek` `talking`
  `rim` `dum` `thubb` `slap` `doum` `slp` `ka` — **iki-el/eşzamanlı vuruş
  kategorisi yok**.
- Tek sözlüksel yakın eşleşme **"Finger Flam"** (20 bölge). Ölçüldü:
  **16/20'si birden çok vuruş** içeriyor, ilk iki vuruş arası 8–269 ms
  (ortanca **94 ms**). Yani çok vuruşlu ifadeler — flam tanımı gereği
  *kaydırılmış* iki vuruştur, `hek` ise eşzamanlı. Uygun değil.
- **Ek bulgu:** soundfont'ta **`kudum` preset'i hiç yok**. `hek`in kudum
  terminolojisi olması, bu paketlerde bulunmamasını açıklıyor.

Sonuç `provenance.json → hekSearch` içinde veri olarak duruyor; `hek` dum+tek
türetimi olarak kalıyor ve `/samples` sayfasında görünür.

### H6 · Yapısal borç — büyük dosyalar — **TAMAM**

| dosya | önce | sonra |
|---|---|---|
| `src/app/studio/follow/page.tsx` | 1024 | **685** |
| `src/app/references/curation/page.tsx` | 848 | **559** |

İkisi de grandfather listesinden **tamamen çıkarıldı** — artık normal 800
kuralına tabiler. Liste yalnızca kısalır.

**İki dosya iki farklı şekildeydi, çözümleri de farklı oldu:**

- `follow/page.tsx` bir **render** yüküydü: sağ sütun daha önce panellere
  ayrılmıştı, kalan ağırlık tek bir 357 satırlık `<Panel>`de toplanıyordu →
  `parts/FollowScorePanel.tsx`.
  Prop **adları ebeveyndeki değişken adlarıyla birebir** tutuldu, böylece JSX
  gövdesi tek karakter değişmeden taşındı (projenin `CurationReviewSections`
  deseni). Tipler elle yazılmadı, `ReturnType<typeof helper>` ile **türetildi**
  — ikinci bir gerçek kaynak oluşmasın diye.
- `curation/page.tsx` bir **mantık** yüküydü (JSX yalnız son 6 satır):
  dosyanın üçte biri, sunucuda okunan JSON manifestlerinin **şekil
  bildirimleriydi** → `curation-manifests.ts` (24 tip). Taşıma tamamen tip
  düzeyinde; tek satır çalışma zamanı kodu taşınmadı.

**Yol boyunca yakalanan kendi hatam:** ilk çıkarımda `startBeat` ve `title`
prop yapılmıştı. İkisi de serbest değişken değil, yalnızca özellik erişimi
(`event.startBeat`, `source.title`) ve bir JSX niteliğiydi — regex tabanlı
çıkarım yanılmıştı. Typecheck yakaladı.

**Doğrulama:** 1055 test yeşil · typecheck + lint temiz · mimari kapısı geçti ·
iki sayfa da canlı tarayıcıda **konsol hatasız** açıldı.

### H7 · Coverage — **TAMAM (ölçüldü, sonra yükseltildi)**

H2 çözülünce ölçüm alınabildi. **İki ortam ayrı ölçüldü** — çünkü CI'da korpus
yoktu ve yereldeki daha yüksek sayıya göre eşik koymak CI'yı kırardı:

| | yerel (korpuslu) | CI (korpussuz) | yeni eşik |
|---|---|---|---|
| statements | 69,73 | 69,47 | **69** |
| branches | 65,07 | 64,83 | **64** |
| functions | 78,30 | 78,30 | **77** |
| lines | 70,59 | 70,40 | **70** |

Eski eşikler 67/62/76/68 idi ve **aylardır güncel ölçüm görülmeden**
duruyordu — çünkü yerel coverage koşusu H2'deki zaman aşımına takılıyordu.

*(H1'den sonra CI de korpuslu koşacağı için iki sütun birleşecek.)*

---

### 11.7 Kullanıcının kararı bekleyen tek madde

**Tanpura projede kalsın mı?**

Ölçülen: kaynağının 4 bölgesinin hiçbiri ölçülemiyor; 36 dosyanın 35'i etiketiyle
uyuşmuyor; üç bağımsız yöntem uzlaşmıyor. Domain: tanpura Hint sazıdır, Türk
müziğinin sazı değildir ve projede zaten `tambur` var.

Üç seçenek:

1. **Kaldır** — enstrüman listesinden çıkar (klasör de gider).
2. **Bırak** — borç testte görünür kalmaya devam eder.
3. **Kaynak getir** — ölçülebilir bir tanpura kaydı bulunursa yeniden üretilir.

Bu bir mühendislik kararı değil, **ürün kararı**; ADR 0001 gereği tek başıma
vermem.

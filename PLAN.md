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

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

## ⏳ AÇIK İŞLER — öncelik sırası (2026-07-27)

> **Nasıl yapılacağı [PLAN.md](PLAN.md)'de.** Bu liste yalnız *ne* ve *hangi
> sırayla*. Aşağıdaki §A–§L bölümleri tamamlanmış işin kaydıdır.
>
> Kök teşhis: **motorun metrik bağlamı yok.** Parser 19 satır kodundan yalnız
> `9`'u okuyor; atılan **31.605 süreli satır** ve okunmayan yazılı mertebe
> yüzünden ölçü, tahminle (`ceil(offset)`) kuruluyor. L1 bu yüzden inmedi —
> yaprak değil, gövde sorunu.

### Öncelik 1 · FAZ A — Ana motor · PLAN §3

Ölçü, tahmin yerine **yazılı mertebeden** türetilsin; zaman tek ve tamsayı
tick ekseninde olsun.

- [x] **G0** · 8 temsilci `.txt` fixture'ı commit edildi + baseline fotoğrafı
      *(`fixture-baseline.test.ts`, 11 test — `5ed99787`)*
- [x] **G1** · Tick primitifi — **`TICKS_PER_WHOLE = 524160`** (plandaki `40320`
      değil) · **kapı geçti ve sabiti değiştirdi:** korpusun gerçek payda kümesi
      `1 2 3 4 6 7 8 12 13 16 20 24 32 36 48 64 72 78 120 128`; `40320` **13**
      ve **78**'i bölmüyordu → EKOK alındı. 55 test yeşil; mimari kuralı eklendi
      (`src/core/time` hiçbir şeyi import edemez).
- [x] **G2** · `rows.ts` (hiçbir satır atılmıyor) + `meter-map.ts` +
      `usul-map.ts` + `encoding.ts`, tüketicisiz · `parser.ts` dokunulmadı
      · **kanıtlananlar:** zaman ilerletme kuralı `Pay>0 && Payda>0 && kod!==51`
      (1.211.994 satırda sıfır istisna) · kod-52 = **tempo**, kanonik zamanı
      ilerletmez (62:1 ölçüm) · kod 8/12/23/24/7 anlamları MusicXML ile
      hizalanarak türetildi · mu2'de **134 usul adı** var ve motor hiçbirini
      okumuyor · mu2 kodlaması **Windows-1254**
- [x] **G3** · Offset yeniden üretim kapısı · **KAPI GEÇTİ: 2987/2999 (%99,6)**
      · `RowAdvance {canonical, offsetReplay}` — tek fonksiyon iki sayı
      · karşıt kanıt: `Offset` üretimi kod-52 **dâhil** %99,6 / hariç %25,4;
      tam ölçüye oturma **hariç** %75,8 / dâhil %21,0 → iki eksen de gerekli
      · eşleşmeyen 12 eser sabitlendi (11'i donmuş `Offset`, 1'i tek mu2/TXT
      çelişkisi: `hicaz_uzzal--zeybek` mu2 9/4 der, Offset 9/8 ile yazılmış)
- [x] **G4** · Keşif koşusu · **G6'yı ÇÜRÜTTÜ.** 2987 eser / 1.157.450 nota:
      mevcut `ceil(offset)` %86,39 · planlanan `floor(offset)+1` **%76,23**
      (10 puan daha kötü). Kohorta ayırınca sebep çıktı: tempo işareti
      **olmayan** eserlerde `ceil(offset)` zaten **%98,58** doğru, olanlarda
      %83,56. **Sorun formül değil eksen** — `Offset` kod-52'nin hayalet
      süresini taşıyor. → ölçü artık `Offset`ten değil `MeterMap` yürünerek
      · yan ölçüm: doğru ızgarayla ölçülerin **%93,13'ü tam dolu**
      (TODO'daki %64,9 bozuk ızgaradandı); bar-aşan nota yalnız **%0,50**
- [x] **G5** · PDF `measureIndexBasis` alanı — 520 girdi damgalandı
      (`offset-ceil-v1`), `isVerificationCurrent` tabanı kontrol ediyor,
      iki doğrulayıcı betiğe kapı eklendi · sabit **tek kaynak**
      (`scripts/lib/symbtr-score-measures.mjs`) ve TS ile eşitliği test ediliyor
      · pivotta 18.334 kutu **görünür** düşecek, sessizce kaymayacak
- [x] **G6** · **PIVOT YAPILDI** · `measureIndex = measureAt(kanonikBaşlangıç)`
      (~~`floor(offset)+1`~~ çürütüldü) · yazılı mertebe `mu2` satır-1'den
      · **ölçülen kayma: 160.860 nota (%13,82)**; tempo işareti olmayan
      eserlerde yalnız %1,51 · toplam ölçü sayısı değişen eser 1.768/2.999
      · her olay `measureIndexBasis` taşıyor — taban örtülü kalmıyor
      · TS ↔ `.mjs` eşdeğerliği 8 fixture'da test ediliyor
      · G5 valfi tetiklendi: 520 PDF girdisi bayatladı, kutular **görünür**
      şekilde 0'a düştü (veri silinmedi)
- [x] **G6.1** · PDF ölçü kutuları `meter-walk-v2` ile yeniden doğrulandı
      · **546 girdi / 19.064 kutu** (öncesi 520 / 18.334 — *arttı*)
      · `verify:symbtr-measures` **0 hata** · pivot sırasında 0'a düşen kutular
      geri geldi · üç bayat türev artefakt da yenilendi (review template,
      empty-import dry-run, verification manifest)
      · yeni kapı: temizlik yalnız **makine üretimi** kayıtları siler;
      `human-reviewed`/`visual-regression` emeği silinmez, raporlanır
- [ ] **G7** · L1: bar-aşan nota bölme + bağ · **gerçek kapsam G4'te ölçüldü:
      5.787 nota (%0,50)**; ölçü doluluğu %93,13 → ~%99. Çalma nota sayısı ve
      toplam süresi DEĞİŞMEMELİ
- [ ] **G8** · Doğrulamayı totolojiden çıkar
      *(`validator.ts:64-72` bugün hiç tetiklenemiyor; `quality.ts:36-44`
      yanlış mertebeyle karşılaştırıyor)*

### Öncelik 2 · FAZ C/C1 — e2e blokajı · PLAN §5 · **kullanıcı eylemi**

- [ ] 3000 portunu boşalt: `taskkill /PID 12356 /F` — takılmış `next dev`
      HTTP'ye yanıt vermiyor, **23 e2e testi hiç çalışmadı**

### Öncelik 3 · FAZ B — Kaynak zenginliği · PLAN §4 · *FAZ A'ya bağlı*

- [ ] **B1** · Süslemeler: grace (15.984 satır), trill (3.443), tremolo (3.807),
      mordent (841) — MusicXML çapraz-doğrulamayla kimliklendirildi
- [ ] **B2** · Çözülemeyen 9 kod (code-1/4/10/11/24/28/32/43/44) — çöz veya
      `unsupported` olarak dürüstçe raporla
- [ ] **B3** · mu2 metadata bloğu (makam+karar, usul adı, form, bestekâr,
      güftekâr, eser adı, tür) — 3000/3000 dosyada var, hiçbiri okunmuyor
- [ ] **B4** · mu2 code-14 darp gruplaması (46.214 satır) — usul vurgusunu
      kaynaktan verir, bugün `USUL_DATA`dan geliyor
- [ ] **B5** · Tekrar işaretleri (TXT açılmış 1,488×, mu2 koruyor)
- [ ] **B6** · code-51 usul adı v3 regresyonu (382/382 boş; v2'de 319/411 dolu)
- [ ] **B7** · `TempoMap` — code-52 BPM 7-bit kırpılmış,
      `(LNS>=127 ? 127+Bas : LNS)` kuralı %87,3

### Öncelik 4 · FAZ C — Doğrulama borcu · PLAN §5

- [ ] **C2** · K5 sanallaştırma/responsive geometrisi tarayıcıda *(C1'e bağlı)*
- [ ] **C3** · `audit:score-engine-*` browser denetimleri *(C1'e bağlı)*
- [ ] **C4** · 4 tek-kalan triole notası (%0,18) — G7 sonrası yeniden ölç

### Öncelik 5 · FAZ D — Ses kütüphanesi · PLAN §6 · *stüdyo işi*

- [ ] **D1** · Ney kapsamı 10/36, `D3→B3` arası 9 yarım-ton delik — kayıt gerek
      *(kırpılacak kusur yok; ses 0 ms'de başlıyor)*
- [ ] **D2** · `hek` gerçek kaydı *(şu an dum+tek toplamından türetiliyor)*

### Öncelik 6 · FAZ E — Tetikleyici bekleyen · PLAN §7

- [ ] **E1** · Korpus JSON süzme — gzip 3,4 KB kazanç (%0,14). **Tetikleyici:**
      bundle bütçesi zorlanırsa

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

### B1 ✅ ÇÖZÜLDÜ — `repeat-volta-endings` (2026-07-26)

**Kaynak:** SymbTr v3 PDF (hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey.PDF).
PDF metin katmanında "TESLøM" — ø (U+00F8) segno işareti, Teslim bölümü başlangıcı.
Mu2: Teslim beat 21.0625. ScoreSurface'te segno glyph'i Teslim bölümüne çiziliyor.
Glyph dispatch: `source-proven`, `rendered: true`.

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

### B6 ✅ ÇÖZÜLDÜ — Gönül-dışı makamlar temizlendi + hisarbuselik (2026-07-26)

9 makam kaldırıldı, 3 makam korundu (bkz. B4). `hisarbuselik`: korpus koma
(25 eser, dügah kararlı) + Wikipedia teyidi (Hisar+Bûselik birleşik).
Aralıklar [2,1,2,2,1,2,2], seyir eklendi.

## C — Bilinçli ertelenmiş (tasarım kararı; tetikleyici olmadan açılmaz)

- [x] **C1 · Alıştırma dizini** ✅ — `/exercises`: 280 sayfa PDF render + OCR dizin (8 makam).
      `scripts/extract-exercise-index.py` ile otomatik çıkarım. *(eski: F14.5)*

## D — Motor denetimi ✅ TAMAMLANDI (2026-07-26)

> **Durum:** D1–D15 uygulandi ve dogrulandi. Kapanis dogrulamasi:
> `typecheck` PASS (0 hata) · `test:run` **111 dosya / 743 test PASS**
> (baslangic: 107 / 695) · `lint` PASS (0 hata, 0 uyari) ·
> `guardrails:architecture` PASS · `build` PASS ·
> `audit:bundle-size` PASS (2,47 MB toplam, en buyuk chunk 0,47 MB).
>
> **Olculen etki:**
> - Parser NaN zaman ekseni: **124 → 0** event (gercek korpus, 401 dosya)
> - Sessizce yanlis sure cizimi: **5.678 → 0**; tam temsil %96,12 → **%98,06**
> - "Karar: C" 48 makamda gosteriliyordu → **0** (24 adimda DOM testiyle sabit)
> - `repeat-volta-endings` sabit "cizildi" iddiasi → belgeden turetiliyor
>
> **Kapsam disi birakilanlar (gerekceli):**
> - **D7 — ayri `hek` sample slotu:** yeni SES KAYDI ister; ses uydurulmaz.
>   Eslesme dogru aileye (`dum` + vurgulu) cekildi, slot acilmadi.
> - **D12 — viewport sanallastirma + responsive genislik + playback
>   look-ahead:** parcali render (`SYSTEMS_PER_FRAME`) uygulandi; tam
>   sanallastirma ayri bir is.
> - **D15 — `VirtualPiano` silme:** olu ama tam testli bir UI bileseni;
>   silmek urun karari, kusur duzeltmesi degil. Yerinde birakildi.
> - **D15 — 150 KB korpus JSON'un istemciye gitmesi:** server-only + API
>   dilimi yeniden yapilanmasi ister; bundle butcesi su an geciyor.

> **Aşağısı bulguların açıldığı andaki kaydıdır** (kanıt ve ölçümle birlikte);
> her maddenin altındaki kutular yapılan işi gösterir. Ses / nota / makam-usul
> motorlarının derin incelemesi. Bulguların hiçbiri kırık build veya kırmızı
> test değildi — `typecheck` 0 hata, `test:run` 107 dosya / 695 test PASS iken
> hepsi yeşilin altından geçiyordu; asıl mesele buydu.

### D1 · Parser `0/0` satırında NaN üretiyor, zaman ekseni zincirleme çöküyor 🔴

`src/data/symbtr/parser.ts:126` `durationBeats = (pay / payda) * 4`; korpusta
`pay=0, payda=0` satırları var → `NaN`. `parser.ts:158` `startBeat += durationBeats`
olduğu için **NaN bir kez girdiğinde o eserin geri kalanının tamamı** NaN
`startBeat`/`startTime` alıyor.

**Ölçüm** (401 SymbTr dosyası / 146.477 event): 5 bozuk süre → **124 event'in
zaman ekseni çökmüş**, 4 dosya etkileniyor. `acemkurdi--sarki--semai--sen_kalbimin--teoman_alpay.txt`
tek başına event #79'dan sonraki 124 event'i kaybediyor. Oran ~%1 dosya →
3000 eserlik katalogta ~30 eser.

`validator.ts:84` yalnız `durationBeats`i kontrol ediyor (5 hata üretiyor);
`startBeat`/`startTime` sonluluğu **hiç kontrol edilmiyor** (124 çökük event
için 0 hata). `measure-duration-overflow` (`validator.ts:66`) da NaN'la sessizce
false dönüyor. Ayrıca `CanonicalScorePrototype` select'inde `disabled` yalnız
`eventCount === 0` için — `validation.ok === false` belge kullanıcı tarafından
seçilebiliyor; NaN `startTime` ile `getActiveCanonicalEvent` hiç eşleşmiyor
(NaN karşılaştırmaları false) → imleç ölüyor.

- [x] Parser'da `pay/payda` sonlu ve `> 0` değilse event'i **reddet** (veya
      `isRest` + explicit `invalid` işareti), `startBeat`i asla NaN'la ilerletme.
- [x] `validator.ts`'e `startBeat`/`startTime` sonluluk kontrolü ekle.
- [x] Select'te `validation.ok === false` belgeleri de disable et veya uyar.

### D2 · `repeat-volta-endings` dispatch'i hard-coded — denetim kapısının tek deliği 🔴

`src/features/score-engine/workbench/score-format.ts:244-250` durumu belgeden
türetmiyor: `status: "source-proven"`, `rendered: true` ve `evidence` tek bir
eserin PDF adına sabitlenmiş. Ama `ScoreSurface.tsx:304-328` segno'yu **yalnız
"teslim" etiketli bölüm varsa** çiziyor. Teslim'i olmayan her belgede manifest
"source-proven / rendered" diyor, hiçbir şey çizilmiyor ve **başka bir eserin**
kanıtını gösteriyor.

Aynı dosyanın docblock'u "`rendered` yalnız source-proven veya policy-derived
durumlarında true olabilir" diyor; bu kayıt şartı **iddia ederek** sağlıyor.
Yanındaki `key-signature`, `slur-tie`, `natural-accidental` kayıtlarının hepsi
belgeden hesaplanıyor — doğru desen zaten dosyada, bu tek istisna
`score-glyph-class-map` denetimini kendi kendini onaylayan hale getiriyor.

- [x] Kaydı belgeden türet: Teslim bölümü + çizilen segno varsa `source-proven`,
      yoksa `missing` / `rendered: false`. Evidence'ı da o belgeden üret.

### D3 · 48 makamın hepsinde `tonic: "C"` ve öğrenciye "Karar" diye gösteriliyor 🔴

**Ölçüm** (runtime `MAKAM_DATA`): 48 makam, tonic kümesi = `['C']` — istisnasız.
`MakamStepper.tsx:110` `Karar: {makam.tonic}` render ediyor → Rast, Hicaz,
Segah, Eviç, Nevâ… hepsi için ekranda **"Karar: C"**. Hemen yanındaki
`description` ise "dügâh'ta karar kılar" (nevâ), "ırak perdesinde karar kılan"
(eviç) diyor — öğretim yüzeyi kendi kendisiyle çelişiyor.

`getMakamKomaFrequencies` / `snapMidiToMakamFrequency` de her makamın kararını
aynı C'ye demirliyor: aralıklar korpustan doğru, mutlak register tek tip yer
tutucu.

- [x] `tonic`i AEU perde adına bağla (rast=G, dügâh=A, segâh, ırak…) veya
      alanı kaldırıp UI'da korpus kararını göster. Ara çözüm olarak en azından
      UI'da "Karar: C" yazmayı durdur.

### D4 · `dominant` (güçlü) kaynaksız el-yazımı veri, kesin bilgi gibi sunuluyor 🔴

**Ölçüm** (runtime `MAKAM_DATA`, `dominant`in makamın kendi `intervals` dizisinde
kaçıncı derece olduğu): 5. derece 19/48, 4. derece 6, 3. derece 6, 2. derece 5,
6. derece 1 ve **11 makamda `dominant` makamın kendi dizisinde hiç yok**:
`ussak(E), saba(F), segah(D), bayati(A), kürdi(D), hüzzam(A), hisarbuselik(E),
zirefkend(D), dügah(G), müstear(E), rehavi(F)`.

Uşşak'ın güçlüsü nevâ (5. derece) ama kayıt "E"; Hüseyni'nin güçlüsü hüseyni
(5.) ama kayıt "A". Bu değerler `MakamStepper.tsx:112`'de "Güçlü: E" olarak
öğrenciye basılıyor.

Tek testi (`koma-scale.test.ts:135`) kendi yorumunda itiraf ediyor: *"Guclu
frekansla kesin turetilemez; en azindan… korpus koma dizisinde (±1 yarim-ton)
yer aldigini garanti ederiz"* — neredeyse her değerin geçtiği bir kapı. Test
`komaScale.degrees`e bakıyor, `intervals`e değil; iki temsil arasındaki bu fark
sapmayı da gizliyor.

`intervals`, `keySignature`, `komaScale`, `seyir` korpus türevine taşınmışken
korpus bağı olmayan tek alan bu — "kaynak yoksa uydurulmaz" kuralı tam burada
deliniyor.

- [x] Güçlüyü kaynağa bağla (Gönül/Özkan derece tablosu) veya alanı kaldır.
      Kaynaksızsa UI'da gösterme. Test'i "dizinin bir derecesi" değil "kaynakta
      yazan derece" olarak sıkılaştır.

### D5 · VexFlow süre merdiveni: 32'lik ve triole notalar yanlış değerle çiziliyor 🟠

`notation.ts:67-78` bir taban-merdiveni; tabanı 16'lık. **Ölçüm** (401 dosya /
146.477 event): **5.678 event (%3,88) yanlış süreyle çiziliyor.** Dağılım:

| kaynak | event | çizilen |
|---|---|---|
| `1/32` (0,125 vuruş) | 2.099 | 16'lık (0,25) |
| `1/12`, `1/24`, `1/48` (triole) | 2.255 | 16'lık |
| `3/32` | 708 | 16'lık |
| `5/8` (2,5) | 289 | ikilik (2) |
| `7/8` (3,5) | 80 | noktalı ikilik (3) |
| `5/4`, `3/2`, `9/8` (5 / 6 / 4,5) | 171 | birlik (4) |

Yani **32'lik ve daha kısa her nota 16'lık olarak çiziliyor**; 2.255 triole
bracket'sız ve yanlış değerle çiziliyor. Dispatch tablosu
`tuplet-time-modification: unsupported, rendered: false` diyor ama triolenin
*notaları* render ediliyor — sadece yanlış değerle. Bağ (tie) üretimi de yok,
bu yüzden >4 vuruşluk 174 event birliğe kırpılıyor.

`ScoreSurface.tsx:245` `Voice(...).setStrict(false)` VexFlow'un ölçü-dolumu
kontrolünü kapattığı için uyuşmazlık hiç yüzeye çıkmıyor.

- [x] Merdiveni `durationFraction` (parser'da tam pay/payda mevcut) üzerinden
      kur; 32'lik/64'lük ekle, >4 vuruşu bağ ile böl.
- [x] Triole'yi ya `Tuplet` ile çiz ya da event'i `unsupported` işaretleyip
      dispatch'te dürüstçe raporla — şu anki "not-rendered" iddiası yanlış.

### D6 · Nota motorunun imleci duvar saatinde, ses motorununki ses saatinde 🟠

`CanonicalScorePrototype.tsx:146-151`: `performance.now()` + `setInterval(80ms)`,
durdurma `setTimeout((duration+0.35)*1000)`. Ses ise `playArrangement` içinde
`context.currentTime + 0.04` üzerinden planlanıyor.

Ritim motorunda tam bu problem çözülmüş (`instruments.ts:483` `heardContextTime`,
`getOutputTimestamp`, ölçülen ~53 ms çıkış gecikmesi, rAF) — ScoreEngine o
düzeltmeyi hiç almamış. İmleç sesin önünde gidiyor, iki saat ayrıştıkça sapma
büyüyor, üstelik 12,5 fps.

- [x] Score playback'i `heardContextTime` + rAF'a taşı (ritim motorundaki
      deseni yeniden kullan).

### D7 · 7 darp → 3 sample; `hek` hafif sol-el ailesine düşüyor 🟠

**Ölçüm** (`usul/data.ts` darp sıklığı): `tek` 495, `dum` 345, `ka` 213,
`te` 147, `ke` 145, `hek` 36, `ta` 19. Sample kütüphanesi yalnız dum/tek/ke
(`sample-library.ts:72`). `engine.ts:96-101` `te→tek, hek→tek, ka→ke, ta→dum`.

`hek`, dosyanın kendi kaynak notunda (`usul/data.ts:56`) "iki elin birlikte
vuruşu" — ama hafif sol-el ailesine (`tek`, gain 0,46/0,62) eşleniyor ve
`ACCENTED` kümesi yalnız `{dum, ta}` olduğu için hiç vurgulanmıyor. 36 `hek`
darbı Berefşan / Muhammes / Remel velvelelerinde geçiyor.

- [x] `hek` için ayrı sample slotu aç (kaynak var: iki el birlikte) veya en
      azından `dum` ailesine eşleyip `ACCENTED`e kat.

### D8 · Uzun darplar tek vuruşa kırpılıyor 🟠

`instruments.ts:383` `Math.min(Math.max(timeValue, 0.25), 1)`. **Ölçüm**:
`usul/data.ts`'teki 1.400 darbın **361'i (%26) `timeValue > 1`** — hepsi 1
vuruşa kırpılıyor. Berefşan'ın `[1,"dum",4]` Düüüüm'ü 1 vuruşluk Dum'la aynı
sesleniyor.

Yorumdaki gerekçe geçerli (sample'ın doğal ikinci vuruşu duyuluyordu) ama
düzeltme yanlış katmanda: sample kırpma/envelope işi, notalı değeri atmakla
çözülmüş.

- [x] Envelope'u sample uzunluğundan bağımsız kur (loop/fade), `timeValue`yi
      koru.

### D9 · Velvele kısma sezgiseli yarım çalışıyor 🟡

`instruments.ts:386` `gainScale` yalnız `timeValue < 1` olan darplara uygulanıyor.
**Ölçüm**: 748 darp `timeValue === 1`, 291 darp `< 1`. Gönül velvelelerinde
dolgu vuruşlarının çoğu `timeValue: 1` yazılı → tam gain'de çalıyorlar.
"Ana iskelet öne çıksın" niyeti yalnız te-ke ikilileri için gerçekleşiyor.

- [x] Süslemeyi `timeValue` yerine "ana darp mı velvele mi" bilgisinden türet
      (velvele dizisi zaten ayrı alanda).

### D10 · `RhythmLoopController.stop()` kendi planladığı sesi durdurmuyor 🟡

`instruments.ts:581` yalnız `clearInterval` yapıyor; WebAudio'ya girmiş 0,6 s'lik
(`LOOKAHEAD_SECONDS`) vuruşlar çalmaya devam ediyor. İki gerçek çağıran bunu
global `stopAll()` ile örtüyor (tüm AudioContext'i suspend eden çekiç).

Ama **re-entrancy bail-out yolunda** (`rhythm/page.tsx:160`,
`useUsulPlayback.ts:104`) yalnız `controller.stop()` çağrılıyor — orada
`stopAll()` çağrılamaz çünkü kazanan döngüyü de öldürür. `startRhythmLoop`
dönmeden önce `scheduleDueHits()`i senkron çağırdığı için terk edilen döngünün
0,6 s'lik vuruşları canlı döngünün üstüne biniyor (hızlı çift tıklamada flam).

- [x] Controller kendi planladığı `AudioBufferSourceNode`'ları izlesin ve
      `stop()` yalnız onları iptal etsin.

### D11 · Varsayılan vurmalı seti örtük bir yığın 🟡

`sample-library.ts:166` `PERCUSSION_SAMPLE_LIBRARY` 9 vurmalı enstrümanın
dosyalarını tek listede birleştiriyor; `getFirstLoadedPercussionSample` ilk
yükleneni seçiyor. `PERCUSSION_INSTRUMENTS` sırası `bendir, kudum, davul, def,
darbuka, zilli_def, kaşık, zil, nakkare` olduğu için **enstrümansız her çalma
bendir sesi veriyor** — açık bir karar değil, dizi sırasının yan etkisi.
Ayrıca enstrümansız preload ~54 dosya indirip 3'ünü kullanıyor.

- [x] Varsayılan vurmalıyı explicit sabit yap; preload'ı yalnız seçili
      enstrümanla sınırla.

### D12 · Render ölçeklenmiyor 🟡

`score-format.ts:146` her sistemi sabit 210 px adımla tek SVG'ye diziyor;
`score-layout.ts:19-20` sistem başına 7 çeyrek-vuruş / 24 event. Tam bir peşrev
yüzlerce üst üste porte demek — hepsi tek effect'te senkron, sanallaştırma /
sayfalama yok, her biri kendi `Formatter().format()`'ıyla. `accidentals`
katmanını aç/kapat `innerHTML = ""` ile tümünü baştan kuruyor.

`getSurfaceWidth()` sabit 1180 döndürüyor — yüzey responsive değil. Aynı effect
içinde `ScoreSurface.tsx:315` `await import("vexflow")`i ikinci kez çağırıyor
(`GLYPHS` zaten satır 159'dan kapsamda).

`playArrangement` da tüm eseri bir kerede planlıyor (ritim motorundaki 0,6 s
look-ahead pump'ının karşılığı yok).

- [x] Sistemleri viewport'a göre sanallaştır veya sayfala; playback'i
      look-ahead pencereyle planla.

### D13 · Belge yükleme yarışı + gereksiz liste fetch'i 🟡

`CanonicalScorePrototype.tsx:73` `loadCanonicalDocument`'ta AbortController /
generation guard yok → hızlı belge değişiminde eski yanıt sona gelirse **yanlış
eser** gösterilir. Ayrıca liste effect'inin (`:90-116`) bağımlılığında
`selectedDocumentId` var ve `loadCanonicalDocument` onu set ediyor → her
seçimde `/api/score-engine/documents` yeniden çekiliyor.

- [x] Generation counter / AbortController ekle; liste effect'ini seçimden ayır.

### D14 · Makam ↔ usul korpus eşleşmesi zıt stratejilerde 🟡

`usul/data.ts:22` açık, gözden geçirilmiş alias tablosu (`CORPUS_NAME_ALIASES`)
kullanıyor. `makam/data.ts:32` ise bulanık Levenshtein eşleşmesi (`withinOneEdit`)
— benzersizse kabul. `near.length === 1` *belirsizliği* engelliyor, *yanlışlığı*
engellemiyor: korpus büyüdükçe 1-edit çakışması sessizce yanlış makamın koma
dizisini ve arıza imzasını bağlayabilir. Log yok, makam başına çözümlenen
anahtarı sabitleyen test yok.

**Ölçüm** (runtime): 48 makamın 42'si `komaScale`, 40'ı `keySignature`, 44'ü
`seyir` alıyor → **6 makam korpus koma'sı almıyor** ve `intervals`'ı el-yazımı
kalıyor.

- [x] Makam tarafını da açık alias tablosuna geçir; çözümlenen anahtarı makam
      başına sabitleyen snapshot testi ekle.

### D15 · Küçük bulgular 🟢

- [x] `instruments.ts:227-233` vurmalı dalı `percussionInstrument`ı düşürüyor
      (`preloadPercussionSymbolSamples(["tek"])` ve `scheduleSampledPercussionHit`
      parametresiz), synth fallback ise geçiriyor. **Şu an ulaşılamaz**:
      `InstrumentSurface.tsx:101` melodiğe kelepçeliyor, samples sayfası
      `playRhythm` kullanıyor, `VirtualPiano` hiçbir sayfada render edilmiyor.
      Latent; düzeltilmeli ama kullanıcıya görünmüyor.
- [x] `VirtualPiano` ölü kod — yalnız `shared/ui/index.ts` barrel'ından export
      ediliyor ve kendi testinde kullanılıyor; hiçbir sayfa render etmiyor.
- [x] Ölü export'lar: `nota/data.ts` `NOTE_DATA` (18 satırlık, `midiToFrequency`i
      kopyalayan sabit tablo), `parseSymbTr` (bozuk identifier'da hata yerine boş
      string dönüyor), `makam/data.ts` `komaToFrequency`.
- [x] `getMeasureIndex` 4/4 fallback'i **iki yerde kopyalanmış**
      (`canonical-score.ts:245`, `importer.ts:342`). Gerçek korpusta hiç
      tetiklenmiyor (ölçüm: 0/146.477 null `measureIndex`), ama kullanıcı
      yüklemesi (untrusted) yolunda 10/8, 28/4 eserleri 4 vuruşta bir bölerdi.
- [x] `samples.ts:21` `fetch(url, {cache: "reload"})` HTTP cache'i baypas ediyor;
      her sayfa yüklemesinde tüm sample'lar yeniden ağdan iniyor.
- [x] Ney kapsamı 10/36 ve boşluklu (`D3(50)` sonrası `B3(59)`: 9 yarım-ton
      delik). Ney `playScale`'in varsayılan enstrümanı; 54-56 aralığı 4-6
      yarım-ton pitch-shift'le üretiliyor, formant kayması duyulur.
- [x] `getMakamScale` 12-TET izdüşümü — MakamStepper'daki "Perde dizisi" sesin
      çaldığı koma dizisi değil; aynı ekranda iki farklı gerçeklik.
- [x] `makam-corpus.json` (128 KB) + seyir (22 KB) istemciye gidiyor
      (`/studio`, `/ogren`); `attachCorpusData` hydration'da 48 makam için tüm
      korpus anahtarlarına karşı edit-distance koşuyor. Bundle guard'ı
      (1,5 MB/chunk) geçiyor ama gereksiz.

---

## K — Kalan işlerin kökten çözümü ✅ TAMAMLANDI (2026-07-26)

> D bölümünde kapsam dışı bırakılan altı iş, ölçümle açılıp kökünden çözüldü.
> Kapanış: `typecheck` PASS · `test:run` **111 dosya / 763 test PASS** ·
> `lint` PASS · `guardrails:architecture` PASS · `build` PASS ·
> `audit:bundle-size` PASS.

### K1 · Vurmalı sample'lar tek vuruşa kırpıldı ✅

Dalga formu analizi (64 dosya, 10 ms tepe zarfı) **kudüm'ün `dum`/`ke`/`tek`
kayıtlarının ~10 ms ve ~310 ms'de İKİ vuruş içerdiğini** gösterdi —
`kudum/tek.wav`'da ikinci vuruş birincidan daha güçlüydü. Kudüm D11'de
varsayılan vurmalı yapılmıştı, yani en çok çalınan dosyalar bozuktu.
"Teklerde iki vuruş geliyor" (2026-07-14) bir kod hatası değil, **dosya
içeriği** sorunuymuş; D8'deki `SAMPLE_REBOUND_GUARD_BEATS` semptomu örtüyordu.

Gerçek vuruşu doğal rezonanstan ayıran ölçüt ölçüldü — gerçek: aralık
290-300 ms / yükseliş 5,0-7,9×; rezonans (zil, davul, zilli def): 30-260 ms /
1,2-3,3×. Eşik olmadan zil 1600 ms'den 70 ms'ye kırpılıp yok oluyordu.

- [x] `scripts/trim-percussion-samples.mjs` (dry-run + `--write`) — 3 kudüm
      dosyası ilk vuruşa kırpıldı, **54/54 sample artık tek vuruş**.
- [x] `SAMPLE_REBOUND_GUARD_BEATS` kaldırıldı; uzun darplar (korpustaki 1.400
      darbın %26'sı) artık notalı değerleri kadar sesleniyor.
- [x] `sample-library.test.ts`'e tek-vuruş regresyon kapısı eklendi.

### K2 · Triole (tuplet) desteği ✅

SymbTr `pay/payda` tam notaya göredir; payda 3'ün katı ve payda/3 ikinin
kuvvetiyse üçlü bölünmedir (1/12 → sekizlik, 1/24 → onaltılık, 1/48 →
otuzikilik). `getTupletContext` + `mapEventDurationToVex` bunu ayırıyor,
`ScoreSurface` ardışık aynı-paydalı notaları **3:2 bracket**'iyle çiziyor.

- [x] **2.178 event** artık gerçek tuplet olarak çiziliyor (önce yaklaşık).
- [x] `tuplet-time-modification` dispatch'i `source-proven`/`rendered` —
      eskiden "not-rendered" diyordu ama notalar çiziliyordu.

### K3 · Bağ (tie) ile bölme ✅

Tek standart değerle yazılamayan süreler greedy olarak standart değerlere
bölünüp bağlanıyor: 5/8 → ikilik+sekizlik, 5/4 → birlik+çeyreklik, 3/2 →
birlik+ikilik. `ScoreSurface` bir event'i N notaya çiziyor; arıza/annotation
yalnız ilk parçaya konuyor, kaynak-kanıtlı bağlar son notadan bağlanıyor.

- [x] **583 event** bağla bölünüyor.
- [x] **Süre sadakati %100**: 146.045/146.045 event kaynaktaki süresiyle
      çiziliyor, yaklaşık kalan **0**. (Zincir: %96,12 → %98,06 → %100.)

### K4 · `hek` kendi kanalında ✅

`PercussionSymbol`e `hek` eklendi (profiles / sample-library / samples / synth).
Ses **uydurulmadı**: kaynak (Kudüm kitabı s.14) hek'i "iki elin birlikte
vuruşu" diye tanımladığı için `scripts/derive-hek-samples.mjs` aynı sazın
`dum` (sağ el) + `tek` (sol el) kayıtlarını toplayıp 0,95 tepeye normalize
ediyor — tanımın birebir gerçeklenmesi. 9 saz × 2 = **18 dosya**.

- [x] `hek` artık `tek`e/`dum`a eşlenmiyor, kendi sample'ını çalıyor (36 darp).
- [x] Gerçek `hek` kaydı bulunursa dosyaların üzerine doğrudan yazılabilir.

### K5 · Render sanallaştırma + responsive genişlik ✅

- [x] Viewport penceresi: 24 sistemden büyük belgelerde yalnız görünür
      aralık + 6 sistem overscan çiziliyor (SVG yüksekliği değişmez, kaydırma
      bozulmaz). Eşik altında eski tam yol korunuyor.
- [x] Yüzey genişliği kapsayıcıya göre **büyüyor** (daralmıyor); eskiden sabit
      1180 px'ti ve geniş ekranda sağda boşluk kalıyordu.

### K6 · Korpus JSON ❌ AÇILMADI — ölçüm gerekmediğini gösterdi

Daha önce "150 KB istemciye gidiyor" denmişti; **sıkıştırma hesaba
katılmamıştı**. Gerçek: JSON minified 59,2 KB, **gzip 6,8 KB**. Yalnız
kullanılan 42 anahtara süzülse gzip 3,4 KB olur — 2,47 MB bundle'da **%0,14**.
Yeni bir üretilmiş dosya + derive script + senkron testi + kalıcı drift riski
bu kazanç için kötü takas. Tetikleyici: bundle bütçesi zorlanırsa yeniden bak.

### K7 · `VirtualPiano` kaldırıldı ✅

- [x] Bileşen, testi ve `shared/ui` barrel export'u silindi (hiçbir sayfa
      render etmiyordu).

---

## L — Kalan denetimi: kendi işimin doğrulanması (2026-07-26)

> D ve K bölümleri kapandıktan sonra **yazdığım kodun açık taraflarını** ölçtüm.
> Bir hata buldum ve düzelttim; bir iş tasarlandı, ölçüldü ama **bilinçli olarak
> indirilmedi**. Ağaç yeşil: `typecheck` PASS · **111 dosya / 768 test PASS** ·
> `lint` PASS.

### L0 ✅ ÇÖZÜLDÜ — K2'de kesir sadeleştirilmiyordu (kendi hatam)

`getTupletContext` **ham paydaya** bakıyordu. `3/12` aslında `1/4` (düz
çeyreklik), `9/24` = `3/8` (noktalı çeyreklik), `3/48` = `1/16` — hiçbiri üçlü
bölünme değil. Korpusta **5 event yanlış triole işaretlenmişti**.

- [x] Kesir önce sadeleştiriliyor; tuplet 2178 → **2173** (gerçek triole sayısı),
      bracket'siz kalan 9 → **4**. Regresyon testi eklendi.

### L1 ➡️ ÇÖZÜLDÜ (teşhis) → PLAN.md §3/G7'ye taşındı

> **Güncelleme 2026-07-27:** aşağıdaki "kaynak-otoritesi çözülmeden yapılamaz"
> hükmü ARTIK GEÇERLİ DEĞİL. Otorite belirlendi: yazılı mertebe mu2 satır-1
> alan 0–1'de açıkça yazılı ve Offset formülü 2.987/3.000 dosyada birebir
> yeniden üretiliyor (`offset += (Pay/Payda) ÷ mertebe`). Sapmanın sebebi de
> bulundu: **code-52 tempo satırları Offset eksenini ilerletiyor** —
> 52 hariç tutulunca ölçü doluluğu %64,9 → %86.
>
> L1 artık bağımsız bir iş değil; ana motor göçünün **G7 adımı** (bkz.
> [PLAN.md](PLAN.md) §3). Aşağısı teşhis kaydı olarak durur.

**Önceki gerekçe (demo fixture tutarsız) YETERSİZDİ.** Daha derin ölçüm asıl
engeli ortaya çıkardı ve bu arada iki hipotezimi çürüttü.

**Ölçüm 1 — `Offset` kümülatif `Pay/Payda` mı?** Hayır. 398 dosyanın 312'sinde
sapma ≥ 0,5 (yazım hassasiyeti değil, kademeli birikip 93'e kadar çıkan gerçek
fark). Yalnız 45 dosya (%11,3) birebir eşleşiyor — hicazkâr peşrev onlardan
biri, bu yüzden tek dosyadan yaptığım genelleme yanlıştı.

**Ölçüm 2 — `ceil(offset)` yanlış mı ölçü sayıyor?** Hayır, DOĞRU. Verinin
ima ettiği bar uzunluğu küçük usullerde usul ölçüsüne uyuyor (düyek 8/8 → ~4,
aksak 9/8 → ~4,3), ama büyük usullerde uymuyor (devrikebir 28/4 → ~4;
hafif 32/4 → ~4). SymbTr büyük usulleri **küçük nota barlarına bölerek**
yazıyor — 28 vuruşluk tek bar yazılmaz. Yani `measureIndex` = basılı bar
numarası ve mevcut kod doğru. *("7× fazla ölçü sayıyor" iddiam çürütüldü.)*

**Ölçüm 3 — hangi sütun zaman otoritesi?**

| kontrol | uyan |
|---|---|
| `Ms` ∝ `Pay/Payda` (cv < %2) | 379/398 (**%95,2**) |
| `Offset` == kümülatif `Pay/Payda` | 45/398 (**%11,3**) |

İki bağımsız sütun (`Pay/Payda` + `Ms`) zamanda anlaşıyor; `Offset` ayrışıyor.
**Zaman otoritesi `Pay/Payda`; `Offset` kaynaktaki basılı bar konumudur.**

**ASIL ENGEL:** bölme, notanın barın ne kadarının solunda kaldığını bilmeyi
gerektirir. Bu oran `Offset` biriminde hesaplanır — ama notanın SÜRESİ
`Pay/Payda`'dan gelir. Dosyaların **%88,7'sinde bu ikisi aynı zamanı
anlatmıyor**, dolayısıyla Offset'ten türetilen oran, notanın gerçek süresinin
aynı oranına karşılık gelmiyor. Bu haliyle bölme, eserlerin ~%89'unda
**yanlış parça süreleri** üretir.

Bu bir kod sorunu değil, **kaynak-otoritesi sorunu**: basılı bar (`Offset`) ile
notalı zaman (`Pay/Payda`) SymbTr'de birbirinden bağımsız iki eksen. Projenin
bağlayıcı kuralı gereği birini keyfî seçemem.

**Açılması için gereken (kod değil, kaynak kararı):**
- [ ] SymbTr'nin kendi dokümantasyonundan/makalesinden `Offset` sütununun
      tanımını belirle. Basılı bar mı, başka bir şey mi?
- [ ] `src/data/symbtr/layout.ts` PDF ölçü kutuları hangi eksene bağlı —
      `Offset`e mi, `Pay/Payda` zamanına mı? (18334 verified kutu var; bu
      soruyu ampirik yanıtlayabilir)
- [ ] Karar verildikten sonra: bar çizgileri o eksenden türetilsin, bölme
      oranı da AYNI eksenden hesaplansın. İki ekseni karıştırmak yasak.
- [ ] Sonra: `setStrict(false)` kaldırılabilir mi ölç.

**Not:** daha önce raporladığım "ölçülerin %32'si dolmuyor" bulgusunun bir
kısmı bar geçişi değil, bu iki eksenin uyuşmazlığıymış. Bölme denemesi
doluluğu %66,28 → %78,83 çıkarmıştı ama bu sayı da aynı karışımdan etkileniyor.

### L2 ⏸️ BLOKE — e2e ve tarayıcı doğrulaması

3000 portunu **takılmış bir `next dev` süreci** (PID 12356) tutuyor; süreç var
ama HTTP'ye yanıt vermiyor (90 s timeout). Playwright'ın webServer'ı bu yüzden
başlayamıyor.

- [ ] **23 e2e testi hiç çalışmadı.** `ScoreSurface`'te esaslı değişiklikler var
      (tuplet, bağla bölme, sanallaştırma, responsive genişlik).
- [ ] K5'in sanallaştırma/responsive **geometrisi jsdom'da test edilemez**
      (layout yok; `getBoundingClientRect`/`clientWidth` 0 döner). Kod yolu
      çalışıyor, geometrisi doğrulanmamış.
- [ ] Portu boşaltmak gerekiyor: `taskkill /PID 12356 /F` — kullanıcının süreci
      olduğu için dokunulmadı.

### L3 · Dört tek-kalan triole notası 🟡

2.173 triolenin 4'ü tek başına (koşu uzunluğu 1), bracket alamıyor (%0,18).
Muhtemelen kardeşleri es'le veya bar çizgisiyle ayrılmış. **L1 indikten sonra
yeniden ölçülmeli**; bir kısmı orada çözülebilir.

### L4 · Ney kapsamı 🟡 — kod işi değil

10/36 slot dolu, `D3(50)` → `B3(59)` arasında 9 yarım-tonluk delik var; o aralık
4-6 yarım-ton pitch-shift'le üretiliyor. Ney `playScale`'in varsayılan enstrümanı.

**Düzeltme:** daha önce "geç zirve, kusur olabilir" demiştim — o ölçüm RMS
zarfıydı ve onu *atak* diye yorumlamıştım. Yeniden ölçüldü: 10 dosyanın hepsinde
ses **0 ms'de başlıyor**, tepe 0 ms'de 1.000. Kırpılacak kusur **yok**; bu bir
kayıt eksiği, stüdyo işi.

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

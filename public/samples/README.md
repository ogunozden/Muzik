Real instrument samples live here.

Use the app page at `/sesler` to update them without editing code. The upload
API writes only to known sample slots under this folder, and the audio engine
uses those files as the source of instrument playback. Synthetic Web Audio
fallback is enabled unless `NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK=false` is set.

Melodic instruments:

- `ney`
- `ud`
- `kemence`
- `kanun`
- `baglama`
- `tambur`
- `santur`
- `lavta`
- `rebab`
- `miskal`

Each melodic instrument supports chromatic WAV slots from `C3.wav` through
`B5.wav`. Sharp notes use `s` in the filename:

```text
C3.wav
Cs3.wav
D3.wav
Ds3.wav
...
B5.wav
```

Percussion instruments:

- `kudum`
- `bendir`
- `davul`
- `def`
- `darbuka`
- `zilli-def`
- `kasik`
- `zil`
- `nakkare`

Each percussion folder supports:

```text
dum.wav
dum-accent.wav
tek.wav
tek-accent.wav
ke.wav
ke-accent.wav
```

The generated WAV files for newly filled folders came from local real-acoustic
source packs under `all-samples/`, primarily `TURKISH-ARAB3.sf2` from Musical
Artifacts plus the Proteus pack for santur, tamburas, pan-flute and rebab
presets. Where the exact instrument was not in the local archive, the closest
available regional/acoustic source was rendered into the slot-compatible WAV
file:

```text
ney       <- Moss_Nay + NEY_05 presets (bkz. asagidaki ney bolumu)
ud        <- UD-3 / Oud soundfont presets
kemence   <- Kabak-MU bowed string preset
kanun     <- Kanun Original preset
baglama   <- BAGLMACE preset
tambur    <- Tanbur preset
santur    <- Proteus Santur preset
lavta     <- Oud Bright preset
rebab     <- Proteus Yesir Rebab preset
miskal    <- Proteus Pan Flute preset
davul     <- Eastern percussion drum presets
def       <- Deff / Req presets
darbuka   <- Darbuka preset
zilli-def <- Riq / Tef presets
kasik     <- Eastern percussion clap preset
zil       <- Open Sagat / gong presets
nakkare   <- Tabla / Eastern percussion presets
```

Source reference:

- Musical Artifacts artifact 947: `https://www.musical-artifacts.com/artifacts/947`
- License linked by the artifact: `http://artlibre.org/licence/lal/en/`
- Musical Artifacts artifact 764: `https://musical-artifacts.com/artifacts/764`
- License linked by the artifact: `http://creativecommons.org/licenses/by/4.0/deed.en`

## ney — lisans sebebiyle YENIDEN URETILDI (2026-07-27)

`ney/` klasoru artik **yukaridaki soundfont'lardan** geliyor; ayri bir lisansi
YOK. Kaynak: `all-samples/TURKISH-ARAB3.sf2` (Musical Artifacts 947, **Art
Libre**) icindeki `Moss_Nay` ve `NEY_05` preset'leri.

### Neden degistirildi

Onceki `ney/` klasoru Freesound paketi 27726'dan (`_bliind`) geliyordu ve
lisansi **CC BY-NC 4.0** idi. Iki sonucu vardi:

1. Atif zorunluydu (BY).
2. **Ticari kullanim kisitliydi (NC).** Projenin butun diger ses klasorleri
   Art Libre / CC-BY 4.0 ile ticarete acikken ney degildi — yani tek basina
   butun projeyi kisitliyordu.

Depoda zaten duran ve ticarete acik olan soundfont'ta **yedi ayri ney/nay
preset'i** bulundu. Yeni kaynak lisansi cozdugu gibi kapsamı da genisletti:

| olcut | eski (Freesound, CC BY-NC) | yeni (sf2, Art Libre) |
|---|---|---|
| olculebilen kaynak | 10 kayit / **7 benzersiz perde** | **22 bolge** |
| olculen kayit araligi | B3 (243 Hz) – Fs5 (738 Hz) | **D3 (149 Hz) – C6 (1065 Hz)** |
| kayit araligi disindaki yuva | **16 / 36** | **2 / 36** (yalniz C3, Cs3) |
| en cok gerilme | ~11 yarim ton | **2,23 yarim ton** |
| ticari kullanim | **kisitli** | **serbest** |

### ney yuvalari nasil uretiliyor

```
node scripts/render-soundfont-instrument.mjs --sf2 all-samples/TURKISH-ARAB3.sf2 --presets "Moss_Nay,NEY_05" --out ney
```

Her bolgenin perdesi **olculur** (varsayilmaz), her yuva icin en yakin kaynak
secilir ve hedefe **tam oturana kadar** yeniden orneklenir (kapali dongu:
uret → olc → duzelt). Yalniz DOGRULANAN yuva diske yazilir.

Onceki uretici `scripts/build-ney-samples.mjs` KALDIRILDI: artik kullanilmayan
NC lisansli kaynagi yeniden uretiyordu ve calistirilmasi lisans sorununu
sessizce geri getirirdi.

### Olcumun durust sinirlari

- Basliktaki kok perde guvenilmez: `NEY-YEN-1-C`in sekiz bolgesi de tam
  **+2 oktav** sapmali. Perde bu yuzden basliktan degil **sesten** olculur.
- YIN+HPS uzlasmasi da tek basina yetmiyor; ikisi BIRLIKTE bir oktav
  kacabiliyor (`Moss_NayB3` 248,7 Hz iken 124,4 okundu). Oktav, harmonik
  dizi kanitiyla ayrica cozulur.
- Yeni kaynagin pes bolgesinde **temel frekans zayif**: `C3`–`G3` yuvalarinda
  spektrumda temelde tepe yok, tepeler hedefin 3·4·5·9·10·11 katinda ve
  araliklari tam hedef kadar. Perde dogru, ama tini bu bolgede ince kalir.
  Bunun olculebilir sonucu: iki yontemin uzlasma orani 1,00'dan **0,81**'e
  dustu (7 dosya olculemiyor). Sapan dosya YOK; o 7 dosya tepe araligi ve
  spektrum incelemesiyle ayrica dogrulandi.
- Kayit araligi disinda kalan C3 ve Cs3 `src/engines/ses/sample-provenance.ts`
  icinde veri olarak durur ve `/samples` sayfasinda **"Gerilmis perde"**
  uyarisi olarak gorunur — saklanmaz.

## kudum — CC BY icra kaydindan YENIDEN URETILDI (2026-07-27)

Onceki `kudum/` bir CompMusic icra kaydindan kesilmisti
([freesound.org/s/140764](https://freesound.org/s/140764/), olcumle bulundu:
r=1,0000) ve **CC BY-NC 4.0** tasiyordu — ticari kullanim kisitli, ustelik
kudum uygulamanin **varsayilan vurmalisi**.

Soundfont'ta alternatif YOKTU (dort dosyanin 113+ preset'i tarandi, `kudum`
preset'i hic gecmiyor). Cozum baska bir icra kaydindan geldi:

| | |
|---|---|
| kaynak | [freesound.org/s/115397](https://freesound.org/s/115397/) — `kudum.wav`, 58,5 s |
| **lisans** | **CC BY 4.0** — ticari kullanim **serbest** |
| kaydeden | **xserra** (Xavier Serra, MTG / Universitat Pompeu Fabra) |
| icra | **Hamza Zeytinoglu** · Istanbul · 20.02.2011 · Sony PCM-D50 |

> **Atif (BY sarti — zorunlu):** yukaridaki kaydeden/icraci/kaynak satirlari bu
> sartin yerine getirilmesidir. `sample-sources.test.ts` atfin README'de
> GERCEKTEN yazili oldugunu ayrica dogrular.

### Nasil uretiliyor

```
node scripts/cut-percussion-from-recording.mjs   --source all-samples/115397__xserra__kudum.wav --out kudum   --cut "dum=20.05/10.59,tek=23.36/28.84,ke=28.52/55.84"
```

Kesim noktalari komut satirinda **acik** verilir; boylece uretim birebir
tekrarlanabilir ve secim denetlenebilir olur. Bir icradan darp secmek bir
yargidir — gizlenmemesi icin boyle.

**Secim olculdu, kulakla degil:** 58,5 s'lik kayittan 257 vurus basi bulundu,
bunlardan 41'i yalitilmis (oncesi/sonrasi bos) sayildi ve her biri icin pes
band orani + parlaklik olculdu.

| darp | normal / vurgu | pes bandi | gerekce |
|---|---|---|---|
| `dum` | 20,05 s / 10,59 s | **%79-81** | en pes grup, parlaklik 0,015-0,024 (buyuk kazan) |
| `tek` | 23,36 s / 28,84 s | %39-40 | tiz kazan, parlaklik 0,076-0,083 |
| `ke` | 28,52 s / 55,84 s | %37-42 | tek'in HAFIFI: rms hem normalde (0,0427<0,0467) hem vurguda (0,0835<0,0969) tek'in altinda |

Vurgular **gercek daha guclu vuruslardir**, kazanc artirmayla taklit degil.
Cift tek katsayiyla normalize edilir ki aradaki dinamik fark korunsun
(dum 2,38x · tek 2,05x · ke 1,94x).

## bendir — Art Libre'den YENIDEN URETILDI (2026-07-27)

Ayni CC BY-NC kisitindan cikarildi. Yeni kaynak: `TURKISH-ARAB3.sf2` icindeki
**`Syrian Bendir`** preset'i (Art Libre, ticari kullanim serbest).

```
node scripts/render-soundfont-percussion.mjs   --sf2 all-samples/TURKISH-ARAB3.sf2 --preset "Syrian Bendir" --out bendir   --map "dum=Bass_p/bass_ff,tek=slp1_mf/slp1_ff,ke=riml_mf/riml_ff"
```

**Esleme tahmin degil, iki kanita dayanir:**

1. Kaynagin kendi adlandirmasi: `bass` · `slp` (slap) · `riml` (rim **LEFT**).
2. Projenin otoritesi — "Turk Musikisinde Usuller ve Kudum" s.14:
   **dum sag el** (kuvvetli), **tek/ke sol el** (hafif).

| darp | bolge | olculen gerekce |
|---|---|---|
| `dum` | `bass` | pes band **13,25** (en yuksek) · parlaklik 0,026 (en dusuk) |
| `tek` | `slp1` | orta-baskin (orta 4,73 / pes 2,00) |
| `ke` | `riml` | "rim LEFT" = sol el · rms 0,0100, tek'ten (0,0168) **daha hafif** |

**Vurgular gercek dinamik katmanlardan** (`_p`/`_mf` -> `_ff`), kazanc
artirmayla taklit degil. Cift TEK katsayiyla normalize edilir ki kaynaktaki
dinamik fark korunsun.

> **Yan bulgu (ayri bir kusur):** mevcut vurmali kutuphanesinde 27 vurgu
> dosyasinin **9'u kendi normalinden daha SESSIZ** (darbuka dum 0,35x ·
> zilli-def ke 0,32x · nakkare ke 0,46x). Yani "vurgu" dosyalari buyuk olcude
> keyfi; isi motorun 1,36x kazanci yapiyor. Bendir artik bu kuralin disinda —
> vurgusu gercekten daha guclu bir icra.

## tanpura — PROJEDEN CIKARILDI (2026-07-27)

Iki ayri sebep ust uste geldi:

1. **Olcum:** kaynak Proteus `Tamburas` preset'inin **dort bolgesinin hicbiri
   olculemiyor** ve klasordeki 36 dosyanin **35'i etiketiyle uyusmuyordu**.
   Onarim mumkun degildi. Bu sessiz bir borc DEGILDI, duyulan bir kusurdu:
   motor dosya adini dogru varsayip `playbackRate = istenen / etiketlenen`
   hesapladigi icin tanpura secildiginde yanlis perde caliyordu.
2. **Organoloji:** tanpura bir **Hint** sazidir; Turk muziginin dem sazi
   degildir ve projede zaten `tambur` var. Turk soundfont'unun 113 preset'inde
   tanpura yok — olmamasi beklenen sey.

Dosyalar, klasor ve enstruman kaydi kaldirildi. Melodik enstruman sayisi
11 -> 10.

Ilerisi icin kapi: `sample-pitch-labels.test.ts` icindeki **KAPSAM** iddiasi,
`public/samples/` altina eklenen her melodik klasorun dogrulama listesinde
olmasini zorunlu kilar. Yani boyle bir klasor bir daha sessizce duramaz.

`src/engines/ses/__tests__/sample-pitch-labels.test.ts` her dosyanin
**icerigini** olcup adiyla karsilastirir — etiket/icerik ayrismasi bir daha
sessizce giremez.

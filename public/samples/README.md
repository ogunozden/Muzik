Real instrument samples live here.

Use the app page at `/sesler` to update them without editing code. The upload
API writes only to known sample slots under this folder, and the audio engine
uses those files as the source of instrument playback. Synthetic Web Audio
fallback is enabled unless `NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK=false` is set.

Melodic instruments:

- `ney`
- `ud`
- `kemence`
- `tanpura`
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
ud        <- UD-3 / Oud soundfont presets
kemence   <- Kabak-MU bowed string preset
tanpura   <- Proteus Tamburas preset
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

## ney — ayri kaynak, ayri lisans (DIKKAT)

`ney/` klasoru yukaridaki soundfont'lardan **gelmiyor**. Kaynagi gercek ney
kayitlarindan olusan bir Freesound paketi:

- Paket: `https://freesound.org/people/_bliind/packs/27726/`
- Kaydeden: `_bliind` (`https://freesound.org/people/_bliind/`)
- **Lisans: CC BY-NC 4.0** — `https://creativecommons.org/licenses/by-nc/4.0/`
- Yerel kopya: `all-samples/27726__bliind__ney-flute-sound-samples/`

**Iki sonucu var ve ikisi de baglayici:**

1. **Atif zorunlu (BY).** Uygulamada ney sesi kullanildigi her yerde kaynak ve
   kaydeden belirtilmelidir. Bu README o atfin kaydidir.
2. **Ticari kullanim kisitli (NC).** Diger klasorler (Art Libre / CC-BY 4.0)
   ticari kullanima acikken ney **degildir**. Proje ticarilesecekse ney
   sesleri ya yeniden lisanslanmali ya da baska bir kaynakla degistirilmelidir.

> Bu bilgi daha once bu dosyada **hic yazmiyordu**; ney sesleri kaynagi ve
> lisansi belirtilmeden duruyordu. BY sarti zaten ihlal ediliyordu.

### ney yuvalari nasil uretiliyor

`node scripts/build-ney-samples.mjs`

13 kaynak kayittan 36 kromatik yuva (C3..B5) uretir. Her yuva icin perdesi en
yakin kaynak secilir ve hedef frekansa **tam oturana kadar** yeniden
orneklenir (kapali dongu: uret → olc → duzelt).

Sinirlar durustce (YIN+HPS uzlasmasiyla **olculdu**, 2026-07-27):

- 13 kayittan **10'unda** iki yontem uzlasti; **7 benzersiz perde** cikti.
  (Bu dosyada onceki sayi 8 yaziyordu — olcum 7 dedi, duzeltildi.)
- Olculen kayit araligi: **B3 (243,2 Hz) – Fs5 (737,5 Hz)**, yani MIDI 59–78.
- Bu araligin **disindaki 16 yuva** (C3–As3 ve G5–B5) en yakin kayittan
  gerilerek uretilir. Alt uc bir oktava varan gerilmedir. Gerilme formantlari
  da kaydirdigi icin bu yuvalar o perdenin **gercek tinisi degildir**.
- Bu bilgi kod tarafinda `src/engines/ses/sample-provenance.ts` icinde veri
  olarak durur ve `/samples` sayfasinda **"Gerilmis perde"** uyarisi olarak
  gorunur — saklanmaz.

`src/engines/ses/__tests__/sample-pitch-labels.test.ts` her dosyanin
**icerigini** olcup adiyla karsilastirir — etiket/icerik ayrismasi bir daha
sessizce giremez.

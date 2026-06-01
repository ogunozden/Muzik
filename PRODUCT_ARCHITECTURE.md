# Muzik Product Architecture

Bu belge projenin tek kaynak urun planidir. Eski planlar ve yarim kalan deneyler
bu belgenin yerine gecmez.

## Urun Tanimi

Muzik, Turk muzigi icin nota yukleme, nota takip, coklu enstruman esligi,
usul/perkusyon calismasi ve eser arsivi sunan bir calisma studyosudur.

Urunun ilk surumunde "orkestra" uzak kullanicilarla birlikte calma degildir.
Orkestra, ayni eserin birden fazla enstruman katmaniyla calinmasi, kullanicinin
notayi takip etmesi ve kendi enstrumaniyla calismasidir.

## Ana Kullanici Akislari

1. Kullanici MusicXML, SymbTr veya uygulama JSON formatinda nota yukler.
2. Sistem notayi tek bir `ScoreDocument` modeline cevirir ve dogrular.
3. Nota arsive kaydedilir; makam, usul, form, besteci ve etiketlerle aranir.
4. Studio ekrani notayi gosterir, imleci playback ile senkron takip ettirir.
5. Kullanici tek enstruman, coklu enstruman veya sadece perkusyon esligi secer.
6. Kullanici tempo dusurur, olcu bolgesi donguye alir, usul/perkusyonla calisir.
7. Calisma kaydi, son calisma tarihi ve secili ayarlar arsive geri yazilir.

## Kalacak Teknoloji Seti

- Next.js App Router: Uygulama, route handler ve server-side API.
- React + TypeScript: UI ve tip guvenligi.
- UnoCSS Wind4 + yerel atom bilesenleri: Utility sinifi uyumlulugu korunur,
  Tailwind derleyici bagimliligi yoktur; token gercegi CSS custom
  property'ler ve `src/shared/tokens` katmanidir.
- Drizzle + libSQL/Turso: Arsiv ve uygulama verisi.
- Web Audio API: Transport, scheduler, sample player ve synth fallback.
- Zustand: Studio, playback, mixer ve aktif eser state'i.
- Verovio: Ana nota render hedefi. MusicXML/MEI/SVG akisi icin.
- Vitest + Testing Library: Birim, component ve API regresyon testleri.

## Kosullu veya Gecici Parcalar

- VexFlow mevcut viewer icin gecici olarak kalabilir, ancak ana urun renderer'i
  Verovio olmalidir. Verovio gecisi tamamlaninca VexFlow kaldirilir.
- i18n sadece iki dilli cikis hedefi netse kalir. Aksi durumda Turkce urun
  metinleri merkezi kopya dosyasindan yonetilir.
- OCR, tomato ve mikrofon pitch analizi ana urun bitmeden eklenmez. Bunlar
  sonradan servis/adaptor olarak eklenir.

## Kaldirilacak veya Gereksiz Klasorune Alinacaklar

- Remote ensemble prototipi ve Socket.IO sidecar.
- Icerigi olmayan tutorial/coming-soon sayfalari.
- Bos veya eski orchestrator hook/context dosyalari.
- Eski mimari spekleri ve rapor dokumanlari.
- Kullanilmayan paketler: HeroUI, Tailwind CSS derleyici paketleri,
  tailwind-variants, i18next backend/cache, Socket.IO, cors, bundle analyzer.

## Kanonik Klasor Yapisi

```text
src/
  app/                 Next.js route katmani
  core/                Framework bagimsiz cekirdek sozlesmeler
    domain/            ScoreDocument, UsulPattern, InstrumentProfile
    application/       Use-case servisleri ve is akislari
    infrastructure/    DB, file storage, external adaptor sinirlari
  features/            Urun ozellikleri
    studio/            Nota takip ve orkestra calisma studyosu
    archive/           Eser arsivi
    rhythm/            Usul/perkusyon calisma
    samples/           Enstruman/sample yonetimi
  shared/
    config/            Route, nav, runtime config
    tokens/            Tema, renk, spacing, typography
    ui/                Atomic UI bilesenleri
    security/          Validation, sanitization, policy yardimcilari
  domain/              Eski engine'lerden kademeli gecis alani
```

Kural: yeni kod `src/core`, `src/features` ve `src/shared` sinirlarina gore
yazilir. Eski `src/engines`, `src/components`, `src/lib` parcalari calisir
kalir, ancak yeni gelistirme bu kanonik yapiya tasinir.

## Hedef Modul Sozlesmeleri

### Score

`ScoreDocument` uygulamanin ana veri modelidir. MIDI ana veri modeli olamaz;
yalnizca import/export veya playback yardimcisi olabilir.

Alanlar:

- `id`, `title`, `composer`, `makam`, `usul`, `form`
- `sourceFormat`, `sourceFileRef`, `version`
- `sections`, `measures`, `events`, `tracks`
- `tempoMap`, `tuning`, `lyrics`, `annotations`

### Playback

Tek transport motoru olur. Butun calislar buradan gecer.

- `play`, `pause`, `stop`, `seek`
- `setTempo`, `setLoop`, `setTranspose`
- `scheduleScore`, `scheduleUsul`, `schedulePercussion`
- `solo`, `mute`, `volume`, `pan`

### Instruments

Enstruman tanimlari merkezi katalogdan gelir. UI icinde string id uydurulmaz.

- `InstrumentProfile`
- `SampleMap`
- `TuningProfile`
- `SynthFallbackProfile`

### Rhythm

Usul, hem esere baglanabilen hem bagimsiz calisabilen bir modeldir.

- `UsulPattern`
- `PercussionVoice`
- `AccentMap`
- `PracticeLoop`

## Route Stratejisi

Kalici route'lar:

- `/studio`: Ana urun ekrani.
- `/studio/follow`: Kaynak nota takip ve orkestra eslik calisma modu.
- `/archive`: Eser arsivi.
- `/rhythm`: Bagimsiz usul/perkusyon calisma.
- `/samples`: Enstruman ve sample yonetimi.
- `/references`: Harici kaynak staging/map/sync/audit operasyon paneli.
- `/references/curation`: 3000 eserlik kaynak kurasyon dashboard'u.
- `/api/scores`: Arsiv API.
- `/api/samples`: Sample API.

Gecici mevcut route'lar urunu bozmayacak sekilde tutulabilir. 2026-06-01 urun
karariyla arka planda kalan statik route'lar da on yuzde gorunur tutulur; legacy
route'lar kanonik hedeflerine redirect eder ama merkezi navigation'da
kesfedilebilir kalir.

Yerel/admin operasyon route'lari genel kullanici aksiyonlarindan token ve policy
ile ayrilir, ancak on yuzde gorunur olmalidir. `/references/curation/[catalogId]`
parca merkezli kaynak detay ekrani ve `/api/external-references` token korumali
sabit operasyon API'si olarak tutulur.

## Bitti Kabul Kriterleri

- Kullanici nota yukleyebilir, validasyon hatasini anlar.
- Nota arsive kaydedilir ve tekrar acilir.
- Nota ekranda gorunur ve playback ile senkron takip edilir.
- Tek veya coklu enstruman esligi calar.
- Usul/perkusyon esere baglanir veya bagimsiz calisir.
- Tempo, loop, mute/solo, volume ve transpose calisir.
- Gereksiz route, bos sayfa, root sidecar ve kullanilmayan paket kalmaz.
- `npm run precommit`, `npm run build`, `npm audit --audit-level=moderate`
  yesil olmadan degisiklik kabul edilmez.

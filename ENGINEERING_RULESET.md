# Muzik Engineering Ruleset

Bu belge kod kalitesinin ve mimari sadeligin baglayici kural setidir.

## Temel Kurallar

1. Tek urun akisi: Studio, Archive, Rhythm ve Samples disindaki ekranlar nav'a
   eklenemez.
2. Hardcode yok: renk, spacing, radius, typography, route, enstruman id, usul id
   ve hata metni merkezi tanimdan gelir.
3. Yarım modul yok: "coming soon" sayfa route'u urun nav'ina giremez.
4. Tek sorumluluk: dosya bir domain veya bir UI sorumlulugu tasir.
5. Yeni kod kanonik klasor yapisina yazilir: `core`, `features`, `shared`.
6. `gereksiz` klasoru arsivdir; buradan import yasaktir.

## Atomic UI Kurallari

UI katmanlari:

- `shared/ui/atoms`: Button, Input, Select, Badge gibi ilkel bilesenler.
- `shared/ui/molecules`: LabeledSelect, PlaybackControls gibi kucuk kompozisyonlar.
- `shared/ui/organisms`: ScoreViewer, MixerPanel, RhythmGrid gibi urun bloklari.
- `features/*`: Sayfa ozel kompozisyon ve state baglantilari.

Kurallar:

- Atomlar domain import edemez.
- Molekuller API, DB veya audio engine import edemez.
- Organismler use-case hook'lari kullanabilir, ama DB veya route handler import edemez.
- Sayfa bileseni is mantigi tasimaz; use-case hook veya application servisine delege eder.

## Tema ve Token Kurallari

- Tek tema kaynagi `shared/tokens` olacaktir.
- CSS custom property isimleri semantic olmalidir: `--color-surface`,
  `--color-text-primary`, `--space-md`.
- Yeni renk literal'i (`#fff`, `rgb(...)`, `oklch(...)`) bilesen icinde yazilmaz.
- Tailwind arbitrary value sadece token referansi icin kullanilir:
  `bg-[var(--color-surface)]`.
- Component variant'lari merkezi sozlesmeden gelir.

## Domain Kurallari

- `ScoreDocument` tek ana nota modelidir.
- MIDI, UI state veya DB row ana domain modeli olamaz.
- Usul, makam ve enstruman id'leri katalogdan gelir.
- Playback engine DOM'a baglanamaz.
- Importer, render ve playback birbirinden ayridir.

## Guvenlik Kurallari

- Yuklenen dosya tipi allow-list ile dogrulanir.
- Dosya boyutu ve dosya adi sanitize edilir.
- Kullanici girdisi dogrudan path'e yazilmaz.
- API route'lari structured JSON hata doner.
- CORS default olarak kapali veya allow-list olur.
- Secret degerler sadece server tarafinda okunur.
- Upload edilen sample dosyalari executable olarak sunulmaz.
- `npm audit --audit-level=moderate` release kapisidir.

## Git ve Kalite Kapilari

Her commit oncesi:

```bash
npm run precommit
```

Bu komut:

- mimari guardrail kontrolu
- ESLint
- TypeScript
- test suite

calistirir.

Her release oncesi:

```bash
npm run build
npm audit --audit-level=moderate
```

calistirilir.

## Bagimlilik Kurallari

- Yeni paket eklemek icin once mevcut standard API veya mevcut paketle cozum
  denenir.
- UI library eklenmez; yerel atomic sistem kullanilir.
- Backend framework eklenmez; Next route handler yeterlidir.
- Realtime remote collaboration v2 kapsamidir; core urune Socket.IO/WebRTC
  eklenmez.
- Bundle analyzer kalici dependency olmaz; ihtiyac aninda gecici kullanilir.

## Kod Sahipligi

- `core/domain`: framework bagimsiz tipler ve saf fonksiyonlar.
- `core/application`: urun use-case'leri.
- `core/infrastructure`: DB, file system, external servis adaptorleri.
- `features/studio`: ana calisma deneyimi.
- `features/archive`: arama, listeleme, metadata.
- `features/rhythm`: usul ve perkusyon calisma.
- `features/samples`: sample ve enstruman yonetimi.
- `shared`: UI, token, config, security yardimcilari.

Bir dosya birden fazla sahiplik alanina hizmet ediyorsa bolunur.

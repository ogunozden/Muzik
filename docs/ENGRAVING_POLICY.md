# Turk Muzigi Engraving Policy (V1.9.3 / F8.6)

Bu dokuman ScoreEngine render yuzeyinin sembol (glyph) kurallarini tanimlar.
Baglayici ilke ADR 0001 ve TODO "Kritik Kurallar" ile aynidir: **kaynak yoksa
sembol uydurulmaz; policy gerekiyorsa validator policy issue uretir; gorsel/PDF
yalniz evidence anchor'dir.** Kurallarin her biri koddaki mevcut uygulamaya
veya acik bir policy issue'ya baglanir; ezbere muzikoloji icermez.

## 1. Kaynak-Sinifli Glyph Dispatch (E3 cercevesi)

Her sembol sinifi su durumlardan biriyle etiketlenir
(`CanonicalSourceFeatureStatus`, `src/data/score-engine/canonical-score.ts`):

| Durum | Anlam | Render karari |
|---|---|---|
| `source-proven` | SymbTr TXT/MusicXML/mu2 kaynaginda acikca var | Render edilir; evidence alani kaynak satirini gosterir |
| `policy-derived` | Kaynakta acik degil; deterministik kuralla turetilir | Render edilir; policy metni UI'da gorunur |
| `visual-evidence-only` | Yalniz PDF/gorsel anchor'da gorunuyor | Render EDILMEZ; evidence katmaninda kalir |
| `unsupported` | Motor bu sinifi henuz islemiyor | Render edilmez; validation issue uretir |
| `missing` | Kaynak beklenirdi ama yok | Render edilmez; "kaynak eksik" etiketi gosterilir |

Kod kaniti: `buildNotationPolicy` her dokumana `keySignature/inlineAccidentals/
sourceAlignment` policy'si yazar; workbench `KEY:` etiketi ve
`score-glyph-class-map` manifesti bu durumlari raporlar.

## 2. Koma Arizalari (AEU sistemi)

- SymbTr pitch token'lari (`#4`, `b5`, `#9`, `b1` vb.) AEU koma sapmalaridir;
  batili 12-ton diyez/bemole indirgenmez.
- **Inline ariza**: event-level koma etiketi (`komaAccidental`) nota ustune
  `Annotation` olarak cizilir; VexFlow standart `Accidental` glifi yalniz
  tam-yarim ton karsiligi (`#`, `b`) icin kullanilir. Kod:
  `ScoreSurface` render dongusu + `mapCanonicalEventToVex`.
- **Key-signature arizalari**: MusicXML `<key-step>/<key-accidental>` veya mu2
  code-50 satirlarindan `source-proven` olarak gelir (`extractMusicXmlSourceFeatures`,
  `extractMu2SourceFeatures`). Kaynak yoksa key policy `missing`tir ve UI
  "key policy: kaynak eksik" gosterir — her notaya inline etiket YAPISTIRILMAZ.
- Hicazkar referans dogrulamasi: MusicXML key `sharp/slash-flat/slash-flat/
  quarter-flat`; mu2 key `B4b1/E5b4/A4b4/F5#4` (TODO corpus kaniti).

## 3. Natural / Cancellation (E2 policy)

- Yerel korpusta natural accidental kaynakta ACIK gelmiyor (MusicXML natural 0,
  TXT natural pitch 0 — corpus audit). Bu nedenle natural glifi yalniz su
  deterministik kosulda cizilebilir: ayni olcu icinde ayni perde-adiminin
  onceki event'i ariza tasiyor ve mevcut event ayni adimda arizasiz ise
  (`policy-derived` cancellation).
- Bu kosul kanitlanamiyorsa natural cizilmez; sinif `strict glyph gate`te
  `natural-accidental` olarak fail kalir (bilincli). Gorsel PDF'te natural
  gorunmesi tek basina kanit DEGILDIR (`visual-evidence-only`).

## 4. Usul / Meter / Section Etiketleri

- Usul ve meter etiketi `source-proven`dir: TXT `Kod=51` satirlari
  (`extractTextSourceFeatures`), mu2 code-51 satirlari import edilir.
- Usul degisimi olan eserlerde (411 adet korpustaki `Kod=51`) etiket degisim
  olcusunun basina cizilir; tek-usul eserde bir kez, ilk sistem ustune.
- Section marker'lari (`1. HANE`, `TESLIM`) SymbTr `Soz1` structural
  label'indan gelir; lyric/syllable iceren `Soz1` alanlari section SAYILMAZ
  (V1.9.2 kapanan sinif). Render: rounded-pill, staff ustunde, ilk event'in
  x-konumuna hizali (`score-section-marker` testid).
- Konum kurali: section pill'i staff-ust bandinda (`staveTop - 40`), usul/key
  etiketleri surface header bandinda; ikisi ayni yatay banda cizilmez.

## 5. Repeat / Volta / Slur / Tie / Tuplet

- `repeat-volta-endings`: yerel 2200 MusicXML corpus'ta `<repeat>`/`<ending>`
  0 adet — kaynak yok, sinif render edilmez (`unsupported`). PDF'te gorunen
  tekrar isaretleri yalniz evidence anchor'dir.
- `slur-tie-triplet`: MusicXML slur/tie 0; tuplet/time-modification 23677 adet
  VAR — tuplet importu acik is (E1 kalan kalemi). Import edilene kadar sinif
  `unsupported` kalir ve strict gate fail eder (bilincli).
- Bu siniflarin herhangi biri "ekranda guzel dursun" diye eklenemez; once
  source-feature importu, sonra render.

## 6. Collision Kurallari (E4 cercevesi)

Oncelik sirasi (ust ustte binme durumunda ustte kalan):

1. Aktif cursor cizgisi + nota halkasi (yesil) — z-20 SVG katmani
2. Aktif nota callout pill'i — sistem-ici, `x` degeri stave sinirlarina
   kelepcelenir (`Math.min/Math.max` clamp; kod: `ScoreSurface.activeCallout`)
3. Section pill'lari — staff-ustu bant, ayni clamp kurali
4. Olcu/segment etiketi — staff-ustu sol kose
5. Kanit (evidence) rozeti — surface alt bandi (`EVIDENCE_BOTTOM_GAP`)

Kurallar:

- Callout ve section pill'i stave yatay sinirlari disina tasamaz (clamp).
- Uzun/yogun olculer (28/4 Devr-i Kebir) tek satira sikistirilmaz; olcu
  kimligi korunarak render-sistem segmentlerine bolunur
  (`buildScoreRenderSystems`; `score-render-systems` manifesti).
- Cakisma dogrulamasi browser crop audit'e baglidir
  (`audit:score-engine-focused-crops`); yeni cakisma sinifi bulunursa fail
  gate'e eklenir.

## 7. Degisim Kurali

Bu dokumana yeni glyph sinifi eklemek icin sart: (1) kaynak-feature importu
veya deterministik policy tanimi, (2) glyph-class-map manifest girisi,
(3) focused-crop audit kapsami. Ucu olmadan render koduna glyph eklenemez.

# ADR 0001 — Calisma Modeli, Mimari ve Kullanici Modeli

Tarih: 2026-07-14
Durum: Kabul edildi

## Baglam

2026-07-14 tam-yigin analizi uc karar bosluğu buldu: (1) uygulama serverless
mi yoksa local-first mi calisir, (2) kullanicilar kimdir (`community-verified`
statusu kullanici sistemi olmadan tanimli), (3) `ENGINEERING_RULESET.md`
Clean Architecture (`core/domain|application|infrastructure`) hedefliyor ama
gercek kod `engines/features/data/components` yapisinda evrilmis ve
`core/application` bos, `core/infrastructure` yalniz README.

Bu ADR uc karari kilitler ve `TODO.md` FAZ 0-9 yol haritasinin temelidir.

## Karar 1 — Calisma Modeli: Local-First Tek Operator Workbench

Muzik bir kamuya acik web servisi degil, tek operatorun kendi makinesinde
calistirdigi kanit-oncelikli bir notasyon/kurasyon istasyonudur.

- Serverless (Vercel vb.) hedef **degildir**. Backend'in buyuk kismi repo ici
  `.mjs` pipeline'idir ve API route'lari bu script'leri `execFile` ile
  cagirir; bu yalniz operatorun kendi FS'inde ve loopback host'ta guvenlidir.
- Opsiyonel dagitim modeli **tek node self-host**'tur (Docker + kalici disk),
  cok-instance degil.
- Gercek zamanli remote collaboration `ENGINEERING_RULESET.md` uyarinca v2
  kapsamidir; core urune Socket.IO/WebRTC eklenmez.

Sonuc: build ve calisma read-only kaynak agaci varsayimiyla tasarlanir;
mutable durum kaynak agaci disinda tutulur (bkz. Karar 3).

## Karar 2 — Kullanici Modeli: Tek Operator, `operator-verified` Anlami

Kimlik/auth sistemi **yoktur** ve tek-operator modelde eklenmeyecektir.

- Kaynak statuleri (`auto-suggested`, `user-attached`, `community-verified`,
  `disputed`, `deferred`) tek operatorun **guven seviyeleri** olarak okunur.
  `community-verified` = "validator + tekrarli operator kaniti gecti"; bir
  toplulugu ima etmez.
- Runtime kayitlarindaki `userId`/`authorId` alanlari `null`/`"operator"`
  olarak kalir; semantik degismeden korunur (gelecekte multi-user'a gecis
  kolay olsun diye alan silinmez).
- Multi-user'a gecis karari verilirse auth + kimlik + yetki + dagitim tek
  paket olarak ayri bir ADR ile ele alinir; bu urune parca parca kimlik
  sizmaz.

## Karar 3 — Mimari: Katmanli Yapi (Ruleset ile Uzlasma)

`ENGINEERING_RULESET.md` baglayicidir ve Clean-ish katmanlama hedefler.
Gercek kod bundan sapmis. Karar: **gercegi ruleset'e hizala**, kolaya kacip
ruleset'i budama.

Kanonik katmanlar ve sorumluluklari:

- `core/domain` — framework-bagimsiz tipler ve saf fonksiyonlar. `ScoreDocument`
  tek ana nota modelidir. (Mevcut, korunur.)
- `core/application` — urun use-case'leri. Sisman API route'larindan cikarilan
  is mantigi buraya iner (skor import, kurasyon operasyonlari, correction
  uygulama). (F4.6/M8.1 ile doldurulur.)
- `core/infrastructure` — DB, dosya sistemi, harici servis adaptorleri. FAZ 3
  SQLite repository'leri buranin gercek icerigidir. (F3 ile doldurulur.)
- `engines/` — makam/usul/nota/ses muzik-teori hesap modulleri. Ruleset'te
  ayrica anilmaz; `core/domain`'in hesap-agirlikli uzantisi olarak korunur
  (framework-bagimsiz, saf). Bolunmesi risk/getiri acisindan gereksiz.
- `data/` — statik katalog + generated agir veri erisimi (SymbTr, score-engine
  fixture'lari). `core/infrastructure`'in read-only veri tarafi.
- `features/*` — sayfa-ozel kompozisyon ve state baglantilari.
- `shared/` — UI, token, config, security yardimcilari. Tek UI evi
  `shared/ui/{atoms,molecules,organisms,layout}`; tek token kaynagi
  `shared/tokens`.
- `app/` — Next route + ince IO; is mantigi tasimaz, use-case'e delege eder.

Bagimlilik yonu (guardrail ile zorlanir):
`app -> features -> core/application -> core/domain`;
`core/application -> core/infrastructure` (adaptor arayuzu uzerinden);
`engines`/`data` saf ve asagi katmanlardir; ters yon yasaktir.

UI konsolidasyonu: mevcut `components/{atoms,molecules,organisms,layout}` ->
`shared/ui/{atoms,molecules,organisms,layout}`. Ruleset "Atomic UI Kurallari"
boylece kod yapisinda gerceklesir; tek import yolu `@/shared/ui`.

Bu karar `TODO.md` M4.1'i degistirir: `core/application` ve
`core/infrastructure` **silinmez, doldurulur**.

## Sonuclar

- FAZ 3 (SQLite) ciktilari `core/infrastructure`'a yerlesir.
- FAZ 4 refactor'lari is mantigini `core/application` use-case'lerine tasir ve
  UI'yi `shared/ui` altinda toplar.
- `validate-architecture.mjs` katman yonunu ve tek UI/token yolunu dogrular.
- Runtime mutable veri `var/` altinda tutulur; kaynak agaci read-only kalir.

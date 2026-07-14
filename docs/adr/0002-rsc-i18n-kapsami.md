# ADR 0002 — RSC Gecisi ve i18n Kapsami Kararlari

Tarih: 2026-07-14
Durum: Kabul edildi

## Karar 1 — RSC Gecisi YAPILMAYACAK (F5.2 kapanisi)

Next.js App Router'in server-component modeline gecis degerlendirildi ve
REDDEDILDI. Gerekce:

- ADR 0001 Karar 1: urun local-first tek-operator workbench'tir. RSC'nin ana
  kazanimlari (SEO, ilk-yukleme TTFB, edge streaming) kamuya acik siteler
  icindir; loopback'te calisan tek kullanicili aracta karsiligi yoktur.
- RSC'nin bu projedeki tek gercek kazanimi (agir verinin server'da kalmasi)
  F2'de `server-only` + API dilimleriyle ZATEN saglandi; en buyuk client
  chunk 0.47MB ve `audit:bundle-size` kapisi regresyonu engelliyor.
- `react-i18next` client-runtime'dir; RSC gecisi i18n katmaninin komple
  degistirilmesini (server-i18n) gerektirir — kazanimsiz maliyet.

Sonuc: sayfalarin `"use client"` modeli KABUL EDILEN mimaridir. F5.2 bu
kararla kapanmistir; yeniden acilmasi ancak urun kamuya acik bir servise
donusurse (ADR 0001 Karar 1 revizyonu) gundeme gelir.

## Karar 2 — i18n Kapsami: Turkce-Birincil, Chrome-Duzeyi EN (F5.4 kapanisi)

ADR 0001 Karar 2 geregi urun tek-operator ve Turkce-birincildir. i18n
kapsami su sekilde SABITLENIR:

- ZORUNLU (tamamlandi): i18n altyapisi (i18next + tr/en kaynaklari), locale
  parite kapisi (`locale-parity.test.ts` — anahtar agaci esitligi CI'da),
  test i18n init'i (`vitest.setup.ts`), navigasyon/hub/pano/workbench-chrome
  cevirileri (`nav.*`, `dashboard.*`, `scoreEngine.*`).
- KAPSAM DISI (bilincli): govde/icerik metinlerinin (takip ipuclari, kurasyon
  tablo hucreleri, hata detaylari) EN'e cevrilmesi. Tek operatorun dili
  Turkce'dir; sahte/otomatik ceviriyle EN paritesi iddia etmek yaniltici olur.
- KORUMA: yeni eklenen her i18n anahtari parite kapisina tabidir; kapsam
  disi metinler i18n'e alinirsa ayni kapi EN karsiligini zorlar.

Sonuc: F5.4 bu kapsam tanimiyla kapanmistir. EN tam paritesi ancak coklu
kullanici/kamuya aciklik karari (ADR 0001 revizyonu) ile yeniden acilir.

## Karar 3 — Dis-Veri Bekleyen Isler Icin Backlog Sozlesmesi

Kod tarafinda yapilabilecek her seyi bitmis ama kapanisi dis girdiye bagli
isler (ornek: F8.7'nin `repeat-volta-endings` + `slur-tie-triplet` siniflari
— Hicazkar'in tum sembolik kaynaklarinda 0 instance; mu2 caret dahil alternatif
kanallar importer'a eklendi) TODO'da "Dis Girdi Bekleyenler" bolumunde tutulur.
Her kayit acik bir cikis kriteri tasir; kriter saglanmadan kapali sayilmaz,
saglandiginda is yeniden aktiflesir. Bu, "kolaya kacmadan" durust terminal
durumdur: yapilmamis is "tamam" gosterilmez, yapilamayacak is acik-suresiz
"devam ediyor" gorunumunde birakilmaz.

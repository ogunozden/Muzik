# Gereksiz / Deferred Archive

Bu klasor aktif urun, build ve test kapsamindan cikartilan dosyalari tutar.
Buradaki dosyalar silinmeden once karsilastirma ve geri alma amaciyla
saklanir.

Kurallar:

- Aktif `src` kodu buradan import edemez.
- Yeni gelistirme buraya yapilmaz.
- Bir dosya tekrar urune alinacaksa once `PRODUCT_ARCHITECTURE.md` ve
  `ENGINEERING_RULESET.md` kurallarina gore yeniden tasarlanir.
- Bu klasor `tsconfig` ve ESLint kapsamindan harictir.

Alt klasorler:

- `deferred`: V2 veya sonrasi icin ertelenen ozellikler.
- `obsolete-hooks`: Aktif importu olmayan eski hook/context dosyalari.
- `legacy-docs`: Yeni mimari plan tarafindan gecersiz kilinan eski belgeler.
- `deferred/standalone-pages`: Studio/Rhythm/Samples altina konsolide edilen
  eski tekil ekran uygulamalari.

# Otomatik Kaynak Yönetimi ve Kullanıcı Feedback Sistemi

## Bağlayıcı Karar

Bu dosya harici nota, PDF, arşiv ve YouTube/kayıt kaynakları için tek bağlayıcı
plandır. Eski "önce insan doğrulasın, sonra ürüne yaz" yaklaşımı ile yeni
"sistem derin analizle getirir, kullanıcı ayıklar" yaklaşımı burada tek
modele indirgenmiştir.

Yeni model:

- sistem kaynakları derin analizle bulur;
- Gemini/Search ve benzeri araştırma katmanları kaynakları önce
  `auto-suggested` öneri olarak üretir;
- yalnız validator'dan geçmiş accepted kaynaklar mevcut `auto-attached`
  manifestine iliştirilebilir;
- kullanıcı öneriyi silebilir, ekleyebilir, alternatif önerebilir, yorumlayabilir
  veya doğrulama/itiraz sinyali verebilir;
- her kullanıcı aksiyonu append-only event log olarak saklanır;
- terminal karar event log'u filtre, rollback ve community-verified talep
  eventlerini destekler;
- terminal feedback eventleri terminal karar manifestindeki `catalogId` ile
  doğrulanır, alternatif URL yalnız HTTPS olabilir, rollback hedef event'i
  mevcut olmalı ve aynı event ikinci kez rollback edilemez;
- feedback manifest yazımı lock dosyası ve atomik temp-file rename ile yapılır;
- bu log daha sonra mapping, kaynak güven puanı, filtre ve raporları
  iyileştirmek için kullanılır, ama tek başına doğruluk kabul edilmez;
- medya indirme kapsam dışıdır;
- YouTube, PDF ve güvenli kaynak sayfaları inline preview/embed olarak
  gösterilebilir.

2026-06-04 güvenlik kararı:

- `auto-suggested`: LLM/search adayı; accepted değildir.
- `user-attached`: kullanıcı tarafından eklenen aday; metadata/validator bekler.
- `community-verified`: validator, metadata ve tekrar eden kullanıcı kanıtıyla
  doğrulanmış kaynak.
- `disputed`, `user-removed`, `rejected`, `deferred`: ürün ve raporlamada ayrı
  tutulur.
- `rolled_back`: hatalı kullanıcı/review sinyalini geri alır; önceki event'i
  işaretler ama accepted kaynak veya PDF verified manifestine yazmaz.

## Mevcut Kanıt

Yerel proje kanıtları:

- `npm run guardrails:architecture` başarılı.
- `npm run typecheck` başarılı.
- `npm run lint` başarılı.
- `npm run test:run` başarılı: 68 test dosyası, 448 test.
- `npm run audit:security` başarılı: 0 moderate+ vulnerability.
- `npm run guardrails:layout` başarılı: 15 route, mobil ve desktop viewport.
- `npm run audit:external-references` başarılı; ancak policy metni hâlâ eski
  "No media is downloaded or embedded" kararını raporluyor.
- SymbTr katalog coverage'i: 3000 / 3000.
- Resmi SymbTr metadata coverage'i: 3000 / 3000.
- Kürasyonlu harici kaynak coverage'i: 22 / 3000.
- Eksik harici kaynak coverage'i: 2978, terminal karar coverage'i 2978 / 2978.
- Terminal feedback UI: `/references/curation` durum/arama/feedback tipi
  filtresi, yorum, alternatif, doğrulama, community-verified talep, ret ve
  rollback eventleri.
- Accepted bulk candidate: 7.
- Mevcut curation decision: 5.

## Ürün İlkeleri

1. **Parça merkezli yönetim**
   Kaynaklar task merkezli değil, eser/parça ana başlığı altında yönetilir.

2. **Otomatik iliştir, kullanıcı ayıklar**
   Sistem search/LLM kaynaklarını doğrulanmış gibi iliştirmez. Önce
   `auto-suggested` olarak görünür kılar; validator'dan geçen accepted kaynaklar
   mevcut `auto-attached` yoluna girebilir.

3. **Feedback üründür**
   Kaldırma, silme, not, düzeltme ve öncelik değişiklikleri öğrenme verisidir.

4. **Açıklanabilir otomasyon**
   Her eşleşme skor, gerekçe ve çelişki listesi üretir.

5. **Inline deneyim**
   Video/PDF/kaynak preview yeni sekme zorunluluğu olmadan gösterilir.

6. **Güvenli preview, indirme yok**
   Embed olabilir; otomatik medya indirme olmaz.

7. **Kanonik mimariye uyum**
   Yeni kod `core`, `features`, `shared` sınırlarına göre yazılır. Büyük sayfa
   bileşenleri daha da büyütülmez.

## Mimari Uyum Kararları

`PRODUCT_ARCHITECTURE.md` kalıcı route listesini Studio, Follow, Archive,
Rhythm ve Samples olarak tanımlar. 2026-06-01 ürün kararıyla arka planda kalan
statik route'lar da ön yüzde görünür tutulur; bu plan için karar:

- `/references` local/admin operasyon paneli olarak kalır ve ana ön yüzde
  görünür;
- `/references/curation` parça merkezli kaynak yönetim dashboard'u olur ve ana
  ön yüzde görünür;
- `/references/curation/[catalogId]` tek parça kaynak yönetim ekranı olur;
- legacy redirect route'ları (`/makam`, `/usul`, `/nota`, `/nota-editor`,
  `/recording`, `/sesler`, `/eser-takip`) merkezi nav'da görünür ama iş
  mantığını kanonik hedeflerinde tutar;
- ana pratik deneyimi `/studio/follow` içinde kaynakları tüketebilir, ama
  curation operasyon mantığını taşımaz;
- yeni bileşenler `features/references` veya `features/curation` altında
  ayrıştırılır;
- `src/app/references/page.tsx` ve `src/app/studio/follow/page.tsx` içine büyük
  iş mantığı eklenmez.

## Veri Sözleşmeleri

### `AutoAttachedReference`

Accepted-source validator'ından geçmiş, parça ekranına iliştirilebilen kaynak.

- `catalogId`
- `sourceId`
- `status`: `auto-attached`, `user-approved`, `user-prioritized`,
  `user-demoted`, `user-removed`, `delete-requested`, `deleted`,
  `user-corrected`, `manual-entry`
- `rank`
- `confidenceScore`
- `confidenceLevel`: `high`, `medium`, `low`, `conflict`
- `matchReasons`
- `conflicts`
- `attachedAt`
- `matcherVersion`

### `SourceSuggestion`

Search/Gemini veya kullanıcı sinyaliyle oluşan ama henüz accepted olmayan kaynak
adayı.

- `catalogId`
- `sourceId`
- `suggestionId`
- `url`
- `normalizedIdentity`
- `status`: `auto-suggested`, `user-attached`, `community-verified`,
  `disputed`, `user-removed`, `rejected`, `deferred`
- `title`
- `sourceProvider`
- `profileId`
- `provider`
- `confidence`
- `reason`
- `conflicts`
- `validationErrors`
- `checkedAt`
- `weakLabelOnly: true`
- `acceptedEligible: false`
- `directAutoAttach: false`
- `mediaDownload: false`

### `SourceSuggestionEvent`

Öneri ve kullanıcı feedback'i için append-only weak-label kayıt.

- `eventType`: `source_suggested`, `source_added`, `source_removed`,
  `alternate_proposed`, `comment_added`, `verified`, `disputed`, `rejected`,
  `rolled_back`
- `weakLabel: true`
- `labelPolicy`: feedback'in tek başına doğruluk sağlamadığını açıklar.

### `SourceFeedbackEvent`

Kullanıcı davranışından öğrenilecek append-only kayıt.

- `eventId`
- `catalogId`
- `sourceId`
- `eventType`
- `reason`
- `note`
- `createdAt`
- `createdBy`
- `previousValue`
- `nextValue`

### `ManualSourceCorrection`

Kullanıcının doğruladığı/düzelttiği alanlar.

- `catalogId`
- `sourceId`
- `correctTitle`
- `correctMakam`
- `correctUsul`
- `correctForm`
- `correctComposer`
- `correctLyricist`
- `alternativeUrl`
- `tags`
- `notes`
- `updatedAt`

### `ResearchSourceProfile`

Kullanıcının vereceği araştırılacak site profilleri.

- `id`
- `label`
- `baseUrl`
- `searchUrlTemplate`
- `provider`
- `trustWeight`
- `embedCapability`: `none`, `iframe`, `pdf`, `youtube`
- `metadataStrategy`: `none`, `html-title`, `og-title`, `oembed`,
  `site-specific`
- `enabled`

### `EmbedState`

Inline preview karar ve sonuçları.

- `sourceId`
- `embedType`
- `canEmbed`
- `lastCheckedAt`
- `lastFailureReason`
- `fallbackUrl`

### `SourceQualityStats`

Raporlama ve otomatik iyileştirme verisi.

- site bazlı kabul oranı;
- kaldırma/silme oranı;
- mismatch oranı;
- embed başarı oranı;
- kullanıcı düzeltme yoğunluğu;
- makam/usul/form kırılımlı hata örüntüleri.

## Mapping ve Skorlama

Mapping yalnızca başlığa bakmaz. Feature set:

- eser adı;
- makam;
- usul;
- form;
- besteci;
- güfteci;
- güfte/söz parçası;
- kaynak başlığı;
- PDF/HTML metadata;
- YouTube oEmbed metadata;
- site güven puanı;
- önceki kullanıcı feedback'i;
- önceki silme/kaldırma event'leri.

Çıktı:

- `confidenceScore`
- `confidenceGap`
- `confidenceLevel`
- `matchReasons`
- `conflicts`
- `recommendedStatus`
- `sourceQualityHint`

## UI Modeli

### `/references`

Operasyon paneli:

- inbox;
- map/sync/audit;
- ops token;
- bulk kaynak girişi;
- son mapping çıktıları.

### `/references/curation`

Dashboard:

- toplam katalog;
- eksik kaynak sayısı;
- auto-attached count;
- kullanıcı kaldırdığı;
- silinmeyi bekleyen;
- manuel düzeltmeli kayıt;
- site bazlı kalite;
- form/makam/usul/provider filtreleri;
- batch/coverage ilerleme.

### `/references/curation/[catalogId]`

Parça detay ekranı:

- ana parça başlığı;
- makam, usul, form, besteci, güfteci;
- yerel SymbTr kaynakları;
- Notalar;
- Videolar;
- PDF/Arşiv;
- Metadata;
- Log;
- Manuel Düzeltme;
- inline preview/embed alanı;
- kaldır/sil/geri al/not düş/öne al kontrolleri.

## Inline Preview ve Embed Politikası

- Otomatik medya indirme yoktur.
- YouTube oEmbed doğrulaması desteklenir.
- PDF ve iframe preview lazy-load olmalıdır.
- Embed default açık olabilir, ama kullanıcı "embed gizle" diyebilmelidir.
- Her iframe `title` taşır.
- Her preview fallback link taşır.
- CSP `frame-src` allowlist gerektirir.
- iframe `sandbox` kullanılır.
- Bozuk embed `EmbedState.lastFailureReason` alanına yazılır.
- Preview açılmadan üçüncü taraf iframe yüklenmez.

## Güvenlik Kapıları

- HTTPS zorunlu.
- URL identity dedupe zorunlu.
- source id kebab-case.
- metadata fetch için allowlist / timeout / response size / content-type
  sınırları.
- `/api/external-references` yeni action'ları mevcut token, production disable,
  fixed script dispatch ve operation lock kuralından sapmaz.
- Kullanıcı notları ve manuel alanlar HTML olarak render edilmez.
- Scriptler repo dışına yazmaz.

## Uygulama Fazları

### Faz 1: Sözleşme ve Validator

- birleşik planı yaz;
- auto-attached reference JSON manifesti ekle;
- feedback event JSON manifesti ekle;
- manual correction JSON manifesti ekle;
- research source profile JSON manifesti ekle;
- validator scripti ekle;
- `npm run curation:validate` komutunu ekle;
- testleri ekle.

### Faz 2: Policy ve Pipeline

- `EXTERNAL_REFERENCE_POLICY` inline preview kararını taşıyacak şekilde genişler;
- audit policy metni yeni kararla uyumlu hale gelir;
- source profile modülü çıkarılır;
- matcher açıklanabilir skorlama çıktısı üretir;
- auto-attached manifest üretici eklenir.

### Faz 3: API

- `GET /api/external-references` yeni curation state'i döndürür;
- `POST /api/external-references` sadece sabit action'larla feedback, delete,
  restore, stats ve embed-check işlemlerini çalıştırır;
- tüm action'lar token/lock/size limitlerini kullanır.

### Faz 4: UI

- `/references/curation` dashboard;
- `/references/curation/[catalogId]` parça detay ekranı;
- inline preview bileşeni;
- manual correction formu;
- feedback log görünümü;
- filtreler.

### Faz 5: Raporlama ve İyileştirme

- `curation:stats`;
- source quality stats;
- mismatch raporları;
- mapping weight önerileri;
- feedback verisiyle batch önceliklendirme.

## Kalite Kapıları

Her uygulama diliminden sonra:

- `npm run curation:validate`
- `npm run audit:external-references`
- `npm run typecheck`
- `npm run lint`
- ilgili Vitest dosyaları
- UI değiştiyse `npm run guardrails:layout`
- commit öncesi GitNexus `detect_changes`

## İlk Uygulanacak İş

İlk iş Faz 1'dir: veri sözleşmesi ve doğrulama kapısı. UI veya embed öncesinde
bu dosyalar ve validator olmadan kullanıcı feedback'i güvenilir veri haline
gelemez.

# Muzik - Master Proje Planı ve Mimari Kurallar

> 2026-05-09 itibariyle baglayici urun mimarisi
> `PRODUCT_ARCHITECTURE.md`, baglayici kod kural seti
> `ENGINEERING_RULESET.md` dosyasidir. Bu dosya tarihsel durum ve onceki
> calisma notlari icin korunur.

Bu doküman, sistem mimarisi analizinden çıkan sonuçlara göre projenin geliştirme, refaktör ve kurallar bütününü temsil eder.

## 2026-05-10 Aktif Kalan Eksiklikler

Bu bölüm aktif kod tabanının mevcut durumuna göre tek kaynak kalan iş
listesidir. Kürasyon/insan doğrulaması dışındaki zorunlu altyapı işleri
tamamlandı ve TODO dışı kanıt kaydına taşındı.
Eski planlardaki aktif kodda bulunmayan HeroUI, remote ensemble, OCR, tomato
ve WebSocket iddiaları kaldırılmıştır. Muadil kabul edilmez: aktif kodda
varsa vardır, yoksa yoktur.

## 2026-05-10 UX, Nota, Usul ve SymbTr Bütünleşme Durumu

Bu bölüm kullanıcı geri bildiriminin doğrudan iş listesi ve kanıt kaydıdır.
Amaç sayfaları tek tek süslemek değil; her sayfanın amacını netleştirip ortak
isimlendirme, nota gösterimi, ritim/ses davranışı ve SymbTr kaynak düzenini
tek kurala bağlamaktır.

### Araştırma Notu

- SymbTr v3 yerel arşivleri 3000 eser için `txt`, `mid`, `xml`, `mu2`, `pdf`
  formatlarının tamamını içeriyor; CSV ilk kolonu kanonik eser kimliği olarak
  kullanılabilir.
- MTG/SymbTr belgeleri SymbTr'nin Türk makam müziği için makine okunabilir
  sembolik skor koleksiyonu olduğunu ve txt, MusicXML, PDF, MIDI, mu2
  formatlarını sağladığını belirtir: https://github.com/MTG/SymbTr
- Zenodo SymbTr v3 kaydı 3000 eser, 164 makam, 135 usul, 61 form ve 145 saat
  nominal çalım süresini belgeliyor: https://zenodo.org/records/15470412
- TDV Devr-i Kebir maddesi usulün 28 zamanlı olduğunu ve birleşik yapısını
  açıklar; bu nedenle düz 4'lü tekrar gibi gösterilmeyecek:
  https://islamansiklopedisi.org.tr/devr-i-kebir
- TDV Usul maddesi darb adlarını `düm`, `tek`, `te`, `ke`, `tekkâ`,
  `tâ-hek` olarak açıklar; `te-ke` tek darb gibi değil yarım vuruşlu ardışık
  iki hafif darp olarak zamanlanmalıdır:
  https://islamansiklopedisi.org.tr/usul--musiki
- MusicXML accidental-value referansı Türk klasik müziği için slash ve numaralı
  diyez/bemol türlerini destekler; proje compact görünümde `♯/♭`, konuşma
  etiketinde `diyez/bemol` kullanacaktır:
  https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/accidental-value/

### Aktif Kalan Otomatik Kaynak Yönetimi / Kullanıcı Ayıklaması

- [ ] Harici nota sayfası, PDF, arşiv ve YouTube/kayıt coverage'i için sistemi
      "auto-attached + kullanıcı ayıklaması" modeline taşı. Sistem 2978 eksik
      katalog satırı için derin kaynak analizi yapıp kaynakları doğru kabul
      edilmiş gibi parça ekranına yerleştirecek; kullanıcı kaldırma, silme,
      önceliklendirme, not düşme ve manuel düzeltme ile veri kalitesini
      yönetecek.
- [x] `/references` ve yeni `/references/curation` akışlarının mimari yerini
      netleştir. `PRODUCT_ARCHITECTURE.md` kalıcı route listesi ile mevcut
      navigation'daki `references` route'u şu an farklı varsayımlara sahipti;
      2026-06-01 yeni ürün kararıyla local/admin kaynak operasyon yüzeyi ana
      ön yüzde de görünür hale getirildi. `navigation.config.ts`,
      `routes.config.ts` ve `validate-architecture.mjs` artık statik app
      route'larının merkezi nav'da görünmesini release kapısı olarak zorunlu
      tutar.
- [x] Yeni kaynak yönetim kodunu kanonik klasör sınırlarına göre yaz. Mevcut
      `src/app/references/page.tsx` ve `src/app/studio/follow/page.tsx` zaten
      büyük sayfalar; curation dashboard, parça detayı, embed preview, feedback
      logu ve filtreler `features/references` veya `features/curation` altında
      küçük bileşen/use-case modüllerine ayrılmalı. İlk dashboard
      `src/features/references/ReferencesCurationDashboard.tsx` altında;
      App Router sayfası yalnızca bu feature bileşenini bağlar.
- [x] `shared/ui` ve token merkezini gerçek kanonik merkez haline getir.
      `src/shared/ui/index.ts` hâlâ `@/components` köprüsünü kullanıyor;
      yeni curation UI eski `src/components`, `src/lib/theme` veya duplicate
      token katmanlarını büyütmemeli.
      2026-06-01 kanonik merkez dalgası: `src/shared/ui/index.ts` artık
      `@/components` barrel köprüsünden değil doğrudan atom/molecule/organism
      component path'lerinden export eder; curation dashboard/detail layout
      importları `@/shared/ui` üstünden geçer. `validate-architecture.mjs`
      shared/ui'nin tekrar `@/components` barrel bridge'e dönmesini kırar.
- [x] `docs/HUMAN_CURATION_SYSTEM_PLAN.md` içindeki eski "önce insan doğrulasın,
      sonra ürüne yaz" yaklaşımını tek bağlayıcı plana indir: otomatik
      iliştirme, inline embed, geri bildirim logu, manuel doldurma alanları,
      kaynak kalite metriği ve bütüncül iyileştirme döngüsü artık planın ana
      akışıdır.
- [x] Araştırılacak kaynak sitelerini yapılandırılabilir hale getir. Her site
      için arama URL şablonu, provider tipi, güven puanı, embed kabiliyeti,
      metadata parse yöntemi ve fallback davranışı tutulmalı; kullanıcı yeni
      site listesi verebilmeli. `src/data/references/research-source-profiles.json`
      ve `npm run curation:validate` bu sözleşmeyi doğrular.
- [ ] Mapping motorunu başlık dışına genişlet: makam, usul, form, besteci,
      güfteci, güfte/söz parçası, kaynak başlığı, PDF/HTML metadata, YouTube
      oEmbed ve site güven puanı birlikte skorlanmalı; her otomatik eşleşme
      açıklanabilir gerekçe ve çelişki uyarıları üretmeli.
      2026-06-01 ek batch dalgası: intake artık `lyricist` ve `lyrics`
      gözlemlerini kabul eder; matcher kaynak başlığı, makam/form/usul,
      besteci, varsa güfteci/söz token'ları ve profile/source metadata'sını
      açıklanabilir score reason olarak taşır. Provider-profile review queue
      arama query'leri artık usul sinyalini de içerir ve her satır
      `queryFields` + `scoreReasons` ile hangi metadata alanlarından üretildiğini
      makine-okunur raporlar. PDF/HTML metadata ve YouTube oEmbed sinyallerinin
      daha fazla otomatik toplu verify/terfi akışı hâlâ açık kalır.
      2026-06-01 metadata scoring dalgası: HTML sayfa başlığı/açıklaması/yazarı
      ve YouTube oEmbed başlık/yazar/provider sinyalleri artık `metadata`
      provenance alanında taşınır; matcher bunları `metadata-title`,
      `metadata-author` ve `metadata-signal:*` gerekçeleriyle skorlar. Review
      queue satırları profil `metadataStrategy` bilgisini taşır ve batch report
      `profile-metadata-strategy` scoring sinyalini doğrulanabilir kapı olarak
      raporlar. PDF içi metadata parse ve doğrulanmış otomatik terfi hâlâ
      review/validation işi olarak açık kalır.
      2026-06-01 archive coverage dalgası: merkezi
      `research-source-profiles.json` içine `internet-archive` profili eklendi.
      Eksik 2978 eser için archive provider arama adayları da review-only queue'ya
      girer; auto-attach hâlâ yalnız accepted kaynaklarla sınırlıdır.
- [x] Otomatik iliştirilen kaynaklar için kalıcı feedback/event log ekle.
      Kullanıcının `user-removed`, `delete-requested`, `deleted`,
      `user-prioritized`, `user-demoted`, `user-corrected`, `manual-entry`
      gibi tüm aksiyonları neden/not alanlarıyla saklanmalı; bu log daha sonra
      mapping ve kaynak güven puanını iyileştirecek veri seti olmalı.
      `source-feedback-events.json`, `manage-source-curation feedback`,
      `/api/external-references` curation action'ları ve `/references/curation`
      satır aksiyonları bu append-only akışı taşır.
- [x] Parça merkezli kaynak yönetim UI'ını tasarla ve uygula. Her eserin ana
      başlığı altında Notalar, Videolar, PDF/Arşiv, Metadata, Log ve Manuel
      Düzeltme görünümleri olmalı; filtreler makam/usul/form/besteci/güfteci,
      kaynak tipi, site, güven skoru, auto-attached, kullanıcı kaldırdığı,
      silinmeyi bekleyen ve manuel notlu kayıtları ayırabilmeli.
      `/references/curation/[catalogId]` ilk parça detay dilimini ve bu alt
      görünümleri taşır. 2026-06-01 ek dalga: `/api/external-references`
      auto-attached satırları SymbTr katalog metadata'sıyla zenginleştirir,
      `/references/curation` katalog geneli durum/provider/makam/usul/form
      filtreleri, backlog metriği ve `symbtr-curated-reference-next-batch`
      tablosunu gösterir. Besteci/güfteci için dedicated faceted filtre ve
      silinmeyi bekleyen kayıt iş akışı hâlâ açık kalır.
      2026-06-01 batch queue dalgası: audit artık tüm 3000 satırlık backlog'u
      `symbtr-curated-reference-backlog.json` olarak da üretir; API bu tam
      queue üstünden server-side sayfalama, query/makam/usul/form/priority
      filtresi ve facet sayıları döndürür; dashboard 100/250/500 satır
      sayfalama ve önceki/sonraki batch gezinmesini kullanır.
      2026-06-01 besteci/silme dalgası: `/api/external-references` backlog ve
      candidate review queue için server-side `composer`/`candidateComposer`
      filtresi ve besteci facet'i döndürür; dashboard dedicated Besteci ve
      Silme filtreleriyle besteciye göre queue daraltmayı ve `delete-requested`
      / `deleted` durumlarını tek tek manuel dolaşmadan ayırmayı destekler.
      2026-06-01 detay filtre dalgası: `/references/curation/[catalogId]`
      artık auto-attached kaynakları katalog bestecisi, source/manual güfteci,
      status ve silme kapsamına göre facet'ler; silme isteği, silindi işareti
      ve geri alma mevcut merkezi `source-feedback-events.json` event akışına
      token'lı şekilde yazılır. Kaynak tipi/site/güven skoru ve manuel notlu
      kayıt facet'lerini aynı detay yüzeyinde tamamlama işi açık kalır.
      2026-06-01 tamamlayıcı detay facet dalgası: aynı detay yüzeyi kaynak
      tipi/provider, site hostname, güven seviyesi ve manuel düzeltme/not/tag
      kapsamlarını da facet olarak destekler; sayaçlar görünür kaynak, silme
      kuyruğu ve manuel notlu kayıt adetlerini birlikte gösterir. Makam/usul/form
      toplu daraltması katalog-geneli `/references/curation` queue facet'lerinde,
      tek parça metadata bağlamı ise detay başlığı ve kaynak metadata'sında korunur.
- [x] Inline medya deneyimini ekle. YouTube videoları, PDF'ler ve iframe'e izin
      veren kaynak sayfaları parça ekranında yeni sekme açmadan görüntülenmeli;
      embed sandbox, lazy load, erişilebilir `title`, klavye odağı, bozuk embed
      fallback'i ve "embed gizle/aç" kontrolleriyle gelmeli.
      Detay ekranı YouTube oEmbed kaynaklarını embed URL'ye çevirir; `embed-allowed`
      ve `EmbedState.canEmbed=true` kaynakları sandbox/lazy iframe olarak açar,
      fallback linki ve gizle/göster kontrolünü her zaman gösterir.
- [x] Yeni inline embed kararına uygun güvenlik/policy katmanını güncelle.
      `src/data/references/external-reference-policy.json` tek policy kaynağıdır;
      `EXTERNAL_REFERENCE_POLICY`, metadata fetch limitleri ve Next
      `Content-Security-Policy` `frame-src` allowlist'i buradan beslenir.
      Medya indirme kapalıdır; güvenli inline preview yalnızca HTTPS,
      provider-specific doğrulama, sandbox, lazy load ve fallback link
      sözleşmesiyle izinlidir.
- [x] Manuel doldurma ve düzeltme alanlarını veri modeline bağla: doğru başlık,
      makam, usul, form, besteci, güfteci, kaynak açıklaması, yanlışlık nedeni,
      alternatif URL ve özel etiketler saklanmalı; bu alanlar raporlanabilir
      analiz verisi olarak da kullanılmalı.
      `manual-source-corrections.json`, `curation-manual-correction` API action'ı
      ve `/references/curation/[catalogId]` formu bu alanları kalıcı manifest'e
      bağlar.
- [x] Kaynak kalite ve mapping iyileştirme raporlarını üret. Site bazlı kabul /
      kaldırma oranı, en sık yanlış eşleşen alanlar, makam/usul/form kırılımlı
      hata örüntüleri, embed başarı oranı ve kullanıcı düzeltme yoğunluğu
      `curation:stats` komutu ve `/references/curation` site kalite tablosu ile
      görünür olur.
- [ ] Dış kaynak pipeline scriptlerini büyümeden modülleştir.
      `map-external-source-inbox.mjs`, `audit-external-reference-coverage.mjs`
      ve `external-source-intake.mjs` yeni derin analiz, site profili, feedback
      event ve stats işleri gelmeden matcher, source profile, event log ve
      reporting modüllerine ayrılmalı.
      2026-05-31 Faz 1: mapping skoru, provider inference, kaynak id üretimi
      ve açıklanabilir eşleşme nedenleri `scripts/lib/external-source-matcher.mjs`
      içine taşındı; map CLI artık orkestrasyon/rapor yazımı sınırında kalır.
      2026-05-31 Faz 2: coverage audit, backlog üretimi, bulk candidate
      validasyonu, CSV/JSON rendering ve dışarı yazım sözleşmesi
      `scripts/lib/external-reference-audit.mjs` içine taşındı; audit CLI ince
      kabuk olarak kaldı. Source profile/event log sınırlarını daha da
      inceltecek sonraki dalga kaldığı için ana iş açık tutulur.
      2026-06-01 Faz 3: `map-external-source-inbox.mjs` artık yalnız CLI
      argümanlarını çözen ince kabuk; HTML/oEmbed enrichment, accepted-only
      merge, CSV render ve batch run sözleşmesi
      `scripts/lib/external-source-mapping-pipeline.mjs` modülüne taşındı.
      Merge fonksiyonu yanlışlıkla gelen `needs-review` adayları da fail-closed
      skip eder; testler bu davranışı doğrudan doğrular. Event log/stats
      sınırlarını ayrı modüle inceltecek sonraki dalga açık kalır.
      2026-06-01 Faz 5: curation state assembly, feedback event log okuma,
      manual correction/embed state bağlama ve source quality stats özetleme
      `scripts/lib/source-curation-state.mjs` içine çıkarıldı.
      `source-curation-operations.mjs` artık bu state modülünü re-export eden
      ince operasyon katmanı olarak kalır; testler `summarizeCurationState`
      sözleşmesini de kapsar.
      2026-06-01 Faz 10: kaynak kalite istatistik üretimi event mutasyonlarından
      ayrılıp `scripts/lib/source-curation-stats.mjs` içine taşındı.
      `source-curation-events.mjs` sadece feedback/manual correction/embed-state
      append/upsert işlerini, `source-curation-operations.mjs` ise geriye dönük
      CLI import yüzeyini taşır.
      2026-06-01 Faz 6: `/api/external-references` içindeki curation state
      assembly de route gövdesinden çıkarıldı. Katalog metadata zenginleştirme,
      source lookup, feedback/manual/embed-state join ve source quality summary
      `src/app/api/external-references/curation-state.ts` içinde tek API state
      modülü olarak toplandı; route artık dosya okuma, batch pagination/export
      ve operasyon orkestrasyonu sınırında kalır.
      2026-06-01 Faz 7: aynı API'nin backlog/candidate review query, offset
      clamp ve facet üretimi `src/app/api/external-references/curation-query.ts`
      içine ayrıldı. `candidate-review-export`, review group export, karar
      önerisi ve karar şablonu yolları aynı merkezi filtre modülünü kullanır;
      route testlerine ek olarak modülün missing scope, provider/profile/status,
      composer, text query, facet ve pagination davranışı doğrudan testlenir.
      2026-06-01 Faz 4: curation registry I/O ve validation ortak sözleşmesi
      `scripts/lib/source-curation-registry.mjs`, append-only feedback/manual
      correction/embed-state/stats operasyonları ise
      `scripts/lib/source-curation-events.mjs` içine ayrıldı. Eski
      `source-curation-operations.mjs` import yüzeyi korunur ama auto-attach
      üretimi ile event/stat mutasyonları artık ayrı modül sınırlarında testlenir.
      2026-06-01 Faz 5: archive provider profili merkezi config'e alındı;
      candidate review queue büyümesi profile-count/summary-count validation
      kapılarıyla katalog-geneli doğrulanır.
      2026-06-01 Faz 8: provider-profile candidate review queue üretimi,
      confidence scoring, review group oluşturma ve güvenli grup karar önerileri
      `scripts/lib/external-reference-candidate-review.mjs` modülüne ayrıldı.
      `external-reference-audit.mjs` eski export yüzeyini korur ama audit
      orkestrasyonu artık candidate review policy ayrıntılarını taşımak zorunda
      değildir; yeni modül review-only adayların accepted source id/URL alanı
      üretmediğini doğrudan test eder.
      2026-06-01 Faz 9: coverage matrix, provider/status kırılım raporu,
      dedupe policy ve özet count üretimi
      `scripts/lib/external-reference-reporting.mjs` modülüne ayrıldı.
      `external-reference-audit.mjs` eski `buildCoverageMatrix`,
      `buildDedupeReport` ve `summarizeCounts` export yüzeyini korur; dedupe
      accepted URL identity normalizasyonunu audit katmanından enjekte ederek
      circular bağımlılık üretmeden aynı validation davranışını sürdürür.
- [ ] Yeni model için validation/test kapılarını ekle: auto-attached kaynak
      sözleşmesi, feedback event bütünlüğü, silme/geri alma akışı, embed
      allowlist/fallback, filtre sonuçları, ops token davranışı, büyük liste
      performansı ve mobil/desktop layout guard kapsamda olmalı.
      2026-05-31 ek kapı: feedback event, manuel düzeltme ve embed state
      kayıtları artık var olan auto-attached referansa bağlanmak zorunda;
      orphan kaynak id'leri validator ve operation katmanında reddedilir.
      2026-06-01 ek kapı: API curation state'i katalog metadata ve next-batch
      backlog satırlarını döndürür; dashboard testi refresh, faceted filtre,
      backlog linkleri ve row feedback payload'ını kapsar.
      2026-06-01 ek kapı: üretilmiş `source-quality-stats` kayıtları merkezi
      `research-source-profiles` id'leriyle hizalı olmak zorunda; bilinmeyen
      stat profili reddedilir, stamped stats artefact'inde her profil için satır
      aranır.
      2026-06-01 ek kök neden düzeltmesi: auto-attached manifest artık
      `profileId` taşır; stats üretimi kırılgan `sourceId` string tahmini yerine
      kaynak URL'sinin merkezi `research-source-profiles.baseUrl` eşleşmesiyle
      üretilen profile bağlanır.
      2026-06-01 ek cross-check: `validate-source-curation` mapping ve bulk
      candidate source metadata'sını okuyup `auto-attached.profileId` ile source
      URL profilini karşılaştırır.
      2026-06-01 ek batch kapısı: `external-reference-audit` tam backlog JSON
      artifact'i üretir, `/api/external-references` bu artifact'i paginated
      queue olarak döndürür ve route/dashboard testleri offset/facet davranışını
      doğrular.
      2026-06-01 ek review queue kapısı: `validate-source-curation` candidate
      review queue artifact'ini de okur; satırların yalnız `needs-review` /
      `conflict` kalmasını, accepted source id/URL taşımamasını, profile/provider
      uyumunu, bounded confidence değerlerini ve `summary.json` sayılarıyla
      birebir eşleşmesini doğrular.
      2026-06-01 ek scoring kapısı: candidate review queue satırları artık
      `scoreReasons` ve veri-duyarlı `queryFields` taşımak zorunda; validator
      makam/form/usul/title/composer alanlarından mevcut olanların query içinde
      temsil edildiğini ve scoring evidence listesinin boş olmadığını doğrular.
      2026-06-01 ek metadata kapısı: candidate review queue `metadataStrategy`
      değerini research profile ile birebir hizalı taşımak zorunda; stratejisi
      `none` olmayan profillerde scoring evidence içinde
      `metadata-strategy:*` gerekçesi bulunmazsa validation kırılır.
      2026-06-01 ek batch lifecycle kapısı: coverage `batchReport.flow`
      artık ingest, normalize, dedupe, provider-profile-classify,
      candidate-generate, confidence-score, status-assign,
      safe-auto-attach-accepted-only, validate ve coverage-report adımlarını
      taşımak zorunda; accepted-only auto-attach ve duplicate accepted URL
      identity policy metinleri validation tarafından doğrulanır.
      2026-06-01 ek coverage matrix kapısı: audit artık
      `symbtr-curated-reference-coverage-matrix.json` üretir; makam/form/usul/
      priorityGroup kırılımında total/curated/missing/active/deferred katalog
      sayıları ve profile/provider/status/confidence kırılımında review-only
      aday sayıları validator tarafından `coverage-matrix-drift` kapısıyla
      summary ve queue satırlarına karşı doğrulanır. Başında tire olan katalog
      segmentlerinin metrikte başı boşluklu değere dönüşmesi merkezi
      `humanizeSegment` trim düzeltmesiyle giderildi.
      2026-06-01 ek dedupe rapor kapısı: audit artık
      `symbtr-curated-reference-dedupe-report.json` üretir; accepted bulk
      source id, accepted URL identity ve generated review candidate id
      duplicate satırları `dedupe-report-drift` kapısıyla summary, batch report,
      bulk manifest ve review queue'ya karşı doğrulanır. Mevcut 14.897 satırlık
      batch kontrolünde 0 duplicate / 0 temizlenen duplicate raporlandı; duplicate
      accepted identity yine auto-attach öncesi fail-closed kalır.
      2026-06-01 dev-runtime kapanışı: `/references/curation` production
      `next start` kanıtına ek olarak Node 24 + Next 16.2.6 Turbopack dev
      runtime üzerinde de 200 döner. PostCSS, Next'in object/string plugin
      sözleşmesine uygun CJS UnoCSS adapter ile çalışır; tema `@import` kuralı
      CSS standardına uygun biçimde `@unocss all` öncesine alınmıştır.
      2026-06-01 ek accepted import profile kapısı: bulk accepted kaynak import'u
      artık `research-source-profiles.json` içindeki etkin profile host'una
      eşleşmeyen URL'leri ve eşleşen profile provider'ıyla uyuşmayan source
      provider değerlerini reddeder. Review/conflict/rejected adaylar yine
      auto-attach edilmeyen güvenli queue verisi olarak source URL zorunluluğu
      olmadan taşınabilir.
      2026-06-01 ek review group stale-proof kapısı: candidate review group
      decision template, recommendation artifact ve import hattı artık
      `sha256:external-reference-candidate-review-group-v1`
      `sourceGroupFingerprint` taşır. `curation:validate` ve import script'i,
      operator kararının güncel generated review group ile aynı candidate setine
      ait olduğunu doğrulamadan karar manifest'ine yazmaz.
- [ ] PDF vector ölçü adayları gerçek ölçü kutusuna terfi etmeden önce insan
      veya görsel regresyon doğrulaması bekliyor. Pipeline, review artifact'i,
      verification manifest'i ve Eser Takip UI yolu hazır; gerçek manifest şu
      an 0 doğrulanmış kutu içerir.
      2026-06-01 ek batch verification raporu: `npm run verify:symbtr-measures`
      artık terminal çıktısına ek olarak
      `output/symbtr-layout-review/layout-verification-summary.json` üretir;
      `promotionPolicy`, `candidateStatus`, unresolved candidate entry ve
      verified box sayıları kalıcı makine-okunur artifact olarak saklanır.
      2026-06-01 ek batch review template: `npm run review:symbtr-measures`
      artık tek tek manuel satır kopyalama yerine
      `layout-verification-review-template.json` üretir. Şablon PDF vector
      adaylarını kaynak SymbTr TXT ölçü indeks özetiyle eşler, `measureBoxes`
      alanını boş bırakır ve yalnız insan/görsel regresyon onayından sonra
      verification manifest'e terfi ettirilecek non-promoting review satırları
      taşır. `npm run verify:symbtr-measures` bu şablonu da okuyup kaynak
      PDF aday sayısı, TXT ölçü özeti, review satır geometrisi ve boş
      `measureBoxes` politikasını drift'e karşı doğrular.
      2026-06-01 ek batch-first kapanış: `review:symbtr-measures` artık
      varsayılan olarak tüm mevcut PDF candidate entry'lerini üretir;
      validator review template'in candidate entry kapsamından eksik veya
      fazla satır taşımasını hata sayar.
      2026-06-01 ek batch karar import güvenliği: review group karar import
      script'i artık yalnız `symbtr-curated-reference-candidate-review-groups.json`
      içinde üretilmiş grup id/catalog id çiftlerine karar yazabilir. Böylece
      3000 katalogdan review queue kapsamına girmeyen veya stale/elle uydurulmuş
      kararlar gerçek karar manifest'ine batch olarak taşınmadan fail-closed
      kalır; script testi valid import ve unknown group reddini kapsar.
      2026-06-01 ek PDF verification import hattı: `npm run
      import:symbtr-measure-verification -- --input <manifest> --write`
      insan/görsel regresyon onayından çıkan verified kutuları tek tek elle
      manifest düzenletmeden batch olarak `layout-verification.generated.json`
      içine taşır. Import, catalog id/source layout/source PDF/candidate count
      ve her verified box'ın generated PDF candidate satır-indeks çiftiyle
      eşleşmesini fail-closed doğrular; final yazımdan önce mevcut
      `verify:symbtr-measures` validator'ını otorite kabul eder.
      2026-06-01 ek stale-proof fingerprint kapısı:
      `review:symbtr-measures` artık her candidate entry için
      `sha256:symbtr-layout-candidate-geometry-v1` fingerprint'i üretir;
      `verify:symbtr-measures` review template, artifact index ve verified
      manifest entry'lerinin güncel PDF candidate geometry fingerprint'iyle
      eşleşmesini zorunlu tutar; import hattı stale/elle uydurulmuş manifest'i
      gerçek verification manifest'e yazmadan önce reddeder.

### Tamamlanan Otomasyon ve Altyapı Kanıtları (TODO Dışı)

1. [x] İsimlendirme kuralını yaz: `docs/NAMING_CONVENTIONS.md`.
2. [x] Ham MIDI/SymbTr değerlerini bozmadan merkezi solfej, diyez ve bemol
       gösterim yardımcısı ekle: `src/core/domain/note-naming.ts`.
3. [x] Sanal piyano, piano roll ve sample slot etiketlerini `Do/Re/Mi` ve
       `♯/♭` gösterimine bağla.
4. [x] Eser takip parça ekleme akışını TXT/URL zorunluluğundan çıkar; PNG/JPG
       gibi nota görselleriyle görsel çalışma eklenebilsin.
5. [x] Görsel eklemede mükerrerliği başlık + görsel dosya adı + boyut imzası
       ile engelle.
6. [x] Ritim/usul çalma davranışını dizi indeksine göre değil gerçek `beat`
       değerine göre zamanla; `te-ke` gibi yarım vuruşlu darbeler ayrı ve net
       çalsın.
7. [x] Ritim sayfasında çalma bittikten hemen sonra kapanan anlamsız durum
       yerine aktif darp ve döngü takibi göster.
8. [x] SymbTr v3 CSV'den 3000 eserlik dedupe katalog üret:
       `src/data/symbtr/catalog.generated.json`.
9. [x] Sayfa yerleşimlerini canlı tarayıcıda `/`, `/studio`, `/studio/follow`,
       `/rhythm`, `/samples`, `/archive` için masaüstü ve mobil kontrol et.
10. [x] Yeni davranışları test, typecheck, lint, build ve GitNexus
        `detect_changes` ile doğrula.
        2026-06-01 ek enstrüman/sample coverage kapısı: `npm run
        audit:samples` merkezi enstrüman listesindeki 20 enstrümanın sample
        slot kapsamını, beklenmeyen/boş WAV dosyalarını ve tüm enstrümanların
        sample veya synth fallback ile çalınabilir kalmasını batch olarak
        doğrular. `/api/samples` artık makine-okunur coverage summary döndürür;
        `/samples` bu özeti operatör UI'ında gösterir.
11. [x] SymbTr katalog aramasını eser takip seçim akışına bağla; kullanıcı
        yerel katalogdan aynı eserin `txt`, `mid`, `xml`, `mu2`, `pdf`
        kaynaklarını tek kayıt olarak seçebilsin.
12. [x] Eser Takip'te görsel nota ile sembolik olayları sayfa seviyesinde
        ilişkilendir; aktif sayfa kaynak notada çerçevelensin, yakın nota
        listesi ve aktif darp aynı takip bağlamında gösterilsin.
13. [x] Ölçü/devir seviyesinde görsel hizalama modelini toplam vuruş
        ilerlemesine bağla; aktif görsel sayfa artık olay sayısına göre değil
        müziksel zaman oranına göre seçilir.
14. [x] YouTube veya kayıt arşivi referanslarını katalog seviyesinde opsiyonel
        metadata olarak eşle; kaynak güvenilirliği ve telif durumu
        doğrulanmadan otomatik medya gömme yapılmasın.
15. [x] Satır/vuruş koordinatı seviyesinde görsel hizalama modeli ekle;
        aktif satır içinde x/y takip noktası ve vuruş kılavuzu gösterilsin.
16. [x] Hicazkâr örneği için manuel yüzde tabanlı görsel satır bantlarını veri
        modeline ekle; aktif satır kaynak notanın üstünde işaretlensin.
17. [x] Kullanıcının yüklediği PNG/JPG/WebP/GIF görseller için varsayılan
        satır bantlarını otomatik üret; eklenen görsel eserler de aynı görsel
        takip sözleşmesine sahip olsun.
18. [x] SymbTr `Offset` ölçü sınırlarını görsel koordinatla bağlayan takip
        motoru ekle; aktif ölçü satır üstünde ayrı segment olarak işaretlensin.
19. [x] SymbTr kataloğundaki tüm eserler için yerel v3 arşiv kaynaklarını
        deterministik eşle; her eser `txt`, `mid`, `xml`, `mu2`, `pdf`
        archive/member path referanslarını mükerrersiz üretsin ve katalogdan
        seçilen eserlerde Eser Takip içinde görünür olsun.
20. [x] Dış nota/kayıt kaynakları için merkezi manifest ve doğrulama sözleşmesi
        ekle; HTTPS, kebab-case id, YouTube oEmbed doğrulaması, dedupe ve
        no-auto-download/no-auto-embed kuralları test edilsin.
21. [x] SymbTr kataloğundaki tüm eserler için resmi dış kaynak metadata
        referanslarını otomatik üret: her katalog eseri `metadata-only`
        SymbTr v3 Zenodo ve MTG/SymbTr GitHub referansı alır; otomatik indirme
        veya embed yapılmaz. Kürasyonlu nota/YouTube kaynakları ayrı coverage
        olarak raporlanır.
22. PDF/MusicXML sayfa layout verisinden gerçek ölçü kutularını otomatik
        çıkarmak ayrı hizalama işi olarak kalacak; mevcut motor SymbTr ölçü
        zamanını yüzde tabanlı görsel satır koordinatına bağlar. PDF vector
        candidate extractor ve `src/data/symbtr/layout.ts` sözleşmesi eklendi,
        ancak adaylar henüz görsel regresyon veya insan kontrolüyle doğrulanmış
        ölçü kutusu sayılmaz. Doğrulanmış kutu UI yolu ve `measureIndex`
        sözleşmesi hazırdır, fakat gerçek manifest 0 kutu içerir.
23. [x] Kullanıcı hedefi için prompttan artifact'a tamamlanma denetimi yaz:
        `docs/UX_UI_COMPLETION_AUDIT.md`.
24. [x] Tüm static App Router sayfaları için kalıcı layout guard ekle:
        `scripts/validate-route-layout.mjs`; mobil/desktop görünümde blank
        main, framework overlay ve yatay overflow kontrol edilir. Headless
        Chrome profili yalnızca repo içindeki `.layout-guard/` altında açılır
        ve script repo dışı path temizlemeyi reddeder.
25. [x] SymbTr v3 MusicXML/PDF layout kaynaklarını gerçek ölçü kutusu çıkarımı
        açısından denetle: `scripts/audit-symbtr-layout-sources.mjs`.
        Sonuç: 3000 XML'in tamamında page defaults var; 0 dosyada measure
        coordinate, 0 dosyada `<print>` system/page break, 0 dosyada
        `system-layout`/`measure-layout` var. PDF arşivi 2999 eser içeriyor;
        `ussak--yuruksemai--yuruksemai_4--kah_ki--kara_ismail_aga` PDF'i eksik.
        Bu nedenle gerçek ölçü kutuları MusicXML'den değil PDF vector/OCR
        pipeline'ından çıkarılmalı.
26. Kürasyonlu harici nota sayfası ve YouTube/kayıt coverage'i tüm 3000
        SymbTr eseri için tamamlanmış değil; şu an doğrulanmış kürasyonlu
        kaynak coverage'i 22 katalog eseridir. Resmi SymbTr v3 dataset/GitHub
        kaynakları tüm katalog için kapsanır. `npm run audit:external-references`
        3000 satırlık insan-kürasyonu backlog CSV'si, ilk 100 kayıt için batch
        CSV/JSON ve form/makam/usul kırılımlı summary üretir. Belirsiz
        eşleşmeler `src/data/references/external-curation-decisions.json`
        içinde kayıt altına alınır; backlog'da kalır ama sıradaki manual
        batch'ten düşer.
27. [x] SymbTr PDF v3 arşivinden staff satırı ve ölçü adayı çıkaran tekrar
        çalıştırılabilir extractor ekle: `scripts/extract-symbtr-pdf-measures.mjs`.
        Hicazkâr örneğinde 10 staff row ve 49 `pdf-vector-candidate` ölçü adayı
        üretildi; gerçek ölçü kutusu olarak kullanılmadan önce doğrulama gerekir.
        Extractor `--all` ve `--limit` ile PDF arşivini batch tarayabilir.
28. [x] PDF vector ölçü adaylarını ürün verisine aday/doğrulanmamış olarak bağla:
        `src/data/symbtr/layout.generated.json`, `src/data/symbtr/layout.ts` ve
        Eser Takip "Sayfa eşleme" paneli Hicazkâr için 49 aday / 10 porte satırı
        bilgisini gösterir; bu veri kesin ölçü kutusu olarak çizilmez.
29. [x] PDF vector ölçü adayları için insan/görsel regresyon inceleme artifact'i
        üret: `scripts/render-symbtr-pdf-layout-review.mjs` ve
        `npm run review:symbtr-measures` Hicazkâr için kaynak PDF kopyasını ve
        HTML/SVG overlay'i `output/symbtr-layout-review/` altında üretir. Bu
        artifact adayları doğrulamaya hazırlar, ancak tek başına doğrulanmış
        ölçü kutusu kararı değildir.
        2026-06-01 genişletmesi: aynı komut batch review template JSON'u da
        üretir; 49 PDF vector adayını 28 SymbTr TXT ölçü indeksiyle birlikte
        review-only satır olarak listeler ve `measureBoxes: []` ile otomatik
        terfiyi fail-closed bırakır.
30. [x] Tüm SymbTr kataloğu için kürasyonlu dış kaynak backlog'u üret:
        `scripts/audit-external-reference-coverage.mjs` ve
        `npm run audit:external-references` resmi SymbTr metadata coverage'i
        3000/3000, doğrulanmış kürasyonlu nota/YouTube coverage'i 22/3000 olarak
        raporlar; eksik 2978 satır `output/external-reference-coverage/`
        altında CSV olarak listelenir. Medya indirme veya embed yapılmaz.
        Backlog satırları format, öncelik grubu, DuckDuckGo/YouTube arama URL'si
        ve kaynak-site sorgu ipuçları taşır.
31. [x] PDF ölçü adaylarının doğrulanmış ölçü kutusuna terfi etmesi için ayrı
        onay manifest'i ekle: `src/data/symbtr/layout-verification.generated.json`.
        `getSymbTrVerifiedPdfMeasureBoxes` ve Eser Takip status satırı, boş veya
        stale manifest durumunda 49 adayı 0 doğrulanmış kutu olarak tutar.
32. [x] PDF ölçü doğrulama manifest'i için kalıcı bütünlük kapısı ekle:
        `scripts/validate-symbtr-layout-verification.mjs` ve
        `npm run verify:symbtr-measures` catalog id, kaynak PDF path'i, kaynak
        layout üretim tarihi, aday sayısı, aday referansı, kaynak SymbTr TXT
        offsetlerinde bulunan `measureIndex`, yüzde sınırları ve `verified`
        confidence alanını doğrular. Boş manifest geçer ama adayları
        doğrulanmış kutuya terfi ettirmez.
33. [x] Doğrulanmış PDF ölçü kutuları için Eser Takip UI yolunu ekle:
        manifest onaylı kutular `measureIndex` ile aktif SymbTr ölçüsüne
        bağlanır, adaylardan ayrı bir "Doğrulanmış PDF ölçü haritası" olarak
        gösterilir ve testte mock manifest ile doğrulanır. Gerçek manifest boş
        olduğu için canlı veri hâlâ 0 doğrulanmış kutudur.
34. [x] PDF vector extractor'ı tüm arşivi yazmadan tarayacak şekilde genişlet:
        `node scripts/extract-symbtr-pdf-measures.mjs --all` 2999 PDF entry
        istedi, 2795 entry'yi parse etti, 1805 entry'de 65299 aday buldu ve
        mevcut parser'ın desteklemediği 204 PDF stream failure'ını raporladı.
        App bundle'a 65k aday otomatik gömülmedi; doğrulama/ingestion için
        batch extraction yolu hazır.
35. [x] PDF ölçü aday extraction coverage'ini kalıcı audit artifact'i yap:
        `npm run audit:symbtr-pdf-measures` aynı tam arşiv taramasını çalıştırır
        ve `output/symbtr-layout-review/pdf-measure-extraction-summary.json`
        içine counts, sample entries ve 204 failure listesini yazar.
36. [x] Harici kaynak kürasyon backlog'unu batchlenebilir hale getir:
        `npm run audit:external-references` artık
        `symbtr-curated-reference-next-batch.csv/json`, ilk 100 öncelikli katalog
        id'si, form/makam/usul eksik kırılımları ve güvenli kaynak tarama
        sorgularını üretir. Bunlar doğrulanmış kaynak sayılmaz; insan incelemesi
        için iş listesi sağlar.
37. [x] Harici kaynak kürasyonunda belirsiz veya eşleşmeyen adayları aynı
        batch'in başına tekrar getirmeyen karar kaydını ekle:
        `src/data/references/external-curation-decisions.json` şu an 5
        `needs-disambiguation`/`source-mismatch` kararı içerir. Audit scripti karar id'lerinin
        katalogda varlığını, status ve tarih biçimini doğrular; bu satırlar
        backlog CSV'sinde görünür kalır, ancak `next-batch` çıktısından
        geçici olarak çıkarılır.
38. [x] Tek tek JSON editlemeden toplu kürasyon içeri alma komutu ekle:
        `npm run import:external-references -- --input <json>` kabul edilen
        candidate'ları katalog id, HTTPS URL, YouTube oEmbed, duplicate identity,
        tarih ve kebab-case id kurallarıyla doğrular; `--dry-run` aynı dosyayı
        yazmadan kaç aday ekleneceğini raporlar.
39. [x] Kullanıcının yeni bulduğu kaynakları bana gelmeden sisteme verebilmesi
        için harici kaynak inbox ve otomatik mapping hattı ekle:
        `src/data/references/external-source-inbox.json`,
        `scripts/stage-external-sources.mjs`,
        `scripts/map-external-source-inbox.mjs`, `npm run stage:external-source`,
        `npm run stage:external-sources`, `npm run map:external-references`
        ve `npm run sync:external-references`. Kullanıcı tek URL, JSON, CSV,
        Markdown veya TXT dosyası verebilir; stage komutu HTTPS, provider,
        tarih, id ve duplicate URL identity kurallarını uygular. Mapping hattı
        tüm 3000 SymbTr katalog kaydına karşı başlık, makam, form, usul ve
        bestekâr skorlaması yapar; yüksek güvenli eşleşmeleri `accepted`,
        çelişkili kayıtları `needs-review` olarak ayırır. Örnek kaynaklarda
        8 inputtan 7 accepted, Düşeli/Sofyan-Düyek uyuşmazlığı 1 needs-review
        olarak ayrıldı. YouTube kayıt linkleri için `--verify-youtube-oembed`
        opsiyonu metadata doğrulaması yapar; düz skor/arşiv URL'leri için
        `--fetch-page-metadata` HTML `og:title`/`title` okur. Ağ erişimi
        gerektiren bu iki özellik varsayılan kapalıdır.
40. [x] Harici kaynak operasyonlarını ön yüze taşı:
        `/references` sayfası ve `/api/external-references` route'u eklendi.
        Kullanıcı tek kaynak formundan veya toplu metinden URL staging yapar,
        `Map`, `Sync`, `Audit` operasyonlarını sayfadan tetikler, accepted /
        needs-review / rejected mapping sonuçlarını ve inbox kaynaklarını tablo
        olarak görür. API route keyfi shell komutu kabul etmez; yalnızca sabit
        stage/map/sync/audit scriptlerini argüman dizisiyle çalıştırır.
41. [x] Ön yüz operasyon stratejisindeki güvenlik ve stabilite boşluklarını
        kapat:
        `docs/EXTERNAL_SOURCE_STRATEGY_AUDIT.md` strateji sınırını, bulunan
        loophole'ları ve kanıtları listeler. `/api/external-references`
        production'da varsayılan kapalıdır; production için enable env ve token
        zorunludur. Local ortamda da token varsayılan zorunlu tutulur; tokenless
        localhost kullanımı sadece açıkça `EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL=true`
        ile açılan unsafe escape hatch'tir. Token sabit zamanlı karşılaştırılır,
        bulk input boyutu sınırlandı, temp input dosyaları cleanup edilir ve
        aynı anda ikinci mutating operasyon 409 döndürür. Local kullanım için
        ops token `.env.local` içine eklendi; değer git dışı tutulur ve
        `/references` ekranındaki `Ops token` alanında kullanılır.
42. [x] Otomatik kaynak yönetimi planlarını tek bağlayıcı plana indir ve Faz 1
        veri sözleşmesi altyapısını başlat:
        `docs/HUMAN_CURATION_SYSTEM_PLAN.md` artık auto-attached kaynak yönetimi,
        kullanıcı feedback event logu, manuel düzeltme, kaynak profili, inline
        preview/embed policy ve fazlı uygulama stratejisini tek dosyada toplar.
        `src/data/references/source-curation.ts`,
        `auto-attached-references.json`, `source-feedback-events.json`,
        `manual-source-corrections.json`, `research-source-profiles.json`,
        `embed-states.json`, `source-quality-stats.generated.json`,
        `scripts/lib/source-curation-validation.mjs`,
        `scripts/validate-source-curation.mjs` ve `npm run curation:validate`
        eklendi. `EXTERNAL_REFERENCE_POLICY` güvenli inline preview kararını
        taşıyacak şekilde genişletildi; audit policy metni medya indirme yok /
        güvenli inline preview var seviyesine çekildi.
43. [x] Harici kaynak kürasyonu için operasyon katmanı eklendi:
        `scripts/manage-source-curation.mjs` auto-attach, feedback, manuel
        düzeltme, embed state ve stats işlemlerini fixed action olarak çalıştırır.
44. [x] Son mapping çıktısından otomatik iliştirme ve site kalite istatistiği
        üretildi: `npm run curation:auto-attach` yalnız `accepted` mapping'leri
        7 kayıt olarak auto-attached manifestine yazar ve `needs-review`
        conflict kayıtlarını prunelar. `npm run curation:stats` 4 profil
        üretir; `npm run curation:validate` 3000 katalog kaydı üstünde temiz
        geçer.
45. [x] `/api/external-references` curation state/action desteği ve
        `/references/curation` local/admin dashboard'u eklendi. API fixed script
        dispatch, token gate, operation lock ve project-local temp input
        kurallarını korur; dashboard auto-attach, stats, filtreli kaynak listesi,
        feedback action'ları, site kalite tablosu ve feedback logu gösterir.
46. [x] Parça merkezli kürasyon detay ekranının ilk dilimi eklendi:
        `/references/curation/[catalogId]` Notalar, Videolar, PDF/Arşiv,
        Metadata, Log ve Manuel Düzeltme görünümlerini sunar. API curation
        state'i auto-attached kayıtları kaynak metadata, feedback event,
        manual correction ve embed state ile zenginleştirir; detay ekranı
        manuel düzeltmeyi `curation-manual-correction` action'ı ile kaydeder.
47. [x] Güvenli inline preview UI'ı parça detayına bağlandı:
        YouTube oEmbed URL'leri embed URL'ye çevrilir; `embed-allowed` ve
        `EmbedState.canEmbed=true` iframe/PDF/kaynak sayfaları lazy, sandbox'lı,
        erişilebilir `title` taşıyan iframe içinde açılır. Her kaynak fallback
        linki ve gizle/göster kontrolü taşır; doğrulanmamış kaynak iframe
        yüklemez.
48. [x] Güvenli inline preview policy'si merkezi ve header-seviyesinde
        doğrulanır hale getirildi: `external-reference-policy.json`,
        `EXTERNAL_REFERENCE_POLICY`, `scripts/lib/external-metadata-fetch.mjs`
        ve `next.config.mjs` aynı allowlist/timeout/size/content-type
        sözleşmesini kullanır. `scripts/lib/__tests__/next-config-security.test.mjs`
        CSP `frame-src` değerinin merkezi policy'den geldiğini doğrular.
49. [x] Harici kaynak mapping motorunun ilk modüler dilimi ayrıldı:
        `scripts/lib/external-source-matcher.mjs` başlık/makam/form/usul/bestekâr
        skorlamasını, URL'den provider inference'ı, `auto` provider düzeltmesini,
        deterministik reference id üretimini ve `scoreReasons` açıklamasını
        taşır. `scripts/map-external-source-inbox.mjs` bu modülü kullanır;
        output count'ları değişmeden 8 kaynakta 7 accepted, 1 needs-review
        sonucunu korur.
50. [x] Harici kaynak coverage audit ve reporting mantığı modüle ayrıldı:
        `scripts/lib/external-reference-audit.mjs` katalog okuma, curated id
        tespiti, curation decision validasyonu, accepted bulk candidate
        dedupe/URL identity kontrolü, backlog satırı üretimi, CSV/JSON rendering
        ve summary yazım sözleşmesini taşır. `scripts/audit-external-reference-coverage.mjs`
        yalnızca CLI argümanı okuyup modülü çağıran ince kabuktur.
51. [x] Curation feedback bütünlük kapısı sertleştirildi:
        `scripts/lib/source-curation-validation.mjs` feedback event,
        manual correction ve embed state kayıtlarının gerçek auto-attached
        referansa bağlı olmasını zorunlu tutar. `recordSourceFeedback`,
        `upsertManualSourceCorrection` ve `upsertEmbedState` orphan source
        payload'larını yazmadan validation hatasına düşürür.
52. [x] Next static asset cache policy uyarısı kapatıldı:
        `next.config.mjs` artık `/_next/static/:path*` için custom
        `Cache-Control` header'ı tanımlamaz; Next.js static asset cache
        yönetimini kendi üstlenir. `scripts/lib/__tests__/next-config-security.test.mjs`
        production config'i taze import ederek merkezi CSP `frame-src`
        sözleşmesini ve `/_next/static` için custom cache header olmadığını
        doğrular.
53. [x] Styling compiler keskinleştirildi:
        Tailwind CSS derleyici paketleri projeden çıkarıldı. PostCSS artık
        yalnız `@unocss/postcss` kullanır; `uno.config.mjs` Wind4 preset ile
        mevcut utility sınıflarını üretir ve tema gerçeğini CSS custom
        property tokenlarına bağlar. `tailwind.config.ts` kaldırıldı,
        `src/app/globals.css` tek styling giriş noktası olarak merkezi theme
        import'unu ve ardından `@unocss all` direktifini taşır. Prod build
        webpack hattını korur; dev runtime Next 16 varsayılanına uygun
        Turbopack ile çalışır.
54. [x] Curation dashboard backlog yönetimi zenginleştirildi:
        `/api/external-references` auto-attached kayıtları SymbTr katalog
        metadata'sı, `source` lookup'ı ve `symbtr-curated-reference-next-batch`
        satırlarıyla döndürür. `/references/curation` backlog metriği,
        durum/provider/makam/usul/form filtreleri, katalog metadata sütunları,
        ilk 100 backlog satırı ve güvenli nota/YouTube arama linklerini aynı
        local/admin yüzeyde gösterir.
55. [x] 3000 eser backlog'u tek dosyalık next-batch sınırından çıkarıldı:
        `audit:external-references` artık tam katalog queue'sunu
        `output/external-reference-coverage/symbtr-curated-reference-backlog.json`
        olarak yazar. `/api/external-references` bu JSON'u query/makam/usul/form/
        priority filtreleri, facet sayıları, 100/250/500 limit ve offset
        metadata'sıyla döndürür. `/references/curation` batch queue'da sayfa
        boyutu, önceki/sonraki gezinme, aktif/deferred sayıları ve priority
        filtresini gösterir; manuel tek tek dolaşma yerine 2978 açık kaydı
        reproducible queue olarak yönetir.
56. [x] Auto-attached curation feedback tek tek aksiyon sınırından çıkarıldı:
        `scripts/manage-source-curation.mjs feedback-batch` ve
        `recordSourceFeedbackBatch` tek payload içinde çoklu feedback event'i
        append-only log'a yazar, ilgili auto-attached statüleri tek validation
        geçişiyle günceller. `/api/external-references`
        `curation-feedback-batch` action'ını aynı ops-token ve temp JSON payload
        güvenliğiyle geçirir. `/references/curation` görünür satır seçimi,
        toplu onayla/öne al/kaldır kontrolleri ve seçili kayıt sayısıyla batch
        operasyonu destekler.
57. [x] Bulk candidate manifest import/export terminal bağımlılığından çıkarıldı:
        `candidate-export` mevcut `external-reference-bulk-candidates.json`
        manifestini ops-token korumalı API sonucuna taşır; `candidate-import`
        8 MB'a kadar JSON manifesti temp proje dosyasına yazar, dry-run
        varsayımıyla `scripts/import-external-reference-candidates.mjs`
        üzerinden aynı validasyon/dedupe kapısına sokar ve temp dosyayı siler.
        `accepted`, `needs-review`, `rejected` ve `conflict` status'ları birinci
        sınıf manifest durumudur; sadece `accepted` curated/auto-attach yoluna
        sayılır. `/references/curation` aday manifest JSON alanı, dry-run
        toggle'ı, dışa/içe aktar butonları ve aday/status özetini gösterir.
58. [x] Provider-profile candidate review queue batch artifact'i eklendi:
        `audit:external-references` artık merkezi
        `research-source-profiles.json` üzerinden 2978 eksik eser x 5 etkin
        profil için 14890 adet search-candidate review satırı üretir. Çıktılar
        `output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json`
        ve `.csv` dosyalarıdır. Satırlar `needs-review` veya `conflict`
        statüsündedir; bunlar kaynak kanıtı değildir ve accepted URL manifestine
        import edilmeden curated/auto-attach sayılmaz. Dashboard manifest paneli
        candidate review queue sayısını ve artifact yolunu gösterir.
59. [x] Candidate review queue UI/API sayfalama eklendi:
        `/api/external-references` artık
        `candidateLimit`/`candidateOffset`/`candidateStatus`/`candidateProfile`
        query parametreleriyle 14890 satırlık candidate review queue'yu bounded
        ve facet'li döndürür. `/references/curation` `Aday review queue`
        tablosu, durum/profil filtreleri, 100/250/500 sayfa boyutu, önceki/
        sonraki gezinme, arama linki ve review confidence bilgisini gösterir.
60. [x] Candidate review queue validation kapısı eklendi:
        `scripts/lib/source-curation-validation.mjs` artık 14890 review-only
        candidate satırını merkezi profil/policy kurallarıyla doğrular.
        `accepted` statü, source id/source URL taşıyan review adayı, profile
        provider/trust drift'i, confidence sınır dışı değeri ve `summary.json`
        status/profile/count uyuşmazlığı `npm run curation:validate` kapısını
        kırar.
61. [x] Filtreli candidate review queue export eklendi:
        `/api/external-references` `candidate-review-export` action'ı sabit
        review queue artifact'ini okur, mevcut durum/profil/provider/metin
        filtrelerini uygular ve shell çalıştırmadan JSON manifest döndürür.
        `/references/curation` `Queue dışa aktar` kontrolüyle aktif filtreli
        review queue JSON'unu ayrı readonly alana alır; bu çıktı accepted
        manifest import kutusuna karışmaz ve review-only statüyü korur.
62. [x] Her batch sonunda makine-okunur coverage/delta raporu eklendi:
        `audit:external-references` `summary.json.batchReport` altında
        ingest→normalize→dedupe→provider-profile-classify→candidate-generate→
        confidence-score→status-assign→safe-auto-attach-accepted-only→validate→
        coverage-report akışını, 3000 işlenen eser sayısını, önceki curated
        sayısını, yeni accepted katalog id'lerini, missing/deferred/next batch
        sayısını, status/profile kırılımlarını ve validation gate listesini
        yazar. `curation:validate` bu batch raporunun summary ve 14890 review
        queue satırıyla drift etmediğini doğrular; dashboard üst metriklerde
        batch raporunu gösterir.
63. [x] Candidate review group karar önerisi batch artifact'i eklendi:
        `audit:external-references` artık
        `symbtr-curated-reference-candidate-review-group-decision-recommendations.json`
        dosyasını üretir. Öneriler yalnız `conflict` ve mevcut deferred karar
        izlerinden `conflict/deferred` manifest satırı çıkarır; `accepted`,
        source id veya source URL taşımaz. `curation:validate` öneri count,
        status, source-field yasağı, generated group drift'i ve
        `batchReport.recommendedReviewGroupDecisions` alanını doğrular.
        `/references/curation` `Karar önerisi` kontrolü mevcut filtrelerle
        öneri manifestini JSON alanına alır; import hâlâ dry-run/write ayrımıyla
        mevcut karar import script'inden geçer.

### Doğrulama Notu

- 2026-06-01 candidate review group öneri doğrulaması:
  `npx vitest run scripts/lib/__tests__/external-reference-audit.test.mjs scripts/lib/__tests__/source-curation-validation.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 4 dosya, 52 test. `npm run audit:external-references` 5 öneri
  üretti (4 deferred, 1 conflict), `npm run curation:validate` 3000 katalog /
  14890 queue / 2978 grup / 5 öneri ile temiz geçti. Browser QA
  `/references/curation` üzerinde `Karar önerisi` export ve dry-run import'u
  5 karar olarak doğruladı; `candidate-review-group-decisions.json` değişmedi.
  Codex Security diff scan:
  `output/security-scans/candidate-review-group-decision-recommendations-20260601/report.md`
  ve `.html`, bulgu yok.

- 2026-05-31 ek doğrulama: `npx vitest run src/data/references/__tests__/external-sources.test.ts scripts/lib/__tests__/next-config-security.test.mjs scripts/lib/__tests__/external-source-intake.test.mjs`
  geçti: 3 dosya, 17 test. Merkezi external reference policy, Next CSP
  `frame-src` üretimi, safe inline preview kuralı ve kaynak intake akışı
  birlikte doğrulandı.
- 2026-05-31 matcher modülü doğrulaması:
  `npx vitest run scripts/lib/__tests__/external-source-matcher.test.mjs scripts/lib/__tests__/external-source-intake.test.mjs scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs`
  geçti: 4 dosya, 14 test. Türkçe normalizasyon, metadata çelişkisi,
  `provider: "auto"` URL inference'ı ve açıklanabilir skor nedenleri kapsandı.
- 2026-05-31 mapping determinism: `npm run map:external-references` geçti;
  8 inbox kaynağı 3000 katalog eseriyle skorlandı, 7 accepted, 1 needs-review,
  0 rejected sonucu korundu. `npm run audit:external-references` geçti:
  3000 resmi SymbTr metadata, 22 kürasyonlu kaynak, 2978 açık backlog.
- 2026-05-31 audit/reporting modülü doğrulaması:
  `npx vitest run scripts/lib/__tests__/external-reference-audit.test.mjs scripts/lib/__tests__/external-source-matcher.test.mjs scripts/lib/__tests__/external-source-intake.test.mjs`
  geçti: 3 dosya, 14 test. Audit modülü deferred kararlarını next batch'ten
  çıkarma, accepted bulk candidate'ları curated sayma, YouTube duplicate URL
  identity ve deterministic artifact yazımı kurallarını kapsar.
- 2026-05-31 curation event bütünlüğü doğrulaması:
  `npx vitest run scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/[catalogId]/__tests__/page.test.tsx src/app/references/curation/__tests__/page.test.tsx`
  geçti: 5 dosya, 25 test. Orphan feedback/manual correction/embed state
  payload'ları reddedilir; mevcut manifest `npm run curation:validate` ile
  3000 katalog, 7 auto-attached, 0 orphan kayıt olarak geçti.
- 2026-06-01 curation conflict prune doğrulaması:
  `node .\node_modules\vitest\vitest.mjs run scripts/lib/__tests__/source-curation-operations.test.mjs scripts/lib/__tests__/source-curation-validation.test.mjs`
  geçti: 2 dosya, 7 test. `node scripts/manage-source-curation.mjs auto-attach --write`
  7 accepted kayıt üretti ve 1 stale auto-attached conflict kaydını pruneladı;
  `node scripts/manage-source-curation.mjs stats --write` sonrası tüm
  `mismatchCount` değerleri 0 oldu.
- 2026-06-01 kaynak kalite profili düzeltmesi:
  OGM Materyal kaynakları `external` kovasından çıkarılıp
  `research-source-profiles.json` içinde `ogm-materyal` profiline bağlandı.
  `node scripts/manage-source-curation.mjs stats --write` sonrası API state
  `auto=7`, `conflict=0`, `profiles=4`,
  `divanmakam:5:0,ogm-materyal:2:0,salihbora:0:0,youtube:0:0` sonucunu verdi.
  `node scripts/validate-route-layout.mjs --base-url http://localhost:4012 --routes /references/curation`
  mobil/desktop geçti.
- 2026-06-01 source quality validation sertleştirmesi:
  `scripts/lib/source-curation-validation.mjs` artık üretilmiş
  `source-quality-stats` satırlarını merkezi `research-source-profiles`
  manifest'iyle karşılaştırır; `external` fallback dışında bilinmeyen profil id
  reddedilir ve stamped stats artefact'inde eksik profil satırı hata sayılır.
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs`
  geçti: 2 dosya, 8 test. `node scripts/validate-source-curation.mjs` 3000
  katalog, 7 auto-attached, 4 profil ve 4 stats satırıyla temiz geçti.
- 2026-06-01 auto-attached profileId veri modeli:
  `src/data/references/auto-attached-references.json` satırları artık merkezi
  `profileId` taşır. `generateAutoAttachedReferences` profile id'yi source URL
  host'unu `research-source-profiles.baseUrl` ile eşleştirerek üretir; stats
  üretimi bu alanı kullanır ve UI auto-attached tablosunda `Profil / Provider`
  olarak gösterir. `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 4 dosya, 26 test. `node scripts/manage-source-curation.mjs auto-attach --write`,
  `node scripts/manage-source-curation.mjs stats --write` ve
  `node scripts/validate-source-curation.mjs` 3000 katalog / 7 auto-attached /
  4 profil / 4 stats ile temiz geçti.
- 2026-06-01 profileId/source metadata cross-check:
  `validate-source-curation` mapping ve bulk candidate kaynak metadata'sını
  validator'a verir; validator `auto-attached.profileId` ile source URL host'u
  üzerinden beklenen merkezi profile id'yi karşılaştırır. Yanlış profile sahip
  auto-attached kayıtlar artık gerçek source metadata ile yakalanır. `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 4 dosya, 27 test; `node scripts/validate-source-curation.mjs` temiz.
- 2026-06-01 curation backlog UI doğrulaması:
  `node .\node_modules\vitest\vitest.mjs run src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 2 dosya, 17 test. API katalog metadata + next-batch backlog state'ini
  döndürür; dashboard refresh, faceted filtre, backlog linkleri ve satır
  feedback payload'ı aynı testte doğrulanır. `node scripts/validate-source-curation.mjs`
  ve `node scripts/audit-external-reference-coverage.mjs` de geçti; audit
  sonucu 3000 katalog, 22 curated reference ve 2978 eksik satırı korudu.
- 2026-06-01 batch backlog pagination doğrulaması:
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/external-reference-audit.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 3 dosya, 22 test. `npm run typecheck`, `npm run lint`,
  `npm run audit:external-references` ve `node scripts/validate-source-curation.mjs`
  temiz geçti. Üretilen
  `output/external-reference-coverage/symbtr-curated-reference-backlog.json`
  3000 satır içerir; 2978 satır missing, 5 satır deferred olarak doğrulandı.
- 2026-06-01 curation queue Codex Security diff scan:
  `output/security-scans/curation-queue-pagination-20260601/report.md` ve
  `report.html` üretildi; `validate_report_format.py` geçti. Bu fazın
  `/api/external-references`, dashboard ve audit JSON değişikliklerinde
  reportable finding yok. `npm run audit:security` de 0 vulnerability döndürdü.
  Not: repo genelindeki mevcut dirty worktree hâlâ GitNexus CRITICAL scope
  döndürür; push öncesi tüm pending değişiklikler ayrıca ayrıştırılmalı veya
  geniş güvenlik taramasından geçirilmelidir.
- 2026-06-01 bulk feedback doğrulaması:
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-operations.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 3 dosya, 26 test. `npm run typecheck` temiz. Batch feedback birden
  çok satırı tek temp JSON ve tek manifest validation geçişiyle işler; dashboard
  testinde satır seçimi ve `curation-feedback-batch` POST payload'ı doğrulanır.
- 2026-06-01 bulk feedback production QA:
  `GET /api/external-references?backlogLimit=250&backlogOffset=250&backlogScope=missing`
  ops-token ile 7 accepted mapping, 7 auto-attached, 0 conflict, 4 source profile,
  250 dönen satır, 2978 filtreli/eksik backlog, 2973 aktif ve 5 deferred satır
  döndürdü. Browser QA `/references/curation` üzerinde gerçek veri mutasyonu
  yapmadan satır seçimini doğruladı: başlangıçta bulk butonlar disabled, bir
  auto-attached satır seçilince `1 seçili` ve `Toplu onayla`/`Toplu öne al`/
  `Toplu kaldır` enabled; console warning/error yok, yatay overflow yok.
  Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-bulk-selection-qa.png`.
  `node scripts/validate-route-layout.mjs --base-url http://localhost:4012 --routes /references/curation`
  mobile+desktop geçti; mobile tabloda 8 clipped candidate kabul edilebilir
  scroll/table kırpması olarak raporlandı, page overflow yok. GitNexus
  `detect_changes(scope=all)` repo genelindeki 76 dosyalık dirty worktree
  nedeniyle CRITICAL kalıyor; bu fazın scoped security raporunda finding yok.
- 2026-06-01 candidate manifest import/export doğrulaması:
  `node node_modules/vitest/vitest.mjs run scripts/__tests__/import-external-reference-candidates.test.mjs scripts/lib/__tests__/external-reference-audit.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 4 dosya, 30 test. `npm run typecheck` temiz. Testler conflict
  status'ının accepted gibi curated sayılmadığını, import dry-run dedupe
  davranışını, API temp JSON cleanup'ını, malformed JSON reject'ini ve dashboard
  export/import payload'ını doğrular.
- 2026-06-01 provider-profile candidate review queue doğrulaması:
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/external-reference-audit.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 3 dosya, 29 test. `npm run typecheck` temiz. `npm run audit:external-references`
  14890 candidate review queue satırı üretti: 14885 needs-review, 5 conflict;
  her research profile için 2978 satır var (`divanmakam`, `internet-archive`,
  `ogm-materyal`, `salihbora`, `youtube`).
- 2026-06-01 candidate review queue Browser QA:
  Yeni build ile prod server yeniden başlatıldı. API smoke `candidateReviewQueueEntries=14890`,
  `candidateReviewQueueJson=output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json`
  ve 2978 backlog sonucunu döndürdü. Browser QA `/references/curation`
  üzerinde `14.890 queue` metnini, candidate review queue JSON artifact yolunu,
  7 accepted özetini ve 2978 filtreli backlog bilgisini doğruladı; console
  warning/error yok ve yatay overflow yok. Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-candidate-review-queue-panel-qa.png`.
- 2026-06-01 candidate review queue pagination QA:
  `GET /api/external-references?candidateLimit=100&candidateOffset=100&candidateProfile=youtube&candidateStatus=needs-review`
  100 satır, 2977 filtreli YouTube needs-review, toplam 14890 queue ve
  `nextOffset=200` döndürdü. Browser QA `/references/curation` üzerinde `Aday
  review queue` tablosunu, `100 gösteriliyor · 2.977 filtreli · 14.890 toplam`
  metnini, durum/profil filtrelerini, `Aday ara` linklerini ve `Aday sonraki`
  etkileşimini doğruladı; console warning/error yok ve yatay overflow yok.
  Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-candidate-review-table-qa.png`.
- 2026-06-01 candidate review queue Codex Security diff scan:
  `output/security-scans/candidate-review-queue-20260601/report.md` format
  validator'dan geçti ve
  `output/security-scans/candidate-review-queue-20260601/report.html`
  üretildi. Reportable finding yok. Kapsam audit queue generation, profile
  validation, generated artifact paths, dashboard display ve ilgili test/docs
  değişiklikleridir.
- 2026-06-01 candidate review queue validation hardening:
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-validation.test.mjs`
  geçti: 1 dosya, 6 test. `npm run curation:validate` 3000 katalog, 7
  auto-attached, 5 research profile, 5 quality stat ve 14890 candidate review
  queue satırını 0 hata ile doğruladı.
- 2026-06-01 filtered candidate review queue export:
  `node node_modules/vitest/vitest.mjs run src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 2 dosya, 25 test. API `candidate-review-export` action'ı filtreli
  queue manifestini shell çağırmadan döndürür; dashboard `Queue dışa aktar`
  butonu aktif candidate profil/durum/metin filtrelerini POST body'ye taşır ve
  readonly JSON alanına yazar. `npm run typecheck` temiz geçti.
- 2026-06-01 filtered candidate review queue export QA:
  Production server 4012 yeni build ve token-required local ops ayarıyla
  yeniden başlatıldı. API smoke `candidate-review-export` için `status=conflict`
  ve `profileId=youtube` filtrelerinde 1 satır / toplam 14890 döndürdü; manifest
  tipi `candidate-review-queue-export`, ilk satır `youtube/conflict`. Browser QA
  `Queue dışa aktar` sonrası `Filtreli review queue JSON` alanını doğruladı:
  JSON içinde `candidate-review-queue-export` ve `profileId: youtube` var,
  `accepted` statüsü yok, console warning/error yok ve yatay overflow yok.
  Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-candidate-review-export-final-qa.png`.
- 2026-06-01 candidate manifest Browser QA:
  Prod server `http://localhost:4012` yeni build ile yeniden başlatıldı. API
  smoke 7 candidate / 7 accepted / 0 needs-review / 0 conflict ve 2978 filtreli
  backlog döndürdü. Browser QA `/references/curation` üzerinde ops-token refresh
  sonrası `Aday manifest import/export` panelini, manifest path'ini, 7 accepted
  özetini, dry-run toggle'ını ve `Manifesti dışa aktar` aksiyonunu doğruladı.
  Export 7066 karakterlik JSON'u textarea'ya yazdı; gerçek import butonuna
  basılmadı. Console warning/error yok ve yatay overflow yok. Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-manifest-export-qa.png`.
- 2026-06-01 candidate manifest Codex Security diff scan:
  `output/security-scans/candidate-manifest-import-export-20260601/report.md`
  format validator'dan geçti ve
  `output/security-scans/candidate-manifest-import-export-20260601/report.html`
  üretildi. Reportable finding yok. Kapsam API import/export action'ı, CLI
  import validasyonu, audit status validasyonu, dashboard kontrolleri ve ilgili
  testlerdir; geniş dirty worktree ayrı scan gerektirir.
- 2026-06-01 production curation QA:
  `node scripts/validate-route-layout.mjs --base-url http://localhost:4012`
  geçti: 15 route x 2 viewport. Browser QA `/references/curation` üzerinde
  token refresh, `AUTO 7`, `CONFLICT 0`, `Makam=Ussak`,
  `Dostun Senden` araması, backlog tablosu, DuckDuckGo/YouTube link varlığı,
  0 console warning/error ve yatay overflow yokluğu ile geçti. Screenshot:
  `C:/Users/ogunozden/AppData/Local/Temp/muzik-curation-pruned-qa.png`.
- 2026-05-31 Next static cache policy doğrulaması:
  `npx vitest run scripts/lib/__tests__/next-config-security.test.mjs` geçti:
  1 dosya, 2 test. Production config merkezi external reference CSP
  `frame-src` değerini korur ve `/_next/static/:path*` için custom
  `Cache-Control` header'ı döndürmez. `npm run build` geçti; Next
  Cache-Control uyarısı kapanmış durumda.
- 2026-06-01 styling compiler migration:
  Context7 ile Next.js 16 `--webpack` opt-out, Tailwind v4 CSS-first/PostCSS
  modeli ve UnoCSS Next/PostCSS Wind4 entegrasyonu kontrol edildi. Repo
  gerçekliği yüzlerce utility class'a bağlı olduğu için CSS Modules'a tek
  seferde elle geçiş yerine Tailwind derleyicisi kaldırılıp minimal UnoCSS
  Wind4 PostCSS hattına geçildi. `npm ls` Tailwind paketlerinin kalmadığını,
  yalnız `@unocss/postcss` ve `@unocss/preset-wind4` kaldığını gösterdi.
  Node runtime `.node-version`, `.nvmrc`, `package.json#engines` ve
  `.npmrc engine-strict=true` ile Node 24 hattına sabitlendi; `@types/node`
  aynı hatta çekildi.
- 2026-06-01 dev-runtime düzeltmesi: Context7 resmi Next PostCSS sözleşmesine
  göre plugin instance yerine object/string PostCSS config kullanıldı.
  `scripts/postcss-unocss.cjs`, UnoCSS PostCSS adapter'ını Next dev/build
  loader'larının ortak okuyabileceği CJS module olarak dışa aktarır.
  `npm run dev -- --port 4036` Node 24 üzerinde Turbopack ile
  `/references/curation` için HTTP 200 döndürdü ve stderr boş kaldı.
- 2026-05-31 ek doğrulama: `npm run typecheck` geçti.
- 2026-06-01 tam kapı koşusu: `npm run guardrails:architecture`,
  `npm run lint`, `npm run typecheck`, `npm run test:run`,
  `npm run build`, `npm run audit:security`, `npm run curation:validate`,
  `npm run verify:symbtr-measures`, `npm run audit:external-references` ve
  `git diff --check` geçti. Full test sonucu 37 dosya / 276 test; build
  Tailwind/DEP0205 warning ve Turbopack panic log'u üretmedi.
- 2026-06-01 layout/browser kapısı: production `next start` 4010 üzerinde
  `npm run guardrails:layout -- --base-url http://localhost:4010` 15 route x 2
  viewport geçti. Browser QA'da `/`, `/studio/follow`, `/rhythm` ve
  `/references/curation` sayfaları dolu içerik, CSS sheet, token arka planı ve
  yatay overflow olmadan doğrulandı; console warning/error yoktu.
- 2026-06-01 PDF ölçü doğrulama sertleştirmesi:
  `scripts/lib/symbtr-score-measures.mjs` SymbTr TXT offsetlerinden gerçek
  ölçü indeks özetini çıkarır; `npm run verify:symbtr-measures` artık verified
  manifest'e yazılacak her `measureIndex` değerinin kaynak TXT offsetlerinde
  bulunmasını zorunlu kılar. Hicazkâr incelemesinde 49 PDF vector adayı,
  28 SymbTr ölçü indeksi ve 0 doğrulanmış kutu raporlandı; bu uyumsuzluk
  nedeniyle manifest'e otomatik verified kutu yazılmadı.
- 2026-05-31 ana nav kuralı: `/references` local/admin route olarak kaldı ama
  ana header navigation'dan çıkarıldı; `scripts/validate-architecture.mjs`
  artık `references` id'sinin main nav'a geri dönmesini release kapısında
  yakalar. Browser QA ana nav metnini `Ana Sayfa | Studio | Eser Takip |
  Ritim | Arşiv | Sesler` olarak doğruladı.
- 2026-05-31 GitNexus: analiz indeksi yenilendi; `detect_changes(scope=all)`
  76 dosya, 300 değişen sembol, 127 etkilenen sembol ve `CRITICAL` risk verdi.
  Risk bu turdaki dar değişikliklerden çok mevcut geniş dirty worktree
  kapsamından geliyor; commit öncesi parça parça gözden geçirilmeli.
- 2026-05-31 ritim regresyonu: `/rhythm` üzerinde `Ritmi Çal` tıklandığında
  UI artık hemen `Dur` / `Döngü Çalıyor` durumuna geçer ve aktif darp ilerler;
  bu davranış `src/app/rhythm/__tests__/page.test.tsx` ve canlı Browser QA ile
  doğrulandı.
- 2026-05-31 güvenlik kapısı: `npm run audit:security` daha önce `ws`
  transitive moderate advisory nedeniyle kırıldı; `npm audit fix` sonrası
  `@libsql/isomorphic-ws -> ws@8.21.0` ve audit 0 vulnerability durumuna geldi.
- `npx vitest run src/data/symbtr/__tests__/layout.test.ts src/data/pieces/__tests__/hicazkarPesrev.test.ts src/app/studio/follow/__tests__/page.test.tsx`
  sonucu: 3 test dosyası, 27 test başarılı.
- `npx vitest run src/data/symbtr/__tests__/layout.test.ts src/app/studio/follow/__tests__/page.test.tsx`
  sonucu: 2 test dosyası, 19 test başarılı; verification manifest olmadan
  Hicazkâr PDF adayları 0 doğrulanmış ölçü kutusu olarak kaldı. Mock manifest
  ile Eser Takip'in aktif ölçüyü doğrulanmış PDF ölçü haritasına bağladığı
  doğrulandı.
- `npx vitest run src/data/symbtr/__tests__/layout.test.ts src/data/pieces/__tests__/hicazkarPesrev.test.ts src/app/studio/follow/__tests__/page.test.tsx src/data/symbtr/__tests__/catalog.test.ts src/data/references/__tests__/external-sources.test.ts`
  sonucu: 5 test dosyası, 39 test başarılı.
- `npx vitest run src/data/references/__tests__/external-sources.test.ts src/app/studio/follow/__tests__/page.test.tsx src/data/pieces/__tests__/hicazkarPesrev.test.ts src/data/symbtr/__tests__/catalog.test.ts`
  sonucu: 4 test dosyası, 36 test başarılı.
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`,
  `npm run audit:security` ve `git diff --check` başarılı.
- `npm run guardrails:layout` başarılı: `/`, `/archive`, `/eser-takip`,
  `/makam`, `/nota`, `/nota-editor`, `/recording`, `/rhythm`, `/samples`,
  `/sesler`, `/studio`, `/studio/follow`, `/usul` rotaları mobil ve desktop
  görünümde yatay overflow/blank/overlay kapısından geçti. Guard bozuk/stale
  Next asset döndüren local portları atlayıp sağlıklı local Muzik sunucusunu
  seçer.
- Playwright tarayıcı kontrolü `http://localhost:4002/studio/follow` üzerinde
  `PDF vektör ölçü adayları: 49 aday · 10 porte satırı · doğrulama bekliyor.`
  ve `Doğrulanmış PDF ölçü kutusu: 0` metinlerini buldu; boş manifestte
  verified harita görünmedi ve mobil viewport'ta `scrollWidth === clientWidth`.
  Playwright MCP `file://` erişimini engellediği için HTML review artifact'i
  tarayıcıda açılmadı; içerik dosya okuması ve script çıktısıyla doğrulandı.
- `npm run audit:symbtr-layout` başarılı: 3000 v3 MusicXML entry, 3000 page
  layout defaults, 0 measure coordinate, 0 print break, 0 system/measure layout;
  PDF v3 arşivinde 2999 entry bulundu.
- `npm run extract:symbtr-measures` başarılı: Hicazkâr PDF için 10 staff row,
  49 PDF vector measure candidate üretildi; `--write
  src/data/symbtr/layout.generated.json` çıktısı aynı adayları veri sözleşmesine
  yazar.
- `node scripts/extract-symbtr-pdf-measures.mjs --all --limit 5` başarılı:
  5 PDF entry, 5 candidate entry, 215 toplam aday.
- `node scripts/extract-symbtr-pdf-measures.mjs --all` başarılı: 2999 PDF
  entry istendi, 2795 parse edildi, 1805 entry'de 65299 aday bulundu, 204
  parser failure raporlandı.
- `npm run audit:symbtr-pdf-measures` başarılı: aynı özet kompakt terminal
  çıktısıyla döndü ve tam failure listesini
  `output/symbtr-layout-review/pdf-measure-extraction-summary.json` dosyasına
  yazdı.
- `npm run review:symbtr-measures` başarılı: Hicazkâr için 10 staff row ve
  49 measure candidate içeren HTML/SVG inceleme artifact'i üretildi. Aynı
  klasöre kaynak PDF kopyası da yazıldı ve `%PDF-1.4` imzası doğrulandı.
- `npm run audit:external-references` başarılı: 3000 katalog eseri, 3000 resmi
  SymbTr metadata referansı, 22 katalog eserinde 24 doğrulanmış kürasyonlu kaynak
  ve 2978 eksik kürasyon satırı raporlandı. 5 belirsiz/uyumsuz kaynak adayı
  `needs-disambiguation`/`source-mismatch` kararıyla backlog'da tutulup sıradaki manual batch'ten
  çıkarıldı; backlog CSV'si
  `output/external-reference-coverage/symbtr-curated-reference-backlog.csv`.
  Aynı komut `symbtr-curated-reference-next-batch.csv/json`, 100 satırlık ilk
  temiz kürasyon batch'i, `topMissingByForm`, `topMissingByMakam`,
  `topMissingByUsul`, karar sayıları ve arama URL'lerini de üretti.
- `npm run verify:symbtr-measures` başarılı: 1 PDF vector candidate entry, 0
  verification entry, 0 doğrulanmış ölçü kutusu ve 1 unresolved candidate entry
  raporlandı; `scoreMeasureSummaries` Hicazkâr için 49 PDF adayı, 28 SymbTr
  ölçü indeksi, maksimum ölçü indeksi 28 ve eksik SymbTr ölçü indeksi olmadığını
  gösterdi. Boş manifest adayları otomatik onaylamaz; gerçek manifest kutusu
  eklenirse `measureIndex` alanı kaynak TXT offset ölçülerinde bulunmak zorunda.
- `npx vitest run src/data/references/__tests__/external-sources.test.ts src/app/studio/follow/__tests__/page.test.tsx`
  başarılı: 2 test dosyası, 25 test. Resmi SymbTr v3 dış kaynak coverage'i
  3000/3000; kürasyonlu nota/YouTube coverage'i 22/3000 olarak ayrı doğrulandı.
- `npx vitest run src/data/references/__tests__/external-sources.test.ts`
  başarılı: 1 test dosyası, 10 test. Kürasyon karar kayıtlarının katalog id,
  duplicate, status, gerekçe ve tarih biçimi kuralları test kapsamına alındı.
- `npm run import:external-references -- --input src/data/references/external-reference-bulk-candidates.json --dry-run`
  başarılı: mevcut 7 candidate dosyası kendisine import edildiğinde 0 yeni,
  7 duplicate skip raporlandı.
- `npm run stage:external-source -- --url https://divanmakam.com/forum/toprakta-yatacak-teni-tenim-var-deyup-neylersin-dede-efendi-muhayyer.35720/ --title "Toprakta Yatacak Teni Tenim Var Deyüp Neylersin" --makam Muhayyer --form İlahi --usul Düyek --composer "Dede Efendi" --checked-at 2026-05-10 --dry-run`
  başarılı: tek URL girişini normalized inbox kaynağına çevirdi ve mevcut
  normalized URL identity nedeniyle 0 ekleme, 1 duplicate skip raporladı.
- `npm run stage:external-sources -- --input docs\EXTERNAL_SOURCE_PIPELINE.md --dry-run`
  başarılı: Markdown/TXT kaynak dosyasından 2 HTTPS URL çıkardı, dry-run
  modunda inbox'a yazmadan 2 eklenecek kaynak raporladı.
- `npx vitest run scripts/lib/__tests__/external-source-intake.test.mjs`
  başarılı: CLI flag mapping, Markdown/TXT URL extraction, CSV batch parse,
  provider inference ve duplicate identity skip kuralları test edildi.
- `npx vitest run src/app/api/external-references/__tests__/route.test.ts src/app/references/__tests__/page.test.tsx`
  başarılı: 2 dosya, 14 test; ön yüz durum görüntüleme, kaynak staging submit,
  API state read, sabit stage/map script çağrısı, bulk temp input cleanup,
  default localhost token zorunluluğu, token gate, LAN reject, explicit unsafe
  IPv6 loopback, malformed JSON 400, oversized payload ve concurrent operation
  409 yolu doğrulandı.
- `npm run curation:auto-attach`, `npm run curation:stats` ve
  `npm run curation:validate` başarılı: 3000 katalog entry, 7 auto-attached
  reference, 0 feedback event, 0 manual correction, 5 research source profile,
  0 embed state ve 5 source quality stats için registry bütünlüğü doğrulandı.
- `npx vitest run src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx scripts/lib/__tests__/source-curation-operations.test.mjs scripts/lib/__tests__/source-curation-validation.test.mjs`
  başarılı: 4 dosya, 20 test; API curation state/action sözleşmesi, temp JSON
  payload cleanup, dashboard refresh ve satır feedback akışı doğrulandı.
- `npx vitest run src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/[catalogId]/__tests__/page.test.tsx`
  başarılı: 2 dosya, 17 test; curation state enrich, manual correction fixed
  script dispatch ve parça detay manual correction submit akışı doğrulandı.
- `npx vitest run src/app/references/curation/[catalogId]/__tests__/page.test.tsx`
  başarılı: 1 dosya, 2 test; YouTube oEmbed kaynağının lazy/sandbox iframe
  preview'e dönüştüğü ve gizle kontrolünün iframe'i kaldırdığı doğrulandı.
- `npm run guardrails:layout -- --routes /references/curation/ussak--ilahi--duyek--allah_emrin--zekai_dede`
  başarılı: dinamik detay route'u mobil ve desktop viewport'ta yatay overflow
  üretmedi. İlk deneme CDP `Page.navigate` timeout ile çevresel olarak takıldı;
  tekrar çalıştırıldığında geçti.
- `npx vitest run scripts/lib/__tests__/source-curation-validation.test.mjs src/data/references/__tests__/external-sources.test.ts`
  başarılı: 2 dosya, 13 test. Yeni curation registry validator'ı ve safe
  inline preview policy assertion'ları doğrulandı.
- Playwright MCP `http://localhost:4002/references` üzerinde sayfayı açtı;
  default token zorunluluğu nedeniyle otomatik unauthenticated fetch yapılmadı,
  Ops token / Yenile kontrolü görünür kaldı, console warning/error temizdi ve
  mobil viewport kontrolünde `scrollWidth === clientWidth`.
- `npm run map:external-references` başarılı: `external-source-inbox.json`
  içindeki 8 kaynak tüm SymbTr kataloğuna karşı skorlandı; 7 accepted,
  1 needs-review, 0 rejected.
- `npm run sync:external-references` başarılı: accepted 7 kaynak mevcut bulk
  manifestte olduğu için 0 yeni yazım, 7 duplicate skip; needs-review kayıt
  manifest'e yazılmadı.
- `npm run test:run` tek başına çalıştırıldığında 29 test dosyası, 250 test
  başarılı. Paralel build ile aynı anda çalıştırılan ilk denemede Vitest
  sandbox dosya yolu eşlemesi nedeniyle dosyaları bulamadı; tek başına tekrar
  edildiğinde geçti. Son turda layout guard ile paralel koşan ilk denemede bir
  Eser Takip testi 5 saniye sınırına takıldı; tek başına tekrar edildiğinde
  geçti.
- GitNexus `detect_changes(scope=all)` sonucu mevcut geniş çalışma ağacı için
  68 dosya, 167 değişen sembol, 96 etkilenen sembol ve CRITICAL risk bildirdi.
  Bu rapor bu turdaki dar değişikliklerle birlikte önceki açık çalışma ağacı
  değişikliklerini de kapsar.

## 2026-05-10 Bagimlilik Guncelleme ve Merkezilestirme Tamamlanma Kaydı

Bu bolum aktif guncelleme/migration calismasinin takip listesidir. Amac,
paketleri guncel surumlere tasirken migration kiriklarini gidermek, ayni isi
yapan duplicate dosya ve sozlesmeleri azaltmak, kalici tanimlari tek merkezden
yonetmektir.

1. [x] NPM registry ve resmi migration dokumanlariyla guncel hedef surumleri
       dogrula.
2. [x] Next.js, React, UnoCSS Wind4, TypeScript, ESLint, i18n, VexFlow, Zustand ve
       test araclarini guncel surumlere tasiyarak `package-lock.json` dosyasini
       yenile.
3. [x] Next.js 16 migration gereksinimlerini uygula; config, lint ve route
       davranisini mevcut App Router sozlesmesiyle uyumlu tut.
4. [x] Major surum gecislerinden gelen TypeScript, ESLint, VexFlow, Zustand ve
       i18n kiriklarini gider.
5. [x] Mukkerrer veya daginik tasarim tokeni, tema, config ve UI export
       yapilarini tek kanonik merkezlere bagla; gereksiz tekrar import
       noktalarini kaldir.
6. [x] `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`
       ve `npm audit --audit-level=moderate` kapilarini yesil calistir.
7. [x] GitNexus `detect_changes` ile beklenen etki alanini kontrol et ve
       kalici riskleri belgeleyerek kapat.

Not: ESLint icin `latest` etiketi 10.3.0 olsa da Next 16'nin React lint plugin
zinciri ESLint 10 API'sinde runtime hata veriyor. Bu nedenle uyumlu ve guncel
maintenance hatti olan ESLint 9.39.4 sabitlendi.

GitNexus notu: MCP `detect_changes` transport hatasi verdigi icin CLI fallback
ile `npx gitnexus detect-changes --scope all --repo Muzik` calistirildi. Rapor
calisma agacindaki bu guncelleme oncesi genis degisiklikleri de kapsadigindan
60 dosya, 97 sembol, 33 execution flow ve CRITICAL risk gosterdi.

### Araştırma Notu

- Next.js App Router route handler'ları standart Web `Request`/`Response`
  API'leriyle yazılır; dynamic route `params` değeri async olarak beklenir.
- Styling compiler Tailwind CSS yerine UnoCSS Wind4'tür. Mevcut utility sınıf
  yüzeyi korunur; token gerçeği CSS custom property'lerdir ve yeni token
  kullanımları `bg-[var(--token)]` / `text-[var(--token)]` gibi açık utility
  biçiminde yazılmalıdır.
- Drizzle SQLite timestamp alanlarında `integer(..., { mode: "timestamp" })`
  Date değeriyle kullanılabilir; default timestamp için SQL default ya da insert
  sırasında Date yazımı gerekir.

### Sıralı Yapılacaklar

1. [x] Tasarım tokenlarını tek gerçek değişken setine bağla; tanımsız
       `--color-primary`, `--color-surface`, `--color-border` gibi alias'ları
       düzelt ve literal `var(--token)` sınıflarını gerçek utility
       sınıflarına çevir.
2. [x] Sanal piyano için tek aktif implementation bırak; `/studio` sayfasını
       test edilen canonical component'e bağla, mobil taşma/kırpılma ve siyah
       tuş çakışmasını düzelt, kullanılmayan duplicate UI dosyalarını kaldır.
3. [x] `/api/samples` upload akışını merkezi upload policy'ye bağla; dosya
       uzantısı ve boyutu route içinde doğrulansın.
4. [x] `/api/scores` ve `/api/scores/[id]` payload doğrulamasını sertleştir;
       `userId` body'den kabul edilmesin, `notesData` gerçekten nota olayı
       dizisi olsun, create/update timestamp'leri yazılsın.
5. [x] Yukarıdaki açıkları kapsayan regresyon testlerini ekle veya güncelle.
6. [x] `npm run guardrails:architecture`, `npm run lint`, `npm run typecheck`,
       `npm run test:run`, `npm run build` ve `npm run audit:security`
       kapılarını yeşil çalıştır.

### Bilerek Kapsam Dışı Bırakılanlar

- Verovio, MusicXML import, OCR, tomato ve remote ensemble aktif kodda yoktur;
  bu sprintte muadil veya tamamlandı iddiası yazılmayacaktır.
- Eksik Ney sample dosyaları upload slotu olarak görünür; gerçek ses dosyası
  olmadığı için "hazır sample" sayılmaz.

## 2026-05-10 Sample ve Test Denetimi Tamamlanma Kaydı

### Kanıt

- Sample manifesti 450 slot üretir: 396 melodik WAV, 54 vurmalı WAV.
- `public/samples` altında 424 beklenen WAV vardır; beklenmeyen WAV fazlası
  yoktur.
- Eksik 26 slotun tamamı `ney/` altındadır:
  `A3`, `A4`, `A5`, `As3`, `As5`, `B4`, `B5`, `C3`, `C4`, `Cs3`, `Cs5`,
  `D5`, `Ds3`, `Ds5`, `E3`, `E5`, `F3`, `F4`, `F5`, `Fs3`, `G3`, `G4`,
  `G5`, `Gs3`, `Gs4`, `Gs5`.
- Mevcut WAV dosyalarının tamamı boş olmayan RIFF/WAVE dosyasıdır.
- `all-samples/27726__bliind__ney-flute-sound-samples` gerçek Ney kaynakları
  içerir, ancak dosyalar nota adıyla etiketli değildir; kör kopyalama veya
  muadil/pitch-shift üretim yapılmayacaktır.
- İki exact-content hash çakışması gözlendi: `davul/ke-accent.wav` ile
  `def/ke.wav`, ayrıca `nakkare/ke-accent.wav` ile `nakkare/tek-accent.wav`.
  Bunlar beklenen slot dosyalarıdır; fazlalık olmadıkları için silinmedi.

### Sıralı Yapılacaklar

1. [x] Sample manifestini gerçek dosya sistemiyle karşılaştır; eksik ve fazla
       dosyaları dosya adı düzeyinde kanıtla.
2. [x] Beklenen slot dışı WAV fazlasını sil. Sonuç: silinecek beklenmeyen WAV
       yok.
3. [x] Artık gereksiz `.gitkeep` placeholder dosyalarını kaldır; `README.md`
       sample sözleşmesi olduğu için kalsın.
4. [x] Sample envanter testini ekle; beklenmeyen WAV, placeholder, boş/geçersiz
       WAV ve Ney dışına taşan eksik slotları yakalasın.
5. [x] Testlerin gerçek davranışı kontrol edip etmediğini analiz et; yeni
       testler API upload policy, skor payload doğrulama, piyano konumu ve
       sample envanteri için doğrudan assertion içerir.
6. [x] Eksik Ney dosyalarını muadil üretimle tamamlamama kararını belgeleyerek
       aktif TODO kapsamını kapat.

## 🏛 MİMARİ KURAL SETLERİ (RULE SETS)

### 1. Dosya ve Klasör Hiyerarşisi Kuralları (Decoupling)
*   **Kural 1.1:** Hiçbir dosya ("God File" anti-pattern) çok fazla sorumluluğu üstlenemez. (Örn: `instruments.ts` gibi 1200 satırlık devasa dosyalar derhal klasörlere parçalanmalıdır).
*   **Kural 1.2:** Tüm motorlar (engines) `core` (çekirdek), `data` (veriler) ve `api/methods` (dışa açık fonksiyonlar) olarak kendi içlerinde ayrışmalıdır.
*   **Kural 1.3:** İstemci tarafında çalışan UI bileşenleri (Components), iş mantığını (Business Logic) kendi içinde barındıramaz. Ses çalma/zamanlama kodları Custom Hook'lara veya store'lara taşınmalıdır.

### 2. Durum Yönetimi (State Management) Kuralları
*   **Kural 2.1:** Global ve birden fazla bileşenin ihtiyaç duyduğu state'ler (Çalma durumu, aktif notalar, seçili makam/usul) için `Zustand` kullanılacaktır.
*   **Kural 2.2:** Sadece tek bir UI bileşenini ilgilendiren basit geçişler (aç/kapa vb.) için `useState` kullanılabilir.

### 3. Veri Temsili (Data Representation) Kuralları
*   **Kural 3.1:** Türk müziği Batı müziği (MIDI) normlarıyla kısıtlanamaz. Projenin merkezindeki veri birimi **SymbTr** notasyonu/koma değerleri olmalıdır. Batı MIDI standartları sadece bir fallback (yedek) veya export seçeneği olarak tutulacaktır.

### 4. Ses (Web Audio) Yönetimi Kuralları
*   **Kural 4.1:** Tüm `AudioContext` işlemleri tek bir Singleton (tekil) merkezden (`AudioContextManager`) yönetilecektir.
*   **Kural 4.2:** Çalınan her yeni osilatör (Oscillator) veya ses dosyası (BufferSource) mutlaka çöp toplayıcıya (Garbage Collector / `activeOscillators` set) kaydedilecek ve çalma bitince bellekten atılacaktır.

---

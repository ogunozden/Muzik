# UX/UI, Nota, Usul ve SymbTr Tamamlanma Denetimi

Tarih: 2026-05-10

Bu denetim, kullanıcının proje geneli isteğini tamamlandı saymak için gereken
kanıtları ve kalan boşlukları izler. Testlerin geçmesi tek başına tamamlanma
kanıtı değildir; her madde gerçek artifact veya doğrulanmış davranışla
eşleştirilmelidir.

## Başarı Kriterleri

1. Sayfalar amaçlarına göre sadeleşmiş, yığılma azaltılmış ve ortak UX/UI
   kurallarına bağlanmış olmalı.
2. Nota isimleri merkezi kuralla Do/Re/Mi, diyez, bemol ve Es gösterimine
   bağlanmalı; ham MIDI/SymbTr değerleri bozulmamalı.
3. Eser Takip görsel nota, sembolik olay, usul ve kaynak bağlamını tek takip
   deneyiminde göstermeli; ayrı ve anlamsız usul bloğu olmamalı.
4. Parça ekleme TXT URL gerektirmeden PNG/JPG/WebP/GIF görsellerle çalışmalı
   ve mükerrer eklemeyi engellemeli.
5. Usul sesleri gerçek beat değerleriyle zamanlanmalı; `te-ke` çift ses veya
   indeks kayması üretmemeli.
6. Ritim sayfası aktif darp, devir ve döngü takibini anlamlı şekilde vermeli.
7. SymbTr klasöründeki yerel kaynaklar projeye kanonik, mükerrersiz ve
   formatları açık şekilde bağlanmalı.
8. Harici nota/kayıt kaynakları telif ve güvenlik riski yaratmadan, doğrulama
   ve dedupe sözleşmesiyle yönetilmeli.
9. PDF/MusicXML veya SymbTr verisinden görsel ölçü/satır hizalama açıkça
   modellenmeli; hangi kısım tahmini, hangi kısım doğrulanmış olmalı.

## Prompt Maddesi - Artifact Eşlemesi

| Kullanıcı isteği | Kanıt | Durum |
| --- | --- | --- |
| Sayfalar yığılmış; amaçlarına göre düzenle | `PROJECT_PLAN.md` madde 9 ve 24; Playwright kontrolleri; `UnifiedLayout`, `/studio`, `/rhythm`, `/studio/follow`, `/samples`, `/archive` düzenlemeleri; `npm run guardrails:layout` | Tamamlandı route layout/overflow kapsamı için. Piksel bazlı screenshot baseline yok; mevcut kalıcı kapı blank/overlay/yatay overflow yakalar. |
| Nota isimleri Do/Re/Mi, semboller net | `src/core/domain/note-naming.ts`; `VirtualPiano`, `PianoRollViewer`, sample labels ve Eser Takip testleri | Tamamlandı. |
| Merkezi ve bütüncül naming/mapping kuralı | `docs/NAMING_CONVENTIONS.md`; SymbTr catalog id; external reference policy; `scripts/lib/external-source-matcher.mjs`; `scripts/lib/external-reference-audit.mjs` | Tamamlandı. Harici kaynak matcher'ı ve coverage audit/reporting mantığı merkezi modüllere alındı; source profile/event log sınırlarını daha da inceltme işi açık takip maddesi olarak kalıyor. |
| Eser Takip derin düzenleme | `src/app/studio/follow/page.tsx`; görsel sayfa, aktif satır, takip noktası, aktif ölçü, yakın notalar, tek takip bağlamı; `scripts/extract-symbtr-pdf-measures.mjs`; `src/data/symbtr/layout.ts` | Büyük ölçüde tamamlandı. PDF vector ölçü adayları UI'da aday/doğrulama bekliyor olarak görünüyor; kesin ölçü kutusu olarak çizilmiyor. Manifest onaylı kutular için ayrı verified PDF ölçü haritası yolu eklendi. |
| TXT bağlantısı yerine görsel ekleme | `Nota görselleri` input'u; `createDefaultVisualMap`; duplicate signature; Eser Takip testleri | Tamamlandı. |
| Usul sesleri ve `te-ke` düzgün olmalı | `buildRhythmSchedule`, `playRhythmWithPercussion`, `rhythm-schedule.test.ts`; Devr-i Kebir darb pattern testleri | Tamamlandı. |
| Ritim sayfası anlamlı olmalı | `/rhythm` aktif darp/döngü paneli; `UsulPanel` sadeleşmesi; test ve Playwright kontrolü | Tamamlandı, ancak ileri seviye alıştırma/puanlama kapsam dışı. |
| Diğer sayfaları bu perspektifle incele | Plan ve Playwright kontrolü; `npm run guardrails:layout` ile `/`, `/archive`, `/eser-takip`, `/makam`, `/nota`, `/nota-editor`, `/recording`, `/rhythm`, `/samples`, `/sesler`, `/studio`, `/studio/follow`, `/usul` | Tamamlandı route layout/overflow kapsamı için. |
| İnternet/YouTube/notalar/GitHub araştır | `PROJECT_PLAN.md` araştırma notları; MTG/SymbTr, Zenodo, TDV, MusicXML, YouTube oEmbed metadata; `getOfficialSymbTrV3ExternalReferences`; `npm run audit:external-references`; `src/data/references/external-curation-decisions.json`; `/references`; `/api/external-references`; `/references/curation`; `npm run stage:external-source`; `npm run stage:external-sources`; `npm run map:external-references`; `npm run sync:external-references` | Tamamlandı resmi SymbTr dataset/GitHub kapsamı için; otomatik medya indirme yapılmadı. Kürasyonlu YouTube/harici nota coverage'i ayrı açık; 2978 eksik satır backlog CSV/JSON artifact'lerinde, 5 belirsiz/uyumsuz aday karar kaydıyla backlog'da tutulup sıradaki manual batch'ten çıkarılıyor. `/references/curation` artık tam backlog JSON queue üstünde server-side sayfalama, facet filtreleri ve 100/250/500 batch gezinmesiyle operatör yüzeyi sağlar. Yeni bulunan tek URL veya JSON/CSV/Markdown/TXT kaynak dosyası ön yüzde `/references` ekranından veya stage komutuyla inbox'a alınır, sonra tüm katalogla otomatik eşlenir; yüksek güvenli 7 örnek accepted, Düşeli usul çelişkisi needs-review olarak ayrıldı. |
| Symb klasöründen alabildiğini al, mükerrer olmasın | `src/data/symbtr/catalog.generated.json` 3000 entry; `getSymbTrEntrySourceReferences`; catalog tests | Tamamlandı yerel arşiv için. |
| Evrensel dosyalandırma/isimlendirme | `docs/NAMING_CONVENTIONS.md`; SymbTr id düzeni; external id policy | Tamamlandı. |
| Tüm proje perspektifi | Merkezi note naming, catalog, official external references, curated external source policy, curation decision backlog, curation event integrity, curation dashboard backlog filters, sample/upload policy, shared tokens, route layout guard, PDF candidate layout contract | Kısmen tamamlandı. Route overflow ve resmi SymbTr dış kaynak kapısı var; PDF adayları açıkça ayrılıyor; doğrulanmış ölçü kutusu UI yolu hazır ama gerçek manifest 0 kutu; tüm katalog için kürasyonlu nota/YouTube coverage açık, batchlenebilir ve belirsiz adaylar tekrar eden iş üretmeyecek şekilde karar kaydına alınır. `/references/curation` durum/provider/makam/usul/form/priority filtreleriyle auto-attached satırları ve 2978 eksik backlog queue'sunu sayfalı batch halinde yönetilebilir hale getirir. Feedback/manual/embed state kayıtları auto-attached referansa bağlı olmak zorunda. |
| PDF/MusicXML ölçü kutusu gerçekliği | `npm run audit:symbtr-layout`; 3000 MusicXML dosyası tarandı; `npm run extract:symbtr-measures`; `npm run audit:symbtr-pdf-measures`; `npm run review:symbtr-measures`; `npm run verify:symbtr-measures`; `src/data/symbtr/layout.generated.json`; `src/data/symbtr/layout-verification.generated.json`; Eser Takip aday paneli ve verified harita yolu | Kısmen tamamlandı. MusicXML tarafında ölçü koordinatı yok; PDF vector extractor Hicazkâr için 10 staff row ve 49 ölçü adayı çıkarıyor, batch modda 2999 PDF'den 2795'ini parse edip 1805 entry'de 65299 aday buluyor. `output/symbtr-layout-review/pdf-measure-extraction-summary.json` tam coverage/failure artifact'idir. Boş verification manifest adayların otomatik doğrulanmasını engelliyor; doğrulama komutu ileride eklenecek verified kutuların stale/out-of-bounds olmasını kıracak. Eser Takip, manifest onaylı kutuları `measureIndex` ile aktif ölçüye bağlayan verified PDF ölçü haritasını destekler. |
| Kendi repo dışında silme yok | İşlemler `C:\Users\ogunozden\Desktop\Muzik` içinde kaldı; geçici Playwright screenshot kaldırıldı | Tamamlandı. |

## Komut ve Test Kanıtı

Son doğrulama kayıtları `PROJECT_PLAN.md` içinde tutuluyor:

- `npm run typecheck` geçti.
- `npm run lint` geçti.
- `npm run test:run` geçti: 29 test dosyası, 250 test. Layout guard ile
  paralel koşan ilk denemede bir Eser Takip testi 5 saniye sınırında timeout
  aldı; tek başına tekrar çalıştırıldığında geçti.
- `npm run guardrails:layout` geçti: 13 static route, 2 viewport; blank
  main, framework overlay ve yatay overflow yok.
- Playwright tarayıcı kontrolü `http://localhost:4002/studio/follow` üzerinde
  PDF aday panelini ve `0` doğrulanmış kutu durumunu buldu; boş manifestte
  verified harita görünmedi ve mobil viewport yatay overflow üretmedi.
- `npm run audit:symbtr-layout` geçti: 3000 v3 MusicXML entry, 3000 page
  layout defaults, 0 measure coordinate, 0 print break, 0 system/measure layout;
  PDF v3 arşivinde 2999 entry.
- `npm run extract:symbtr-measures` geçti: Hicazkâr PDF için 10 staff row ve
  49 `pdf-vector-candidate` ölçü adayı. `--write
  src/data/symbtr/layout.generated.json` çıktısı adayları kanonik veri
  sözleşmesine yazar.
- `node scripts/extract-symbtr-pdf-measures.mjs --all` geçti: 2999 PDF entry
  istendi, 2795 parse edildi, 1805 entry'de 65299 aday bulundu, 204 parser
  failure raporlandı. Bu sonuç app bundle'a otomatik verified veri eklemez.
- `npm run audit:symbtr-pdf-measures` geçti: aynı tam arşiv coverage özetini
  kompakt terminal çıktısı olarak verdi ve tam failure listesini
  `output/symbtr-layout-review/pdf-measure-extraction-summary.json` içine yazdı.
- `npm run review:symbtr-measures` geçti: Hicazkâr için HTML/SVG overlay
  artifact'i ve kaynak PDF kopyası üretildi; PDF `%PDF-1.4` imzasıyla
  doğrulandı. Bu çıktı doğrulama incelemesi içindir, otomatik onay değildir.
- `npm run audit:external-references` geçti: 3000 katalog eseri için resmi
  SymbTr metadata coverage'i 3000/3000, doğrulanmış kürasyonlu nota/YouTube
  coverage'i 22/3000; eksik 2978 satır CSV backlog olarak üretildi. Aynı çıktı
  5 `needs-disambiguation`/`source-mismatch` karar kaydını backlog'da tutup sıradaki manual
  batch'ten çıkarır. İlk 100 temiz öncelikli kayıt
  `symbtr-curated-reference-next-batch.csv/json`, form/makam/usul eksik
  kırılımları ve güvenli arama URL'leri içerir.
- `npm run stage:external-source -- --url ... --dry-run` geçti: tek URL
  girişini normalized inbox kaynağına çevirdi, mevcut normalized URL identity
  için 0 ekleme ve 1 duplicate skip raporladı.
- `npm run stage:external-sources -- --input docs\EXTERNAL_SOURCE_PIPELINE.md --dry-run`
  geçti: Markdown/TXT kaynak dosyasından 2 HTTPS URL çıkardı ve dry-run modunda
  inbox'a yazmadan 2 eklenecek kaynak raporladı.
- `npx vitest run scripts/lib/__tests__/external-source-intake.test.mjs`
  geçti: 1 dosya, 5 test; CLI flag mapping, Markdown/TXT URL extraction,
  CSV batch parse, provider inference ve duplicate skip kuralları doğrulandı.
- `npx vitest run src/app/api/external-references/__tests__/route.test.ts src/app/references/__tests__/page.test.tsx`
  geçti: 2 dosya, 14 test; ön yüzde kaynak operasyon durumu, staging submit,
  API state read, sabit script çağrıları, bulk temp input cleanup, default
  localhost token zorunluluğu, token gate, LAN reject, explicit unsafe IPv6
  loopback, malformed JSON 400, oversized payload ve concurrent operation 409
  yolu doğrulandı.
- Playwright MCP `/references` ekranında gerçek dev server üzerinden default
  token zorunluluğu altında otomatik unauthenticated fetch yapılmadığını, Ops
  token / Yenile kontrolünün görünür kaldığını ve console warning/error
  oluşmadığını doğruladı. Mobil viewport'ta yatay overflow yok.
- `npm run map:external-references` geçti: 8 inbox kaynağı 3000 SymbTr
  katalog kaydına karşı skorlandı; 7 accepted, 1 needs-review, 0 rejected.
- `npx vitest run scripts/lib/__tests__/external-source-matcher.test.mjs scripts/lib/__tests__/external-source-intake.test.mjs scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs`
  geçti: 4 dosya, 14 test. Matcher modülü Türkçe normalizasyonu, metadata
  çelişkisini, URL'den `provider: "auto"` inference'ını ve açıklanabilir skor
  nedenlerini kapsar.
- `npx vitest run scripts/lib/__tests__/external-reference-audit.test.mjs scripts/lib/__tests__/external-source-matcher.test.mjs scripts/lib/__tests__/external-source-intake.test.mjs`
  geçti: 3 dosya, 14 test. Coverage audit modülü deferred kararları next
  batch'ten çıkarma, accepted bulk candidate'ları curated sayma, YouTube
  duplicate URL identity ve deterministic artifact yazımını kapsar.
- `npx vitest run scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/[catalogId]/__tests__/page.test.tsx src/app/references/curation/__tests__/page.test.tsx`
  geçti: 5 dosya, 25 test. Feedback event, manual correction ve embed state
  payload'ları gerçek auto-attached referansa bağlı değilse reddedilir.
- `npm run sync:external-references` geçti: accepted 7 kaynak mevcut bulk
  manifestte duplicate olduğu için 0 yeni yazım, 7 skip; needs-review kayıt
  ürün manifestine yazılmadı.
- `npm run verify:symbtr-measures` geçti: 1 PDF vector candidate entry, 0
  verification entry, 0 doğrulanmış ölçü kutusu ve 1 unresolved candidate entry;
  boş manifest adayları otomatik onaylamıyor. 2026-06-01 sertleştirmesiyle
  gerçek manifest kutuları için `measureIndex` yalnızca kaynak SymbTr TXT
  offsetlerinde bulunan ölçülere atanabilir. Hicazkâr özeti 49 PDF vector adayı,
  28 SymbTr ölçü indeksi, maksimum ölçü indeksi 28 ve eksik SymbTr ölçü indeksi
  olmadığını gösterdi; bu uyumsuzluk nedeniyle otomatik verified kutu yazılmadı.
- `npx vitest run src/data/symbtr/__tests__/layout.test.ts src/data/pieces/__tests__/hicazkarPesrev.test.ts src/app/studio/follow/__tests__/page.test.tsx`
  geçti: 3 dosya, 27 test; PDF aday layout sözleşmesi ve Eser Takip aday
  görünümü doğrulandı.
- `npx vitest run src/data/symbtr/__tests__/layout.test.ts src/app/studio/follow/__tests__/page.test.tsx`
  geçti: 2 dosya, 19 test; verification manifest olmadan Hicazkâr adayları
  0 doğrulanmış ölçü kutusu olarak raporlandı, mock manifest ile Eser Takip'in
  verified PDF ölçü haritasını aktif ölçüye bağladığı doğrulandı.
- `npx vitest run src/data/symbtr/__tests__/layout.test.ts src/data/pieces/__tests__/hicazkarPesrev.test.ts src/app/studio/follow/__tests__/page.test.tsx src/data/symbtr/__tests__/catalog.test.ts src/data/references/__tests__/external-sources.test.ts`
  geçti: 5 dosya, 39 test.
- `npx vitest run src/data/references/__tests__/external-sources.test.ts src/app/studio/follow/__tests__/page.test.tsx`
  geçti: 2 dosya, 25 test; resmi SymbTr v3 dış kaynak coverage'i 3000/3000,
  kürasyonlu nota/YouTube coverage'i 22/3000 olarak ayrı doğrulandı.
- `npx vitest run src/data/references/__tests__/external-sources.test.ts`
  geçti: 1 dosya, 10 test; kürasyon karar kayıtlarının katalog id, duplicate,
  status, gerekçe ve tarih biçimi kuralları doğrulandı.
- `npm run curation:auto-attach` geçti: son mapping çıktısından yalnız 7
  `accepted` kaynak auto-attached manifestine yazıldı; `needs-review` Düşeli
  usul çelişkisi auto-attached veriden prunelandı.
- `npm run curation:stats` geçti: 4 kaynak profili için kabul, kaldırma,
  mismatch ve embed sayaçları üretildi.
- `npm run curation:validate` geçti: 3000 katalog kaydı, 7 auto-attached
  referans, 0 feedback event, 0 manuel düzeltme, 3 araştırma profili, 0 embed
  state ve 4 kalite stat kaydı doğrulandı.
- `npx vitest run src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx scripts/lib/__tests__/source-curation-operations.test.mjs scripts/lib/__tests__/source-curation-validation.test.mjs`
  geçti: 4 dosya, 20 test; API curation state/action sözleşmesi, temp JSON
  payload cleanup, dashboard refresh ve satır feedback akışı doğrulandı.
- 2026-06-01 backlog UI wave:
  `node .\node_modules\vitest\vitest.mjs run src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 2 dosya, 17 test; API auto-attached kayıtları katalog metadata'sı ve
  `symbtr-curated-reference-next-batch` satırlarıyla döndürür, dashboard
  durum/provider/makam/usul/form filtrelerini, backlog linklerini ve satır
  feedback payload'ını doğrular. `node scripts/validate-source-curation.mjs`
  ve `node scripts/audit-external-reference-coverage.mjs` geçti; audit sonucu
  3000 katalog, 22 curated reference, 2978 açık backlog olarak kaldı.
- 2026-06-01 batch backlog pagination wave:
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/external-reference-audit.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 3 dosya, 22 test. `npm run typecheck`, `npm run lint`,
  `npm run audit:external-references` ve `node scripts/validate-source-curation.mjs`
  temiz geçti. Audit tam backlog'u
  `output/external-reference-coverage/symbtr-curated-reference-backlog.json`
  olarak üretir; gerçek artifact 3000 satır, 2978 missing ve 5 deferred satır
  içerir. API/UI artık queue'yu 100 satırlık next-batch dosyasıyla sınırlamaz.
- 2026-06-01 curation queue security scan:
  Codex Security diff scan raporu
  `output/security-scans/curation-queue-pagination-20260601/report.md` ve
  `report.html` olarak üretildi; validator geçti ve reportable finding yok.
  `npm run audit:security` 0 vulnerability döndürdü. Bu rapor curation queue
  pagination diff'i içindir; repo genelindeki geniş dirty worktree ayrı scan
  kapsamı gerektirir.
- 2026-06-01 bulk feedback wave:
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-operations.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 3 dosya, 26 test; `npm run typecheck` temiz. Dashboard artık
  auto-attached satırları seçip toplu onaylama, öne alma ve kaldırma aksiyonunu
  `curation-feedback-batch` ile tek manifest validation geçişine bağlar.
- 2026-06-01 bulk feedback production QA:
  ops-token'lı API smoke 250 satırlık backlog sayfasında 2978 filtreli/eksik,
  2973 aktif ve 5 deferred satırı doğruladı; accepted mapping 7, auto-attached
  7, conflict 0 ve source profile 4. Browser QA `/references/curation` içinde
  gerçek veri değiştirmeden bir auto-attached satır seçti; bulk butonlar seçim
  öncesi disabled, seçim sonrası enabled oldu, `1 seçili` metni göründü,
  console warning/error yoktu ve yatay overflow yoktu. Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-bulk-selection-qa.png`.
  `node scripts/validate-route-layout.mjs --base-url http://localhost:4012 --routes /references/curation`
  mobile+desktop geçti.
- 2026-06-01 candidate manifest import/export wave:
  `node node_modules/vitest/vitest.mjs run scripts/__tests__/import-external-reference-candidates.test.mjs scripts/lib/__tests__/external-reference-audit.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 4 dosya, 30 test; `npm run typecheck` temiz. `/references/curation`
  artık aday manifest JSON alanı, dry-run toggle'ı, dışa/içe aktar butonları ve
  accepted/needs-review/rejected/conflict özetini gösterir. API import yolu temp
  JSON dosyasını cleanup eder ve malformed JSON'u script çalışmadan reddeder.
- 2026-06-01 provider-profile candidate review queue wave:
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/external-reference-audit.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 3 dosya, 29 test; `npm run typecheck` temiz. `audit:external-references`
  merkezi `research-source-profiles.json` üzerinden 11912 review-only search
  candidate satırı üretir; 11908 `needs-review`, 4 `conflict`, profil başına
  2978 satır. Dashboard manifest paneli queue sayısını ve JSON artifact yolunu
  gösterir.
- 2026-06-01 candidate review queue Browser QA:
  Prod server yeni build ile çalıştı. API smoke 11912 review queue satırı ve
  candidate review queue JSON artifact yolunu döndürdü. Browser QA dashboard
  panelinde `11.912 queue`, artifact path, 7 accepted özeti ve 2978 filtreli
  backlog bilgisini doğruladı; console warning/error yoktu ve yatay overflow
  yoktu. Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-candidate-review-queue-panel-qa.png`.
- 2026-06-01 candidate review queue pagination QA:
  `GET /api/external-references?candidateLimit=100&candidateOffset=100&candidateProfile=youtube&candidateStatus=needs-review`
  100 satır, 2977 filtreli YouTube needs-review, toplam 11912 queue ve
  `next=200` döndürdü. Browser QA `/references/curation` üzerinde `Aday
  review queue` tablosunu, `100 gösteriliyor · 11.912 filtreli · 11.912
  toplam` metnini, `Aday sonraki` sonrası `Aday önceki` kontrolünü ve `Aday ara`
  linklerini doğruladı; console warning/error yoktu ve yatay overflow yoktu.
  Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-candidate-review-table-qa.png`.
- 2026-06-01 candidate review queue security scan:
  `output/security-scans/candidate-review-queue-20260601/report.md`
  validator'dan geçti ve `report.html` üretildi; reportable finding yok. Kapsam
  provider-profile queue generation, API pagination/filtering ve dashboard tablo
  diff'iyle sınırlıdır.
- 2026-06-01 candidate review queue validation hardening:
  `scripts/lib/source-curation-validation.mjs` artık review queue artifact'ini
  de doğrular. `accepted` statü, source id/source URL taşıyan review adayı,
  profile/provider/trust drift'i, confidence sınır dışı değeri ve `summary.json`
  status/profile/count uyuşmazlığı `npm run curation:validate` kapısını kırar.
  `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-validation.test.mjs`
  1 dosya / 6 test geçti; `npm run curation:validate` 11912 candidate review
  queue satırını 0 hata ile doğruladı.
- 2026-06-01 filtered candidate review queue export:
  `/api/external-references` `candidate-review-export` action'ı sabit review
  queue artifact'inden filtreli JSON manifest döndürür; shell çalıştırmaz ve
  path almaz. `/references/curation` `Queue dışa aktar` butonu aktif aday durum,
  profil ve metin filtrelerini export payload'ına taşır; sonuç ayrı readonly
  `Filtreli review queue JSON` alanına yazılır. Hedefli route/dashboard testleri
  2 dosya / 25 testle geçti.
- 2026-06-01 filtered candidate review queue export Browser QA:
  Production server 4012 yeni build ile yeniden başlatıldı. API smoke
  `candidate-review-export` için `status=conflict` ve `profileId=youtube`
  filtresinde 1 satır / toplam 11912 döndürdü. Browser QA `Queue dışa aktar`
  sonrası readonly JSON alanında `candidate-review-queue-export`,
  `profileId: youtube` ve yalnız review statülerini doğruladı; `accepted`
  statüsü yoktu, console warning/error yoktu ve yatay overflow yoktu. Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-candidate-review-export-final-qa.png`.
- 2026-06-01 candidate manifest Browser QA:
  Prod server yeni build ile `http://localhost:4012` üzerinde çalıştı. API smoke
  7 candidate / 7 accepted / 0 conflict ve 2978 backlog sonucunu döndürdü.
  Browser QA manifest panelini, path'i, dry-run toggle'ını ve export aksiyonunu
  doğruladı; JSON textarea'ya doldu, import butonuna basılmadı, console
  warning/error yoktu ve yatay overflow yoktu. Screenshot:
  `C:/Users/OGUNOZ~1/AppData/Local/Temp/muzik-curation-manifest-export-qa.png`.
- 2026-06-01 candidate manifest security scan:
  `output/security-scans/candidate-manifest-import-export-20260601/report.md`
  validator'dan geçti ve `report.html` üretildi; reportable finding yok. Kapsam
  candidate import/export diff'iyle sınırlıdır.
- 2026-06-01 production Browser QA:
  `node scripts/validate-route-layout.mjs --base-url http://localhost:4012`
  geçti: 15 route x 2 viewport. Browser QA `/references/curation` sayfasında
  ops token refresh, `AUTO 7`, `CONFLICT 0`, `Makam=Ussak`,
  `Dostun Senden` araması, backlog next-batch tablosu, DuckDuckGo/YouTube link
  varlığı, console warning/error yokluğu ve yatay overflow yokluğunu doğruladı.
  Screenshot:
  `C:/Users/ogunozden/AppData/Local/Temp/muzik-curation-pruned-qa.png`.
- `npx vitest run src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/[catalogId]/__tests__/page.test.tsx`
  geçti: 2 dosya, 17 test; auto-attached kayıtların source/manual correction
  verisiyle enrich edilmesi, fixed script manual correction dispatch ve detay
  form submit akışı doğrulandı.
- `npx vitest run src/app/references/curation/[catalogId]/__tests__/page.test.tsx`
  geçti: 1 dosya, 2 test; YouTube oEmbed kaynağının sandbox/lazy iframe
  preview'e dönüştüğü ve gizle kontrolünün preview iframe'ini kaldırdığı
  doğrulandı.
- `npm run test:run` geçti: 33 test dosyası, 262 test.
- `npm run build` geçti; `/references/curation/[catalogId]` dynamic route olarak
  üretildi. Güncel 2026-06-01 tekrar koşusunda Next static Cache-Control
  uyarısı, Tailwind kaynaklı DEP0205 uyarısı ve Turbopack trace panic log'u yok.
- `npm run guardrails:layout -- --routes /references/curation/ussak--ilahi--duyek--allah_emrin--zekai_dede`
  geçti: dinamik parça detay route'u mobil ve desktop viewport'ta blank main,
  overlay ve yatay overflow üretmedi. İlk denemede CDP navigation timeout oldu,
  tekrar denemede geçti.
- `npm run build` geçti; Next static Cache-Control uyarısı kapandı ve
  Tailwind derleyici kaldırıldığı için Node DEP0205 uyarısı kalmadı.
- `npm run audit:security` geçti: 0 vulnerability.
- 2026-05-31 ek wave: `npx vitest run src/data/references/__tests__/external-sources.test.ts scripts/lib/__tests__/next-config-security.test.mjs scripts/lib/__tests__/external-source-intake.test.mjs`
  geçti: 3 dosya, 17 test. External reference policy artık
  `external-reference-policy.json` manifestinden okunur; Next CSP `frame-src`,
  metadata fetch timeout/size/content-type limitleri ve app policy aynı merkezi
  kaynağa bağlıdır.
- 2026-05-31 ek wave: `/rhythm` canlı Browser QA'da `Ritmi Çal` sonrası
  `Dur`, `Döngü Çalıyor` ve aktif darp ilerlemesi görüldü; yeni regresyon testi
  bu davranışı jsdom tarafında da kapsar.
- 2026-05-31 ek wave: `npm audit fix` sonrası moderate `ws` advisory kapandı;
  `npm run audit:security` 0 vulnerability sonucuna döndü.
- 2026-05-31 ek wave: `npm run test:run` geçti: 37 dosya, 276 test.
  `npm run guardrails:layout` geçti: 15 route, mobil ve desktop viewport.
  Browser QA `/studio/follow` playback ve `/rhythm` mid-cycle ritim takibini
  console error/warning olmadan doğruladı.
- 2026-05-31 ek wave: `scripts/map-external-source-inbox.mjs` matcher mantığını
  `scripts/lib/external-source-matcher.mjs` üzerinden kullanır; aynı 8 inbox
  kaynağı 7 accepted, 1 needs-review, 0 rejected sonucunu korur.
- 2026-05-31 ek wave: `scripts/audit-external-reference-coverage.mjs` coverage
  audit ve reporting mantığını `scripts/lib/external-reference-audit.mjs`
  üzerinden kullanır; `npm run audit:external-references` 3000 resmi metadata,
  22 curated, 2978 açık backlog, 5 deferred missing ve 7 accepted bulk candidate
  sonucunu korur.
- 2026-05-31 ek wave: `scripts/lib/source-curation-validation.mjs` orphan
  feedback/manual/embed state kayıtlarını reddeder; `npm run curation:validate`
  mevcut registry'lerde 7 auto-attached ve 0 orphan action kaydıyla geçti.
- 2026-06-01 ek wave: `scripts/lib/source-curation-operations.mjs`
  `needs-review` mapping'leri auto-attached manifestine almaz ve stale
  auto-attached conflict kayıtlarını prunelar. `node .\node_modules\vitest\vitest.mjs run scripts/lib/__tests__/source-curation-operations.test.mjs scripts/lib/__tests__/source-curation-validation.test.mjs`
  geçti: 2 dosya, 7 test. Auto-attach write 7 accepted kayıt ve 1 pruned
  conflict raporladı; stats write sonrası `mismatchCount` 0.
- 2026-06-01 ek wave: OGM Materyal kaynak profili eklendi; site kalite
  istatistiği artık iki accepted OGM kaynağını `external` kovasına değil
  `ogm-materyal` profiline yazar. API state kanıtı:
  `auto=7`, `conflict=0`, `profiles=4`,
  `divanmakam:5:0,ogm-materyal:2:0,salihbora:0:0,youtube:0:0`.
- 2026-06-01 ek wave: source quality stats validator'ı merkezi source profile
  manifest'iyle hizalandı. Bilinmeyen stat profilleri reddedilir; stamped stats
  artefact'inde her araştırma profili için satır aranır. `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs`
  geçti: 2 dosya, 8 test. `node scripts/validate-source-curation.mjs` 3000
  katalog, 7 auto-attached, 4 profil ve 4 stats ile temiz geçti.
- 2026-06-01 ek wave: auto-attached kaynaklar `profileId` alanıyla merkezi
  source profile'a bağlandı. Profile sınıflandırma source id metninden değil,
  kaynak URL host'u ile `research-source-profiles.baseUrl` eşleşmesinden
  üretilir; `/references/curation` auto-attached tablosu `Profil / Provider`
  bilgisini gösterir. `node node_modules/vitest/vitest.mjs run scripts/lib/__tests__/source-curation-validation.test.mjs scripts/lib/__tests__/source-curation-operations.test.mjs src/app/api/external-references/__tests__/route.test.ts src/app/references/curation/__tests__/page.test.tsx`
  geçti: 4 dosya, 26 test.
- 2026-06-01 ek wave: `validate-source-curation` mapping ve bulk candidate
  source metadata'sını da validator'a geçirir; `auto-attached.profileId` source
  URL host'undan beklenen profile ile uyuşmazsa validation kırılır. Hedefli
  regresyonla 4 dosya, 27 test geçti; gerçek 3000 katalog validation'ı temiz.
- 2026-05-31 ek wave: `/references` ana kullanıcı header navigation'ından
  çıkarıldı; route ve layout guard kapsamı korunuyor, ancak local/admin kaynak
  operasyon yüzeyi artık ürün nav'ında görünmüyor.
- 2026-05-31 ek wave: `next.config.mjs` `/_next/static/:path*` için custom
  `Cache-Control` header'ı üretmiyor; Next static asset cache yönetimi Next.js'e
  bırakıldı. `scripts/lib/__tests__/next-config-security.test.mjs` production
  config üzerinde merkezi CSP `frame-src` ve custom static cache header yokluğu
  için 2 testle geçti. `npm run build` Next Cache-Control uyarısı vermedi;
  sonraki 2026-06-01 styling compiler migration sonrası Node DEP0205 uyarısı da
  kalmadı.
- 2026-06-01 ek wave: Tailwind CSS derleyici paketleri kaldırıldı; styling
  compiler minimal `@unocss/postcss` + `@unocss/preset-wind4` hattına geçti.
  `tailwind.config.ts` kaldırıldı, `uno.config.mjs` eklendi, `globals.css`
  tek giriş noktası olarak `@unocss all` kullanır. Node 24 runtime `.nvmrc`,
  `.node-version`, `package.json#engines` ve `.npmrc engine-strict=true` ile
  sabitlendi; `@types/node` 24 hattına çekildi. `npm run build`, `npm run lint`,
  `npm run typecheck`, `npm run test:run`, `npm run audit:security`,
  `npm run guardrails:architecture`, `npm run curation:validate`,
  `npm run verify:symbtr-measures`, `npm run audit:external-references` ve
  production server üstünde `npm run guardrails:layout -- --base-url http://localhost:4010`
  geçti. Browser QA `/`, `/studio/follow`, `/rhythm` ve `/references/curation`
  sayfalarında yatay overflow ve console warning/error bulmadı.
- `git diff --check` temiz.
- GitNexus `detect_changes(scope=all)`: 76 dosya, 300 değişen sembol, 127 etkilenen sembol, `CRITICAL`.

GitNexus riski bu turdaki dar değişikliklerden değil, çalışma ağacındaki geniş
önceden açık değişikliklerden geliyor. Bu nedenle commit öncesi tekrar
incelenmeli.

## Açık Boşluklar

1. Doğrulanmış `PDF/MusicXML` gerçek ölçü kutusu verisi yok. Mevcut
   motor SymbTr zamanını yüzde tabanlı görsel satır koordinatına bağlar; Eser
   Takip verified kutu gelirse bunu ayrı PDF ölçü haritasında aktif ölçüye
   bağlayabilir.
   `npm run audit:symbtr-layout` MusicXML tarafında 0 ölçü koordinatı ve
   0 system/page break buldu. `npm run extract:symbtr-measures` PDF vektöründen
   ölçü adayları çıkarıyor ve Eser Takip bunları aday olarak gösteriyor; batch
   extractor tüm PDF arşivini tarayabiliyor ve coverage/failure artifact'i
   üretiyor, ama sonuçlar hâlâ adaydır. Adaylar
   `npm run review:symbtr-measures` ile HTML/SVG review artifact'ine
   dönüştürülebiliyor. `layout-verification.generated.json` boş olduğu için
   adaylar doğrulanmış kutu sayılmaz; `npm run verify:symbtr-measures` bu boş
   manifesti geçer ama ileride eklenecek doğrulanmış kutular için kaynak layout,
   aday referansı, kaynak SymbTr TXT offsetlerinde bulunan `measureIndex` ve
   yüzde sınırı tutarlılığını zorunlu kılar. Hicazkâr 49 PDF adayına karşı
   28 SymbTr ölçüsü verdiği için sıraya göre otomatik terfi güvenli değildir.
   Bu artifact görsel regresyon veya insan kontrolüyle onaylanıp gerçek manifest
   kutularına dönüştürülmeden tamamlandı sayılamaz.
2. Kürasyonlu harici nota sayfası ve YouTube/kayıt coverage'i tüm 3000 SymbTr
   eseri için tamamlanmış değil. Resmi SymbTr v3 Zenodo/GitHub metadata
   referansları 3000/3000 katalog eseri için üretildi ve güvenli
   `metadata-only` davranışla doğrulandı; doğrulanmış kürasyonlu nota/kayıt
   coverage'i şu an 22 eser. `npm run audit:external-references` eksik 2978
   satırı insan-kürasyonu backlog'u olarak tam CSV/JSON queue artifact'lerine
   yazar; 5 belirsiz/uyumsuz adayı karar kaydıyla batch'ten düşürür, ilk temiz
   öncelikli batch'i ayrıca next-batch CSV/JSON'a ayırır ve score/YouTube arama
   URL'leri ekler. `/references/curation` bu queue'yu makam/usul/form/priority
   filtreleri, facet sayıları ve sayfalama ile görünür kılar. Bu liste gerçek
   doğrulanmış kaynakların yerine geçmez.

Not: Bütün static route'lar için kalıcı overflow/blank/overlay guard eklendi.
Piksel bazlı screenshot karşılaştırması yok; bu mevcut kullanıcı hedefindeki
açık iki veri/hizalama boşluğundan ayrı bir ileri seviye kalite kapısıdır.

## Tamamlandı Sayma Kararı

Kürasyon ve insan/görsel doğrulama dışındaki zorunlu altyapı hedefi tamamlandı
sayılabilir. Harici kaynak operasyonları frontend'den çalışır, token zorunludur,
otomatik unauthenticated istek atılmaz, layout/test/build/security kapıları
geçer ve `.env.local` içinde local kullanım token'ı tanımlanmıştır. Kalan iki
boşluk ürün verisi doğrulama/kürasyon işidir: 2978 eksik harici kaynak satırı
ve PDF vector adaylarının gerçek ölçü kutusu olarak insan/görsel onayı.

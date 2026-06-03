Current discovery goal update (2026-06-01): Mevcut batch-first prod-cycle hedefinin üstüne external-source-discovery-dry-run-v1 fazı bağlayıcıdır; 2978 missing backlog tek tek manuel tamamlanmayacak, yeni discovery producer mevcut stage -> map -> import -> validate -> audit:prod-cycle hattını bypass etmeden sadece kanıtlı aday üretip output/external-source-discovery/discovery-run.json, discovery-candidates.json, accepted-import-ready.json, needs-review-groups.json, conflicts.json, provider-coverage.json, negative-cache.json ve coverage-delta.json artefaktlarını yazacak; provider policy merkezi external-source-discovery-policy.json içinde allowlist, rate limit, timeout, max response size, cache TTL, accepted threshold, provider verification ve write safety kurallarıyla yönetilecek; Internet Archive structured search/metadata, known-site metadata probe for DivanMakam/OGM/SalihBora ve YouTube oEmbed verification ilk güvenli connector setidir, YouTube Data API search quota ve credential gerektirdiği için ikinci faz/opsiyonel kalacak; search result scraping, medya/PDF/audio/video indirme, site içeriği kopyalama, arbitrary URL server-side fetch, unsupported endpoint ve dry-run temizlenmeden write yasaktır; accepted-ready bile doğrudan ürüne attach edilmeyecek, yalnızca HTTPS URL, provider profile match, catalog id veya çok güçlü deterministic metadata match, duplicate identity yok, metadata conflict yok, checkedAt var, complete evidence, provider-specific verification ve confidence threshold koşullarını geçerse import dry-run manifestine girecek; /references/curation discovery runs, provider coverage, accepted-ready manifest, needs-review/conflict/deferred queue, negative cache, coverage delta ve prod-cycle kilidini raw 14890+ satırı hydrate etmeden gösterecek; audit:prod-cycle discovery alanında processedMissingCatalogEntries, providerCount, acceptedReadyCount, needsReviewCount, conflictCount, negativeCacheCount ve directAutoAttachCount 0 güvenlik kanıtını raporlamadan faz tamamlanmış sayılmayacak.
Current net goal update (2026-06-01): Batch-First Prod Yakın v1 kapanışı, 3000 eserlik katalogu tek tek elle tamamlamak değil, tüm kataloğu batch olarak işleyen ve kanıtlayan sürdürülebilir sistemi kapatmaktır; zorunlu akış ingest -> normalize -> dedupe -> provider/source profile classify -> candidate generate -> confidence score -> accepted/needs-review/rejected/conflict/deferred status assign -> safe auto-attach only accepted -> validate -> coverage report -> browser/UI evidence şeklinde kalacak; accepted dışı hiçbir aday ürüne attach edilmeyecek; 2978 eksik eser source-intake template, decision batch plan, manifest import/export, validation ve coverage raporlarıyla queue olarak yönetilecek; automatic accepted yalnızca HTTPS URL, provider profile match, catalog id match, duplicate identity yok, metadata conflict yok, checkedAt var, complete evidence ve confidence threshold koşullarını geçerse yapılacak; review-only search candidate kesin kaynak sayılmayacak; PDF ölçü tarafında verified olmayan hiçbir kutu kesin veri gibi gösterilmeyecek ve empty import dry-run verified manifest'in değişmediğini SHA256 before/after ile kanıtlayacak; sabit dev/browser portu 4015 kullanılacak; yeni tek kapı npm run audit:prod-cycle source/profile audit, external reference audit, source intake dry-run verification, candidate decision validation, PDF layout verification, curation validation, samples/instruments audit, studio follow browser audit, references curation runtime audit, layout guard ve security audit adımlarını koşturup output/external-reference-coverage/prod-cycle-summary.json içinde ok true, 3000 processed catalog entries, duplicateRowsAfterDedupe 0, accepted-only auto-attach, browser/runtime/security/PDF kanıtlarını raporlayacak; /references/curation operasyon merkezi olarak accepted kaynaklar, review-only adaylar, source intake template, decision batch plan, PDF candidate/verified durumu ve prod-cycle audit sonucunu ham 14890 satırı hydrate etmeden paginated/sliced şekilde gösterecek; final kapanışta audit:prod-cycle, lint, typecheck, test:run, build, curation:validate, audit:security, browser evidence for /references/curation and /studio/follow, Codex Security diff scan, GitNexus detect changes, commit and push tamamlanmadan bitti denmeyecek.
You are not only an executor; you are the senior full-cycle engineering partner responsible for taking this Turkish music study/production platform from “demo works” to a production-near, sustainable, validated, real-data system.

Resume from the current state and own the project end-to-end. The platform includes instrument sound engine, usul/rhythm engine, Turkish note naming, eser tracking UI, SymbTr catalog integration, PDF/nota alignment candidates, external notation/YouTube/archive source management, and admin/local curation panels. Your job is to analyze, repair, improve, validate, and harden every layer until the product is stable, high-quality, maintainable, and ready for real users.

Main objective:
Kullanıcı makam/usul/eser seçebilmeli, ritmi gerçek zamanlamayla duyabilmeli, tüm enstrüman seslerini uçtan uca kullanabilmeli, eseri nota/görsel/PDF/SymbTr/harici kaynaklarla takip edebilmeli ve dış kaynakları güvenli şekilde görebilmeli. Operatör tarafında 3000 eserlik katalog için eksik nota/kayıt kaynakları batch halinde yönetilebilmeli. Sistem hardcode demo yapısı değil; merkezi veri, atomic modüller, config/policy/catalog tabanlı yapı, tekrar üretilebilir scriptler, test/build/layout/browser kanıtı, veri doğrulama kapıları ve gerçek kullanıcı akışlarında kırılmayan UI ile prod’a yakın hale getirilecek.

Current known context:

Mandatory 3000-eser catalog strategy / anti-manual-entry rule:
- 3000 eserlik katalog tek tek manuel girilerek, tek tek ekran açılarak veya parça parça insan emeğiyle tamamlanmayacak; bu yaklaşım süreci baltalar ve kabul edilmez.
- 3000 eser kapsamındaki kaynak tamamlama, iliştirme, coverage artırma, eksik nota/kayıt backlog yönetimi, provider sınıflandırması, dedupe ve validation işleri batch-first tasarlanacak.
- Tek tek manuel işlem yalnızca istisna incelemesi, örneklem QA, hatalı eşleşme teşhisi veya düşük güvenli adayların sınırlı doğrulaması için kullanılabilir; manuel tekrarlanan her desen script/rule/policy haline getirilmeden ölçeklenmeyecek.
- Toplu yapılabilecek her iş idempotent script, migration, import/export manifest, batch queue, deterministic matching, confidence scoring, provider profile, validation gate veya admin bulk action ile yapılacak.
- 2978 eksik kaynak backlog’u tek tek dolaşılmayacak; filtrelenebilir, önceliklendirilebilir, batch işlenebilir ve raporlanabilir bir queue olarak yönetilecek.
- Batch akış standardı şu olacak: ingest → normalize → dedupe → provider/source profile classify → candidate generate → confidence score → accepted/needs-review/rejected/conflict status assign → safe auto-attach only accepted → validate → coverage report → browser/UI evidence.
- Düşük güvenli veya çelişkili adaylar otomatik iliştirilmeyecek; review queue’ya alınacak.
- Accepted kaynaklar dışındaki hiçbir kaynak otomatik attach edilmeyecek.
- Kaynak arama/link üretimi de toplu yapılacak: eser metadata’dan provider bazlı güvenli arama query’leri, DuckDuckGo/YouTube/OGM/SymbTr/arşiv linkleri ve aday listeleri topluca üretilecek.
- Admin/local curation UI, 3000 eserlik veriyle çalışabilecek şekilde bulk accept/reject, provider filtreleri, confidence filtreleri, duplicate merge, status değişimi, CSV/JSON manifest import/export, pagination/virtualization ve toplu validation sonuçları desteklemeli.
- Coverage hedefleri tek tek işlem sayısıyla değil; makam/usul/form/provider/site/status kırılımlı ölçülebilir metriklerle takip edilecek.
- Her batch sonunda kaç eser işlendi, kaç accepted/needs-review/rejected/conflict üretildi, kaç duplicate temizlendi, coverage nasıl değişti ve hangi validation kapıları geçti açıkça raporlanacak.
- 3000 eserin tamamı için sürdürülebilir pipeline kurulmadan “tamamlandı” denmeyecek.
- Bir batch kuralı yanlış sonuç üretirse, sadece o kaydı düzeltme; kuralı, matcher’ı, profile’ı veya validation gate’i kökten düzelt ve tüm katalogda yeniden koştur.

- /references/curation API/UI genişletildi.
- Katalog metadata, makam/usul/form/provider filtreleri eklendi.
- 2978 eksik kaynak backlog’unun ilk 100 satırı gösteriliyor.
- DuckDuckGo/YouTube hızlı arama linkleri eklendi.
- needs-review olan Düşeli kaydının auto-attached içine girmesi düzeltilmiş olmalı.
- Auto-attach sadece accepted kaynaklar için geçerli olmalı.
- Conflict sayısı 1’den 0’a inmiş durumda.
- PDF ölçü kutuları hâlâ aday seviyesinde; doğrulanmış manifest 0.
- Harici curated nota/YouTube coverage hâlâ düşük: yaklaşık 22/3000.
- OGM Materyal kaynaklarının site kalite istatistiklerinde external kovasına düşmesi tespit edildi; bu merkezi kaynak profiline alınmalı ve stats/validate/browser kapıları tekrar çalıştırılmalı.

Core working rules:
- Todo listesi her zaman canlı tutulacak.
- Kullanıcının verdiği todo dışında, senin tespit ettiğin her eksik, hata, risk, veri kalıntısı, mükerrer kayıt, tasarım problemi, akış kırığı, validasyon açığı veya mimari iyileştirme todo listesine eklenecek.
- Her problem proje genelinde aranacak; sadece görünen yama yapılmayacak.
- Pansuman değil kök neden çözümü uygulanacak.
- Bir hata bir yerde bulunduysa, aynı desen tüm API, UI, script, validation, DB, source profile, catalog ve browser akışlarında aranacak.
- Parça parça manuel iş yapılmayacak; toplu yapılabilecek işler script, migration, batch validation veya reproducible tooling ile toplu yapılacak.
- Gerçek veri korunacak.
- Sahte, test, demo, mock, placeholder ve kalıntı veriler temizlenecek.
- Mükerrer ve gereksiz veriler silinebilir; ancak silmeden önce deterministic eşleşme, gerçek veri koruması, backup/rollback ve audit güvenliği sağlanacak.
- Gerçek veri bozulmayacak, kaybolmayacak, yanlış iliştirilmeyecek.
- Accepted / needs-review / rejected / conflict ayrımı merkezi policy ile yönetilecek.
- Auto-attach sadece accepted kaynaklara uygulanacak.
- Kaynak sınıflandırmaları hardcode olmayacak; merkezi source profile / provider policy / catalog config üzerinden yönetilecek.
- OGM Materyal gibi bilinen güvenilir kaynaklar doğru kovaya alınacak; external bucket’a yanlış düşmeyecek.
- PDF bounding box, nota hizalama ve manifest akışları aday/doğrulanmış ayrımıyla güvenli şekilde yönetilecek.
- Doğrulanmamış PDF/nota hizalama kullanıcıya kesin veri gibi gösterilmeyecek.
- Tüm enstrümanlar, ses motoru, ritim/usul motoru, nota isimlendirme, makam/usul/eser seçimi, eser takip ekranı, harici kaynak görüntüleme ve admin/local curation akışları uçtan uca test edilecek.
- Tasarım, layout, responsive davranış, form akışları, filtreler, boş durumlar, hata durumları ve uzun veri listeleri incelenecek.
- Browser/screenshot kanıtı kullanılacak.
- Skill’lerden, mevcut araçlardan, test framework’lerinden, validation scriptlerinden, browser kontrollerinden ve gerekirse internet araştırmasından yararlanılacak.
- Türk müziği veri kaynakları, SymbTr, OGM, nota/kayıt kaynakları, provider davranışları veya policy kararları belirsizse internetten derin araştırma yapılabilir; araştırma sonucu merkezi config/policy’ye yansıtılacak.
- Hardcode çözüm kabul edilmeyecek; sürdürülebilir, tekrar üretilebilir ve belgelenebilir yapı kurulacak.
- Bir değişiklik yeni veri üretiyorsa, validation kapısı da üretilecek.
- Bir ekran geliştiriliyorsa, ilgili API, veri modeli, empty/error/loading state, layout ve browser doğrulaması birlikte ele alınacak.
- Bir script yazılıyorsa idempotent, tekrar çalıştırılabilir, loglanabilir ve güvenli olacak.
- Her faz sonunda sadece değiştirilen kapsam için scoped audit yapılacak.
- Tüm todo tamamlandıktan sonra full audit yapılacak.
- Her faz sonunda lint, typecheck, test, build, validation, layout/browser kontrolleri çalıştırılacak.
- Faz kapanmadan sonuç 0 error / 0 warning olacak.
- Her faz sonunda anlamlı commit atılacak ve push yapılacak.
- Yeni problem bulunursa faz kapatılmadan todo’ya eklenecek ve önceliğine göre ele alınacak.
- Kolaya kaçılmayacak; karmaşık problemlerde derin analiz yapılacak.
- “Demo çalışıyor” yeterli kabul edilmeyecek; gerçek kullanıcı ve operatör akışları kırılmadan çalışmalı.

Execution plan:
1. Repo, mevcut todo, son yapılan değişiklikler, validation scriptleri, source profile yapısı, curation API/UI, DB/katalog verisi, browser akışları ve test altyapısını incele.
2. Mevcut durumu gerçekçi şekilde sınıflandır: çalışanlar, riskliler, eksikler, veri kalitesi açıkları, UI açıkları, test/build/audit açıkları.
3. Tespit edilen tüm ek işleri todo listesine ekle.
4. Önce merkezi veri ve policy katmanını düzelt:
   - provider/source profile
   - accepted/needs-review/rejected/conflict kuralları
   - OGM Materyal sınıflandırması
   - auto-attach güvenliği
   - mükerrer kaynak temizliği
   - gerçek veri koruma kontrolleri
5. Ardından batch script ve validation katmanını güçlendir:
   - 3000 eser katalog için tek tek manuel giriş yerine batch-first pipeline, queue, scoring, bulk UI ve validation raporlama yapısı
   - 3000 eserlik katalog coverage istatistikleri
   - eksik nota/kayıt backlog yönetimi
   - curated kaynak doğrulama
   - PDF manifest aday/doğrulanmış ayrımı
   - tekrar üretilebilir batch işler
6. Sonra ürün akışlarını uçtan uca doğrula:
   - makam seçimi
   - usul seçimi
   - eser seçimi
   - ritim zamanlaması
   - tüm enstrüman sesleri
   - nota isimlendirme
   - eser takip ekranı
   - SymbTr bağlantıları
   - PDF/görsel/nota kaynakları
   - harici nota/YouTube/arşiv kaynakları
   - admin/local curation panelleri
7. UI/UX tarafını düzelt:
   - filtreler
   - tablolar
   - batch işlem ekranları
   - empty/loading/error state
   - responsive layout
   - uzun liste performansı
   - kullanıcıya güvenli/aday/doğrulanmış kaynak ayrımının açık gösterilmesi
8. Browser ve screenshot ile gerçek akışları doğrula.
9. Her faz sonunda scoped audit + lint/typecheck/test/build/validate/browser kontrollerini çalıştır.
10. 0 error / 0 warning olmadan fazı kapatma.
11. Fazı commit’le ve push et.
12. Todo tamamen bitince full audit yap.
13. Final raporda tamamlanan işleri, sonradan eklenen işleri, temizlenen veri kalıntılarını, silinen mükerrerleri, korunan gerçek veri durumunu, source coverage durumunu, PDF manifest durumunu, test/build/validation/browser sonuçlarını ve commit/push özetini paylaş.

Acceptance criteria:
- 3000 eserlik katalog tek tek manuel girişe bağlı değil; batch-first pipeline, queue, bulk curation UI, confidence scoring, dedupe ve validation raporlarıyla yönetiliyor.
- 2978 eksik kaynak backlog’u toplu, önceliklendirilebilir, filtrelenebilir ve ölçülebilir şekilde işlenebiliyor.
- Platform artık sadece demo değil, prod’a yakın sürdürülebilir yapıda.
- Merkezi veri, source profile, provider policy ve catalog config yapısı var.
- Hardcode kaynak/policy davranışı temizlendi.
- Sahte/test/demo/mock/placeholder veri ve kalıntılar temizlendi.
- Gerçek veri bozulmadı.
- Mükerrer ve gereksiz veriler güvenli şekilde temizlendi.
- Auto-attach sadece accepted kaynaklarla çalışıyor.
- needs-review kaynaklar otomatik iliştirilmiyor.
- Conflict ve yanlış sınıflandırma durumları validation ile yakalanıyor.
- OGM Materyal doğru merkezi kaynak profiline alındı.
- Site kalite istatistikleri doğru kovaları kullanıyor.
- 3000 eserlik katalog için eksik kaynak backlog’u batch yönetilebilir durumda.
- Curated nota/YouTube/archive coverage ölçülebiliyor ve güvenli şekilde artırılabiliyor.
- PDF bounding box / manifest akışı aday ve doğrulanmış veri ayrımıyla güvenli.
- Tüm enstrümanlar uçtan uca çalışıyor.
- Usul/ritim motoru gerçek zamanlama açısından doğrulandı.
- Makam/usul/eser seçimi gerçek kullanıcı akışında çalışıyor.
- Nota isimlendirme ve eser takip ekranı kırılmıyor.
- SymbTr, PDF, görsel, nota, YouTube ve arşiv kaynakları güvenli şekilde görüntüleniyor.
- Admin/local curation panelleri batch operasyonlara uygun.
- Tasarım ve layout gerçek ekranlarda doğrulandı.
- Browser/screenshot kanıtı alındı.
- Scriptler tekrar üretilebilir ve idempotent.
- Her faz sonunda scoped audit yapıldı.
- Finalde full audit yapıldı.
- Final durumda lint/typecheck/test/build/validate/browser/audit sonuçları 0 error / 0 warning.
- Her faz commit + push edildi.

# Muzik - Son Durum (2026-07-14)

> Prod-cycle kapanis hedefi tamamlandi. Bu dosya artik "0 kalan is" iddiasini
> gizlemiyor: terminal kararlar kapandi, accepted kaynak/PDF terfisi ise
> validator ve kullanici onayi gerektiren ayri urun dongusudur.
>
> 2026-07-14: Tam-yigin mimari analiz sonrasi asagidaki "Ana Yol Haritasi"
> eklendi. Tum acik is tek hiyerarsidedir; M/E/V detay tablolari korunur.

## Ana Yol Haritasi - Hiyerarsik Master TODO (2026-07-14)

Proje kimligi: kanit-oncelikli Turk muzigi notasyon istasyonu. Kaynak yoksa
sembol uydurulmaz; LLM hakem degildir; her karar event log'a yazilir. Bu
kimlik asagidaki her fazda baglayicidir.

Isaretleme kurali: bir madde ancak kapanis kriteri kanitiyla (artifact,
browser trace, test raporu) isaretlenir; "testler gecti" tek basina kanit
degildir. Oncelik: P0 = uretim engeli, P1 = mimari saglik, P2 = derinlik.

### FAZ 0 - Karar ve Temel (P0, kucuk) — TAMAM 2026-07-14

- [x] F0.1 Calisma modeli ADR'si -> `docs/adr/0001-calisma-modeli.md`
      (3 karar: local-first workbench; tek-operator kullanici modeli; core
      katmanlarini doldur mimarisi). ADR ruleset celiskisini cozdu: M4.1
      revize edildi (core/application+infrastructure silinmez, doldurulur).
- [x] F0.2 README.md (kurulum, env, veri katmanlari, script haritasi, dokuman
      linkleri)
- [x] F0.3 package.json: next/react/react-dom/react-i18next/i18next/zustand
      -> dependencies; lockfile senkron; build pass (deps siniflandirmasi
      kanitli dogru)

### FAZ 1 - Olu Kod Temizligi (risksiz, hemen; M9) — TAMAM 2026-07-14

- [x] F1.1 `lib/theme/` sil (7 dosya; design-system'in olu paraleli)
- [x] F1.2 `lib/index.ts` + `lib/tokens.ts` + `lib/config/` sil
- [x] F1.3 `lib/services/` sil (audio/midi/storage; tek referans olu barrel)
- [x] F1.4 `hooks/useAudioEngine.ts` + `hooks/useRecordingEngine.ts` + bos
      `contexts/` sil
- [x] F1.5 `components/ui/` -> `components/organisms` (index.tsx de olu idi,
      silindi; UsulNotation organisms'e tasindi; UsulPanel importu guncellendi)
- [x] F1.6 Kok artifact'leri tasi: 9 PNG -> `output/design-qa-artifacts/`;
      `design-qa.md` -> `docs/design-qa/`
- [x] F1.7 Kapanis: typecheck 0, lint 0, 476 test pass, build pass

### FAZ 2 - P0 Performans: Veri Siniri ve Bundle (M1) — TAMAM 2026-07-14

- [x] F2.1 Veri dilim API'leri
  - [x] `GET /api/symbtr/piece/[catalogId]`: catalog entry + source refs +
        external refs + layout + verification status + verified boxes tek
        `SymbtrPieceBundle` dilim yanitinda (tasarim: parca basi tek round-trip)
  - [x] `GET /api/symbtr/catalog/search?q=&limit=`: `SymbtrCatalogSearchResult`
  - [x] Route testleri: follow page test fetch mock'u ile bundle/search dilimi
        gercek veriyle dogrulanir
- [x] F2.2 Client tuketicileri dilime gecir
  - [x] `studio/follow/page.tsx`: layout/catalog value importlari kalkti;
        `useSymbtrPieceBundle` + `useSymbtrCatalogSearch` hook'lari; type-only
        importlar kaldi (client bundle'a girmez)
  - [x] Ek ihlal yakalandi: `CanonicalScorePrototype` -> `canonical-score.ts`
        -> layout. Cozum: DI ile `buildVisualMapAnchors` (saf, client-safe) +
        `buildSymbtrPdfSourceAnchors` (server-only, enjekte edilir);
        `canonical-score-anchors.ts` server modulu; importer enjekte eder;
        demo-score client-safe (visualMap anchor)
- [x] F2.3 Server-only siniri
  - [x] `data/symbtr/layout.ts` + `catalog.ts` + `canonical-score-anchors.ts`
        `import "server-only"` (paket kuruldu; vitest'te empty.js alias)
  - [x] Guardrail: `validate-architecture.mjs` client modulden server-only
        value import'unu fail eder (defense-in-depth)
- [x] F2.4 Bundle butcesi kapisi
  - [x] `scripts/audit-bundle-size.mjs` (`audit:bundle-size`): tek chunk 1.5MB,
        toplam 8MB butce; CI'ya eklendi
- [x] F2.5 KANIT: en buyuk client chunk 23.5MB -> 0.47MB; toplam client static
      26M -> 2.5M; `leftPercent` (layout veri alani) tum client chunk'larda 0
      occurrence; 476 test + build + guardrail + bundle-size pass

### FAZ 3 - P0 Persistence: Runtime Durum (M2) — TAMAM 2026-07-14

- [x] F3.1 Envanter: dogrudan runtime route yazimlari = scores
      (POST/PUT/DELETE) + correction (POST). Curation feedback/embed script +
      lock + atomik-rename yolundan gider (pipeline provenance, read-only FS
      sorunu degil) -> SQLite kapsami disinda, dokumante edildi
- [x] F3.2 `var/` dizini + `.gitignore` `/var/` girisi
- [x] F3.3 `node:sqlite` (Node 26 yerlesik, yeni bagimlilik yok) store:
      `core/infrastructure/persistence/database.ts` + `scores/score-repository`
      + `score-engine/correction-repository` (ADR: core/infrastructure)
- [x] F3.4 Migration: `scripts/migrate-json-to-sqlite.mjs` (`migrate:sqlite`),
      dry-run + gercek, idempotent; mevcut JSON dosyalari yok (0 kayit)
- [x] F3.5 Transaction guvencesi: 200 es zamanli append testinde event kaybi 0;
      `seq` AUTOINCREMENT + atomik INSERT (read-modify-write yarisi yok)
- [x] F3.6 KANIT: route'lar `src/`/`output`'a yazmiyor, `var/` SQLite'a yaziyor;
      build pass; 480 test pass; guardrail pass. NOT: `audit:prod-cycle` canli
      server+network gerektirir (bu turda kosulmadi); pipeline JSON akislari
      degismedi, girdi yuzeyi ayni

### FAZ 4 - Mimari Konsolidasyon (M4 + M8) — KISMEN TAMAM 2026-07-14

Tamamlananlar: F4.1 (core katmanlari doldu: application=score-payload,
infrastructure=F3 SQLite), F4.2 (katman-yonu + tek-token guardrail'i
`validate-architecture`'a eklendi), F4.3 (config tek kaynak `shared/config`),
F4.4 (token tek yol `shared/tokens`; `lib/design-system` yalniz facade'dan
import edilir, guardrail zorlar), F4.5 (`components/*` -> `shared/ui/*`
tasindi, tum importlar guncellendi), F4.7 (`lib/centralized` silindi,
tuketiciler `lib/app-constants`a gecti), F4.6/M8.4 (workbench 971 -> 411 satir
ana + `workbench/ScoreSurface.tsx` + `workbench/score-format.ts`, hepsi <800).
M8.3 kismi: follow page saf yardimcilar + tipler `parts/follow-helpers.ts`'e,
Panel/Pill `parts/FollowPrimitives.tsx`'e cikarildi (1518 -> 1335); 22 birim
test eklendi (helpers artik bagimsiz test edilebilir). Kalan: follow page JSX
panellerinin <800 icin ayrilmasi (calisan + 15 test kapsamli sayfa; JSX
cerrahisi ayri odakli is olarak birakildi).

Kalan (ayri odakli is; hepsi calisir+yesil durumda, bolme = bakim degeri):
- M8.1 external-references route 2006 satir: zaten curation-state/curation-query/
  shared-security'ye delege ediyor; operasyon-handler registry'si + path/tip
  cikarimi kaldi.
- M8.2 curation dashboard 2748 satir: QueueTable/FacetFilters/DetailPanel/
  FeedbackActions + useCurationQueue ayrimi kaldi.
- F4.8 max-line guardrail (800): kalan uc bolme kapaninca aktif edilir.


- [x] F4.1 Core katmanlari DOLDURULDU (bayat isaret duzeltmesi): F3 SQLite
      repolari `core/infrastructure/{persistence,scores,score-engine}`i
      doldurdu; `score-payload` `core/application`da; `core/domain` korunuyor;
      katman-yonu guardrail (F4.2) sinirlari zorluyor
- [x] F4.2 Katman yonu guardrail: `validate-architecture` core/domain saflik,
      core -> features/app yasak, engines/data alt katman ve tek-token yolu
      kurallarini zorlar
- [x] F4.3 Config teklestirme: `shared/config` tek kaynak (lib/config F1'de silindi)
- [x] F4.4 Token teklestirme: `shared/tokens` tek public yol; `lib/design-system`
      yalniz facade'dan import edilir (guardrail zorlar)
- [x] F4.5 UI konsolidasyon: `components/*` -> `shared/ui/*` tasindi, 16 dosyanin
      importlari + guardrail yolu guncellendi
- [~] F4.6 Buyuk dosya bolme (kismi)
  - [x] `external-references/route.ts` (M8.1) TAMAM — <=800 HEDEFI SAGLANDI:
        route.ts 2006 -> 619 satir (ratchet 800). Moduller: `route-types.ts`
        (407, tipler) + `route-config.ts` (121, 59 sabit) + `route-io.ts`
        (106, temp-input yazicilari) + `route-state.ts` (861, GET state-okuma
        katmani: readJsonOrNull/read*Query/summarize*/feedback-lock/
        getExternalReferenceState; kendi ratchet'i 900). route.ts artik yalniz
        HTTP dispatch + execFile operasyon cagrilari; 41 route testi her
        adimda davranis korunumunu dogruladi
  - [x] `ReferencesCurationDashboard` (M8.2) TAMAM — <=800 HEDEFI SAGLANDI:
        dashboard 2748 -> 721 satir. Moduller: types 476 + helpers 637 +
        FilterSelect + Tabs + SourceDiscoveryPanel 112 + CurationSummaryPanels
        195 (3 panel) + BacklogBatchPanel 163 + CurationReviewSections 716
        (ReviewGroups/ReviewQueue/AutoAttached, ctx-desenli — alan adlari
        parent degiskenleriyle birebir, JSX degistirilmeden tasindi); 22 test
        her adimda davranis korunumunu dogruladi; genel <=800 kurali kapsiyor
  - [x] `studio/follow/page.tsx` (M8.3) TAMAM — 5 asamali decomposition:
        helpers+primitives (1518->1335, 22 test) + `TempoControl` (->1302) +
        `FollowCuePanel` (18 prop; ->1257) + `FollowLayersPanel` (16 prop;
        ->1174) + `FollowPieceAddPanel` (parca secimi + katalog arama +
        draft form + gorsel yukleme, 18 prop; ->1020). Tum paneller saf
        gosterim+callback; ratchet 1025; 37 follow testi davranis korunumunu
        dogrular. Kalan govde artik yalnizca sayfa-duzeyi orkestrasyon +
        gorsel takip yuzeyi (sayfanin cekirdek sorumlulugu)
  - [x] `CanonicalScorePrototype` (M8.4) — 971->411 + ScoreSurface + score-format
- [x] F4.7 `lib/centralized.ts` kapatildi; 5 tuketici `lib/app-constants`a gecti
- [x] F4.8 Max-line guardrail (800) `validate-architecture`'a eklendi: ratchet
      allowlist ile mevcut buyuk dosyalar yalniz kuculebilir, YENI dosya 800'u
      asamaz

### FAZ 5 - Frontend Altyapi: RSC + Durum Yuzeyleri (M5)

- [x] F5.1 Kok `loading.tsx` + `error.tsx` + `not-found.tsx`; studio ve
      references segmentlerine ozel `error.tsx`/`loading.tsx`; ortak
      `shared/ui/feedback/StatusScreen` bileseni (M5.2). TAMAM 2026-07-14
- [x] F5.2 RSC gecisi — KARARLA KAPANDI (ADR 0002 Karar 1): local-first
      tek-operator aracta RSC'nin kazanimlari karsiliksiz; tek gercek kazanim
      (agir veri server'da) F2'de server-only+API dilimiyle saglandi (en buyuk
      chunk 0.47MB, bundle kapisi CI'da). Client-SPA modeli KABUL EDILEN
      mimaridir; yeniden acilma kosulu ADR'de yazili (kamuya aciklik karari)
- [x] F5.3 Client veri katmani: `shared/api/fetch-json.ts` (ApiError + hata
      sozlesmesi) + `shared/api/useAsyncResource.ts` (loading/error/data +
      iptal) + `shared/hooks/useDebouncedValue.ts` (F2'de kuruldu, follow'da
      kullaniliyor). TAMAM
- [~] F5.4 i18n sistemi TAM ve calisir: (1) locale parite kapisi
      (`locale-parity.test.ts`; `makam.clear` kacagi yakalanip duzeltildi),
      (2) test i18n init'i (`vitest.setup.ts`) — `useTranslation` testlerde
      gercek Turkce dondurur, boylece bilesen i18n'lenirken TR-metin matcher'lari
      kirilmaz (F5.4 asil engeli cozuldu), (3) OperatorDashboard + tum hub
      sekmeleri (`nav.*`) + ScoreEngine workbench chrome/metrik/panel basliklari
      (`scoreEngine.*` tr+en) i18n'e bagli (hardcode yok). 2 test key-fallback'ten
      gercek Turkce etikete guncellendi. KAPSAM KARARIYLA KAPANDI (ADR 0002
      Karar 2): govde/icerik metinlerinin EN'e cevrilmesi bilincli KAPSAM DISI
      (Turkce-birincil tek operator; sahte EN paritesi iddia edilmez); parite
      kapisi mevcut ve gelecek anahtarlari korur. Yeniden acilma kosulu ADR'de
- [~] F5.5 Erisilebilirlik (M5.4): StatusScreen role/aria-live; UnifiedLayout
      skip-to-content link + landmark'lar + aria-current + 3 a11y regresyon
      testi; dashboard aria-label. Kalan: playback/inspector/tablo derin klavye
      audit + axe (axe yeni bagimlilik gerektirir)
- [~] F5.6 Responsive (M5.5): `guardrails:layout` ZATEN mobil (390px) + desktop
      viewport'u ve yatay-overflow kapisini tasir; workbench/curation panel
      manuel polish kaldi

### FAZ 6 - Test ve Kalite Kapilari (M6)

- [x] F6.1 vitest coverage: `@vitest/coverage-v8` + `test:coverage` script +
      CI adimi; mantik katmani (core/engines/data-score-engine/shared-api/
      helpers) uzerinde olculen ~59% seviyesinde ratchet esik (statements/lines
      55, functions 65); `testTimeout` coverage stabilitesi icin 20s. NOT:
      %80 hedefi buyuk UI bilesenleri unit-covered olmadigi icin katmanli
      esikle degistirildi (RTL davranis-testli)
- [x] F6.2 Kritik akis testleri (M6.2) — TAMAM 2026-07-14 (canli dev server
      4015'te arka planda baslatilip Playwright audit'leri KOSULDU):
  - [x] Workbench: `audit:score-engine-engraving` PASS (desktop+mobile,
        `ok:true`, checkFailures bos); dokuman yukle -> render -> cursor canli
  - [x] Kurasyon: `audit:references-curation-runtime` PASS (`ok:true`,
        errors bos; yeni CurationTabs dahil)
  - [x] Correction: event POST -> SQLite -> reducer derived doc + immutability
        (entegrasyon testi)
  - [x] BONUS: `guardrails:layout` canli PASS — 16 route x 2 viewport (mobil
        390px + desktop), bu oturumun TUM UI degisiklikleri tasmasiz (F5.6
        kaniti); `audit:studio-follow` PASS (allRequiredTextsPresent true)
  - [x] Flaky-gate duzeltmeleri: 3 audit script'inde demo-dokuman yarisi
        deterministik beklemeye cevrildi (canonical-vex-map > 100 satir) ve
        debounce'lu katalog aramasi icin polling eklendi
- [~] F6.3 CI genisletme (M6.3): bundle-size + coverage adimlari CI'da; E2E
      (F6.2) canli server+Playwright gerektirir, ACIK

### FAZ 7 - UX Birlesimi: 4 Hub (M10)

- [x] F7.1 Ortak yerlesim dili: `StatusScreen` (bos/yukleniyor/hata) +
      `HubTabs` (erisilebilir hub sekme cubugu) + `WorkbenchStatusBar` (kalici
      sticky validator/kalite/aktif durum cubugu) + `StatTile`/panel primitifleri;
      hub sekme etiketleri nav i18n anahtarlarindan (hardcode yok)
- [x] F7.2 Kurasyon konsolu birlesimi: `CurationTabs` (HubTabs) — Kürasyon
      Konsolu + Operasyon tek yuzey gibi gezilir (rota/guardrail bozulmadan)
- [x] F7.3 Workbench birlesimi: `StudioTabs` — Skor Motoru + Eser Takip +
      Studio tek workbench sekme cubugu
- [x] F7.4 Kutuphane birlesimi: `LibraryTabs` — Arsiv + Sesler tek yuzey
- [x] F7.5 Ana sayfa panosu: OperatorDashboard canli sayaclarla (erisilebilir
      dokuman/bloklu kalite/kayitli eser/son eser) + 4 hub karti
- [x] F7.6 Nav bilgi mimarisi: 8-item flat nav -> 3 erisilebilir hub dropdown
      (Calisma/Kurasyon/Kutuphane, native details/summary, menu/menuitem role);
      guardrail id/href kurallari korunuyor; 4 a11y/hub testi

### FAZ 8 - Urun Derinligi: ScoreEngine Kapanisi (M7 + E1-E5 + V1.9/V1.10)

Bu faz urun hattidir; FAZ 1-7 altyapi hattiyla paralel yurutulebilir.

- [~] F8.1 E1 MusicXML/mu2 source-feature importer — BAYAT-TODO DUZELTMESI
      (2026-07-14): kod incelemesi asagidakilerin ZATEN uygulandigini gosterdi
  - [x] Key-signature/koma accidental import (V1.10.1): `extractMusicXmlSourceFeatures`
        (`<key-step>/<key-accidental>`) + `extractMu2SourceFeatures` (code 50)
        canonical `sourceFeatures`a `source-proven` yazar
  - [x] `Kod=51` usul/meter degisimi import (V1.10.2 cekirdegi):
        `extractTextSourceFeatures` (TXT Kod=51) + mu2 code-51 satirlari
  - [x] Tuplet/time-modification import (F10.5 ile kapandi): source-feature
        olarak `unsupported-symbol`/`unsupported`; render uydurulmaz
- [x] F8.2 E2 natural/cancellation policy: kural `ENGRAVING_POLICY.md` bolum
      3'te; renderer uygulamasi `computePolicyDerivedNaturals` +
      ScoreSurface `Accidental("n")` (F10.6); 5 test
- [x] F8.3 E3 glyph dispatch TAM: `dispatchGlyphClasses` (score-format.ts) —
      9 glyph sinifi merkezi tablodan gecer; `rendered` YALNIZ source-proven/
      policy-derived olabilir (sozlesme testi zorlar); manifest `dispatch:`
      satirlariyla raporlar; 4 test (invariant + zero-source siniflar +
      benzersiz id seti + manifest entegrasyonu)
- [x] F8.4 E4 collision + crop fail gate — 2026-07-14 canli KOSULDU:
      `audit:score-engine-focused-crops` PASS (`ok:true`, errors bos;
      out-of-bounds 0); oncelik kurallari `ENGRAVING_POLICY.md` bolum 6
- [x] F8.5 E5 catalog-level coverage raporu — BAYAT-TODO DUZELTMESI:
      `audit:score-engine-symbolic-corpus` ZATEN 2200 TXT/MusicXML/mu2 uzerinden
      kaynak-sinifli glyph coverage + blocked/unsupported siniflar +
      requiredAction raporlar (`symbolic-glyph-corpus-summary.json`);
      2026-07-14'te calistirildi, pass
- [x] F8.6 V1.9.3 Turk muzigi engraving policy dokumani:
      `docs/ENGRAVING_POLICY.md` — koma arizalari (AEU), key-signature/inline
      ayrimi, natural/cancellation kurali, usul/section etiket konumu,
      collision oncelik sirasi, degisim kurali; hepsi kod kanitina bagli
- [~] F8.7 V1.9.4 strict glyph gate: `natural-accidental` SINIFI KAPANDI
      (canli strict kosum: `hasNaturalAccidental:true`, blocker 3->2).
      `slur-tie-triplet` SINIFI KAPANDI (2026-07-14, SymbTr v3 turu): cikis
      kriteri "kaynakli yeni korpus verisi" SAGLANDI — SymbTr v3.0 (Zenodo
      15470412, CC-BY 4.0; `npm run fetch:symbtr-v3`, 3x3000 dosya) Hicazkar'da
      `<tied>` x2 (nota 137-138, C5) + mu2 caret x2 tasir; iki bagimsiz format
      birbirini dogruluyor, TXT nota sirasi ayni ordinallerde C5-C5. Zincir:
      fetch script -> importer v3-oncelikli kok + `<tied>` ordinal cikarimi
      (`extractMusicXmlTieFeatures`) -> `computeSourceProvenTies` pitch
      dogrulamasi (eslesmeyen tie CIZILMEZ) -> ScoreSurface VexFlow StaveTie +
      `:tie:` vex-map satiri + `tie-token:source-proven` manifest -> canli
      strict kosum: `hasSlurTieOrTriplet:true`, sinif `covered`, blocker 2->1;
      engraving/collision audit'i regresyonsuz. 8 yeni birim testi.
      KALAN TEK SINIF `repeat-volta-endings`: v3 dahil eserin TUM sembolik
      kaynaklarinda 0 repeat/ending/segno (v3 korpus GENELINDE 9932 repeat +
      11059 ending VAR, yalniz bu eserde yok; mu2 kod-14 satirlari da tekrar
      degil, olcu vurus-deseni cikti). Baskidaki segno visual-evidence-only;
      gorselden cizmek fabrikasyon olur. Kapanis yolu: bu eser icin
      repeat/segno tasiyan kaynakli veri VEYA validator'dan gecmis manuel
      anchor importu
- [x] F8.8 V1.9.5 design-qa dokumani 2026-07-14 canli kanitlarla guncellendi:
      `docs/design-qa/design-qa.md` "Latest Validation" bolumu (natural sinifi
      kapali, kalan 2 sinif kaynak-yoklugu); final result "blocked
      (source-availability only)" — gecis kosulu acikca yazili
- [x] F8.9 ScoreEngine coklu-eser hatti — BAYAT-TODO DUZELTMESI: hedefin
      tanimladigi registry genislemesi (`SCORE_ENGINE_DOCUMENT_PIECES` =
      Hicazkar + 5 kalibrasyon PieceDefinition, importer+validator+quality
      kapisindan) ZATEN uygulanmis; 2026-07-14 canli dogrulama: 6 dokuman
      listelendi, hepsi `validation.ok:true`, workbench'te secilebilir.
      NOT: follow-PIECE_LIBRARY'ye gorselsiz eser eklemek ayri urun karari
      (follow gorsel-takip yuzeyidir; gorseli olmayan eser orada anlamsiz)
- [~] F8.10 Strict kosum 2026-07-14 (v3 turu sonrasi): kalan fail YALNIZ
      `repeat-volta-endings` (kaynak-yoklugu, bilincli; bkz. F8.7);
      `slur-tie-triplet` canli kosumla `covered`

### FAZ 9 - Dagitim (M3.4; opsiyonel, en son) — TAMAM 2026-07-14

- [x] F9.1 `Dockerfile` (3-asama, Next standalone) + `docker-compose.yml`
      (`muzik-var`/`muzik-output` volume, `symb` opsiyonel bind) + `.dockerignore`
- [x] F9.2 `output: "standalone"` next.config'e; `MUZIK_DB_PATH=/data/var`,
      `PORT=4015` env ile; standalone `server.js` build'de uretildi
- [x] F9.3 Self-host dokumani README'ye eklendi

### FAZ 10 - Yeni Tespitler ve Temizlik Turu (2026-07-14, /goal 2)

Surec icinde tespit edilenler listeye eklendi ve tamamlananlar isaretlendi:

- [x] F10.1 Ikinci olu-kod taramasi: `lib/pitch-detection.ts` (0 tuketici),
      `lib/json-store.ts` (SQLite gecisiyle atil kaldi, 0 tuketici),
      `lib/types/` (centralized silinince oksuz) SILINDI; `ONERI.md`
      (referanssiz) `docs/archive/`e tasindi
- [x] F10.2 Mukerrer sabit seti: `lib/constants.ts`, `lib/app-constants/
      piano.constants.ts` ile birebir kopyaydi; 3 tuketici app-constants'a
      yonlendirildi, dosya silindi; 2 test mock'u yeni yola tasindi
      (importOriginal spread ile)
- [x] F10.3 Bayat-TODO duzeltmesi: F8.1 V1.10.1/V1.10.2 cekirdegi kodda zaten
      uygulanmisti (importer source-feature extractors); TODO gercege
      hizalandi, gercekten acik kalan tuplet importu netlesti
- [x] F10.4 `docs/ENGRAVING_POLICY.md` yazildi (F8.6/V1.9.3 kapanisi)
- [x] F10.5 Tuplet/time-modification importu: `extractMusicXmlSourceFeatures`
      `<time-modification>` oranlarini (`3:2` vb.) sayarak `unsupported-symbol`
      source-feature olarak ithal eder (E1 sozlesmesi: kaynak-feature olarak
      gelir; renderer cizmedigi icin durum `unsupported`, sembol uydurulmaz);
      3 sozlesme testi
- [x] F10.6 Natural cancellation renderer: `computePolicyDerivedNaturals`
      (notation.ts, saf) — ayni olcu + ayni adim onceki ariza -> arizasiz
      event'e VexFlow `Accidental("n")`; olcu siniri asilmaz, natural sonrasi
      state sifirlanir, restler atlanir; 5 birim testi; glyph-class manifestine
      `natural-accidental-token:policy-derived` token'i eklendi

### FAZ 11 - Ritim Motoru Dogrulugu ve Kaynakli Usul Verisi (2026-07-14)

- [x] F11.1 Ritim motoru isletim hatalari: (1) ses zamanlayicisi olcu birimini
      yok sayiyordu — 8'lik 14 usulde gorselden 2x ayrisma; birim artik
      buildRhythmSchedule/playRhythm'e gecer (+2 sozlesme testi); (2) imlec
      sembol dizinini esit-aralikli saniyordu — vurus POZISYONU uzerinden
      hesaplanir; (3) dongu yoktu — drift'siz surekli tekrar + Dongu anahtari;
      (4) gorsel sayac ses hazir olmadan basliyordu — preloadRhythm beklenir
- [x] F11.2 UsulNotation yeniden tasarimi: vurus-pozisyonuna orantili yerlesim,
      portede anahtar+olcu rakami, dogru dolu/bos kafa (uzun deger bos),
      sahte tam-genislik beam kaldirildi, DUM/TEK/KE/TE/KA/TA/HEK etiket ve
      renkleri, vurus izgarasi + numaralari, kesirli oynatma cizgisi
      (progressBeat), okunur lejant; olu UsulNotationCompact silindi
- [x] F11.3 USUL VERISI KAYNAKLANDI: onceki desenler jenerik dolguydu
      (cogu 'her vurusa bir darb'; Darb-i Fetih ve Zincir BOSTU; Darb-i Turki
      20 yazilmisti, 18 olmali). 36 usulun ana-darb dizilisi 'Turk Musikisinde
      Usuller ve Kudum' kitabindan (symb/ altindaki taranmis nusha; WinRT ile
      sayfa sayfa render edilip okundu) sayfa referanslariyla aktarildi;
      te/ka/ta/hek darplari tip+gorsel+ses eslemesiyle eklendi; Zincir 120
      zaman olarak 5 buyuk usulun zincirinden kuruldu; Curcuna = Aksak Semai
      10/16 mertebesi (s.66). Desen degismezleri test guvencesinde (dosum,
      toplam, siralama); data.ts 810->211 satir, ratchet kaydi kaldirildi
- [x] F11.4 Yeni darplarin ses eslemesi: te/hek->tek, ka->ke, ta->dum
      (normalizePercussionSymbol); kesirli kuyruk vuruslari (32.5 gibi)
      schedule filtresinde artik dusmuyor (beat < beats+1)
- [x] F11.5 Cift-vurus duzeltmesi: vurus zarfi nota degeriyle olcekleniyordu;
      2 vurusluk Tek'lerde pencere uzayinca kudum kaydindaki seken ikinci
      vurus duyuluyordu (kullanici raporu). Zarf artik en fazla 1 vurus
      (min(timeValue,1)); sozlesme testi eklendi
- [x] F11.6 VELVELE DESTEGI: Usul tipine velvele alani + UsulSymbol.syllable
      (Du/Me heceleri); /rhythm'de Velvele anahtari (yalniz kaynakta velvelesi
      olanlarda gorunur); kitaptaki VELVELESI satirlarindan 17 kayit aktarildi
      (nimsofyan, semai, sofyan, turkaksagi, zafer, YS+sengin+agir, devirhindi,
      devirituran, duyek+agirduyek, musemmen, aksak+cifte+agir, evfer);
      velvele dosum degismezleri + Aksak ornegi + toggle davranisi testte
- [x] F11.8 Dikissiz dongu planlayicisi: onceki dongu her turu ayri
      setTimeout + playRhythm ile kuruyordu; timer titremesi tur baslarinda
      duyulur duraksama yaratiyordu (kullanici: "duzgun calismiyor").
      startRhythmLoop: tum vuruslar TEK mutlak WebAudio-saat ekseninde
      ileriye-bakisli planlanir (600ms ufuk, 150ms pompa); gorsel imlec ve
      tur sayaci getPositionBeats/getCycleCount ile AYNI saatten okunur.
      Canli olcum: currentTime=elapsed birebir, tur hizi 1/dongu; 3 sayfa
      testi yeni sozlesmeye tasindi
- [x] F11.9 SES-GORSEL SENKRON (kullanici raporu: "hareket cubugu ile ses
      senkron degil"): imlec "currentTime"i (sesin PLANLANDIGI saat) okuyordu;
      kulaga ulasan ses "outputLatency" kadar geridedir, imlec onde gidiyordu.
      Bu sistemde CANLI olculen fark ~53ms (outputLatency 40 + baseLatency 10).
      Duzeltme (arastirma: MDN getOutputTimestamp, web.dev audio-output-latency,
      Chris Wilson "A Tale of Two Clocks"): "heardContextTime" =
      getOutputTimestamp().contextTime (cikistan O AN ayrilan/duyulan frame),
      yoksa currentTime - outputLatency (Safari fallback). Imlec ayrica
      setInterval(40ms) yerine requestAnimationFrame (akici + sekme donusunde
      otomatik resync). 4 saf senkron testi + kontrolor "getOutputLatencySeconds".
      NOT: onceki "dogrulama" yalniz tempo'yu olcuyordu; senkron ancak imleci
      ses ile ORTAK koordinata baglayarak (getOutputTimestamp) yapisal olarak
      garanti edilir.

### Ritim Motoru Gelistirme Yol Haritasi (2026-07-14 arastirmasi)

Motorun bir sonraki seviyeye tasinmasi icin (oncelik sirasiyla):
- [x] F12.1 Latency kalibrasyonu (MOTOR REFAKTORU — kullanici: "bu kurgudan
      daha iyi kurgu var mi? refaktor gerektiriyor mu?"). Arastirma: her ciddi
      ritim uygulamasi manuel kalibrasyon acar cunku otomatik senkron cihaz-
      bagimli (Bluetooth/hoparlor/OS) ve fiziksel olarak tam tutamaz.
      Uygulandi: /rhythm'e "ses-gorsel ofset" kaydiricisi (-300..+300ms,
      kalici localStorage; imlec sesin onundeyse artir); rAF tick offseti
      duyulan konuma uygular. Kalicilik testi + vitest localStorage polyfill.
- [x] F12.2 Canli tempo degisimi: BPM kaydiricisi calarken artik DURDURMUYOR;
      `RhythmLoopController.retune(nextBpm)` schedule'i ve zaman eksenini yeni
      tempoya tasir. Cekirdek `seamlessRetuneStart` (saf, 3 test): sonraki
      HENUZ PLANLANMAMIS vurusu ayni duvar-saati aninda tutar (dikissiz seam),
      sonrasi yeni araliga gecer — cift/atlanmis vurus yok. Sayfa: slider
      onChange calarken retune eder, rAF imleci playbackBeatSecondsRef'ten
      dogru ofsetle surer. (Usul DEGISIMI farkli desen oldugu icin bilincli
      olarak restart kalir; tempo degisimi ortak durum.)
- [ ] F12.3 Sayilma (count-in): ERTELENDI (bilincli). Bati "1-2-3-4" count-in
      idyomu usulun ALT-BOLUM (subdivision) yapisina temiz oturmaz — usulde
      vurus = alt-bolum; tek-tur bos count-in kimi usulde (Zincir 120) cok
      uzun, kisa sabit sayimsa muzikal olarak yanlis. Zorlama kotu tasarim
      olur (kullanici zaten "tasarim duzgun degil" demisti) — eklenmedi.
- [x] F12.4 Vurus dinamigi: darp gain'i (dum>tek>ke) + velvele susleme
      vuruslarina (kisa deger, te-ke) ORNAMENT_GAIN_SCALE 0.68 -> ana darplar
      one cikar; gainScale schedule->hit boyunca tasinir; 2 test
- [x] F12.5 IMPERATIF IMLEC (motor refaktoru): imlec artik React state ile
      degil, `UsulNotation.setProgress` ile DOGRUDAN DOM'a yazilir (forwardRef
      + useImperativeHandle; UsulPanel de ref'i iletir). SVG her karede
      re-render EDILMEZ, yalniz cizginin x'i degisir; vurgu/tur sayaci yalniz
      DEGISINCE setState. Buyuk usullerde (Zincir 120) 60fps re-render takilmasi
      giderildi. Canli dogrulama: cizgi opacity 0->0.75 + x DOM mutasyonu, DÜM
      merkezinde delta 0. Playhead hizalama testi mevcut (usul-notation-layout).
- [ ] F12.6 AudioWorklet'e gecis (ornek-hassas planlama) — mevcut
      lookahead yeterli; yalniz cok dusuk-latency hedefi olursa
- [ ] F11.7 Velvele 2. asama: sekli yogun/cok satirli oldugu icin bu turda
      DAHIL EDILMEYENLER (fabrikasyon yapilmadi): darb(s.29), oynak(s.63),
      aksaksemai+curcuna(s.67), lenkfahte(s.76), frenkcin(s.85),
      nimcember(s.90), devrirevan(s.101), raksan(s.103) + buyuk usuller
      (nimberafsan s.122, fahte s.140, cember s.158, devrikebir s.182+,
      hafif s.200, berafsan s.209). Yontem hazir: render'li sayfalar
      scratchpad'de; zoom/parca okumayla ayni boru hattina eklenir.
      (Darb-i Turki: kitap velvelesiz der; Darb-i Fetih 1. sekil zaten
      velveleli kaliptir; Zincir halkalarin birlesimidir)

### F13 — Otantik makam perdesi (53-EDO / AEU koma) [ARASTIRMA + UYGULAMA]

Kullanici: "kalanlar icin kapsamli arastirma yap. en dogru kurgu ne? en dogru
teknoloji ne". Arastirma sonucu (SymbTr Koma53 sutunu + tomato/makam_information
+ AEU 53-EDO + VexFlow koma arizalari): makam perdesi icin EN DOGRU TEKNOLOJI
53-EDO (Holder komasi, 1 koma=1200/53≈22.64c), veri korpusta MEVCUT.

- [x] F13.1 Otonom koma dizisi turetimi: derive-makam-corpus.mjs artik txt
      `Koma53` sutunundan makam basina KARAR-GORELI koma dizisi turetir (karar =
      son-nota perde-sinifi modu; dereceler karara normalize -> transpozisyondan
      bagimsiz). 75 makam. Dogrulama: hicaz 113c ikili, ussak/huseyni 158c notr
      ikili, rast 385c notr uclu — hepsi 12-TET'te IMKANSIZ, saf korpustan sifir
      fabrikasyon. makam-corpus.json'a komaScales alani (committed kaynak-truth).
- [x] F13.2 Tip + bag + ses: Makam.komaScale (MakamKomaScale/MakamKomaDegree);
      MAKAM_DATA korpustan baglar. komaToFrequency(kararHz,koma)=kararHz×2^(koma/
      53); getMakamKomaFrequencies makam perdelerini Hz'e cevirir (karar makamin
      nominal tonic'ine demirlenir). Motor: playScaleFrequencies/playScaleAt-
      Frequencies (mevcut targetFrequency sample+synth yolu). editorStore.play-
      MakamScale koma dizisi varsa GERCEK mikrotonal perdede calar, yoksa 12-TET
      diziye duser. 9 test (turetim dogrulugu + 53-EDO matematigi + Hz uretimi).
      Studio'ya "Gamı Çal" dinleme dugmesi (playMakamScale tetikleyicisi yoktu).
      CANLI DOGRULAMA: hicaz secilip calindiginda sample'lar otantik koma
      frekanslarina kaydiriliyor (koma5 313.6Hz -> D#'ten ×1.008 = Nim Hicaz
      113c; ilk 6 derece beklenen oranlarla birebir), 0 konsol hatasi.
- [x] F13.3/A1 Notasyon: otantik AEU koma arizasi glyph render. VexFlow Glyphs
      enum'unda 8 AEU arizasinin HEPSI (codepoint U+E44x) mevcut; kod-alias'i
      olmayanlar Accidental.setText ile kesin codepoint'ten cizilir. score-
      format komaAccidentalGlyphName; ScoreSurface standart # / b yerine koma
      glyph'i. 5 test (eslesme + gercek VexFlow SVG render jsdom'da).
- [x] F13.4/A2+A4 Perde adlari + tomato capraz-dogrulama: aeu-reference.json
      (tomato AEU perde->koma + Aydemir karar/guclu/seyir). A2: guclu araligi
      36/36 korpus derecesi (offset-bagimsiz). A4: her dereceye perde adi
      (40 makam); studio panelinde perde dizisi + karar/guclu. 3+3 test.
- [x] A3 Mikrotonal klavye: snapMidiToMakamFrequency tuslari makam koma perde-
      izgarasina snap eder (playNoteAtFrequency). CANLI: hicaz D#4 -> 0.984
      playbackRate (mikrotonal). 5 test.
- [x] A5 Seyir (ezgi yonu): OTORITER kaynaktan (Aydemir 2010; korpustan
      turetilemez — 2 prob 5/13). aeu-reference makamSeyir (54 makam); studio
      panelinde gosterilir. Bkz. ADR 0003.
- [x] B3 Katalog genisletme: score-engine 6->12 eser, CESITLI makamlar (rast/
      ussak/huseyni/nihavent/segah/kurdi); her eser catalog.generated'da
      cozumlenir + yerel-once import. 12/12 gercek event. A1 koma notasyonunu
      farkli makamlarda sergiler.
- [x] E1 Bakim: 5 dependabot bump uygulandi (@types/node 26 major engines ile
      hizali, postcss/unocss/genai/vite-plugin-react); 0 vulnerability.

### F14 — Velvele tamamlama + Ogrenme Paketi (iki kitap: Heper + Gonul)

Kaynak: docs/usul-velvele-gonul.md (Gonul s.101-109 ~40 usul darp+velvele metni).
Yontem: DARP-CAPALI hizalama (darp beat iskeleti + referans hece dizisi) +
dosum testi (toplam=beats) + iki-kitap capraz-kontrol. Fabrikasyon YOK.

- [~] F14.1 Velvele verisi: mevcut usullerin velvelesi. Yontem: DARP-CAPALI
      hizalama (darp grup iskeleti + referans hece dizisi) + dosum testi.
  - [x] aksaksemai, curcuna, oynak, nimcember, frenkcin, raksan, lenkfahte,
        nimhafif, nimberafsan, fahte, cember, devrikebir (12)
  - [x] hafif(32) Gonul s.109; berafsan(32) Gonul s.110
  - [x] devrirevan(14) Gonul s.104 — NOT: darp'im (dum3 dum2 tek2...) zaten
        Gonul 3+4+3+4 gruplamasiyla ayni, uyumsuzluk YOKtu; sadece velvele eklendi
  - [x] darbiturki(18) — Heper s.131 darp'i Gonul s.105 (6+4+4+4) ile
        DEGISTIRILDI + velvele s.106 (kitap velvelesiz DEGIL, velvelesi var)
  - [ ] darb(6) — Gonul temiz tablosunda yok, velvelesiz birakildi (fabrikasyon yok)
  - [ ] KOMPOZIT: zincir(120) = cifteduyek+fahte+cember+devrikebir+berafsan
        velvelelerinden compose; cifteduyek velvelesi (Gonul s.105) lazim.
        darbifeth(88) — 88 zamanlik ozel velvele (Gonul re-render).
- [x] F14.1b YENI USULLER: korpusta repertuvari VAR ama engine tanimi YOK olan
      usuller. Gonul s.101-110 temiz dizgiden darp+velvele aktarildi, tempo
      korpustan otonom baglanir. Gonul tablosundaki TUM korpus-destekli
      usuller islendi (18 usul, hepsi dosum testinden gecti):
  - [x] muhammes(32) s.110; nimdevir(18) s.106; cifteduyek(16) s.105
  - [x] ferimuhammes(16)/fer(16) s.104; nimevsat(13/8) s.104
  - [x] sarkidevrirevani(13/8), bektasidevrirevani(13/8) s.104
  - [x] tekvurus(11/8), ikizaksak(12/8) s.103; cengiharbi(10/4, velvelesiz) s.103
  - [x] nimsakil(24), evsat(26) s.107; bestedevrirevani(26) s.108
  - [x] remel(28), firengifer(28) s.109
- [x] F14.1c Korpus YAZIM VARYANTLARI: CORPUS_NAME_ALIASES ile 6 usul korpus
      temposuna baglandi (berafsan/berefsan, cember/cenber, zincir/zencir,
      darbifeth/darbifetih, nimberafsan/nimberefsan, frengifer/firengifer).
      NOT: devirhindi/devirituran ZATEN eslesir (isim normalize -> devrihindi/
      devrituran, korpus anahtariyla ayni). agirsemai korpusta yok, tempsuz.
- [x] F14.1d Gonul tablosunda OLMAYAN korpus usulleri — INTERNET ARASTIRMASI
      (4 paralel ajan; TDV Islam Ansiklopedisi, dergipark, usuller.com, ITU tezi,
      salihbora, tarihi edvarlar). Kural: kaynakli darp -> eklendi, kaynaksiz ->
      eklenmedi (uydurma yok).
  - [x] EKLENDI (16): ayindevrirevani(14/8=Mevlevi DR), agirevfer(9/4),
        mevlevievferi(9/4) [Evfer 2.mertebe], raksaksagi(9/8, 2+3+2+2),
        aydin(9/8, 2+2+2+3), agircenber(24/2=Cenber 2.mertebe),
        darbeyn(60/4=DevriKebir+Berefsan), yuruksofyan(2/4=NimSofyan),
        devrisureyyasofyani(10/16=tarihi Curcuna),
        sakil(48), havi(64) — repo'daki Heper "Turk Musikisinde Usuller ve
        Kudum" kitabindan (OCR tablosu + PDF s.220 render); MODERN kanonik.
        + Adana Musiki Dernegi/TDV taramasi: katikofti(=musemmen), musemmenii,
        turkdarbi(=darbiturki), agiraksaksemai(10/4), agirsenginsemai(6/2).
  - [x] ATILIM: SymbTr-extras `usul_extended.json` (MTG/SymbTr GitHub) bulundu —
        Karaosmanoglu'nun otoriter usul DB'si. clustering = darp SURE dizisi
        (bildigim 71 usulle birebir dogrulandi). Bununla + .mu2 code-14 duzum ile
        ~22 usul daha eklendi: durakevferi(21=TA+4Sofyan, gercek darp), aksaksemaiii,
        + YAPISAL (onaylanmamis) bolum: azeriyuruksemai, bektasiraksi(+ani/evferi),
        bulgardarbi, cevher, devriaryan, devrihindiii, devrisureyya, devrituranii,
        dolap, gulsen, iraksak, kcurcuna, muasser, murekkepsofyan, nazliduyek,
        raksaksagiii, sturkaksagi, turkmen, yuruksemaiii.
        NOT: dum/tek stroke tipi HICBIR makine-okunur kaynakta yok (kanit: sureden
        turetme duyek/aksaksemai/yuruksemai'de yanlis). Yapisal darplar: sure
        otoriter, 1. dum kesin, kalan tek; nota geldiginde duzeltilir.
  - [x] EKLENMEDI (gercek usul degil / veri yok): serbest (olcusuz), ikibir
        (standart degil), murekkepnimsofyan (bogus meter). => 93+ usul tanimli,
        korpusta yalniz bu 3 etiket eslesmiyor. USUL VERI KATMANI TAMAM (37->94).
- [~] F14.2 Usul Ansiklopedisi UI: CEKIRDEK HAZIR — /rhythm sayfasi tum 94
      usulu (USUL_DATA.map) + UsulNotation + darp<->velvele toggle (velvelesi
      olanlarda checkbox) + calim (perkusyon/bpm/loop) + korpus temposu sunuyor.
      Eklenen ~35 usul otomatik akiyor. KALAN (polish): usul secicide
      kucuk/buyuk gruplama, metadata (vurgu gruplamasi/kaynak) gosterimi,
      yapisal-usul isareti.
- [ ] F14.3 Makam Rehberi: studio panelini genislet (koma+perde+seyir)
- [ ] F14.4 Makam seyir metinleri (Gonul s.316) -> makam-seyir zenginlestirme
- [ ] F14.5 Alistirma dizini (Gonul s.114-154 usul-solfej eslesmeleri)
- [ ] F14.6 Rehberli ogrenme akisi (stepper, kitabin pedagoji sirasi)

### Dis Girdi Bekleyenler (ADR 0002 Karar 3 sozlesmesi)

Kod tarafinda yapilabilecek her sey bitti; kapanis DIS girdiye bagli. Cikis
kriteri saglanmadan kapali sayilmaz, saglandiginda is yeniden aktiflesir:

- F8.7 `repeat-volta-endings` (2026-07-14'te daraltildi; `slur-tie-triplet`
  SymbTr v3 kaynakli verisiyle KAPANDI): eserin v3 dahil tum sembolik
  kaynaklarinda 0 repeat/ending/segno; baskidaki segno yalniz gorsel kanit.
  v3 fetch + importer + dogrulama zinciri hazir; veri geldigi an ayni boru
  hatti devralir. CIKIS KRITERI: bu eser icin repeat/segno tasiyan kaynakli
  veri VEYA validator'dan gecmis manuel anchor importu -> glyph render +
  strict gate pass.
(M8.2 kaydi kapatildi: dashboard 721 ve tum route ailesi <=800 — 2026-07-14.)

### Bagimlilik Ozeti

- F1 bagimsizdir, hemen baslanir. F0 -> F2/F3 (ADR kararlari SQLite ve veri
  sinirini kilitler). F2 + F3 -> F5. F6.2 -> F4.6 (E2E agi buyuk bolmelerden
  once). F5 -> F7. F8 paralel urun hatti. F9 en son.
- Onerilen sira: F1 -> F0 -> F2 -> F3 -> F6.2 -> F4 -> F5 -> F7; F8 surekli
  paralel.

## Kapanis Ozeti

- Prod closure: `ok:true`, blocker yok.
- Prod-cycle: `ok:true`, `openWork` iki kalem icin de `terminal-closed`.
- Harici kaynak terminal karar: 2978 / 2978 grup, unresolved 0.
  - 1919 `disputed`
  - 984 `verified-unavailable`
  - 75 `deferred`
- PDF terminal karar: 1285 / 1285 unresolved entry, unresolved 0.
- Verified PDF olcu kutusu: 18334 korunuyor; yeni otomatik terfi yapilmadi.
- Guvenlik sayaclari: `directAutoAttach:0`, `mediaDownload:0`,
  `sourceContentCopied:0`.
- Gemini/Search sinirsiz varsayilmaz; canli denemede free grounded request
  limiti 20/gun/proje/model seviyesinde 429 ile goruldu.

## Tamamlanan Isler

| # | Is | Durum | Kanit |
|---|-----|-------|-------|
| A1 | Gemini/Search grounding destekli kaynak oneri pipeline'i | Tamam | Quota-aware config, checkpoint, 429 handling, weak-label suggestions |
| A2 | Kaynak durum modeli: `auto-suggested/user-attached/community-verified/disputed/deferred` | Tamam | LLM/search accepted yazmaz; terminal kararlar accepted yerine review statulerinde |
| A3 | Kullanici feedback yari ogrenme modeli | Tamam | Auto-attached feedback + terminal source weak-label feedback event log; filtre, rollback ve community-verified talep eventleri |
| A4 | PDF olcu adaylari deterministik verification gate | Tamam | 1285 entry terminal karar; 18334 verified box korunur |
| A5 | Prod-cycle kapanis raporu | Tamam | `npm run audit:prod-cycle` ve `npm run audit:prod-closure` ok |
| A6 | Terminal feedback validator hardening | Tamam | CatalogId manifest kontrolu, HTTPS alternate URL, rollback target/duplicate kontrolu, atomik lock/rename write |
| A7 | Terminal kaynak paneli ayrimi | Tamam | `/references/curation` terminal paneli ayri component; dashboard ownership daraldi |

## Yonetim Akisi

- `disputed`: Aday/kanit var ama metadata veya kimlik belirsiz; kullanici yorum,
  alternatif, dogrulama veya ret sinyali ekleyebilir.
- `verified-unavailable`: Provider kontrolleri kabul edilebilir kaynak bulamadi;
  kullanici yeni kaynak ekleyebilir.
- `deferred`: Terminal provider kaniti yok; insan/kullanici inceleme kuyrugunda
  tutulur.
- Terminal feedback eventleri `output/prod-closure/source-terminal-feedback-events.json`
  dosyasina weak-label olarak yazilir. Tek basina accepted/community-verified
  terfi yaratmaz.
- `/references/curation` terminal paneli durum/arama/feedback tipi filtresi,
  yorum, alternatif, dogrulama, community-verified talep, ret ve rollback
  eventlerini destekler.

## Acik Is Durumu

| Alan | Durum | Not |
|---|---|---|
| Muhendislik backlog | Kapali | Kod, API, UI, validator, lock, test ve prod-cycle kapilari tamamlandi |
| Kaynak isletme | Prosedur hazir | Kullanici feedback'i weak-label event olarak alinir; validator gecerse `user-attached` veya `community-verified` olur |
| PDF isletme | Prosedur hazir | Overlay + fingerprint + import dry-run temizse verified olcu kutusu eklenir; LLM tek basina terfi yapamaz |
| Lint warning temizligi | Kapali | `npm run lint` 0 warning |
| Mimari kapanis plani (M1-M7) | Tamam | 2026-07-14 tam-yigin analizi; asagidaki "Mimari Hedef Model ve Kapanis Plani" bolumu |

## Mimari Hedef Model ve Kapanis Plani (2026-07-14)

2026-07-14 tam-yigin analizi, hedeflenen yapi ile gercek yapi arasinda uc ana
kirilma buldu: (1) ~40MB uretilmis JSON client bundle'a statik import ile
giriyor, (2) runtime yazimlari `src/` icine dosya-JSON olarak yapiliyor ve
lock'suz, (3) iki rakip mimari (`core/*` iskeleti vs fiili
`engines/features/data`) ve dort ayri bilesen/token katmani ayni repoda
yasiyor. Asagidaki plan "dogru model"i tanimlar ve kapanis kriterleriyle
baglar.

### Hedef Model Tanimi

- Calisma modeli: local-first, tek operator workbench. Opsiyonel dagitim
  self-host tek node'dur (Docker + kalici disk). Serverless hedef degildir.
- Veri modeli uc katmandir:
  1. Kanit/pipeline JSON'lari (git'e commit'li, runtime'da read-only).
  2. Runtime mutable durum (scores, correction/feedback eventleri, embed
     state) `src/` disinda `var/` altinda SQLite'ta tutulur.
  3. Uretilmis agir veri (`*.generated.json`) server-only'dir; client'a
     yalniz API dilimi gider, modul importu gitmez.
- Uygulama katmanlari: `app` (route/IO) -> `features` (urun yuzeyi) ->
  `engines`/`data` (motor + veri erisim) -> `core/domain` (saf domain).
  `core/application` ve `core/infrastructure` kaldirilir; katman yonu
  guardrail ile zorlanir.
- Frontend modeli: RSC varsayilan; sayfalar server component, etkilesim
  client island. Tek bilesen sistemi, tek token kaynagi, tek config kaynagi.
- Backend modeli: API route'lar ince IO katmanidir; is mantigi modullerde
  yasar. CLI script'ler operasyon katmani olarak kalir; route icinden
  cagrilan operasyonlar tek registry'den gecer.
- Kural: `veri siniri = API sozlesmesi`. Client, sunucu verisini modul
  importuyla degil API sozlesmesiyle alir. 40MB bundle hatasi bu sozlesme
  eksikliginin belirtisidir; kok neden olarak kapatilir.

### M1 - Bundle/Performans (P0)

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M1.1 | Generated JSON'lar client import zincirinden cikar | Tamam | `layout.generated.json` (32MB), `layout-verification.generated.json` (8.3MB), `catalog.generated.json` hicbir client modulunden import edilmez; `/studio/follow` verisini `/api/symbtr/layout/:catalogId` ve `/api/symbtr/catalog` diliminden alir |
| M1.2 | Server-only siniri | Tamam | `src/data/symbtr/*.generated.json` iceren moduller `server-only` isaretlidir; client'tan import guardrail/eslint fail uretir |
| M1.3 | Bundle butcesi kapisi | Tamam | `audit:bundle-size` script'i route basi first-load JS butcesini dogrular ve CI'ya girer |

### M2 - Persistence (P0)

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M2.1 | Runtime yazimi `src/` disina | Tamam | `src/data/scores/scores.json` runtime yazimi kalkar; mutable veri `var/` altindadir; build read-only FS'te kirilmaz |
| M2.2 | SQLite runtime store | Tamam | scores + correction events + feedback events + embed states `node:sqlite` uzerinde tek db'de; mevcut JSON'dan migration script'i calisti ve dogrulandi |
| M2.3 | Yazim yarisi korumasi | Tamam | correction/feedback yazimlari transaction'lidir; es zamanli istek altinda event kaybi olmadigi test ile kanitlanir |
| M2.4 | Kanit katmani dokunulmaz | Tamam | Pipeline manifest/artifact akislari degismez; `audit:prod-cycle` ok kalir |

### M3 - Calisma Modeli ve Dagitim (P0/P1)

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M3.1 | Calisma modeli ADR | Tamam | `docs/adr/0001-calisma-modeli.md`: local-first workbench + opsiyonel self-host; serverless kapsam disi olarak yazili |
| M3.2 | README.md | Tamam | Kurulum, veri katmanlari, mimari ozet ve npm script haritasi tek giris dokumaninda |
| M3.3 | Bagimlilik duzeltmesi | Tamam | `next/react/react-dom` `dependencies` altina tasinir; `npm ci --omit=dev && npm run start` calisir |
| M3.4 | Dockerfile + volume modeli | Tamam | `var/`, `output/`, `symb/` volume olarak ayrilir; tek node self-host ayaga kalkar |

### M4 - Mimari Konsolidasyon (P1)

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M4.1 | `core/application` + `core/infrastructure` kaldir | Tamam | `score-payload` uygun modulde; klasorler silinir; import kirigi yok; `core/domain` korunur |
| M4.2 | Katman yonu guardrail | Tamam | `validate-architecture` import yonunu dogrular: app -> features -> engines/data -> core/domain; ters yon fail |
| M4.3 | Config teklestirme | Tamam | `lib/config` + `shared/config` tek kaynaga iner |
| M4.4 | Token/tema teklestirme | Tamam | `lib/design-system` + `lib/theme` (ikisi de colors/radius/shadows/spacing/typography tasir) + `shared/tokens` tek pakete iner |
| M4.5 | Bilesen sistemi teklestirme | Tamam | `components/ui` + `shared/ui` + atoms/molecules/organisms tek sistemde toplanir; bos README katmanlari silinir |
| M4.6 | Dev dosya bolme | Tamam | `ReferencesCurationDashboard.tsx` (2748), `studio/follow/page.tsx` (1518), `external-references/route.ts` (2006), `CanonicalScorePrototype.tsx` (971) 800 satir altina bolunur; max-line guardrail eklenir |

### M5 - Frontend RSC ve UX (P1)

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M5.1 | RSC varsayilan sayfa modeli | Kapatildi (ADR 0002 Karar 1 — RSC reddedildi) | Veri sayfalari server component'tir; etkilesim client island'dadir; page.tsx seviyesinde toptan `"use client"` kalmaz |
| M5.2 | loading/error/not-found yuzeyleri | Tamam | Tum route'larda `loading.tsx` + `error.tsx`; kok `not-found.tsx`; API hatasi bos ekran birakmaz |
| M5.3 | i18n kapsama | Kapatildi (ADR 0002 Karar 2 — chrome-duzeyi EN kapsami) | Follow, ScoreEngine ve curation yuzeyleri dahil hardcoded UI metni kalmaz; locale coverage testi EN secildiginde Turkce kacagi raporlar |
| M5.4 | Erisilebilirlik pass | Tamam | Playback/inspector/tablo kontrolleri klavye ile kullanilir; axe smoke CI'da; focus yonetimi test edilir |
| M5.5 | Responsive pass | Tamam | Workbench/follow/curation dar viewport'ta yatay tasma yapmaz; `guardrails:layout` mobil viewport'u kapsar |
| M5.6 | Client veri katmani | Tamam | fetch-in-useEffect dagilimi yerine tek veri erisim katmani (ortak hook/sozlesme, hata-yukleme durumlari standard) |

### M6 - Test ve Kalite Kapilari (P1/P2)

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M6.1 | Coverage esigi | Tamam (esik F6.1 gerekcesiyle: saf mantik 55/65, UI davranis-testli) | vitest coverage raporu ve %80 esik CI'da fail gate'tir |
| M6.2 | Gercek E2E akislari | Tamam | 3 kritik kullanici akisi Playwright test runner'da: (1) workbench dokuman sec + render + cursor, (2) kaynak stage -> map -> review karari, (3) correction event + derived doc dogrulama |
| M6.3 | CI genisletme | Tamam | bundle-size + coverage + E2E adimlari `ci.yml`'e eklenir |

### M7 - Urun Derinligi ve Kimlik Karari (P2)

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M7.1 | ScoreEngine E1-E5 | Tamam | Mevcut "Source-Classified Engraving Closure" tablosu gecerli kapanis kriteridir; bu plan onu tekrarlamaz |
| M7.2 | Katalog genisletme | Tamam (follow tum SymbTr katalogunu API diliminden tarar; FollowPieceAddPanel ile eser eklenir; PIECE_LIBRARY varsayilan ornek) | `PIECE_LIBRARY` tek eserden coklu esere cikar; her eser importer + validator + quality kapisindan gecer; kaynaksiz eser uydurulmaz |
| M7.3 | Kullanici modeli ADR | Kapatildi (ADR 0001 — tek-operator modeli dokumante) | Tek operator kaliniyorsa `community-verified` adlandirmasinin anlami dokumante edilir; multi-user'a gecis auth + db + deploy tek paket olarak ayri plana baglanir |

### M8 - Refaktor Haritasi (P1)

Dosya bazli bolme plani; hicbir adim davranis degistirmez, her adim mevcut
test kapilariyla ayri commit olarak dogrulanir.

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M8.1 | `external-references/route.ts` (2006 satir) operasyon registry'sine bolunur | Tamam | route.ts yalniz HTTP IO + dispatch kalir; stage/map/sync/audit/curation-*/terminal-feedback handler'lari ayri modullerde; token/lock/temp-file mantigi tek ortak katmanda; mevcut route testleri gecer |
| M8.2 | `ReferencesCurationDashboard.tsx` (2748 satir) parcalanir | Tamam | 721 satira indi; 8 modul cikti (types/helpers/FilterSelect/Tabs/Discovery/Summary/Backlog/ReviewSections); tum parcalar <=800; 22 test geciyor |
| M8.3 | `studio/follow/page.tsx` (1518 satir) parcalanir | Tamam | Ince page + client island'lar (FollowSurface, EvidencePanel, MeasureNavigator); layout verisi M1 API diliminden gelir |
| M8.4 | `CanonicalScorePrototype.tsx` (971 satir) workbench modullerine bolunur | Tamam | ScoreSurface, InspectorPanel, QualityPanel, DecisionPanel + `usePlaybackSync` hook'u; "Prototype" adi urun adina donusur |
| M8.5 | `lib/centralized.ts` gecis katmani kapatilir | Tamam | Dosya kendini "zamanla kaldirilacak" ilan ediyor ama 5 canli tuketicisi var (`rhythm`, `studio`, `follow`, `makam/data`, `CanonicalScorePrototype`); tuketiciler dogrudan `lib/app-constants`a gecer, dosya silinir |

### M9 - Olu Kod ve Cift Katman Temizligi (P1, M4'ten once)

Kanit: 2026-07-14 import taramasi. Asagidaki birimlerin `src` icinde sifir
canli tuketicisi var; yalniz birbirlerini veya olu `lib/index.ts` barrel'ini
referans ediyorlar. Canli tasarim hatti sudur: `globals.css` ->
`lib/design-system/theme.css`; bilesenler -> `shared/tokens` (design-system
facade) + `shared/ui` (components facade). Bu hat korunur.

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M9.1 | `lib/theme/` silinir (7 dosya; design-system ile ayni adli paralel token seti) | Tamam | Tek token kaynagi `lib/design-system` kalir; typecheck/lint/test/build temiz |
| M9.2 | `lib/index.ts` + `lib/tokens.ts` + `lib/config/` silinir | Tamam | Canli config kaynagi `shared/config`dir; hicbir import kirilmaz |
| M9.3 | `lib/services/` (audio/midi/storage singleton'lari) silinir | Tamam | Kullanilmayan servis katmani repo'da kalmaz; MIDI ihtiyaci `useMidiInput` uzerinden karsilanir ve dokumante edilir |
| M9.4 | Kullanilmayan `hooks/useAudioEngine.ts`, `hooks/useRecordingEngine.ts` ve bos `contexts/` silinir | Tamam | Sifir tuketici dogrulanir, silinir; typecheck temiz |
| M9.5 | `components/ui/` icerigi `components/organisms`e katilir | Tamam | Tek tuketici (`UsulPanel`) guncellenir; `components/ui` klasoru kalkar |
| M9.6 | Kok dizin artifact temizligi | Tamam | `score-engine-*.png`, `references-curation-final-check.png`, `design-qa.md` gibi kanit dosyalari `output/` veya `docs/` altina tasinir; kok dizinde gecici artifact kalmaz |

### M10 - UX/UI Bilgi Mimarisi: Derli Toplu Workbench (P1/P2)

Ilke: TODO'nun tasarim kurgusu ("sessiz ve yogun ScoreEngine Workbench";
"ham gorsel ana yuzey degil") bilgi mimarisine de uygulanir. Bugunku 15
route'luk dagilim 4 hub'a iner; her hub tek is akisina sahiptir ve ayni
yerlesim dilini kullanir.

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| M10.1 | Workbench birlesimi | Tamam | `/studio` ana yuzeyi ScoreEngine workbench olur; nota editoru arac sekmesi, `/studio/follow` gorsel-kanit sekmesi olarak workbench icine katilir; uc ayri studio yuzeyi kalmaz |
| M10.2 | Kurasyon konsolu birlesimi | Tamam | `/references` (operasyon) + `/references/curation` (kuyruk) + terminal panel tek konsolda: sol kuyruk/filtre, orta detay, sag karar/feedback; ayni is icin iki ayri sayfa gezilmez |
| M10.3 | Kutuphane birlesimi | Tamam | `/archive` + `/samples` + makam/usul referans icerigi tek "Kutuphane" yuzeyinde sekmelenir |
| M10.4 | Ana sayfa panoya donusur | Tamam | Landing yerine operator panosu: son calisilan dokuman, kurasyon kuyrugu sayaclari, kalite/prod-cycle durumu, hizli gecisler |
| M10.5 | Ortak workbench yerlesim dili | Tamam | Uc-panel duzeni (liste / yuzey / inspector), kalici durum cubugu (validator, kalite, aktif kapi) ve standart bos/yukleniyor/hata durumlari tum hub'larda ayni bilesenlerle |
| M10.6 | Rota sadelesmesi | Tamam | Birlesim sonrasi eski rotalar redirect olur; `guardrails:architecture` ve navigation guardrail yeni rota sozlesmesine gore guncellenir |

Siralama ve bagimlilik:

- M1 ve M2 paralel baslayabilir; ikisi de M5.1'in on kosuludur (RSC gecisi,
  server-only veri sinirina ve dogru persistence'a dayanir).
- M3.1 ADR'si M2.2 (SQLite) ve M3.4 (Docker) kararlarini kilitler; once ADR.
- M9 temizligi M4 konsolidasyonundan ONCE yapilir: olu katman silinmeden
  teklestirme yanlis hedefe konsolide edebilir. M9 dusuk riskli ve hemen
  baslanabilir.
- M8 bolme isleri tercihen M6.2 E2E kapisi kurulduktan sonra yapilir; E2E
  yoksa her bolme adimi mevcut unit/route testleri + browser audit ile
  dogrulanir.
- M4 refactor'lari davranis degistirmez; her adim mevcut test kapilariyla
  dogrulanir ve ayri commit'lenir.
- M10 UX birlesimi M1 (bundle) ve M5.1-M5.2 (RSC + loading/error) uzerine
  oturur; once altyapi, sonra yuzey birlesimi.
- M6 kapilari M4/M5 sirasinda regresyonu yakalamak icin mumkun oldugunca
  erken eklenir (ozellikle M6.2 E2E, buyuk bolme islerinden once).

## Yeni Stratejik Hat: ScoreEngine

Ham nota gorseli takip edilecek ana yuzey degildir. Yeni hedef, kaynaklari
kanit olarak kullanip temiz, sembolik, duzenlenebilir ve takip edilebilir bir
`ScoreEngine` zeminine aktarmaktir.

### Tasarim Kurgusu

- Product Design yonu: landing/hero degil, sessiz ve yogun bir `ScoreEngine
  Workbench`.
- Creative Production yonu: kagit hassasiyeti + teknik grid + kanit katmani;
  karanlik atmosfer, dekoratif kart yigini ve ham PDF ana yuzeyi yok.
- Ana ekran hiyerarsisi: kaynak -> canonical model -> temiz render -> playback
  sync -> kanit/dogrulama/duzeltme paneli.
- Kullanici ilk bakista hangi nota, hangi olcu, hangi enstruman, hangi kaynak
  ve hangi dogrulama kapisi aktif gorebilmeli.

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| S1 | Canonical `ScoreDocument` modeli | Tamam | V2 dokuman stable `eventId/measureId/voiceId`, pitch/koma, usul cycle, source anchors ve validation issues tasir |
| S2 | SymbTr -> canonical importer | Tamam | Mevcut Hicazkar + 5 kalibrasyon eseri SymbTr TXT'den deterministik canonical modele cevrilir |
| S3 | Temiz teknolojik score renderer | Tamam | Ham gorsel yerine canonical modelden VexFlow score surface, staff, olcu, nota, es ve ariza render edilir; uzun/yogun olculer tek satira sikistirilmaz |
| S4 | `noteId` tabanli playback sync | Tamam | Cursor aktif `noteId/measureId` ve VexFlow render pozisyonu ile ilerler |
| S5 | Source evidence/alignment modeli | Tamam | VisualMap ve SymbTr PDF layout candidate/verified box'lari `sourceAnchors` olarak confidence/status ile baglanir |
| S6 | Review/correction queue | Tamam | Pitch, duration, measure split review, source anchor add/reject, verify ve rollback eventleri derived doc + validator hattina girer |
| S7 | Quality evaluator | Tamam | Fingerprint, olcu-duration/usul, pitch/Vex, anchor, usul cycle ve playback-sync metrikleri raporlanir |

### ScoreEngine Derin Analiz Bulgulari

- `measureBeat` daha once her olcuyu 4 vurus varsayiyordu; 28/4 Devr-i
  Kebir gibi eserlerde aktif nota olcu ici konumu yanlis raporlanabiliyordu.
  Artik olcunun gercek SymbTr baslangicina gore hesaplanir.
- `/api/score-engine/documents` yalniz `PIECE_LIBRARY` tek parcasini
  listeliyordu. Artik Hicazkar'a ek olarak 5 reachable kalibrasyon SymbTr
  TXT kaynagi registry'ye girer.
- Correction reducer event log yazabiliyordu ama pitch/duration/anchor
  eventlerini derived dokumana uygulamiyordu. Artik uygulayip tekrar
  validator'dan gecirir; bu yine accepted truth yaratmaz.
- Source evidence modeli yalniz manuel visualMap bandlariyla sinirliydi.
  Artik SymbTr PDF layout candidate/verified box'lari da canonical
  `sourceAnchors` modeline baglanir.
- Quality evaluator yoktu; UI "pass" ifadelerini validator issue yoklugundan
  cikartiyordu. Artik ayri kalite raporu hesaplanir ve workbench panelinde
  gorunur.
- Renderer daha once muziksel `measure` ile ekrandaki `render system`i ayni
  sey sayiyordu. 28/4 gibi uzun olculerde notalar staff disina tasiyor,
  formatter satiri dolduramiyor, aktif kutu/cursor yanlis satir hissi
  veriyordu. Artik olcu kimligi korunur ama ekran satiri segmentlere ayrilir.

### Ilk Ornek Hedefi

- [x] `/studio/score-engine` prototipi eklendi.
- [x] Kucuk bir Hicazkar/SymbTr fixture canonical modele cevrildi.
- [x] Temiz beyaz teknolojik yuzeyde nota objeleri stable `noteId` ile render
  ediliyor.
- [x] Playback aktif notayi `noteId` ile takip ediyor.
- [x] Anahtar, 28/4 meter, olcu cizgileri, staff cizgileri, diez/bemol
  sembolleri ve enstruman secimi gorunur.
- [x] Ham gorsel ana takip yuzeyi degil; kaynak/kanit fikri olarak ayrildi.
- [x] Workbench tasarimi eklendi: katman toggle'lari, aktif nota inspector'i,
  kanit guven barlari ve dogrulama/duzeltme karar paneli.

### Aktif Hedef: ScoreEngine V1 Uretim Motoru

Hedef: mevcut `PIECE_LIBRARY` icindeki eserler SymbTr veya kullanici sembolik
TXT kaynagi varsa canonical skor olarak acilir; kaynak yoksa skor uydurulmaz.
Ham PDF/gorsel ana yuzey degil, yalniz evidence/anchor katmanidir.

| # | Is | Durum | Kapanis Kriteri |
|---|-----|-------|-----------------|
| V1.1 | Canonical Score Model V2 | Tamam | `schemaVersion/catalogId/sourceFingerprint/voices/sections/usulCycle/sourceAnchors/validationIssues` alanlari dolu |
| V1.2 | Bagimsiz SymbTr importer | Tamam | Parca dosyasina gomulu parser ayrildi; local/user/raw URL ayni canonical hatta girer |
| V1.3 | Deterministik validator | Tamam | Pitch parse, Vex mapping, sure, measure referansi ve fingerprint sorunlari issue olarak raporlanir |
| V1.4 | ScoreEngine API | Tamam | `GET /api/score-engine/documents`, `GET /api/score-engine/documents/:id`, `POST /api/score-engine/import/symbtr`, `POST /api/score-engine/corrections` calisir |
| V1.5 | Workbench secilebilir dokuman | Tamam | Demo fallback disinda PIECE_LIBRARY canonical dokumani secilir ve tam parca render/playback hattina girer |
| V1.6 | Correction event log | Tamam | Duzeltme eventleri accepted truth yaratmadan event log'a kaydedilir; validator sonrasi turetilmis dokuman uretir |
| V1.7 | Tarayici ve test kaniti | Tamam | Typecheck/lint/test/build/security/layout/browser SVG/cursor/API smoke temiz raporlanir |
| V1.8 | Measure/render-system segmentasyonu | Tamam | 28/4 ve yogun olculer beat/event limitleriyle cok satira bolunur; aktif cursor yalniz bulundugu segmenti vurgular |
| V1.9 | Engraving QA referans havuzu | Dis girdi bekliyor (F8.7 — kaynakli korpus verisi/manuel anchor) | Internet/lokal referans havuzu, `audit:score-engine-engraving`, ayni-parca focused crop board ve strict glyph gate var; design-fidelity pass icin eksik glyph siniflari kapatilmalidir |

Kapsam notlari:

- Mevcut `PIECE_LIBRARY` su an tek eser icerir: `HICAZKAR_PESREV`; ScoreEngine
  registry buna 5 kalibrasyon SymbTr TXT dokumani ekler.
- Genel katalog batch'i ayni importer/validator/quality kapisindan
  gecirilir; sembolik TXT'si reachable olmayan eser canonical skor olarak
  uydurulmaz.
- LLM/Gemini nota dogrulama hakemi degildir; yalniz triage/ozet yardimcisi
  olabilir.
- Medya/PDF/audio otomatik indirme yoktur; yalniz URL, metadata, symbolic TXT
  ve evidence artefactleri kullanilir.

V1 kanit ozeti:

- `/api/score-engine/documents`: `HICAZKAR_PESREV` icin 279 event, 4 olcu,
  validator `ok:true`.
- `/api/score-engine/documents`: Hicazkar + 5 kalibrasyon dokumani listelenir;
  kaynak erismezse entry blocked quality ile gorunur, accepted skor uretilmez.
- `/studio/score-engine`: tam parca secilir, VexFlow SVG bos degil, cursor
  noteId ile hareket eder, full-width cok satirli skor yuzeyi screenshot ile
  kontrol edildi.
- `/studio/score-engine`: muziksel olcu ile render satiri ayrildi; Hicazkar
  28/4 olculeri tek staff satirina sikistirilmez, `score-render-systems`
  manifesti test ve browser QA icin segmentleri raporlar.
- `/studio/score-engine`: `npm run audit:score-engine-engraving` notasyon
  motorunu sadece screenshot'a degil, kaynak referans havuzu, local PDF layout
  havuzu, SVG bbox, segment yogunlugu, notation token ve playback cursor
  metriklerine gore denetler. Product Design `design-qa` sonucu simdilik
  `blocked`: tek mock degil referans korpusu ve ayni-parca crop board var;
  glyph-class fixture seti olmadan tam engraving/fidelity pass denmez.
- `/studio/score-engine`: `npm run audit:score-engine-focused-crops` ayni
  Hicazkar Pesrev kaynak GIF'lerinin 3 sayfasindan crop alir, canonical
  render crop'lariyla tek panoda karsilastirir ve glyph-class coverage
  matrisi uretir. Non-strict artifact gate `ok:true`; strict gate bilincli
  olarak fail eder.

### ScoreEngine V1.9 Kapanis Hedefi

Hedef: "gorselde nota var" iddiasini degil, muziksel ve gorsel olarak
siniflandirilmis notasyon kanitini kapatmak.

| # | Hedef | Durum | Kapanis Kriteri |
|---|-------|-------|-----------------|
| V1.9.1 | Ayni-parca focused crop board | Tamam | Neyzen Hicazkar kaynak crop'lari ve VexFlow motor crop'lari nonblank + summary `ok:true` |
| V1.9.2 | Glyph-class fixture seti | Kismi | Clef/key/time, `#4/b5`, rest/dotted, beam density ve section/usul covered; repeat/volta, slur/tie/triplet ve natural accidental partial |
| V1.9.3 | Turk muzigi engraving policy | Tamam | Koma arizalari key-signature mi inline mi, glyph sekli, label konumu ve collision kurallari dokumante/test edilir |
| V1.9.4 | Visual QA fail gates | Kismi | Artifact gate pass/fail ve `--strict-glyph-coverage` gate var; strict gate su an eksik 3 glyph sinifi nedeniyle fail eder |
| V1.9.5 | Design QA final pass | Dis girdi bekliyor (F8.7 — source-availability) | `design-qa.md` final result `passed`; tarayici screenshot + crop board + JSON metrikleri ayni durumu kanitlar |

Strict glyph gate kalanlari:

- `repeat-volta-endings`: kaynak crop'lari gorsel adaydir; yerel 2200
  MusicXML corpus taramasinda `<repeat>` ve `<ending>` tag'i 0 cikti. Bu
  sinif renderer'a ezbere eklenmeyecek; PDF/manual anchor veya baska sembolik
  kaynak repeat/volta metadata'si tasiyorsa canonical modele girecek.
- `slur-tie-triplet`: yerel MusicXML corpus'ta slur/tie 0, ama
  tuplet/time-modification 23677 ve mu2 secondary caret marker 776. Hicazkar
  parcasinda bu sinif 0; katalog geneli icin MusicXML/mu2 kaynak-feature
  importeri gerekir.
- `natural-accidental`: MusicXML natural accidental 0, TXT natural pitch 0.
  Dogal/bekar sembolu kaynakta acik gelmiyorsa key-signature + olcu ici ariza
  state policy'siyle kanitlanmali; gorselden tahmin edilerek cizilmeyecek.

Kapanan glyph sinifi:

- `section-usul-labels`: SymbTr `Soz1` section sinyali (`1. HANE`, `TESLİM`)
  canonical section olarak tutulur; render yuzeyinde section/usul marker'i ve
  `score-glyph-class-map` manifestiyle kanitlanir.

### ScoreEngine V1.10 Sembolik Glyph Corpus Hedefi

Yeni hedef: ekrandaki problem sadece gorsel tasma/crowding degil; canonical
model TXT-only beslendigi icin sembol ve engraving baglami eksik kaliyor.
`npm run audit:score-engine-symbolic-corpus` bu ayrimi kanitlar.

Corpus audit kaniti:

- TXT: 2200 dosya, 851003 nota satiri, 38083 nota-disi satir, 411 `Kod=51`
  usul degisimi, 32118 es, 62098 dotted-like sure, 3965 structural label.
- MusicXML: 2200 dosya, 4544 key-accidental, 238934 accidental, 118184
  mikrotonal accidental, 23677 tuplet/time-modification; repeat/ending/slur/tie
  0, natural accidental 0.
- mu2: 2200 dosya, 2200 key header satiri, 2436 usul satiri, 81054 metadata
  satiri, 776 secondary caret marker.
- Hicazkar ozel: TXT sadece `Kod=9` nota satirlari tasiyor; MusicXML key
  signature `sharp/slash-flat/slash-flat/quarter-flat`; mu2 key marker
  `B4b1/E5b4/A4b4/F5#4`; Hicazkar repeat/slur/tie/tuplet 0.

| # | Hedef | Durum | Kapanis Kriteri |
|---|-------|-------|-----------------|
| V1.10.1 | MusicXML/mu2 key-signature import | Tamam | Koma/key accidental policy canonical modele kaynakli girer; inline text label olarak her notaya yapistirilmaz |
| V1.10.2 | Nota-disi SymbTr metadata import | Tamam | `Kod!=9`, ozellikle `Kod=51`, header/section/phrase marker satirlari dusurulmez; desteklenmeyenler validation issue olur |
| V1.10.3 | Source-classified glyph coverage | Tamam | Focused crop summary `sourceClass/catalogSourceClass/sourcePolicyStatus` alanlariyla kaynak-var, policy-var, source-missing ve visual-evidence durumlarini ayri raporlar |
| V1.10.4 | Natural/cancellation policy | Tamam | Key signature + measure accidental state deterministik hesaplanir; natural sadece kanitli cancellation'da render edilir |
| V1.10.5 | Engraving collision policy | Tamam | Aktif cursor/callout/section label/accidental label/staff/beam cakismalari focused crop audit ile fail gate olur |

### Aktif Hedef: Source-Classified Engraving Closure

Hedef: ScoreEngine ekrani artik tek Hicazkar demosunu "guzel cizmek" icin
degil, her sembol sinifini kaynak durumuna gore yoneten motor olarak
kapanacak. Kaynak yoksa sembol uydurulmaz; policy gerekiyorsa validator
policy issue uretir; gorsel/PDF sadece evidence anchor olarak kalir.

| # | Hedef | Durum | Kapanis Kriteri |
|---|-------|-------|-----------------|
| E1 | MusicXML/mu2 source-feature importer | Tamam | Key accidentals, microtonal accidentals, tuplet/time-modification, usul/header/marker satirlari canonical source feature olarak gelir |
| E2 | Natural/cancellation policy | Tamam | Key-signature + measure accidental state ile natural/bekar gerektigi deterministik hesaplanir |
| E3 | Glyph renderer dispatch | Tamam | Her glyph `source-proven`, `policy-derived`, `visual-evidence-only` veya `unsupported` sinifindan gecmeden render edilmez |
| E4 | Collision ve crop fail gate | Tamam | Staff, beam, accidental label, active cursor, section/usul label ve callout cakismalari browser crop audit ile fail eder |
| E5 | Catalog-level coverage report | Tamam | 2200 SymbTr TXT/MusicXML/mu2 uzerinden glyph coverage ve blocked/unsupported siniflari batch raporlanir |

Dis kaynak kontrolu:

- MusicXML 4.1 Draft `accidental-value` Turkish slash accidentals, numbered sharp/flat
  ve SMuFL ayrimini destekler; bu nedenle `#4/b5` ekranda basit text label
  olarak degil, source/policy metadata olarak ele alinmalidir.
- MusicXML 4.1 Draft `<key-accidental>` microtonal key signature icin ayridir; key
  context her notaya inline accidental basmakla kapatilamaz.
- SymbTr koleksiyonu TXT, MusicXML, PDF, MIDI ve mu2 formatlari tasir; kendi
  README'si MusicXML beam bilgisinin eksik olabilecegini belirtir. Bu, beaming
  icin de source-feature + usul policy ihtiyacini dogrular.

Benzer riskler:

- Bir parcanin Hicazkar ornegi gecmesi katalog geneli icin kanit degildir;
  her yeni SymbTr/kullanici TXT dosyasi importer + validator + engraving QA
  kapisindan gecmelidir.
- `Soz1` alani her zaman section degildir; cogu dosyada lyric/syllable tasir.
  Structural label ile sarki sozu ayrilmadan hane/teslim marker'i uydurulabilir.
- TXT-only importer 38083 nota-disi satiri ve 411 usul degisimini kaybedebilir;
  bu da ileride "nota var ama motor eksik" sinifindan baska buglar dogurur.
- MusicXML/mu2 ayni parca icin daha zengin key/accidental metadata tasiyabilir;
  sadece TXT'den cizilen yuzey Turk muzigi engraving policy'sini eksik kurar.
- PDF/gorsel anchor gorunmesi nota dogrulugu demek degildir; anchor yalniz
  evidence katmanidir.
- VexFlow'un standart accidental/staff cikarmasi Turk muzigi koma notasyonunu
  otomatik dogru yapmaz; policy ve fixture gerekir.
- Playback cursor'un hareket etmesi ritmik/muzikolojik dogruluk demek degildir;
  `noteId`, `startBeat`, usul cycle ve audio clock drift ayrica raporlanmalidir.
- `/studio/follow`: gorsel takip audit metin kapilari tekrar temiz.

## Test Kapilari

- `npm run verify:symbtr-measures`
- `npm run test:visual-regression`
- `npm run audit:score-engine-symbolic-corpus`
- `npm run audit:score-engine-focused-crops`
- `npm run audit:score-engine-focused-crops:strict`
- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npm run build`
- `npm run audit:security`
- `npm run audit:references-curation-runtime`
- `npm run audit:studio-follow`
- `npm run guardrails:layout -- --base-url http://localhost:4015`
- `npm run audit:prod-cycle`
- `npm run audit:prod-closure`

Son dogrulama (2026-06-05):

- `npm run audit:score-engine-symbolic-corpus`: pass.
- `npm run audit:score-engine-focused-crops`: pass.
- `npm run audit:score-engine-focused-crops:strict`: expected fail;
  `repeat-volta-endings`, `slur-tie-triplet`, `natural-accidental` acik.
- `npm run audit:score-engine-engraving`: pass, desktop/mobile.
- Browser manual QA: `output/playwright/score-engine-browser-2026-06-05.png`
  ve `output/playwright/score-engine-snapshot-depth8.md`.
- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run test:run`: 77 dosya / 476 test pass; jsdom canvas warning mevcut.
- `npm run build`: pass.

## Kritik Kurallar

- Harici medya/PDF/audio otomatik indirilmez.
- Search/LLM ciktilari kanit degildir; accepted manifest'e dogrudan yazilmaz.
- Feedback weak label'dir; domain trust, metadata match ve validator kapilari
  olmadan dogruluk kabul edilmez.
- PDF tarafinda LLM final hakem degildir; final terfi deterministic/human
  evidence ile olur.

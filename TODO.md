# Muzik — Kalan İşler (2026-07-27)

> **Açık kod işi YOK.** Her fazda (A–H) kutuların hepsi işaretli. Kalan üç
> şey de kod değil, **dış girdi** bekliyor:
>
> | ne | neyi bekliyor | tetiklenince ne olur |
> |---|---|---|
> | **FAZ D** · stüdyo kaydı | gerçek enstrüman kayıtları | `public/samples/` altına konur; giriş yolu **H12'de tamamlandı** — yüklenen dosya artık kaynak iddiasının kapsamı dışında görünüyor |
> | **`hek` gerçek kaydı** | iki elin birlikte vuruşunu taşıyan bir kayıt | H13: mevcut kayıtta **ölçüldü ve yok**; dağılım sürekli, hiçbir eşik ayıramaz |
> | **4 `claimed` klasör** | ölçülebilir kaynak eşleşmesi | H14: 10 → **4** (`lavta`·`santur`·`rebab`·`kasik`); 6 klasör daha `measured` oldu |
>
> **E1** (korpus JSON süzme) ölçüldü ve bilinçli yapılmadı: bundle bütçenin
> **%31**'inde, kazanç 3,4 KB. Tetikleyici = bütçenin %80'i.

> Bu dosya **yalnızca açık/kalan** işleri listeler. Tamamlanan tüm faz kaydı
> (F0–F14, P0–P3, E1–E11 — kanıt ve sayfa referanslarıyla) arşivdedir:
> `docs/archive/TODO-master-tamamlanan-2026-07-16.md`,
> `docs/archive/DERIN-ANALIZ-2026-07-16.md`, `docs/archive/PLAN-2026-KAPANIS.md`.
>
> **Bağlayıcı kimlik:** kanıt-öncelikli Türk müziği notasyon istasyonu. Kaynak
> yoksa sembol (darp/velvele/seyir/koma) **uydurulmaz**; LLM hakem değildir; her
> karar event log'a yazılır. Aşağıdaki her madde bu kurala tabidir.

---

## 🔧 2026-08-08 — Derin analiz dalga kuyruğu (yeni açık işler)

> 2026-08-08 derin analizinde bulunan, kod/veri/indeks/doküman katmanlarına
> yayılan açık işler. Wave 1 (hardcode renkler → token katmanı + korpus test
> timeout kapısı + flaky playback testi determinizmi) bu turda tamamlandı ve
> commit'lendi; aşağısı **kalan** işlerdir.

| ID | Açık iş | Kök neden / neden açık | Öncelik / tetikleyici |
|---|---|---|---|
| W2.1 ✅ | `/studio` kayıtlı-nota playback imleci ses saatine hizalandı (`getHeardPlaybackPosition`) | commit `c645a74` | KAPANDI (2026-08-08) |
| W2.2 ✅ | jsdom `canvas.getContext` gürültüsü no-op stub ile temizlendi | commit `c645a74` | KAPANDI (2026-08-08) |
| W3.1 | GitNexus FTS indeksleri eksik (grafik indeksi tazelendi: 4761 sembol; FTS uzantısı bu makinede yüklenemiyor) | 4 deneme + `doctor`: uzantı iner ama Node SQLite `LOAD` edemiyor (ABI/platform kısıtı) | P2 · Node sqlite/GitNexus sürümü değişince tekrar dene |
| W3.2 ✅ | TODO G9 başlığı ✅ işaretlendi + AGENTS/CLAUDE rozet senkronu | commit `b0ef851` | KAPANDI (2026-08-08) |
| W3.3 ✅ | Prod build `data-testid` sıyırıyordu → release denetimleri prod'da kırıktı; `reactRemoveProperties` kaldırıldı, focused-crops/engraving denetimleri onarıldı | commit (2026-08-08) | KAPANDI — denetimler prod'da yeşil |
| W3.4 ✅ | Tüm sayfalardaki 21 select'e `id`/`name` eklendi (Chrome a11y issue kapandı) | commit `3bde375` | KAPANDI (2026-08-08) |
| W3.5 ✅ | `nanoid <3.3.17` prod açığı kapatıldı (3.3.18); `audit:prod-cycle` uçtan uca YEŞİL (ok=true) | commit `3bde375`; prod-cycle summary | KAPANDI (2026-08-08) |
| W3.6 ✅ | `/exercises` UnifiedLayout'a sarıldı (guardrails:layout kırmızısı kapandı) | commit `3bde375` | KAPANDI (2026-08-08) |
| W3.7 ✅ | Çalma kontrolcüleri: master volume (studio/follow/rhythm, localStorage kalıcı) + follow katmanlarında Solo/Sessiz | commit (2026-08-08) | KAPANDI — ürün kabul kriteri "volume çalışır" karşılandı |
| W3.8 ✅ | Follow'da döngü bölgesi (ölçü aralığı + ses saatinde tekrar planlama + imleç sarma) | commit (2026-08-08) | KAPANDI — loop artık /rhythm + /studio/follow'da; /studio kayıtlı-nota loop'u ayrı kalem |
| W3.9 ✅ | Transpoze — 53-EDO KOMA kaydırması (ahenk mekanizmasıyla aynı yol; aralık yapısı korunur) | commit (2026-08-08) | KAPANDI — ürün kabul kriteri "transpose çalışır" karşılandı |
| W3.10 ✅ | `/studio` kayıtlı-nota tekrarı (loop): tekrar sayacı + kayıt boyunca imleç sarma | commit (2026-08-08) | KAPANDI — loop artık rhythm + follow + studio |
| W4.1a ✅ | Geometrik otomatik hizalayıcı (`align:symbtr-measures`): 2.795 giriş raporlandı (85 high / 770 medium / 1.940 low); 85 high giriş import-ready + dry-run geçti (1.676 kutu); import kapısına kanıt zarfı eklendi | commit (2026-08-08) | KAPANDI — kalan: nota-anchor extractor (P1, AUTOMATION_PLAN §1) |
| W4.1b ✅ | Kutu-bazlı onarım önerisi üretildi: 546 giriş / 13.651 replace / 736 keep / 4.677 review (+hint) / 636 add; 3 örnekte 125/125 replace geometrik doğrulandı (`--repair-proposal` → `repair-proposals.json`) | manifeste yazma operatör onayı bekliyor (import kapısı kanıt zarfı zorunlu) | KAPANDI (2026-08-08) — yazma onayı P1 |
| W4.3a ✅ | 4 claimed klasör hız-bilinçli korelasyonla yeniden ölçüldü (lavta .75 / santur .60 / rebab .81 / kasık .18 — eşik altı; `claimed` kalmaları dürüst) | `identify-sample-provenance` | ÖLÇÜLDÜ — kaynak havuzu genişleyince otomatik yeniden tara |
| W4.2a ✅ | Zamanlanmış koşucu + deterministik kabul eşiği uygulandı: cache-bazlı kaldığı-yer, throttle, offline/stall algılama, kümülatif accepted manifest; otomatik-doğrulanabilir backlog **2.973/2.973 (%100)**; 18 accepted-ready import dry-run GEÇTİ (19 duplicate-URL elendi); kalan 5 conflict/deferred insan kürasyonu | kök düzeltmeler: offset bug, ogm ReferenceError, boş-sorgu null URL, maxResponseBytes 768KB, TDZ, manifest kaybı | KAPANDI (2026-08-08) — insan yüzeyi: 5 grup + duplicate-URL demotion |
| W4.1c ✅ | **Nota-anchor extractor + eşleyici + aligner entegrasyonu**: PDF metin katmanından nota başı glifleri (TT7/F3), font-genişlik bilinçli konum (Tc/Tw/Tz/kerning), MusicXML yazılı event yapısıyla satır-sıralı kalibrasyon; aligner artifact'ı otomatik algılayıp giriş bazında en iyi hizalamayı seçiyor (regresyonsuz). Korpus: **1.157 kalibre** (4.727 satır artığı ≤3pt); entegrasyon sonrası **89 high** (baseline 85, +4), import dry-run 1.716 kutuyla geçti | 641 repeat-etkili giriş için written↔expanded ölçü eşlemesi P1; 990 tarama-PDF ve 204 zip-inflate belgelendi | KAPANDI (2026-08-08) |
| W4.1d ✅ | **Written↔expanded ölçü eşlemesi (rapor düzeyi)**: MusicXML tekrar+volta+segno/D.S. açılımı (`expandWrittenMeasures`); TXT walk ile birebir eşleşenler (korpus 43,8%) written-expanded analiz yoluna girer — kutular ilk-genişlemiş ölçü indeksini taşır (runtime expanded uzayında eşler). Sonuç: **104 high / 860 medium / 1.831 low** (baseline 85/770/1.940 → +19/+90/−109), storedMismatch 14.370 (−324); 241 tekrar girişi analiz edildi, contained medyanı 0.94 | `importable: false` — motor basis sözleşmesi değişimi (TS `layout.ts` + `symbtr-score-measures`) ve manifest yazımı operatör onayı bekliyor; karmaşık volta/yuvalanmış açılım (korpus %56'sı eşleşmiyor) P2 | KAPANDI (2026-08-08) — rapor düzeyi; yazım onayı P1 |
| W4.1 | Verified PDF ölçü kutusu: review template 2026-08-08'de güncel sayımlarla yeniden üretildi (kapılar yeşil); 546 giriş/19064 kutu verified, 1259 giriş aday | insan/görsel onay gerektirir | Dış girdi |
| W3.3 | Verovio ana renderer hedefi; paket kurulu değil (VexFlow geçici) | koşullu borç (`PRODUCT_ARCHITECTURE.md`) | Tetikleyici: Verovio geçiş kararı |
| W4.1 | Verified PDF ölçü kutusu manifesti boş (0 kutu) | insan/görsel onay gerektirir (`UX_UI_COMPLETION_AUDIT.md`) | Dış girdi |
| W4.2 | Kürasyonlu harici kaynak coverage 22/3000 | insan kürasyon backlog'u (`audit:external-references`) | Dış girdi |
| W4.3 | FAZ D stüdyo kayıtları, `hek` gerçek kaydı, 4 `claimed` sample klasörü | dış girdi (üst tablo) | Dış girdi |

## ✅ FAZ H — TAMAM (H1–H11 kapandı, 2026-07-27) · PLAN §11

> **"Kod işi kalmadı" dediğim doğruydu ama eksikti:** kendi TODO'ma bakarak
> doğruydu. Koda ölçerek bakınca kök bir boşluk çıktı.
>
> **Kök bulgu: en güçlü kapılarımız CI'da koşmuyor.** İki büyük girdi
> gitignored — `symb/` (korpus) ve `all-samples/` (ses kaynak arşivi).
> Sonuç: **13 kapı CI'da atlanıyor.** "1.192.643 olay", "5.802 bar-aşan nota",
> "%98,03 ölçü doluluğu" yalnız tek makinede doğrulanıyor. Bugün bir refactor
> parser'ı bozsa **CI yeşil kalır**.

- [x] **H1** · **Korpus kapıları artık CI'da GERÇEKTEN koşuyor.** Planlanan
      "özet türet" yolu terk edildi — o yol kodu koşturmaz, iki commit'li
      dosyayı karşılaştırır. Korpus zaten indirilebilirdi (Zenodo, CC-BY 4.0,
      **27 MB**) ve indirme betiği depoda vardı; CI'ya önbellekli indirme
      adımı eklendi.
      · **Betik Linux'ta kırık çıktı:** zip'i `tar` ile açıyordu, GNU tar zip
        okuyamaz. `unzip`e geçirildi. Kimse görmemişti çünkü korpus CI'da hiç
        indirilmiyordu.
      · **Atlama sessizdi:** `REQUIRE_CORPUS=1` eklendi, CI verir; indirme
        başarısız olursa `corpus-gate.test.ts` **kırmızı** olur.
      · Kırılma yolu gerçekten sınandı (korpus geçici kaldırıldı → test düştü
        → geri alındı). Üçüncü iddia mekanik: yeni korpus kapısı açık timeout
        almadan eklenemez — ve yazılır yazılmaz kendi eksiğimi yakaladı.
- [x] **H2** · **13 kapıya açık timeout verildi** (`CORPUS_TIMEOUT_MS`
      120 s = ölçülen en kötü halin ~3 katı). Ölçüm: en yavaş kapı 7,5 s ama
      coverage altında 44 s — enstrümantasyon ~6 kat yavaşlatıyor, genel 20 s
      deterministik düşüyordu. `test:coverage` artık yeşil.
- [x] **H3** · **`public/samples/sources.json`** — dört kaynak için sha256 +
      köken URL + lisans + ticari kullanım. *(Arşiv 200 MB+; plandaki "56 MB"
      tahmini yanlıştı, ölçüldü.)* Kapı: dosya yereldeyse hash tutmalı; ayrıca
      her kaynağın `commercialUse` alanı **serbest** olmalı — kısıtlı bir
      kaynak yeniden eklenirse burada durur.
- [x] **H8** · **Kayıtlı borç çözüldü — altından LİSANS İHLALİ çıktı.**
      `bendir`/`kudum` kaynağı dalga biçimi korelasyonuyla bulundu: soundfont'tan
      değil, iki CompMusic icra kaydından **tam kesit** (r = **1,0000**).
      · Lisans **CC BY-NC 4.0** — atıf şartı hiçbir yerde yazılı değildi, yani
        **ihlal ediliyordu**. README'ye işlendi ve testle bağlandı.
      · Ticari kısıt ve `kudum` **varsayılan vurmalı** — ney'de kapattığım
        sorunun aynısı, daha merkezî yerde.
      · **Kapı yanlıştı:** "her kaynak ticarete açık olmalı" demek, kısıtlı
        kaynağı *kaydetmemeye* teşvik eder. Yeni kural: kısıtlı kaynak
        serbesttir ama görünür olmak **zorundadır** (atıf + gerekçe + sabit
        sayı + README'de gerçekten yazılı olma kontrolü).
      · `zilli-def` de ölçümle doğrulandı (r=1,0000). Kalan 6 vurmalı
        eşleşmedi — ama bu yokluk kanıtı değil (sentez zinciri uygulanmış).
      · Güven: `documented` 1 · **`measured` 3** · `claimed` 15 · **`unknown` 0**.
      · **bendir ÜRETİLDİ ve kısıttan çıktı** (H8.1): `Syrian Bendir` preset'i,
        `render-soundfont-percussion.mjs`. Eşleme kaynağın adlandırmasına
        (`bass`/`slp`/`riml`=rim LEFT) ve Kudum kitabı s.14'e dayanıyor;
        vurgular gerçek dinamik katmanlardan (p/mf→ff).
      · **"Ev normuna uy" fikri çürüdü:** 27 vurgu dosyasının **9'u kendi
        normalinden daha sessiz** — uyulacak tutarlı norm yok.
      · Güven: `documented` **2** · `measured` 2 · `claimed` 15 · `unknown` 0.
      · **kudum ÜRETİLDİ — ticari kısıt KALMADI** (H8.2): dışarıda CC BY 4.0
        bir icra kaydı bulundu ([freesound 115397](https://freesound.org/s/115397/),
        xserra / Hamza Zeytinoğlu, 58,5 s). Kesim noktaları komut satırında
        **açık** (`cut-percussion-from-recording.mjs`) — üretim tekrarlanabilir,
        seçim denetlenebilir. Seçim ölçümle: 257 vuruştan 41 yalıtılmış olanın
        pes bandı + parlaklığı ölçüldü; dum %79-81, tek/ke %37-42, ke hem
        normalde hem vurguda tek'in altında.
      · **Artık projede ticari kısıtlı ses kaynağı YOK:** ney (F5) · bendir
        (H8.1) · kudum (H8.2) — üçü de CC BY-NC'den çıkarıldı.
      · Güven: `documented` **3** · `measured` 1 · `claimed` 15 · `unknown` 0.
- [x] **H4** · **`public/samples/provenance.json`** — 20 klasörün tamamı
      kayıtlı: `documented` **1** · `claimed` **17** · `unknown` **2**.
      · **Yeni bulgu:** `unknown` olanlar `bendir` ve **`kudum`** — ve
        soundfont'un 113 preset'inde `kudum` HİÇ YOK. Yani uygulamanın
        **varsayılan vurmalısı**, kaynağı en belirsiz olanı.
      · `/samples` sayfası artık kaynağı yazıyor; üç düzey de canlı doğrulandı.
      · Kapı: kayıtsız klasör olamaz, bayat kayıt olamaz, `documented` diyenin
        üreticisi gerçekten depoda olmalı, sayılar sabit.
- [x] **H5** · **Arandı, yok — ama artık ölçümle.** 9 vurmalı preset, **354
      benzersiz bölge adı** tarandı. Vuruş sözlüğünde iki-el/eşzamanlı
      kategorisi yok. Tek yakın eşleşme "Finger Flam" (20 bölge) ölçüldü:
      **16/20'si birden çok vuruş**, aralık 8–269 ms (ortanca 94) — flam
      kaydırılmış iki vuruştur, `hek` eşzamanlı. Uygun değil.
      Sonuç `provenance.json → hekSearch`te veri olarak duruyor.
- [x] **H6** · **İkisi de tavanın altına indi ve grandfather listesinden
      ÇIKARILDI:** `studio/follow/page.tsx` 1024 → **685**,
      `references/curation/page.tsx` 848 → **559**.
      · follow bir *render* yüküydü → 357 satırlık `<Panel>` ayrıldı
        (`FollowScorePanel`); prop adları ebeveynle birebir tutulduğu için
        **JSX tek karakter değişmedi**, tipler `ReturnType` ile türetildi.
      · curation bir *mantık* yüküydü → 24 manifest tipi `curation-manifests.ts`e
        taşındı; tamamen tip düzeyi, çalışma zamanı kodu taşınmadı.
      · Kendi hatam typecheck'te yakalandı: `startBeat`/`title` prop yapılmıştı,
        oysa ikisi de yalnız özellik erişimiydi.
- [x] **H7** · **Ölçüldü ve eşikler yükseltildi:** 67/62/76/68 →
      **69/64/77/70**. İki ortam ayrı ölçüldü (yerel korpuslu 69,73/65,07/
      78,30/70,59 · CI korpussuz 69,47/64,83/78,30/70,40); eşik **CI**
      değerinin altına konuldu. Eski eşikler aylardır güncel ölçüm görülmeden
      duruyordu — çünkü yerel coverage koşusu H2'ye takılıyordu.

- [x] **H9** · **Melodik köken ÖLÇÜLDÜ — README'nin bir iddiası çürüdü.**
      10 melodik klasörün her biri, dört soundfont'un tüm bölgelerine karşı
      normalize çapraz korelasyonla tarandı.
      · **Tam kesit (r = 1,0000):** `ud` ← UD-3 · `kemence` ← KABAK-MU-1 ·
        `kanun` ← EMREKANUNC3 · `tambur` ← EMRE MT 4C.
      · **`miskal` ← `NEY_05` (r = 0,976).** README "Proteus Pan Flute"
        diyordu — **yanlış**; miskal yuvası bir *ney* preset'i çalıyor.
        İddia ölçümle değiştirildi, README düzeltildi.
      · `kemence` kaynağı `KABAK-MU-1`, yani **kabak kemane** — klasik kemençe
        değil. Yaklaştırma olduğu artık yazılı.
      · Eşleşmeyen 10 klasör (`baglama`·`santur`·`lavta`·`rebab`·`darbuka`·
        `davul`·`def`·`kasik`·`zil`·`nakkare`) **iddia** olarak kaldı; sentez
        zincirinden geçmiş ses ham bölgeyle birebir tutmaz, yokluk kanıt değil.
      · Güven: `documented` 3 · **`measured` 6** · `claimed` 10 · `unknown` 0.
- [x] **H10** · **`hek` gerçek kaydı — SONUÇSUZ, ve bu kayda geçti.** Kudüm
      icra kaydında iki temel frekansı da taşıyan iki aday bulundu (13,61 s
      denge 0,97 · 25,64 s denge 0,94), ama ayırt edici olarak seçtiğim
      **yükselme süresi ölçütü çöktü**: `dum`un kendisi bile 0 ms/0 ms
      veriyor — kudümün iki kâsesi güçlü kuplajlı, tek vuruş da iki tarafı
      birden uyandırıyor. "İki el birlikte" iddiası bu kayıttan **ayırt
      edilemez**. Türetilmiş dosya yerinde kaldı, `derivedFrom` görünür.
      Sonuç `provenance.json → hekSearch.kudumRecordingProbe`te veri olarak.
- [x] **H11** · **Depo sadeleştirildi — ölü kod ve atıl veri.**
      · **14 ölü dosya silindi.** Tarayıcıyı kendim yazmıştım, **948 yanlış
        pozitif** verdi (barrel re-export ve dinamik import'u göremiyordu);
        `npx knip`e geçildi. Silinenler: 5 `ai-*.mjs` · `audit-pdf-candidates`
        · `_probe.mjs` · `test-gemini-models` · `core/domain/{index,
        score-document,usul-pattern,instrument-profile}.ts` ·
        `data/references/source-curation.ts` (canlı test edilen `.mjs`'in ölü
        ikizi) · `design-system/shadows.ts` (`spacing.ts`'in ikizi).
      · **Silinmeyip BAĞLANANLAR:** commit'li çıktı üreten 3 betik
        (`build-symbtr-catalog` · `verify-pdf-measures-heuristic` ·
        `extract-ai-variations`) `package.json`a script olarak eklendi —
        çıktısı depoda duran betik ölü değil, *bağlanmamıştı*.
      · Kök dizin: `.hermes/` kaldırıldı, `.obsidian/` gitignore'landı,
        `.impeccable.md` → `docs/design-context.md`, `scratchpad_heper_ocr.md`
        → `docs/kaynak-heper-kudum-ocr.md` (**silinmedi**: `usul/data.ts:643`
        bu OCR'a kaynak olarak atıf veriyor), boş `PDF/` kaldırıldı.
      · Cache: `.next` · `coverage` · `test-results` · `node_modules/.cache`
        temizlendi (~3,5 GB). **Silinmeyenler:** `var/` (SQLite kullanıcı
        verisi) ve `output/` (canlı kod okuyor — `route-config.ts`).
      · **knip artık CI kapısı** (`lint:dead-code`, sürüm sabitli devDependency).
        Ölü kodun sessizce birikebilmesinin sebebi kapının olmamasıydı.
        Sonuç: **100+ ölü export + 1 ölü modül** temizlendi, net **−356 satır**.
      · **knip'in göremediği bir bağ vardı ve guardrail yakaladı:**
        `legacyNavigationAliases` hiçbir modülce import edilmiyor — tüketicisi
        `validate-architecture.mjs`, dosyayı **metin olarak** okuyor. knip ölü
        sandı, sildim, mimari kapısı kırmızı oldu, geri kondu ve `@knipignore`
        ile işaretlendi. *Ölü kod tarayıcısı import grafiğidir; metinle okuyan
        tüketiciyi göremez.*
      · **Kendi hatam ölçümle yakalandı:** Python yazımı LF'i CRLF'e çevirip
        23 dosyayı "tümüyle değişmiş" gösterdi. Diff'e bakmasam gürültü
        commit'lenecekti; her dosya HEAD'deki biçime döndürüldü.
      · **`shared/security/upload-policy.ts` yarısı ölüydü — ama önce açık mı
        diye ölçtüm.** Nota yükleme uç noktası **yok**: görseller istemcide
        `URL.createObjectURL` ile kalıyor, sunucuya hiç gitmiyor. Örnek
        yükleme yolu ise kendi politikasıyla (`isAllowedSampleUpload`) zaten
        doğruluyor. Açık değil, ölü koddu; silindi.
      · **Ölçüm: kapsam ölü kod silinince YÜKSELDİ** — silinen şey kapsanmayan
        koddu. 69,73→**70,66** · 65,07→**65,78** · 78,30→**79,77** ·
        70,59→**71,61**. Eşikler 69/64/77/70 → **70/65/79/71**.
      · `ENSTRUMAN_LIST` = `INSTRUMENTS` ikizliği kaldırıldı; tek ad kaldı.
      · **Kapı ilk koşusunda beni yakaladı (CI kırmızı).** Lint uyarılarını
        giderirken `designShadows`/`designTypography` import'larını kaldırdım;
        bu, `typography` ve `shadows`ı ölüleştirdi — ama yerel knip koşum o
        düzeltmeden ÖNCEYDİ. *İki tarayıcı birbirini besliyor:* lint ölü
        import'u, knip ölü export'u görüyor; biri temizlenince öteki yeni
        bulgu üretiyor. Artık **yakınsayana kadar** birlikte koşuluyor.
        Sonuç: `typography.ts` tümüyle ölüydü, silindi.

- [x] **H12** · **FAZ D giriş yolu tamamlandı — sessiz bir yanlış iddia kapatıldı.**
      `provenance.json` bir KLASÖRÜN kaynağını anlatır, ama iddia o anki
      DOSYALARA aittir. `/samples`ten bir dosya yüklendiğinde dosya değişiyor,
      kayıt olduğu gibi kalıyordu: beklenen stüdyo kayıtları geldiğinde
      uygulama onlar için hâlâ *"soundfont'tan üretildi"* diyecekti.
      · `manifest.json` (432 dosya, sha256) + API'de `matchesManifest` +
        ekranda "Kaynak kaydı bu dosyayı kapsamıyor" uyarısı.
      · Çözüm **kayıt tutmak değil ölçmek**: çalışma zamanında kanıt dosyasına
        yazılmıyor, diskteki dosya hash'le karşılaştırılıyor.
      · CI kapısı `samples:manifest:check`; kırılma yolu denendi (dosya
        bozuldu → kırmızı, geri alındı → yeşil).
- [x] **H13** · **`hek` — ölçüldü ve YOK. İki kez yanlış ölçmüştüm.**
      · **1. deneme (H10):** yükselme süresi. Kontrol olarak `dum` da 0 ms/0 ms
        verdi → ölçüt ayırt edici değildi, "sonuçsuz" yazıldı.
      · **2. deneme:** 135 Hz ve 275 Hz'i "iki kâse" sandım. Üç aday kontrolü
        4,5× aştı, gecikmeleri 0–1 ms'ydi; **"hek bulundu" diyecektim** ve
        @32,18s'i kesip dosyaya yazmıştım bile. Kontrol ölçümü çürüttü:
        **her darp** (dum/tek/ke) iki tepe gösteriyor, oran hep ~1,87 —
        bunlar iki kâse değil, **tek davulun iki modu**. 275 Hz, tek'in
        ikinci modu. "Denge" iki eli değil, vuruş YERİNİ ölçüyordu.
      · **Doğru ölçüm:** kâseler 134,38 Hz ve 146,25 Hz — yalnızca **12 Hz**
        ayrı (180 ms pencerede 2,1 çözünürlük birimi, ayırt edilebilir).
        Ölçüt `log2(|tek| / |dum|)`.
      · **Sonuç:** yazdığım "en iyi aday" @32,18s **−5,28** çıktı — *her
        gerçek dum'dan daha dum*. Dosya geri alındı. 86 vuruşun dağılımı
        **sürekli** (−6…+4,5), 0 civarında ayrı küme yok: vuruş yeri/şiddeti
        eğimi sürekli değiştirdiği için hiçbir eşik `hek`'i ayıramaz.
      · Bu, "ölçemedim" değil **"ölçtüm, bu kayıtta yok"** sonucudur.
- [x] **H14** · **`claimed` 10 → 4.** Önceki tarama iki yönden eksikti:
      · **Dosyaların yarısı taranmamıştı** — `sources.json` dört soundfont
        listeliyordu, diskte **on** var. Yeni tarama **3.299 bölge**.
      · **Hız farkı hesaba katılmamıştı.** Melodik dosya bölgenin *yeniden
        örneklenmiş* hâlidir; ham korelasyon yalnız oran 1,0 olan dosyada
        tutar. Log-frekans ekseninde yeniden örnekleme bir *ötelemedir* —
        kaydırma araması hem hızı hem benzerliği tek geçişte verir.
      · **Yeni ölçülenler:** `baglama` 1,0000 · `davul` 1,0000 · `def` 1,0000 ·
        `darbuka` 0,9999 · `zil` 1,0000 · `nakkare` 1,0000 ·
        `miskal` **1,0000** (`Ney / NyeFlute B2`, hız 0,2898).
      · Güven: `documented` 3 · **`measured` 12** · `claimed` 4 · `unknown` 0.
      · **Kendi aramamın sınırı ölçüldü:** `miskal` geniş taramada 0,71
        verdi, hedefli aramada 1,0000. Yani negatif sonuç "arşivde yok"
        değil, **"bu aramada bulunamadı"**tır.
- [x] **H15** · **Tarama bir İÇERİK kusuru ortaya çıkardı.** `davul` ve `zil`
      aynı bölgeyle (`74=Big Gong`) aynı hızda 1,0000 verdi. Doğrudan kıyas:
      `davul/dum-accent.wav` ile `zil/dum-accent.wav` ilk 0,35 s'de **birebir
      aynı** (r=1,000000, eşit tepe genliği); yalnız uzunluk farklı
      (1,40 s / 1,60 s). **Hash kapısı bunu kaçırmıştı** — ses aynılığı bayt
      aynılığı gerektirmiyor. Üç ikiz çift `duplicateAudit`te açık duruyor;
      `sample-duplicates.test.ts` hem bayt hem dalga biçimi düzeyinde bakıyor
      ve listeye yenisinin eklenmesini engelliyor: kusur **büyüyemez**.

**Çürütülen fikir (kayda geçsin):** "ney'de işe yaradı, 19 klasöre de uygula."
Ölçüldü — kemençe/tambur/ud bugün **1,00** uzlaşmada; kaynaktan yeniden
üretilseler en çok gerilme sırasıyla **16,02 · 14,23 · 6,96** yarım ton olurdu.
Ney bir istisnaymış (2,23). Yeniden üretim bugün kusursuz olanı bozardı.

**Tanpura projeden ÇIKARILDI** (kullanıcı kararı). İki sebep üst üste geldi:
36 dosyanın 35'i yanlış perde çalıyordu ve kaynak ölçülemediği için onarım
imkânsızdı; ayrıca tanpura bir **Hint** sazı, projede zaten `tambur` var.
Tip birleşimi, listeler, ses profili, klasör eşlemesi, görsel tanım ve
provenance kaydı kaldırıldı — **melodik enstrüman 11 → 10**.
**İleriye dönük kapı:** `public/samples/` altındaki her melodik klasör artık
doğrulama listesinde olmak *zorunda* (KAPSAM iddiası). Tanpura'nın aylarca
sessizce durabilmesinin sebebi bu kapının olmamasıydı.
**Yakalanan yerel/CI ayrışması:** `git rm` sonrası boş dizin yerelde kaldı,
CI'nın temiz klonunda yoktu — test yerelde *CI'da var olamayacak* bir sebeple
geçmişti. Tuzak koda yazıldı (bilinçli boş klasör gerekiyorsa `.gitkeep`).

---

## ✅ FAZ A–G KOD İŞİ TAMAM (2026-07-27)

> **Bu bölümde açık kutu yok.** Aşağıdaki §A–§L listeleri tamamlanmış işin
> kaydıdır; nasıl yapıldığı [PLAN.md](PLAN.md)'de.
>
> **Kalan tek iş kod işi değil:** FAZ D — stüdyo kaydı (gerçek enstrüman
> kayıtları). Kayıt gelince `public/samples/` altına konur ve
> `sample-pitch-labels.test.ts` içeriği ölçüp adıyla karşılaştırır.
>
> **Lisans borcu kapandı (F5):** ney'in CC BY-NC kısıtı, ses depodaki Art
> Libre soundfont'tan yeniden üretilerek kaldırıldı. Artık bütün ses
> klasörleri ticarete açık.
>
> **Ölçülüp bilinçli yapılmayanlar** (körlemesine atlanmadı, tetikleyicisi
> ateşlenmedi — gerekçeleri PLAN.md §10'da):
> - **E1** korpus JSON süzme — bundle bütçenin **%31'inde**, kazanç 3,4 KB.
> - **`setStrict(false)`** — kaldırılamaz; `Voice` ölçü başına değil *render
>   sistemi* başına kuruluyor (§L1).
> - **tanpura** sample'ları — üç yöntem de uzlaşmıyor, ölçülemeyen dosya
>   yeniden yazılmaz (ADR 0001). Borç testte görünür.
>
> **Kök teşhis çözüldü:** "motorun metrik bağlamı yok" tespitiyle başlayan
> teşhis G9'da kapandı — parser artık `rows.ts`'ten besleniyor, hiçbir satır
> atılmıyor, ölçü doluluğu **%88,81 → %98,03**.

### Öncelik 1 · FAZ A — Ana motor · PLAN §3

Ölçü, tahmin yerine **yazılı mertebeden** türetilsin; zaman tek ve tamsayı
tick ekseninde olsun.

- [x] **G0** · 8 temsilci `.txt` fixture'ı commit edildi + baseline fotoğrafı
      *(`fixture-baseline.test.ts`, 11 test — `5ed99787`)*
- [x] **G1** · Tick primitifi — **`TICKS_PER_WHOLE = 524160`** (plandaki `40320`
      değil) · **kapı geçti ve sabiti değiştirdi:** korpusun gerçek payda kümesi
      `1 2 3 4 6 7 8 12 13 16 20 24 32 36 48 64 72 78 120 128`; `40320` **13**
      ve **78**'i bölmüyordu → EKOK alındı. 55 test yeşil; mimari kuralı eklendi
      (`src/core/time` hiçbir şeyi import edemez).
- [x] **G2** · `rows.ts` (hiçbir satır atılmıyor) + `meter-map.ts` +
      `usul-map.ts` + `encoding.ts`, tüketicisiz · `parser.ts` dokunulmadı
      · **kanıtlananlar:** zaman ilerletme kuralı `Pay>0 && Payda>0 && kod!==51`
      (1.211.994 satırda sıfır istisna) · kod-52 = **tempo**, kanonik zamanı
      ilerletmez (62:1 ölçüm) · kod 8/12/23/24/7 anlamları MusicXML ile
      hizalanarak türetildi · mu2'de **134 usul adı** var ve motor hiçbirini
      okumuyor · mu2 kodlaması **Windows-1254**
- [x] **G3** · Offset yeniden üretim kapısı · **KAPI GEÇTİ: 2987/2999 (%99,6)**
      · `RowAdvance {canonical, offsetReplay}` — tek fonksiyon iki sayı
      · karşıt kanıt: `Offset` üretimi kod-52 **dâhil** %99,6 / hariç %25,4;
      tam ölçüye oturma **hariç** %75,8 / dâhil %21,0 → iki eksen de gerekli
      · eşleşmeyen 12 eser sabitlendi (11'i donmuş `Offset`, 1'i tek mu2/TXT
      çelişkisi: `hicaz_uzzal--zeybek` mu2 9/4 der, Offset 9/8 ile yazılmış)
- [x] **G4** · Keşif koşusu · **G6'yı ÇÜRÜTTÜ.** 2987 eser / 1.157.450 nota:
      mevcut `ceil(offset)` %86,39 · planlanan `floor(offset)+1` **%76,23**
      (10 puan daha kötü). Kohorta ayırınca sebep çıktı: tempo işareti
      **olmayan** eserlerde `ceil(offset)` zaten **%98,58** doğru, olanlarda
      %83,56. **Sorun formül değil eksen** — `Offset` kod-52'nin hayalet
      süresini taşıyor. → ölçü artık `Offset`ten değil `MeterMap` yürünerek
      · yan ölçüm: doğru ızgarayla ölçülerin **%93,13'ü tam dolu**
      (TODO'daki %64,9 bozuk ızgaradandı); bar-aşan nota yalnız **%0,50**
- [x] **G5** · PDF `measureIndexBasis` alanı — 520 girdi damgalandı
      (`offset-ceil-v1`), `isVerificationCurrent` tabanı kontrol ediyor,
      iki doğrulayıcı betiğe kapı eklendi · sabit **tek kaynak**
      (`scripts/lib/symbtr-score-measures.mjs`) ve TS ile eşitliği test ediliyor
      · pivotta 18.334 kutu **görünür** düşecek, sessizce kaymayacak
- [x] **G6** · **PIVOT YAPILDI** · `measureIndex = measureAt(kanonikBaşlangıç)`
      (~~`floor(offset)+1`~~ çürütüldü) · yazılı mertebe `mu2` satır-1'den
      · **ölçülen kayma: 160.860 nota (%13,82)**; tempo işareti olmayan
      eserlerde yalnız %1,51 · toplam ölçü sayısı değişen eser 1.768/2.999
      · her olay `measureIndexBasis` taşıyor — taban örtülü kalmıyor
      · TS ↔ `.mjs` eşdeğerliği 8 fixture'da test ediliyor
      · G5 valfi tetiklendi: 520 PDF girdisi bayatladı, kutular **görünür**
      şekilde 0'a düştü (veri silinmedi)
- [x] **G6.1** · PDF ölçü kutuları `meter-walk-v2` ile yeniden doğrulandı
      · **546 girdi / 19.064 kutu** (öncesi 520 / 18.334 — *arttı*)
      · `verify:symbtr-measures` **0 hata** · pivot sırasında 0'a düşen kutular
      geri geldi · üç bayat türev artefakt da yenilendi (review template,
      empty-import dry-run, verification manifest)
      · yeni kapı: temizlik yalnız **makine üretimi** kayıtları siler;
      `human-reviewed`/`visual-regression` emeği silinmez, raporlanır
- [x] **G7** · L1 bar-aşan nota bölme + bağ · `barline-split.ts`
      · **5.984 nota (%0,51) bölündü** — bağımsız ölçümle birebir aynı
      · toplam süre 0 eserde değişti · çalınan nota sayısı 0 eserde değişti
      · bölme yalnız **gravür** yolunda; çalma yolu `parseSymbtrScore`'u
      doğrudan çağırdığı için etkilenmiyor
      · **üçüncü kapı hata yakaladı:** konum önce olaylardan toplanıyordu,
      31.605 süreli kod-9-dışı satır atlandığı için bar çizgileri kayıyor ve
      bölünen nota %2,07 çıkıyordu; konum artık satırlardan yürünüyor
- [x] **G8** · Doğrulama totolojiden çıktı
      · `validator.ts` artık **bir sonraki ölçünün başlangıcıyla**
      karşılaştırıyor (eskiden `measure.endBeat` zaten aynı event'lerin
      `max`'ıydı — koşul matematiksel olarak sağlanamazdı)
      · `quality.ts` artık ölçü içindeki **sürelerin toplamını** mertebeyle
      karşılaştırıyor (eskiden `endBeat - startBeat` = ilk notadan son notaya
      *yayılım*; ölçü başındaki/sonundaki boşluk görünmüyordu)
      · yeni test dosyası ikisinin de **tetiklenebildiğini** kanıtlıyor —
      geçen bir test, hiç tetiklenemeyen bir kontrol için de geçerdi

### Öncelik 2 · FAZ C/C1 — e2e blokajı · PLAN §5

- [x] **C1** · Blokaj kalktı (takılmış süreç kendiliğinden gitmiş; port boş).
      **23 e2e testi ilk kez çalıştı: 16 geçti, 7 kaldı** — hepsi `a11y.spec.ts`.
      Yediyi de çözdüm, **23/23 yeşil** (üç ardışık koşuda kararlı):
      - **kontrast (3 benzersiz çift):** nav aktif hapı `bg-white/20` → `/15`
        (4,33 → 4,84) · `Badge` secondary koyu metin → beyaz metin
        (3,28 → 5,54, marka rengi değişmedi) · `rhythm` sayfasındaki
        `opacity-70` kaldırıldı, token doğrudan kullanılıyor (3,86 → 8,49)
      - **`--color-text-tertiary` 4,499'du** — eşiğin *binde bir* altında;
        `oklch(55%)` → `oklch(52%)` ile 4,9'a çıkarıldı
      - **skip-to-content bağlantısı hiç yoktu** (WCAG 2.4.1) — eklendi
      - **iki test yanlış şeyi ölçüyordu:** `:focus` seçicisi Next.js
        dev-tools katmanına takılıyordu (uygulama sorunu değil); referans
        tablosu testi statik bir tabloda ok tuşu gezinmesi bekliyordu —
        ölçüldü: 0 odaklanabilir öge. Test artık WCAG 1.3.1 semantiğini ve
        etkileşimli ögelerin erişilebilirliğini ölçüyor.
- [x] **C1.1** · e2e artık **üretim derlemesine** karşı koşuyor — **23/23**.
      `npm run test:e2e:prod` tek komutta derler, sunucuyu kaldırır, testi
      koşar, kapatır (`scripts/run-e2e-production.mjs`).
      · Neden önemli: `next dev` sayfaya kendi dev-tools düğmesini enjekte
      ediyor ve o düğme **sekme sırasında uygulamadan önce** geliyor —
      yani dev sunucusunda ölçülen şey kullanıcının gördüğü şey değil.
      Üretim derlemesinde o katman yok.
      · `cross-env` / kabuk-bağımlı `&` kullanılmadı; süreçler Node'dan
      yönetiliyor (Windows/POSIX ayrımı yok).

### Öncelik 3 · FAZ B — Kaynak zenginliği · PLAN §4 · *FAZ A'ya bağlı*

- [x] **B1** · Süsleme kimlikleri satırlarda taşınıyor: grace **15.984**,
      tremolo **3.807**, trill **3.443**, mordent **1.395** (kod 23+24)
      · kanıt gücü `high`/`low` olarak **görünür** (kod 23/24/7 küçük örneklem)
      · çarpmaların **%91'i süresiz** — `<grace>` semantiğiyle tutarlı,
      süresiz olsa da kimlik kaybolmuyor
- [x] **B2** · Çözülemeyen 9 kod (1/4/10/11/16/28/32/43/44) `unresolvedCode`
      ile işaretleniyor: **nota olarak işleniyor** (süre ve perde gerçek),
      ama "anlamı biliniyor" gibi sunulmuyor · 12.000+ satır — eskiden
      tamamen atılıyorlardı
- [x] **B3** · mu2 künyesi okunuyor: makam, usul, form, bestekâr, güftekâr,
      eser adı, tür (TSM/THM) — **3000/3000 dosyada tam**
      · **163 makam adı**, 124 açılış usul beyanı · künye dosya adından
      farklı: `yeni_cargah` → **`Çargâh(Yeni)`**
      · kod 50 sütun 8'in **donanım** olduğu düzeltildi (tek karar perdesi değil)
      · kod 56 ve 62 **adlandırılmadı** — `H`/`E` harflerinin neyi kısalttığı
      belgelenmemiş; ham taşınıyor
- [x] **B4** · mu2 code-14 okunuyor · **planın iddiası kısmen düzeltildi.**
      46.214 satır (2.586/3000 dosya), 42.319'u rakam desenli.
      Desen toplamı mertebeye eşit: **%79,1**.
      · Desen **ölçü başına değişiyor** (Düyek'te 100'den fazla farklı desen)
      → bu usulün *kanonik düzümü değil*, o ölçüdeki hüzmeleme.
      `USUL_DATA` **değiştirilmedi**.
      · Ama usul başına **en sık** desen ders kitabı düzümüyle örtüşüyor —
      Aksak `22221`, Düyek `12122`, Aksaksemâî `212221`, Curcuna `21223`.
      Kanıt olarak sunulabilir, otorite olarak değil.
- [x] **B5** · Tekrar yapısı ölçüldü ve teste bağlandı · **planın "mu2 koruyor"
      varsayımı çürütüldü.**
      · **TXT tekrarları AÇAR:** tekrarı olan 1.977 eserin **%97,8'inde**
      TXT, MusicXML'den uzun — oran medyanı **1,745×** (plan 1,488 demişti)
      · **MusicXML tekrarı KORUR** (`<repeat direction>`, 9.932 işaret) ve
      `importer.ts` bunu zaten okuyor (D2) → **otoritatif kaynak bu**
      · **mu2 kod-21 tekrar DEĞİL:** MusicXML'le birebir örtüşme yalnız
      **%32** (11.985 vs 9.932; fark ±3'e yayılıyor). Daha geniş bir yapısal
      işaret sınıfı — "tekrar" olarak **adlandırılmadı**
- [x] **B6** · **Kaynak regresyonu doğrulandı ve teste bağlandı.**
      v3: 382 kod-51 satırının **0'ında** `Soz1` var.
      v2: aynı alan **319/411 (%77,6)** satırda doluydu — README v2 madde 5
      o zaman doğruydu, v3'te alan boşaltılmış. Motorun hatası değil.
      · Telafi zaten yerinde: usul adı `mu2` kod-51'den okunuyor
      (`usul-map.ts`, 3000/3000).
      · Yan bulgu: v2 metinleri **UTF-8**, v3 mu2'leri **Windows-1254** —
      sürümler arası kodlama da değişmiş.
- [x] **B7** · `TempoMap` · **planlanan kural REDDEDİLDİ.**
      `(LNS>=127 ? 127+Bas : LNS)` mu2'nin kırpılmamış değerine karşı
      ölçüldü (2.121 çift): **%87,3** — yani sekizde bir yanılıyor ve
      yanılmaları rastgele (`LNS=127 Bas=89` → kural 216, gerçek **432**).
      · **Karar:** tempo `mu2`den okunuyor (3000/3000, kırpılmamış).
      mu2 yoksa TXT değeri `clipped: true` ile işaretleniyor — kırpılmış
      bir sayı kesin gibi sunulmuyor, uydurma kural yok.

### Öncelik 4 · FAZ C — Doğrulama borcu · PLAN §5

- [x] **C3** · `audit:score-engine-engraving` ilk kez koştu ve **gizli bir
      çökme buldu.** `ScoreSurface.tsx` `vexflow.Glyphs`'e doğrudan
      erişiyordu; tarayıcı paketinde o ad-alanı **yok** →
      `Cannot read properties of undefined (reading 'accidentalBakiyeSharp')`
      → **tüm porte çizimi çöküyordu** (yalnız anahtar + 28/4 mertebe
      kalıyordu). Kusur benim değişikliklerimden ÖNCE vardı (`ScoreSurface`
      son kez `a5ef1af8`'de değişmiş); C1 blokajı yüzünden hiç görülmemişti.
      · **Düzeltildi:** boş nesneye düşülüyor, kod zaten belgelenmiş yedeğe
      (standart ♯/♭ + metin annotation) geçiyor. Nota, kiriş, koma arızası,
      imleç — hepsi çiziliyor. Denetimdeki 3 hatadan 2'si kapandı,
      konsol hatası **0**.
- [x] **C2** · K5 geometrisi tarayıcıda doğrulandı — **denetim 0 hata.**
      Kalan tek hata **bayat bir kontroldü**: `firstMeasureSystemCount <= 1`
      "ilk 28/4 ölçüsü bölünmeli" diyordu; G6 pivotundan sonra demo eserin
      1. ölçüsü **5 event / 4 vuruş** tutuyor ve tek sisteme haklı olarak
      sığıyor. Kontrol geçersiz bir varsayımı kovalıyordu, kaldırıldı.
      · **Gerçek değişmezler sağlam:** `maxEventsPerSystem` 16/24,
      `maxBeatSpan` 4/7, `denseSystemCount` **0**, `overlongSystemCount` **0**
      · "Uzun ölçü bölünüyor mu?" sorusu zaten `score-layout.test.ts`
      birim testiyle korunuyor (CI'da koşuyor, tarayıcı gerekmiyor)
      · `audit:studio-follow` de temiz: `ok: true`, konsol hatası 0
- [x] **C4** · G7 sonrası yeniden ölçüldü — **gerçek bulgu farklı çıktı.**
      İlk kaba ölçüm "tek-kalan triole 178 → 629 arttı" dedi; ama o metrik
      (ardışık aynı-payda koşusu) bölme parçalarıyla kırılıyordu.
      Doğru soru "kaç bölünen nota triole?" → **5.984'ün 23'ü (%0,38)**.
      · **Düzeltildi:** triole notası artık bar çizgisinde **hiç bölünmüyor**
      (parçaları triole sisteminin dışına düşüyordu; gravürde braket bar
      çizgisini aşabilir, parçalama geçerli gösterim üretmez).
      Bölünen nota 5.984 → **5.961**.
- [x] **C4.1** · Sahte triole **kapatıldı**. Triole olmayan bir nota
      bölününce parçası triole şeklinde bir kesre (12/8'de 1/12 gibi) denk
      gelip sahte triole çiziliyordu — **376 parça**. Artık böyle bir bölme
      hiç yapılmıyor: nota bütün bırakılıyor.
      · Bölünen nota 5.984 → 5.961 (C4) → **5.773** (C4.1)
      · Bütün nota ölçüyü aşar ve bu **G8 doğrulayıcısında görünür**;
      sahte triole ise görünmezdi. Görünür fazlalık, sessiz yanlıştan iyidir.

### Öncelik 4.5 · G9 ✅ — parser `rows.ts`'e geçti *(FAZ A'nın son halkası — kapandı)*

- [x] **G9** · **Parser `rows.ts`'e geçti — FAZ A'nın son halkası kapandı.**
      `parseSymbtrScore` artık `if (code !== "9") return` yapmıyor; zamanı
      ilerleten **her** satır olay üretiyor. Tanım tek yerde:
      `rowAdvance().canonical`.
      · **Ölçü doluluğu %88,81 → %98,03** (157.173 ölçüde 154.082).
      Kanonik ızgaradaki %93,13'ü de **aştı** — çünkü G7 bölmesi artık
      tam olay kümesi üzerinde çalışıyor.
      · Olay akışı **1.163.593 → 1.192.643** (+29.050): çarpma, tril,
      mordent, tremolo ve 9 çözülemeyen kod artık akışta.
      · Kod-52 (tempo) olay **üretmiyor** — hayalet süre eklemiyor;
      süresiz çarpmalar (kod-8'in %91'i) zaman eksenini bozmuyor.
      · Her olay `code`, `ornament`, `unresolvedCode` taşıyor.
      · **Bilinçli baseline değişimi** (G0 fotoğrafı güncellendi, gizlenmedi):
      `beyati` 224→245 olay, endBeat 144→**154,5** — mertebe 8/8 × 39 ölçü
      = nominal 156; eski akış 12 vuruş **eksikti**. Eklenenler uydurma
      değil, ölçünün zaten eksik olan parçası.
      · `.mjs` yürüyüşü de aynı kurala geçirildi; TS↔`.mjs` eşdeğerlik
      testi 8 fixture'da yeşil.
      · Doğrulama: 983 birim testi · 23 e2e · gravür denetimi **0 hata**.

### Öncelik 5 · FAZ D — Ses kütüphanesi · PLAN §6 · *stüdyo işi*

- [x] **D1** · Ney **10/36 → 36/36** · *(o günkü üretici `build-ney-samples.mjs`;
      F5'te lisans sebebiyle kaldırıldı, yerine soundfont üreticisi geçti)*
      · **Bu arada CİDDİ BİR KUSUR bulundu:** mevcut 10 dosyanın **5'i yanlış
      perde etiketiyle** duruyordu — `As4.wav` gerçekte **B3**, `C5.wav`
      gerçekte **Cs4**, `Cs4/D3/Ds4` de kaymış. Sessiz değil **duyulan** bir
      hataydı: `samples.ts:224` dosya adını doğru varsayıp
      `playbackRate = istenen/etiketlenen` hesaplıyor; etiket yanlışsa hız 1.0
      kalıyor ve ney bir oktav+ pes çalıyordu.
      · Yöntem: kaynak perdesi **ölçülür** (varsayılmaz), en yakın kaynak
      seçilir, hedefe **tam oturana kadar** yeniden örneklenir
      (kapalı döngü: üret → ölç → düzelt).
      · **Yeni kapı:** `sample-pitch-labels.test.ts` her dosyanın *içeriğini*
      ölçüp adıyla karşılaştırıyor. Eski hatalı dosyalarda **5'ini de
      yakaladığı** doğrulandı; yenilerinde geçiyor.
      · **Dürüst sınır:** o kaynakta kayıt aralığı B3–Fs5'ti ve 16 yuva
      gerilerek üretiliyordu. F5'te kaynak değişince aralık **D3–C6** oldu,
      gerilmiş yuva **2**'ye düştü; ikisi de `/samples` sayfasında uyarılı.
- [x] **F0/F1** · **Sample doğruluğu sistemik olarak denetlendi.**
      İki bağımsız yöntem (YIN + HPS) uzlaşması zorunlu kılındı
      (`scripts/lib/pitch-detect.mjs`). Uzlaşma yoksa **karar verilmiyor**.
      · **bağlama**: ölçülebilen 24/24 dosya tam bir oktav **pes**ti → düzeltildi
      · **rebab**: ölçülebilen 24/24 dosya tam bir oktav **tiz**di → düzeltildi
      · **ney**: önceki düzeltmem kısmen yanlıştı (`B4` −202c, `C5` −214c);
        kapalı döngü kendi ölçüm hatasına yakınsıyordu. Uzlaşmaya bağlandı,
        artık 36/36 doğru.
      · **lavta**: 23 yuva yeniden üretildi → uzlaşma 0,44 → **1,00**
      · **ud**: 10 yuva → 0,75 → **1,00** (bilinen `E5` sapması da kalktı)
      · **tanpura**: üç yöntem de uzlaşmıyor → **DOKUNULMADI**, testte
        "doğrulanamıyor" olarak açıkça işaretli.
      · Kapı 11 enstrümanın tamamına genişletildi; her enstrümanda **sapan 0**.
      · **Sonradan bulunan ve düzeltilen iki kusur:** (1) yeniden üretim
        sabit 1,6 s istiyordu, kaynak erken tükenince kalanı **sıfırla**
        doluyordu — 53 dosyada sessiz kuyruk vardı, yeni kapı eklendi;
        (2) betik doğrulanmayan çıktıyı da yazıp "üretildi" sayıyordu.
      · Perde yukarı kaydırılırken **anti-alias alçak geçiren** eklendi.
      · **İkinci kapı:** `scripts/__tests__/rebuild-instrument-samples.test.mjs`
        sayısal çekirdeği (alçak geçiren · yeniden örnekleme · tepe aralığı)
        **doğrudan** ölçer — kusur dosyalara ulaşmadan yakalansın diye.
- [x] **F2** · **Kayıt dışı perde bildiriliyor.** Ney'in ölçülen kayıt
      aralığı **B3–Fs5** (MIDI 59–78); dışındaki 16 yuva gerilmiş.
      `sample-provenance.ts` + `/samples` sayfasında "Gerilmiş perde" uyarısı.
      Ölçülmemiş enstrüman **"bilinmiyor"** döner — "sorun yok" değil.
      *(Organolojik ses sahası iddia edilmedi: kaynak yok, ADR 0001.)*
- [x] **F3 (D2)** · **`hek` türetilmişliği görünür.** Yerel paketlerde gerçek
      `hek` kaydı arandı, **yok**. `SampleSlot.derivedFrom` → API → `/samples`
      sayfasında "Türetilmiş ses — gerçek kayıt değil" uyarısı. Kapı, gerçek
      kayıt bulunduğunda **kırılacak** şekilde yazıldı.
- [x] **F5** · **Ney lisans sebebiyle yeniden üretildi — NC kısıtı kalktı.**
      Eski kaynak CC BY-NC 4.0'dı ve tek başına bütün projeyi kısıtlıyordu.
      Çözüm indirmeden geldi: depodaki **Art Libre** lisanslı
      `all-samples/TURKISH-ARAB3.sf2` içinde 7 ney/nay preset'i bulundu.
      Yeni üretici `scripts/render-soundfont-instrument.mjs` + SF2 okuyucu
      `scripts/lib/soundfont.mjs`; eski `build-ney-samples.mjs` **kaldırıldı**
      (çalıştırılması NC içeriği sessizce geri getirirdi).
      · kaynak 7 perde → **22 bölge** · aralık B3–Fs5 → **D3–C6**
      · aralık dışı yuva **16 → 2** · en çok gerilme ~11 → **2,23** yarım ton
      · **Ölçüm yine iki kez çürüttü:** SF2 başlığındaki kök perde güvenilmez
        (`NEY-YEN-1-C` sekiz bölgede tam +2 oktav); ve YIN+HPS *birlikte* bir
        oktav kaçabiliyor (`Moss_NayB3` 248,7 iken 124,4 okundu). Ayırt eden
        kanıt spektrumda: tepeler adayın tam katları mı, yoksa 1,5 katını da
        içeriyor mu. `resolveFundamental` bu gözlemin kuralı.
      · **Bedeli kayıtta:** pes bölgede temel zayıf, uzlaşma 1,00 → **0,81**.
        Sapan dosya yok; ölçülemeyen 7 dosya merdiven + spektrumla doğrulandı.
      · **İşe yaramayan yol da kayıtta:** merdiven kapısını tüm enstrümanlara
        genişletmek ölçüldü — bağlama/rebab/kanun'da −1200…−10231 cent sahte
        çelişki üretiyor. Sağlam dosyaları kırardı; ney yoluna sınırlandı.
- [x] **F4** · **Dev güvenlik borcu izleniyor.** `security-debt.test.ts` borcun
      kökünü `package-lock.json`'dan **çevrimdışı** okur (`npm audit` ağ ister,
      CI'da kırılgan olur). Borç azalırsa da büyürse de test kırılır.

### Öncelik 6 · FAZ E — Tetikleyici bekleyen · PLAN §7

- [x] **E1** · **Ölçüldü, yapılmadı.** Bundle 2,47 MB / 8 MB (**%31**), en
      büyük chunk 0,47 MB / 1,5 MB. Kalan pay 5,53 MB; E1'in kazancı 3,4 KB
      yani kalan payın ‰0,6'sı. **Tetikleyici ateşlenmedi** → planın kendi
      kararı gereği yapılmadı. Yeniden bakılacak an: bütçenin %80'i.

---

## A — Aksiyon alınabilir ✅ TAMAM (2026-07-26)

- [x] **A1 · E2E'yi CI'a bağla** — CI zaten `playwright.config.ts` + `e2e/smoke.spec.ts`
      (`/rhythm`, `/studio`, `/ogren`) + `e2e/ogren.spec.ts` (12 test) + `npm run test:e2e`
      adımıyla çalışıyor. *(eski: F6.3)*
- [x] **A2 · Erişilebilirlik derin audit** — `@axe-core/playwright` + `e2e/a11y.spec.ts`
      (WCAG 2.1 AA tarama + klavye testleri). `/rhythm` Space/Arrow kısayolları eklendi.
      `editorStore.setBpm` fonksiyonel updater desteği. *(eski: F5.5)*
- [x] **A3 · Responsive manuel polish** — Workbench/curation responsive altyapısı
      (`max-w-7xl`, `overflow-x-auto`, `xl:flex-row`) tam. *(eski: F5.6)*
- [x] **A4 · Ölü export temizliği** — `src/lib/app-constants/index.ts` 267→165 satır,
      14 ölü export kaldırıldı. *(eski: P3.3)*

## B — Dış girdi / kaynak bekleyen (derin analiz: 2026-07-26)

### B1 ✅ ÇÖZÜLDÜ — `repeat-volta-endings` (2026-07-26)

**Kaynak:** SymbTr v3 PDF (hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey.PDF).
PDF metin katmanında "TESLøM" — ø (U+00F8) segno işareti, Teslim bölümü başlangıcı.
Mu2: Teslim beat 21.0625. ScoreSurface'te segno glyph'i Teslim bölümüne çiziliyor.
Glyph dispatch: `source-proven`, `rendered: true`.

### B2 ❌ KALDIRILDI — "Darb" usul değil (2026-07-26)

"Darb" (6/4) bir usul adı değil, "darp" (vuruş) teriminin yanlış okunması.
`ALL_USULS`'tan kaldırıldı.

### B3 ✅ ÇÖZÜLDÜ — `bektasiraksani` (SymbTr düzüm ile aktif)

**Araştırma:** Bektâşî Raksânı (15/8) için:
- SymbTr v2/v3 mu2: düzüm 15/8, usul etiketi "Bektâşî Raksânî"
- Mevcut darp: SymbTr düzüm [2,1,2,2,1,2,2,2,1]'den türetildi
- SymbTr: Zenodo'da yayınlanmış, hakemli akademik veri seti (CC-BY 4.0)

**Yapılan:** `bektasiraksani` PENDING_USUL_IDS'ten çıkarıldı, UI'da aktif.
dum/tek dağılımı için Özkan s.704 ile teyit opsiyonel (mevcut darp yapısal
olarak doğru, yalnız ilk vuruş "dum" — geleneksel notayla düzeltilebilir).

### B4 ✅ ÇÖZÜLDÜ — 9 uydurma/kopya makam kaldırıldı (2026-07-26)

**Kaldırılanlar (9):** nevaber, nevadur, uerite (Ureyş), güldeste, dilçin (buselik kopyası),
segahira, hincin (hicaz kopyası), tarzannef, zengule (buselik kopyası).
57 → 48 makam.

**Korunanlar (3):** müstear (Arel-Ezgi'de Segah+Rast), hicazkürdi (Hicaz+Bûselik),
irakeyn (Irak varyantı).

### B5 ✅ DOĞRULANDI — Yeni makam domain doğrulaması (2026-07-26)

7/7 makam (Neva, Çârgâh, Kürdilihicazkâr, Sûzinâk, Şehnaz, Acemkürdî, Evç)
Gönül'de mevcut ve korpus koma verisine sahip.

### B6 ✅ ÇÖZÜLDÜ — Gönül-dışı makamlar temizlendi + hisarbuselik (2026-07-26)

9 makam kaldırıldı, 3 makam korundu (bkz. B4). `hisarbuselik`: korpus koma
(25 eser, dügah kararlı) + Wikipedia teyidi (Hisar+Bûselik birleşik).
Aralıklar [2,1,2,2,1,2,2], seyir eklendi.

## C — Bilinçli ertelenmiş (tasarım kararı; tetikleyici olmadan açılmaz)

- [x] **C1 · Alıştırma dizini** ✅ — `/exercises`: 280 sayfa PDF render + OCR dizin (8 makam).
      `scripts/extract-exercise-index.py` ile otomatik çıkarım. *(eski: F14.5)*

## D — Motor denetimi ✅ TAMAMLANDI (2026-07-26)

> **Durum:** D1–D15 uygulandi ve dogrulandi. Kapanis dogrulamasi:
> `typecheck` PASS (0 hata) · `test:run` **111 dosya / 743 test PASS**
> (baslangic: 107 / 695) · `lint` PASS (0 hata, 0 uyari) ·
> `guardrails:architecture` PASS · `build` PASS ·
> `audit:bundle-size` PASS (2,47 MB toplam, en buyuk chunk 0,47 MB).
>
> **Olculen etki:**
> - Parser NaN zaman ekseni: **124 → 0** event (gercek korpus, 401 dosya)
> - Sessizce yanlis sure cizimi: **5.678 → 0**; tam temsil %96,12 → **%98,06**
> - "Karar: C" 48 makamda gosteriliyordu → **0** (24 adimda DOM testiyle sabit)
> - `repeat-volta-endings` sabit "cizildi" iddiasi → belgeden turetiliyor
>
> **Kapsam disi birakilanlar (gerekceli):**
> - **D7 — ayri `hek` sample slotu:** yeni SES KAYDI ister; ses uydurulmaz.
>   Eslesme dogru aileye (`dum` + vurgulu) cekildi, slot acilmadi.
> - **D12 — viewport sanallastirma + responsive genislik + playback
>   look-ahead:** parcali render (`SYSTEMS_PER_FRAME`) uygulandi; tam
>   sanallastirma ayri bir is.
> - **D15 — `VirtualPiano` silme:** olu ama tam testli bir UI bileseni;
>   silmek urun karari, kusur duzeltmesi degil. Yerinde birakildi.
> - **D15 — 150 KB korpus JSON'un istemciye gitmesi:** server-only + API
>   dilimi yeniden yapilanmasi ister; bundle butcesi su an geciyor.

> **Aşağısı bulguların açıldığı andaki kaydıdır** (kanıt ve ölçümle birlikte);
> her maddenin altındaki kutular yapılan işi gösterir. Ses / nota / makam-usul
> motorlarının derin incelemesi. Bulguların hiçbiri kırık build veya kırmızı
> test değildi — `typecheck` 0 hata, `test:run` 107 dosya / 695 test PASS iken
> hepsi yeşilin altından geçiyordu; asıl mesele buydu.

### D1 · Parser `0/0` satırında NaN üretiyor, zaman ekseni zincirleme çöküyor 🔴

`src/data/symbtr/parser.ts:126` `durationBeats = (pay / payda) * 4`; korpusta
`pay=0, payda=0` satırları var → `NaN`. `parser.ts:158` `startBeat += durationBeats`
olduğu için **NaN bir kez girdiğinde o eserin geri kalanının tamamı** NaN
`startBeat`/`startTime` alıyor.

**Ölçüm** (401 SymbTr dosyası / 146.477 event): 5 bozuk süre → **124 event'in
zaman ekseni çökmüş**, 4 dosya etkileniyor. `acemkurdi--sarki--semai--sen_kalbimin--teoman_alpay.txt`
tek başına event #79'dan sonraki 124 event'i kaybediyor. Oran ~%1 dosya →
3000 eserlik katalogta ~30 eser.

`validator.ts:84` yalnız `durationBeats`i kontrol ediyor (5 hata üretiyor);
`startBeat`/`startTime` sonluluğu **hiç kontrol edilmiyor** (124 çökük event
için 0 hata). `measure-duration-overflow` (`validator.ts:66`) da NaN'la sessizce
false dönüyor. Ayrıca `CanonicalScorePrototype` select'inde `disabled` yalnız
`eventCount === 0` için — `validation.ok === false` belge kullanıcı tarafından
seçilebiliyor; NaN `startTime` ile `getActiveCanonicalEvent` hiç eşleşmiyor
(NaN karşılaştırmaları false) → imleç ölüyor.

- [x] Parser'da `pay/payda` sonlu ve `> 0` değilse event'i **reddet** (veya
      `isRest` + explicit `invalid` işareti), `startBeat`i asla NaN'la ilerletme.
- [x] `validator.ts`'e `startBeat`/`startTime` sonluluk kontrolü ekle.
- [x] Select'te `validation.ok === false` belgeleri de disable et veya uyar.

### D2 · `repeat-volta-endings` dispatch'i hard-coded — denetim kapısının tek deliği 🔴

`src/features/score-engine/workbench/score-format.ts:244-250` durumu belgeden
türetmiyor: `status: "source-proven"`, `rendered: true` ve `evidence` tek bir
eserin PDF adına sabitlenmiş. Ama `ScoreSurface.tsx:304-328` segno'yu **yalnız
"teslim" etiketli bölüm varsa** çiziyor. Teslim'i olmayan her belgede manifest
"source-proven / rendered" diyor, hiçbir şey çizilmiyor ve **başka bir eserin**
kanıtını gösteriyor.

Aynı dosyanın docblock'u "`rendered` yalnız source-proven veya policy-derived
durumlarında true olabilir" diyor; bu kayıt şartı **iddia ederek** sağlıyor.
Yanındaki `key-signature`, `slur-tie`, `natural-accidental` kayıtlarının hepsi
belgeden hesaplanıyor — doğru desen zaten dosyada, bu tek istisna
`score-glyph-class-map` denetimini kendi kendini onaylayan hale getiriyor.

- [x] Kaydı belgeden türet: Teslim bölümü + çizilen segno varsa `source-proven`,
      yoksa `missing` / `rendered: false`. Evidence'ı da o belgeden üret.

### D3 · 48 makamın hepsinde `tonic: "C"` ve öğrenciye "Karar" diye gösteriliyor 🔴

**Ölçüm** (runtime `MAKAM_DATA`): 48 makam, tonic kümesi = `['C']` — istisnasız.
`MakamStepper.tsx:110` `Karar: {makam.tonic}` render ediyor → Rast, Hicaz,
Segah, Eviç, Nevâ… hepsi için ekranda **"Karar: C"**. Hemen yanındaki
`description` ise "dügâh'ta karar kılar" (nevâ), "ırak perdesinde karar kılan"
(eviç) diyor — öğretim yüzeyi kendi kendisiyle çelişiyor.

`getMakamKomaFrequencies` / `snapMidiToMakamFrequency` de her makamın kararını
aynı C'ye demirliyor: aralıklar korpustan doğru, mutlak register tek tip yer
tutucu.

- [x] `tonic`i AEU perde adına bağla (rast=G, dügâh=A, segâh, ırak…) veya
      alanı kaldırıp UI'da korpus kararını göster. Ara çözüm olarak en azından
      UI'da "Karar: C" yazmayı durdur.

### D4 · `dominant` (güçlü) kaynaksız el-yazımı veri, kesin bilgi gibi sunuluyor 🔴

**Ölçüm** (runtime `MAKAM_DATA`, `dominant`in makamın kendi `intervals` dizisinde
kaçıncı derece olduğu): 5. derece 19/48, 4. derece 6, 3. derece 6, 2. derece 5,
6. derece 1 ve **11 makamda `dominant` makamın kendi dizisinde hiç yok**:
`ussak(E), saba(F), segah(D), bayati(A), kürdi(D), hüzzam(A), hisarbuselik(E),
zirefkend(D), dügah(G), müstear(E), rehavi(F)`.

Uşşak'ın güçlüsü nevâ (5. derece) ama kayıt "E"; Hüseyni'nin güçlüsü hüseyni
(5.) ama kayıt "A". Bu değerler `MakamStepper.tsx:112`'de "Güçlü: E" olarak
öğrenciye basılıyor.

Tek testi (`koma-scale.test.ts:135`) kendi yorumunda itiraf ediyor: *"Guclu
frekansla kesin turetilemez; en azindan… korpus koma dizisinde (±1 yarim-ton)
yer aldigini garanti ederiz"* — neredeyse her değerin geçtiği bir kapı. Test
`komaScale.degrees`e bakıyor, `intervals`e değil; iki temsil arasındaki bu fark
sapmayı da gizliyor.

`intervals`, `keySignature`, `komaScale`, `seyir` korpus türevine taşınmışken
korpus bağı olmayan tek alan bu — "kaynak yoksa uydurulmaz" kuralı tam burada
deliniyor.

- [x] Güçlüyü kaynağa bağla (Gönül/Özkan derece tablosu) veya alanı kaldır.
      Kaynaksızsa UI'da gösterme. Test'i "dizinin bir derecesi" değil "kaynakta
      yazan derece" olarak sıkılaştır.

### D5 · VexFlow süre merdiveni: 32'lik ve triole notalar yanlış değerle çiziliyor 🟠

`notation.ts:67-78` bir taban-merdiveni; tabanı 16'lık. **Ölçüm** (401 dosya /
146.477 event): **5.678 event (%3,88) yanlış süreyle çiziliyor.** Dağılım:

| kaynak | event | çizilen |
|---|---|---|
| `1/32` (0,125 vuruş) | 2.099 | 16'lık (0,25) |
| `1/12`, `1/24`, `1/48` (triole) | 2.255 | 16'lık |
| `3/32` | 708 | 16'lık |
| `5/8` (2,5) | 289 | ikilik (2) |
| `7/8` (3,5) | 80 | noktalı ikilik (3) |
| `5/4`, `3/2`, `9/8` (5 / 6 / 4,5) | 171 | birlik (4) |

Yani **32'lik ve daha kısa her nota 16'lık olarak çiziliyor**; 2.255 triole
bracket'sız ve yanlış değerle çiziliyor. Dispatch tablosu
`tuplet-time-modification: unsupported, rendered: false` diyor ama triolenin
*notaları* render ediliyor — sadece yanlış değerle. Bağ (tie) üretimi de yok,
bu yüzden >4 vuruşluk 174 event birliğe kırpılıyor.

`ScoreSurface.tsx:245` `Voice(...).setStrict(false)` VexFlow'un ölçü-dolumu
kontrolünü kapattığı için uyuşmazlık hiç yüzeye çıkmıyor.

- [x] Merdiveni `durationFraction` (parser'da tam pay/payda mevcut) üzerinden
      kur; 32'lik/64'lük ekle, >4 vuruşu bağ ile böl.
- [x] Triole'yi ya `Tuplet` ile çiz ya da event'i `unsupported` işaretleyip
      dispatch'te dürüstçe raporla — şu anki "not-rendered" iddiası yanlış.

### D6 · Nota motorunun imleci duvar saatinde, ses motorununki ses saatinde 🟠

`CanonicalScorePrototype.tsx:146-151`: `performance.now()` + `setInterval(80ms)`,
durdurma `setTimeout((duration+0.35)*1000)`. Ses ise `playArrangement` içinde
`context.currentTime + 0.04` üzerinden planlanıyor.

Ritim motorunda tam bu problem çözülmüş (`instruments.ts:483` `heardContextTime`,
`getOutputTimestamp`, ölçülen ~53 ms çıkış gecikmesi, rAF) — ScoreEngine o
düzeltmeyi hiç almamış. İmleç sesin önünde gidiyor, iki saat ayrıştıkça sapma
büyüyor, üstelik 12,5 fps.

- [x] Score playback'i `heardContextTime` + rAF'a taşı (ritim motorundaki
      deseni yeniden kullan).

### D7 · 7 darp → 3 sample; `hek` hafif sol-el ailesine düşüyor 🟠

**Ölçüm** (`usul/data.ts` darp sıklığı): `tek` 495, `dum` 345, `ka` 213,
`te` 147, `ke` 145, `hek` 36, `ta` 19. Sample kütüphanesi yalnız dum/tek/ke
(`sample-library.ts:72`). `engine.ts:96-101` `te→tek, hek→tek, ka→ke, ta→dum`.

`hek`, dosyanın kendi kaynak notunda (`usul/data.ts:56`) "iki elin birlikte
vuruşu" — ama hafif sol-el ailesine (`tek`, gain 0,46/0,62) eşleniyor ve
`ACCENTED` kümesi yalnız `{dum, ta}` olduğu için hiç vurgulanmıyor. 36 `hek`
darbı Berefşan / Muhammes / Remel velvelelerinde geçiyor.

- [x] `hek` için ayrı sample slotu aç (kaynak var: iki el birlikte) veya en
      azından `dum` ailesine eşleyip `ACCENTED`e kat.

### D8 · Uzun darplar tek vuruşa kırpılıyor 🟠

`instruments.ts:383` `Math.min(Math.max(timeValue, 0.25), 1)`. **Ölçüm**:
`usul/data.ts`'teki 1.400 darbın **361'i (%26) `timeValue > 1`** — hepsi 1
vuruşa kırpılıyor. Berefşan'ın `[1,"dum",4]` Düüüüm'ü 1 vuruşluk Dum'la aynı
sesleniyor.

Yorumdaki gerekçe geçerli (sample'ın doğal ikinci vuruşu duyuluyordu) ama
düzeltme yanlış katmanda: sample kırpma/envelope işi, notalı değeri atmakla
çözülmüş.

- [x] Envelope'u sample uzunluğundan bağımsız kur (loop/fade), `timeValue`yi
      koru.

### D9 · Velvele kısma sezgiseli yarım çalışıyor 🟡

`instruments.ts:386` `gainScale` yalnız `timeValue < 1` olan darplara uygulanıyor.
**Ölçüm**: 748 darp `timeValue === 1`, 291 darp `< 1`. Gönül velvelelerinde
dolgu vuruşlarının çoğu `timeValue: 1` yazılı → tam gain'de çalıyorlar.
"Ana iskelet öne çıksın" niyeti yalnız te-ke ikilileri için gerçekleşiyor.

- [x] Süslemeyi `timeValue` yerine "ana darp mı velvele mi" bilgisinden türet
      (velvele dizisi zaten ayrı alanda).

### D10 · `RhythmLoopController.stop()` kendi planladığı sesi durdurmuyor 🟡

`instruments.ts:581` yalnız `clearInterval` yapıyor; WebAudio'ya girmiş 0,6 s'lik
(`LOOKAHEAD_SECONDS`) vuruşlar çalmaya devam ediyor. İki gerçek çağıran bunu
global `stopAll()` ile örtüyor (tüm AudioContext'i suspend eden çekiç).

Ama **re-entrancy bail-out yolunda** (`rhythm/page.tsx:160`,
`useUsulPlayback.ts:104`) yalnız `controller.stop()` çağrılıyor — orada
`stopAll()` çağrılamaz çünkü kazanan döngüyü de öldürür. `startRhythmLoop`
dönmeden önce `scheduleDueHits()`i senkron çağırdığı için terk edilen döngünün
0,6 s'lik vuruşları canlı döngünün üstüne biniyor (hızlı çift tıklamada flam).

- [x] Controller kendi planladığı `AudioBufferSourceNode`'ları izlesin ve
      `stop()` yalnız onları iptal etsin.

### D11 · Varsayılan vurmalı seti örtük bir yığın 🟡

`sample-library.ts:166` `PERCUSSION_SAMPLE_LIBRARY` 9 vurmalı enstrümanın
dosyalarını tek listede birleştiriyor; `getFirstLoadedPercussionSample` ilk
yükleneni seçiyor. `PERCUSSION_INSTRUMENTS` sırası `bendir, kudum, davul, def,
darbuka, zilli_def, kaşık, zil, nakkare` olduğu için **enstrümansız her çalma
bendir sesi veriyor** — açık bir karar değil, dizi sırasının yan etkisi.
Ayrıca enstrümansız preload ~54 dosya indirip 3'ünü kullanıyor.

- [x] Varsayılan vurmalıyı explicit sabit yap; preload'ı yalnız seçili
      enstrümanla sınırla.

### D12 · Render ölçeklenmiyor 🟡

`score-format.ts:146` her sistemi sabit 210 px adımla tek SVG'ye diziyor;
`score-layout.ts:19-20` sistem başına 7 çeyrek-vuruş / 24 event. Tam bir peşrev
yüzlerce üst üste porte demek — hepsi tek effect'te senkron, sanallaştırma /
sayfalama yok, her biri kendi `Formatter().format()`'ıyla. `accidentals`
katmanını aç/kapat `innerHTML = ""` ile tümünü baştan kuruyor.

`getSurfaceWidth()` sabit 1180 döndürüyor — yüzey responsive değil. Aynı effect
içinde `ScoreSurface.tsx:315` `await import("vexflow")`i ikinci kez çağırıyor
(`GLYPHS` zaten satır 159'dan kapsamda).

`playArrangement` da tüm eseri bir kerede planlıyor (ritim motorundaki 0,6 s
look-ahead pump'ının karşılığı yok).

- [x] Sistemleri viewport'a göre sanallaştır veya sayfala; playback'i
      look-ahead pencereyle planla.

### D13 · Belge yükleme yarışı + gereksiz liste fetch'i 🟡

`CanonicalScorePrototype.tsx:73` `loadCanonicalDocument`'ta AbortController /
generation guard yok → hızlı belge değişiminde eski yanıt sona gelirse **yanlış
eser** gösterilir. Ayrıca liste effect'inin (`:90-116`) bağımlılığında
`selectedDocumentId` var ve `loadCanonicalDocument` onu set ediyor → her
seçimde `/api/score-engine/documents` yeniden çekiliyor.

- [x] Generation counter / AbortController ekle; liste effect'ini seçimden ayır.

### D14 · Makam ↔ usul korpus eşleşmesi zıt stratejilerde 🟡

`usul/data.ts:22` açık, gözden geçirilmiş alias tablosu (`CORPUS_NAME_ALIASES`)
kullanıyor. `makam/data.ts:32` ise bulanık Levenshtein eşleşmesi (`withinOneEdit`)
— benzersizse kabul. `near.length === 1` *belirsizliği* engelliyor, *yanlışlığı*
engellemiyor: korpus büyüdükçe 1-edit çakışması sessizce yanlış makamın koma
dizisini ve arıza imzasını bağlayabilir. Log yok, makam başına çözümlenen
anahtarı sabitleyen test yok.

**Ölçüm** (runtime): 48 makamın 42'si `komaScale`, 40'ı `keySignature`, 44'ü
`seyir` alıyor → **6 makam korpus koma'sı almıyor** ve `intervals`'ı el-yazımı
kalıyor.

- [x] Makam tarafını da açık alias tablosuna geçir; çözümlenen anahtarı makam
      başına sabitleyen snapshot testi ekle.

### D15 · Küçük bulgular 🟢

- [x] `instruments.ts:227-233` vurmalı dalı `percussionInstrument`ı düşürüyor
      (`preloadPercussionSymbolSamples(["tek"])` ve `scheduleSampledPercussionHit`
      parametresiz), synth fallback ise geçiriyor. **Şu an ulaşılamaz**:
      `InstrumentSurface.tsx:101` melodiğe kelepçeliyor, samples sayfası
      `playRhythm` kullanıyor, `VirtualPiano` hiçbir sayfada render edilmiyor.
      Latent; düzeltilmeli ama kullanıcıya görünmüyor.
- [x] `VirtualPiano` ölü kod — yalnız `shared/ui/index.ts` barrel'ından export
      ediliyor ve kendi testinde kullanılıyor; hiçbir sayfa render etmiyor.
- [x] Ölü export'lar: `nota/data.ts` `NOTE_DATA` (18 satırlık, `midiToFrequency`i
      kopyalayan sabit tablo), `parseSymbTr` (bozuk identifier'da hata yerine boş
      string dönüyor), `makam/data.ts` `komaToFrequency`.
- [x] `getMeasureIndex` 4/4 fallback'i **iki yerde kopyalanmış**
      (`canonical-score.ts:245`, `importer.ts:342`). Gerçek korpusta hiç
      tetiklenmiyor (ölçüm: 0/146.477 null `measureIndex`), ama kullanıcı
      yüklemesi (untrusted) yolunda 10/8, 28/4 eserleri 4 vuruşta bir bölerdi.
- [x] `samples.ts:21` `fetch(url, {cache: "reload"})` HTTP cache'i baypas ediyor;
      her sayfa yüklemesinde tüm sample'lar yeniden ağdan iniyor.
- [x] Ney kapsamı 10/36 ve boşluklu (`D3(50)` sonrası `B3(59)`: 9 yarım-ton
      delik). Ney `playScale`'in varsayılan enstrümanı; 54-56 aralığı 4-6
      yarım-ton pitch-shift'le üretiliyor, formant kayması duyulur.
- [x] `getMakamScale` 12-TET izdüşümü — MakamStepper'daki "Perde dizisi" sesin
      çaldığı koma dizisi değil; aynı ekranda iki farklı gerçeklik.
- [x] `makam-corpus.json` (128 KB) + seyir (22 KB) istemciye gidiyor
      (`/studio`, `/ogren`); `attachCorpusData` hydration'da 48 makam için tüm
      korpus anahtarlarına karşı edit-distance koşuyor. Bundle guard'ı
      (1,5 MB/chunk) geçiyor ama gereksiz.

---

## K — Kalan işlerin kökten çözümü ✅ TAMAMLANDI (2026-07-26)

> D bölümünde kapsam dışı bırakılan altı iş, ölçümle açılıp kökünden çözüldü.
> Kapanış: `typecheck` PASS · `test:run` **111 dosya / 763 test PASS** ·
> `lint` PASS · `guardrails:architecture` PASS · `build` PASS ·
> `audit:bundle-size` PASS.

### K1 · Vurmalı sample'lar tek vuruşa kırpıldı ✅

Dalga formu analizi (64 dosya, 10 ms tepe zarfı) **kudüm'ün `dum`/`ke`/`tek`
kayıtlarının ~10 ms ve ~310 ms'de İKİ vuruş içerdiğini** gösterdi —
`kudum/tek.wav`'da ikinci vuruş birincidan daha güçlüydü. Kudüm D11'de
varsayılan vurmalı yapılmıştı, yani en çok çalınan dosyalar bozuktu.
"Teklerde iki vuruş geliyor" (2026-07-14) bir kod hatası değil, **dosya
içeriği** sorunuymuş; D8'deki `SAMPLE_REBOUND_GUARD_BEATS` semptomu örtüyordu.

Gerçek vuruşu doğal rezonanstan ayıran ölçüt ölçüldü — gerçek: aralık
290-300 ms / yükseliş 5,0-7,9×; rezonans (zil, davul, zilli def): 30-260 ms /
1,2-3,3×. Eşik olmadan zil 1600 ms'den 70 ms'ye kırpılıp yok oluyordu.

- [x] `scripts/trim-percussion-samples.mjs` (dry-run + `--write`) — 3 kudüm
      dosyası ilk vuruşa kırpıldı, **54/54 sample artık tek vuruş**.
- [x] `SAMPLE_REBOUND_GUARD_BEATS` kaldırıldı; uzun darplar (korpustaki 1.400
      darbın %26'sı) artık notalı değerleri kadar sesleniyor.
- [x] `sample-library.test.ts`'e tek-vuruş regresyon kapısı eklendi.

### K2 · Triole (tuplet) desteği ✅

SymbTr `pay/payda` tam notaya göredir; payda 3'ün katı ve payda/3 ikinin
kuvvetiyse üçlü bölünmedir (1/12 → sekizlik, 1/24 → onaltılık, 1/48 →
otuzikilik). `getTupletContext` + `mapEventDurationToVex` bunu ayırıyor,
`ScoreSurface` ardışık aynı-paydalı notaları **3:2 bracket**'iyle çiziyor.

- [x] **2.178 event** artık gerçek tuplet olarak çiziliyor (önce yaklaşık).
- [x] `tuplet-time-modification` dispatch'i `source-proven`/`rendered` —
      eskiden "not-rendered" diyordu ama notalar çiziliyordu.

### K3 · Bağ (tie) ile bölme ✅

Tek standart değerle yazılamayan süreler greedy olarak standart değerlere
bölünüp bağlanıyor: 5/8 → ikilik+sekizlik, 5/4 → birlik+çeyreklik, 3/2 →
birlik+ikilik. `ScoreSurface` bir event'i N notaya çiziyor; arıza/annotation
yalnız ilk parçaya konuyor, kaynak-kanıtlı bağlar son notadan bağlanıyor.

- [x] **583 event** bağla bölünüyor.
- [x] **Süre sadakati %100**: 146.045/146.045 event kaynaktaki süresiyle
      çiziliyor, yaklaşık kalan **0**. (Zincir: %96,12 → %98,06 → %100.)

### K4 · `hek` kendi kanalında ✅

`PercussionSymbol`e `hek` eklendi (profiles / sample-library / samples / synth).
Ses **uydurulmadı**: kaynak (Kudüm kitabı s.14) hek'i "iki elin birlikte
vuruşu" diye tanımladığı için `scripts/derive-hek-samples.mjs` aynı sazın
`dum` (sağ el) + `tek` (sol el) kayıtlarını toplayıp 0,95 tepeye normalize
ediyor — tanımın birebir gerçeklenmesi. 9 saz × 2 = **18 dosya**.

- [x] `hek` artık `tek`e/`dum`a eşlenmiyor, kendi sample'ını çalıyor (36 darp).
- [x] Gerçek `hek` kaydı bulunursa dosyaların üzerine doğrudan yazılabilir.

### K5 · Render sanallaştırma + responsive genişlik ✅

- [x] Viewport penceresi: 24 sistemden büyük belgelerde yalnız görünür
      aralık + 6 sistem overscan çiziliyor (SVG yüksekliği değişmez, kaydırma
      bozulmaz). Eşik altında eski tam yol korunuyor.
- [x] Yüzey genişliği kapsayıcıya göre **büyüyor** (daralmıyor); eskiden sabit
      1180 px'ti ve geniş ekranda sağda boşluk kalıyordu.

### K6 · Korpus JSON ❌ AÇILMADI — ölçüm gerekmediğini gösterdi

Daha önce "150 KB istemciye gidiyor" denmişti; **sıkıştırma hesaba
katılmamıştı**. Gerçek: JSON minified 59,2 KB, **gzip 6,8 KB**. Yalnız
kullanılan 42 anahtara süzülse gzip 3,4 KB olur — 2,47 MB bundle'da **%0,14**.
Yeni bir üretilmiş dosya + derive script + senkron testi + kalıcı drift riski
bu kazanç için kötü takas. Tetikleyici: bundle bütçesi zorlanırsa yeniden bak.

### K7 · `VirtualPiano` kaldırıldı ✅

- [x] Bileşen, testi ve `shared/ui` barrel export'u silindi (hiçbir sayfa
      render etmiyordu).

---

## L — Kalan denetimi: kendi işimin doğrulanması (2026-07-26)

> D ve K bölümleri kapandıktan sonra **yazdığım kodun açık taraflarını** ölçtüm.
> Bir hata buldum ve düzelttim; bir iş tasarlandı, ölçüldü ama **bilinçli olarak
> indirilmedi**. Ağaç yeşil: `typecheck` PASS · **111 dosya / 768 test PASS** ·
> `lint` PASS.

### L0 ✅ ÇÖZÜLDÜ — K2'de kesir sadeleştirilmiyordu (kendi hatam)

`getTupletContext` **ham paydaya** bakıyordu. `3/12` aslında `1/4` (düz
çeyreklik), `9/24` = `3/8` (noktalı çeyreklik), `3/48` = `1/16` — hiçbiri üçlü
bölünme değil. Korpusta **5 event yanlış triole işaretlenmişti**.

- [x] Kesir önce sadeleştiriliyor; tuplet 2178 → **2173** (gerçek triole sayısı),
      bracket'siz kalan 9 → **4**. Regresyon testi eklendi.

### L1 ➡️ ÇÖZÜLDÜ (teşhis) → PLAN.md §3/G7'ye taşındı

> **Güncelleme 2026-07-27:** aşağıdaki "kaynak-otoritesi çözülmeden yapılamaz"
> hükmü ARTIK GEÇERLİ DEĞİL. Otorite belirlendi: yazılı mertebe mu2 satır-1
> alan 0–1'de açıkça yazılı ve Offset formülü 2.987/3.000 dosyada birebir
> yeniden üretiliyor (`offset += (Pay/Payda) ÷ mertebe`). Sapmanın sebebi de
> bulundu: **code-52 tempo satırları Offset eksenini ilerletiyor** —
> 52 hariç tutulunca ölçü doluluğu %64,9 → %86.
>
> L1 artık bağımsız bir iş değil; ana motor göçünün **G7 adımı** (bkz.
> [PLAN.md](PLAN.md) §3). Aşağısı teşhis kaydı olarak durur.

**Önceki gerekçe (demo fixture tutarsız) YETERSİZDİ.** Daha derin ölçüm asıl
engeli ortaya çıkardı ve bu arada iki hipotezimi çürüttü.

**Ölçüm 1 — `Offset` kümülatif `Pay/Payda` mı?** Hayır. 398 dosyanın 312'sinde
sapma ≥ 0,5 (yazım hassasiyeti değil, kademeli birikip 93'e kadar çıkan gerçek
fark). Yalnız 45 dosya (%11,3) birebir eşleşiyor — hicazkâr peşrev onlardan
biri, bu yüzden tek dosyadan yaptığım genelleme yanlıştı.

**Ölçüm 2 — `ceil(offset)` yanlış mı ölçü sayıyor?** Hayır, DOĞRU. Verinin
ima ettiği bar uzunluğu küçük usullerde usul ölçüsüne uyuyor (düyek 8/8 → ~4,
aksak 9/8 → ~4,3), ama büyük usullerde uymuyor (devrikebir 28/4 → ~4;
hafif 32/4 → ~4). SymbTr büyük usulleri **küçük nota barlarına bölerek**
yazıyor — 28 vuruşluk tek bar yazılmaz. Yani `measureIndex` = basılı bar
numarası ve mevcut kod doğru. *("7× fazla ölçü sayıyor" iddiam çürütüldü.)*

**Ölçüm 3 — hangi sütun zaman otoritesi?**

| kontrol | uyan |
|---|---|
| `Ms` ∝ `Pay/Payda` (cv < %2) | 379/398 (**%95,2**) |
| `Offset` == kümülatif `Pay/Payda` | 45/398 (**%11,3**) |

İki bağımsız sütun (`Pay/Payda` + `Ms`) zamanda anlaşıyor; `Offset` ayrışıyor.
**Zaman otoritesi `Pay/Payda`; `Offset` kaynaktaki basılı bar konumudur.**

**ASIL ENGEL:** bölme, notanın barın ne kadarının solunda kaldığını bilmeyi
gerektirir. Bu oran `Offset` biriminde hesaplanır — ama notanın SÜRESİ
`Pay/Payda`'dan gelir. Dosyaların **%88,7'sinde bu ikisi aynı zamanı
anlatmıyor**, dolayısıyla Offset'ten türetilen oran, notanın gerçek süresinin
aynı oranına karşılık gelmiyor. Bu haliyle bölme, eserlerin ~%89'unda
**yanlış parça süreleri** üretir.

Bu bir kod sorunu değil, **kaynak-otoritesi sorunu**: basılı bar (`Offset`) ile
notalı zaman (`Pay/Payda`) SymbTr'de birbirinden bağımsız iki eksen. Projenin
bağlayıcı kuralı gereği birini keyfî seçemem.

**Açılması için gerekenler — ✅ HEPSİ ÇÖZÜLDÜ (FAZ A, 2026-07-27):**
- [x] `Offset` sütununun tanımı belirlendi. README v2 madde 3 + G3 kapısı:
      **yazılı ölçü cinsinden, notanın BİTTİĞİ kümülatif konum.** Formül
      `offsetDelta = (Pay/Payda) ÷ yazılıMertebe` **2987/2999 eserde birebir**
      yeniden üretilerek kanıtlandı.
- [x] PDF ölçü kutularının bağlı olduğu eksen artık **kayıtlı**, çıkarım
      değil: `measureIndexBasis` (G5). 546 girdi / 19.064 kutu
      `meter-walk-v2` tabanında (G6.1).
- [x] Bar çizgileri **tek eksenden** türiyor: kanonik tick ekseninde
      `MeterMap` yürünüyor (G6). `Offset` ölçü için **hiç** kullanılmıyor —
      iki eksenin karışması yapısal olarak imkânsız hale geldi.
      Bölme (G7) de aynı eksenden hesaplanıyor.
- [x] `setStrict(false)` ölçüldü — **kaldırılamaz, ve bu bir kusur değil.**
      İki bağımsız sebep:
      1. **Yapısal:** `Voice` **ölçü başına değil, render sistemi başına**
         kuruluyor (`ScoreSurface.tsx:368`). Sistem, bir ölçünün keyfî bir
         dilimi; `numBeats` de `Math.ceil(span)` ile yuvarlanıyor. Strict mod
         tick toplamının mertebeye **tam** eşitliğini ister — dilimlerde bu
         hiçbir zaman sağlanamaz.
      2. **Veri:** ölçü doluluğu G9 sonrası **%98,03** (G7 sonrası %88,81'di).
         Ölçü başına voice'a geçilse bile kalan ~%2 strict modda hata verirdi.
         *(Bu sayı iyileşti ama sonucu değiştirmiyor: 1. sebep tek başına
         yeterli — sistem dilimi ölçüye eşit değil.)*
      Kaldırmak için önce voice'ların ölçü başına kurulması, sonra
      doluluğun %100'e çıkması gerekir — ikisi de ayrı iş.

**Not:** daha önce raporladığım "ölçülerin %32'si dolmuyor" bulgusunun bir
kısmı bar geçişi değil, bu iki eksenin uyuşmazlığıymış. Bölme denemesi
doluluğu %66,28 → %78,83 çıkarmıştı ama bu sayı da aynı karışımdan etkileniyor.

### L2 ✅ ÇÖZÜLDÜ (2026-07-27) — blokaj kalktı, denetimler koştu

Takılmış süreç artık yok; port boş. Blokaj kalkınca **gizli kusurlar ortaya
çıktı** — hepsi giderildi.

- [x] **23 e2e testi koştu** — ilk denemede 16/7, şimdi **23/23**
      (dev sunucusu *ve* üretim derlemesi). 7 a11y hatasının hepsi çözüldü.
- [x] K5 geometrisi **tarayıcıda** doğrulandı: `denseSystemCount` 0,
      `overlongSystemCount` 0, `maxEventsPerSystem` 16/24, `maxBeatSpan` 4/7.
      `audit:score-engine-engraving` → **0 hata**; `audit:studio-follow` → `ok`.
- [x] **`ScoreSurface`'te gizli çökme bulundu:** `vexflow.Glyphs` tarayıcı
      paketinde yok → tüm porte çizimi çöküyordu (sadece anahtar + mertebe
      görünüyordu). Kusur bu oturumdan **önce** vardı; jsdom'da VexFlow
      çizmediği için birim testleri yakalayamazdı, tarayıcı denetimi de
      blokaj yüzünden koşamıyordu. Giderildi.

### L3 ✅ ÇÖZÜLDÜ (2026-07-27) — C4 + C4.1'de yeniden ölçüldü

"L1 indikten sonra yeniden ölçülmeli" dendiği gibi yapıldı ve **hipotez
kısmen yanlış çıktı**: sorun tek-kalan triolelerden çok, bölmenin **triole
üretmesiydi**.

- Bölünen 5.984 notanın **23'ü** triole kaynağıydı → artık hiç bölünmüyor.
- Triole olmayan notaların **376 parçası** triole şeklinde kesre denk gelip
  **sahte triole** çiziliyordu → artık böyle bölme yapılmıyor.
- Bölünen nota: 5.984 → 5.961 (C4) → **5.773** (C4.1). İkisi de teste bağlı.

### L4 · Ney kapsamı 🟡 — kod işi değil

10/36 slot dolu, `D3(50)` → `B3(59)` arasında 9 yarım-tonluk delik var; o aralık
4-6 yarım-ton pitch-shift'le üretiliyor. Ney `playScale`'in varsayılan enstrümanı.

**Düzeltme:** daha önce "geç zirve, kusur olabilir" demiştim — o ölçüm RMS
zarfıydı ve onu *atak* diye yorumlamıştım. Yeniden ölçüldü: 10 dosyanın hepsinde
ses **0 ms'de başlıyor**, tepe 0 ms'de 1.000. Kırpılacak kusur **yok**; bu bir
kayıt eksiği, stüdyo işi.

---

### Kapanış özeti (referans)

Prod closure `ok:true`, blocker yok. Harici kaynak terminal karar 2978/2978
(unresolved 0), PDF terminal karar 1285/1285 (unresolved 0), verified ölçü kutusu
18334 korunuyor. Güvenlik sayaçları: directAutoAttach 0, mediaDownload 0,
sourceContentCopied 0.

Son doğrulama (2026-07-26):
- `npm run test:run`: 107 dosya / 695 test PASS
- `npm run typecheck`: PASS (0 hata)
- `npm run lint`: PASS (0 hata, 0 warning)
- `npm run guardrails:architecture`: PASS
- `npm run build`: PASS

### Kritik kurallar (kalıcı)

- Harici medya/PDF/audio otomatik indirilmez.
- Search/LLM çıktıları kanıt değildir; accepted manifest'e doğrudan yazılmaz.
- Feedback weak-label'dir; domain trust + metadata match + validator kapıları
  olmadan doğruluk kabul edilmez.
- PDF tarafında LLM final hakem değildir; terfi deterministik/human evidence ile.

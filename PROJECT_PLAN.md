# Muzik - Master Proje Planı ve Mimari Kurallar

> 2026-05-09 itibariyle baglayici urun mimarisi
> `PRODUCT_ARCHITECTURE.md`, baglayici kod kural seti
> `ENGINEERING_RULESET.md` dosyasidir. Bu dosya tarihsel durum ve onceki
> calisma notlari icin korunur.

Bu doküman, sistem mimarisi analizinden çıkan sonuçlara göre projenin geliştirme, refaktör ve kurallar bütününü temsil eder.

## 2026-05-09 Güncel Strateji ve Kanıtlı TODO

### Proje Amacı
Muzik; Türk müziği odaklı nota, makam, usül, ses üretimi, kayıt, arşiv ve ensemble akışlarını tek Next.js uygulamasında birleştiren eğitim/çalma platformudur. Çekirdek veri yaklaşımı SymbTr/Türk müziği kavramlarını merkezde tutar; MIDI/Web Audio yalnızca icra, giriş ve çıktı katmanlarında kullanılır.

### Mimari Kararlar
- [x] React/Next.js ile devam edilecek; kullanıcı şartı gereği HeroUI v3.0.4 proje bağımlılığına alındı.
- [x] HeroUI v2 provider/plugin kalıntıları kaldırıldı; v3 stili `@heroui/styles` üzerinden global CSS'e eklendi.
- [x] UI yüzeyi v2 API'lerine bağlı kalmasın diye Card/Input/Select/Badge/Slider/Button yerel atom sözleşmelerinde merkezileştirildi.
- [x] Backend/API tarafı Next App Router route handler yapısında tutuldu; Next 15 async dynamic params imzası uygulandı.
- [x] Drizzle/libSQL veri katmanı güvenli sürümlere yükseltildi ve güncel Drizzle Kit CLI komutlarına geçirildi.
- [x] Üretim build'i Google Fonts ağına bağlı kalmasın diye `next/font/google` kaldırıldı; sistem font stack merkezi tema tokenlarında tanımlandı.
- [x] GitNexus bu repo için indekslendi ve registry'ye `Muzik` kaydı eklendi; Devinim kaydı korunmuştur.

### Kanıtlı Doğrulama Kapıları
- [x] `npm audit --audit-level=moderate` → 0 vulnerability.
- [x] `npm run lint` → ESLint CLI ile uyarı/hata yok.
- [x] `npm run typecheck` → hata yok.
- [x] `npm run test:run` → 16 test dosyası, 166 test başarılı.
- [x] `npm run build` → başarılı production build.
- [x] `npm run db:generate` → Drizzle config okunuyor; şema değişikliği yoksa no-op, ilk migration üretildi.
- [x] `npx gitnexus status` → Muzik indeksi up-to-date.
- [x] `npx gitnexus list` / MCP `list_repos` → `Muzik` ve `Devinimv2` ayrı kayıtlar olarak görünüyor.

### Yeni Test Kapsamı
- [x] `/api/scores` GET response shape (`{ scores }`) testi.
- [x] `/api/scores` POST zorunlu alan validasyonu testi.
- [x] `/api/scores` POST başarılı kayıt response shape (`{ score }`) testi.
- [x] `/api/scores/[id]` GET async params ve tekil response shape testi.
- [x] `/api/scores/[id]` geçersiz id testi.
- [x] `/api/scores/[id]` PUT ve DELETE response shape testleri.

### 2026-05-09 Ek Denetim Tespitleri ve Çözümleri
- [x] **Next 16 lint uyumluluğu:** `next lint` deprecate olduğu için `npm run lint` doğrudan ESLint CLI'a geçirildi; `lint:fix` script'i eklendi.
- [x] **ESLint CLI kapsamı:** Kök dizindeki bozuk `update.js` / `update_data.js` dosyaları kullanılmadığı doğrulanıp kaldırıldı; CommonJS `server.js` için ESLint override eklendi.
- [x] **Prod cache güvenliği:** `/:path*` genel header'ındaki `Cache-Control: public, max-age=31536000, immutable` kaldırıldı; immutable cache yalnızca sample ve Next static asset route'larında kaldı.
- [x] **Ensemble boş oda bağlantısı:** `useEnsemble` boş `roomId` ile Socket.io bağlantısı açmayacak ve boş oda join etmeyecek şekilde sertleştirildi.
- [x] **Ensemble istemci log'u:** Remote note `console.log` kaldırıldı; kullanıcıya çevrilebilir durum metniyle sayaç gösterimi eklendi.
- [x] **Signaling server güvenliği:** Varsayılan `*` CORS kaldırıldı; `CORS_ORIGIN` allow-list ve boş oda/kullanıcı payload validasyonu eklendi.
- [x] **Git ignore hijyeni:** `package-lock.json` ignore dışına çıkarıldı; yerel SQLite dosyaları ignore kapsamına alındı.

### 2026-05-09 Bütüncül Enstrüman, Nota, Tasarım ve Runtime Denetimi
- [x] **Sessiz enstrüman riski:** Sample dosyası olmayan enstrümanlarda synth fallback varsayılanı sessiz kalıyordu; `NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK=false` verilmedikçe fallback açık olacak şekilde düzeltildi.
- [x] **Enstrüman kapsamı:** Melodik katalog Ney, Ud, Kemençe ve Tanpura ile sınırlıydı; Kanun, Bağlama, Tambur, Santur, Lavta, Rebab ve Miskal synth profilleriyle eklendi.
- [x] **Vurmalı kapsamı:** Bendir, Kudüm, Davul ve Def yanında Darbuka, Zilli Def, Kaşık, Zil ve Nakkare profilleri eklendi.
- [x] **Sample yönetimi:** Yeni tüm enstrümanlar için `/api/samples` upload slotları üretilecek şekilde sample katalogları genişletildi.
- [x] **Seçim UI tutarlılığı:** Makam ve Nota Editörü sayfalarındaki sabit dört enstrüman filtresi merkezi `MELODIC_INSTRUMENTS` kataloğuna bağlandı.
- [x] **Regresyon testi:** Enstrüman listesi, profil tipi ve sample slotlarının uyumunu denetleyen test eklendi.
- [x] **Ham tarayıcı diyalogları:** Arşiv silme ve nota kaydetme akışlarındaki `confirm` / `alert` yerine inline durum ve onay arayüzü getirildi.
- [x] **Mobil layout:** Ortak header nav yapısı küçük ekranlarda yatay taşma yerine kontrollü kaydırılabilir hale getirildi.
- [x] **Doğrulama:** `npm run typecheck`, `npm run lint`, `npm run test:run` yeni enstrüman ve UI düzenlemelerinden sonra yeşil.

### Kalan Yol Haritası
- [ ] Gerçek kalıcı veritabanı hedefi netleşince `DATABASE_URL` ve migration çalıştırma akışı prod/staging olarak ayrılacak.
- [ ] Ensemble modülünde WebSocket sunucu yaşam döngüsü prod dağıtım modeline göre ayrıştırılacak.
- [ ] Nota OCR ve tomato entegrasyonu ayrı servis/adaptör sınırlarıyla planlanacak.
- [ ] i18n kapsamı genişletilip kalan doğrudan Türkçe UI metinleri çeviri dosyalarına taşınacak.

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

## 📋 TODO LİSTESİ (YOL HARİTASI)

### AŞAMA 1: Dev Refaktör (Ses Motorunun Parçalanması) - TAMAMLANDI ✅
Mevcut `src/engines/ses/instruments.ts` dosyasının parçalanarak modüler hale getirilmesi.
- [x] **1.1** `core.ts` oluştur: AudioContext lifecycle, masterGain ve stopAll yönetimini buraya taşı.
- [x] **1.2** `profiles.ts` oluştur: Ney, Ud vb. config verilerini (InstrumentProfile) ayır.
- [x] **1.3** `synth.ts` oluştur: Envelope, Harmonics ve Oscillator sentezleyici fonksiyonlarını ayır.
- [x] **1.4** `samples.ts` oluştur: Buffer load, preload ve fetch işlemlerini ayır.
- [x] **1.5** `instruments.ts` (ana dosya) temizliği: Sadece yukarıdaki modülleri birleştirip ana fonksiyonları (`playInstrumentNote`, vb.) dışarı aktaran bir köprü (facade) haline getir.

### AŞAMA 2: State Management Entegrasyonu (Zustand) - TAMAMLANDI ✅
- [x] **2.1** `zustand` paketinin projeye eklenmesi.
- [x] **2.2** `src/store/editorStore.ts` oluşturulması (isRecording, isPlaying, recordedNotes yönetimi).
- [x] **2.3** `nota-editor/page.tsx` sayfasının Zustand ile refaktör edilip UI'ın iş mantığından temizlenmesi.

### AŞAMA 3: Türk Müziği Veri Katmanı (Database & SymbTr) - TAMAMLANDI ✅
- [x] **3.1** Prisma veya Drizzle ORM kurularak Postgres veritabanının bağlanması. (Altyapı eklendi)
- [x] **3.2** NotaArşivi (Score) ve User modellerinin DB şemalarının yazılması. (`src/db/schema.ts`)
- [x] **3.3** MIDI tabanlı nota tutma mantığının SymbTr formuna dönüştürülmesi. (DB şemasına eklendi)

### AŞAMA 4: Gelişmiş Özellikler - TAMAMLANDI ✅
- [x] **4.1** VexFlow entegrasyonu (Notaların gerçek dizekte koma işaretleriyle çizilmesi altyapısı kuruldu `VexFlowViewer.tsx`).
- [x] **4.2** WebRTC ile Ensemble (Birlikte çalma) altyapısının kurulması (`useEnsemble.ts` hook'u eklendi).

---

*Not: Çalışmaya Aşama 1.1 (AudioContext'in ayrıştırılması) ile başlanacaktır.*

# Muzik - Türk Müziği Uygulaması

## Vizyon

Türk müziği için kapsamlı bir nota, usül ve makam çalma platformu. Nota girişi, audio kayıt, ensemble çalma ve öğretici mod içeren tam özellikli bir uygulama.

## Teknoloji Stack

- **Frontend**: React/Next.js + Native Web Audio API (Audio/MIDI)
- **Backend**: Node.js + WebSocket (Ensemble)
- **Database**: PostgreSQL
- **Platform**: Web + Mobil (responsive)

---

## Modül Mimarisi

```
┌─────────────────────────────────────────────────────────┐
│                     MAKAM USÜL APP                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  NOTA   │  │  USÜL   │  │  MAKAM  │  │  SES    │    │
│  │  MOTORU │  │  MOTORU │  │  MOTORU │  │  MOTORU │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       └───────────┴───────────┴───────────┘           │
│                         │                              │
│              ┌──────────┴──────────┐                  │
│              │   ORCHESTRATOR       │                  │
│              └──────────┬──────────┘                  │
│                         │                              │
│  ┌──────────┐  ┌────────┴───────┐  ┌──────────┐       │
│  │   UI     │  │   BACKEND      │  │  DATABASE│       │
│  │ (React)  │  │   (API+WS)     │  │ (Postgres)│       │
│  └──────────┘  └────────────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## Modüller (Öncelik Sırasıyla)

### 1. Nota Motoru
**Amaç**: Nota okuma, yazma, parse etme

**Data Format**: SymbTr formatı (makam--form--usul--name--composer)
```
humayun--sarki--aksaksemai--nihavend--riyazist
```

**Giriş Yöntemleri**:
- [ ] PC Klavye ile nota girişi (sanal piano)
- [ ] MIDI cihaz desteği
- [ ] Fotoğraf/görsel nota OCR (ileri aşama)
- [ ] Audio kayıttan nota çıkarma (tomato entegrasyonu)

**Çıktı**:
- JSON nota formatı
- MIDI
- Görsel nota gösterimi

### 2. Usül Motoru
**Amaç**: Usül hesaplama, vuruş üretme, alternatif gösterim

**Türk Usülleri** (hedef: 100+ usul):
- Aksak Semai (9/8)
- Düyek (2/4)
- Sofyan (4/4)
- Türk Aksağı (9/8)
- Semai (6/4)
- Hafif (8/9)
- ... (genişletilecek)

**Vuruş Gösterimi**:
```
Usül: Aksak Semai (9/8)
Vuruşlar: Düm  Tek  Ke  Tek  Düm  Tek  Ke  Tek  Düm
Sayısal:  1    2    3    4    5    6    7    8    9
Sembol:   ●    ○    ○    ○    ●    ○    ○    ○    ●
```

### 3. Makam Motoru
**Amaç**: Makam bilgisi, transpozisyon, tını ayarı

**Türk Makamları** (hedef: 50+ makam):
- Uşşak
- Hicaz
- Rast
- Nihavend
- Hüseyni
- Saba
- ... (genişletilecek)

**Özellikler**:
- Makam bazlı transpozisyon
- Tını (timbre) ayarı
- Seyir analizi

### 4. Ses/Çalma Motoru
**Amaç**: Audio synthesis, playback

**Enstrümanlar**:
- [ ] Ud
- [ ] Kemençe
- [ ] Ney
- [ ] Tanpura
- [ ] Davul
- [ ] Def

**Teknoloji**: Native Web Audio API (OscillatorNode + GainNode)

### 5. Kayıt Motoru
**Amaç**: Audio kayıt, analiz

**Özellikler**:
- [ ] Mikrofon ile canlı kayıt
- [ ] Audio dosyası yükleme
- [ ] Melodi çıkarma (pitch detection)
- [ ] Nota formatına çevirme

**Entegrasyon**: tomato (Sertan Şentürk)

### 6. Nota Arşivi
**Amaç**: Nota kaydetme, paylaşma, arama

**Veritabanı**:
- Nota başlıkları
- Makam bilgisi
- Usul bilgisi
- Besteci
- Form (şarki, türkü, semai, vb.)

**Arama**: Makam, usul, besteci, form ile arama

### 7. Öğretici Modül
**Amaç**: İnteraktif müzik dersleri

**Özellikler**:
- [ ] Nota okuma egzersizleri
- [ ] Usul vuruş egzersizleri
- [ ] Makam tanıma egzersizleri
- [ ] İlerleme takibi

### 8. Ensemble Modülü
**Amaç**: Çoklu kullanıcı ile birlikte çalma

**Özellikler**:
- [ ] Real-time ses paylaşımı (WebSocket)
- [ ] Enstrüman seçimi
- [ ] Tonik/prova odası
- [ ] Chat/referans

---

## Araştırma Sonuçları

### Kritik Kaynaklar

| Kaynak | Dil | Özellik |
|--------|-----|---------|
| **tomato** | Python | Makam audio analysis, audio-score alignment, pitch extraction |
| **SymbTr** | - | Türk müziği için standart nota formatı |

### SymbTr Format
```
makam--form--usul--name--composer
Örnek: humayun--sarki--aksaksemai--nihavend--riyazist
```

### Çözüm Stratejisi

| Aşama | Yöntem | Zorluk |
|-------|--------|--------|
| 1 | SymbTr veritabanı import | Orta |
| 2 | Audio kayıttan nota (tomato) | Yüksek |
| 3 | Görsel OCR | Çok Yüksek |

---

## İlerleme Takibi

- [x] Merkezi mimari tasarımı
- [x] Modül önceliklendirme
- [x] Araştırma (tomato, SymbTr)
- [ ] README.md oluşturma
- [ ] Proje scaffold (Next.js, vb.)
- [ ] Nota Motoru implementasyonu
- [ ] Usül Motoru implementasyonu
- [ ] Makam Motoru implementasyonu
- [ ] Ses/Çalma Motoru implementasyonu
- [ ] Kayıt Motoru implementasyonu
- [ ] Arşiv Modülü implementasyonu
- [ ] Öğretici Modül implementasyonu
- [ ] Ensemble Modülü implementasyonu

---

## Kurulum

```bash
# Projeyi klonla
git clone https://github.com/ogunozden/Muzik.git
cd Muzik

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

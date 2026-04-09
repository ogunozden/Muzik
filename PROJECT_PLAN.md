# Muzik - Proje Planı ve Hata Analizi

> **Tarih:** 2026-04-09  
> **Versiyon:** 1.0  
> **Durum:** Derin Analiz Tamamlandı

---

## 📊 MEVCUT DURUM ÖZETİ

| Metrik | Değer | Durum |
|--------|-------|-------|
| Toplam Kod Satırı | ~3,500 | - |
| Test Coverage | ~45% | ⚠️ Düşük |
| Kritik Hata | 3 adet | 🔴 Acil |
| Orta Öncelikli | 5 adet | 🟡 Önemli |
| Düşük Öncelikli | 4 adet | 🟢 Geliştirme |
| Build Durumu | ✅ Başarılı | - |
| Lint Durumu | ✅ Temiz | - |

---

## 🚨 KRİTİK HATALAR (P0 - Acil Çözüm Gerekli)

### 1. **playSequence - Race Condition**
**Dosya:** `src/engines/ses/engine.ts:56-65`  
**Şiddet:** 🔴🔴🔴 Kritik  
**Etki:** Nota editörde kaydedilen notalar sırayla çalıyor, aynı anda değil

```typescript
// ❌ HATALI: Sequential await
for (const note of notes) {
  await playInstrumentNote(note.midiNumber, ...); // Her nota önceki bitene kadar bekler
}
```

**Neden Kritik:** 
- Kullanıcı 4 nota kaydeder, 4 saniye yerine 16 saniye sürer
- Ritim/tempo tamamen bozuk
- Polyphonic playback imkansız

**Çözüm:** Web Audio API `currentTime` ile schedule
```typescript
// ✅ DOĞRU: Schedule-based
const startTime = context.currentTime;
notes.forEach((note) => {
  scheduleAt(startTime + note.startTime, () => playNote(note));
});
```

**Tahmini Süre:** 2 saat

---

### 2. **AudioContext Memory Leak**
**Dosya:** `src/engines/ses/instruments.ts:118-143`  
**Şiddet:** 🔴🔴🔴 Kritik  
**Etki:** Uzun kullanımda tarayıcı çökebilir

```typescript
// ❌ HATALI: Global state, cleanup yok
let audioContext: BrowserAudioContext | null = null;

export async function initAudio(): Promise<boolean> {
  if (!audioContext) {
    audioContext = new AudioContext(); // Yeni context
  }
  // Eski context'ler memory'de kalıyor!
}
```

**Neden Kritik:**
- Her sayfa geçişinde yeni AudioContext
- `close()` çağrılmıyor
- Chrome 50+ context limiti var

**Çözüm:** Singleton pattern + cleanup
```typescript
// ✅ DOĞRU: Lifecycle management
class AudioEngine {
  private static instance: AudioEngine;
  private context: AudioContext | null = null;
  
  async init() {
    if (this.context?.state === 'closed') {
      this.context = null;
    }
    if (!this.context) {
      this.context = new AudioContext();
    }
  }
  
  dispose() {
    this.context?.close();
    this.context = null;
  }
}
```

**Tahmini Süre:** 1.5 saat

---

### 3. **stopAll - Ses Kapanmıyor**
**Dosya:** `src/engines/ses/instruments.ts:677-680`  
**Şiddet:** 🔴🔴 Kritik  
**Etki:** Stop tuşuna basınca ses durmuyor

```typescript
// ❌ HATALI: Sadece suspend
export function stopAll(): void {
  audioContext?.suspend(); // Çalan notalar devam eder!
}
```

**Neden Kritik:**
- Kullanıcı stop'a basar ama ses devam eder
- Oscillator'lar hâlâ çalıyor

**Çözüm:** Aktif osc'ları takip et ve durdur
```typescript
// ✅ DOĞRU: Active oscillators tracking
const activeOscillators = new Set<OscillatorNode>();

export function stopAll(): void {
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch {}
  });
  activeOscillators.clear();
  audioContext?.suspend();
}
```

**Tahmini Süre:** 45 dk

---

## ⚠️ ORTA ÖNCELİKLİ HATALAR (P1 - Önemli)

### 4. **Interface Çakışması**
**Dosya:** `src/engines/ses/instruments.ts:15-33`  
**Şiddet:** 🟡🟡 Önemli  
**Etki:** TypeScript tip güvenliği bozuk

```typescript
// ❌ HATALI: Aynı isimde 2 interface
interface InstrumentProfile { ... } // Satır 15
// ...
interface InstrumentProfile { // Satır 33 - ÜZERİNE YAZIYOR!
  formants?: Formant[]; // İlk tanımda yok!
}
```

**Tahmini Süre:** 15 dk

---

### 5. **Note Duration - Sabit 0.5s**
**Dosya:** `src/app/nota-editor/page.tsx:35-44`  
**Şiddet:** 🟡🟡 Önemli  
**Etki:** Kullanıcı ne kadar basarsa bassın süre hep aynı

```typescript
// ❌ HATALI: Sabit duration
duration: 0.5, // Basılı tutma süresi ölçülmüyor!
```

**Çözüm:** Note on/off tracking
```typescript
const noteStartTimes = useRef<Map<number, number>>(new Map());

const handleNoteOff = (midiNumber) => {
  const start = noteStartTimes.current.get(midiNumber);
  const duration = performance.now() - start;
  // Update note with real duration
};
```

**Tahmini Süre:** 2 saat

---

### 6. **Missing Audio Engine Tests**
**Dosya:** `src/engines/ses/`  
**Şiddet:** 🟡🟡 Önemli  
**Etki:** Ses motoru test edilmiyor, regresyon riski yüksek

| Dosya | Test Coverage | Risk |
|-------|---------------|------|
| `instruments.ts` | 0% | 🔴 Yüksek |
| `engine.ts` | 0% | 🔴 Yüksek |

**Tahmini Süre:** 4 saat

---

### 7. **PianoRollViewer Gereksiz Re-render**
**Dosya:** `src/components/organisms/PianoRollViewer.tsx:50-72`  
**Şiddet:** 🟡 Orta  
**Etki:** UI donabilir

**Tahmini Süre:** 1 saat

---

### 8. **Makam/Usul Validasyonu Yok**
**Dosya:** `src/app/nota-editor/page.tsx`  
**Şiddet:** 🟡 Orta  
**Etki:** Mantıksız kombinasyonlar seçilebilir

**Tahmini Süre:** 1.5 saat

---

## 📝 DÜŞÜK ÖNCELİKLİ (P2 - Polish)

### 9. **Hardcoded Strings**
- Turkish text'ler i18n'e alınmalı
- **Tahmini Süre:** 30 dk

### 10. **Error Boundary Eksik**
- `src/app/layout.tsx`'e eklenecek
- **Tahmini Süre:** 30 dk

### 11. **Unused Dependencies**
- `tone` paketi kaldırılmalı
- **Tahmini Süre:** 15 dk

### 12. **Console Log Temizliği**
- Debug log'ları kaldırılmalı
- **Tahmini Süre:** 15 dk

---

## 📋 İŞ PLANI (Öncelik Sırası)

### Faz 1: Kritik Hatalar (P0) - 4.5 saat
- [ ] **1.1** playSequence race condition düzelt (2 saat)
- [ ] **1.2** AudioContext lifecycle management (1.5 saat)
- [ ] **1.3** stopAll fonksiyonunu düzelt (45 dk)
- [ ] **1.4** Build & test kontrolü (15 dk)

### Faz 2: Önemli Düzeltmeler (P1) - 9 saat
- [ ] **2.1** Interface çakışmasını düzelt (15 dk)
- [ ] **2.2** Note duration tracking implementasyonu (2 saat)
- [ ] **2.3** Ses motoru unit testleri (4 saat)
- [ ] **2.4** PianoRollViewer optimizasyonu (1 saat)
- [ ] **2.5** Makam/Usul validasyonu (1.5 saat)
- [ ] **2.6** Build & test kontrolü (15 dk)

### Faz 3: Polish (P2) - 1.5 saat
- [ ] **3.1** i18n hardcoded string'leri (30 dk)
- [ ] **3.2** Error boundary ekle (30 dk)
- [ ] **3.3** Unused dependencies temizliği (15 dk)
- [ ] **3.4** Console log temizliği (15 dk)

### Toplam Tahmini Süre: **15 saat**

---

## 🎯 BAŞARI KRİTERLERİ

### Faz 1 Tamamlandığında:
- ✅ Nota editörde kaydedilen notalar doğru zamanda çalmalı
- ✅ Stop tuşuna basınca ses anında kesilmeli
- ✅ 50+ nota kaydı sonrası memory kullanımı stabil kalmalı

### Faz 2 Tamamlandığında:
- ✅ Ses motoru için en az %70 test coverage
- ✅ Nota basılı tutma süresi kaydedilmeli
- ✅ Makam/Usul uyumsuz kombinasyonlar engellenmeli

### Faz 3 Tamamlandığında:
- ✅ Tüm UI text'ler i18n'den gelmeli
- ✅ Runtime hatalar error boundary ile yakalanmalı
- ✅ Sadece kullanılan dependency'ler package.json'da olmalı

---

## 🔧 TEKNİK DETAYLAR

### Ses Motoru Mimarisi (Hedef)

```
src/engines/ses/
├── core/
│   ├── AudioContextManager.ts    # Lifecycle & singleton
│   ├── Scheduler.ts              # Note scheduling
│   └── OscillatorPool.ts         # Resource pooling
├── instruments/
│   ├── base/
│   │   ├── Instrument.ts         # Abstract base
│   │   └── Synthesizer.ts        # Synthesis engine
│   ├── melodic/
│   │   ├── Ney.ts
│   │   ├── Ud.ts
│   │   ├── Kemence.ts
│   │   └── Tanpura.ts
│   └── percussion/
│       ├── Bendir.ts
│       ├── Kudum.ts
│       └── Def.ts
└── tests/
    ├── instruments.test.ts
    ├── scheduler.test.ts
    └── integration.test.ts
```

### Önemli Web Audio API Notları

1. **Scheduling**: `context.currentTime` kullan, `setTimeout` kullanma
2. **Memory**: Her `createOscillator()` için `stop()` çağır
3. **Context Limit**: Chrome'da max 6 context, `close()` şart
4. **Resume**: User gesture required (`pointerdown`, `keydown`)

---

## 📊 RİSK ANALİZİ

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| Audio API değişiklikleri | Düşük | Yüksek | Abstraction layer kullan |
| Browser compatibility | Orta | Orta | Feature detection ekle |
| Memory leak | Yüksek | Yüksek | Test + monitoring |
| Performans (mobil) | Orta | Orta | Lazy loading |

---

## 🎵 GELİŞTİRME ÖNERİLERİ (V2)

### Kısa Vadeli (1-2 ay):
- [ ] Sample-based playback (SoundFont)
- [ ] MIDI import/export
- [ ] Project save/load (JSON)
- [ ] Undo/redo history

### Orta Vadeli (3-6 ay):
- [ ] Audio recording (WebRTC)
- [ ] Pitch detection (tomato)
- [ ] Nota OCR
- [ ] Ensemble mode (WebSocket)

### Uzun Vadeli (6+ ay):
- [ ] Mobile app (React Native)
- [ ] AI eşlik (Magenta.js)
- [ ] Cloud sync
- [ ] Nota marketi

---

## 📁 GÜNCELLENECEK DOSYALAR

### Kritik (Faz 1):
1. `src/engines/ses/instruments.ts` - Core fixes
2. `src/engines/ses/engine.ts` - playSequence fix
3. `src/hooks/useOrchestrator.ts` - Integration

### Önemli (Faz 2):
4. `src/app/nota-editor/page.tsx` - Duration tracking
5. `src/components/organisms/PianoRollViewer.tsx` - Optimize
6. `src/engines/ses/__tests__/` - New test files

### Polish (Faz 3):
7. `src/app/layout.tsx` - Error boundary
8. `public/locales/` - i18n strings
9. `package.json` - Cleanup

---

## ✅ KABUL KRİTERLERİ

Projeyi "Production Ready" saymak için:

1. **Tüm P0 hatalar** çözülmüş
2. **Test coverage** en az %60
3. **Lint** sıfır hata
4. **Build** başarılı
5. **Manuel test** senaryoları geçilmiş:
   - Makam skalası çalma (tüm enstrümanlar)
   - Usül ritmi çalma (tüm usüller)
   - Nota kaydetme ve playback
   - Stop/Reset fonksiyonları

---

*Bu plan onaylandığında Faz 1 ile başlayabilirim.*

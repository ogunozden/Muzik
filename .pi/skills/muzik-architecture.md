# Muzik Architecture Skills

## Merkezi Mimari Kuralları

Bu proje için uygulanması zorunlu kurallar ve yetkinlikler.

---

## 🏛️ 1. ARCHITECTURE RULES (Mimari Kuralları)

### 1.1 Merkezi Yapı Zorunluluğu

**HER ŞEY MERKEZİ OLMALIDIR** - Hiçbir değer hardcode edilmemeli.

```
✅ DOĞRU:
import { colors } from '@/lib/theme';
import { appConfig } from '@/lib/config';
import { audioService } from '@/lib/services';

❌ YANLIŞ:
const FOO = "bar" // Hardcode
"bg-[oklch(...)]" // Inline CSS variable
```

### 1.2 Merkezi Export Zinciri

```
src/lib/
├── index.ts              # Ana merkezi export (TEK GİRİŞ NOKTASI)
├── theme/                # Tasarım tokenları
│   ├── index.ts
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── component-tokens.ts
├── config/               # Uygulama konfigürasyonu
│   ├── index.ts
│   ├── app.config.ts
│   ├── routes.config.ts
│   └── navigation.config.ts
├── services/             # Servisler
│   ├── index.ts
│   ├── audio.service.ts
│   ├── midi.service.ts
│   └── storage.service.ts
├── app-constants/        # Sabitler
│   └── index.ts
└── types/                # Tipler
    └── index.ts
```

### 1.3 Import Kuralları

```typescript
// ✅ Merkezi lib'den import et
import { colors, spacing, appConfig, audioService } from '@/lib';

// ✅ Alt modüllerden import et (spesifik ihtiyaç için)
import { colors } from '@/lib/theme/colors';
import { audioService } from '@/lib/services/audio.service';

// ❌ engines, hooks, components dışından doğrudan import YAPMA
// (lib dışındakiler lib üzerinden erişir)
```

---

## 🎨 2. DESIGN SYSTEM RULES (Tasarım Sistemi Kuralları)

### 2.1 Renk Kullanımı

```typescript
// ✅ Her zaman CSS variable kullan
<div className={colors.background.surface}>
  <h1 className={colors.text.primary}>Başlık</h1>
  <p className={colors.text.secondary}>Açıklama</p>
</div>

// ❌ Asla inline OKLCH değeri yazma
<div className="bg-[oklch(97% 0.01 85)]"> // YANLIŞ!
```

### 2.2 Spacing Kullanımı

```typescript
// ✅ Spacing tokenları kullan
<div className={spacing.padding.lg}>
  <div className={spacing.gap.md}>
    {children}
  </div>
</div>

// Section arası spacing için
<div className={spacing.section.spacious}>
  Section content
</div>

// Container için
<div className={spacing.container.wide}>
  Sayfa içeriği
</div>
```

### 2.3 Typography Kullanımı

```typescript
// ✅ Tipografi tokenları
<h1 className={`${typography.fontSize['4xl']} ${typography.fontWeight.bold}`}>
  Başlık
</h1>

// ✅ Line-height
<p className={`${typography.fontSize.base} ${typography.lineHeight.relaxed}`}>
  Paragraf
</p>
```

---

## 🔧 3. SERVICE RULES (Servis Kuralları)

### 3.1 Servis Yapısı

```typescript
// ✅ Singleton pattern kullan
class AudioService {
  private static instance: AudioService | null = null;
  
  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }
}

// ✅ Export singleton
export const audioService = AudioService.getInstance();

// ✅ Actions object (hook-friendly)
export const audioServiceActions = {
  play: () => audioService.play(),
  stop: () => audioService.stop(),
};
```

### 3.2 Servis Erişimi

```typescript
// ✅ Tekil erişim
import { audioService } from '@/lib';
await audioService.playNote(60, 0.5);

// ✅ Action-based erişim (hooks için)
import { audioServiceActions } from '@/lib';
audioServiceActions.playNote(60);
```

### 3.3 State Yönetimi

```typescript
// ✅ Servis içinde state
interface ServiceState {
  isInitialized: boolean;
  isPlaying: boolean;
  currentInstrument: InstrumentType;
}

// ✅ Getter/Setter pattern
get isPlaying(): boolean { return this.state.isPlaying; }
setInstrument(instrument: InstrumentType): void { ... }
```

---

## 🧩 4. COMPONENT RULES (Komponent Kuralları)

### 4.1 Atomic Yapı

```
components/
├── atoms/          # En küçük, tekrar kullanılabilir
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Badge.tsx
├── molecules/       # Atom grupları
│   ├── LabeledInput.tsx
│   └── PlaybackControls.tsx
├── organisms/       # Bağımsız UI bölümleri
│   ├── MakamPanel.tsx
│   └── PianoRollViewer.tsx
└── layout/          # Sayfa layoutları
    └── UnifiedLayout.tsx
```

### 4.2 Komponent Token Kullanımı

```typescript
import { buttonVariants, buttonSizes } from '@/lib/theme/component-tokens';

interface ButtonProps {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

// ✅ Token-based styling
<button className={`
  ${buttonVariants[variant ?? 'primary']}
  ${buttonSizes[size ?? 'md']}
  font-medium transition-colors
`}>
  {children}
</button>
```

### 4.3 Memoization

```typescript
import { memo } from 'react';

// ✅ Tüm componentleri memoize et
export const Button = memo(function Button({ ... }) { ... });
export const Badge = memo(function Badge({ ... }) { ... });
```

---

## 📦 5. TYPE RULES (Tip Kuralları)

### 5.1 Merkezi Tipler

```typescript
// src/lib/types/index.ts
export interface ServiceState {
  isInitialized: boolean;
  isPlaying: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  type: 'link' | 'dropdown';
}

// ✅ Enstrüman tipleri merkezi
export type InstrumentType = 'ney' | 'ud' | 'kemençe' | 'tanpura' | 'bendir' | 'kudum' | 'davul' | 'def';
```

### 5.2 Tip Export

```typescript
// ✅ Lib'den export et
export type { ServiceState, NavigationItem } from '@/lib/types';
export type { InstrumentType } from '@/engines/ses/instruments';
```

---

## 🪝 6. HOOK RULES (Hook Kuralları)

### 6.1 Hook Yapısı

```typescript
// ✅ Hook pattern
export function useAudio() {
  const [state, setState] = useState(initialState);
  
  const play = useCallback(() => {
    audioService.play();
  }, []);
  
  return { state, play };
}

// ✅ Parametreli hook
export function useAudio(options: { autoPlay?: boolean }) {
  const [state, setState] = useState(options.autoPlay ?? false);
  // ...
}
```

### 6.2 Servis Entegrasyonu

```typescript
// ✅ Hook -> Service -> Engine
export function useAudioEngine() {
  const playNote = useCallback(async (midi: number) => {
    await audioService.playNote(midi);
  }, []);
  
  return { playNote };
}
```

---

## 🚫 7. HARDCODE YASAKLARI

### 7.1 Yasaklı Örnekler

```typescript
// ❌ RENKLER - CSS variable kullan
❌ "oklch(97% 0.01 85)"
❌ "#FFFFFF"
❌ "bg-red-500"
✅ colors.background.base

// ❌ SPACING - Token kullan
❌ "px-4 py-2"
❌ "my-6 gap-4"
✅ spacing.padding.md, spacing.gap.lg

// ❌ STRİNG DEĞERLER - Config kullan
❌ "/makam"
❌ "Muzik"
❌ "tr"
✅ routes.makam, appConfig.name, appConfig.language

// ❌ NUMBERS - Config kullan
❌ 120 // BPM
❌ 4000 // Port
❌ 60 // Min BPM
✅ appConfig.audio.defaultBpm
✅ appConfig.development.port
✅ appConfig.audio.minBpm
```

### 7.2 İstisnalar

```typescript
// ✅ Sadece bu durumlarda hardcode:
// 1. Test değerleri
// 2. Basit matematik (1 + 2, index * 2)
// 3. Enum dışı edge case'ler (nadir)
```

---

## ✅ 8. SKILL CHECKLIST

Yeni kod yazmadan önce kontrol et:

```
[ ] Import'lar merkezi mi? (@/lib veya @/lib/xxx)
[ ] Renkler token'dan mı? (colors.xxx)
[ ] Spacing token'dan mı? (spacing.xxx)
[ ] String değerler config'den mi? (routes.xxx, appConfig.xxx)
[ ] Servis singleton mı? (xxxService.getInstance())
[ ] Component memoized mi? (memo())
[ ] Tip tanımları merkezi mi? (@/lib/types)
[ ] Hardcode değer var mı? (kaldır veya token ekle)
```

---

## 📚 REFERANSLAR

- Tüm tokenlar: `src/lib/theme/`
- Tüm config: `src/lib/config/`
- Tüm servisler: `src/lib/services/`
- Tipler: `src/lib/types/`
- Sabitler: `src/lib/app-constants/`

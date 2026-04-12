/**
 * Lib - Merkezi Kütüphane Exportları
 * 
 * Bu modül tüm lib altındaki modülleri tek bir yerden export eder.
 * Tüm uygulama bu merkezi modül üzerinden erişim sağlar.
 * 
 * KULLANIM:
 * import { colors, spacing, appConfig, audioService } from '@/lib';
 * 
 * KURALLAR:
 * 1. Asla hardcode değer kullanma - her şey token/config'den gelmeli
 * 2. Renkler için colors.xxx kullan
 * 3. Spacing için spacing.xxx kullan
 * 4. String değerler için routes.xxx veya appConfig.xxx kullan
 * 5. Servisler için xxxService singleton kullan
 */

// ============================================
// THEME - Tasarım Tokenları
// ============================================
export {
  // Core tokens
  colors,
  spacing,
  typography,
  radius,
  shadows,
  
  // Component tokens
  buttonTokens,
  inputTokens,
  cardTokens,
  badgeTokens,
  statusTokens,
  usulTokens,
  instrumentTokens,
  layoutTokens,
  
  // Types
  type Colors,
  type Spacing,
  type Typography,
  type Radius,
  type Shadows,
  type ButtonVariant,
  type ButtonSize,
  type InputVariant,
  type InputSize,
  type CardVariant,
  type BadgeColor,
  type StatusType,
} from "./theme";

// ============================================
// CONFIG - Uygulama Konfigürasyonu
// ============================================
export {
  appConfig,
  navigation,
  footerLinks,
  routes,
  routeMetadata,
  getRouteByPath,
  type AppConfig,
  type NavItem,
  type NavItemType,
  type NavigationConfig,
  type Route,
  type RouteName,
  type RoutesConfig,
} from "./config";

// ============================================
// CONSTANTS - Sabitler
// ============================================
export {
  // Instruments
  INSTRUMENTS,
  ENSTRUMAN_LIST,
  MELODIC_INSTRUMENTS,
  PERCUSSION_INSTRUMENTS,
  ENSTRUMAN_DATA,
  RECORDING_DURATIONS,
  USUL_SYMBOL_DISPLAY,
  getInstrumentsByCategory,
  getInstrumentById,
  getUsulSymbolDisplay,
  type InstrumentsConstants,
  
  // Piano
  PIANO_CONFIG,
  NOTE_NAMES,
  WHITE_KEYS,
  BLACK_KEYS,
  NOTE_LABELS,
  PITCH_CLASS,
  midiToNoteName,
  noteNameToMidi,
  midiToPitchClass,
  midiToOctave,
  type NoteLabel,
  type PianoConstants,
} from "./app-constants";

// ============================================
// SERVICES - Merkezi Servisler
// ============================================
export {
  audioService,
  audioServiceActions,
  midiService,
  midiServiceActions,
  storageService,
  storageServiceActions,
  STORAGE_KEYS,
  type AudioServiceInstance,
  type MidiServiceInstance,
  type MidiDevice,
  type MidiNoteCallback,
  type StorageServiceInstance,
  type StorageType,
  type StorageValue,
} from "./services";

// ============================================
// TYPES - Merkezi Tipler
// ============================================
export type {
  // Service types
  BaseServiceState,
  AudioServiceState,
  MidiServiceState,
  StorageServiceState,
  
  // Music types
  Note,
  Makam,
  Usul,
  UsulSymbol,
  
  // Device types
  MidiDeviceInfo,
  
  // Event types
  ScheduledNote,
} from "./types";

// Re-export from engines
export type { InstrumentType, PercussionSymbol } from "@/engines/ses/instruments";

// ============================================
// TOKENS - Geriye Uyumlu Export
// ============================================
// Eski @/lib/tokens kullanımı için
export { tokens } from "./tokens";

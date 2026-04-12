/**
 * Types - Merkezi Tip Tanımları
 * 
 * KULLANIM:
 * import type { ServiceState, NavigationItem } from '@/lib/types';
 * import type { InstrumentType } from '@/lib/types';
 */

import type { InstrumentType, PercussionSymbol } from "@/engines/ses/instruments";

// Re-export for convenience
export type { InstrumentType, PercussionSymbol };

// ============================================
// SERVICE TYPES
// ============================================
export interface BaseServiceState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AudioServiceState extends BaseServiceState {
  isPlaying: boolean;
  currentInstrument: InstrumentType;
  bpm: number;
}

export interface MidiServiceState extends BaseServiceState {
  isSupported: boolean;
  isEnabled: boolean;
  devices: MidiDeviceInfo[];
  activeDevice: string | null;
}

export interface StorageServiceState {
  keys: string[];
}

// ============================================
// NAVIGATION TYPES
// ============================================
export type NavItemType = "link" | "dropdown" | "divider";

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  type: NavItemType;
  badge?: string;
  children?: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// ============================================
// ROUTE TYPES
// ============================================
export type RouteName =
  | "home"
  | "makam"
  | "usul"
  | "nota"
  | "notaEditor"
  | "archive"
  | "recording"
  | "tutorial"
  | "ensemble"
  | "sesler"
  | "apiSamples"
  | "notFound";

export interface Route {
  path: string;
  name: RouteName;
  titleKey: string;
  description?: string;
}

// ============================================
// MUSIC TYPES
// ============================================
export interface Note {
  pitch: string;
  duration: number;
  velocity?: number;
  startTime: number;
}

export interface Makam {
  id: string;
  name: string;
  nameTr: string;
  nameEn: string;
  tonic: string;
  intervals: number[];
  dominant: string;
  characteristic: string;
  description: string;
}

export interface Usul {
  id: string;
  name: string;
  nameTr: string;
  nameEn: string;
  beats: number;
  unit: string;
  symbols: UsulSymbol[];
  stressPattern: number[];
}

export interface UsulSymbol {
  beat: number;
  symbol: "dum" | "tek" | "ke" | "";
  isAccent: boolean;
  timeValue: number;
}

// ============================================
// DEVICE TYPES
// ============================================
export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  type: "input" | "output";
}

// ============================================
// EVENT TYPES
// ============================================
export type MidiNoteCallback = (midiNumber: number, velocity: number) => void;

export interface ScheduledNote {
  midiNumber: number;
  startTime: number;
  duration: number;
  gain?: number;
  instrument?: InstrumentType;
}

// ============================================
// UI TYPES
// ============================================
export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "outline" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
export type InputVariant = "default" | "filled" | "flushed";
export type BadgeColor = "default" | "primary" | "secondary" | "accent" | "success" | "warning" | "error";
export type CardVariant = "default" | "elevated" | "outline" | "ghost";

// ============================================
// CONFIG TYPES
// ============================================
export interface AppConfig {
  name: string;
  fullName: string;
  description: string;
  version: string;
  language: string;
  locale: string;
  development: {
    port: number;
    host: string;
  };
  pagination: {
    defaultPageSize: number;
    pageSizeOptions: number[];
  };
  timeouts: {
    api: number;
    audio: number;
    recording: number;
  };
  audio: {
    defaultBpm: number;
    minBpm: number;
    maxBpm: number;
    bpmStep: number;
  };
}

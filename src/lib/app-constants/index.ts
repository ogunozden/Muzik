/**
 * Constants - Merkezi Sabitler
 * Enstrüman ve piyano sabitleri
 * 
 * Not: Bu dosya doğrudan TypeScript tip ve değerlerini export eder.
 * Path alias (@/) import sorunlarından kaçınmak için göreli import kullanılır.
 */

// ============================================
// ENSTRÜMANLAR - Instruments
// ============================================

import type { InstrumentType, PercussionSymbol } from "../../engines/ses/instruments";
import type { Enstruman } from "../../types";

/**
 * Enstrüman listesi
 */
export const INSTRUMENTS = [
  { id: "ney" as InstrumentType, nameTr: "Ney", nameEn: "Ney" },
  { id: "ud" as InstrumentType, nameTr: "Ud", nameEn: "Ud" },
  { id: "kemençe" as InstrumentType, nameTr: "Kemençe", nameEn: "Kemençe" },
  { id: "tanpura" as InstrumentType, nameTr: "Tanpura", nameEn: "Tanpura" },
  { id: "kanun" as InstrumentType, nameTr: "Kanun", nameEn: "Kanun" },
  { id: "bağlama" as InstrumentType, nameTr: "Bağlama", nameEn: "Baglama" },
  { id: "tambur" as InstrumentType, nameTr: "Tambur", nameEn: "Tambur" },
  { id: "santur" as InstrumentType, nameTr: "Santur", nameEn: "Santur" },
  { id: "lavta" as InstrumentType, nameTr: "Lavta", nameEn: "Lavta" },
  { id: "rebab" as InstrumentType, nameTr: "Rebab", nameEn: "Rebab" },
  { id: "miskal" as InstrumentType, nameTr: "Miskal", nameEn: "Miskal" },
  { id: "bendir" as InstrumentType, nameTr: "Bendir", nameEn: "Bendir" },
  { id: "kudum" as InstrumentType, nameTr: "Kudüm", nameEn: "Kudum" },
  { id: "davul" as InstrumentType, nameTr: "Davul", nameEn: "Davul" },
  { id: "def" as InstrumentType, nameTr: "Def", nameEn: "Def" },
  { id: "darbuka" as InstrumentType, nameTr: "Darbuka", nameEn: "Darbuka" },
  { id: "zilli_def" as InstrumentType, nameTr: "Zilli Def", nameEn: "Frame Drum With Zils" },
  { id: "kaşık" as InstrumentType, nameTr: "Kaşık", nameEn: "Spoons" },
  { id: "zil" as InstrumentType, nameTr: "Zil", nameEn: "Cymbal" },
  { id: "nakkare" as InstrumentType, nameTr: "Nakkare", nameEn: "Nakkare" },
] as const;

/**
 * Melodik enstrümanlar
 */
export const MELODIC_INSTRUMENTS: readonly InstrumentType[] = [
  "ney",
  "ud",
  "kemençe",
  "tanpura",
  "kanun",
  "bağlama",
  "tambur",
  "santur",
  "lavta",
  "rebab",
  "miskal",
] as const;

/**
 * Vurmalı enstrümanlar
 */
export const PERCUSSION_INSTRUMENTS: readonly InstrumentType[] = [
  "bendir",
  "kudum",
  "davul",
  "def",
  "darbuka",
  "zilli_def",
  "kaşık",
  "zil",
  "nakkare",
] as const;

/**
 * Enstrüman verileri
 */
export const ENSTRUMAN_DATA: readonly Enstruman[] = [
  { id: "ud", name: "Ud", nameTr: "Ud", soundType: "plucked_string" },
  { id: "kemençe", name: "Kemençe", nameTr: "Kemençe", soundType: "bowed_string" },
  { id: "ney", name: "Ney", nameTr: "Ney", soundType: "wind" },
  { id: "tanpura", name: "Tanpura", nameTr: "Tanpura", soundType: "plucked_string" },
  { id: "kanun", name: "Kanun", nameTr: "Kanun", soundType: "plucked_zither" },
  { id: "bağlama", name: "Baglama", nameTr: "Bağlama", soundType: "plucked_string" },
  { id: "tambur", name: "Tambur", nameTr: "Tambur", soundType: "plucked_string" },
  { id: "santur", name: "Santur", nameTr: "Santur", soundType: "hammered_zither" },
  { id: "lavta", name: "Lavta", nameTr: "Lavta", soundType: "plucked_string" },
  { id: "rebab", name: "Rebab", nameTr: "Rebab", soundType: "bowed_string" },
  { id: "miskal", name: "Miskal", nameTr: "Miskal", soundType: "wind" },
  { id: "davul", name: "Davul", nameTr: "Davul", soundType: "percussion" },
  { id: "def", name: "Def", nameTr: "Def", soundType: "percussion" },
  { id: "bendir", name: "Bendir", nameTr: "Bendir", soundType: "percussion" },
  { id: "kudum", name: "Kudüm", nameTr: "Kudüm", soundType: "percussion" },
  { id: "darbuka", name: "Darbuka", nameTr: "Darbuka", soundType: "percussion" },
  { id: "zilli_def", name: "Zilli Def", nameTr: "Zilli Def", soundType: "percussion" },
  { id: "kaşık", name: "Kasik", nameTr: "Kaşık", soundType: "percussion" },
  { id: "zil", name: "Zil", nameTr: "Zil", soundType: "percussion" },
  { id: "nakkare", name: "Nakkare", nameTr: "Nakkare", soundType: "percussion" },
] as const;

/**
 * Eski isim - geriye uyumlu
 */
export const ENSTRUMAN_LIST = INSTRUMENTS;

/**
 * Kayıt süreleri (saniye)
 */
export const RECORDING_DURATIONS = [3, 5, 10, 15] as const;

/**
 * Usül sembol gösterimleri
 */
export const USUL_SYMBOL_DISPLAY: Record<PercussionSymbol | "", string> = {
  dum: "●",
  tek: "○",
  ke: "◐",
  "": "",
} as const;

/**
 * Enstrüman tiplerini filtrele
 */
export function getInstrumentsByCategory(category: "melodic" | "percussion") {
  const filtered = category === "melodic" 
    ? MELODIC_INSTRUMENTS 
    : PERCUSSION_INSTRUMENTS;
  
  return INSTRUMENTS.filter((inst) => (filtered as readonly string[]).includes(inst.id));
}

/**
 * ID'ye göre enstrüman bul
 */
export function getInstrumentById(id: string) {
  return INSTRUMENTS.find((inst) => inst.id === id);
}

/**
 * Usül sembol display değerini getir
 */
export function getUsulSymbolDisplay(symbol: PercussionSymbol | ""): string {
  return USUL_SYMBOL_DISPLAY[symbol] ?? "";
}

// ============================================
// PİYANO - Piano
// ============================================

/**
 * Piyano konfigürasyonu
 */
export const PIANO_CONFIG = {
  startOctave: 3,
  endOctave: 5,
  totalOctaves: 3,
  whiteKeyWidth: 48,
  whiteKeyHeight: 160,
  blackKeyWidth: 30,
  blackKeyHeight: 100,
} as const;

/**
 * Nota isimleri
 */
export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
] as const;

/**
 * Beyaz tuşlar
 */
export const WHITE_KEYS = ["C", "D", "E", "F", "G", "A", "B"] as const;

/**
 * Siyah tuşlar
 */
export const BLACK_KEYS = ["C#", "D#", "F#", "G#", "A#"] as const;

/**
 * MIDI numarasından nota bilgisi
 */
export interface NoteLabel {
  name: string;
  isBlack: boolean;
  midiNumber: number;
  octave: number;
  noteName: typeof NOTE_NAMES[number];
}

/**
 * Tüm nota etiketlerini oluştur
 */
export const NOTE_LABELS: Record<number, NoteLabel> = {};

let midiNumber = (PIANO_CONFIG.startOctave + 1) * 12;
for (let octave = PIANO_CONFIG.startOctave; octave <= PIANO_CONFIG.endOctave; octave++) {
  for (const noteName of NOTE_NAMES) {
    const isBlack = noteName.includes("#");
    NOTE_LABELS[midiNumber] = {
      name: `${noteName}${octave}`,
      isBlack,
      midiNumber,
      octave,
      noteName,
    };
    midiNumber++;
  }
}

/**
 * Pitch class (MIDI mod 12)
 */
export const PITCH_CLASS: Record<number, typeof NOTE_NAMES[number]> = {
  0: "C",
  1: "C#",
  2: "D",
  3: "D#",
  4: "E",
  5: "F",
  6: "F#",
  7: "G",
  8: "G#",
  9: "A",
  10: "A#",
  11: "B",
};

/**
 * MIDI numarasından nota adını al
 */
export function midiToNoteName(midiNumber: number): string {
  const label = NOTE_LABELS[midiNumber];
  return label?.name ?? `C${PIANO_CONFIG.startOctave}`;
}

/**
 * Nota adından MIDI numarasını al
 */
export function noteNameToMidi(noteName: string, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(noteName as typeof NOTE_NAMES[number]);
  if (noteIndex === -1) return 60;
  
  const baseOctave = PIANO_CONFIG.startOctave + 1;
  return (baseOctave * 12) + ((octave - PIANO_CONFIG.startOctave) * 12) + noteIndex;
}

/**
 * Pitch class hesapla
 */
export function midiToPitchClass(midiNumber: number): typeof NOTE_NAMES[number] {
  return PITCH_CLASS[midiNumber % 12];
}

/**
 * Octave hesapla
 */
export function midiToOctave(midiNumber: number): number {
  const baseOctave = PIANO_CONFIG.startOctave + 1;
  return Math.floor(midiNumber / 12) - baseOctave;
}

// ============================================
// TİPLER - Types
// ============================================

export type InstrumentsConstants = typeof INSTRUMENTS;
export type PianoConstants = typeof PIANO_CONFIG;

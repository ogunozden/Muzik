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

import type { InstrumentType } from "../../engines/ses/instruments";

/**
 * Enstrüman listesi
 */
export const INSTRUMENTS = [
  { id: "ney" as InstrumentType, nameTr: "Ney", nameEn: "Ney" },
  { id: "ud" as InstrumentType, nameTr: "Ud", nameEn: "Ud" },
  { id: "kemençe" as InstrumentType, nameTr: "Kemençe", nameEn: "Kemençe" },
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
 * Tüm nota etiketlerini oluştur (midiToNoteName tarafından iç kullanım)
 */
const NOTE_LABELS: Record<number, NoteLabel> = {};

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


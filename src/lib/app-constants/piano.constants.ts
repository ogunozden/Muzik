/**
 * Piano Constants - Piyano Tanımları
 * Merkezi piyano/klavye sabitleri
 */

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
 * MIDI numarasından nota bilgisi oluştur
 */
export type NoteLabel = {
  name: string;
  isBlack: boolean;
  midiNumber: number;
  octave: number;
  noteName: typeof NOTE_NAMES[number];
};

/**
 * Tüm nota etiketlerini oluştur
 */
export const NOTE_LABELS: Record<number, NoteLabel> = {};

// MIDI numarası hesapla
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
  if (noteIndex === -1) return 60; // Default C4
  
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

export type PianoConstants = typeof PIANO_CONFIG;

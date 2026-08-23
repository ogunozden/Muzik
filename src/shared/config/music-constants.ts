/**
 * Music Constants — TEK MERKEZ
 *
 * Piyano ve nota sabitleri. `src/lib/app-constants` ve `src/engines/*` buradan beslenir.
 * Döngüsel bağımlılığı kırmak için en alt katmanda tanımlıdır.
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
 * Nota isimleri (kromatik)
 */
export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/**
 * MIDI numarasından nota bilgisi
 */
export interface NoteLabel {
  name: string;
  isBlack: boolean;
  midiNumber: number;
  octave: number;
  noteName: (typeof NOTE_NAMES)[number];
}

/**
 * Tüm nota etiketleri (midiToNoteName iç kullanım)
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

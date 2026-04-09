export const PIANO_CONFIG = {
  startOctave: 3,
  endOctave: 5,
  whiteKeyWidth: 48,
  whiteKeyHeight: 160,
  blackKeyWidth: 30,
  blackKeyHeight: 100,
  totalOctaves: 3,
} as const;

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const NOTE_LABELS: Record<number, {name: string; isBlack: boolean}> = {};

let midiNumber = (PIANO_CONFIG.startOctave + 1) * 12;
for (let octave = PIANO_CONFIG.startOctave; octave <= PIANO_CONFIG.endOctave; octave++) {
  for (const noteName of NOTE_NAMES) {
    const isBlack = noteName.includes("#");
    NOTE_LABELS[midiNumber] = {name: `${noteName}${octave}`, isBlack};
    midiNumber++;
  }
}

import {PIANO_CONFIG, NOTE_NAMES} from "@/shared/config/music-constants";

export function midiToFrequency(midiNumber: number): number {
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

export function noteNameToMidi(noteName: string, octave: number): number {
  const noteMap: Record<string, number> = {
    C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
    "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
  };
  return (octave + 1) * 12 + (noteMap[noteName] ?? 0);
}

export function midiToNoteName(midiNumber: number): string {
  const noteNames = NOTE_NAMES;
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteName = noteNames[midiNumber % 12];
  return `${noteName}${octave}`;
}

export interface PianoKey {
  midiNumber: number;
  noteName: string;
  octave: number;
  isBlack: boolean;
}

export const PIANO_KEYS: {white: PianoKey[]; black: PianoKey[]} = (() => {
  const white: PianoKey[] = [];
  const black: PianoKey[] = [];

  for (let octave = PIANO_CONFIG.startOctave; octave <= PIANO_CONFIG.endOctave; octave++) {
    for (const noteName of NOTE_NAMES) {
      const midiNumber = (octave + 1) * 12 + NOTE_NAMES.indexOf(noteName);
      const isBlack = noteName.includes("#");
      const key: PianoKey = {midiNumber, noteName, octave, isBlack};
      if (isBlack) black.push(key);
      else white.push(key);
    }
  }

  return {white, black};
})();

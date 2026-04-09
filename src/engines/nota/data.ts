import {Nota} from "@/types";
import {PIANO_CONFIG, NOTE_NAMES} from "@/lib/constants";

export const NOTE_DATA: Nota[] = [
  {midinetoName: "C", englishName: "C", frequency: 261.63, octave: 4, midiNumber: 60},
  {midinetoName: "C#", englishName: "C#", frequency: 277.18, octave: 4, midiNumber: 61},
  {midinetoName: "D", englishName: "D", frequency: 293.66, octave: 4, midiNumber: 62},
  {midinetoName: "D#", englishName: "D#", frequency: 311.13, octave: 4, midiNumber: 63},
  {midinetoName: "E", englishName: "E", frequency: 329.63, octave: 4, midiNumber: 64},
  {midinetoName: "F", englishName: "F", frequency: 349.23, octave: 4, midiNumber: 65},
  {midinetoName: "F#", englishName: "F#", frequency: 369.99, octave: 4, midiNumber: 66},
  {midinetoName: "G", englishName: "G", frequency: 392.0, octave: 4, midiNumber: 67},
  {midinetoName: "G#", englishName: "G#", frequency: 415.3, octave: 4, midiNumber: 68},
  {midinetoName: "A", englishName: "A", frequency: 440.0, octave: 4, midiNumber: 69},
  {midinetoName: "A#", englishName: "A#", frequency: 466.16, octave: 4, midiNumber: 70},
  {midinetoName: "B", englishName: "B", frequency: 493.88, octave: 4, midiNumber: 71},
  {midinetoName: "C5", englishName: "C", frequency: 523.25, octave: 5, midiNumber: 72},
  {midinetoName: "C#5", englishName: "C#", frequency: 554.37, octave: 5, midiNumber: 73},
  {midinetoName: "D5", englishName: "D", frequency: 587.33, octave: 5, midiNumber: 74},
  {midinetoName: "D#5", englishName: "D#", frequency: 622.25, octave: 5, midiNumber: 75},
  {midinetoName: "E5", englishName: "E", frequency: 659.25, octave: 5, midiNumber: 76},
  {midinetoName: "F5", englishName: "F", frequency: 698.46, octave: 5, midiNumber: 77},
];

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

export function parseSymbTr(identifier: string): {
  makam: string;
  form: string;
  usul: string;
  name: string;
  composer: string;
} {
  const parts = identifier.split("--");
  return {
    makam: parts[1] || "",
    form: parts[2] || "",
    usul: parts[3] || "",
    name: parts[4] || "",
    composer: parts[5] || "",
  };
}

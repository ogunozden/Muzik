import {formatSolfegePitch} from "@/core/domain/note-naming";

export interface SymbtrScoreEvent {
  index: number;
  sourcePitch: string;
  solfegePitch: string | null;
  notationSymbol: string;
  playbackPitch: string | null;
  midiNumber: number | null;
  koma53: number | null;
  targetFrequency: number | null;
  startBeat: number;
  durationBeats: number;
  durationFraction: {
    numerator: number;
    denominator: number;
  };
  startTime: number;
  duration: number;
  section: string | null;
  /**
   * Notanin BITTIGI kumulatif olcu konumu (SymbTr `Offset` sutunu). Ondalik
   * kismi olcu icindeki yeri verir; tam sayilar bar cizgileridir.
   */
  offsetUnits: number | null;
  measureIndex: number | null;
  isMeasureEnd: boolean;
  isRest: boolean;
}

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SEMITONE_TO_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const A4_KOMA53 = 305;
const A4_FREQUENCY = 440;

function isNearInteger(value: number): boolean {
  return Math.abs(value - Math.round(value)) < 0.000001;
}

function normalizePitch(sourcePitch: string): {playbackPitch: string; midiNumber: number} | null {
  if (!sourcePitch || sourcePitch === "Es") return null;

  const match = sourcePitch.match(/^([A-G])(\d)(.*)$/);
  if (!match) return null;

  const [, step, octaveText, accidentalText] = match;
  let semitone = NOTE_TO_SEMITONE[step];
  let octave = Number(octaveText);

  if (accidentalText.includes("#")) {
    semitone += 1;
  } else if (accidentalText.includes("b")) {
    semitone -= 1;
  }

  if (semitone < 0) {
    semitone += 12;
    octave -= 1;
  } else if (semitone > 11) {
    semitone -= 12;
    octave += 1;
  }

  return {
    playbackPitch: `${SEMITONE_TO_NOTE[semitone]}${octave}`,
    midiNumber: (octave + 1) * 12 + semitone,
  };
}

function toSolfegePitch(sourcePitch: string): string | null {
  if (!sourcePitch || sourcePitch === "Es") return null;

  return formatSolfegePitch(sourcePitch);
}

function toNotationSymbol(durationBeats: number, isRest: boolean): string {
  if (isRest) return "𝄽";
  if (durationBeats >= 4) return "𝅝";
  if (durationBeats >= 3) return "𝅗𝅥.";
  if (durationBeats >= 2) return "𝅗𝅥";
  if (durationBeats >= 1.5) return "♩.";
  if (durationBeats >= 1) return "♩";
  if (durationBeats >= 0.75) return "♪.";
  if (durationBeats >= 0.5) return "♪";
  return "♬";
}

function frequencyToMidiNumber(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / A4_FREQUENCY));
}

export function koma53ToFrequency(koma53: number): number {
  return A4_FREQUENCY * Math.pow(2, (koma53 - A4_KOMA53) / 53);
}

export function parseSymbtrScore(raw: string, bpm: number, koma53Offset: number = 0): SymbtrScoreEvent[] {
  const beatDuration = 60 / bpm;
  let startBeat = 0;

  return raw
    .split(/\r?\n/)
    .slice(1)
    .reduce<SymbtrScoreEvent[]>((events, line) => {
      if (!line.trim()) return events;

      const columns = line.split("\t");
      const code = columns[1];
      if (code !== "9") return events;

      const index = Number(columns[0]);
      const sourcePitch = columns[3];
      const koma53 = Number(columns[4]);
      const pay = Number(columns[6]);
      const payda = Number(columns[7]);
      const section = columns[11]?.trim() || null;
      const rawOffsetUnits = Number(columns[12]);
      const offsetUnits = Number.isFinite(rawOffsetUnits) ? rawOffsetUnits : null;
      const measureIndex = offsetUnits && offsetUnits > 0 ? Math.max(1, Math.ceil(offsetUnits)) : null;
      const isMeasureEnd = Boolean(offsetUnits && offsetUnits > 0 && isNearInteger(offsetUnits));
      const durationBeats = (pay / payda) * 4;

      // Korpusta `Kod=9` (nota) olmasina ragmen PERDESIZ ve SURESIZ yer-tutucu
      // satirlar var: `NotaAE=[] Koma53=-1 Pay=0 Payda=0`. Bunlar nota da es de
      // degil. Eskiden `(0/0)*4 = NaN` uretiliyor ve asagidaki
      // `startBeat += durationBeats` yuzunden ESERIN GERI KALANININ TAMAMI NaN
      // zaman eksenine dusuyordu (olcum, SymbTr-3.0 / 401 dosya / 146.477 event:
      // 5 bozuk satir -> 124 event cokmus, 4 eser etkilenmis).
      //
      // Satiri dusuruyoruz — bos satir ve `Kod !== "9"` satirlariyla ayni
      // sozlesme. Olculen 5 satirin HEPSI perdesiz oldugu icin gercek nota
      // kaybi yok; zaman ekseni asla sonsuz/NaN bir degerle ilerlemez. (D1)
      if (!Number.isFinite(durationBeats) || durationBeats <= 0) return events;

      const normalized = normalizePitch(sourcePitch);
      const playbackKoma53 = koma53 + koma53Offset;
      const targetFrequency =
        normalized && Number.isFinite(koma53) && Number.isFinite(playbackKoma53)
          ? koma53ToFrequency(playbackKoma53)
          : null;
      const isRest = !normalized;

      events.push({
        index,
        sourcePitch,
        solfegePitch: toSolfegePitch(sourcePitch),
        notationSymbol: toNotationSymbol(durationBeats, isRest),
        playbackPitch: normalized?.playbackPitch ?? null,
        midiNumber: targetFrequency ? frequencyToMidiNumber(targetFrequency) : normalized?.midiNumber ?? null,
        koma53: targetFrequency ? koma53 : null,
        targetFrequency,
        startBeat,
        durationBeats,
        durationFraction: {
          numerator: Number.isFinite(pay) ? pay : 0,
          denominator: Number.isFinite(payda) ? payda : 0,
        },
        startTime: startBeat * beatDuration,
        duration: durationBeats * beatDuration,
        section,
        offsetUnits,
        measureIndex,
        isMeasureEnd,
        isRest,
      });

      startBeat += durationBeats;
      return events;
    }, []);
}

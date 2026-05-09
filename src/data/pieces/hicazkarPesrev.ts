import type {InstrumentType, PercussionSymbol} from "@/engines/ses/engine";

export interface PieceScoreEvent {
  index: number;
  sourcePitch: string;
  playbackPitch: string | null;
  midiNumber: number | null;
  koma53: number | null;
  targetFrequency: number | null;
  startBeat: number;
  durationBeats: number;
  startTime: number;
  duration: number;
  section: string | null;
  isRest: boolean;
}

export interface PieceLayer {
  id: string;
  label: string;
  instrument: InstrumentType;
  gain: number;
  delay: number;
}

export interface PiecePercussionLayer {
  id: string;
  label: string;
  instrument: InstrumentType;
}

export const HICAZKAR_PESREV = {
  id: "hicazkar-pesrev-osman-bey",
  title: "Hicazkar Pesrev",
  displayTitle: "Hicazkar Peşrev",
  composer: "Tanburi Büyük Osman Bey",
  makam: "Hicazkar",
  form: "Peşrev",
  usul: "Devr-i Kebir",
  usulId: "devrikebir",
  meter: "28/4",
  bpm: 72,
  symbtrRawUrl:
    "https://raw.githubusercontent.com/MTG/SymbTr/master/txt/hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey.txt",
  symbtrPageUrl: "https://github.com/MTG/SymbTr",
  sourcePageUrl: "https://defteriniz.com/hicazkar-pesrev-tanburi-osman-bey-saz-eserleri-t-s-m-nota/101492/",
  scorePageUrls: [
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey01.gif",
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey02.gif",
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey03.gif",
  ],
  melodicLayers: [
    {id: "ud", label: "Ud", instrument: "ud", gain: 0.2, delay: 0},
    {id: "kanun", label: "Kanun", instrument: "kanun", gain: 0.13, delay: 0.012},
    {id: "kemence", label: "Kemençe", instrument: "kemençe", gain: 0.12, delay: 0.022},
  ] satisfies PieceLayer[],
  percussionLayers: [
    {id: "kudum", label: "Kudüm", instrument: "kudum"},
  ] satisfies PiecePercussionLayer[],
  requiredPercussionSymbols: ["dum", "tek", "ke"] satisfies PercussionSymbol[],
} as const;

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

function frequencyToMidiNumber(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / A4_FREQUENCY));
}

export function koma53ToFrequency(koma53: number): number {
  return A4_FREQUENCY * Math.pow(2, (koma53 - A4_KOMA53) / 53);
}

export function parseSymbtrScore(raw: string, bpm: number): PieceScoreEvent[] {
  const beatDuration = 60 / bpm;
  let startBeat = 0;

  return raw
    .split(/\r?\n/)
    .slice(1)
    .reduce<PieceScoreEvent[]>((events, line) => {
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
      const durationBeats = (pay / payda) * 4;
      const normalized = normalizePitch(sourcePitch);
      const targetFrequency = normalized && Number.isFinite(koma53) ? koma53ToFrequency(koma53) : null;

      events.push({
        index,
        sourcePitch,
        playbackPitch: normalized?.playbackPitch ?? null,
        midiNumber: targetFrequency ? frequencyToMidiNumber(targetFrequency) : normalized?.midiNumber ?? null,
        koma53: targetFrequency ? koma53 : null,
        targetFrequency,
        startBeat,
        durationBeats,
        startTime: startBeat * beatDuration,
        duration: durationBeats * beatDuration,
        section,
        isRest: !normalized,
      });

      startBeat += durationBeats;
      return events;
    }, []);
}

export function getCurrentScoreEvent(events: PieceScoreEvent[], elapsedSeconds: number): PieceScoreEvent | null {
  return (
    events.find((event) => elapsedSeconds >= event.startTime && elapsedSeconds < event.startTime + event.duration) ??
    null
  );
}

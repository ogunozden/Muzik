const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const SOLFEGE_BY_STEP: Record<string, string> = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

const PITCH_CLASS_INDEX: ReadonlyMap<string, number> = new Map(PITCH_CLASSES.map((name, index) => [name, index]));

export type PitchLabelVariant = "compact" | "spoken";

export interface ParsedPitch {
  step: string;
  octave: number;
  pitchClass: string;
  accidental: string;
  symbtrAccidental: boolean;
}

function formatAccidental(raw: string, variant: PitchLabelVariant): string {
  if (!raw) return "";

  const kind = raw.startsWith("b") ? "bemol" : "diyez";
  const symbol = raw.startsWith("b") ? "♭" : "♯";
  const amount = raw.slice(1);

  if (variant === "spoken") {
    return amount ? `${amount} koma ${kind}` : kind;
  }

  return `${symbol}${amount}`;
}

export function parsePitch(pitch: string): ParsedPitch | null {
  const standardMatch = pitch.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (standardMatch) {
    const [, rawStep, accidental, octaveText] = standardMatch;
    const step = rawStep.toUpperCase();
    const octave = Number(octaveText);
    return {
      step,
      octave,
      pitchClass: `${step}${accidental}`,
      accidental,
      symbtrAccidental: false,
    };
  }

  const symbtrMatch = pitch.match(/^([A-Ga-g])(\d+)([#b]\d+)$/);
  if (symbtrMatch) {
    const [, rawStep, octaveText, accidental] = symbtrMatch;
    const step = rawStep.toUpperCase();
    return {
      step,
      octave: Number(octaveText),
      pitchClass: step,
      accidental,
      symbtrAccidental: true,
    };
  }

  return null;
}

export function getPitchClassIndex(noteName: string): number {
  return PITCH_CLASS_INDEX.get(noteName) ?? -1;
}

export function formatSolfegePitchClass(noteName: string, variant: PitchLabelVariant = "compact"): string {
  const parsed = parsePitch(`${noteName}4`);
  if (!parsed) return noteName;

  const solfege = SOLFEGE_BY_STEP[parsed.step] ?? parsed.step;
  const accidental = formatAccidental(parsed.accidental, variant);

  return variant === "spoken" && accidental ? `${solfege} ${accidental}` : `${solfege}${accidental}`;
}

export function formatSolfegePitch(pitch: string, variant: PitchLabelVariant = "compact"): string {
  if (!pitch || pitch === "Es") return "Es";

  const parsed = parsePitch(pitch);
  if (!parsed) return pitch;

  const solfege = SOLFEGE_BY_STEP[parsed.step] ?? parsed.step;
  const accidental = formatAccidental(parsed.accidental, variant);

  if (variant === "spoken") {
    return [solfege, accidental, `${parsed.octave}. oktav`].filter(Boolean).join(" ");
  }

  if (parsed.symbtrAccidental) {
    return `${solfege}${accidental}/${parsed.octave}`;
  }

  return `${solfege}${accidental}${parsed.octave}`;
}

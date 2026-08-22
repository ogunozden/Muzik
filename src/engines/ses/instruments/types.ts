// Kaynak (Kudum kitabi s.14): dum sag el, tek/ke sol el, hek IKI EL BIRLIKTE.
export type PercussionSymbol = "dum" | "tek" | "ke" | "hek";

export type InstrumentType =
  | "ney"
  | "ud"
  | "kemençe"
  | "kanun"
  | "bağlama"
  | "tambur"
  | "santur"
  | "lavta"
  | "rebab"
  | "miskal"
  | "bendir"
  | "kudum"
  | "davul"
  | "def"
  | "darbuka"
  | "zilli_def"
  | "kaşık"
  | "zil"
  | "nakkare";

export interface Formant {
  frequency: number;
  gain: number;
  q: number;
}

export interface InstrumentProfile {
  type: "melodic" | "percussion";
  harmonics?: number[];
  harmonicGains?: number[];
  attackTime: number;
  decayTime: number;
  sustainLevel: number;
  releaseTime: number;
  brightness?: number;
  noiseAmount?: number;
  formants?: Formant[];
  vibratoRate?: number;
  vibratoDepth?: number;
  pitchEnvelopeDepth?: number;
  pitchEnvelopeTime?: number;
}

export function isPercussionSymbol(symbol: string): symbol is PercussionSymbol {
  return symbol === "dum" || symbol === "tek" || symbol === "ke" || symbol === "hek";
}

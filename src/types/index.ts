export interface Makam {
  id: string;
  name: string;
  nameTr: string;
  nameEn: string;
  tonic: string;
  intervals: number[];
  dominant: string;
  characteristic: string;
  description: string;
}

export interface Usul {
  id: string;
  name: string;
  nameTr: string;
  nameEn: string;
  beats: number;
  unit: string;
  symbols: UsulSymbol[];
  stressPattern: number[];
}

export interface UsulSymbol {
  beat: number;
  symbol: "dum" | "tek" | "ke" | "";
  isAccent: boolean;
  timeValue: number;
}

export interface Nota {
  midinetoName: string;
  englishName: string;
  frequency: number;
  octave: number;
  midiNumber: number;
}

export interface NotaEvent {
  pitch: string;
  duration: number;
  velocity?: number;
  startTime: number;
}

export interface SymbTrNotation {
  identifier: string;
  makam: string;
  form: string;
  usul: string;
  name: string;
  composer: string;
  lyrics?: string;
  events: NotaEvent[];
}

export interface Enstruman {
  id: string;
  name: string;
  nameTr: string;
  soundType: string;
}

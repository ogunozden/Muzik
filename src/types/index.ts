/** Makamin bir perde arizasi (SymbTr MusicXML <key-accidental>'dan turetilir). */
export interface MakamKeyAccidental {
  step: string;
  alter: string;
  accidental: string;
}

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
  /**
   * Otantik koma arizasi — SymbTr korpusundan OTONOM turetilir (elle degil).
   * Korpusta bulunan makamlarda dolu; kapsam disi makamlarda undefined.
   */
  keySignature?: MakamKeyAccidental[];
  /** Arizanin korpustaki tutarliligi (0..1); tanilama/dogrulama icin. */
  keySignatureConsensus?: number;
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
  /** Kitaptaki VELVELESI dizilisi (susleme vuruslari); kaynakta yoksa tanimsiz. */
  velvele?: UsulSymbol[];
  /**
   * Karakteristik tempo (BPM) — SymbTr korpusundaki kod-52 medyanindan OTONOM
   * turetilir. Ayni desenli usulleri (curcuna 180 vs aksaksemai 120) ayirir.
   * Korpusta yoksa undefined.
   */
  defaultBpm?: number;
}

export interface UsulSymbol {
  beat: number;
  symbol: "dum" | "tek" | "te" | "ke" | "ka" | "ta" | "hek" | "";
  /** Gorsel hece etiketi (velvelede DU/ME gibi); yoksa sembol adi kullanilir. */
  syllable?: string;
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

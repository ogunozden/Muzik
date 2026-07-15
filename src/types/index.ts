/** Makamin bir perde arizasi (SymbTr MusicXML <key-accidental>'dan turetilir). */
export interface MakamKeyAccidental {
  step: string;
  alter: string;
  accidental: string;
}

/** Karar-goreli bir dizi derecesi (53-EDO koma). */
export interface MakamKomaDegree {
  /** Karara gore koma (0..52); 0 = karar (durak). */
  koma: number;
  /** Karara gore cent (koma × 1200/53). */
  cents: number;
  /** Bu derecenin korpustaki kullanim payi (0..1). */
  share: number;
  /**
   * Otantik AEU perde adi (Rast/Dugah/Segah...) — AEU referansindan (tomato+
   * Aydemir), makamin tonic perdesine demirlenir. Referans yoksa undefined.
   */
  perde?: string;
}

/**
 * Makamin OTANTIK 53-EDO (Holder komasi / AEU) dizisi — SymbTr `Koma53`
 * sutunundan OTONOM turetilir. 12-TET yaklasik `intervals`'in aksine gercek
 * mikrotonal perdeleri tasir (hicaz'in 113c ikilisi, ussak'in 158c ikilisi).
 */
export interface MakamKomaScale {
  /** Karar perde-sinifi (mutlak, 0..52); korpus son-nota modundan. */
  kararPC: number;
  /** Karar tespitinin korpustaki tutarliligi (0..1). */
  kararAgreement: number;
  /** Karara gore artan dizi dereceleri (koma/cent/pay). */
  degrees: MakamKomaDegree[];
  /**
   * Koma dizisinden OTONOM turetilen 12-TET `intervals` (7 adim, toplam 12).
   * El-yazimi yerine korpus-turevi notasyon izdusumu; temiz heptatoni
   * cikmazsa null (el-yazimina duser).
   */
  intervals12: number[] | null;
  /**
   * Guclu (dominant) ADAYI — 4.-5. bolge en cok kullanilan derece. Frekansla
   * KESIN turetilemez (yapisal teori notasi); el-yazimi dominant'i DOGRULAMAK
   * icin referans.
   */
  guclu: {koma: number; cents: number} | null;
  /** Karar (durak) perdesinin AEU adi — AEU referansindan. Yoksa undefined. */
  kararPerde?: string;
  /** Guclu perdesinin AEU adi — AEU referansindan. Yoksa undefined. */
  gucluPerde?: string;
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
  /**
   * Otantik 53-EDO koma dizisi (SymbTr Koma53'ten otonom). Sesin makam-dogru
   * calinmasi icin: freq = kararHz × 2^(koma/53). Korpus disinda undefined.
   */
  komaScale?: MakamKomaScale;
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

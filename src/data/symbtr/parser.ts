import {formatSolfegePitch} from "@/core/domain/note-naming";
import {ZERO_TICKS, addTicks, quarterBeatsOf} from "@/core/time/ticks";
import {buildMeterMap, measureAt} from "./meter-map";
import {type DurationFraction, type SymbtrOrnament, readSymbtrRows, rowAdvance} from "./rows";

/**
 * Olcu numarasinin NASIL bulundugu (PLAN.md §3/G5-G6).
 *
 *   `offset-ceil-v1` — `Math.ceil(Offset)`. Yazili mertebe bilinmedigi zaman
 *      tek secenek. G4 olcumu (1.157.450 nota): tempo isareti olmayan
 *      eserlerde %98,58 dogru, olanlarda **%83,56** — cunku `Offset` sutunu
 *      kod-52'nin hayalet suresini tasiyor.
 *   `meter-walk-v2` — `MeterMap` KANONIK eksende yurunerek. Yazili mertebe
 *      verildiginde kullanilir; `Offset` sutununa hic bakmaz.
 *
 * Alan HER olayda tasinir: hangi tabanin kullanildigi asla ortulu kalmaz.
 */
export type MeasureIndexBasis = "offset-ceil-v1" | "meter-walk-v2";

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
  /** `measureIndex`in hangi tabandan geldigi — ortulu kalmaz. */
  measureIndexBasis: MeasureIndexBasis;
  /**
   * Bar cizgisi bolmesinin bag isareti (G7). `null` = bolunmemis nota.
   * Yalniz `splitEventsAtBarlines` doldurur; `parseSymbtrScore` her zaman
   * `null` uretir — calma yolu butun notalari gorur.
   */
  barlineTie: "start" | "continue" | "stop" | null;
  /**
   * Kaynak satir kodu (G9). Eskiden akista yalniz `9` vardi; artik zamani
   * ilerleten HER kod geliyor ve hangisi oldugu KAYBOLMUYOR.
   */
  code: number | null;
  /** MusicXML ile turetilmis susleme kimligi (B1); yoksa `null`. */
  ornament: SymbtrOrnament | null;
  /** Kodun anlami kanitlanmadi (B2) — nota olarak islenir, iddia edilmez. */
  unresolvedCode: boolean;
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

export interface ParseSymbtrScoreOptions {
  /**
   * Yazili mertebe (`mu2` satir-1). VERILDIGINDE olcu numarasi `MeterMap`
   * yurunerek bulunur (`meter-walk-v2`) ve `Offset` sutununa HIC bakilmaz.
   * Verilmezse `Math.ceil(Offset)` tabani kullanilir (`offset-ceil-v1`).
   */
  writtenMeter?: DurationFraction | null;
}

/**
 * Yazili mertebeden olcu numarasi tablosu kurar: `Sira` -> olcu.
 *
 * Neden `Offset` degil: G4 olctu — `Offset` sutunu kod-52 tempo isaretinin
 * hayalet suresini tasiyor, dolayisiyla tempo isaretli 2228 eserde muzikal
 * zamandan sapiyor. Burada KANONIK eksende yuruyoruz.
 *
 * Nota, BASLADIGI olcuye yazilir (gravurde dogru olan budur). Bar-asan
 * notalarin ikinci parcasi G7'de bagla ayrilir.
 */
function buildMeasureIndexBySira(raw: string, writtenMeter: DurationFraction): Map<number, number> | null {
  const rows = readSymbtrRows(raw).rows;
  const map = buildMeterMap(rows, writtenMeter);
  if (!map) return null;

  const bySira = new Map<number, number>();
  let position = ZERO_TICKS;

  for (const row of rows) {
    const advance = rowAdvance(row);
    if (row.kind === "timed" && row.sira !== null) {
      const at = measureAt(map, position);
      if (at) bySira.set(row.sira, at.measure);
    }
    position = addTicks(position, advance.canonical);
  }

  return bySira;
}

export function parseSymbtrScore(
  raw: string,
  bpm: number,
  koma53Offset: number = 0,
  options: ParseSymbtrScoreOptions = {},
): SymbtrScoreEvent[] {
  const beatDuration = 60 / bpm;
  let startBeat = 0;

  const measureIndexBySira = options.writtenMeter ? buildMeasureIndexBySira(raw, options.writtenMeter) : null;
  const measureIndexBasis: MeasureIndexBasis = measureIndexBySira ? "meter-walk-v2" : "offset-ceil-v1";

  // G9: OLAY AKISI ARTIK `rows.ts`TEN GELIYOR.
  //
  // Eskiden burada `if (code !== "9") return events;` vardi ve korpusun
  // 1.211.994 satirindan 47.140'i — bunlarin **31.605'i SURE TASIYAN** —
  // sessizce dusuyordu: carpma, tril, mordent, tremolo ve anlami
  // kanitlanmamis dokuz kod. Olcum: olcu doluluğu kanonik izgarada %93,13
  // iken parser'in akisinda %88,81'de kaliyordu; fark tam olarak bu satirlar.
  //
  // Artik `readSymbtrRows` yuruyor ve ZAMANI ILERLETEN her satir olay
  // uretiyor. "Zamani ilerletir" tanimi tek yerde: `rowAdvance().canonical`.
  // Bu sayede:
  //   · kod-51 (mertebe) zaten `meter-change` — olay uretmez
  //   · kod-52 (tempo) `canonical = 0` — olay uretmez (hayalet sure eklemez)
  //   · suresiz carpmalar (kod-8'in %91'i) `untimed` — zaman eksenini bozmaz
  return readSymbtrRows(raw).rows.reduce<SymbtrScoreEvent[]>((events, row) => {
    if (row.kind !== "timed") return events;
    if (rowAdvance(row).canonical === ZERO_TICKS) return events;

    const columns = row.columns;
    const index = row.sira ?? Number(columns[0]);
    // Perde ham sutundan okunuyor: `rows.ts` es satirlarinda `pitchAeu`i
    // `null`liyor, ama buradaki es tespiti (`normalizePitch` basarisiz mi)
    // eski davranisla BIREBIR ayni kalmali — sessiz kayma olmasin.
    const sourcePitch = columns[3] ?? "";
    const koma53 = Number(columns[4]);
    const section = columns[11]?.trim() || null;
    const offsetUnits = row.offsetUnits;
    const measureIndex = measureIndexBySira
      ? measureIndexBySira.get(index) ?? null
      : offsetUnits && offsetUnits > 0
        ? Math.max(1, Math.ceil(offsetUnits))
        : null;
    const isMeasureEnd = Boolean(offsetUnits && offsetUnits > 0 && isNearInteger(offsetUnits));
    const {numerator: pay, denominator: payda} = row.durationFraction;
    // `rows.ts` sureyi TICK ekseninde dogruladi (payda tick cozunurlugunu
    // bolmeliydi); burada yalniz ceyreklik eksenine koprulenir.
    const durationBeats = quarterBeatsOf(row.duration);

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
      durationFraction: {numerator: pay, denominator: payda},
      startTime: startBeat * beatDuration,
      duration: durationBeats * beatDuration,
      section,
      offsetUnits,
      measureIndex,
      measureIndexBasis,
      barlineTie: null,
      isMeasureEnd,
      isRest,
      code: row.code,
      ornament: row.ornament,
      unresolvedCode: row.unresolvedCode,
    });

    startBeat += durationBeats;
    return events;
  }, []);
}

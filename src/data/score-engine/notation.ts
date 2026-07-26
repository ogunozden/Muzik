import {parsePitch} from "@/core/domain/note-naming";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "./canonical-score";

export interface CanonicalVexPitch {
  accidental: "#" | "b" | null;
  key: string;
  komaAccidental: string | null;
}

export interface TupletContext {
  /** Kac nota, kac nota suresine sigiyor (3:2 = triole). */
  numNotes: number;
  notesOccupied: number;
  /** Kaynak paydasi (12/24/48) — ardisik notalari gruplama anahtari. */
  sourceDenominator: number;
}

export interface CanonicalVexDuration {
  dotted: boolean;
  duration: string;
  /**
   * Nota bir TUPLET uyesiyse baglami. `duration` bu durumda YAZILI degeri
   * tasir (1/12 -> sekizlik); gercek sure bracket'in kendisinden gelir (K2).
   */
  tuplet?: TupletContext;
  /**
   * Kaynak sure standart nota degerleriyle TAM temsil edilemedi mi?
   * (triole, >4 vurus, 5/8 gibi.) Cizim yine yapilir — ama bu bayrak
   * dispatch tablosuna tasinir ki manifest tam sadakat IDDIA ETMESIN (D5).
   */
  approximated?: boolean;
  /**
   * Sure tek bir standart degerle yazilamiyorsa BAG ile bagli parcalar (K3):
   * 5/8 -> ikilik + sekizlik. `duration`/`dotted` ilk parcayi tasir.
   */
  tiedParts?: TiedDurationPart[];
}

export interface TiedDurationPart {
  duration: string;
  dotted: boolean;
  beats: number;
}

export interface CanonicalVexEvent {
  duration: CanonicalVexDuration;
  event: CanonicalScoreEvent;
  pitch: CanonicalVexPitch;
}

function toVexPitchKey(step: string, octave: number, accidental: "#" | "b" | null): string {
  return `${step.toLowerCase()}${accidental ?? ""}/${octave}`;
}

function getStandardAccidental(value: string): "#" | "b" | null {
  if (value.startsWith("#")) return "#";
  if (value.startsWith("b")) return "b";
  return null;
}

export function mapCanonicalPitchToVex(event: CanonicalScoreEvent): CanonicalVexPitch {
  if (event.isRest) {
    return {
      accidental: null,
      key: "b/4",
      komaAccidental: null,
    };
  }

  const sourceParsed = parsePitch(event.pitch.source);
  if (sourceParsed) {
    const accidental = getStandardAccidental(sourceParsed.accidental);
    return {
      accidental,
      key: toVexPitchKey(sourceParsed.step, sourceParsed.octave, accidental),
      komaAccidental: sourceParsed.symbtrAccidental ? sourceParsed.accidental : null,
    };
  }

  const playbackParsed = event.pitch.playback ? parsePitch(event.pitch.playback) : null;
  if (playbackParsed) {
    const accidental = getStandardAccidental(playbackParsed.accidental);
    return {
      accidental,
      key: toVexPitchKey(playbackParsed.step, playbackParsed.octave, accidental),
      komaAccidental: null,
    };
  }

  return {
    accidental: null,
    key: "b/4",
    komaAccidental: null,
  };
}

/**
 * Kaynak kesri bir TUPLET mi? (K2)
 *
 * SymbTr `pay/payda` kesri TAM NOTAYA goredir (`durationBeats = pay/payda*4`).
 * Payda 3'un kati VE payda/3 ikinin kuvvetiyse bu bir uclu bolunmedir:
 *   1/12 -> notada SEKIZLIK, ucu iki sekizlik suresinde (3:2)
 *   1/24 -> onaltilik, 1/48 -> otuzikilik
 *
 * Olcum (SymbTr-3.0, 400 dosya): 2.173 event triole — yaklasik cizilen
 * event'lerin %79'u, 83 eserde. Eskiden bunlar en yakin dyadic degere
 * yuvarlanip (cogu 16'lik) bracket'siz ciziliyordu; dispatch tablosu ise
 * `tuplet-time-modification`i "not-rendered" diye raporluyordu — oysa
 * triolenin NOTALARI ciziliyordu, sadece yanlis degerle.
 */
export function getTupletContext(fraction: {numerator: number; denominator: number}): TupletContext | null {
  // Kesir once SADELESTIRILIR. Ham paydaya bakmak yanlis siniflandirir:
  // 3/12 aslinda 1/4 (duz ceyreklik), 9/24 = 3/8 (noktali ceyreklik),
  // 3/48 = 1/16. Bunlarin paydasi 3'un kati olsa da uclu bolunme DEGILLER.
  const {numerator, denominator} = reduceFraction(fraction);
  if (!Number.isInteger(denominator) || denominator <= 0 || denominator % 3 !== 0) return null;
  if (!Number.isInteger(numerator) || numerator <= 0) return null;

  const occupied = denominator / 3;
  if (occupied <= 0 || (occupied & (occupied - 1)) !== 0) return null; // ikinin kuvveti degil

  return {numNotes: 3, notesOccupied: 2, sourceDenominator: denominator};
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : greatestCommonDivisor(right, left % right);
}

function reduceFraction(fraction: {numerator: number; denominator: number}): {numerator: number; denominator: number} {
  const {numerator, denominator} = fraction;
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) return fraction;
  const divisor = greatestCommonDivisor(numerator, denominator) || 1;
  return {numerator: numerator / divisor, denominator: denominator / divisor};
}

/**
 * Tuplet uyesinin NOTADA yazili suresi (vurus). Payda 3/2 oraninda kucultulur:
 * 12 -> 8 (sekizlik), 24 -> 16, 48 -> 32.
 */
export function getTupletNotatedBeats(fraction: {numerator: number; denominator: number}): number {
  const reduced = reduceFraction(fraction);
  return (reduced.numerator / ((reduced.denominator * 2) / 3)) * 4;
}

/**
 * Standart nota degerleri (ceyreklik = 1 vurus), buyukten kucuge.
 * Eski merdivenin TABANI 16'likti: 32'lik ve daha kisa her nota 16'lik
 * ciziliyordu (olcum: yalniz 1/32 icin 2.099 event).
 */
const VEX_DURATION_LADDER: ReadonlyArray<{beats: number; duration: string; dotted: boolean}> = [
  {beats: 4, duration: "w", dotted: false},
  {beats: 3, duration: "h", dotted: true},
  {beats: 2, duration: "h", dotted: false},
  {beats: 1.5, duration: "q", dotted: true},
  {beats: 1, duration: "q", dotted: false},
  {beats: 0.75, duration: "8", dotted: true},
  {beats: 0.5, duration: "8", dotted: false},
  {beats: 0.375, duration: "16", dotted: true},
  {beats: 0.25, duration: "16", dotted: false},
  {beats: 0.1875, duration: "32", dotted: true},
  {beats: 0.125, duration: "32", dotted: false},
  {beats: 0.09375, duration: "64", dotted: true},
  {beats: 0.0625, duration: "64", dotted: false},
];

/**
 * Sure -> VexFlow nota degeri (D5).
 *
 * Tam eslesme varsa onu doner. Yoksa kaynagi ASMAYAN en yakin degeri cizer ve
 * `approximated` isaretler — bu bayrak dispatch tablosuna tasinir. Triole,
 * >4 vurusluk notalar ve 5/8 / 7/8 / 9/8 gibi degerler bu sinifa girer;
 * dogru nihai cozum tuplet destegi ve bag (tie) ile bolmedir.
 *
 * Eski surum her esikte "asagi yuvarla" yapiyordu ve bunu HIC raporlamiyordu:
 * 5 vurusluk nota birlik, 2,5 vurusluk nota ikilik ciziliyordu; dispatch
 * tablosu ise `tuplet-time-modification`i "not-rendered" diye bildiriyordu —
 * oysa triolenin NOTALARI ciziliyordu, sadece yanlis degerle.
 */
export function mapDurationBeatsToVex(durationBeats: number, isRest: boolean): CanonicalVexDuration {
  const suffix = isRest ? "r" : "";
  const smallest = VEX_DURATION_LADDER[VEX_DURATION_LADDER.length - 1];

  const exact = VEX_DURATION_LADDER.find((entry) => Math.abs(entry.beats - durationBeats) < 1e-9);
  if (exact) return {duration: `${exact.duration}${suffix}`, dotted: exact.dotted};

  const nearestNotExceeding = VEX_DURATION_LADDER.find((entry) => entry.beats <= durationBeats) ?? smallest;
  return {
    duration: `${nearestNotExceeding.duration}${suffix}`,
    dotted: nearestNotExceeding.dotted,
    approximated: true,
  };
}

/**
 * Temsil edilemeyen sureyi standart degerlere BOLER (K3).
 *
 * Greedy: her adimda kalani asmayan en buyuk merdiven degeri. Ornekler —
 * 5/8 (2,5 vurus) -> ikilik + sekizlik; 7/8 (3,5) -> noktali ikilik + sekizlik;
 * 5/4 (5) -> birlik + ceyreklik; 3/2 (6) -> birlik + ikilik.
 *
 * Olcum (K2 sonrasi, 400 dosya): 583 event bu sinifta — 5/8 (289), 7/8 (80),
 * 5/4 (76), 3/2 (62), 5/16 (38), 9/8 (33). Eskiden hepsi sessizce ASAGI
 * yuvarlaniyordu (5 vurusluk nota birlik cizilip 1 vurus kayboluyordu).
 */
export function splitDurationIntoTiedParts(durationBeats: number, isRest: boolean): TiedDurationPart[] {
  const suffix = isRest ? "r" : "";
  const parts: TiedDurationPart[] = [];
  const epsilon = 1e-9;
  let remaining = durationBeats;

  // Ust sinir: patolojik girdide sonsuz donguye girmemek icin.
  while (remaining > epsilon && parts.length < 8) {
    const entry = VEX_DURATION_LADDER.find((candidate) => candidate.beats <= remaining + epsilon);
    if (!entry) break;
    parts.push({duration: `${entry.duration}${suffix}`, dotted: entry.dotted, beats: entry.beats});
    remaining -= entry.beats;
  }
  return parts;
}

/**
 * Event'in VexFlow sure eslemesi. Tuplet uyesiyse YAZILI deger kullanilir ve
 * `tuplet` baglami tasinir; degilse duz merdiven (K2).
 */
export function mapEventDurationToVex(event: CanonicalScoreEvent): CanonicalVexDuration {
  const tuplet = getTupletContext(event.durationFraction);
  if (tuplet) {
    const notated = mapDurationBeatsToVex(getTupletNotatedBeats(event.durationFraction), event.isRest);
    // Yazili deger dyadic oldugu icin merdivende TAM karsiligi vardir;
    // `approximated` tasimamali.
    return {duration: notated.duration, dotted: notated.dotted, tuplet};
  }

  const direct = mapDurationBeatsToVex(event.durationBeats, event.isRest);
  if (!direct.approximated) return direct;

  // Tek degerle yazilamiyor: BAG ile bol (K3). Bolme TAM toplaniyorsa artik
  // yaklasik degildir; toplamiyorsa (patolojik sure) yaklasik kalir.
  const parts = splitDurationIntoTiedParts(event.durationBeats, event.isRest);
  const sum = parts.reduce((total, part) => total + part.beats, 0);
  if (parts.length < 2 || Math.abs(sum - event.durationBeats) > 1e-9) return direct;

  return {duration: parts[0].duration, dotted: parts[0].dotted, tiedParts: parts};
}

export function mapCanonicalEventToVex(event: CanonicalScoreEvent): CanonicalVexEvent {
  return {
    duration: mapEventDurationToVex(event),
    event,
    pitch: mapCanonicalPitchToVex(event),
  };
}

/**
 * Policy-derived natural/cancellation hesabi (F10.6; ENGRAVING_POLICY bolum 3).
 *
 * Kaynakta natural acik gelmez (korpus: MusicXML natural 0). Natural glifi
 * YALNIZ su deterministik kosulda cizilir: ayni olcu icinde ayni perde-adimi
 * (step+oktav) onceki event'te ariza (standart veya koma) tasiyordu ve mevcut
 * event ayni adimda arizasiz. Bu `policy-derived` bir cancellation'dir;
 * gorsel/PDF kaniti tek basina yeterli degildir.
 */
export function computePolicyDerivedNaturals(events: readonly CanonicalScoreEvent[]): Set<string> {
  const naturals = new Set<string>();
  // measureId -> (step/oktav anahtari -> onceki event ariza tasiyor mu)
  const accidentalState = new Map<string, Map<string, boolean>>();

  for (const event of events) {
    if (event.isRest) continue;

    const pitch = mapCanonicalPitchToVex(event);
    const stepKey = `${pitch.key.charAt(0)}/${pitch.key.split("/")[1] ?? ""}`;
    const hasAccidental = pitch.accidental !== null || pitch.komaAccidental !== null;

    let measureState = accidentalState.get(event.measureId);
    if (!measureState) {
      measureState = new Map<string, boolean>();
      accidentalState.set(event.measureId, measureState);
    }

    const previousHadAccidental = measureState.get(stepKey) ?? false;
    if (!hasAccidental && previousHadAccidental) {
      naturals.add(event.id);
    }
    measureState.set(stepKey, hasAccidental);
  }

  return naturals;
}

export interface SegnoSectionMarker {
  sectionId: string;
  label: string;
  eventId: string;
}

/**
 * Segno (Teslim bolumu baslangici) isaretcisi (D2).
 *
 * Kaynak: SymbTr v3 PDF metin katmaninda "TESLøM" — ø (U+00F8) segno isareti;
 * mu2 tarafinda Teslim beat 21.0625.
 *
 * YALNIZ hem "teslim" etiketli bir bolum VAR hem de o bolumun ilk event'i
 * belgede COZUMLENEBILIYORSA doner. Cizim (`ScoreSurface`) ve dispatch
 * tablosu (`score-format`) AYNI bu fonksiyondan beslenir; boylece manifest
 * cizilmeyen bir sinifi "cizildi" diye raporlayamaz.
 *
 * Onceki surumde dispatch kaydi belgeden BAGIMSIZ sabitti (`source-proven` /
 * `rendered: true`) ve evidence tek bir eserin PDF adina cakiliydi: Teslim'i
 * olmayan her belgede — demo dokuman dahil — yanlis kanitla "cizildi"
 * raporlaniyordu.
 */
export function findSegnoSectionMarker(document: CanonicalScoreDocument): SegnoSectionMarker | null {
  const section = document.sections.find((candidate) =>
    candidate.label.toLocaleLowerCase("tr").includes("teslim"),
  );
  if (!section) return null;

  const eventIds = new Set(document.events.map((event) => event.id));
  const eventId = section.eventIds.find((candidate) => eventIds.has(candidate));
  if (!eventId) return null;

  return {sectionId: section.id, label: section.label, eventId};
}

export interface SourceProvenTie {
  fromEventId: string;
  toEventId: string;
  pitchKey: string;
}

/**
 * Kaynak-kanitli tie ciftleri (F8.7; SymbTr v3 `<tied>` kanali).
 *
 * Importer tie feature'i MusicXML nota-ordinal'iyla verir (`from:to:step+oktav`).
 * Ordinal -> canonical event eslemesi YALNIZ dogrulama gecerse kabul edilir:
 * her iki ordinal event listesinde olmali, event rest olmamali ve event'in
 * kaynak perdesi feature'daki step+oktav ile baslamali. Eslesmeyen tie
 * CIZILMEZ (sembol uydurulmaz) ama feature kanit olarak dokumanda kalir.
 */
export function computeSourceProvenTies(document: CanonicalScoreDocument): SourceProvenTie[] {
  const ties: SourceProvenTie[] = [];
  for (const feature of document.sourceFeatures) {
    if (feature.kind !== "tie" || feature.status !== "source-proven") continue;
    const [fromPart, toPart, pitchKey] = feature.value.split(":");
    const fromOrdinal = Number.parseInt(fromPart ?? "", 10);
    const toOrdinal = Number.parseInt(toPart ?? "", 10);
    if (!Number.isInteger(fromOrdinal) || !Number.isInteger(toOrdinal) || fromOrdinal >= toOrdinal) continue;
    const fromEvent = document.events[fromOrdinal];
    const toEvent = document.events[toOrdinal];
    if (!fromEvent || !toEvent || fromEvent.isRest || toEvent.isRest) continue;
    if (!pitchKey || !fromEvent.pitch.source.startsWith(pitchKey) || !toEvent.pitch.source.startsWith(pitchKey)) {
      continue;
    }
    ties.push({fromEventId: fromEvent.id, toEventId: toEvent.id, pitchKey});
  }
  return ties;
}

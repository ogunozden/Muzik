import type {InstrumentType, PercussionSymbol} from "@/engines/ses/engine";
import {formatSolfegePitch} from "@/core/domain/note-naming";
import type {
  ExternalReferenceAccess,
  ExternalReferenceProvider,
  ExternalReferenceSource,
  ExternalReferenceVerification,
} from "@/data/references/external-sources";

export interface PieceScoreEvent {
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
  startTime: number;
  duration: number;
  section: string | null;
  offsetUnits: number | null;
  measureIndex: number | null;
  isMeasureEnd: boolean;
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

export interface PiecePlaybackAhenk {
  label: string;
  koma53Offset: number;
  referencePitch: string;
}

export type PieceReferenceProvider = ExternalReferenceProvider;
export type PieceReferenceAccess = ExternalReferenceAccess;
export type PieceReferenceVerification = ExternalReferenceVerification;
export type PieceReferenceSource = ExternalReferenceSource;

export interface PieceVisualStaffBand {
  id: string;
  pageIndex: number;
  label: string;
  startBeat: number;
  endBeat: number;
  leftPercent: number;
  widthPercent: number;
  topPercent: number;
  heightPercent: number;
}

export interface PieceVisualBeatPosition {
  pageIndex: number;
  bandId: string;
  label: string;
  beat: number;
  progressPercent: number;
  xPercent: number;
  yPercent: number;
}

export interface PieceMeasureRange {
  measureIndex: number;
  startBeat: number;
  endBeat: number;
  source: "symbtr-offset" | "duration-fallback";
}

export interface PieceVisualMeasureSegment {
  id: string;
  pageIndex: number;
  bandId: string;
  measureIndex: number;
  startBeat: number;
  endBeat: number;
  leftPercent: number;
  widthPercent: number;
  topPercent: number;
  heightPercent: number;
}

export interface PieceVisualMap {
  method: "manual-percent";
  verifiedAt: string;
  notes: string;
  staffBands: readonly PieceVisualStaffBand[];
}

const DEFAULT_VISUAL_STAFF_ROWS = [
  {name: "üst satır", leftPercent: 6, widthPercent: 88, topPercent: 15, heightPercent: 14},
  {name: "orta satır", leftPercent: 6, widthPercent: 88, topPercent: 32, heightPercent: 14},
  {name: "alt satır", leftPercent: 6, widthPercent: 88, topPercent: 49, heightPercent: 14},
] as const;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function isNearInteger(value: number): boolean {
  return Math.abs(value - Math.round(value)) < 0.000001;
}

export function createDefaultVisualMap(
  pageCount: number,
  options: {
    beatsPerStaff?: number;
    verifiedAt?: string;
    notes?: string;
  } = {},
): PieceVisualMap {
  const safePageCount = Math.max(0, Math.floor(pageCount));
  const beatsPerStaff = options.beatsPerStaff ?? 28;
  const staffBands = Array.from({length: safePageCount}).flatMap((_, pageIndex) =>
    DEFAULT_VISUAL_STAFF_ROWS.map((row, rowIndex) => {
      const staffIndex = pageIndex * DEFAULT_VISUAL_STAFF_ROWS.length + rowIndex;
      const startBeat = staffIndex * beatsPerStaff;

      return {
        id: `p${pageIndex + 1}-r${rowIndex + 1}`,
        pageIndex,
        label: `${pageIndex + 1}. sayfa ${row.name}`,
        startBeat,
        endBeat: startBeat + beatsPerStaff,
        leftPercent: row.leftPercent,
        widthPercent: row.widthPercent,
        topPercent: row.topPercent,
        heightPercent: row.heightPercent,
      };
    }),
  );

  return {
    method: "manual-percent",
    verifiedAt: options.verifiedAt ?? "local-upload",
    notes: options.notes ?? "Görsel sayfa satırları yüzde tabanlı varsayılan bantlarla eşlenir.",
    staffBands,
  };
}

export function getVisualBeatPosition(
  band: PieceVisualStaffBand,
  currentBeat: number,
): PieceVisualBeatPosition | null {
  if (!Number.isFinite(currentBeat)) return null;

  const beatSpan = Math.max(band.endBeat - band.startBeat, 1);
  const progressRatio = Math.min(1, Math.max(0, (currentBeat - band.startBeat) / beatSpan));
  const xPercent = clampPercent(band.leftPercent + band.widthPercent * progressRatio);
  const yPercent = clampPercent(band.topPercent + band.heightPercent / 2);

  return {
    pageIndex: band.pageIndex,
    bandId: band.id,
    label: band.label,
    beat: currentBeat,
    progressPercent: progressRatio * 100,
    xPercent,
    yPercent,
  };
}

export function getSymbtrMeasureRanges(events: readonly PieceScoreEvent[]): PieceMeasureRange[] {
  const ranges = new Map<number, PieceMeasureRange>();

  for (const event of events) {
    const measureIndex = event.measureIndex ?? Math.max(1, Math.floor(event.startBeat / 4) + 1);
    const source = event.measureIndex ? "symbtr-offset" : "duration-fallback";
    const existing = ranges.get(measureIndex);
    const eventEndBeat = event.startBeat + event.durationBeats;

    if (!existing) {
      ranges.set(measureIndex, {
        measureIndex,
        startBeat: event.startBeat,
        endBeat: eventEndBeat,
        source,
      });
      continue;
    }

    ranges.set(measureIndex, {
      measureIndex,
      startBeat: Math.min(existing.startBeat, event.startBeat),
      endBeat: Math.max(existing.endBeat, eventEndBeat),
      source: existing.source === "symbtr-offset" || source === "symbtr-offset" ? "symbtr-offset" : "duration-fallback",
    });
  }

  return Array.from(ranges.values()).sort((left, right) => left.measureIndex - right.measureIndex);
}

export function createVisualMeasureSegments(
  events: readonly PieceScoreEvent[],
  bands: readonly PieceVisualStaffBand[],
): PieceVisualMeasureSegment[] {
  if (events.length === 0 || bands.length === 0) return [];

  return getSymbtrMeasureRanges(events).flatMap((range) =>
    bands.flatMap((band) => {
      const visibleStartBeat = Math.max(range.startBeat, band.startBeat);
      const visibleEndBeat = Math.min(range.endBeat, band.endBeat);
      if (visibleEndBeat <= visibleStartBeat) return [];

      const bandBeatSpan = Math.max(band.endBeat - band.startBeat, 1);
      const leftRatio = (visibleStartBeat - band.startBeat) / bandBeatSpan;
      const widthRatio = (visibleEndBeat - visibleStartBeat) / bandBeatSpan;

      return {
        id: `m${range.measureIndex}-${band.id}`,
        pageIndex: band.pageIndex,
        bandId: band.id,
        measureIndex: range.measureIndex,
        startBeat: visibleStartBeat,
        endBeat: visibleEndBeat,
        leftPercent: clampPercent(band.leftPercent + band.widthPercent * leftRatio),
        widthPercent: clampPercent(band.widthPercent * widthRatio),
        topPercent: band.topPercent,
        heightPercent: band.heightPercent,
      };
    }),
  );
}

export function getActiveVisualMeasureSegment(
  segments: readonly PieceVisualMeasureSegment[],
  currentBeat: number,
): PieceVisualMeasureSegment | null {
  if (segments.length === 0 || !Number.isFinite(currentBeat)) return null;

  return (
    segments.find((segment) => currentBeat >= segment.startBeat && currentBeat < segment.endBeat) ??
    segments.find((segment) => currentBeat <= segment.endBeat) ??
    segments[segments.length - 1] ??
    null
  );
}

export interface PieceUsulHit {
  beat: number;
  syllable: string;
  symbol: PercussionSymbol;
  isAccent: boolean;
  timeValue: number;
}

export interface PieceDefinition {
  id: string;
  title: string;
  displayTitle: string;
  composer: string;
  makam: string;
  form: string;
  usul: string;
  usulId: string;
  meter: string;
  bpm: number;
  symbtrCatalogId?: string;
  symbtrRawUrl: string;
  symbtrPageUrl: string;
  sourcePageUrl: string;
  referenceRecordingUrl?: string;
  referenceSources?: readonly PieceReferenceSource[];
  scorePageUrls: readonly string[];
  visualMap?: PieceVisualMap;
  playbackAhenk?: PiecePlaybackAhenk;
  usulHits?: readonly PieceUsulHit[];
  melodicLayers: readonly PieceLayer[];
  percussionLayers: readonly PiecePercussionLayer[];
  requiredPercussionSymbols: readonly PercussionSymbol[];
}

export const KIZ_NEYI_FOUR_VOICE_A_AHENK = {
  label: "Kız Neyi - 4 Ses - A",
  koma53Offset: 9,
  referencePitch: "Rast=A4",
} as const satisfies PiecePlaybackAhenk;

export const DEVRI_KEBIR_DARB_PATTERN = [
  {beat: 1, syllable: "Dü-üm", symbol: "dum", isAccent: true, timeValue: 2},
  {beat: 3, syllable: "Dü-üm", symbol: "dum", isAccent: false, timeValue: 2},
  {beat: 5, syllable: "Te-ek", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 7, syllable: "Düm", symbol: "dum", isAccent: true, timeValue: 1},
  {beat: 8, syllable: "Tek", symbol: "tek", isAccent: false, timeValue: 1},
  {beat: 9, syllable: "Te", symbol: "tek", isAccent: false, timeValue: 0.5},
  {beat: 9.5, syllable: "Ke", symbol: "ke", isAccent: false, timeValue: 0.5},
  {beat: 10, syllable: "Düm", symbol: "dum", isAccent: false, timeValue: 1},
  {beat: 11, syllable: "Te-ek", symbol: "tek", isAccent: true, timeValue: 2},
  {beat: 13, syllable: "Te-ek", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 15, syllable: "Te-ek", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 17, syllable: "Dü-üm", symbol: "dum", isAccent: true, timeValue: 2},
  {beat: 19, syllable: "Dü-üm", symbol: "dum", isAccent: true, timeValue: 2},
  {beat: 21, syllable: "Ta-aa", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 23, syllable: "He-ek", symbol: "dum", isAccent: false, timeValue: 2},
  {beat: 25, syllable: "Te", symbol: "tek", isAccent: false, timeValue: 1},
  {beat: 26, syllable: "Ke", symbol: "ke", isAccent: false, timeValue: 1},
  {beat: 27, syllable: "Te", symbol: "tek", isAccent: false, timeValue: 1},
  {beat: 28, syllable: "Ke", symbol: "ke", isAccent: false, timeValue: 1},
] as const satisfies readonly PieceUsulHit[];

export const HICAZKAR_REFERENCE_SOURCES = [
  {
    id: "defteriniz-hicazkar-pesrev-osman-bey-score",
    label: "Nota kaynağı",
    provider: "score",
    url: "https://defteriniz.com/hicazkar-pesrev-tanburi-osman-bey-saz-eserleri-t-s-m-nota/101492/",
    title: "Hicazkar Peşrev - Tanburi Osman Bey",
    access: "external-link",
    verification: "manual",
    verifiedAt: "2026-05-10",
  },
  {
    id: "symbtr-hicazkar-pesrev-devrikebir-tanburi-buyuk-osman-bey",
    label: "SymbTr",
    provider: "symbtr",
    url: "https://github.com/MTG/SymbTr",
    title: "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey",
    access: "external-link",
    verification: "catalog",
    verifiedAt: "2026-05-10",
  },
  {
    id: "youtube-nwbnzn75br8",
    label: "Referans kayıt",
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=NwbNZN75bR8",
    title: "Hicazkâr Peşrev (Tanburi Büyük Osman) Nota Eşliğinde (Ahenk: Kız Neyi - 4 Ses - A)",
    author: "Bekir GÜLSÜN",
    thumbnailUrl: "https://i.ytimg.com/vi/NwbNZN75bR8/hqdefault.jpg",
    access: "external-link",
    verification: "oembed",
    verifiedAt: "2026-05-10",
    notes: "Metadata YouTube oEmbed ile doğrulandı; otomatik embed yapılmaz.",
  },
] as const satisfies readonly PieceReferenceSource[];

export const HICAZKAR_VISUAL_MAP = {
  ...createDefaultVisualMap(3, {
    verifiedAt: "2026-05-10",
    notes: "Kaynak GIF sayfalarında ölçü koordinatı bulunmadığı için satır bantları yüzde tabanlı manuel hizalama noktası olarak tutulur.",
  }),
} as const satisfies PieceVisualMap;

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
  symbtrCatalogId: "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey",
  symbtrRawUrl:
    "https://raw.githubusercontent.com/MTG/SymbTr/master/txt/hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey.txt",
  symbtrPageUrl: "https://github.com/MTG/SymbTr",
  sourcePageUrl: "https://defteriniz.com/hicazkar-pesrev-tanburi-osman-bey-saz-eserleri-t-s-m-nota/101492/",
  referenceRecordingUrl: "https://www.youtube.com/watch?v=NwbNZN75bR8",
  referenceSources: HICAZKAR_REFERENCE_SOURCES,
  scorePageUrls: [
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey01.gif",
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey02.gif",
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey03.gif",
  ],
  visualMap: HICAZKAR_VISUAL_MAP,
  playbackAhenk: KIZ_NEYI_FOUR_VOICE_A_AHENK,
  usulHits: DEVRI_KEBIR_DARB_PATTERN,
  melodicLayers: [
    {id: "ud", label: "Ud", instrument: "ud", gain: 0.2, delay: 0},
    {id: "kanun", label: "Kanun", instrument: "kanun", gain: 0.13, delay: 0.012},
    {id: "kemence", label: "Kemençe", instrument: "kemençe", gain: 0.12, delay: 0.022},
  ] satisfies PieceLayer[],
  percussionLayers: [
    {id: "kudum", label: "Kudüm", instrument: "kudum"},
  ] satisfies PiecePercussionLayer[],
  requiredPercussionSymbols: ["dum", "tek", "ke"] satisfies PercussionSymbol[],
} as const satisfies PieceDefinition;

export const PIECE_LIBRARY = [HICAZKAR_PESREV] as const satisfies readonly PieceDefinition[];

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

export function parseSymbtrScore(raw: string, bpm: number, koma53Offset: number = 0): PieceScoreEvent[] {
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
      const rawOffsetUnits = Number(columns[12]);
      const offsetUnits = Number.isFinite(rawOffsetUnits) ? rawOffsetUnits : null;
      const measureIndex = offsetUnits && offsetUnits > 0 ? Math.max(1, Math.ceil(offsetUnits)) : null;
      const isMeasureEnd = Boolean(offsetUnits && offsetUnits > 0 && isNearInteger(offsetUnits));
      const durationBeats = (pay / payda) * 4;
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

export function getCurrentScoreEvent(events: PieceScoreEvent[], elapsedSeconds: number): PieceScoreEvent | null {
  return (
    events.find((event) => elapsedSeconds >= event.startTime && elapsedSeconds < event.startTime + event.duration) ??
    null
  );
}

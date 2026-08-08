import {
  PIECE_LIBRARY,
  parseSymbtrScore,
  type PieceLayer,
  type PieceScoreEvent,
  type PieceUsulHit,
} from "@/data/pieces/hicazkarPesrev";
import type {PieceVisualStaffBand} from "@/data/pieces/visual-map";
import type {InstrumentType, PercussionSymbol} from "@/engines/ses/engine";
import {INSTRUMENTS} from "@/lib/app-constants";
import type {SymbTrCatalogEntry} from "@/data/symbtr/catalog";

/**
 * Eser Takip (studio/follow) icin saf yardimcilar, sabitler ve tipler
 * (M8.3 bolme). JSX icermez; bagimsiz test edilebilir.
 */

export const DEFAULT_PIECE = PIECE_LIBRARY[0];
export const MIN_BPM = 40;
export const MAX_BPM = 180;
export const MELODIC_MIX_GAIN_CEILING = 0.34;
export const ADDED_MELODIC_LAYER_GAIN = 0.1;

export interface SampleSlotStatus {
  category: "melodic" | "percussion";
  instrumentId: string;
  installed: boolean;
  symbol: PercussionSymbol | null;
}

export interface SampleApiResponse {
  slots?: SampleSlotStatus[];
}

export interface CustomScoreImage {
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface CustomPieceDraft {
  title: string;
  composer: string;
  makam: string;
  form: string;
  catalogId: string;
  scoreImages: CustomScoreImage[];
}

export type DisplayUsulHit = Pick<PieceUsulHit, "beat" | "isAccent" | "syllable" | "timeValue"> & {
  symbol: PercussionSymbol | "";
};

export function clampBpm(value: number, fallbackBpm: number = DEFAULT_PIECE.bpm): number {
  if (!Number.isFinite(value)) return fallbackBpm;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

/**
 * Döngü bölgesi (loop region) planlamasi — SAF fonksiyonlar (W3.8).
 *
 * Notalar/hit'ler bolge boyunca ses saatinde TEKRAR planlanir: bolge suresi
 * kadar ofsetlenmis kopyalar, toplam sureyi asmayacak sekilde uretilir.
 */
export function repeatNotesForLoop<T extends {startTime: number}>(
  notes: readonly T[],
  regionStartTime: number,
  regionDuration: number,
  totalDuration: number,
): T[] {
  if (notes.length === 0 || !(regionDuration > 0) || !(totalDuration > regionStartTime)) return [...notes];
  const loopCount = Math.max(1, Math.ceil((totalDuration - regionStartTime) / regionDuration));
  return notes.flatMap((note) =>
    Array.from({length: loopCount}, (_, index) => ({...note, startTime: note.startTime + index * regionDuration})),
  );
}

/**
 * Imleci bolgede SARAR: bolge disinda kalan duyulan konum, bolgenin basina
 * dondurulur (gorsel geri bildirim; ses zaten tekrar planlanmistir).
 */
export function wrapPlaybackPosition(heardPosition: number, regionStartTime: number, regionDuration: number): number {
  if (!(regionDuration > 0) || heardPosition < regionStartTime) return Math.max(0, heardPosition);
  const offset = (heardPosition - regionStartTime) % regionDuration;
  return regionStartTime + (offset < 0 ? offset + regionDuration : offset);
}

export function getInstrumentLabel(instrumentId: InstrumentType): string {
  const instrument = INSTRUMENTS.find((item) => item.id === instrumentId);
  return instrument?.nameTr ?? instrumentId;
}

export function makeLayerId(instrument: InstrumentType, existingIds: Set<string>): string {
  const base = instrument.replace(/[^a-zA-Z0-9_-]/g, "-");
  let candidate = base;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export function formatBeatLabel(beat: number): string {
  return Number.isInteger(beat) ? beat.toString() : beat.toFixed(1);
}

export function hasMelodicSamples(slots: SampleSlotStatus[], instrument: InstrumentType): boolean {
  return slots.some((slot) => slot.installed && slot.category === "melodic" && slot.instrumentId === instrument);
}

export function hasPercussionSamples(
  slots: SampleSlotStatus[],
  instrument: InstrumentType,
  requiredSymbols: readonly PercussionSymbol[],
): boolean {
  return requiredSymbols.every((symbol) =>
    slots.some(
      (slot) =>
        slot.installed &&
        slot.category === "percussion" &&
        slot.instrumentId === instrument &&
        slot.symbol === symbol,
    ),
  );
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function formatFrequency(frequency: number | null | undefined): string {
  if (!frequency) return "Hazır";
  return `${frequency.toFixed(2)} Hz`;
}

export function isHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function makeVisualPieceSignature(title: string, images: readonly CustomScoreImage[]): string {
  const imageKeys = images.map((image) => `${image.name}:${image.size}`).sort().join("|");
  return `local-images:${title.toLocaleLowerCase("tr-TR")}:${imageKeys}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface LoopRegion {
  startMeasure: number;
  endMeasure: number;
  regionStartTime: number;
  regionDuration: number;
}

/**
 * Olcu araligindan dongu bolgesi hesaplar (W3.8). Gecersiz/boş aralikta
 * `null` — cagiran dongusuz davranisa doner.
 */
export function buildLoopRegion(
  events: readonly {measureIndex: number | null; startTime: number; duration: number}[],
  startMeasureInput: number,
  endMeasureInput: number,
  maxMeasureIndex: number,
): LoopRegion | null {
  const startMeasure = clamp(startMeasureInput, 1, maxMeasureIndex);
  const endMeasure = clamp(Math.min(endMeasureInput, maxMeasureIndex), startMeasure, maxMeasureIndex);
  const regionEvents = events.filter(
    (event) =>
      event.measureIndex !== null && event.measureIndex >= startMeasure && event.measureIndex <= endMeasure,
  );
  if (regionEvents.length === 0) return null;
  const regionStartTime = Math.min(...regionEvents.map((event) => event.startTime));
  const regionEndTime = Math.max(...regionEvents.map((event) => event.startTime + event.duration));
  const regionDuration = regionEndTime - regionStartTime;
  if (!(regionDuration > 0)) return null;
  return {startMeasure, endMeasure, regionStartTime, regionDuration};
}

export function getPlaybackEventPosition(
  eventCount: number,
  currentEventPosition: number,
  progressPercent: number,
): number {
  if (eventCount <= 0) return -1;
  if (currentEventPosition >= 0) return clamp(currentEventPosition, 0, eventCount - 1);
  return clamp(Math.floor((progressPercent / 100) * eventCount), 0, eventCount - 1);
}

export function estimateScorePageIndex(scorePageCount: number, totalBeats: number, currentBeat: number): number {
  if (scorePageCount <= 0) return -1;
  if (totalBeats <= 0 || currentBeat < 0) return 0;
  return clamp(Math.floor((clamp(currentBeat, 0, totalBeats) / totalBeats) * scorePageCount), 0, scorePageCount - 1);
}

export function estimateScorePageProgress(
  scorePageCount: number,
  totalBeats: number,
  currentBeat: number,
  pageIndex: number,
): number {
  if (scorePageCount <= 0 || totalBeats <= 0 || currentBeat < 0 || pageIndex < 0) return 0;

  const beatsPerPage = totalBeats / scorePageCount;
  const pageStart = pageIndex * beatsPerPage;
  const raw = ((clamp(currentBeat, 0, totalBeats) - pageStart) / Math.max(beatsPerPage, 1)) * 100;
  return clamp(raw, 0, 100);
}

export function getActiveVisualBand(
  bands: readonly PieceVisualStaffBand[] | undefined,
  currentBeat: number,
): PieceVisualStaffBand | null {
  if (!bands || bands.length === 0 || !Number.isFinite(currentBeat)) return null;

  return (
    bands.find((band) => currentBeat >= band.startBeat && currentBeat < band.endBeat) ??
    bands.find((band) => currentBeat <= band.endBeat) ??
    bands[bands.length - 1] ??
    null
  );
}

export function formatCatalogSegment(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export function getCatalogEntryDisplay(entry: SymbTrCatalogEntry): string {
  return [
    formatCatalogSegment(entry.makam),
    formatCatalogSegment(entry.form),
    formatCatalogSegment(entry.usul),
    formatCatalogSegment(entry.title),
    formatCatalogSegment(entry.composer),
  ].join(" · ");
}

export function getMelodicGainScale(layers: PieceLayer[]): number {
  const totalGain = layers.reduce((total, layer) => total + layer.gain, 0);
  if (totalGain <= MELODIC_MIX_GAIN_CEILING) return 1;
  return MELODIC_MIX_GAIN_CEILING / totalGain;
}

export function assertParseableSymbtrScore(raw: string, bpm: number): void {
  if (parseSymbtrScore(raw, bpm).length === 0) {
    throw new Error("SymbTr skoru okunamadı: nota olayı bulunamadı.");
  }
}

export function getSectionAt(events: PieceScoreEvent[], elapsedSeconds: number): string {
  let section = events.find((event) => event.section)?.section ?? "1. HANE";

  for (const event of events) {
    if (event.startTime > elapsedSeconds) break;
    if (event.section) section = event.section;
  }

  return section;
}

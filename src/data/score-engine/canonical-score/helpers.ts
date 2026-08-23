import type {InstrumentType} from "@/engines/ses/engine";
import type {PieceScoreEvent} from "@/data/pieces/hicazkarPesrev";
import type {
  CanonicalMeasure,
  CanonicalScoreDocument,
  CanonicalScoreEvent,
  CanonicalScheduledNote,
} from "./types";

export function formatMeasureId(scoreId: string, measureIndex: number): string {
  return `${scoreId}:m${measureIndex}`;
}


/**
 * Event'in olcu numarasi. Parser gercek SymbTr `Offset` sutunundan uretir;
 * olcum (SymbTr-3.0, 146.472 event) hicbir event'in `measureIndex`inin null
 * OLMADIGINI gosterdi — asagidaki 4/4 varsayimi yalniz savunma amaclidir ve
 * pratikte hic tetiklenmez. Yine de riskli oldugu icin TEK YERDE tutulur:
 * eskiden `importer.ts`te birebir kopyasi vardi ve olculeri 10/8, 28/4, 32/4
 * olan bir projede sessizce 4 vurusta bir bolerdi (D15).
 */
export function getMeasureIndex(event: PieceScoreEvent): number {
  return event.measureIndex ?? Math.max(1, Math.floor(event.startBeat / 4) + 1);
}


export function getActiveCanonicalEvent(
  document: CanonicalScoreDocument,
  elapsedSeconds: number,
): CanonicalScoreEvent | null {
  return (
    document.events.find(
      (event) => elapsedSeconds >= event.startTime && elapsedSeconds < event.startTime + event.duration,
    ) ??
    null
  );
}


export function getCanonicalMeasure(
  document: CanonicalScoreDocument,
  measureId: string | null | undefined,
): CanonicalMeasure | null {
  if (!measureId) return null;
  return document.measures.find((measure) => measure.id === measureId) ?? null;
}


export function getCanonicalScheduledNotes(
  document: CanonicalScoreDocument,
  instrument: InstrumentType = "ud",
): CanonicalScheduledNote[] {
  return document.events
    .filter((event) => !event.isRest && event.pitch.midiNumber !== null)
    .map((event) => ({
      noteId: event.id,
      measureId: event.measureId,
      midiNumber: event.pitch.midiNumber!,
      targetFrequency: event.pitch.frequency ?? undefined,
      startTime: event.startTime,
      duration: Math.max(event.duration * 0.92, 0.05),
      gain: 0.24,
      instrument,
    }));
}


export function getCanonicalPlaybackSchedule(
  document: CanonicalScoreDocument,
  instrument: InstrumentType = "ud",
): CanonicalScheduledNote[] {
  return getCanonicalScheduledNotes(document, instrument);
}

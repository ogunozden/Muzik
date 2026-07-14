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
  method: "approximate-staff-percent" | "manual-percent" | "note-anchor-percent";
  verifiedAt: string;
  notes: string;
  staffBands: readonly PieceVisualStaffBand[];
}

export interface VisualMeasureEvent {
  startBeat: number;
  durationBeats: number;
  measureIndex: number | null;
}

const DEFAULT_VISUAL_STAFF_ROWS = [
  {name: "üst satır", leftPercent: 6, widthPercent: 88, topPercent: 15, heightPercent: 14},
  {name: "orta satır", leftPercent: 6, widthPercent: 88, topPercent: 32, heightPercent: 14},
  {name: "alt satır", leftPercent: 6, widthPercent: 88, topPercent: 49, heightPercent: 14},
] as const;
const DEFAULT_VISUAL_NOTE_AREA_LEFT_INSET_RATIO = 0.14;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function projectBeatToVisualXPercent(band: PieceVisualStaffBand, currentBeat: number): number {
  const beatSpan = Math.max(band.endBeat - band.startBeat, 1);
  const progressRatio = Math.min(1, Math.max(0, (currentBeat - band.startBeat) / beatSpan));
  const noteAreaProgress =
    DEFAULT_VISUAL_NOTE_AREA_LEFT_INSET_RATIO +
    progressRatio * (1 - DEFAULT_VISUAL_NOTE_AREA_LEFT_INSET_RATIO);

  return clampPercent(band.leftPercent + band.widthPercent * noteAreaProgress);
}

export function isExactVisualMap(map: PieceVisualMap | undefined): boolean {
  return map?.method === "note-anchor-percent";
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
    method: "approximate-staff-percent",
    verifiedAt: options.verifiedAt ?? "local-upload",
    notes: options.notes ?? "Görsel sayfa satırları yüzde tabanlı yaklaşık bantlarla eşlenir; nota başı doğrulanmış değildir.",
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
  const xPercent = projectBeatToVisualXPercent(band, currentBeat);
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

export function getSymbtrMeasureRanges(events: readonly VisualMeasureEvent[]): PieceMeasureRange[] {
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
  events: readonly VisualMeasureEvent[],
  bands: readonly PieceVisualStaffBand[],
): PieceVisualMeasureSegment[] {
  if (events.length === 0 || bands.length === 0) return [];

  return getSymbtrMeasureRanges(events).flatMap((range) =>
    bands.flatMap((band) => {
      const visibleStartBeat = Math.max(range.startBeat, band.startBeat);
      const visibleEndBeat = Math.min(range.endBeat, band.endBeat);
      if (visibleEndBeat <= visibleStartBeat) return [];

      const leftPercent = projectBeatToVisualXPercent(band, visibleStartBeat);
      const rightPercent = projectBeatToVisualXPercent(band, visibleEndBeat);

      return {
        id: `m${range.measureIndex}-${band.id}`,
        pageIndex: band.pageIndex,
        bandId: band.id,
        measureIndex: range.measureIndex,
        startBeat: visibleStartBeat,
        endBeat: visibleEndBeat,
        leftPercent,
        widthPercent: clampPercent(rightPercent - leftPercent),
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

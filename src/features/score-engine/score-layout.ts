import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";

export interface ScoreRenderSystem {
  id: string;
  measureId: string;
  measureIndex: number;
  segmentIndex: number;
  segmentCount: number;
  eventIds: string[];
  startBeat: number;
  endBeat: number;
}

export interface ScoreRenderSystemOptions {
  maxEventsPerSystem?: number;
  maxQuarterBeatsPerSystem?: number;
}

const DEFAULT_MAX_EVENTS_PER_SYSTEM = 24;
const DEFAULT_MAX_QUARTER_BEATS_PER_SYSTEM = 7;

function getPositiveOption(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function getEventEndBeat(event: CanonicalScoreEvent): number {
  return event.startBeat + Math.max(event.durationBeats, 0);
}

function toRenderSystemGroup(
  measureId: string,
  measureIndex: number,
  segmentIndex: number,
  segmentCount: number,
  events: readonly CanonicalScoreEvent[],
  fallbackStartBeat: number,
  fallbackEndBeat: number,
): ScoreRenderSystem {
  const startBeat = events.length > 0 ? Math.min(...events.map((event) => event.startBeat)) : fallbackStartBeat;
  const endBeat = events.length > 0 ? Math.max(...events.map(getEventEndBeat)) : fallbackEndBeat;

  return {
    id: `${measureId}:system:${segmentIndex + 1}`,
    measureId,
    measureIndex,
    segmentIndex,
    segmentCount,
    eventIds: events.map((event) => event.id),
    startBeat,
    endBeat: Math.max(startBeat + 0.25, endBeat),
  };
}

export function buildScoreRenderSystems(
  document: CanonicalScoreDocument,
  options: ScoreRenderSystemOptions = {},
): ScoreRenderSystem[] {
  const maxEventsPerSystem = getPositiveOption(options.maxEventsPerSystem, DEFAULT_MAX_EVENTS_PER_SYSTEM);
  const maxQuarterBeatsPerSystem = getPositiveOption(
    options.maxQuarterBeatsPerSystem,
    DEFAULT_MAX_QUARTER_BEATS_PER_SYSTEM,
  );
  const eventsById = new Map(document.events.map((event) => [event.id, event]));
  const systems: ScoreRenderSystem[] = [];

  for (const measure of document.measures) {
    const measureEvents = measure.eventIds
      .map((eventId) => eventsById.get(eventId))
      .filter((event): event is CanonicalScoreEvent => Boolean(event))
      .sort((left, right) => left.startBeat - right.startBeat || left.sourceEventIndex - right.sourceEventIndex);

    if (measureEvents.length === 0) {
      systems.push(
        toRenderSystemGroup(measure.id, measure.index, 0, 1, [], measure.startBeat, measure.endBeat),
      );
      continue;
    }

    const groups: CanonicalScoreEvent[][] = [];
    let currentGroup: CanonicalScoreEvent[] = [];
    let currentGroupStartBeat = measureEvents[0]?.startBeat ?? measure.startBeat;

    for (const event of measureEvents) {
      const currentSpan = getEventEndBeat(event) - currentGroupStartBeat;
      const exceedsBeatSpan = currentGroup.length > 0 && currentSpan > maxQuarterBeatsPerSystem;
      const exceedsEventCount = currentGroup.length >= maxEventsPerSystem;

      if (exceedsBeatSpan || exceedsEventCount) {
        groups.push(currentGroup);
        currentGroup = [];
        currentGroupStartBeat = event.startBeat;
      }

      currentGroup.push(event);
    }

    if (currentGroup.length > 0) groups.push(currentGroup);

    const segmentCount = Math.max(1, groups.length);
    groups.forEach((group, segmentIndex) => {
      systems.push(
        toRenderSystemGroup(
          measure.id,
          measure.index,
          segmentIndex,
          segmentCount,
          group,
          measure.startBeat,
          measure.endBeat,
        ),
      );
    });
  }

  return systems;
}

export function findRenderSystemForEvent(
  systems: readonly ScoreRenderSystem[],
  eventId: string | null | undefined,
): ScoreRenderSystem | null {
  if (!eventId) return null;
  return systems.find((system) => system.eventIds.includes(eventId)) ?? null;
}

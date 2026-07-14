import type {CanonicalScoreDocument, ScoreCorrectionEvent} from "./canonical-score";
import {formatSolfegePitch, parsePitch} from "@/core/domain/note-naming";
import {validateCanonicalScore} from "./validator";

export interface CorrectionReducerResult {
  document: CanonicalScoreDocument;
  appliedEventIds: string[];
  rejectedEventIds: string[];
}

export function createScoreCorrectionEvent(
  input: Omit<ScoreCorrectionEvent, "id" | "createdAt" | "validatorState"> & {
    id?: string;
    createdAt?: string;
    validatorState?: ScoreCorrectionEvent["validatorState"];
  },
): ScoreCorrectionEvent {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    ...input,
    id: input.id ?? `score-correction:${input.documentId}:${createdAt}:${input.type}:${input.targetId}`,
    createdAt,
    validatorState: input.validatorState ?? "pending",
  };
}

function getPayloadString(payload: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getPayloadNumber(payload: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function simplifyFraction(numerator: number, denominator: number): {numerator: number; denominator: number} {
  const gcd = (left: number, right: number): number => (right === 0 ? Math.abs(left) : gcd(right, left % right));
  const divisor = gcd(Math.round(numerator), Math.round(denominator)) || 1;
  return {
    numerator: Math.round(numerator) / divisor,
    denominator: Math.round(denominator) / divisor,
  };
}

function durationBeatsToFraction(durationBeats: number): {numerator: number; denominator: number} {
  return simplifyFraction(Math.round(durationBeats * 16), 16);
}

function getPitchVexMetadata(sourcePitch: string): {vexKey: string | null; komaAccidental: string | null} {
  const parsed = parsePitch(sourcePitch);
  if (!parsed) return {vexKey: null, komaAccidental: null};
  const standardAccidental = parsed.accidental.startsWith("#") ? "#" : parsed.accidental.startsWith("b") ? "b" : "";
  return {
    vexKey: `${parsed.step.toLowerCase()}${standardAccidental}/${parsed.octave}`,
    komaAccidental: parsed.symbtrAccidental ? parsed.accidental : null,
  };
}

function recalculateMeasureBounds(document: CanonicalScoreDocument): void {
  const eventsById = new Map(document.events.map((event) => [event.id, event]));
  for (const measure of document.measures) {
    const measureEvents = measure.eventIds.map((eventId) => eventsById.get(eventId)).filter((event) => Boolean(event));
    if (measureEvents.length === 0) continue;
    measure.startBeat = Math.min(...measureEvents.map((event) => event!.startBeat));
    measure.endBeat = Math.max(...measureEvents.map((event) => event!.startBeat + event!.durationBeats));
  }
}

export function applyScoreCorrectionEvents(
  document: CanonicalScoreDocument,
  correctionEvents: readonly ScoreCorrectionEvent[],
): CorrectionReducerResult {
  const derivedDocument: CanonicalScoreDocument = structuredClone(document);
  const appliedEventIds: string[] = [];
  const rejectedEventIds: string[] = [];

  for (const event of correctionEvents) {
    if (event.documentId !== document.id) {
      rejectedEventIds.push(event.id);
      continue;
    }

    if (event.type === "pitch_changed") {
      const scoreEvent = derivedDocument.events.find((item) => item.id === event.targetId);
      const sourcePitch = getPayloadString(event.payload, ["sourcePitch", "pitchSource", "source"]);
      if (!scoreEvent || !sourcePitch) {
        rejectedEventIds.push(event.id);
        continue;
      }

      const metadata = getPitchVexMetadata(sourcePitch);
      scoreEvent.pitch.source = sourcePitch;
      scoreEvent.pitch.solfege = sourcePitch === "Es" ? "Es" : formatSolfegePitch(sourcePitch);
      scoreEvent.pitch.vexKey = metadata.vexKey;
      scoreEvent.pitch.komaAccidental = metadata.komaAccidental;
      scoreEvent.pitch.playback = getPayloadString(event.payload, ["playbackPitch", "playback"]) ?? scoreEvent.pitch.playback;
      scoreEvent.pitch.midiNumber = getPayloadNumber(event.payload, ["midiNumber"]) ?? scoreEvent.pitch.midiNumber;
      scoreEvent.pitch.koma53 = getPayloadNumber(event.payload, ["koma53"]) ?? scoreEvent.pitch.koma53;
      scoreEvent.pitch.frequency = getPayloadNumber(event.payload, ["frequency", "targetFrequency"]) ?? scoreEvent.pitch.frequency;
      scoreEvent.isRest = sourcePitch === "Es";
      scoreEvent.verificationState = "needs-review";
      appliedEventIds.push(event.id);
      continue;
    }

    if (event.type === "duration_changed") {
      const scoreEvent = derivedDocument.events.find((item) => item.id === event.targetId);
      const durationBeats = getPayloadNumber(event.payload, ["durationBeats", "beats"]);
      if (!scoreEvent || !durationBeats || durationBeats <= 0) {
        rejectedEventIds.push(event.id);
        continue;
      }

      scoreEvent.durationBeats = durationBeats;
      scoreEvent.durationFraction = durationBeatsToFraction(durationBeats);
      scoreEvent.duration = getPayloadNumber(event.payload, ["durationSeconds", "duration"]) ?? durationBeats * (60 / derivedDocument.bpm);
      scoreEvent.verificationState = "needs-review";
      recalculateMeasureBounds(derivedDocument);
      appliedEventIds.push(event.id);
      continue;
    }

    if (event.type === "measure_split") {
      const measure = derivedDocument.measures.find((item) => item.id === event.targetId);
      const splitBeat = getPayloadNumber(event.payload, ["splitBeat", "beat"]);
      if (!measure || !splitBeat || splitBeat <= measure.startBeat || splitBeat >= measure.endBeat) {
        rejectedEventIds.push(event.id);
        continue;
      }

      measure.verificationState = "needs-review";
      appliedEventIds.push(event.id);
      continue;
    }

    if (event.type === "source_anchor_added") {
      const bbox = event.payload.bboxPercent;
      const sourceId = getPayloadString(event.payload, ["sourceId"]) ?? derivedDocument.sources[0]?.id;
      if (
        !sourceId ||
        typeof bbox !== "object" ||
        bbox === null ||
        !["x", "y", "width", "height"].every((key) => Number.isFinite((bbox as Record<string, unknown>)[key]))
      ) {
        rejectedEventIds.push(event.id);
        continue;
      }

      const typedBox = bbox as {height: number; width: number; x: number; y: number};
      derivedDocument.sourceAnchors.push({
        id: `correction-anchor:${event.id}`,
        sourceId,
        pageIndex: getPayloadNumber(event.payload, ["pageIndex"]) ?? 0,
        staffId: getPayloadString(event.payload, ["staffId"]) ?? `${sourceId}:manual-staff`,
        measureId: getPayloadString(event.payload, ["measureId"]) ?? (event.targetId.startsWith(derivedDocument.id) ? event.targetId : null),
        eventId: getPayloadString(event.payload, ["eventId"]) ?? null,
        bboxPercent: {
          x: typedBox.x,
          y: typedBox.y,
          width: typedBox.width,
          height: typedBox.height,
        },
        fingerprint: getPayloadString(event.payload, ["fingerprint"]) ?? derivedDocument.sourceFingerprint,
        confidence: Math.max(0, Math.min(1, getPayloadNumber(event.payload, ["confidence"]) ?? 0.5)),
        status: "needs-review",
      });
      appliedEventIds.push(event.id);
      continue;
    }

    if (event.type === "verified") {
      const scoreEvent = derivedDocument.events.find((item) => item.id === event.targetId);
      const measure = derivedDocument.measures.find((item) => item.id === event.targetId);
      const anchor = derivedDocument.sourceAnchors.find((item) => item.id === event.targetId);
      if (scoreEvent) scoreEvent.verificationState = "verified";
      if (measure) measure.verificationState = "verified";
      if (anchor) anchor.status = "verified";
      appliedEventIds.push(event.id);
      continue;
    }

    if (event.type === "source_anchor_rejected") {
      const anchor = derivedDocument.sourceAnchors.find((item) => item.id === event.targetId);
      if (!anchor) {
        rejectedEventIds.push(event.id);
        continue;
      }
      anchor.status = "rejected";
      appliedEventIds.push(event.id);
      continue;
    }

    if (event.type === "rollback") {
      appliedEventIds.push(event.id);
      continue;
    }

    rejectedEventIds.push(event.id);
  }

  derivedDocument.validationIssues = validateCanonicalScore(derivedDocument);

  return {
    document: derivedDocument,
    appliedEventIds,
    rejectedEventIds,
  };
}

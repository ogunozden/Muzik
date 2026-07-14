import {parsePitch} from "@/core/domain/note-naming";
import type {CanonicalScoreEvent} from "./canonical-score";

export interface CanonicalVexPitch {
  accidental: "#" | "b" | null;
  key: string;
  komaAccidental: string | null;
}

export interface CanonicalVexDuration {
  dotted: boolean;
  duration: string;
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

export function mapDurationBeatsToVex(durationBeats: number, isRest: boolean): CanonicalVexDuration {
  const suffix = isRest ? "r" : "";

  if (durationBeats >= 4) return {duration: `w${suffix}`, dotted: false};
  if (durationBeats >= 3) return {duration: `h${suffix}`, dotted: true};
  if (durationBeats >= 2) return {duration: `h${suffix}`, dotted: false};
  if (durationBeats >= 1.5) return {duration: `q${suffix}`, dotted: true};
  if (durationBeats >= 1) return {duration: `q${suffix}`, dotted: false};
  if (durationBeats >= 0.75) return {duration: `8${suffix}`, dotted: true};
  if (durationBeats >= 0.5) return {duration: `8${suffix}`, dotted: false};
  return {duration: `16${suffix}`, dotted: false};
}

export function mapCanonicalEventToVex(event: CanonicalScoreEvent): CanonicalVexEvent {
  return {
    duration: mapDurationBeatsToVex(event.durationBeats, event.isRest),
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

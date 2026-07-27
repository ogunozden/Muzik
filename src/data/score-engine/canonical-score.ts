import type {InstrumentType, ScheduledNote} from "@/engines/ses/engine";
import type {PieceDefinition, PieceScoreEvent} from "@/data/pieces/hicazkarPesrev";
import {parsePitch} from "@/core/domain/note-naming";

export type ScoreSourceKind = "symbtr" | "musicxml" | "pdf-vector" | "raster-image" | "manual";
export type CanonicalVerificationState = "symbolic-confirmed" | "candidate" | "needs-review" | "verified";
export type CanonicalSourceAnchorStatus = "candidate" | "verified" | "rejected" | "needs-review";
export type CanonicalValidationSeverity = "info" | "warning" | "error";
export type ScoreCorrectionEventType =
  | "pitch_changed"
  | "duration_changed"
  | "measure_split"
  | "source_anchor_added"
  | "source_anchor_rejected"
  | "verified"
  | "rollback";

export interface ScoreConfidence {
  source: number;
  geometry: number;
  pitch: number;
  duration: number;
  musicology: number;
}

export interface ScoreSourceEvidence {
  id: string;
  kind: ScoreSourceKind;
  label: string;
  reference: string;
  confidence: ScoreConfidence;
}

export type CanonicalSourceFeatureKind =
  | "key-signature"
  | "meter"
  | "usul"
  | "metadata-row"
  | "section-marker"
  | "tie"
  | "unsupported-symbol";

export type CanonicalSourceFeatureStatus =
  | "source-proven"
  | "policy-derived"
  | "visual-evidence-only"
  | "unsupported"
  | "missing";

export type CanonicalSourceFeatureSource = "symbtr-txt" | "symbtr-musicxml" | "symbtr-mu2" | "manual";

export interface CanonicalSourceFeature {
  id: string;
  kind: CanonicalSourceFeatureKind;
  status: CanonicalSourceFeatureStatus;
  source: CanonicalSourceFeatureSource;
  label: string;
  value: string;
  evidence: string;
}

export interface CanonicalKeySignatureAccidental {
  accidental: string;
  source: "musicxml" | "mu2";
  step: string;
  value: string;
}

export interface CanonicalNotationPolicy {
  inlineAccidentals: {
    action: string;
    status: CanonicalSourceFeatureStatus;
  };
  keySignature: {
    action: string;
    accidentals: CanonicalKeySignatureAccidental[];
    evidence: string[];
    source: "musicxml" | "mu2" | "missing";
    status: CanonicalSourceFeatureStatus;
  };
  sourceAlignment: {
    detail: string;
    status: CanonicalSourceFeatureStatus;
  };
}

export interface CanonicalPitch {
  source: string;
  solfege: string | null;
  playback: string | null;
  midiNumber: number | null;
  koma53: number | null;
  frequency: number | null;
  vexKey: string | null;
  komaAccidental: string | null;
}

export interface CanonicalScoreEvent {
  id: string;
  eventId: string;
  sourceEventIndex: number;
  measureId: string;
  voiceId: string;
  section: string | null;
  pitch: CanonicalPitch;
  notationSymbol: string;
  startBeat: number;
  measureBeat: number;
  durationBeats: number;
  durationFraction: {
    numerator: number;
    denominator: number;
  };
  startTime: number;
  duration: number;
  isRest: boolean;
  ornament: string | null;
  tie: string | null;
  slur: string | null;
  evidenceId: string;
  verificationState: CanonicalVerificationState;
}

export interface CanonicalMeasure {
  id: string;
  index: number;
  startBeat: number;
  endBeat: number;
  eventIds: string[];
  verificationState: CanonicalVerificationState;
}

export interface CanonicalVoice {
  id: string;
  label: string;
  instrumentRole: "melody" | "percussion" | "analysis";
  eventIds: string[];
}

export interface CanonicalSection {
  id: string;
  label: string;
  eventIds: string[];
}

export interface CanonicalUsulHit {
  beat: number;
  syllable: string;
  symbol: string;
  isAccent: boolean;
  timeValue: number;
}

export interface CanonicalSourceAnchor {
  id: string;
  sourceId: string;
  pageIndex: number;
  staffId: string;
  measureId: string | null;
  eventId: string | null;
  bboxPercent: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fingerprint: string;
  confidence: number;
  status: CanonicalSourceAnchorStatus;
}

export interface CanonicalValidationIssue {
  id: string;
  severity: CanonicalValidationSeverity;
  code: string;
  message: string;
  eventId?: string;
  measureId?: string;
}

export interface ScoreCorrectionEvent {
  id: string;
  documentId: string;
  type: ScoreCorrectionEventType;
  targetId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  authorId: string | null;
  validatorState: "pending" | "passed" | "failed";
}

export interface CanonicalScoreDocument {
  schemaVersion: "score-engine-v2";
  id: string;
  catalogId: string | null;
  sourceFingerprint: string;
  sourceKind: ScoreSourceKind;
  title: string;
  composer: string;
  makam: string;
  form: string;
  usul: string;
  meter: string;
  bpm: number;
  ahenkLabel: string | null;
  totalBeats: number;
  totalDuration: number;
  sources: ScoreSourceEvidence[];
  sourceFeatures: CanonicalSourceFeature[];
  notationPolicy: CanonicalNotationPolicy;
  sections: CanonicalSection[];
  voices: CanonicalVoice[];
  measures: CanonicalMeasure[];
  events: CanonicalScoreEvent[];
  usulCycle: CanonicalUsulHit[];
  sourceAnchors: CanonicalSourceAnchor[];
  validationIssues: CanonicalValidationIssue[];
}

export type CanonicalScheduledNote = ScheduledNote & {
  noteId: string;
  measureId: string;
};

const SYMBOLIC_CONFIDENCE: ScoreConfidence = {
  source: 0.98,
  geometry: 0,
  pitch: 0.96,
  duration: 0.96,
  musicology: 0.9,
};

export function formatMeasureId(scoreId: string, measureIndex: number): string {
  return `${scoreId}:m${measureIndex}`;
}

function formatNoteId(scoreId: string, measureIndex: number, eventIndex: number): string {
  return `${formatMeasureId(scoreId, measureIndex)}:n${eventIndex}`;
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

function simplifyFraction(numerator: number, denominator: number): {numerator: number; denominator: number} {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return {numerator: 0, denominator: 1};
  }
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

function parseKeyFeature(value: string, source: "musicxml" | "mu2"): CanonicalKeySignatureAccidental | null {
  const [step, accidental] = value.split(":");
  if (!step || !accidental) return null;
  return {
    accidental,
    source,
    step,
    value,
  };
}

function buildNotationPolicy(sourceFeatures: readonly CanonicalSourceFeature[]): CanonicalNotationPolicy {
  const musicXmlKeyAccidentals = sourceFeatures
    .filter((feature) => feature.kind === "key-signature" && feature.source === "symbtr-musicxml")
    .map((feature) => parseKeyFeature(feature.value, "musicxml"))
    .filter((feature): feature is CanonicalKeySignatureAccidental => Boolean(feature));
  const mu2KeyAccidentals = sourceFeatures
    .filter((feature) => feature.kind === "key-signature" && feature.source === "symbtr-mu2")
    .map((feature) => parseKeyFeature(feature.value, "mu2"))
    .filter((feature): feature is CanonicalKeySignatureAccidental => Boolean(feature));
  const accidentals = musicXmlKeyAccidentals.length > 0 ? musicXmlKeyAccidentals : mu2KeyAccidentals;

  return {
    inlineAccidentals: {
      action:
        "Inline accidentals stay event-level only; key/makam context must come from sourceFeatures before visual fidelity is claimed.",
      status: "policy-derived",
    },
    keySignature: {
      action:
        accidentals.length > 0
          ? "Render key/makam accidentals as source context, not as repeated note labels."
          : "Do not claim key-signature fidelity until MusicXML or mu2 key features are attached.",
      accidentals,
      evidence:
        accidentals.length > 0
          ? sourceFeatures
              .filter((feature) => feature.kind === "key-signature")
              .map((feature) => feature.evidence)
          : ["No MusicXML/mu2 key signature feature attached."],
      source:
        musicXmlKeyAccidentals.length > 0
          ? "musicxml"
          : mu2KeyAccidentals.length > 0
            ? "mu2"
            : "missing",
      status: accidentals.length > 0 ? "source-proven" : "missing",
    },
    sourceAlignment: {
      detail:
        "Canonical event order is symbolic; printed page/system alignment still requires PDF/image anchors and is not proven by playback.",
      status: "visual-evidence-only",
    },
  };
}

function toVexPitchMetadata(sourcePitch: string): {vexKey: string | null; komaAccidental: string | null} {
  const parsed = parsePitch(sourcePitch);
  if (!parsed) return {vexKey: null, komaAccidental: null};
  const standardAccidental = parsed.accidental.startsWith("#") ? "#" : parsed.accidental.startsWith("b") ? "b" : "";
  return {
    vexKey: `${parsed.step.toLowerCase()}${standardAccidental}/${parsed.octave}`,
    komaAccidental: parsed.symbtrAccidental ? parsed.accidental : null,
  };
}

function buildSections(scoreId: string, events: readonly CanonicalScoreEvent[]): CanonicalSection[] {
  const sectionMap = new Map<string, CanonicalSection>();
  for (const event of events) {
    const label = event.section ?? "Ana bolum";
    const id = `${scoreId}:section:${label.toLowerCase().replace(/[^a-z0-9ğüşöçıİ-]+/gi, "-")}`;
    const existing = sectionMap.get(id);
    if (existing) {
      existing.eventIds.push(event.id);
      continue;
    }
    sectionMap.set(id, {id, label, eventIds: [event.id]});
  }
  return Array.from(sectionMap.values());
}

/**
 * Bir parcanin gorsel harita (visualMap) tabanli source anchor'larini uretir.
 * Saftir; 32MB SymbTr PDF layout verisini OKUMAZ, bu yuzden client-safe kalir.
 *
 * PDF layout tabanli anchor'lar (verified/candidate olcu kutulari) server
 * tarafinda `SourceAnchorBuilder` callback'i ile enjekte edilir; boylece
 * `canonical-score.ts` `@/data/symbtr/layout` (server-only) importundan azade
 * kalir (ADR 0001, F2).
 */
export function buildVisualMapAnchors(
  piece: PieceDefinition,
  sourceId: string,
  sourceFingerprint: string,
): CanonicalSourceAnchor[] {
  return (
    piece.visualMap?.staffBands.map((band, index) => ({
      id: `${sourceId}:anchor:p${band.pageIndex}:s${index + 1}`,
      sourceId,
      pageIndex: band.pageIndex,
      staffId: `${sourceId}:p${band.pageIndex}:staff:${band.id}`,
      measureId: null,
      eventId: null,
      bboxPercent: {
        x: band.leftPercent,
        y: band.topPercent,
        width: band.widthPercent,
        height: band.heightPercent,
      },
      fingerprint: sourceFingerprint,
      confidence: piece.visualMap?.method === "note-anchor-percent" ? 0.9 : 0.42,
      status: "candidate" as const,
    })) ?? []
  );
}

export interface SourceAnchorBuildContext {
  piece: PieceDefinition;
  scoreId: string;
  sourceId: string;
  sourceFingerprint: string;
}

/**
 * PDF/gorsel layout tabanli ek source anchor uretici. Server tarafi (importer,
 * API) layout okuyan uygulamayi enjekte eder; client (demo) enjekte etmez.
 */
export type SourceAnchorBuilder = (context: SourceAnchorBuildContext) => CanonicalSourceAnchor[];

/**
 * Bar cizgisini ASAN notalari parcalara boler (L1).
 *
 * SymbTr `Offset` sutunu kumulatif OLCU konumudur; tam sayilar bar
 * cizgileridir. Bir nota `startOffsetUnits` ile `offsetUnits` arasinda bir tam
 * sayi iceriyorsa bar cizgisini asiyordur ve gravurde IKI YANA bolunup bagla
 * yazilmalidir.
 *
 * Eskiden `measureIndex = ceil(offsetUnits)` notayi tamamen BITTIGI olcuye
 * yaziyordu: onceki olcu eksik, sonraki fazla kaliyordu. Olcum (14.905 olcu):
 * yalnizca %66,28'i nominal uzunluktaydi ve sapmanin %32,08'i ORTADAKI
 * olculerdeydi (ilk %0,23, son %1,41) — yani eksik-olcu/bitis degil,
 * sistematik. Ornek: acem--ilahi--duyek, nominal 4 vurus, olculer 4,5 / 3,5
 * diye gidiyordu; satir 155 (C5, 1/4) 17,875 -> 18,125 araligindaydi.
 *
 * Parcalar `tie: "barline-split"` ile isaretlenir: cizimde bagla baglanir,
 * calmada TEK nota olarak birlestirilir (yeniden tetiklenmez).
 */
export function buildCanonicalScoreFromSymbtrEvents(
  piece: PieceDefinition,
  events: readonly PieceScoreEvent[],
  options: {
    scoreId?: string;
    sourceFingerprint?: string;
    sourceFeatures?: readonly CanonicalSourceFeature[];
    sourceReference?: string;
    maxEvents?: number;
    buildExtraSourceAnchors?: SourceAnchorBuilder;
  } = {},
): CanonicalScoreDocument {
  const scoreId = options.scoreId ?? `score:${piece.id}`;
  const selectedEvents = options.maxEvents ? events.slice(0, options.maxEvents) : [...events];
  const sourceFingerprint = options.sourceFingerprint ?? `${piece.id}:${selectedEvents.length}:unfingerprinted`;
  const measureStartByIndex = new Map<number, number>();
  for (const event of selectedEvents) {
    const measureIndex = getMeasureIndex(event);
    const currentStart = measureStartByIndex.get(measureIndex);
    measureStartByIndex.set(
      measureIndex,
      currentStart === undefined ? event.startBeat : Math.min(currentStart, event.startBeat),
    );
  }
  const evidence: ScoreSourceEvidence = {
    id: `${scoreId}:source:symbtr`,
    kind: "symbtr",
    label: "SymbTr symbolic source",
    reference: options.sourceReference ?? piece.symbtrCatalogId ?? piece.symbtrRawUrl,
    confidence: SYMBOLIC_CONFIDENCE,
  };
  const voiceId = `${scoreId}:voice:melody`;

  const canonicalEvents = selectedEvents.map((event) => {
    const measureIndex = getMeasureIndex(event);
    const measureId = formatMeasureId(scoreId, measureIndex);
    const noteId = formatNoteId(scoreId, measureIndex, event.index);
    const pitchMetadata = toVexPitchMetadata(event.sourcePitch);
    const measureStartBeat = measureStartByIndex.get(measureIndex) ?? event.startBeat;

    return {
      id: noteId,
      eventId: noteId,
      sourceEventIndex: event.index,
      measureId,
      voiceId,
      section: event.section,
      pitch: {
        source: event.sourcePitch,
        solfege: event.solfegePitch,
        playback: event.playbackPitch,
        midiNumber: event.midiNumber,
        koma53: event.koma53,
        frequency: event.targetFrequency,
        vexKey: pitchMetadata.vexKey,
        komaAccidental: pitchMetadata.komaAccidental,
      },
      notationSymbol: event.notationSymbol,
      startBeat: event.startBeat,
      measureBeat: Math.max(0, event.startBeat - measureStartBeat),
      durationBeats: event.durationBeats,
      durationFraction: event.durationFraction ?? durationBeatsToFraction(event.durationBeats),
      startTime: event.startTime,
      duration: event.duration,
      isRest: event.isRest,
      ornament: null,
      // Bar cizgisi bolmesinden gelen bag (G7). Kaynakta yazili baglar
      // `sourceFeatures` uzerinden ayrica tasiniyor; bu alan GRAVUR icin
      // bolunmus parcalari birlestirir.
      tie: event.barlineTie,
      slur: null,
      evidenceId: evidence.id,
      verificationState: "symbolic-confirmed" as const,
    };
  });

  const measureMap = new Map<number, CanonicalMeasure>();
  for (const event of canonicalEvents) {
    const measureIndex = Number(event.measureId.match(/:m(\d+)$/)?.[1] ?? 1);
    const existing = measureMap.get(measureIndex);
    const endBeat = event.startBeat + event.durationBeats;

    if (!existing) {
      measureMap.set(measureIndex, {
        id: event.measureId,
        index: measureIndex,
        startBeat: event.startBeat,
        endBeat,
        eventIds: [event.id],
        verificationState: "symbolic-confirmed",
      });
      continue;
    }

    existing.startBeat = Math.min(existing.startBeat, event.startBeat);
    existing.endBeat = Math.max(existing.endBeat, endBeat);
    existing.eventIds.push(event.id);
  }

  const totalBeats = canonicalEvents.reduce(
    (max, event) => Math.max(max, event.startBeat + event.durationBeats),
    0,
  );
  const totalDuration = canonicalEvents.reduce(
    (max, event) => Math.max(max, event.startTime + event.duration),
    0,
  );
  const sourceFeatures = [...(options.sourceFeatures ?? [])];

  return {
    schemaVersion: "score-engine-v2",
    id: scoreId,
    catalogId: piece.symbtrCatalogId ?? null,
    sourceFingerprint,
    sourceKind: "symbtr",
    title: piece.displayTitle,
    composer: piece.composer,
    makam: piece.makam,
    form: piece.form,
    usul: piece.usul,
    meter: piece.meter,
    bpm: piece.bpm,
    ahenkLabel: piece.playbackAhenk?.label ?? null,
    totalBeats,
    totalDuration,
    sources: [evidence],
    sourceFeatures,
    notationPolicy: buildNotationPolicy(sourceFeatures),
    sections: buildSections(scoreId, canonicalEvents),
    voices: [
      {
        id: voiceId,
        label: "Melodi",
        instrumentRole: "melody",
        eventIds: canonicalEvents.map((event) => event.id),
      },
    ],
    measures: Array.from(measureMap.values()).sort((left, right) => left.index - right.index),
    events: canonicalEvents,
    usulCycle:
      piece.usulHits?.map((hit) => ({
        beat: hit.beat,
        syllable: hit.syllable,
        symbol: hit.symbol,
        isAccent: hit.isAccent,
        timeValue: hit.timeValue,
      })) ?? [],
    sourceAnchors: [
      ...buildVisualMapAnchors(piece, evidence.id, sourceFingerprint),
      ...(options.buildExtraSourceAnchors?.({
        piece,
        scoreId,
        sourceId: evidence.id,
        sourceFingerprint,
      }) ?? []),
    ],
    validationIssues: [],
  };
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

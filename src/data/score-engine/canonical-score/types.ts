import type {InstrumentType, ScheduledNote} from "@/engines/ses/engine";
import type {PieceDefinition} from "@/data/pieces/hicazkarPesrev";

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


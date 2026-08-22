export type CurationAction = "curation-feedback" | "curation-manual-correction";
export type FeedbackEventType = "user-approved" | "user-prioritized" | "user-removed" | "delete-requested" | "deleted" | "restored";
export type DetailView = "scores" | "videos" | "archive" | "metadata" | "log" | "manual";

export interface CatalogMetadata {
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
}

export interface ExternalReferenceSource {
  id?: string;
  label?: string;
  provider?: string;
  url?: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  access?: string;
  verification?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface CurationReference {
  catalogId?: string;
  sourceId?: string;
  catalog?: CatalogMetadata | null;
  source?: ExternalReferenceSource | null;
  status?: string;
  rank?: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  matchReasons?: string[];
  conflicts?: string[];
  attachedAt?: string;
  feedbackEvents?: SourceFeedbackEvent[];
  manualCorrection?: ManualCorrection | null;
  embedState?: {
    embedType?: string;
    canEmbed?: boolean;
    lastFailureReason?: string;
    fallbackUrl?: string;
  } | null;
}

export interface SourceFeedbackEvent {
  eventId?: string;
  catalogId?: string;
  sourceId?: string;
  eventType?: string;
  reason?: string;
  note?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface ManualCorrection {
  catalogId?: string;
  sourceId?: string;
  correctTitle?: string;
  correctMakam?: string;
  correctUsul?: string;
  correctForm?: string;
  correctComposer?: string;
  correctLyricist?: string;
  alternativeUrl?: string;
  tags?: string[];
  notes?: string;
  updatedAt?: string;
}

export interface ExternalReferenceState {
  curation?: {
    autoAttachedReferences?: CurationReference[];
    feedbackEvents?: SourceFeedbackEvent[];
    manualCorrections?: ManualCorrection[];
  };
}

export interface CorrectionFormState {
  correctTitle: string;
  correctMakam: string;
  correctUsul: string;
  correctForm: string;
  correctComposer: string;
  correctLyricist: string;
  alternativeUrl: string;
  tags: string;
  notes: string;
}

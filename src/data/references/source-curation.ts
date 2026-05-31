export const AUTO_ATTACHED_REFERENCE_STATUSES = [
  "auto-attached",
  "user-approved",
  "user-prioritized",
  "user-demoted",
  "user-removed",
  "delete-requested",
  "deleted",
  "user-corrected",
  "manual-entry",
] as const;

export const SOURCE_FEEDBACK_EVENT_TYPES = [
  "user-approved",
  "user-prioritized",
  "user-demoted",
  "user-removed",
  "delete-requested",
  "deleted",
  "restored",
  "user-corrected",
  "manual-entry",
] as const;

export const EMBED_CAPABILITIES = ["none", "iframe", "pdf", "youtube"] as const;
export const EMBED_TYPES = ["none", "iframe", "pdf", "youtube"] as const;
export const METADATA_STRATEGIES = ["none", "html-title", "og-title", "oembed", "site-specific"] as const;
export const CURATION_CONFIDENCE_LEVELS = ["high", "medium", "low", "conflict"] as const;

export type AutoAttachedReferenceStatus = (typeof AUTO_ATTACHED_REFERENCE_STATUSES)[number];
export type SourceFeedbackEventType = (typeof SOURCE_FEEDBACK_EVENT_TYPES)[number];
export type EmbedCapability = (typeof EMBED_CAPABILITIES)[number];
export type EmbedType = (typeof EMBED_TYPES)[number];
export type MetadataStrategy = (typeof METADATA_STRATEGIES)[number];
export type CurationConfidenceLevel = (typeof CURATION_CONFIDENCE_LEVELS)[number];

export interface AutoAttachedReference {
  catalogId: string;
  sourceId: string;
  profileId: string;
  status: AutoAttachedReferenceStatus;
  rank: number;
  confidenceScore: number;
  confidenceLevel: CurationConfidenceLevel;
  matchReasons: string[];
  conflicts: string[];
  attachedAt: string;
  matcherVersion: string;
}

export interface AutoAttachedReferenceRegistry {
  version: 1;
  matcherVersion: string;
  references: AutoAttachedReference[];
}

export interface SourceFeedbackEvent {
  eventId: string;
  catalogId: string;
  sourceId: string;
  eventType: SourceFeedbackEventType;
  reason?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
  previousValue?: unknown;
  nextValue?: unknown;
}

export interface SourceFeedbackEventRegistry {
  version: 1;
  events: SourceFeedbackEvent[];
}

export interface ManualSourceCorrection {
  catalogId: string;
  sourceId: string;
  correctTitle?: string;
  correctMakam?: string;
  correctUsul?: string;
  correctForm?: string;
  correctComposer?: string;
  correctLyricist?: string;
  alternativeUrl?: string;
  tags?: string[];
  notes?: string;
  updatedAt: string;
}

export interface ManualSourceCorrectionRegistry {
  version: 1;
  corrections: ManualSourceCorrection[];
}

export interface ResearchSourceProfile {
  id: string;
  label: string;
  baseUrl: string;
  searchUrlTemplate: string;
  provider: "score" | "symbtr" | "youtube" | "archive" | "github";
  trustWeight: number;
  embedCapability: EmbedCapability;
  metadataStrategy: MetadataStrategy;
  enabled: boolean;
}

export interface ResearchSourceProfileRegistry {
  version: 1;
  profiles: ResearchSourceProfile[];
}

export interface EmbedState {
  sourceId: string;
  embedType: EmbedType;
  canEmbed: boolean;
  lastCheckedAt?: string;
  lastFailureReason?: string;
  fallbackUrl?: string;
}

export interface EmbedStateRegistry {
  version: 1;
  states: EmbedState[];
}

export interface SourceQualityStat {
  profileId: string;
  acceptedCount: number;
  removedCount: number;
  deletedCount: number;
  correctedCount: number;
  mismatchCount: number;
  embedSuccessCount: number;
  embedFailureCount: number;
}

export interface SourceQualityStatsRegistry {
  version: 1;
  generatedAt: string | null;
  stats: SourceQualityStat[];
}

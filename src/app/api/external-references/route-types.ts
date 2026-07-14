import type {ExternalReferenceSource} from "./curation-state";
import type {CandidateReviewGroup} from "./curation-query";

/**
 * external-references route veri/manifest tipleri (M8.1 bolme). Runtime kodu
 * yok; route handler'lari bu modulu paylasir.
 */

export type ExternalReferenceAction =
  | "stage"
  | "map"
  | "sync"
  | "audit"
  | "candidate-export"
  | "candidate-import"
  | "candidate-review-export"
  | "candidate-review-group-export"
  | "candidate-review-group-decision-recommendation-export"
  | "candidate-review-group-decision-template-export"
  | "candidate-review-group-decision-import"
  | "curation-auto-attach"
  | "curation-stats"
  | "curation-validate"
  | "curation-feedback"
  | "curation-feedback-batch"
  | "source-terminal-feedback"
  | "curation-manual-correction"
  | "curation-embed-state";

export interface StageSourceBody {
  url?: string;
  title?: string;
  provider?: string;
  sourceProvider?: string;
  checkedAt?: string;
  catalogId?: string;
  observedTitle?: string;
  makam?: string;
  form?: string;
  usul?: string;
  composer?: string;
  lyricist?: string;
  lyrics?: string;
}

export interface OperationBody {
  action?: ExternalReferenceAction;
  source?: StageSourceBody;
  bulkText?: string;
  dryRun?: boolean;
  candidateManifest?: unknown;
  candidateManifestText?: string;
  candidateReviewGroupDecisionManifest?: unknown;
  candidateReviewGroupDecisionManifestText?: string;
  candidateReviewQuery?: {
    query?: string;
    status?: string;
    profileId?: string;
    provider?: string;
    composer?: string;
  };
  candidateReviewGroupQuery?: {
    query?: string;
    status?: string;
    composer?: string;
    priorityGroup?: string;
  };
  candidateReviewGroupDecisionTemplate?: {
    status?: string;
    reason?: string;
    reviewedAt?: string;
    reviewedBy?: string;
  };
  feedback?: unknown;
  feedbackEvents?: unknown;
  sourceTerminalFeedback?: unknown;
  manualCorrection?: unknown;
  embedState?: unknown;
}

export interface SourceTerminalDecisionManifest {
  generatedAt?: string;
  summary?: {
    terminalDecisionGroupCount?: number;
    statusCounts?: Record<string, number>;
    directAutoAttachCount?: number;
    mediaDownloadCount?: number;
  };
  entries?: Array<{
    catalogId?: string;
    status?: string;
    reason?: string;
    providerResultCount?: number;
    importValidationRequired?: boolean;
    sourceUrl?: string | null;
  }>;
}

export interface SourceTerminalFeedbackEvent {
  eventId?: string;
  catalogId?: string;
  eventType?: string;
  reason?: string;
  note?: string;
  alternateUrl?: string;
  previousEventId?: string;
  previousValue?: unknown;
  createdAt?: string;
  createdBy?: string;
  weakLabel?: boolean;
  labelPolicy?: string;
}

export interface SourceTerminalFeedbackSummary {
  eventCount?: number;
  activeEventCount?: number;
  rolledBackEventCount?: number;
  eventTypeCounts?: Record<string, number>;
}

export interface SourceTerminalFeedbackManifest {
  version?: number;
  type?: string;
  events?: SourceTerminalFeedbackEvent[];
  summary?: SourceTerminalFeedbackSummary;
}

export interface CandidateReviewGroupDecisionManifest {
  version?: number;
  decisions?: Array<{
    groupId?: string;
    catalogId?: string;
    status?: string;
    reason?: string;
    reviewedAt?: string;
    reviewedBy?: string;
  }>;
}

export interface CandidateReviewGroupDecisionRecommendation extends CandidateReviewGroup {
  reason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  recommendationRule?: string;
  sourceGroupStatus?: string;
}

export interface CandidateReviewGroupDecisionRecommendationManifest {
  version?: number;
  type?: string;
  policyVersion?: string;
  generatedAt?: string;
  summary?: Record<string, unknown>;
  decisions?: CandidateReviewGroupDecisionRecommendation[];
}

export interface CandidateReviewBatchPlanManifest {
  version?: number;
  type?: string;
  policyVersion?: string;
  generatedAt?: string;
  summary?: {
    packetCount?: number;
    plannedGroupCount?: number;
    plannedCandidateCount?: number;
    packetSize?: number;
  };
  packets?: unknown[];
}

export interface SourceIntakeTemplateManifest {
  version?: number;
  type?: string;
  policyVersion?: string;
  generatedAt?: string;
  summary?: {
    packetCount?: number;
    templateRowCount?: number;
    plannedCandidateCount?: number;
    packetSize?: number;
  };
  importContract?: Record<string, unknown>;
  packets?: unknown[];
}

export interface SourceIntakeAcceptedImportDryRunManifest {
  generatedAt?: string;
  type?: string;
  input?: string;
  dryRun?: boolean;
  validationGates?: string[];
  summary?: {
    acceptedCandidateCount?: number;
    httpsAcceptedCount?: number;
    evidenceCompleteCount?: number;
    dryRunAddedCandidateCount?: number;
    dryRunSkippedDuplicateCount?: number;
    dryRunExistingCandidateCount?: number;
    dryRunOutputCandidateCount?: number;
  };
  errors?: unknown[];
}

export interface ProdCycleSummary {
  generatedAt?: string;
  ok?: boolean;
  errors?: unknown[];
  warnings?: unknown[];
  commandResults?: unknown[];
  pipeline?: {
    totalCatalogEntries?: number;
    processedCatalogEntries?: number;
    curatedReferenceEntries?: number;
    missingCuratedEntries?: number;
    duplicateRowsAfterDedupe?: number;
    autoAttachAcceptedOnly?: boolean;
    reviewQueueHasAccepted?: boolean;
  };
  queueClosure?: {
    candidateReviewQueueEntries?: number;
    candidateReviewGroupEntries?: number;
    sourceIntakeTemplateRows?: number;
    acceptedPromotionEligibleFromReviewQueue?: number;
    acceptedBulkCandidateCount?: number;
    reviewOnlyCandidateCount?: number;
  };
  pdfVerification?: {
    verifiedMeasureBoxes?: number;
    emptyImportDryRun?: {
      verificationManifestUnchanged?: boolean;
      verificationManifestBeforeSha256?: string;
      verificationManifestAfterSha256?: string;
    } | null;
  };
  sourceDiscovery?: {
    lastRunOk?: boolean;
    dryRun?: boolean;
    processedMissingCatalogEntries?: number;
    providerCount?: number;
    candidateCount?: number;
    acceptedReadyCount?: number;
    needsReviewCount?: number;
    conflictCount?: number;
    negativeCacheCount?: number;
    directAutoAttachCount?: number;
    targetScript?: string;
  };
}

export interface SourceDiscoveryRunManifest {
  generatedAt?: string;
  ok?: boolean;
  dryRun?: boolean;
  scope?: string;
  processedMissingCatalogEntries?: number;
  totalMissingCatalogEntries?: number;
  providerCount?: number;
  candidateCount?: number;
  acceptedReadyCount?: number;
  needsReviewCount?: number;
  conflictCount?: number;
  deferredCount?: number;
  negativeCacheCount?: number;
  directAutoAttachCount?: number;
  targetImportDryRun?: string;
}

export interface SourceDiscoveryVerificationManifest {
  ok?: boolean;
  errors?: unknown[];
  warnings?: unknown[];
  validationGates?: string[];
  summary?: {
    processedMissingCatalogEntries?: number;
    providerCount?: number;
    candidateCount?: number;
    acceptedReadyCount?: number;
    needsReviewCount?: number;
    conflictCount?: number;
    negativeCacheCount?: number;
    directAutoAttachCount?: number;
  };
}

export interface SourceDiscoveryAcceptedImportReadyManifest {
  summary?: {
    acceptedReadyCount?: number;
    directAutoAttachCount?: number;
    reasonWhenEmpty?: string;
  };
  importContract?: {
    targetScript?: string;
    acceptedOnlyAfterValidation?: boolean;
  };
  candidates?: unknown[];
}

export interface SourceDiscoveryProviderCoverageManifest {
  providers?: Array<{
    providerProfileId?: string;
    connector?: string;
    mode?: string;
    candidateCount?: number;
    acceptedReadyCount?: number;
    needsReviewCount?: number;
    conflictCount?: number;
    deferredCount?: number;
    negativeCacheCount?: number;
  }>;
}

export interface SourceDiscoveryNegativeCacheManifest {
  summary?: {
    negativeCacheCount?: number;
  };
}

export interface SourceDiscoveryCoverageDeltaManifest {
  acceptedReadyCount?: number;
  directAutoAttachCount?: number;
  before?: {
    curatedReferenceEntries?: number;
    missingCuratedEntries?: number;
    acceptedBulkCandidateEntries?: number;
  };
  afterDryRun?: {
    curatedReferenceEntries?: number;
    missingCuratedEntries?: number;
    acceptedBulkCandidateEntries?: number;
  };
}

export interface SourceProviderVerificationRunManifest {
  generatedAt?: string;
  ok?: boolean;
  dryRun?: boolean;
  providerProfileId?: string;
  providerProfileIds?: string[];
  connector?: string;
  processedGroupCount?: number;
  verificationPacketCount?: number;
  totalEligibleGroupCount?: number;
  totalBacklogGroupCount?: number;
  providerCount?: number;
  resultCount?: number;
  acceptedReadyCount?: number;
  needsReviewCount?: number;
  rejectedCount?: number;
  deferredCount?: number;
  cacheHitCount?: number;
  directAutoAttachCount?: number;
  mediaDownloadCount?: number;
  sourceContentCopiedCount?: number;
  warnings?: unknown[];
  acceptedImportDryRun?: {
    incomingCandidateCount?: number;
    addedCandidateCount?: number;
    skippedDuplicateCount?: number;
    outputCandidateCount?: number;
  } | null;
  artifacts?: {
    plan?: string;
  };
}

export interface SymbTrLayoutVerificationSummary {
  candidateEntries?: number;
  verificationEntries?: number;
  verifiedEntries?: number;
  verifiedMeasureBoxes?: number;
  unresolvedCandidateEntries?: number;
  candidateStatus?: string;
  promotionPolicy?: string;
  fingerprintAlgorithm?: string;
  reviewTemplate?: {
    path?: string;
    entryCount?: number;
    candidateReviewRows?: number;
  };
  reviewBatchPlan?: {
    path?: string;
    packetCount?: number;
    candidateReviewRows?: number;
  };
  emptyImportDryRun?: {
    path?: string;
    input?: string;
    reviewTemplateEntryCount?: number;
    reviewBatchPacketCount?: number;
    dryRunInputEntryCount?: number;
    dryRunVerifiedMeasureBoxCount?: number;
    verificationManifestBeforeSha256?: string;
    verificationManifestAfterSha256?: string;
    verificationManifestUnchanged?: boolean;
  } | null;
  errors?: unknown[];
}

export interface BulkCandidateManifest {
  version?: number;
  candidates?: Array<{
    catalogId?: string;
    status?: string;
    checkedAt?: string;
    source?: ExternalReferenceSource;
  }>;
}

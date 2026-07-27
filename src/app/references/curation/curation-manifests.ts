import type {CurationStat, ExternalReferenceSource} from "@/app/api/external-references/curation-state";
import type {ExternalReferenceState} from "@/features/references/ReferencesCurationDashboard";

/**
 * KURASYON SAYFASININ OKUDUGU MANIFEST TIPLERI (PLAN.md §11/H6)
 *
 * `references/curation/page.tsx` 848 satirdi ve ratchet tavani 800. Dosyanin
 * yaklasik ucte biri (320 satir) sunucu tarafinda okunan JSON manifestlerinin
 * SEKIL bildirimleriydi; sayfanin kendi isiyle ilgisi yok, yalnizca orada
 * duruyorlardi.
 *
 * Tasima tamamen TIP duzeyindedir — tek satir calisma zamani kodu tasinmadi,
 * dolayisiyla davranis degisemez.
 */

export interface BulkCandidateManifest {
  candidates?: Array<{
    status?: string;
  }>;
}

export interface CandidateReviewRow {
  candidateId?: string;
  catalogId?: string;
  status?: string;
  profileId?: string;
  provider?: string;
  composer?: string;
}

export interface CandidateReviewGroup {
  groupId?: string;
  catalogId?: string;
  status?: string;
  composer?: string;
  priorityGroup?: string;
}

export interface CurationBacklogRow {
  catalogId?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  availableFormats?: string;
  missingCuratedReference?: boolean;
  deferredFromNextBatch?: boolean;
  priorityGroup?: string;
}

export interface AutoAttachedManifest {
  matcherVersion?: string;
  references?: Array<{
    catalogId?: string;
    sourceId?: string;
    profileId?: string;
    status?: string;
    rank?: number;
    confidenceScore?: number;
    confidenceLevel?: string;
    matchReasons?: string[];
    conflicts?: string[];
    attachedAt?: string;
    matcherVersion?: string;
  }>;
}

export interface MappingManifest {
  generatedAt?: string;
  summary?: Record<string, unknown>;
  mappings?: Array<{
    status?: string;
    candidate?: {
      source?: ExternalReferenceSource;
    };
  }>;
  candidates?: Array<{
    source?: ExternalReferenceSource;
  }>;
}

export interface FeedbackManifest {
  events?: unknown[];
}

export interface ManualCorrectionsManifest {
  corrections?: unknown[];
}

export interface ResearchProfilesManifest {
  profiles?: unknown[];
}

export interface EmbedStatesManifest {
  states?: unknown[];
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
    reasonWhenEmpty?: string;
  };
  importContract?: {
    targetScript?: string;
  };
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
  directAutoAttachCount?: number;
  before?: Record<string, number>;
  afterDryRun?: Record<string, number>;
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
    addedCandidateCount?: number;
  } | null;
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

export interface SourceTerminalFeedbackManifest {
  events?: Array<{
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
  }>;
  summary?: {
    eventCount?: number;
    activeEventCount?: number;
    rolledBackEventCount?: number;
    eventTypeCounts?: Record<string, number>;
  };
}

export interface QualityStatsManifest {
  generatedAt?: string | null;
  stats?: CurationStat[];
}

export type ReadOnlyReferenceView = NonNullable<
  NonNullable<ExternalReferenceState["curation"]>["autoAttachedReferences"]
>[number];

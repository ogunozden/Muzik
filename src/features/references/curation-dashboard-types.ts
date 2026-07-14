import type {
  SourceTerminalDecisionEntry,
  SourceTerminalFeedbackEvent,
} from "./TerminalSourceDecisionsPanel";

/**
 * ReferencesCurationDashboard veri tipleri (M8.2 bolme). Runtime kodu yok;
 * dashboard bileseni ve kurasyon yardimcilari bu modulu paylasir.
 */

export type CurationAction =
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
  | "source-terminal-feedback";

export interface CurationReference {
  catalogId?: string;
  sourceId?: string;
  profileId?: string;
  catalog?: CatalogMetadata | null;
  source?: {
    title?: string;
    label?: string;
    url?: string;
    provider?: string;
  } | null;
  status?: string;
  rank?: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  matchReasons?: string[];
  conflicts?: string[];
  attachedAt?: string;
}

export interface CatalogMetadata {
  id?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  formats?: string[];
}

export interface CurationBacklogRow {
  catalogId?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  availableFormats?: string;
  hasPdf?: boolean;
  hasMusicXml?: boolean;
  hasTxt?: boolean;
  hasCuratedReference?: boolean;
  missingCuratedReference?: boolean;
  curationDecisionStatus?: string;
  curationDecisionReason?: string;
  curationDecisionReviewedAt?: string;
  deferredFromNextBatch?: boolean;
  priorityGroup?: string;
  curationPriorityScore?: number;
  scoreSearchUrl?: string;
  scoreSourceHintUrls?: string;
  recordingSearchUrl?: string;
}

export interface SourceQualityStat {
  profileId?: string;
  acceptedCount?: number;
  removedCount?: number;
  deletedCount?: number;
  correctedCount?: number;
  mismatchCount?: number;
  embedSuccessCount?: number;
  embedFailureCount?: number;
}

export interface BacklogFacet {
  value: string;
  count: number;
}

export interface BacklogPage {
  scope?: string;
  offset?: number;
  limit?: number;
  returnedCount?: number;
  filteredTotal?: number;
  totalRows?: number;
  totalMissing?: number;
  activeQueueCount?: number;
  deferredCount?: number;
  previousOffset?: number | null;
  nextOffset?: number | null;
  artifactPaths?: {
    backlogJson?: string | null;
    nextBatchJson?: string | null;
  };
}

export interface ArtifactInventoryItem {
  id: string;
  label: string;
  category: string;
  status: string;
  path: string;
  metrics: string[];
  command?: string | null;
}

export interface CandidateReviewRow {
  candidateId?: string;
  catalogId?: string;
  status?: string;
  statusReason?: string;
  profileId?: string;
  profileLabel?: string;
  provider?: string;
  reviewConfidenceScore?: number;
  reviewConfidenceLevel?: string;
  scoreReasons?: string[];
  queryFields?: string[];
  searchQuery?: string;
  searchUrl?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  priorityGroup?: string;
}

export interface CandidateReviewPage {
  offset?: number;
  limit?: number;
  returnedCount?: number;
  filteredTotal?: number;
  totalRows?: number;
  previousOffset?: number | null;
  nextOffset?: number | null;
  artifactPath?: string;
}

export type CandidateReviewGroupPage = CandidateReviewPage;

export interface CandidateReviewGroup {
  groupId?: string;
  catalogId?: string;
  status?: string;
  reviewAction?: string;
  candidateCount?: number;
  profileCount?: number;
  profiles?: string[];
  providers?: string[];
  confidenceLevels?: string[];
  highestReviewConfidenceScore?: number;
  deferredFromNextBatch?: boolean;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  priorityGroup?: string;
}

export interface ExternalReferenceState {
  coverage?: {
    totalCatalogEntries?: number;
    curatedReferenceEntries?: number;
    missingCuratedEntries?: number;
    acceptedBulkCandidateEntries?: number;
    candidateReviewQueueEntries?: number;
    candidateReviewQueueJson?: string;
    batchReport?: {
      processedCatalogEntries?: number;
      curatedBeforeBulkCandidates?: number;
      newlyAcceptedCatalogEntries?: number;
      curatedAfterBatch?: number;
      missingAfterBatch?: number;
      deferredMissingEntries?: number;
      nextBatchSize?: number;
      generatedReviewCandidates?: number;
      recommendedReviewGroupDecisions?: number;
      plannedReviewPackets?: number;
      plannedReviewGroups?: number;
      plannedSourceIntakePackets?: number;
      plannedSourceIntakeRows?: number;
      validationGates?: string[];
    };
    candidateReviewGroupDecisionRecommendationEntries?: number;
    candidateReviewGroupDecisionRecommendationsJson?: string;
    candidateReviewBatchPlanEntries?: number;
    candidateReviewBatchPlanJson?: string;
    coverageMatrixEntries?: number;
    coverageMatrixJson?: string;
    dedupeReportEntries?: number;
    dedupeReportJson?: string;
    cleanedDuplicateRows?: number;
    duplicateRowsAfterDedupe?: number;
  } | null;
  curation?: {
    summary?: {
      autoAttachedCount?: number;
      removedCount?: number;
      deleteRequestedCount?: number;
      deletedCount?: number;
      conflictCount?: number;
      feedbackEventCount?: number;
      manualCorrectionCount?: number;
      researchSourceProfileCount?: number;
      sourceQualityStatCount?: number;
      matcherVersion?: string | null;
      statsGeneratedAt?: string | null;
    };
    autoAttachedReferences?: CurationReference[];
    candidateManifest?: {
      artifactPath?: string;
      candidateCount?: number;
      acceptedCount?: number;
      needsReviewCount?: number;
      rejectedCount?: number;
      conflictCount?: number;
      statusCounts?: Record<string, number>;
    };
    candidateReviewGroups?: CandidateReviewGroup[];
    candidateReviewGroupManifest?: {
      artifactPath?: string;
      groupCount?: number;
      visibleGroupCount?: number;
    };
    candidateReviewGroupDecisionManifest?: {
      artifactPath?: string;
      decisionCount?: number;
    };
    candidateReviewGroupDecisionRecommendationManifest?: {
      artifactPath?: string;
      decisionCount?: number;
      policyVersion?: string | null;
      generatedAt?: string | null;
      summary?: Record<string, unknown> | null;
    };
    candidateReviewBatchPlanManifest?: {
      artifactPath?: string;
      packetCount?: number;
      plannedGroupCount?: number;
      plannedCandidateCount?: number;
      packetSize?: number;
      policyVersion?: string | null;
      generatedAt?: string | null;
    };
    sourceIntakeTemplateManifest?: {
      artifactPath?: string;
      packetCount?: number;
      templateRowCount?: number;
      plannedCandidateCount?: number;
      packetSize?: number;
      policyVersion?: string | null;
      generatedAt?: string | null;
      targetScript?: string | null;
    };
    sourceIntakeAcceptedImportDryRunManifest?: {
      artifactPath?: string;
      input?: string | null;
      generatedAt?: string | null;
      dryRun?: boolean;
      acceptedCandidateCount?: number;
      httpsAcceptedCount?: number;
      evidenceCompleteCount?: number;
      dryRunAddedCandidateCount?: number;
      dryRunSkippedDuplicateCount?: number;
      dryRunOutputCandidateCount?: number;
      validationGateCount?: number;
      validationErrorCount?: number;
      targetScript?: string | null;
    };
    symbtrLayoutVerificationManifest?: {
      summaryPath?: string;
      candidateEntries?: number;
      verificationEntries?: number;
      verifiedEntries?: number;
      verifiedMeasureBoxes?: number;
      unresolvedCandidateEntries?: number;
      candidateStatus?: string | null;
      promotionPolicy?: string | null;
      fingerprintAlgorithm?: string | null;
      reviewTemplatePath?: string;
      reviewTemplateEntryCount?: number;
      reviewTemplateCandidateRows?: number;
      reviewBatchPlanPath?: string;
      reviewBatchPacketCount?: number;
      reviewBatchCandidateRows?: number;
      emptyImportDryRunPath?: string;
      emptyImportTemplatePath?: string | null;
      emptyImportDryRunInputEntries?: number;
      emptyImportDryRunVerifiedMeasureBoxes?: number;
      emptyImportVerificationManifestBeforeSha256?: string | null;
      emptyImportVerificationManifestAfterSha256?: string | null;
      emptyImportVerificationManifestUnchanged?: boolean;
      targetScript?: string | null;
      emptyImportDryRunScript?: string | null;
      validationErrorCount?: number;
    };
    prodCycleAudit?: {
      artifactPath?: string;
      generatedAt?: string | null;
      ok?: boolean;
      errorCount?: number;
      warningCount?: number;
      commandCount?: number;
      processedCatalogEntries?: number;
      totalCatalogEntries?: number;
      curatedReferenceEntries?: number;
      missingCuratedEntries?: number;
      duplicateRowsAfterDedupe?: number;
      autoAttachAcceptedOnly?: boolean;
      reviewQueueHasAccepted?: boolean;
      candidateReviewQueueEntries?: number;
      candidateReviewGroupEntries?: number;
      sourceIntakeTemplateRows?: number;
      acceptedPromotionEligibleFromReviewQueue?: number;
      acceptedBulkCandidateCount?: number;
      reviewOnlyCandidateCount?: number;
      pdfVerifiedMeasureBoxes?: number;
      pdfVerificationManifestUnchanged?: boolean;
      targetScript?: string | null;
    };
    sourceDiscovery?: {
      artifactPath?: string;
      verificationArtifactPath?: string;
      acceptedImportReadyArtifactPath?: string;
      providerCoverageArtifactPath?: string;
      negativeCacheArtifactPath?: string;
      coverageDeltaArtifactPath?: string;
      generatedAt?: string | null;
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
      directAutoAttachCount?: number | null;
      verificationErrorCount?: number;
      verificationWarningCount?: number;
      validationGateCount?: number;
      targetScript?: string | null;
      verifyScript?: string | null;
      targetImportDryRun?: string | null;
      reasonWhenEmpty?: string | null;
      providerCoverage?: Array<{
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
      coverageDelta?: {
        before?: Record<string, number> | null;
        afterDryRun?: Record<string, number> | null;
      };
      providerVerification?: {
        artifactPath?: string;
        evidenceArtifactPath?: string;
        acceptedImportReadyArtifactPath?: string;
        planArtifactPath?: string;
        coverageArtifactPath?: string;
        batchRunArtifactPath?: string;
        continueScript?: string | null;
        generatedAt?: string | null;
        ok?: boolean;
        dryRun?: boolean;
        providerProfileId?: string | null;
        providerProfileIds?: string[];
        connector?: string | null;
        processedGroupCount?: number;
        verificationPacketCount?: number;
        totalEligibleGroupCount?: number;
        totalBacklogGroupCount?: number;
        providerCount?: number;
        cumulativeVerifiedOrClassifiedCount?: number;
        networkProviderRemainingGroupCount?: number;
        batchRunCompletedCount?: number;
        batchRunFinalVerifiedCount?: number;
        batchRunFinalRemainingCount?: number;
        resultCount?: number;
        acceptedReadyCount?: number;
        needsReviewCount?: number;
        rejectedCount?: number;
        deferredCount?: number;
        cacheHitCount?: number;
        directAutoAttachCount?: number;
        mediaDownloadCount?: number;
        sourceContentCopiedCount?: number;
        warningCount?: number;
        dryRunAddedCandidateCount?: number;
        targetScript?: string | null;
      };
    };
    sourceTerminalDecisions?: {
      artifactPath?: string;
      generatedAt?: string | null;
      terminalDecisionGroupCount?: number;
      disputedCount?: number;
      verifiedUnavailableCount?: number;
      deferredCount?: number;
      directAutoAttachCount?: number;
      mediaDownloadCount?: number;
      statusCounts?: Record<string, number>;
      visibleEntries?: SourceTerminalDecisionEntry[];
      feedbackArtifactPath?: string;
      feedbackEventCount?: number;
      feedbackActiveEventCount?: number;
      feedbackRolledBackEventCount?: number;
      feedbackEventTypeCounts?: Record<string, number>;
      feedbackEvents?: SourceTerminalFeedbackEvent[];
      allowedEventTypes?: string[];
      policy?: string;
    };
    candidateReviewGroupPage?: CandidateReviewGroupPage;
    candidateReviewGroupFacets?: {
      statuses?: BacklogFacet[];
      composers?: BacklogFacet[];
      priorityGroups?: BacklogFacet[];
    };
    candidateReviewQueue?: CandidateReviewRow[];
    candidateReviewPage?: CandidateReviewPage;
    candidateReviewFacets?: {
      statuses?: BacklogFacet[];
      profileIds?: BacklogFacet[];
      providers?: BacklogFacet[];
      confidenceLevels?: BacklogFacet[];
      composers?: BacklogFacet[];
    };
    backlogNextBatch?: CurationBacklogRow[];
    backlogPage?: BacklogPage;
    backlogFacets?: {
      makams?: BacklogFacet[];
      forms?: BacklogFacet[];
      usuls?: BacklogFacet[];
      composers?: BacklogFacet[];
      priorityGroups?: BacklogFacet[];
      decisionStatuses?: BacklogFacet[];
    };
    feedbackEvents?: Array<{
      eventId?: string;
      catalogId?: string;
      sourceId?: string;
      eventType?: string;
      reason?: string;
      createdAt?: string;
    }>;
    sourceQualityStats?: SourceQualityStat[];
  };
}

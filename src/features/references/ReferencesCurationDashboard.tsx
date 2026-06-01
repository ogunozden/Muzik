"use client";

import {useCallback, useMemo, useState} from "react";
import Link from "next/link";
import {Button, Input, UnifiedLayout} from "@/shared/ui";
import {tokens} from "@/shared/tokens";

type CurationAction =
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
  | "curation-feedback-batch";

interface CurationReference {
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

interface CatalogMetadata {
  id?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  formats?: string[];
}

interface CurationBacklogRow {
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

interface SourceQualityStat {
  profileId?: string;
  acceptedCount?: number;
  removedCount?: number;
  deletedCount?: number;
  correctedCount?: number;
  mismatchCount?: number;
  embedSuccessCount?: number;
  embedFailureCount?: number;
}

interface BacklogFacet {
  value: string;
  count: number;
}

interface BacklogPage {
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

interface ArtifactInventoryItem {
  id: string;
  label: string;
  category: string;
  status: string;
  path: string;
  metrics: string[];
  command?: string | null;
}

interface CandidateReviewRow {
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

interface CandidateReviewPage {
  offset?: number;
  limit?: number;
  returnedCount?: number;
  filteredTotal?: number;
  totalRows?: number;
  previousOffset?: number | null;
  nextOffset?: number | null;
  artifactPath?: string;
}

type CandidateReviewGroupPage = CandidateReviewPage;

interface CandidateReviewGroup {
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

const OPS_TOKEN_HEADER = "x-external-reference-ops-token";
const emptyState: ExternalReferenceState = {};
const ALL_FILTER_VALUE = "all";
const candidateGroupDecisionStatusOptions = ["rejected", "conflict", "deferred"];
const deletionFilterOptions = ["Silme yok", "Silme bekleyenler", "Silinenler"];

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: unknown): string {
  return typeof value === "number" ? new Intl.NumberFormat("tr-TR").format(value) : "-";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClasses(status: string | undefined): string {
  if (status === "auto-attached" || status === "user-approved" || status === "user-prioritized") {
    return "bg-[var(--color-success)] text-white";
  }
  if (status === "user-removed" || status === "delete-requested" || status === "deleted") {
    return "bg-[var(--color-error)] text-white";
  }
  if (status === "user-demoted" || status === "user-corrected" || status === "manual-entry") {
    return "bg-[var(--color-warning)] text-[var(--color-text-primary)]";
  }
  return "bg-[var(--color-border)] text-[var(--color-text-primary)]";
}

function normalizeFilterText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : "";
}

function matchesQuery(values: unknown[], normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return values.some((value) => normalizeFilterText(value).includes(normalizedQuery));
}

function getUniqueOptions(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((first, second) => first.localeCompare(second, "tr-TR"));
}

function getFacetValues(facets: BacklogFacet[] | undefined): string[] {
  return (facets ?? []).map((facet) => facet.value).filter(Boolean);
}

function renderCatalogLine(catalog: CatalogMetadata | null | undefined): string {
  return [catalog?.makam, catalog?.form, catalog?.usul].filter(Boolean).join(" / ") || "-";
}

function getSourceLabel(reference: CurationReference): string {
  return reference.source?.title ?? reference.source?.label ?? reference.sourceId ?? "-";
}

function getReferenceProfileLabel(reference: CurationReference): string {
  return [reference.profileId, reference.source?.provider].filter(Boolean).join(" / ") || "-";
}

function getReferenceKey(reference: CurationReference): string {
  return `${reference.catalogId ?? ""}:${reference.sourceId ?? ""}`;
}

function getFirstHintUrl(row: CurationBacklogRow): string | undefined {
  return row.scoreSourceHintUrls
    ?.split("|")
    .map((url) => url.trim())
    .find(Boolean);
}

function formatBacklogFormats(row: CurationBacklogRow): string {
  if (row.availableFormats) return row.availableFormats.replace(/\|/g, " / ");

  return [
    row.hasTxt ? "txt" : null,
    row.hasMusicXml ? "xml" : null,
    row.hasPdf ? "pdf" : null,
  ].filter(Boolean).join(" / ") || "-";
}

function getArtifactStatusLabel(status: string): string {
  if (status === "ok") return "OK";
  if (status === "needs-review") return "Review";
  if (status === "dry-run") return "Dry-run";
  if (status === "empty-template") return "Boş template";
  if (status === "candidate-only") return "Aday";
  return status || "-";
}

function buildArtifactInventory(state: ExternalReferenceState): ArtifactInventoryItem[] {
  const items = new Map<string, ArtifactInventoryItem>();

  const addItem = (item: ArtifactInventoryItem | null | undefined) => {
    if (!item?.path) return;
    const existing = items.get(item.path);
    if (!existing) {
      items.set(item.path, item);
      return;
    }

    items.set(item.path, {
      ...existing,
      metrics: Array.from(new Set([...existing.metrics, ...item.metrics])),
      command: existing.command ?? item.command,
    });
  };

  const coverage = state.coverage;
  const curation = state.curation;
  const summary = curation?.summary;
  const candidateManifest = curation?.candidateManifest;
  const candidateReviewGroupManifest = curation?.candidateReviewGroupManifest;
  const candidateReviewGroupDecisionManifest = curation?.candidateReviewGroupDecisionManifest;
  const candidateReviewGroupDecisionRecommendationManifest = curation?.candidateReviewGroupDecisionRecommendationManifest;
  const candidateReviewBatchPlanManifest = curation?.candidateReviewBatchPlanManifest;
  const sourceIntakeTemplateManifest = curation?.sourceIntakeTemplateManifest;
  const sourceIntakeAcceptedImportDryRunManifest = curation?.sourceIntakeAcceptedImportDryRunManifest;
  const symbtrLayoutVerificationManifest = curation?.symbtrLayoutVerificationManifest;
  const prodCycleAudit = curation?.prodCycleAudit;
  const sourceDiscovery = curation?.sourceDiscovery;

  if (coverage) {
    addItem({
      id: "coverage-summary",
      label: "Coverage summary",
      category: "Coverage",
      status: "ok",
      path: "output/external-reference-coverage/summary.json",
      metrics: [
        `${formatNumber(coverage.totalCatalogEntries)} eser`,
        `${formatNumber(coverage.missingCuratedEntries)} eksik`,
        `${formatNumber(coverage.candidateReviewQueueEntries)} aday`,
      ],
      command: "npm run audit:external-references",
    });
  }

  addItem(candidateManifest?.artifactPath ? {
    id: "bulk-candidates",
    label: "Bulk candidate manifest",
    category: "Candidate",
    status: (candidateManifest.needsReviewCount ?? 0) > 0 ? "needs-review" : "ok",
    path: candidateManifest.artifactPath,
    metrics: [
      `${formatNumber(candidateManifest.candidateCount)} aday`,
      `${formatNumber(candidateManifest.acceptedCount)} accepted`,
      `${formatNumber(candidateManifest.needsReviewCount)} review`,
      `${formatNumber(candidateManifest.conflictCount)} conflict`,
    ],
    command: "npm run import:external-references -- --input <json>",
  } : null);

  addItem(coverage?.candidateReviewQueueJson ? {
    id: "candidate-review-queue",
    label: "Candidate review queue",
    category: "Review",
    status: "needs-review",
    path: coverage.candidateReviewQueueJson,
    metrics: [`${formatNumber(coverage.candidateReviewQueueEntries)} aday`],
  } : null);

  addItem(coverage?.coverageMatrixJson ? {
    id: "coverage-matrix",
    label: "Coverage matrix",
    category: "Coverage",
    status: "ok",
    path: coverage.coverageMatrixJson,
    metrics: [`${formatNumber(coverage.coverageMatrixEntries)} kırılım`],
  } : null);

  addItem(coverage?.dedupeReportJson ? {
    id: "dedupe-report",
    label: "Dedupe report",
    category: "Dedupe",
    status: (coverage.duplicateRowsAfterDedupe ?? 0) > 0 ? "needs-review" : "ok",
    path: coverage.dedupeReportJson,
    metrics: [
      `${formatNumber(coverage.duplicateRowsAfterDedupe)} duplicate`,
      `${formatNumber(coverage.cleanedDuplicateRows)} temizlenen`,
    ],
  } : null);

  addItem(curation?.backlogPage?.artifactPaths?.backlogJson ? {
    id: "backlog",
    label: "Missing source backlog",
    category: "Backlog",
    status: "needs-review",
    path: curation.backlogPage.artifactPaths.backlogJson,
    metrics: [
      `${formatNumber(curation.backlogPage.totalMissing)} eksik`,
      `${formatNumber(curation.backlogPage.activeQueueCount)} aktif`,
      `${formatNumber(curation.backlogPage.deferredCount)} deferred`,
    ],
  } : null);

  addItem(curation?.backlogPage?.artifactPaths?.nextBatchJson ? {
    id: "next-batch",
    label: "Next backlog batch",
    category: "Backlog",
    status: "needs-review",
    path: curation.backlogPage.artifactPaths.nextBatchJson,
    metrics: [`${formatNumber(curation.backlogPage.returnedCount)} gösterilen`],
  } : null);

  addItem(candidateReviewGroupManifest?.artifactPath ? {
    id: "candidate-review-groups",
    label: "Candidate review groups",
    category: "Review",
    status: "needs-review",
    path: candidateReviewGroupManifest.artifactPath,
    metrics: [`${formatNumber(candidateReviewGroupManifest.groupCount)} grup`],
  } : null);

  addItem(candidateReviewGroupDecisionManifest?.artifactPath ? {
    id: "candidate-review-decisions",
    label: "Review group decisions",
    category: "Decision",
    status: "ok",
    path: candidateReviewGroupDecisionManifest.artifactPath,
    metrics: [`${formatNumber(candidateReviewGroupDecisionManifest.decisionCount)} karar`],
    command: "npm run import:candidate-review-decisions -- --input <json>",
  } : null);

  addItem(candidateReviewGroupDecisionRecommendationManifest?.artifactPath ? {
    id: "candidate-review-recommendations",
    label: "Decision recommendations",
    category: "Decision",
    status: "needs-review",
    path: candidateReviewGroupDecisionRecommendationManifest.artifactPath,
    metrics: [`${formatNumber(candidateReviewGroupDecisionRecommendationManifest.decisionCount)} öneri`],
  } : null);

  addItem(candidateReviewBatchPlanManifest?.artifactPath ? {
    id: "candidate-review-batch-plan",
    label: "Review batch plan",
    category: "Batch",
    status: "needs-review",
    path: candidateReviewBatchPlanManifest.artifactPath,
    metrics: [
      `${formatNumber(candidateReviewBatchPlanManifest.packetCount)} paket`,
      `${formatNumber(candidateReviewBatchPlanManifest.plannedGroupCount)} grup`,
      `${formatNumber(candidateReviewBatchPlanManifest.plannedCandidateCount)} aday`,
    ],
  } : null);

  addItem(sourceIntakeTemplateManifest?.artifactPath ? {
    id: "source-intake-template",
    label: "Source intake template",
    category: "Intake",
    status: "empty-template",
    path: sourceIntakeTemplateManifest.artifactPath,
    metrics: [
      `${formatNumber(sourceIntakeTemplateManifest.packetCount)} paket`,
      `${formatNumber(sourceIntakeTemplateManifest.templateRowCount)} boş satır`,
    ],
    command: sourceIntakeTemplateManifest.targetScript,
  } : null);

  addItem(sourceIntakeAcceptedImportDryRunManifest?.artifactPath ? {
    id: "source-intake-accepted-dry-run",
    label: "Accepted source dry-run",
    category: "Validation",
    status: sourceIntakeAcceptedImportDryRunManifest.dryRun ? "dry-run" : "needs-review",
    path: sourceIntakeAcceptedImportDryRunManifest.artifactPath,
    metrics: [
      `${formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted`,
      `${formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationErrorCount)} hata`,
    ],
    command: sourceIntakeAcceptedImportDryRunManifest.targetScript,
  } : null);

  addItem(prodCycleAudit?.artifactPath ? {
    id: "prod-cycle-summary",
    label: "Prod-cycle audit summary",
    category: "Validation",
    status: prodCycleAudit.ok ? "ok" : "needs-review",
    path: prodCycleAudit.artifactPath,
    metrics: [
      `${formatNumber(prodCycleAudit.processedCatalogEntries)} eser`,
      `${formatNumber(prodCycleAudit.candidateReviewQueueEntries)} review-only`,
      `${formatNumber(prodCycleAudit.errorCount)} hata`,
      `${formatNumber(prodCycleAudit.warningCount)} uyarı`,
    ],
    command: prodCycleAudit.targetScript,
  } : null);

  addItem(sourceDiscovery?.artifactPath ? {
    id: "source-discovery-run",
    label: "External source discovery run",
    category: "Discovery",
    status: sourceDiscovery.ok ? "dry-run" : "needs-review",
    path: sourceDiscovery.artifactPath,
    metrics: [
      `${formatNumber(sourceDiscovery.processedMissingCatalogEntries)} eksik işlendi`,
      `${formatNumber(sourceDiscovery.candidateCount)} aday`,
      `${formatNumber(sourceDiscovery.acceptedReadyCount)} accepted-ready`,
      `${formatNumber(sourceDiscovery.directAutoAttachCount)} direct attach`,
    ],
    command: sourceDiscovery.targetScript,
  } : null);

  addItem(sourceDiscovery?.acceptedImportReadyArtifactPath ? {
    id: "source-discovery-accepted-import-ready",
    label: "Discovery accepted import-ready",
    category: "Discovery",
    status: sourceDiscovery.acceptedReadyCount ? "needs-review" : "dry-run",
    path: sourceDiscovery.acceptedImportReadyArtifactPath,
    metrics: [
      `${formatNumber(sourceDiscovery.acceptedReadyCount)} accepted-ready`,
      `${formatNumber(sourceDiscovery.directAutoAttachCount)} direct attach`,
    ],
    command: sourceDiscovery.targetImportDryRun,
  } : null);

  addItem(sourceDiscovery?.providerCoverageArtifactPath ? {
    id: "source-discovery-provider-coverage",
    label: "Discovery provider coverage",
    category: "Discovery",
    status: "dry-run",
    path: sourceDiscovery.providerCoverageArtifactPath,
    metrics: [
      `${formatNumber(sourceDiscovery.providerCount)} provider`,
      `${formatNumber(sourceDiscovery.negativeCacheCount)} negative cache`,
    ],
  } : null);

  addItem(symbtrLayoutVerificationManifest?.summaryPath ? {
    id: "symbtr-layout-summary",
    label: "SymbTr layout validation summary",
    category: "PDF",
    status: (symbtrLayoutVerificationManifest.validationErrorCount ?? 0) > 0 ? "needs-review" : "candidate-only",
    path: symbtrLayoutVerificationManifest.summaryPath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.candidateEntries)} aday eser`,
      `${formatNumber(symbtrLayoutVerificationManifest.verifiedMeasureBoxes)} verified`,
    ],
    command: "npm run verify:symbtr-measures",
  } : null);

  addItem(symbtrLayoutVerificationManifest?.reviewTemplatePath ? {
    id: "symbtr-layout-review-template",
    label: "PDF layout review template",
    category: "PDF",
    status: "candidate-only",
    path: symbtrLayoutVerificationManifest.reviewTemplatePath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.reviewTemplateEntryCount)} eser`,
      `${formatNumber(symbtrLayoutVerificationManifest.reviewTemplateCandidateRows)} aday satır`,
    ],
  } : null);

  addItem(symbtrLayoutVerificationManifest?.reviewBatchPlanPath ? {
    id: "symbtr-layout-review-batch",
    label: "PDF layout review batch",
    category: "PDF",
    status: "candidate-only",
    path: symbtrLayoutVerificationManifest.reviewBatchPlanPath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.reviewBatchPacketCount)} paket`,
      `${formatNumber(symbtrLayoutVerificationManifest.reviewBatchCandidateRows)} aday satır`,
    ],
  } : null);

  addItem(symbtrLayoutVerificationManifest?.emptyImportDryRunPath ? {
    id: "symbtr-layout-empty-dry-run",
    label: "PDF empty import dry-run",
    category: "Validation",
    status: "dry-run",
    path: symbtrLayoutVerificationManifest.emptyImportDryRunPath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunInputEntries)} import`,
      `${formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunVerifiedMeasureBoxes)} verified`,
    ],
    command: symbtrLayoutVerificationManifest.emptyImportDryRunScript,
  } : null);

  addItem(symbtrLayoutVerificationManifest?.emptyImportTemplatePath ? {
    id: "symbtr-layout-empty-template",
    label: "PDF empty import template",
    category: "PDF",
    status: "empty-template",
    path: symbtrLayoutVerificationManifest.emptyImportTemplatePath,
    metrics: ["0 import"],
  } : null);

  addItem({
    id: "auto-attached",
    label: "Auto-attached references",
    category: "Runtime data",
    status: (summary?.conflictCount ?? 0) > 0 ? "needs-review" : "ok",
    path: "src/data/references/auto-attached-references.json",
    metrics: [
      `${formatNumber(summary?.autoAttachedCount)} auto`,
      `${formatNumber(summary?.conflictCount)} conflict`,
    ],
    command: "npm run curation:auto-attach",
  });

  addItem({
    id: "source-feedback",
    label: "Source feedback events",
    category: "Runtime data",
    status: "ok",
    path: "src/data/references/source-feedback-events.json",
    metrics: [`${formatNumber(summary?.feedbackEventCount)} event`],
  });

  addItem({
    id: "manual-corrections",
    label: "Manual source corrections",
    category: "Runtime data",
    status: "ok",
    path: "src/data/references/manual-source-corrections.json",
    metrics: [`${formatNumber(summary?.manualCorrectionCount)} düzeltme`],
  });

  addItem({
    id: "research-profiles",
    label: "Research source profiles",
    category: "Policy",
    status: "ok",
    path: "src/data/references/research-source-profiles.json",
    metrics: [`${formatNumber(summary?.researchSourceProfileCount)} profil`],
  });

  addItem({
    id: "source-quality-stats",
    label: "Source quality stats",
    category: "Quality",
    status: "ok",
    path: "src/data/references/source-quality-stats.generated.json",
    metrics: [`${formatNumber(summary?.sourceQualityStatCount)} site`],
    command: "npm run curation:stats",
  });

  return Array.from(items.values()).sort((left, right) => (
    left.category.localeCompare(right.category, "tr-TR") ||
    left.label.localeCompare(right.label, "tr-TR")
  ));
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = `curation-filter-${label.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-")}`;

  return (
    <label htmlFor={id} className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
      >
        <option value={ALL_FILTER_VALUE}>Tümü</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function metricCards(state: ExternalReferenceState) {
  const summary = state.curation?.summary ?? {};
  const backlogPage = state.curation?.backlogPage ?? {};
  const batchReport = state.coverage?.batchReport;

  return [
    {label: "Auto", value: formatNumber(summary.autoAttachedCount), meta: summary.matcherVersion ?? "matcher"},
    {label: "Backlog", value: formatNumber(state.coverage?.missingCuratedEntries), meta: `${formatNumber(backlogPage.returnedCount)} / ${formatNumber(backlogPage.filteredTotal)} sırada`},
    {label: "Batch", value: formatNumber(batchReport?.processedCatalogEntries), meta: `${formatNumber(batchReport?.generatedReviewCandidates)} aday`},
    {label: "Matrix", value: formatNumber(state.coverage?.coverageMatrixEntries), meta: "coverage kırılımı"},
    {label: "Dedupe", value: formatNumber(state.coverage?.duplicateRowsAfterDedupe), meta: `${formatNumber(state.coverage?.cleanedDuplicateRows)} temizlenen`},
    {label: "Conflict", value: formatNumber(summary.conflictCount), meta: "eşleşme"},
    {label: "Removed", value: formatNumber(summary.removedCount), meta: "kullanıcı"},
    {label: "Feedback", value: formatNumber(summary.feedbackEventCount), meta: "event"},
    {label: "Profiles", value: formatNumber(summary.researchSourceProfileCount), meta: "site"},
  ];
}

export function ReferencesCurationDashboard({
  initialState = emptyState,
  initialMessage = "",
}: {
  initialState?: ExternalReferenceState;
  initialMessage?: string;
}) {
  const [state, setState] = useState<ExternalReferenceState>(initialState);
  const [opsToken, setOpsToken] = useState("");
  const [activeOperation, setActiveOperation] = useState<CurationAction | "refresh" | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER_VALUE);
  const [providerFilter, setProviderFilter] = useState(ALL_FILTER_VALUE);
  const [makamFilter, setMakamFilter] = useState(ALL_FILTER_VALUE);
  const [formFilter, setFormFilter] = useState(ALL_FILTER_VALUE);
  const [usulFilter, setUsulFilter] = useState(ALL_FILTER_VALUE);
  const [composerFilter, setComposerFilter] = useState(ALL_FILTER_VALUE);
  const [deletionFilter, setDeletionFilter] = useState(ALL_FILTER_VALUE);
  const [priorityGroupFilter, setPriorityGroupFilter] = useState(ALL_FILTER_VALUE);
  const [backlogOffset, setBacklogOffset] = useState(0);
  const [backlogLimit, setBacklogLimit] = useState(100);
  const [selectedReferenceKeys, setSelectedReferenceKeys] = useState<string[]>([]);
  const [candidateManifestText, setCandidateManifestText] = useState("");
  const [candidateReviewExportText, setCandidateReviewExportText] = useState("");
  const [candidateImportDryRun, setCandidateImportDryRun] = useState(true);
  const [candidateGroupExportText, setCandidateGroupExportText] = useState("");
  const [candidateGroupDecisionText, setCandidateGroupDecisionText] = useState("");
  const [candidateGroupDecisionDryRun, setCandidateGroupDecisionDryRun] = useState(true);
  const [candidateGroupDecisionStatus, setCandidateGroupDecisionStatus] = useState("rejected");
  const [candidateGroupDecisionReason, setCandidateGroupDecisionReason] = useState("batch-reviewed-no-safe-source");
  const [candidateGroupDecisionReviewedAt, setCandidateGroupDecisionReviewedAt] = useState(getTodayIsoDate);
  const [candidateGroupOffset, setCandidateGroupOffset] = useState(0);
  const [candidateGroupLimit, setCandidateGroupLimit] = useState(80);
  const [candidateGroupStatusFilter, setCandidateGroupStatusFilter] = useState(ALL_FILTER_VALUE);
  const [candidateOffset, setCandidateOffset] = useState(0);
  const [candidateLimit, setCandidateLimit] = useState(100);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState(ALL_FILTER_VALUE);
  const [candidateProfileFilter, setCandidateProfileFilter] = useState(ALL_FILTER_VALUE);
  const [artifactCategoryFilter, setArtifactCategoryFilter] = useState(ALL_FILTER_VALUE);
  const [artifactStatusFilter, setArtifactStatusFilter] = useState(ALL_FILTER_VALUE);
  const [artifactQuery, setArtifactQuery] = useState("");
  const [query, setQuery] = useState("");

  const loadState = useCallback(async (
    requestedBacklogOffset = backlogOffset,
    requestedCandidateOffset = candidateOffset,
    requestedCandidateGroupOffset = candidateGroupOffset,
  ) => {
    const params = new URLSearchParams({
      backlogLimit: String(backlogLimit),
      backlogOffset: String(requestedBacklogOffset),
      backlogScope: "missing",
      candidateLimit: String(candidateLimit),
      candidateOffset: String(requestedCandidateOffset),
      groupLimit: String(candidateGroupLimit),
      groupOffset: String(requestedCandidateGroupOffset),
    });

    if (query.trim()) params.set("q", query.trim());
    if (candidateGroupStatusFilter !== ALL_FILTER_VALUE) params.set("groupStatus", candidateGroupStatusFilter);
    if (candidateStatusFilter !== ALL_FILTER_VALUE) params.set("candidateStatus", candidateStatusFilter);
    if (candidateProfileFilter !== ALL_FILTER_VALUE) params.set("candidateProfile", candidateProfileFilter);
    if (makamFilter !== ALL_FILTER_VALUE) params.set("makam", makamFilter);
    if (formFilter !== ALL_FILTER_VALUE) params.set("form", formFilter);
    if (usulFilter !== ALL_FILTER_VALUE) params.set("usul", usulFilter);
    if (composerFilter !== ALL_FILTER_VALUE) params.set("composer", composerFilter);
    if (priorityGroupFilter !== ALL_FILTER_VALUE) params.set("priorityGroup", priorityGroupFilter);

    const response = await fetch(`/api/external-references?${params.toString()}`, {
      cache: "no-store",
      headers: opsToken ? {[OPS_TOKEN_HEADER]: opsToken} : undefined,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Kürasyon durumu okunamadı.");
    }

    const nextState = data as ExternalReferenceState;
    setState(nextState);
    setBacklogOffset(nextState.curation?.backlogPage?.offset ?? requestedBacklogOffset);
    setCandidateOffset(nextState.curation?.candidateReviewPage?.offset ?? requestedCandidateOffset);
    setCandidateGroupOffset(nextState.curation?.candidateReviewGroupPage?.offset ?? requestedCandidateGroupOffset);
  }, [
    backlogLimit,
    backlogOffset,
    candidateGroupLimit,
    candidateGroupOffset,
    candidateGroupStatusFilter,
    candidateLimit,
    candidateOffset,
    candidateProfileFilter,
    candidateStatusFilter,
    composerFilter,
    formFilter,
    makamFilter,
    opsToken,
    priorityGroupFilter,
    query,
    usulFilter,
  ]);

  const runOperation = useCallback(async (action: CurationAction, payload: Record<string, unknown> = {}) => {
    setActiveOperation(action);
    setMessage("");

    try {
      const response = await fetch("/api/external-references", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(opsToken ? {[OPS_TOKEN_HEADER]: opsToken} : {}),
        },
        body: JSON.stringify({action, ...payload}),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Kürasyon operasyonu tamamlanamadı.");
      }

      setState(data.state as ExternalReferenceState);
      setMessage(getOperationMessage(action, data.result));
      return data.result as unknown;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kürasyon operasyonu tamamlanamadı.");
      return null;
    } finally {
      setActiveOperation(null);
    }
  }, [opsToken]);

  const refresh = useCallback(async (
    requestedBacklogOffset = backlogOffset,
    requestedCandidateOffset = candidateOffset,
    requestedCandidateGroupOffset = candidateGroupOffset,
  ) => {
    setActiveOperation("refresh");
    setMessage("");

    try {
      await loadState(requestedBacklogOffset, requestedCandidateOffset, requestedCandidateGroupOffset);
      setMessage("Kürasyon durumu yenilendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kürasyon durumu okunamadı.");
    } finally {
      setActiveOperation(null);
    }
  }, [backlogOffset, candidateGroupOffset, candidateOffset, loadState]);

  const recordFeedback = useCallback((reference: CurationReference, eventType: "user-approved" | "user-prioritized" | "user-removed") => {
    if (!reference.catalogId || !reference.sourceId) return;

    void runOperation("curation-feedback", {
      feedback: {
        catalogId: reference.catalogId,
        sourceId: reference.sourceId,
        eventType,
        reason: `curation-dashboard-${eventType}`,
      },
    });
  }, [runOperation]);

  const filteredReferences = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return (state.curation?.autoAttachedReferences ?? []).filter((reference) => {
      if (statusFilter !== ALL_FILTER_VALUE && reference.status !== statusFilter) return false;
      if (providerFilter !== ALL_FILTER_VALUE && getReferenceProfileLabel(reference) !== providerFilter) return false;
      if (makamFilter !== ALL_FILTER_VALUE && reference.catalog?.makam !== makamFilter) return false;
      if (formFilter !== ALL_FILTER_VALUE && reference.catalog?.form !== formFilter) return false;
      if (usulFilter !== ALL_FILTER_VALUE && reference.catalog?.usul !== usulFilter) return false;
      if (composerFilter !== ALL_FILTER_VALUE && reference.catalog?.composer !== composerFilter) return false;
      if (deletionFilter === "Silme yok" && (reference.status === "delete-requested" || reference.status === "deleted")) return false;
      if (deletionFilter === "Silme bekleyenler" && reference.status !== "delete-requested") return false;
      if (deletionFilter === "Silinenler" && reference.status !== "deleted") return false;

      return matchesQuery([
        reference.catalogId,
        reference.sourceId,
        reference.status,
        reference.confidenceLevel,
        reference.profileId,
        reference.source?.provider,
        reference.source?.title,
        reference.source?.url,
        reference.catalog?.makam,
        reference.catalog?.form,
        reference.catalog?.usul,
        reference.catalog?.title,
        reference.catalog?.composer,
      ], normalizedQuery);
    });
  }, [composerFilter, deletionFilter, formFilter, makamFilter, providerFilter, query, state, statusFilter, usulFilter]);

  const selectedReferences = useMemo(() => {
    const selectedKeySet = new Set(selectedReferenceKeys);
    return filteredReferences.filter((reference) => selectedKeySet.has(getReferenceKey(reference)));
  }, [filteredReferences, selectedReferenceKeys]);

  const toggleReferenceSelection = useCallback((reference: CurationReference, checked: boolean) => {
    const key = getReferenceKey(reference);
    if (key === ":") return;

    setSelectedReferenceKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return [...next];
    });
  }, []);

  const toggleVisibleReferenceSelection = useCallback((checked: boolean) => {
    setSelectedReferenceKeys((current) => {
      const next = new Set(current);
      for (const reference of filteredReferences) {
        const key = getReferenceKey(reference);
        if (key === ":") continue;
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return [...next];
    });
  }, [filteredReferences]);

  const recordBulkFeedback = useCallback((eventType: "user-approved" | "user-prioritized" | "user-removed") => {
    const feedbackEvents = selectedReferences
      .filter((reference) => reference.catalogId && reference.sourceId)
      .map((reference) => ({
        catalogId: reference.catalogId,
        sourceId: reference.sourceId,
        eventType,
        reason: `curation-dashboard-bulk-${eventType}`,
      }));

    if (feedbackEvents.length === 0) return;

    void runOperation("curation-feedback-batch", {feedbackEvents});
    setSelectedReferenceKeys([]);
  }, [runOperation, selectedReferences]);

  const exportCandidateManifest = useCallback(async () => {
    const result = await runOperation("candidate-export");

    if (result && typeof result === "object" && "manifest" in result) {
      setCandidateManifestText(JSON.stringify(result.manifest, null, 2));
    }
  }, [runOperation]);

  const exportCandidateReviewQueue = useCallback(async () => {
    const result = await runOperation("candidate-review-export", {
      candidateReviewQuery: {
        query,
        status: candidateStatusFilter,
        profileId: candidateProfileFilter,
        composer: composerFilter,
      },
    });

    if (result && typeof result === "object" && "manifest" in result) {
      setCandidateReviewExportText(JSON.stringify(result.manifest, null, 2));
    }
  }, [candidateProfileFilter, candidateStatusFilter, composerFilter, query, runOperation]);

  const exportCandidateReviewGroups = useCallback(async () => {
    const result = await runOperation("candidate-review-group-export", {
      candidateReviewGroupQuery: {
        query,
        status: candidateGroupStatusFilter,
        composer: composerFilter,
        priorityGroup: priorityGroupFilter,
      },
    });

    if (result && typeof result === "object" && "manifest" in result) {
      setCandidateGroupExportText(JSON.stringify(result.manifest, null, 2));
    }
  }, [candidateGroupStatusFilter, composerFilter, priorityGroupFilter, query, runOperation]);

  const exportCandidateReviewGroupDecisionRecommendations = useCallback(async () => {
    const result = await runOperation("candidate-review-group-decision-recommendation-export", {
      candidateReviewGroupQuery: {
        query,
        status: candidateGroupStatusFilter,
        composer: composerFilter,
        priorityGroup: priorityGroupFilter,
      },
    });

    if (result && typeof result === "object" && "manifest" in result) {
      setCandidateGroupDecisionText(JSON.stringify(result.manifest, null, 2));
    }
  }, [candidateGroupStatusFilter, composerFilter, priorityGroupFilter, query, runOperation]);

  const exportCandidateReviewGroupDecisionTemplate = useCallback(async () => {
    const result = await runOperation("candidate-review-group-decision-template-export", {
      candidateReviewGroupQuery: {
        query,
        status: candidateGroupStatusFilter,
        composer: composerFilter,
        priorityGroup: priorityGroupFilter,
      },
      candidateReviewGroupDecisionTemplate: {
        status: candidateGroupDecisionStatus,
        reason: candidateGroupDecisionReason,
        reviewedAt: candidateGroupDecisionReviewedAt,
        reviewedBy: "local-operator",
      },
    });

    if (result && typeof result === "object" && "manifest" in result) {
      setCandidateGroupDecisionText(JSON.stringify(result.manifest, null, 2));
    }
  }, [
    candidateGroupDecisionReason,
    candidateGroupDecisionReviewedAt,
    candidateGroupDecisionStatus,
    candidateGroupStatusFilter,
    composerFilter,
    priorityGroupFilter,
    query,
    runOperation,
  ]);

  const importCandidateManifest = useCallback(() => {
    if (!candidateManifestText.trim()) {
      setMessage("Aday manifest JSON girdisi gerekli.");
      return;
    }

    void runOperation("candidate-import", {
      candidateManifestText,
      dryRun: candidateImportDryRun,
    });
  }, [candidateImportDryRun, candidateManifestText, runOperation]);

  const importCandidateReviewGroupDecisions = useCallback(() => {
    if (!candidateGroupDecisionText.trim()) {
      setMessage("Review grup karar JSON girdisi gerekli.");
      return;
    }

    void runOperation("candidate-review-group-decision-import", {
      candidateReviewGroupDecisionManifestText: candidateGroupDecisionText,
      dryRun: candidateGroupDecisionDryRun,
    });
  }, [candidateGroupDecisionDryRun, candidateGroupDecisionText, runOperation]);

  const filteredBacklog = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return (state.curation?.backlogNextBatch ?? []).filter((row) => {
      if (makamFilter !== ALL_FILTER_VALUE && row.makam !== makamFilter) return false;
      if (formFilter !== ALL_FILTER_VALUE && row.form !== formFilter) return false;
      if (usulFilter !== ALL_FILTER_VALUE && row.usul !== usulFilter) return false;
      if (composerFilter !== ALL_FILTER_VALUE && row.composer !== composerFilter) return false;
      if (priorityGroupFilter !== ALL_FILTER_VALUE && row.priorityGroup !== priorityGroupFilter) return false;

      return matchesQuery([
        row.catalogId,
        row.makam,
        row.form,
        row.usul,
        row.title,
        row.composer,
        row.priorityGroup,
        row.curationDecisionStatus,
      ], normalizedQuery);
    });
  }, [composerFilter, formFilter, makamFilter, priorityGroupFilter, query, state, usulFilter]);

  const filterOptions = useMemo(() => {
    const references = state.curation?.autoAttachedReferences ?? [];
    const backlog = state.curation?.backlogNextBatch ?? [];
    const backlogFacets = state.curation?.backlogFacets ?? {};
    const candidateFacets = state.curation?.candidateReviewFacets ?? {};
    const candidateGroupFacets = state.curation?.candidateReviewGroupFacets ?? {};

    return {
      statuses: getUniqueOptions(references.map((reference) => reference.status)),
      providers: getUniqueOptions(references.map(getReferenceProfileLabel)),
      makams: getUniqueOptions([
        ...references.map((reference) => reference.catalog?.makam),
        ...backlog.map((row) => row.makam),
        ...getFacetValues(backlogFacets.makams),
      ]),
      forms: getUniqueOptions([
        ...references.map((reference) => reference.catalog?.form),
        ...backlog.map((row) => row.form),
        ...getFacetValues(backlogFacets.forms),
      ]),
      usuls: getUniqueOptions([
        ...references.map((reference) => reference.catalog?.usul),
        ...backlog.map((row) => row.usul),
        ...getFacetValues(backlogFacets.usuls),
      ]),
      composers: getUniqueOptions([
        ...references.map((reference) => reference.catalog?.composer),
        ...backlog.map((row) => row.composer),
        ...getFacetValues(backlogFacets.composers),
        ...getFacetValues(candidateFacets.composers),
        ...getFacetValues(candidateGroupFacets.composers),
      ]),
      priorityGroups: getUniqueOptions([
        ...backlog.map((row) => row.priorityGroup),
        ...getFacetValues(backlogFacets.priorityGroups),
        ...getFacetValues(candidateGroupFacets.priorityGroups),
      ]),
      candidateStatuses: getUniqueOptions(getFacetValues(candidateFacets.statuses)),
      candidateProfiles: getUniqueOptions(getFacetValues(candidateFacets.profileIds)),
      candidateGroupStatuses: getUniqueOptions(getFacetValues(candidateGroupFacets.statuses)),
    };
  }, [state]);

  const metrics = useMemo(() => metricCards(state), [state]);
  const artifactInventory = useMemo(() => buildArtifactInventory(state), [state]);
  const filteredArtifactInventory = useMemo(() => {
    const normalizedQuery = normalizeFilterText(artifactQuery);

    return artifactInventory.filter((artifact) => {
      if (artifactCategoryFilter !== ALL_FILTER_VALUE && artifact.category !== artifactCategoryFilter) return false;
      if (artifactStatusFilter !== ALL_FILTER_VALUE && artifact.status !== artifactStatusFilter) return false;
      return matchesQuery([
        artifact.label,
        artifact.category,
        artifact.status,
        artifact.path,
        artifact.command,
        ...artifact.metrics,
      ], normalizedQuery);
    });
  }, [artifactCategoryFilter, artifactInventory, artifactQuery, artifactStatusFilter]);
  const artifactFilterOptions = useMemo(() => ({
    categories: getUniqueOptions(artifactInventory.map((artifact) => artifact.category)),
    statuses: getUniqueOptions(artifactInventory.map((artifact) => artifact.status)),
  }), [artifactInventory]);
  const isBusy = activeOperation !== null;
  const backlogPage = state.curation?.backlogPage;
  const candidateManifest = state.curation?.candidateManifest;
  const candidateReviewGroupManifest = state.curation?.candidateReviewGroupManifest;
  const candidateReviewGroupDecisionManifest = state.curation?.candidateReviewGroupDecisionManifest;
  const candidateReviewGroupDecisionRecommendationManifest = state.curation?.candidateReviewGroupDecisionRecommendationManifest;
  const candidateReviewBatchPlanManifest = state.curation?.candidateReviewBatchPlanManifest;
  const sourceIntakeTemplateManifest = state.curation?.sourceIntakeTemplateManifest;
  const sourceIntakeAcceptedImportDryRunManifest = state.curation?.sourceIntakeAcceptedImportDryRunManifest;
  const symbtrLayoutVerificationManifest = state.curation?.symbtrLayoutVerificationManifest;
  const prodCycleAudit = state.curation?.prodCycleAudit;
  const sourceDiscovery = state.curation?.sourceDiscovery;
  const candidateReviewGroupPage = state.curation?.candidateReviewGroupPage;
  const candidateReviewGroups = state.curation?.candidateReviewGroups ?? [];
  const candidateReviewPage = state.curation?.candidateReviewPage;
  const candidateReviewRows = state.curation?.candidateReviewQueue ?? [];
  const batchReport = state.coverage?.batchReport;
  const selectedReferenceCount = selectedReferences.length;
  const visibleSelectableCount = filteredReferences.filter((reference) => getReferenceKey(reference) !== ":").length;
  const allVisibleReferencesSelected = visibleSelectableCount > 0 && selectedReferenceCount >= visibleSelectableCount;

  return (
    <UnifiedLayout>
      <div className={`min-h-screen ${tokens.colors.background.base}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
          <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className={`text-2xl font-semibold ${tokens.colors.text.primary}`}>Kaynak kürasyonu</h1>
              <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                {formatDate(state.curation?.summary?.statsGeneratedAt)}
              </p>
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                void refresh();
              }}
            >
              <input
                type="text"
                name="username"
                value="external-reference-ops"
                readOnly
                autoComplete="username"
                className="sr-only"
                tabIndex={-1}
              />
              <Input
                label="Ops token"
                type="password"
                autoComplete="new-password"
                value={opsToken}
                onChange={(event) => setOpsToken(event.target.value)}
                className="sm:w-64"
              />
              <Button type="submit" variant="outline" disabled={isBusy}>
                Yenile
              </Button>
              <Button type="button" variant="primary" disabled={isBusy} onPress={() => void runOperation("curation-auto-attach")}>
                Auto-attach
              </Button>
              <Button type="button" variant="secondary" disabled={isBusy} onPress={() => void runOperation("curation-stats")}>
                Stats
              </Button>
            </form>
          </header>

          {message && (
            <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} px-4 py-3 text-sm ${tokens.colors.text.primary}`}>
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {metrics.map((metric) => (
              <article key={metric.label} className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-4`}>
                <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>{metric.label}</div>
                <div className={`mt-2 text-2xl font-semibold ${tokens.colors.text.primary}`}>{metric.value}</div>
                <div className={`mt-1 truncate text-xs ${tokens.colors.text.secondary}`}>{metric.meta}</div>
              </article>
            ))}
          </section>

          {prodCycleAudit && (
            <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Prod-cycle audit</h2>
                  <p className={`text-xs ${tokens.colors.text.secondary}`}>
                    {prodCycleAudit.ok ? "OK" : "Review"} · {formatNumber(prodCycleAudit.commandCount)} komut · {formatNumber(prodCycleAudit.errorCount)} hata · {formatNumber(prodCycleAudit.warningCount)} uyarı · {formatDate(prodCycleAudit.generatedAt)}
                  </p>
                  {prodCycleAudit.artifactPath && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{prodCycleAudit.artifactPath}</code>
                  )}
                  {prodCycleAudit.targetScript && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{prodCycleAudit.targetScript}</code>
                  )}
                </div>
                <div className="grid w-full gap-2 text-sm sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Catalog</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(prodCycleAudit.processedCatalogEntries)} / {formatNumber(prodCycleAudit.totalCatalogEntries)}</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Queue</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(prodCycleAudit.candidateReviewQueueEntries)} aday · {formatNumber(prodCycleAudit.candidateReviewGroupEntries)} grup</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Safety</div>
                    <div className={tokens.colors.text.primary}>{prodCycleAudit.autoAttachAcceptedOnly ? "accepted-only" : "review"} · {formatNumber(prodCycleAudit.duplicateRowsAfterDedupe)} duplicate</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>PDF</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(prodCycleAudit.pdfVerifiedMeasureBoxes)} verified · {prodCycleAudit.pdfVerificationManifestUnchanged ? "hash OK" : "hash review"}</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {sourceDiscovery && (
            <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Discovery runs</h2>
                  <p className={`text-xs ${tokens.colors.text.secondary}`}>
                    {sourceDiscovery.ok ? "Dry-run OK" : "Review"} · {formatNumber(sourceDiscovery.providerCount)} provider · {formatNumber(sourceDiscovery.verificationErrorCount)} hata · {formatDate(sourceDiscovery.generatedAt)}
                  </p>
                  {sourceDiscovery.artifactPath && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.artifactPath}</code>
                  )}
                  {sourceDiscovery.targetScript && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.targetScript}</code>
                  )}
                  {sourceDiscovery.targetImportDryRun && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.targetImportDryRun}</code>
                  )}
                </div>
                <div className="grid w-full gap-2 text-sm sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-4">
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Scope</div>
                    <div className={tokens.colors.text.primary}>{sourceDiscovery.scope ?? "missing"} · {formatNumber(sourceDiscovery.processedMissingCatalogEntries)} / {formatNumber(sourceDiscovery.totalMissingCatalogEntries)}</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Candidates</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.candidateCount)} aday · {formatNumber(sourceDiscovery.acceptedReadyCount)} ready</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Queue</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.needsReviewCount)} review · {formatNumber(sourceDiscovery.conflictCount)} conflict · {formatNumber(sourceDiscovery.deferredCount)} deferred</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Safety</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.directAutoAttachCount)} direct attach · {formatNumber(sourceDiscovery.negativeCacheCount)} cache</div>
                  </div>
                </div>
              </div>
              {(sourceDiscovery.providerCoverage?.length ?? 0) > 0 && (
                <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-4">
                  {sourceDiscovery.providerCoverage?.map((provider) => (
                    <article key={provider.providerProfileId} className={`min-w-0 border ${tokens.colors.border.base} ${tokens.radius.md} p-3`}>
                      <div className={`text-sm font-semibold ${tokens.colors.text.primary}`}>{provider.providerProfileId}</div>
                      <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{provider.connector} · {provider.mode}</div>
                      <div className={`mt-2 text-xs ${tokens.colors.text.secondary}`}>
                        {formatNumber(provider.candidateCount)} aday · {formatNumber(provider.acceptedReadyCount)} ready · {formatNumber(provider.negativeCacheCount)} cache
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Artifact izleme</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(filteredArtifactInventory.length)} gösteriliyor · {formatNumber(artifactInventory.length)} artifact · batch pipeline kanıtları, manifestler ve runtime veri dosyaları
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3 lg:max-w-3xl">
                <label htmlFor="artifact-search" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Artifact ara
                  <input
                    id="artifact-search"
                    value={artifactQuery}
                    onChange={(event) => setArtifactQuery(event.target.value)}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  />
                </label>
                <FilterSelect label="Artifact kategori" value={artifactCategoryFilter} options={artifactFilterOptions.categories} onChange={setArtifactCategoryFilter} />
                <FilterSelect label="Artifact durum" value={artifactStatusFilter} options={artifactFilterOptions.statuses} onChange={setArtifactStatusFilter} />
              </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredArtifactInventory.length === 0 ? (
                <div className={`col-span-full py-6 text-sm ${tokens.colors.text.secondary}`}>Artifact yok.</div>
              ) : (
                filteredArtifactInventory.map((artifact) => (
                  <article key={artifact.id} className={`min-w-0 border ${tokens.colors.border.base} ${tokens.radius.md} p-3`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-sm border border-[var(--color-border)] px-2 py-1 text-xs ${tokens.colors.text.secondary}`}>{artifact.category}</span>
                      <span className={`rounded-sm px-2 py-1 text-xs ${artifact.status === "ok" || artifact.status === "dry-run" ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-warning)] text-[var(--color-text-primary)]"}`}>
                        {getArtifactStatusLabel(artifact.status)}
                      </span>
                    </div>
                    <h3 className={`mt-2 text-sm font-semibold ${tokens.colors.text.primary}`}>{artifact.label}</h3>
                    <code className="mt-2 block break-all text-xs text-[var(--color-text-primary)]">{artifact.path}</code>
                    <div className={`mt-2 flex flex-wrap gap-2 text-xs ${tokens.colors.text.secondary}`}>
                      {artifact.metrics.map((metric) => (
                        <span key={metric} className="rounded-sm bg-[var(--color-background-muted)] px-2 py-1">{metric}</span>
                      ))}
                    </div>
                    {artifact.command && (
                      <code className="mt-2 block break-all text-xs text-[var(--color-text-primary)]">{artifact.command}</code>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Aday manifest import/export</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(candidateManifest?.candidateCount)} aday · {formatNumber(candidateManifest?.acceptedCount)} accepted · {formatNumber(candidateManifest?.needsReviewCount)} review · {formatNumber(candidateManifest?.rejectedCount)} rejected · {formatNumber(candidateManifest?.conflictCount)} conflict · {formatNumber(state.coverage?.candidateReviewQueueEntries)} queue
                </p>
                {batchReport && (
                  <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                    Batch raporu: {formatNumber(batchReport.processedCatalogEntries)} eser işlendi · {formatNumber(batchReport.curatedBeforeBulkCandidates)} önce · +{formatNumber(batchReport.newlyAcceptedCatalogEntries)} accepted · {formatNumber(batchReport.missingAfterBatch)} eksik · {formatNumber(batchReport.deferredMissingEntries)} deferred · {formatNumber(batchReport.validationGates?.length)} kapı
                    {typeof batchReport.recommendedReviewGroupDecisions === "number" && ` · ${formatNumber(batchReport.recommendedReviewGroupDecisions)} öneri`}
                    {typeof batchReport.plannedSourceIntakeRows === "number" && ` · ${formatNumber(batchReport.plannedSourceIntakeRows)} intake`}
                  </p>
                )}
                {candidateManifest?.artifactPath && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{candidateManifest.artifactPath}</code>
                )}
                {state.coverage?.candidateReviewQueueJson && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{state.coverage.candidateReviewQueueJson}</code>
                )}
                {state.coverage?.coverageMatrixJson && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">
                    {state.coverage.coverageMatrixJson} · {formatNumber(state.coverage.coverageMatrixEntries)} kırılım
                  </code>
                )}
                {state.coverage?.dedupeReportJson && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">
                    {state.coverage.dedupeReportJson} · {formatNumber(state.coverage.duplicateRowsAfterDedupe)} duplicate · {formatNumber(state.coverage.cleanedDuplicateRows)} temizlenen
                  </code>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" disabled={isBusy} onPress={() => void exportCandidateManifest()}>
                  Manifesti dışa aktar
                </Button>
                <label className={`flex items-center gap-2 text-sm ${tokens.colors.text.secondary}`}>
                  <input
                    type="checkbox"
                    checked={candidateImportDryRun}
                    onChange={(event) => setCandidateImportDryRun(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Dry run
                </label>
                <Button variant="secondary" disabled={isBusy || !candidateManifestText.trim()} onPress={importCandidateManifest}>
                  Manifesti içe aktar
                </Button>
              </div>
            </div>
            <div className="px-4 py-3">
              <label htmlFor="candidate-manifest-json" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                Aday manifest JSON
                <textarea
                  id="candidate-manifest-json"
                  value={candidateManifestText}
                  onChange={(event) => setCandidateManifestText(event.target.value)}
                  className={`min-h-40 w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 font-mono text-xs ${tokens.colors.text.primary}`}
                />
              </label>
            </div>
          </section>

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Aday review grupları</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(candidateReviewGroupPage?.returnedCount ?? candidateReviewGroupManifest?.visibleGroupCount ?? candidateReviewGroups.length)} gösteriliyor · {formatNumber(candidateReviewGroupPage?.filteredTotal ?? candidateReviewGroupManifest?.groupCount)} filtreli · {formatNumber(candidateReviewGroupManifest?.groupCount)} grup
                </p>
                {candidateReviewGroupManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">{candidateReviewGroupManifest.artifactPath}</code>
                )}
                {candidateReviewGroupDecisionManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {candidateReviewGroupDecisionManifest.artifactPath} · {formatNumber(candidateReviewGroupDecisionManifest.decisionCount)} karar
                  </code>
                )}
                {candidateReviewGroupDecisionRecommendationManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {candidateReviewGroupDecisionRecommendationManifest.artifactPath} · {formatNumber(candidateReviewGroupDecisionRecommendationManifest.decisionCount)} öneri
                  </code>
                )}
                {candidateReviewBatchPlanManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {candidateReviewBatchPlanManifest.artifactPath} · {formatNumber(candidateReviewBatchPlanManifest.packetCount)} paket · {formatNumber(candidateReviewBatchPlanManifest.plannedGroupCount)} grup · {formatNumber(candidateReviewBatchPlanManifest.plannedCandidateCount)} aday
                  </code>
                )}
                {sourceIntakeTemplateManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {sourceIntakeTemplateManifest.artifactPath} · {formatNumber(sourceIntakeTemplateManifest.packetCount)} paket · {formatNumber(sourceIntakeTemplateManifest.templateRowCount)} boş kaynak satırı · {formatNumber(sourceIntakeTemplateManifest.plannedCandidateCount)} aday
                    {sourceIntakeTemplateManifest.targetScript ? ` · ${sourceIntakeTemplateManifest.targetScript}` : ""}
                  </code>
                )}
                {sourceIntakeAcceptedImportDryRunManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {sourceIntakeAcceptedImportDryRunManifest.artifactPath} · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted dry-run · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationErrorCount)} hata
                  </code>
                )}
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-6xl lg:grid-cols-9">
                <FilterSelect label="Grup durum" value={candidateGroupStatusFilter} options={filterOptions.candidateGroupStatuses} onChange={(value) => {
                  setCandidateGroupStatusFilter(value);
                  setCandidateGroupOffset(0);
                }} />
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Grup sayfa
                  <select
                    value={candidateGroupLimit}
                    onChange={(event) => {
                      setCandidateGroupLimit(Number(event.target.value));
                      setCandidateGroupOffset(0);
                    }}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  >
                    <option value={80}>80</option>
                    <option value={160}>160</option>
                    <option value={320}>320</option>
                  </select>
                </label>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewGroupPage?.previousOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateOffset, candidateReviewGroupPage?.previousOffset ?? 0)}
                >
                  Grup önceki
                </Button>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewGroupPage?.nextOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateOffset, candidateReviewGroupPage?.nextOffset ?? candidateGroupOffset + candidateGroupLimit)}
                >
                  Grup sonraki
                </Button>
                <Button variant="secondary" disabled={isBusy} onPress={() => void exportCandidateReviewGroups()}>
                  Grup dışa aktar
                </Button>
                <Button variant="secondary" disabled={isBusy} onPress={() => void exportCandidateReviewGroupDecisionRecommendations()}>
                  Karar önerisi
                </Button>
                <FilterSelect
                  label="Karar durum"
                  value={candidateGroupDecisionStatus}
                  options={candidateGroupDecisionStatusOptions}
                  onChange={setCandidateGroupDecisionStatus}
                />
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Karar tarihi
                  <input
                    type="date"
                    value={candidateGroupDecisionReviewedAt}
                    onChange={(event) => setCandidateGroupDecisionReviewedAt(event.target.value)}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  />
                </label>
                <Button
                  variant="secondary"
                  disabled={isBusy || !candidateGroupDecisionReason.trim() || !candidateGroupDecisionReviewedAt.trim()}
                  onPress={() => void exportCandidateReviewGroupDecisionTemplate()}
                >
                  Karar şablonu
                </Button>
                <label className={`flex items-center gap-2 text-sm ${tokens.colors.text.secondary}`}>
                  <input
                    type="checkbox"
                    checked={candidateGroupDecisionDryRun}
                    onChange={(event) => setCandidateGroupDecisionDryRun(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Karar dry run
                </label>
                <Button
                  variant="primary"
                  disabled={isBusy || !candidateGroupDecisionText.trim()}
                  onPress={importCandidateReviewGroupDecisions}
                >
                  Karar içe aktar
                </Button>
              </div>
            </div>
            {symbtrLayoutVerificationManifest && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <h3 className={`text-sm font-semibold ${tokens.colors.text.primary}`}>PDF layout doğrulama</h3>
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {symbtrLayoutVerificationManifest.candidateStatus ?? "bilinmiyor"} · {formatNumber(symbtrLayoutVerificationManifest.candidateEntries)} aday eser · {formatNumber(symbtrLayoutVerificationManifest.unresolvedCandidateEntries)} bekleyen
                    </p>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Verified</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(symbtrLayoutVerificationManifest.verifiedEntries)} eser · {formatNumber(symbtrLayoutVerificationManifest.verifiedMeasureBoxes)} ölçü kutusu
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Review batch</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(symbtrLayoutVerificationManifest.reviewBatchPacketCount)} paket · {formatNumber(symbtrLayoutVerificationManifest.reviewBatchCandidateRows)} aday satır
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Validation</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(symbtrLayoutVerificationManifest.validationErrorCount)} hata · {symbtrLayoutVerificationManifest.fingerprintAlgorithm ?? "-"}
                    </div>
                  </div>
                </div>
                {symbtrLayoutVerificationManifest.promotionPolicy && (
                  <p className={`mt-3 text-xs ${tokens.colors.text.secondary}`}>{symbtrLayoutVerificationManifest.promotionPolicy}</p>
                )}
                <div className="mt-3 grid gap-1">
                  {symbtrLayoutVerificationManifest.summaryPath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.summaryPath}
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.reviewTemplatePath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.reviewTemplatePath} · {formatNumber(symbtrLayoutVerificationManifest.reviewTemplateEntryCount)} eser · {formatNumber(symbtrLayoutVerificationManifest.reviewTemplateCandidateRows)} aday satır
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.reviewBatchPlanPath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.reviewBatchPlanPath} · {formatNumber(symbtrLayoutVerificationManifest.reviewBatchPacketCount)} paket
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.emptyImportDryRunPath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.emptyImportDryRunPath} · {formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunInputEntries)} import girişi · {formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunVerifiedMeasureBoxes)} verified
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.emptyImportTemplatePath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.emptyImportTemplatePath}
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.targetScript && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.targetScript}
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.emptyImportDryRunScript && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.emptyImportDryRunScript}
                    </code>
                  )}
                </div>
              </div>
            )}
            {sourceIntakeAcceptedImportDryRunManifest && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <h3 className={`text-sm font-semibold ${tokens.colors.text.primary}`}>Source intake accepted dry-run</h3>
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {sourceIntakeAcceptedImportDryRunManifest.dryRun ? "dry-run" : "eksik"} · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.httpsAcceptedCount)} HTTPS
                    </p>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Evidence</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(sourceIntakeAcceptedImportDryRunManifest.evidenceCompleteCount)} tam · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationGateCount)} kapı
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Import sonucu</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(sourceIntakeAcceptedImportDryRunManifest.dryRunAddedCandidateCount)} eklenecek · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.dryRunSkippedDuplicateCount)} duplicate
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Validation</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationErrorCount)} hata · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.dryRunOutputCandidateCount)} output
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-1">
                  {sourceIntakeAcceptedImportDryRunManifest.input && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {sourceIntakeAcceptedImportDryRunManifest.input}
                    </code>
                  )}
                  {sourceIntakeAcceptedImportDryRunManifest.targetScript && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {sourceIntakeAcceptedImportDryRunManifest.targetScript}
                    </code>
                  )}
                </div>
              </div>
            )}
            {candidateGroupExportText && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <label htmlFor="candidate-review-group-export-json" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Filtreli review grup JSON
                  <textarea
                    id="candidate-review-group-export-json"
                    value={candidateGroupExportText}
                    readOnly
                    className={`min-h-32 w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 font-mono text-xs ${tokens.colors.text.primary}`}
                  />
                </label>
              </div>
            )}
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <label htmlFor="candidate-review-group-decision-reason" className={`mb-3 flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                Review grup karar nedeni
                <input
                  id="candidate-review-group-decision-reason"
                  value={candidateGroupDecisionReason}
                  onChange={(event) => setCandidateGroupDecisionReason(event.target.value)}
                  className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                />
              </label>
              <label htmlFor="candidate-review-group-decision-json" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                Review grup karar JSON
                <textarea
                  id="candidate-review-group-decision-json"
                  value={candidateGroupDecisionText}
                  onChange={(event) => setCandidateGroupDecisionText(event.target.value)}
                  placeholder='{"version":1,"decisions":[{"groupId":"...:review-group","catalogId":"...","status":"rejected","reason":"batch-reviewed-no-safe-source","reviewedAt":"2026-06-01","reviewedBy":"local-operator"}]}'
                  className={`min-h-28 w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 font-mono text-xs ${tokens.colors.text.primary}`}
                />
              </label>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Profil seti</th>
                    <th className="px-4 py-3 font-medium">Aksiyon</th>
                    <th className="px-4 py-3 font-medium">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateReviewGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    candidateReviewGroups.slice(0, 20).map((group) => (
                      <tr key={group.groupId ?? group.catalogId} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3">
                          <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(group.status)}`}>
                            {group.status ?? "-"}
                          </span>
                          {group.deferredFromNextBatch && <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>deferred</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${tokens.colors.text.primary}`}>{group.title ?? "-"}</div>
                          <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{[group.makam, group.form, group.usul].filter(Boolean).join(" / ") || "-"}</div>
                          {group.catalogId && <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{group.catalogId}</code>}
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          <div>{formatNumber(group.candidateCount)} aday · {formatNumber(group.profileCount)} profil</div>
                          <div className="mt-1 text-xs">{group.profiles?.join(" / ") || "-"}</div>
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{group.reviewAction ?? "-"}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {formatNumber(group.highestReviewConfidenceScore)}
                          {group.confidenceLevels && group.confidenceLevels.length > 0 && (
                            <div className="mt-1 text-xs">{group.confidenceLevels.join(" / ")}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Aday review queue</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(candidateReviewPage?.returnedCount ?? candidateReviewRows.length)} gösteriliyor · {formatNumber(candidateReviewPage?.filteredTotal ?? candidateReviewRows.length)} filtreli · {formatNumber(candidateReviewPage?.totalRows)} toplam
                </p>
                {candidateReviewPage?.artifactPath && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{candidateReviewPage.artifactPath}</code>
                )}
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-6">
                <FilterSelect label="Aday durum" value={candidateStatusFilter} options={filterOptions.candidateStatuses} onChange={(value) => {
                  setCandidateStatusFilter(value);
                  setCandidateOffset(0);
                }} />
                <FilterSelect label="Aday profil" value={candidateProfileFilter} options={filterOptions.candidateProfiles} onChange={(value) => {
                  setCandidateProfileFilter(value);
                  setCandidateOffset(0);
                }} />
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Aday sayfa
                  <select
                    value={candidateLimit}
                    onChange={(event) => {
                      setCandidateLimit(Number(event.target.value));
                      setCandidateOffset(0);
                    }}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  >
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </label>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewPage?.previousOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateReviewPage?.previousOffset ?? 0)}
                >
                  Aday önceki
                </Button>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewPage?.nextOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateReviewPage?.nextOffset ?? candidateOffset + candidateLimit)}
                >
                  Aday sonraki
                </Button>
                <Button variant="secondary" disabled={isBusy} onPress={() => void exportCandidateReviewQueue()}>
                  Queue dışa aktar
                </Button>
              </div>
            </div>

            {candidateReviewExportText && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <label htmlFor="candidate-review-export-json" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Filtreli review queue JSON
                  <textarea
                    id="candidate-review-export-json"
                    value={candidateReviewExportText}
                    readOnly
                    className={`min-h-32 w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 font-mono text-xs ${tokens.colors.text.primary}`}
                  />
                </label>
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Profil</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Güven</th>
                    <th className="px-4 py-3 font-medium">Arama</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateReviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    candidateReviewRows.map((row) => (
                      <tr key={row.candidateId ?? `${row.catalogId}-${row.profileId}`} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3">
                          <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(row.status)}`}>
                            {row.status ?? "-"}
                          </span>
                          {row.statusReason && <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{row.statusReason}</div>}
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          <div className="font-medium text-[var(--color-text-primary)]">{row.profileLabel ?? row.profileId ?? "-"}</div>
                          <div className="mt-1 text-xs">{[row.profileId, row.provider].filter(Boolean).join(" / ") || "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${tokens.colors.text.primary}`}>{row.title ?? "-"}</div>
                          <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{[row.makam, row.form, row.usul].filter(Boolean).join(" / ") || "-"}</div>
                          {row.catalogId && <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{row.catalogId}</code>}
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {row.reviewConfidenceLevel ?? "-"} · {formatNumber(row.reviewConfidenceScore)}
                          {row.scoreReasons && row.scoreReasons.length > 0 && (
                            <div className="mt-1 text-xs">{row.scoreReasons.slice(0, 3).join(" / ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.searchUrl ? (
                            <a
                              href={row.searchUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                            >
                              Aday ara
                            </a>
                          ) : (
                            <span className={tokens.colors.text.secondary}>-</span>
                          )}
                          {row.searchQuery && <div className={`mt-2 line-clamp-2 text-xs ${tokens.colors.text.secondary}`}>{row.searchQuery}</div>}
                          {row.queryFields && row.queryFields.length > 0 && (
                            <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>Alanlar: {row.queryFields.join(" / ")}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Auto-attached kaynaklar</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>{formatNumber(filteredReferences.length)} kayıt · {formatNumber(selectedReferenceCount)} seçili</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="xs" variant="outline" disabled={isBusy || selectedReferenceCount === 0} onPress={() => recordBulkFeedback("user-approved")}>
                    Toplu onayla
                  </Button>
                  <Button size="xs" variant="secondary" disabled={isBusy || selectedReferenceCount === 0} onPress={() => recordBulkFeedback("user-prioritized")}>
                    Toplu öne al
                  </Button>
                  <Button size="xs" variant="danger" disabled={isBusy || selectedReferenceCount === 0} onPress={() => recordBulkFeedback("user-removed")}>
                    Toplu kaldır
                  </Button>
                </div>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-6xl xl:grid-cols-8">
                <Input
                  label="Ara"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="xl:col-span-2"
                />
                <FilterSelect label="Durum" value={statusFilter} options={filterOptions.statuses} onChange={setStatusFilter} />
                <FilterSelect label="Provider" value={providerFilter} options={filterOptions.providers} onChange={setProviderFilter} />
                <FilterSelect label="Makam" value={makamFilter} options={filterOptions.makams} onChange={setMakamFilter} />
                <FilterSelect label="Usul" value={usulFilter} options={filterOptions.usuls} onChange={setUsulFilter} />
                <FilterSelect label="Form" value={formFilter} options={filterOptions.forms} onChange={setFormFilter} />
                <FilterSelect label="Besteci" value={composerFilter} options={filterOptions.composers} onChange={setComposerFilter} />
                <FilterSelect label="Silme" value={deletionFilter} options={deletionFilterOptions} onChange={setDeletionFilter} />
                <FilterSelect label="Öncelik" value={priorityGroupFilter} options={filterOptions.priorityGroups} onChange={setPriorityGroupFilter} />
                <div className="flex items-end">
                  <Button variant="outline" disabled={isBusy} onPress={() => void refresh(0)}>
                    Filtrele
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1240px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">
                      <input
                        type="checkbox"
                        aria-label="Görünenleri seç"
                        checked={allVisibleReferencesSelected}
                        disabled={visibleSelectableCount === 0}
                        onChange={(event) => toggleVisibleReferenceSelection(event.target.checked)}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Makam / Form / Usul</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Profil / Provider</th>
                    <th className="px-4 py-3 font-medium">Güven</th>
                    <th className="px-4 py-3 font-medium">Kanıt</th>
                    <th className="px-4 py-3 font-medium">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferences.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    filteredReferences.map((reference) => (
                      <tr key={`${reference.catalogId}-${reference.sourceId}`} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Satırı seç ${reference.sourceId ?? reference.catalogId ?? "kaynak"}`}
                            checked={selectedReferenceKeys.includes(getReferenceKey(reference))}
                            onChange={(event) => toggleReferenceSelection(reference, event.target.checked)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(reference.status)}`}>
                            {reference.status ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${tokens.colors.text.primary}`}>
                            {reference.catalog?.title ?? "-"}
                          </div>
                          <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                            {reference.catalog?.composer ?? "-"}
                          </div>
                          {reference.catalogId ? (
                            <Link
                              href={`/references/curation/${encodeURIComponent(reference.catalogId)}`}
                              className="mt-1 block break-all text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                            >
                              {reference.catalogId}
                            </Link>
                          ) : (
                            <span className="text-xs text-[var(--color-text-primary)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${tokens.colors.text.primary}`}>{renderCatalogLine(reference.catalog)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="break-all text-xs text-[var(--color-text-primary)]">
                            {getSourceLabel(reference)}
                          </code>
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{getReferenceProfileLabel(reference)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {reference.confidenceLevel ?? "-"} · {formatNumber(reference.confidenceScore)}
                        </td>
                        <td className={`max-w-sm px-4 py-3 ${tokens.colors.text.secondary}`}>
                          <div className="line-clamp-2">{reference.matchReasons?.join(", ") || "-"}</div>
                          {reference.conflicts && reference.conflicts.length > 0 && (
                            <div className="mt-1 text-[var(--color-error)]">{reference.conflicts.join(", ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="xs" variant="outline" disabled={isBusy} onPress={() => recordFeedback(reference, "user-approved")}>
                              Onayla
                            </Button>
                            <Button size="xs" variant="secondary" disabled={isBusy} onPress={() => recordFeedback(reference, "user-prioritized")}>
                              Öne al
                            </Button>
                            <Button size="xs" variant="danger" disabled={isBusy} onPress={() => recordFeedback(reference, "user-removed")}>
                              Kaldır
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Sıradaki kaynak backlog batch listesi</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(backlogPage?.returnedCount ?? filteredBacklog.length)} gösteriliyor · {formatNumber(backlogPage?.filteredTotal ?? filteredBacklog.length)} filtreli · {formatNumber(backlogPage?.activeQueueCount)} aktif · {formatNumber(backlogPage?.deferredCount)} deferred
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Sayfa
                  <select
                    value={backlogLimit}
                    onChange={(event) => {
                      setBacklogLimit(Number(event.target.value));
                      setBacklogOffset(0);
                    }}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  >
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </label>
                <Button
                  variant="outline"
                  disabled={isBusy || backlogPage?.previousOffset == null}
                  onPress={() => void refresh(backlogPage?.previousOffset ?? 0)}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  disabled={isBusy || backlogPage?.nextOffset == null}
                  onPress={() => void refresh(backlogPage?.nextOffset ?? backlogOffset + backlogLimit)}
                >
                  Sonraki
                </Button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">Öncelik</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Makam / Form / Usul</th>
                    <th className="px-4 py-3 font-medium">Format</th>
                    <th className="px-4 py-3 font-medium">Queue</th>
                    <th className="px-4 py-3 font-medium">Nota arama</th>
                    <th className="px-4 py-3 font-medium">Kayıt arama</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBacklog.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    filteredBacklog.map((row) => {
                      const hintUrl = getFirstHintUrl(row);

                      return (
                        <tr key={row.catalogId} className="border-b border-[var(--color-border)] last:border-b-0">
                          <td className="px-4 py-3">
                            <div className={`text-sm font-medium ${tokens.colors.text.primary}`}>{row.priorityGroup ?? "-"}</div>
                            <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{formatNumber(row.curationPriorityScore)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-medium ${tokens.colors.text.primary}`}>{row.title ?? "-"}</div>
                            <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{row.composer ?? "-"}</div>
                            {row.catalogId && (
                              <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{row.catalogId}</code>
                            )}
                          </td>
                          <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                            {[row.makam, row.form, row.usul].filter(Boolean).join(" / ") || "-"}
                          </td>
                          <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatBacklogFormats(row)}</td>
                          <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                            <div>{row.deferredFromNextBatch ? "deferred" : "active"}</div>
                            {row.curationDecisionStatus && (
                              <div className="mt-1 text-xs text-[var(--color-warning)]">{row.curationDecisionStatus}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {row.scoreSearchUrl && (
                                <a
                                  href={row.scoreSearchUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                                >
                                  Genel
                                </a>
                              )}
                              {hintUrl && (
                                <a
                                  href={hintUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                                >
                                  Site
                                </a>
                              )}
                              {!row.scoreSearchUrl && !hintUrl && <span className={tokens.colors.text.secondary}>-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.recordingSearchUrl ? (
                              <a
                                href={row.recordingSearchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                              >
                                YouTube
                              </a>
                            ) : (
                              <span className={tokens.colors.text.secondary}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
            <div className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Site kalitesi</h2>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                      <th className="px-4 py-3 font-medium">Site</th>
                      <th className="px-4 py-3 font-medium">Accepted</th>
                      <th className="px-4 py-3 font-medium">Removed</th>
                      <th className="px-4 py-3 font-medium">Mismatch</th>
                      <th className="px-4 py-3 font-medium">Embed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state.curation?.sourceQualityStats ?? []).map((stat) => (
                      <tr key={stat.profileId} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{stat.profileId}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatNumber(stat.acceptedCount)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatNumber(stat.removedCount)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatNumber(stat.mismatchCount)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {formatNumber(stat.embedSuccessCount)} / {formatNumber(stat.embedFailureCount)}
                        </td>
                      </tr>
                    ))}
                    {(state.curation?.sourceQualityStats ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                          Kayıt yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Feedback log</h2>
              </div>
              <div className="flex max-h-[28rem] flex-col overflow-y-auto">
                {(state.curation?.feedbackEvents ?? []).length === 0 ? (
                  <div className={`px-4 py-8 text-sm ${tokens.colors.text.secondary}`}>Kayıt yok.</div>
                ) : (
                  (state.curation?.feedbackEvents ?? []).map((event) => (
                    <article key={event.eventId ?? `${event.catalogId}-${event.sourceId}-${event.createdAt}`} className="border-b border-[var(--color-border)] px-4 py-3 last:border-b-0">
                      <div className={`text-sm font-medium ${tokens.colors.text.primary}`}>{event.eventType ?? "-"}</div>
                      <div className={`mt-1 break-all text-xs ${tokens.colors.text.secondary}`}>{event.catalogId}</div>
                      <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{formatDate(event.createdAt)}</div>
                    </article>
                  ))
                )}
              </div>
            </aside>
          </section>
        </div>
      </div>
    </UnifiedLayout>
  );
}

function getOperationMessage(action: CurationAction, result: unknown): string {
  if (!result || typeof result !== "object") {
    return "Operasyon tamamlandı.";
  }

  const summary = result as Record<string, unknown>;

  if (action === "candidate-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Aday manifest dışa aktarıldı: ${formatNumber(exportSummary.candidateCount)} aday.`;
  }

  if (action === "candidate-review-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Review queue dışa aktarıldı: ${formatNumber(exportSummary.exportedCount)} aday.`;
  }

  if (action === "candidate-review-group-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Review grupları dışa aktarıldı: ${formatNumber(exportSummary.exportedCount)} grup.`;
  }

  if (action === "candidate-review-group-decision-template-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Review grup karar şablonu üretildi: ${formatNumber(exportSummary.exportedCount)} karar.`;
  }

  if (action === "candidate-review-group-decision-recommendation-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Review grup karar önerileri üretildi: ${formatNumber(exportSummary.exportedCount)} karar.`;
  }

  if (action === "candidate-review-group-decision-import") {
    return `Review grup kararları işlendi: ${formatNumber(summary.outputDecisionCount)} karar.`;
  }

  if (action === "candidate-import") {
    return `Aday manifest içe aktarıldı: ${formatNumber(summary.addedCandidateCount)} eklendi, ${formatNumber(summary.skippedDuplicateCount)} duplicate atlandı.`;
  }

  if (action === "curation-auto-attach") {
    return `Auto-attach tamamlandı: ${formatNumber(summary.outputReferenceCount)} kayıt.`;
  }

  if (action === "curation-stats") {
    return `Stats tamamlandı: ${formatNumber(summary.sourceQualityStats)} profil.`;
  }

  if (action === "curation-feedback") {
    return "Feedback kaydedildi.";
  }

  if (action === "curation-feedback-batch") {
    return `Toplu feedback kaydedildi: ${formatNumber(summary.eventCount)} event.`;
  }

  return "Kürasyon doğrulandı.";
}

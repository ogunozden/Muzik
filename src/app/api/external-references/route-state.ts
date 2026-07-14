import path from "node:path";
import {readFile} from "node:fs/promises";
import {
  buildCurationState,
  getCatalogMetadata,
  type CurationReference,
  type CurationStat,
  type ExternalReferenceSource,
} from "./curation-state";
import {
  applyBacklogQuery,
  applyCandidateReviewGroupQuery,
  applyCandidateReviewQuery,
  buildBacklogFacets,
  buildCandidateReviewFacets,
  buildCandidateReviewGroupFacets,
  clampBacklogOffset,
  isMissingBacklogRow,
} from "./curation-query";
import type {BacklogQuery, CandidateReviewGroup, CandidateReviewGroupQuery, CandidateReviewQuery, CandidateReviewRow, CurationBacklogRow} from "./curation-query";
import * as CFG from "./route-config";
import {SOURCE_TERMINAL_FEEDBACK_EVENT_TYPES} from "./route-feedback";
import type {
  BulkCandidateManifest,
  CandidateReviewBatchPlanManifest,
  CandidateReviewGroupDecisionManifest,
  CandidateReviewGroupDecisionRecommendationManifest,
  OperationBody,
  ProdCycleSummary,
  SourceDiscoveryAcceptedImportReadyManifest,
  SourceDiscoveryCoverageDeltaManifest,
  SourceDiscoveryNegativeCacheManifest,
  SourceDiscoveryProviderCoverageManifest,
  SourceDiscoveryRunManifest,
  SourceDiscoveryVerificationManifest,
  SourceIntakeAcceptedImportDryRunManifest,
  SourceIntakeTemplateManifest,
  SourceProviderVerificationRunManifest,
  SourceTerminalDecisionManifest,
  SourceTerminalFeedbackManifest,
  SymbTrLayoutVerificationSummary,
} from "./route-types";


function toProjectRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

export async function readJsonOrNull<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function getCountByStatus(mappings: Array<{status?: string}> | undefined, status: string): number {
  return mappings?.filter((mapping) => mapping.status === status).length ?? 0;
}

function enrichBacklogRow(row: CurationBacklogRow): CurationBacklogRow {
  const catalog = getCatalogMetadata(row.catalogId);
  if (!catalog) return row;

  return {
    catalogId: row.catalogId ?? catalog.id,
    makam: row.makam ?? catalog.makam,
    form: row.form ?? catalog.form,
    usul: row.usul ?? catalog.usul,
    title: row.title ?? catalog.title,
    composer: row.composer ?? catalog.composer,
    availableFormats: row.availableFormats ?? catalog.formats.join("|"),
    ...row,
  };
}

function parseBoundedInteger(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseNonNegativeInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeFilterValue(value: string | null): string {
  if (!value || value === "all") return "";
  return value.trim();
}

function normalizeBodyFilterValue(value: unknown): string {
  return typeof value === "string" ? normalizeFilterValue(value) : "";
}

export function readBacklogQuery(request: Request): BacklogQuery {
  const params = new URL(request.url).searchParams;
  const scope = params.get("backlogScope");

  return {
    limit: parseBoundedInteger(params.get("backlogLimit"), CFG.DEFAULT_BACKLOG_LIMIT, CFG.MAX_BACKLOG_LIMIT),
    offset: parseNonNegativeInteger(params.get("backlogOffset"), 0),
    scope: scope === "active" || scope === "all" ? scope : "missing",
    query: normalizeFilterValue(params.get("q")),
    makam: normalizeFilterValue(params.get("makam")),
    form: normalizeFilterValue(params.get("form")),
    usul: normalizeFilterValue(params.get("usul")),
    composer: normalizeFilterValue(params.get("composer")),
    priorityGroup: normalizeFilterValue(params.get("priorityGroup")),
  };
}

export function readCandidateReviewQuery(request: Request): CandidateReviewQuery {
  const params = new URL(request.url).searchParams;

  return {
    limit: parseBoundedInteger(params.get("candidateLimit"), CFG.DEFAULT_CANDIDATE_LIMIT, CFG.MAX_CANDIDATE_LIMIT),
    offset: parseNonNegativeInteger(params.get("candidateOffset"), 0),
    query: normalizeFilterValue(params.get("candidateQ") ?? params.get("q")),
    status: normalizeFilterValue(params.get("candidateStatus")),
    profileId: normalizeFilterValue(params.get("candidateProfile")),
    provider: normalizeFilterValue(params.get("candidateProvider")),
    composer: normalizeFilterValue(params.get("candidateComposer") ?? params.get("composer")),
  };
}

export function readCandidateReviewGroupQuery(request: Request): CandidateReviewGroupQuery {
  const params = new URL(request.url).searchParams;

  return {
    limit: parseBoundedInteger(params.get("groupLimit"), CFG.DEFAULT_CANDIDATE_GROUP_LIMIT, CFG.MAX_CANDIDATE_GROUP_LIMIT),
    offset: parseNonNegativeInteger(params.get("groupOffset"), 0),
    query: normalizeFilterValue(params.get("groupQ") ?? params.get("q")),
    status: normalizeFilterValue(params.get("groupStatus")),
    composer: normalizeFilterValue(params.get("groupComposer") ?? params.get("composer")),
    priorityGroup: normalizeFilterValue(params.get("groupPriorityGroup") ?? params.get("priorityGroup")),
  };
}

export function readCandidateReviewExportQuery(body: OperationBody): CandidateReviewQuery {
  const query = body.candidateReviewQuery ?? {};

  return {
    limit: CFG.MAX_CANDIDATE_REVIEW_EXPORT_ROWS,
    offset: 0,
    query: normalizeBodyFilterValue(query.query),
    status: normalizeBodyFilterValue(query.status),
    profileId: normalizeBodyFilterValue(query.profileId),
    provider: normalizeBodyFilterValue(query.provider),
    composer: normalizeBodyFilterValue(query.composer),
  };
}

export function readCandidateReviewGroupExportQuery(body: OperationBody): CandidateReviewGroupQuery {
  const query = body.candidateReviewGroupQuery ?? {};

  return {
    limit: CFG.MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS,
    offset: 0,
    query: normalizeBodyFilterValue(query.query),
    status: normalizeBodyFilterValue(query.status),
    composer: normalizeBodyFilterValue(query.composer),
    priorityGroup: normalizeBodyFilterValue(query.priorityGroup),
  };
}

function normalizeDecisionTemplateValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readCandidateReviewGroupDecisionTemplate(body: OperationBody): {
  status: string;
  reason: string;
  reviewedAt: string;
  reviewedBy: string;
} {
  const template = body.candidateReviewGroupDecisionTemplate ?? {};
  const status = normalizeDecisionTemplateValue(template.status);
  const reason = normalizeDecisionTemplateValue(template.reason);
  const reviewedAt = normalizeDecisionTemplateValue(template.reviewedAt);
  const reviewedBy = normalizeDecisionTemplateValue(template.reviewedBy) || "local-operator";

  return {status, reason, reviewedAt, reviewedBy};
}

export function summarizeBulkCandidateManifest(manifest: BulkCandidateManifest | null) {
  const candidates = Array.isArray(manifest?.candidates) ? manifest.candidates : [];
  const statusCounts = candidates.reduce<Record<string, number>>((accumulator, candidate) => {
    const status = String(candidate.status ?? "unknown");
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    artifactPath: toProjectRelativePath(CFG.BULK_CANDIDATES_FILE),
    candidateCount: candidates.length,
    acceptedCount: statusCounts.accepted ?? 0,
    needsReviewCount: statusCounts["needs-review"] ?? 0,
    rejectedCount: statusCounts.rejected ?? 0,
    conflictCount: statusCounts.conflict ?? 0,
    statusCounts,
  };
}

export function summarizeTerminalDecisionManifest(manifest: SourceTerminalDecisionManifest | null) {
  const entries = manifest?.entries ?? [];
  const statusCounts = manifest?.summary?.statusCounts ?? entries.reduce<Record<string, number>>((counts, entry) => {
    const status = String(entry.status ?? "unknown");
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

  return {
    artifactPath: toProjectRelativePath(CFG.SOURCE_TERMINAL_DECISIONS_FILE),
    generatedAt: manifest?.generatedAt ?? null,
    terminalDecisionGroupCount: manifest?.summary?.terminalDecisionGroupCount ?? entries.length,
    disputedCount: statusCounts.disputed ?? 0,
    verifiedUnavailableCount: statusCounts["verified-unavailable"] ?? 0,
    deferredCount: statusCounts.deferred ?? 0,
    directAutoAttachCount: manifest?.summary?.directAutoAttachCount ?? 0,
    mediaDownloadCount: manifest?.summary?.mediaDownloadCount ?? 0,
    statusCounts,
  };
}

export async function getExternalReferenceState(request: Request) {
  const backlogQuery = readBacklogQuery(request);
  const candidateReviewQuery = readCandidateReviewQuery(request);
  const candidateReviewGroupQuery = readCandidateReviewGroupQuery(request);
  const [
    inbox,
    mapping,
    coverage,
    autoAttached,
    feedback,
    manualCorrections,
    researchProfiles,
    embedStates,
    qualityStats,
    bulkCandidateManifest,
    candidateReviewGroupDecisionManifest,
    candidateReviewGroupDecisionRecommendationManifest,
    candidateReviewBatchPlanManifest,
    sourceIntakeTemplateManifest,
    sourceIntakeAcceptedDryRunManifest,
    symbtrLayoutVerificationSummary,
    symbtrLayoutEmptyImportDryRunManifest,
    prodCycleSummary,
    sourceDiscoveryRun,
    sourceDiscoveryVerification,
    sourceDiscoveryAcceptedImportReady,
    sourceDiscoveryProviderCoverage,
    sourceDiscoveryNegativeCache,
    sourceDiscoveryCoverageDelta,
    sourceProviderVerificationRun,
    sourceProviderVerificationCoverage,
    sourceProviderVerificationBatchRun,
    sourceTerminalDecisions,
    sourceTerminalFeedback,
    candidateReviewQueue,
    candidateReviewGroups,
    fullBacklog,
    nextBatch,
  ] = await Promise.all([
    readJsonOrNull<{sources?: unknown[]}>(CFG.INBOX_FILE),
    readJsonOrNull<{
      generatedAt?: string;
      summary?: Record<string, unknown>;
      candidates?: Array<{source?: ExternalReferenceSource}>;
      mappings?: Array<{
        inboxId?: string;
        catalogId?: string;
        status?: string;
        confidenceScore?: number;
        confidenceGap?: number;
        reason?: string;
        evidence?: Record<string, unknown>;
        candidate?: {
          source?: ExternalReferenceSource;
        };
      }>;
    }>(CFG.MAPPING_FILE),
    readJsonOrNull<Record<string, unknown>>(CFG.COVERAGE_SUMMARY_FILE),
    readJsonOrNull<{matcherVersion?: string; references?: CurationReference[]}>(CFG.AUTO_ATTACHED_FILE),
    readJsonOrNull<{events?: unknown[]}>(CFG.FEEDBACK_FILE),
    readJsonOrNull<{corrections?: unknown[]}>(CFG.MANUAL_CORRECTIONS_FILE),
    readJsonOrNull<{profiles?: unknown[]}>(CFG.RESEARCH_PROFILES_FILE),
    readJsonOrNull<{states?: unknown[]}>(CFG.EMBED_STATES_FILE),
    readJsonOrNull<{generatedAt?: string | null; stats?: CurationStat[]}>(CFG.QUALITY_STATS_FILE),
    readJsonOrNull<BulkCandidateManifest>(CFG.BULK_CANDIDATES_FILE),
    readJsonOrNull<CandidateReviewGroupDecisionManifest>(CFG.CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
    readJsonOrNull<CandidateReviewGroupDecisionRecommendationManifest>(CFG.CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE),
    readJsonOrNull<CandidateReviewBatchPlanManifest>(CFG.CANDIDATE_REVIEW_BATCH_PLAN_FILE),
    readJsonOrNull<SourceIntakeTemplateManifest>(CFG.SOURCE_INTAKE_TEMPLATE_FILE),
    readJsonOrNull<SourceIntakeAcceptedImportDryRunManifest>(CFG.SOURCE_INTAKE_ACCEPTED_DRY_RUN_FILE),
    readJsonOrNull<SymbTrLayoutVerificationSummary>(CFG.SYMBTR_LAYOUT_VERIFICATION_SUMMARY_FILE),
    readJsonOrNull<Record<string, unknown>>(CFG.SYMBTR_LAYOUT_EMPTY_IMPORT_DRY_RUN_FILE),
    readJsonOrNull<ProdCycleSummary>(CFG.PROD_CYCLE_SUMMARY_FILE),
    readJsonOrNull<SourceDiscoveryRunManifest>(CFG.SOURCE_DISCOVERY_RUN_FILE),
    readJsonOrNull<SourceDiscoveryVerificationManifest>(CFG.SOURCE_DISCOVERY_VERIFICATION_FILE),
    readJsonOrNull<SourceDiscoveryAcceptedImportReadyManifest>(CFG.SOURCE_DISCOVERY_ACCEPTED_IMPORT_READY_FILE),
    readJsonOrNull<SourceDiscoveryProviderCoverageManifest>(CFG.SOURCE_DISCOVERY_PROVIDER_COVERAGE_FILE),
    readJsonOrNull<SourceDiscoveryNegativeCacheManifest>(CFG.SOURCE_DISCOVERY_NEGATIVE_CACHE_FILE),
    readJsonOrNull<SourceDiscoveryCoverageDeltaManifest>(CFG.SOURCE_DISCOVERY_COVERAGE_DELTA_FILE),
    readJsonOrNull<SourceProviderVerificationRunManifest>(CFG.SOURCE_PROVIDER_VERIFICATION_RUN_FILE),
    readJsonOrNull<Record<string, unknown>>(CFG.SOURCE_PROVIDER_VERIFICATION_COVERAGE_FILE),
    readJsonOrNull<Record<string, unknown>>(CFG.SOURCE_PROVIDER_VERIFICATION_BATCH_RUN_FILE),
    readJsonOrNull<SourceTerminalDecisionManifest>(CFG.SOURCE_TERMINAL_DECISIONS_FILE),
    readJsonOrNull<SourceTerminalFeedbackManifest>(CFG.SOURCE_TERMINAL_FEEDBACK_FILE),
    readJsonOrNull<CandidateReviewRow[]>(CFG.CANDIDATE_REVIEW_QUEUE_FILE),
    readJsonOrNull<CandidateReviewGroup[]>(CFG.CANDIDATE_REVIEW_GROUPS_FILE),
    readJsonOrNull<CurationBacklogRow[]>(CFG.BACKLOG_FILE),
    readJsonOrNull<CurationBacklogRow[]>(CFG.NEXT_BATCH_FILE),
  ]);
  const sources = inbox?.sources ?? [];
  const mappings = mapping?.mappings ?? [];
  const curationState = buildCurationState({
    mapping,
    autoAttached,
    feedback,
    manualCorrections,
    researchProfiles,
    embedStates,
    qualityStats,
  });
  const candidateReviewRows = candidateReviewQueue ?? [];
  const candidateReviewGroupRows = candidateReviewGroups ?? [];
  const filteredCandidateReviewGroupRows = applyCandidateReviewGroupQuery(
    candidateReviewGroupRows,
    candidateReviewGroupQuery,
  );
  const candidateReviewGroupOffset = clampBacklogOffset(
    candidateReviewGroupQuery.offset,
    filteredCandidateReviewGroupRows.length,
    candidateReviewGroupQuery.limit,
  );
  const candidateReviewGroupPageRows = filteredCandidateReviewGroupRows.slice(
    candidateReviewGroupOffset,
    candidateReviewGroupOffset + candidateReviewGroupQuery.limit,
  );
  const filteredCandidateReviewRows = applyCandidateReviewQuery(candidateReviewRows, candidateReviewQuery);
  const candidateReviewOffset = clampBacklogOffset(
    candidateReviewQuery.offset,
    filteredCandidateReviewRows.length,
    candidateReviewQuery.limit,
  );
  const candidateReviewPageRows = filteredCandidateReviewRows.slice(
    candidateReviewOffset,
    candidateReviewOffset + candidateReviewQuery.limit,
  );
  const fullBacklogRows = (fullBacklog ?? nextBatch ?? []).map(enrichBacklogRow);
  const scopedBacklogRows = fullBacklogRows.filter((row) => {
    if (backlogQuery.scope === "all") return true;
    if (!isMissingBacklogRow(row)) return false;
    return backlogQuery.scope === "active" ? row.deferredFromNextBatch !== true : true;
  });
  const filteredBacklogRows = applyBacklogQuery(fullBacklogRows, backlogQuery);
  const backlogOffset = clampBacklogOffset(backlogQuery.offset, filteredBacklogRows.length, backlogQuery.limit);
  const backlogNextBatch = filteredBacklogRows.slice(backlogOffset, backlogOffset + backlogQuery.limit);
  return {
    inbox: {
      sourceCount: sources.length,
      sources: sources.slice(-80).reverse(),
    },
    mapping: {
      generatedAt: mapping?.generatedAt ?? null,
      summary: mapping?.summary ?? {
        sourceCount: sources.length,
        acceptedCount: getCountByStatus(mappings, "accepted"),
        needsReviewCount: getCountByStatus(mappings, "needs-review"),
        rejectedCount: getCountByStatus(mappings, "rejected"),
      },
      mappings: mappings.slice(0, 120),
    },
    coverage: coverage ?? null,
    curation: {
      ...curationState,
      candidateManifest: summarizeBulkCandidateManifest(bulkCandidateManifest),
      candidateReviewGroups: candidateReviewGroupPageRows,
      candidateReviewGroupManifest: {
        artifactPath: typeof coverage?.candidateReviewGroupsJson === "string"
          ? coverage.candidateReviewGroupsJson
          : toProjectRelativePath(CFG.CANDIDATE_REVIEW_GROUPS_FILE),
        groupCount: candidateReviewGroupRows.length,
        visibleGroupCount: candidateReviewGroupPageRows.length,
      },
      candidateReviewGroupDecisionManifest: {
        artifactPath: typeof coverage?.candidateReviewGroupDecisionsJson === "string"
          ? coverage.candidateReviewGroupDecisionsJson
          : toProjectRelativePath(CFG.CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
        decisionCount: candidateReviewGroupDecisionManifest?.decisions?.length ?? 0,
      },
      candidateReviewGroupDecisionRecommendationManifest: {
        artifactPath: typeof coverage?.candidateReviewGroupDecisionRecommendationsJson === "string"
          ? coverage.candidateReviewGroupDecisionRecommendationsJson
          : toProjectRelativePath(CFG.CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE),
        decisionCount: candidateReviewGroupDecisionRecommendationManifest?.decisions?.length ?? 0,
        policyVersion: candidateReviewGroupDecisionRecommendationManifest?.policyVersion ?? null,
        generatedAt: candidateReviewGroupDecisionRecommendationManifest?.generatedAt ?? null,
        summary: candidateReviewGroupDecisionRecommendationManifest?.summary ?? null,
      },
      candidateReviewBatchPlanManifest: {
        artifactPath: typeof coverage?.candidateReviewBatchPlanJson === "string"
          ? coverage.candidateReviewBatchPlanJson
          : toProjectRelativePath(CFG.CANDIDATE_REVIEW_BATCH_PLAN_FILE),
        packetCount: candidateReviewBatchPlanManifest?.packets?.length ?? 0,
        plannedGroupCount: candidateReviewBatchPlanManifest?.summary?.plannedGroupCount ?? 0,
        plannedCandidateCount: candidateReviewBatchPlanManifest?.summary?.plannedCandidateCount ?? 0,
        packetSize: candidateReviewBatchPlanManifest?.summary?.packetSize ?? 0,
        policyVersion: candidateReviewBatchPlanManifest?.policyVersion ?? null,
        generatedAt: candidateReviewBatchPlanManifest?.generatedAt ?? null,
      },
      sourceIntakeTemplateManifest: {
        artifactPath: typeof coverage?.sourceIntakeTemplateJson === "string"
          ? coverage.sourceIntakeTemplateJson
          : toProjectRelativePath(CFG.SOURCE_INTAKE_TEMPLATE_FILE),
        packetCount: sourceIntakeTemplateManifest?.summary?.packetCount ?? 0,
        templateRowCount: sourceIntakeTemplateManifest?.summary?.templateRowCount ?? 0,
        plannedCandidateCount: sourceIntakeTemplateManifest?.summary?.plannedCandidateCount ?? 0,
        packetSize: sourceIntakeTemplateManifest?.summary?.packetSize ?? 0,
        policyVersion: sourceIntakeTemplateManifest?.policyVersion ?? null,
        generatedAt: sourceIntakeTemplateManifest?.generatedAt ?? null,
        targetScript: typeof sourceIntakeTemplateManifest?.importContract?.targetScript === "string"
          ? sourceIntakeTemplateManifest.importContract.targetScript
          : null,
      },
      sourceIntakeAcceptedImportDryRunManifest: {
        artifactPath: toProjectRelativePath(CFG.SOURCE_INTAKE_ACCEPTED_DRY_RUN_FILE),
        input: sourceIntakeAcceptedDryRunManifest?.input ?? null,
        generatedAt: sourceIntakeAcceptedDryRunManifest?.generatedAt ?? null,
        dryRun: sourceIntakeAcceptedDryRunManifest?.dryRun === true,
        acceptedCandidateCount: sourceIntakeAcceptedDryRunManifest?.summary?.acceptedCandidateCount ?? 0,
        httpsAcceptedCount: sourceIntakeAcceptedDryRunManifest?.summary?.httpsAcceptedCount ?? 0,
        evidenceCompleteCount: sourceIntakeAcceptedDryRunManifest?.summary?.evidenceCompleteCount ?? 0,
        dryRunAddedCandidateCount: sourceIntakeAcceptedDryRunManifest?.summary?.dryRunAddedCandidateCount ?? 0,
        dryRunSkippedDuplicateCount: sourceIntakeAcceptedDryRunManifest?.summary?.dryRunSkippedDuplicateCount ?? 0,
        dryRunOutputCandidateCount: sourceIntakeAcceptedDryRunManifest?.summary?.dryRunOutputCandidateCount ?? 0,
        validationGateCount: Array.isArray(sourceIntakeAcceptedDryRunManifest?.validationGates)
          ? sourceIntakeAcceptedDryRunManifest.validationGates.length
          : 0,
        validationErrorCount: Array.isArray(sourceIntakeAcceptedDryRunManifest?.errors)
          ? sourceIntakeAcceptedDryRunManifest.errors.length
          : 0,
        targetScript: "npm run verify:external-source-intake",
      },
      symbtrLayoutVerificationManifest: {
        summaryPath: toProjectRelativePath(CFG.SYMBTR_LAYOUT_VERIFICATION_SUMMARY_FILE),
        candidateEntries: symbtrLayoutVerificationSummary?.candidateEntries ?? 0,
        verificationEntries: symbtrLayoutVerificationSummary?.verificationEntries ?? 0,
        verifiedEntries: symbtrLayoutVerificationSummary?.verifiedEntries ?? 0,
        verifiedMeasureBoxes: symbtrLayoutVerificationSummary?.verifiedMeasureBoxes ?? 0,
        unresolvedCandidateEntries: symbtrLayoutVerificationSummary?.unresolvedCandidateEntries ?? 0,
        candidateStatus: symbtrLayoutVerificationSummary?.candidateStatus ?? null,
        promotionPolicy: symbtrLayoutVerificationSummary?.promotionPolicy ?? null,
        fingerprintAlgorithm: symbtrLayoutVerificationSummary?.fingerprintAlgorithm ?? null,
        reviewTemplatePath: symbtrLayoutVerificationSummary?.reviewTemplate?.path ?? toProjectRelativePath(CFG.SYMBTR_LAYOUT_REVIEW_TEMPLATE_FILE),
        reviewTemplateEntryCount: symbtrLayoutVerificationSummary?.reviewTemplate?.entryCount ?? 0,
        reviewTemplateCandidateRows: symbtrLayoutVerificationSummary?.reviewTemplate?.candidateReviewRows ?? 0,
        reviewBatchPlanPath: symbtrLayoutVerificationSummary?.reviewBatchPlan?.path ?? toProjectRelativePath(CFG.SYMBTR_LAYOUT_REVIEW_BATCH_PLAN_FILE),
        reviewBatchPacketCount: symbtrLayoutVerificationSummary?.reviewBatchPlan?.packetCount ?? 0,
        reviewBatchCandidateRows: symbtrLayoutVerificationSummary?.reviewBatchPlan?.candidateReviewRows ?? 0,
        emptyImportDryRunPath: symbtrLayoutVerificationSummary?.emptyImportDryRun?.path
          ?? toProjectRelativePath(CFG.SYMBTR_LAYOUT_EMPTY_IMPORT_DRY_RUN_FILE),
        emptyImportTemplatePath: typeof symbtrLayoutEmptyImportDryRunManifest?.input === "string"
          ? symbtrLayoutEmptyImportDryRunManifest.input
          : null,
        emptyImportDryRunInputEntries: symbtrLayoutVerificationSummary?.emptyImportDryRun?.dryRunInputEntryCount ?? 0,
        emptyImportDryRunVerifiedMeasureBoxes:
          symbtrLayoutVerificationSummary?.emptyImportDryRun?.dryRunVerifiedMeasureBoxCount ?? 0,
        emptyImportVerificationManifestBeforeSha256:
          symbtrLayoutVerificationSummary?.emptyImportDryRun?.verificationManifestBeforeSha256 ?? null,
        emptyImportVerificationManifestAfterSha256:
          symbtrLayoutVerificationSummary?.emptyImportDryRun?.verificationManifestAfterSha256 ?? null,
        emptyImportVerificationManifestUnchanged:
          symbtrLayoutVerificationSummary?.emptyImportDryRun?.verificationManifestUnchanged === true,
        targetScript: "npm run import:symbtr-measure-verification -- --input <json>",
        emptyImportDryRunScript: "npm run verify:symbtr-layout-review-import",
        validationErrorCount: Array.isArray(symbtrLayoutVerificationSummary?.errors)
          ? symbtrLayoutVerificationSummary.errors.length
          : 0,
      },
      prodCycleAudit: {
        artifactPath: toProjectRelativePath(CFG.PROD_CYCLE_SUMMARY_FILE),
        generatedAt: prodCycleSummary?.generatedAt ?? null,
        ok: prodCycleSummary?.ok === true,
        errorCount: Array.isArray(prodCycleSummary?.errors) ? prodCycleSummary.errors.length : 0,
        warningCount: Array.isArray(prodCycleSummary?.warnings) ? prodCycleSummary.warnings.length : 0,
        commandCount: Array.isArray(prodCycleSummary?.commandResults) ? prodCycleSummary.commandResults.length : 0,
        processedCatalogEntries: prodCycleSummary?.pipeline?.processedCatalogEntries ?? 0,
        totalCatalogEntries: prodCycleSummary?.pipeline?.totalCatalogEntries ?? 0,
        curatedReferenceEntries: prodCycleSummary?.pipeline?.curatedReferenceEntries ?? 0,
        missingCuratedEntries: prodCycleSummary?.pipeline?.missingCuratedEntries ?? 0,
        duplicateRowsAfterDedupe: prodCycleSummary?.pipeline?.duplicateRowsAfterDedupe ?? 0,
        autoAttachAcceptedOnly: prodCycleSummary?.pipeline?.autoAttachAcceptedOnly === true,
        reviewQueueHasAccepted: prodCycleSummary?.pipeline?.reviewQueueHasAccepted === true,
        candidateReviewQueueEntries: prodCycleSummary?.queueClosure?.candidateReviewQueueEntries ?? 0,
        candidateReviewGroupEntries: prodCycleSummary?.queueClosure?.candidateReviewGroupEntries ?? 0,
        sourceIntakeTemplateRows: prodCycleSummary?.queueClosure?.sourceIntakeTemplateRows ?? 0,
        acceptedPromotionEligibleFromReviewQueue:
          prodCycleSummary?.queueClosure?.acceptedPromotionEligibleFromReviewQueue ?? 0,
        acceptedBulkCandidateCount: prodCycleSummary?.queueClosure?.acceptedBulkCandidateCount ?? 0,
        reviewOnlyCandidateCount: prodCycleSummary?.queueClosure?.reviewOnlyCandidateCount ?? 0,
        pdfVerifiedMeasureBoxes: prodCycleSummary?.pdfVerification?.verifiedMeasureBoxes ?? 0,
        pdfVerificationManifestUnchanged:
          prodCycleSummary?.pdfVerification?.emptyImportDryRun?.verificationManifestUnchanged === true,
        targetScript: "npm run audit:prod-cycle",
      },
      sourceDiscovery: {
        artifactPath: toProjectRelativePath(CFG.SOURCE_DISCOVERY_RUN_FILE),
        verificationArtifactPath: toProjectRelativePath(CFG.SOURCE_DISCOVERY_VERIFICATION_FILE),
        acceptedImportReadyArtifactPath: toProjectRelativePath(CFG.SOURCE_DISCOVERY_ACCEPTED_IMPORT_READY_FILE),
        providerCoverageArtifactPath: toProjectRelativePath(CFG.SOURCE_DISCOVERY_PROVIDER_COVERAGE_FILE),
        negativeCacheArtifactPath: toProjectRelativePath(CFG.SOURCE_DISCOVERY_NEGATIVE_CACHE_FILE),
        coverageDeltaArtifactPath: toProjectRelativePath(CFG.SOURCE_DISCOVERY_COVERAGE_DELTA_FILE),
        generatedAt: sourceDiscoveryRun?.generatedAt ?? null,
        ok: sourceDiscoveryRun?.ok === true && sourceDiscoveryVerification?.ok === true,
        dryRun: sourceDiscoveryRun?.dryRun === true,
        scope: sourceDiscoveryRun?.scope ?? "missing",
        processedMissingCatalogEntries:
          sourceDiscoveryVerification?.summary?.processedMissingCatalogEntries
          ?? sourceDiscoveryRun?.processedMissingCatalogEntries
          ?? 0,
        totalMissingCatalogEntries: sourceDiscoveryRun?.totalMissingCatalogEntries ?? 0,
        providerCount: sourceDiscoveryVerification?.summary?.providerCount ?? sourceDiscoveryRun?.providerCount ?? 0,
        candidateCount: sourceDiscoveryVerification?.summary?.candidateCount ?? sourceDiscoveryRun?.candidateCount ?? 0,
        acceptedReadyCount:
          sourceDiscoveryVerification?.summary?.acceptedReadyCount
          ?? sourceDiscoveryAcceptedImportReady?.summary?.acceptedReadyCount
          ?? sourceDiscoveryRun?.acceptedReadyCount
          ?? 0,
        needsReviewCount: sourceDiscoveryVerification?.summary?.needsReviewCount ?? sourceDiscoveryRun?.needsReviewCount ?? 0,
        conflictCount: sourceDiscoveryVerification?.summary?.conflictCount ?? sourceDiscoveryRun?.conflictCount ?? 0,
        deferredCount: sourceDiscoveryRun?.deferredCount ?? 0,
        negativeCacheCount:
          sourceDiscoveryVerification?.summary?.negativeCacheCount
          ?? sourceDiscoveryNegativeCache?.summary?.negativeCacheCount
          ?? sourceDiscoveryRun?.negativeCacheCount
          ?? 0,
        directAutoAttachCount:
          sourceDiscoveryVerification?.summary?.directAutoAttachCount
          ?? sourceDiscoveryCoverageDelta?.directAutoAttachCount
          ?? sourceDiscoveryRun?.directAutoAttachCount
          ?? null,
        verificationErrorCount: Array.isArray(sourceDiscoveryVerification?.errors) ? sourceDiscoveryVerification.errors.length : 0,
        verificationWarningCount: Array.isArray(sourceDiscoveryVerification?.warnings) ? sourceDiscoveryVerification.warnings.length : 0,
        validationGateCount: Array.isArray(sourceDiscoveryVerification?.validationGates)
          ? sourceDiscoveryVerification.validationGates.length
          : 0,
        targetScript: "npm run discover:external-sources",
        verifyScript: "npm run verify:external-source-discovery",
        targetImportDryRun:
          sourceDiscoveryAcceptedImportReady?.importContract?.targetScript
          ?? sourceDiscoveryRun?.targetImportDryRun
          ?? null,
        reasonWhenEmpty: sourceDiscoveryAcceptedImportReady?.summary?.reasonWhenEmpty ?? null,
        providerCoverage: sourceDiscoveryProviderCoverage?.providers?.slice(0, 12) ?? [],
        providerVerification: {
          artifactPath: toProjectRelativePath(CFG.SOURCE_PROVIDER_VERIFICATION_RUN_FILE),
          evidenceArtifactPath: toProjectRelativePath(CFG.SOURCE_PROVIDER_VERIFICATION_EVIDENCE_FILE),
          acceptedImportReadyArtifactPath: toProjectRelativePath(CFG.SOURCE_PROVIDER_VERIFICATION_ACCEPTED_IMPORT_READY_FILE),
          planArtifactPath: toProjectRelativePath(CFG.SOURCE_PROVIDER_VERIFICATION_PLAN_FILE),
          coverageArtifactPath: toProjectRelativePath(CFG.SOURCE_PROVIDER_VERIFICATION_COVERAGE_FILE),
          batchRunArtifactPath: toProjectRelativePath(CFG.SOURCE_PROVIDER_VERIFICATION_BATCH_RUN_FILE),
          continueScript: CFG.SOURCE_PROVIDER_VERIFICATION_CONTINUE_SCRIPT,
          generatedAt: sourceProviderVerificationRun?.generatedAt ?? null,
          ok: sourceProviderVerificationRun?.ok === true,
          dryRun: sourceProviderVerificationRun?.dryRun === true,
          providerProfileId: sourceProviderVerificationRun?.providerProfileId ?? null,
          providerProfileIds: Array.isArray(sourceProviderVerificationRun?.providerProfileIds)
            ? sourceProviderVerificationRun.providerProfileIds
            : [],
          connector: sourceProviderVerificationRun?.connector ?? null,
          processedGroupCount: sourceProviderVerificationRun?.processedGroupCount ?? 0,
          verificationPacketCount: sourceProviderVerificationRun?.verificationPacketCount ?? 0,
          totalEligibleGroupCount: sourceProviderVerificationRun?.totalEligibleGroupCount ?? 0,
          totalBacklogGroupCount: sourceProviderVerificationRun?.totalBacklogGroupCount ?? 0,
          providerCount: sourceProviderVerificationRun?.providerCount ?? 0,
          cumulativeVerifiedOrClassifiedCount: sourceProviderVerificationCoverage?.byProvider && Array.isArray(sourceProviderVerificationCoverage.byProvider)
            ? sourceProviderVerificationCoverage.byProvider.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.verifiedOrClassifiedGroupCount ?? 0), 0)
            : 0,
          networkProviderRemainingGroupCount: Number(sourceProviderVerificationCoverage?.networkProviderRemainingGroupCount ?? 0),
          batchRunCompletedCount: Number(sourceProviderVerificationBatchRun?.completedBatchCount ?? 0),
          batchRunFinalVerifiedCount: Number(sourceProviderVerificationBatchRun?.finalInternetArchiveVerifiedCount ?? 0),
          batchRunFinalRemainingCount: Number(sourceProviderVerificationBatchRun?.finalInternetArchiveRemainingCount ?? 0),
          nextBatchCommand: sourceProviderVerificationRun?.artifacts?.plan ? "see provider verification plan" : null,
          resultCount: sourceProviderVerificationRun?.resultCount ?? 0,
          acceptedReadyCount: sourceProviderVerificationRun?.acceptedReadyCount ?? 0,
          needsReviewCount: sourceProviderVerificationRun?.needsReviewCount ?? 0,
          rejectedCount: sourceProviderVerificationRun?.rejectedCount ?? 0,
          deferredCount: sourceProviderVerificationRun?.deferredCount ?? 0,
          cacheHitCount: sourceProviderVerificationRun?.cacheHitCount ?? 0,
          directAutoAttachCount: sourceProviderVerificationRun?.directAutoAttachCount ?? 0,
          mediaDownloadCount: sourceProviderVerificationRun?.mediaDownloadCount ?? 0,
          sourceContentCopiedCount: sourceProviderVerificationRun?.sourceContentCopiedCount ?? 0,
          warningCount: Array.isArray(sourceProviderVerificationRun?.warnings) ? sourceProviderVerificationRun.warnings.length : 0,
          dryRunAddedCandidateCount: sourceProviderVerificationRun?.acceptedImportDryRun?.addedCandidateCount ?? 0,
          targetScript: "npm run verify:external-source-providers",
        },
        coverageDelta: {
          before: sourceDiscoveryCoverageDelta?.before ?? null,
          afterDryRun: sourceDiscoveryCoverageDelta?.afterDryRun ?? null,
        },
      },
      sourceTerminalDecisions: {
        ...summarizeTerminalDecisionManifest(sourceTerminalDecisions),
        visibleEntries: (sourceTerminalDecisions?.entries ?? []).slice(0, 20),
        feedbackArtifactPath: toProjectRelativePath(CFG.SOURCE_TERMINAL_FEEDBACK_FILE),
        feedbackEventCount: sourceTerminalFeedback?.events?.length ?? 0,
        feedbackActiveEventCount: sourceTerminalFeedback?.summary?.activeEventCount ?? sourceTerminalFeedback?.events?.length ?? 0,
        feedbackRolledBackEventCount: sourceTerminalFeedback?.summary?.rolledBackEventCount ?? 0,
        feedbackEventTypeCounts: sourceTerminalFeedback?.summary?.eventTypeCounts ?? {},
        feedbackEvents: (sourceTerminalFeedback?.events ?? []).slice(-80).reverse(),
        allowedEventTypes: Array.from(SOURCE_TERMINAL_FEEDBACK_EVENT_TYPES),
        policy: "Terminal decisions are not accepted sources. User feedback is weak-label evidence until source intake validation passes.",
      },
      candidateReviewGroupPage: {
        offset: candidateReviewGroupOffset,
        limit: candidateReviewGroupQuery.limit,
        returnedCount: candidateReviewGroupPageRows.length,
        filteredTotal: filteredCandidateReviewGroupRows.length,
        totalRows: candidateReviewGroupRows.length,
        previousOffset: candidateReviewGroupOffset > 0
          ? Math.max(0, candidateReviewGroupOffset - candidateReviewGroupQuery.limit)
          : null,
        nextOffset: candidateReviewGroupOffset + candidateReviewGroupQuery.limit < filteredCandidateReviewGroupRows.length
          ? candidateReviewGroupOffset + candidateReviewGroupQuery.limit
          : null,
      },
      candidateReviewGroupFacets: buildCandidateReviewGroupFacets(candidateReviewGroupRows),
      candidateReviewQueue: candidateReviewPageRows,
      candidateReviewPage: {
        offset: candidateReviewOffset,
        limit: candidateReviewQuery.limit,
        returnedCount: candidateReviewPageRows.length,
        filteredTotal: filteredCandidateReviewRows.length,
        totalRows: candidateReviewRows.length,
        previousOffset: candidateReviewOffset > 0 ? Math.max(0, candidateReviewOffset - candidateReviewQuery.limit) : null,
        nextOffset: candidateReviewOffset + candidateReviewQuery.limit < filteredCandidateReviewRows.length
          ? candidateReviewOffset + candidateReviewQuery.limit
          : null,
        artifactPath: typeof coverage?.candidateReviewQueueJson === "string"
          ? coverage.candidateReviewQueueJson
          : toProjectRelativePath(CFG.CANDIDATE_REVIEW_QUEUE_FILE),
      },
      candidateReviewFacets: buildCandidateReviewFacets(candidateReviewRows),
      backlogNextBatch,
      backlogPage: {
        scope: backlogQuery.scope,
        offset: backlogOffset,
        limit: backlogQuery.limit,
        returnedCount: backlogNextBatch.length,
        filteredTotal: filteredBacklogRows.length,
        totalRows: fullBacklogRows.length,
        totalMissing: fullBacklogRows.filter(isMissingBacklogRow).length,
        activeQueueCount: fullBacklogRows.filter((row) => isMissingBacklogRow(row) && row.deferredFromNextBatch !== true).length,
        deferredCount: fullBacklogRows.filter((row) => isMissingBacklogRow(row) && row.deferredFromNextBatch === true).length,
        previousOffset: backlogOffset > 0 ? Math.max(0, backlogOffset - backlogQuery.limit) : null,
        nextOffset: backlogOffset + backlogQuery.limit < filteredBacklogRows.length ? backlogOffset + backlogQuery.limit : null,
        artifactPaths: {
          backlogJson: typeof coverage?.backlogJson === "string" ? coverage.backlogJson : toProjectRelativePath(CFG.BACKLOG_FILE),
          nextBatchJson: typeof coverage?.nextBatchJson === "string" ? coverage.nextBatchJson : toProjectRelativePath(CFG.NEXT_BATCH_FILE),
        },
      },
      backlogFacets: buildBacklogFacets(scopedBacklogRows),
    },
  };
}


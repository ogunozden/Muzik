import {readFile} from "node:fs/promises";
import path from "node:path";
import {buildCurationState, getCatalogMetadata, type CurationStat, type ExternalReferenceSource} from "@/app/api/external-references/curation-state";
import {
  ReferencesCurationDashboard,
  type ExternalReferenceState,
} from "@/features/references/ReferencesCurationDashboard";

export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();
const COVERAGE_ROOT = path.join(PROJECT_ROOT, "output", "external-reference-coverage");
const SYMBTR_LAYOUT_REVIEW_ROOT = path.join(PROJECT_ROOT, "output", "symbtr-layout-review");
const REFERENCES_ROOT = path.join(PROJECT_ROOT, "src", "data", "references");
const PROD_CYCLE_SUMMARY_PATH = path.join(COVERAGE_ROOT, "prod-cycle-summary.json");
const SOURCE_DISCOVERY_ROOT = path.join(PROJECT_ROOT, "output", "external-source-discovery");
const DEFAULT_BACKLOG_LIMIT = 100;
const DEFAULT_CANDIDATE_LIMIT = 100;
const DEFAULT_CANDIDATE_GROUP_LIMIT = 80;

interface BulkCandidateManifest {
  candidates?: Array<{
    status?: string;
  }>;
}

interface CandidateReviewRow {
  candidateId?: string;
  catalogId?: string;
  status?: string;
  profileId?: string;
  provider?: string;
  composer?: string;
}

interface CandidateReviewGroup {
  groupId?: string;
  catalogId?: string;
  status?: string;
  composer?: string;
  priorityGroup?: string;
}

interface CurationBacklogRow {
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

interface AutoAttachedManifest {
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

interface MappingManifest {
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

interface FeedbackManifest {
  events?: unknown[];
}

interface ManualCorrectionsManifest {
  corrections?: unknown[];
}

interface ResearchProfilesManifest {
  profiles?: unknown[];
}

interface EmbedStatesManifest {
  states?: unknown[];
}

interface SymbTrLayoutVerificationSummary {
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

interface ProdCycleSummary {
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

interface SourceDiscoveryRunManifest {
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

interface SourceDiscoveryVerificationManifest {
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

interface SourceDiscoveryAcceptedImportReadyManifest {
  summary?: {
    acceptedReadyCount?: number;
    reasonWhenEmpty?: string;
  };
  importContract?: {
    targetScript?: string;
  };
}

interface SourceDiscoveryProviderCoverageManifest {
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

interface SourceDiscoveryNegativeCacheManifest {
  summary?: {
    negativeCacheCount?: number;
  };
}

interface SourceDiscoveryCoverageDeltaManifest {
  directAutoAttachCount?: number;
  before?: Record<string, number>;
  afterDryRun?: Record<string, number>;
}

interface SourceIntakeAcceptedImportDryRunManifest {
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

interface QualityStatsManifest {
  generatedAt?: string | null;
  stats?: CurationStat[];
}

type ReadOnlyReferenceView = NonNullable<
  NonNullable<ExternalReferenceState["curation"]>["autoAttachedReferences"]
>[number];

async function readJsonOrNull<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function toProjectPath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
}

function summarizeByValue<T>(rows: T[], getValue: (row: T) => string | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = getValue(row)?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr-TR"));
}

function summarizeCandidateManifest(manifest: BulkCandidateManifest | null) {
  const candidates = manifest?.candidates ?? [];
  const byStatus = summarizeByValue(candidates, (candidate) => candidate.status);
  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.value, row.count]));

  return {
    artifactPath: toProjectPath(path.join(REFERENCES_ROOT, "external-reference-bulk-candidates.json")),
    candidateCount: candidates.length,
    acceptedCount: statusCounts.accepted ?? 0,
    needsReviewCount: statusCounts["needs-review"] ?? 0,
    rejectedCount: statusCounts.rejected ?? 0,
    conflictCount: statusCounts.conflict ?? 0,
    statusCounts,
  };
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

function sanitizeReadOnlyReferences(references: unknown[] | undefined): ReadOnlyReferenceView[] {
  return (references ?? [])
    .filter((reference): reference is ReadOnlyReferenceView => (
      typeof reference === "object" && reference !== null
    ))
    .map((reference) => ({
      catalogId: reference.catalogId,
      sourceId: reference.sourceId,
      profileId: reference.profileId,
      catalog: reference.catalog,
      source: reference.source
        ? {
            title: reference.source.title,
            label: reference.source.label,
            provider: reference.source.provider,
          }
        : null,
      status: reference.status,
      rank: reference.rank,
      confidenceScore: reference.confidenceScore,
      confidenceLevel: reference.confidenceLevel,
      matchReasons: reference.matchReasons,
      conflicts: reference.conflicts,
      attachedAt: reference.attachedAt,
    }));
}

async function buildReadOnlyInitialState(): Promise<ExternalReferenceState> {
  const backlogPath = path.join(COVERAGE_ROOT, "symbtr-curated-reference-backlog.json");
  const nextBatchPath = path.join(COVERAGE_ROOT, "symbtr-curated-reference-next-batch.json");
  const candidateQueuePath = path.join(COVERAGE_ROOT, "symbtr-curated-reference-candidate-review-queue.json");
  const candidateGroupsPath = path.join(COVERAGE_ROOT, "symbtr-curated-reference-candidate-review-groups.json");
  const recommendationPath = path.join(COVERAGE_ROOT, "symbtr-curated-reference-candidate-review-group-decision-recommendations.json");
  const batchPlanPath = path.join(COVERAGE_ROOT, "symbtr-curated-reference-candidate-review-batch-plan.json");
  const sourceIntakeTemplatePath = path.join(COVERAGE_ROOT, "symbtr-curated-reference-source-intake-template.json");
  const sourceIntakeAcceptedDryRunPath = path.join(COVERAGE_ROOT, "source-intake-accepted-import-dry-run.json");
  const layoutVerificationSummaryPath = path.join(SYMBTR_LAYOUT_REVIEW_ROOT, "layout-verification-summary.json");
  const layoutEmptyImportDryRunPath = path.join(SYMBTR_LAYOUT_REVIEW_ROOT, "layout-verification-empty-import-dry-run.json");
  const sourceDiscoveryRunPath = path.join(SOURCE_DISCOVERY_ROOT, "discovery-run.json");
  const sourceDiscoveryVerificationPath = path.join(SOURCE_DISCOVERY_ROOT, "discovery-verification.json");
  const sourceDiscoveryAcceptedImportReadyPath = path.join(SOURCE_DISCOVERY_ROOT, "accepted-import-ready.json");
  const sourceDiscoveryProviderCoveragePath = path.join(SOURCE_DISCOVERY_ROOT, "provider-coverage.json");
  const sourceDiscoveryNegativeCachePath = path.join(SOURCE_DISCOVERY_ROOT, "negative-cache.json");
  const sourceDiscoveryCoverageDeltaPath = path.join(SOURCE_DISCOVERY_ROOT, "coverage-delta.json");
  const mappingPath = path.join(COVERAGE_ROOT, "mapped-external-reference-candidates.json");
  const [
    coverage,
    mapping,
    autoAttached,
    feedback,
    manualCorrections,
    researchProfiles,
    embedStates,
    qualityStats,
    bulkCandidateManifest,
    groupDecisionManifest,
    groupDecisionRecommendations,
    candidateReviewBatchPlan,
    sourceIntakeTemplate,
    sourceIntakeAcceptedDryRun,
    layoutVerificationSummary,
    layoutEmptyImportDryRun,
    prodCycleSummary,
    sourceDiscoveryRun,
    sourceDiscoveryVerification,
    sourceDiscoveryAcceptedImportReady,
    sourceDiscoveryProviderCoverage,
    sourceDiscoveryNegativeCache,
    sourceDiscoveryCoverageDelta,
    candidateReviewQueueData,
    candidateReviewGroupsData,
    backlogData,
    nextBatchData,
  ] = await Promise.all([
    readJsonOrNull<ExternalReferenceState["coverage"]>(path.join(COVERAGE_ROOT, "summary.json")),
    readJsonOrNull<MappingManifest>(mappingPath),
    readJsonOrNull<AutoAttachedManifest>(path.join(REFERENCES_ROOT, "auto-attached-references.json")),
    readJsonOrNull<FeedbackManifest>(path.join(REFERENCES_ROOT, "source-feedback-events.json")),
    readJsonOrNull<ManualCorrectionsManifest>(path.join(REFERENCES_ROOT, "manual-source-corrections.json")),
    readJsonOrNull<ResearchProfilesManifest>(path.join(REFERENCES_ROOT, "research-source-profiles.json")),
    readJsonOrNull<EmbedStatesManifest>(path.join(REFERENCES_ROOT, "embed-states.json")),
    readJsonOrNull<QualityStatsManifest>(path.join(REFERENCES_ROOT, "source-quality-stats.generated.json")),
    readJsonOrNull<BulkCandidateManifest>(path.join(REFERENCES_ROOT, "external-reference-bulk-candidates.json")),
    readJsonOrNull<{decisions?: unknown[]}>(path.join(REFERENCES_ROOT, "candidate-review-group-decisions.json")),
    readJsonOrNull<{policyVersion?: string; generatedAt?: string; summary?: Record<string, unknown>; decisions?: unknown[]}>(recommendationPath),
    readJsonOrNull<{policyVersion?: string; generatedAt?: string; summary?: Record<string, unknown>; packets?: unknown[]}>(batchPlanPath),
    readJsonOrNull<{policyVersion?: string; generatedAt?: string; summary?: Record<string, unknown>; importContract?: Record<string, unknown>; packets?: unknown[]}>(sourceIntakeTemplatePath),
    readJsonOrNull<SourceIntakeAcceptedImportDryRunManifest>(sourceIntakeAcceptedDryRunPath),
    readJsonOrNull<SymbTrLayoutVerificationSummary>(layoutVerificationSummaryPath),
    readJsonOrNull<Record<string, unknown>>(layoutEmptyImportDryRunPath),
    readJsonOrNull<ProdCycleSummary>(PROD_CYCLE_SUMMARY_PATH),
    readJsonOrNull<SourceDiscoveryRunManifest>(sourceDiscoveryRunPath),
    readJsonOrNull<SourceDiscoveryVerificationManifest>(sourceDiscoveryVerificationPath),
    readJsonOrNull<SourceDiscoveryAcceptedImportReadyManifest>(sourceDiscoveryAcceptedImportReadyPath),
    readJsonOrNull<SourceDiscoveryProviderCoverageManifest>(sourceDiscoveryProviderCoveragePath),
    readJsonOrNull<SourceDiscoveryNegativeCacheManifest>(sourceDiscoveryNegativeCachePath),
    readJsonOrNull<SourceDiscoveryCoverageDeltaManifest>(sourceDiscoveryCoverageDeltaPath),
    readJsonOrNull<CandidateReviewRow[]>(candidateQueuePath),
    readJsonOrNull<CandidateReviewGroup[]>(candidateGroupsPath),
    readJsonOrNull<CurationBacklogRow[]>(backlogPath),
    readJsonOrNull<CurationBacklogRow[]>(nextBatchPath),
  ]);
  const candidateReviewQueue = candidateReviewQueueData ?? [];
  const candidateReviewGroups = candidateReviewGroupsData ?? [];
  const fullBacklog = (backlogData ?? nextBatchData ?? [])
    .map(enrichBacklogRow);
  const missingBacklog = fullBacklog.filter((row) => row.missingCuratedReference !== false);
  const curationState = buildCurationState({
    mapping,
    autoAttached,
    feedback,
    manualCorrections,
    researchProfiles,
    embedStates,
    qualityStats,
  });
  const autoAttachedReferences = curationState.autoAttachedReferences;
  const readOnlyCurationState = Object.fromEntries(
    Object.entries(curationState).filter(([key]) => ![
      "autoAttachedReferences",
      "feedbackEvents",
      "manualCorrections",
      "embedStates",
    ].includes(key)),
  ) as Omit<typeof curationState, "autoAttachedReferences" | "feedbackEvents">;

  return {
    coverage: coverage ?? null,
    curation: {
      ...readOnlyCurationState,
      autoAttachedReferences: sanitizeReadOnlyReferences(autoAttachedReferences),
      candidateManifest: summarizeCandidateManifest(bulkCandidateManifest),
      candidateReviewGroups: candidateReviewGroups.slice(0, DEFAULT_CANDIDATE_GROUP_LIMIT),
      candidateReviewGroupManifest: {
        artifactPath: toProjectPath(candidateGroupsPath),
        groupCount: candidateReviewGroups.length,
        visibleGroupCount: Math.min(candidateReviewGroups.length, DEFAULT_CANDIDATE_GROUP_LIMIT),
      },
      candidateReviewGroupDecisionManifest: {
        artifactPath: toProjectPath(path.join(REFERENCES_ROOT, "candidate-review-group-decisions.json")),
        decisionCount: groupDecisionManifest?.decisions?.length ?? 0,
      },
      candidateReviewGroupDecisionRecommendationManifest: {
        artifactPath: toProjectPath(recommendationPath),
        decisionCount: groupDecisionRecommendations?.decisions?.length ?? 0,
        policyVersion: groupDecisionRecommendations?.policyVersion ?? null,
        generatedAt: groupDecisionRecommendations?.generatedAt ?? null,
        summary: groupDecisionRecommendations?.summary ?? null,
      },
      candidateReviewBatchPlanManifest: {
        artifactPath: toProjectPath(batchPlanPath),
        packetCount: candidateReviewBatchPlan?.packets?.length ?? 0,
        plannedGroupCount: Number(candidateReviewBatchPlan?.summary?.plannedGroupCount ?? 0),
        plannedCandidateCount: Number(candidateReviewBatchPlan?.summary?.plannedCandidateCount ?? 0),
        packetSize: Number(candidateReviewBatchPlan?.summary?.packetSize ?? 0),
        policyVersion: candidateReviewBatchPlan?.policyVersion ?? null,
        generatedAt: candidateReviewBatchPlan?.generatedAt ?? null,
      },
      sourceIntakeTemplateManifest: {
        artifactPath: toProjectPath(sourceIntakeTemplatePath),
        packetCount: Number(sourceIntakeTemplate?.summary?.packetCount ?? 0),
        templateRowCount: Number(sourceIntakeTemplate?.summary?.templateRowCount ?? 0),
        plannedCandidateCount: Number(sourceIntakeTemplate?.summary?.plannedCandidateCount ?? 0),
        packetSize: Number(sourceIntakeTemplate?.summary?.packetSize ?? 0),
        policyVersion: sourceIntakeTemplate?.policyVersion ?? null,
        generatedAt: sourceIntakeTemplate?.generatedAt ?? null,
        targetScript: typeof sourceIntakeTemplate?.importContract?.targetScript === "string"
          ? sourceIntakeTemplate.importContract.targetScript
          : null,
      },
      sourceIntakeAcceptedImportDryRunManifest: {
        artifactPath: toProjectPath(sourceIntakeAcceptedDryRunPath),
        input: sourceIntakeAcceptedDryRun?.input ?? null,
        generatedAt: sourceIntakeAcceptedDryRun?.generatedAt ?? null,
        dryRun: sourceIntakeAcceptedDryRun?.dryRun === true,
        acceptedCandidateCount: Number(sourceIntakeAcceptedDryRun?.summary?.acceptedCandidateCount ?? 0),
        httpsAcceptedCount: Number(sourceIntakeAcceptedDryRun?.summary?.httpsAcceptedCount ?? 0),
        evidenceCompleteCount: Number(sourceIntakeAcceptedDryRun?.summary?.evidenceCompleteCount ?? 0),
        dryRunAddedCandidateCount: Number(sourceIntakeAcceptedDryRun?.summary?.dryRunAddedCandidateCount ?? 0),
        dryRunSkippedDuplicateCount: Number(sourceIntakeAcceptedDryRun?.summary?.dryRunSkippedDuplicateCount ?? 0),
        dryRunOutputCandidateCount: Number(sourceIntakeAcceptedDryRun?.summary?.dryRunOutputCandidateCount ?? 0),
        validationGateCount: Array.isArray(sourceIntakeAcceptedDryRun?.validationGates)
          ? sourceIntakeAcceptedDryRun.validationGates.length
          : 0,
        validationErrorCount: Array.isArray(sourceIntakeAcceptedDryRun?.errors)
          ? sourceIntakeAcceptedDryRun.errors.length
          : 0,
        targetScript: "npm run verify:external-source-intake",
      },
      symbtrLayoutVerificationManifest: {
        summaryPath: toProjectPath(layoutVerificationSummaryPath),
        candidateEntries: Number(layoutVerificationSummary?.candidateEntries ?? 0),
        verificationEntries: Number(layoutVerificationSummary?.verificationEntries ?? 0),
        verifiedEntries: Number(layoutVerificationSummary?.verifiedEntries ?? 0),
        verifiedMeasureBoxes: Number(layoutVerificationSummary?.verifiedMeasureBoxes ?? 0),
        unresolvedCandidateEntries: Number(layoutVerificationSummary?.unresolvedCandidateEntries ?? 0),
        candidateStatus: layoutVerificationSummary?.candidateStatus ?? null,
        promotionPolicy: layoutVerificationSummary?.promotionPolicy ?? null,
        fingerprintAlgorithm: layoutVerificationSummary?.fingerprintAlgorithm ?? null,
        reviewTemplatePath: layoutVerificationSummary?.reviewTemplate?.path ?? toProjectPath(path.join(SYMBTR_LAYOUT_REVIEW_ROOT, "layout-verification-review-template.json")),
        reviewTemplateEntryCount: Number(layoutVerificationSummary?.reviewTemplate?.entryCount ?? 0),
        reviewTemplateCandidateRows: Number(layoutVerificationSummary?.reviewTemplate?.candidateReviewRows ?? 0),
        reviewBatchPlanPath: layoutVerificationSummary?.reviewBatchPlan?.path ?? toProjectPath(path.join(SYMBTR_LAYOUT_REVIEW_ROOT, "layout-verification-review-batch-plan.json")),
        reviewBatchPacketCount: Number(layoutVerificationSummary?.reviewBatchPlan?.packetCount ?? 0),
        reviewBatchCandidateRows: Number(layoutVerificationSummary?.reviewBatchPlan?.candidateReviewRows ?? 0),
        emptyImportDryRunPath: layoutVerificationSummary?.emptyImportDryRun?.path
          ?? toProjectPath(layoutEmptyImportDryRunPath),
        emptyImportTemplatePath: typeof layoutEmptyImportDryRun?.input === "string"
          ? layoutEmptyImportDryRun.input
          : null,
        emptyImportDryRunInputEntries: Number(layoutVerificationSummary?.emptyImportDryRun?.dryRunInputEntryCount ?? 0),
        emptyImportDryRunVerifiedMeasureBoxes: Number(layoutVerificationSummary?.emptyImportDryRun?.dryRunVerifiedMeasureBoxCount ?? 0),
        emptyImportVerificationManifestBeforeSha256: layoutVerificationSummary?.emptyImportDryRun?.verificationManifestBeforeSha256 ?? null,
        emptyImportVerificationManifestAfterSha256: layoutVerificationSummary?.emptyImportDryRun?.verificationManifestAfterSha256 ?? null,
        emptyImportVerificationManifestUnchanged:
          layoutVerificationSummary?.emptyImportDryRun?.verificationManifestUnchanged === true,
        targetScript: "npm run import:symbtr-measure-verification -- --input <json>",
        emptyImportDryRunScript: "npm run verify:symbtr-layout-review-import",
        validationErrorCount: Array.isArray(layoutVerificationSummary?.errors) ? layoutVerificationSummary.errors.length : 0,
      },
      prodCycleAudit: {
        artifactPath: toProjectPath(PROD_CYCLE_SUMMARY_PATH),
        generatedAt: prodCycleSummary?.generatedAt ?? null,
        ok: prodCycleSummary?.ok === true,
        errorCount: Array.isArray(prodCycleSummary?.errors) ? prodCycleSummary.errors.length : 0,
        warningCount: Array.isArray(prodCycleSummary?.warnings) ? prodCycleSummary.warnings.length : 0,
        commandCount: Array.isArray(prodCycleSummary?.commandResults) ? prodCycleSummary.commandResults.length : 0,
        processedCatalogEntries: Number(prodCycleSummary?.pipeline?.processedCatalogEntries ?? 0),
        totalCatalogEntries: Number(prodCycleSummary?.pipeline?.totalCatalogEntries ?? 0),
        curatedReferenceEntries: Number(prodCycleSummary?.pipeline?.curatedReferenceEntries ?? 0),
        missingCuratedEntries: Number(prodCycleSummary?.pipeline?.missingCuratedEntries ?? 0),
        duplicateRowsAfterDedupe: Number(prodCycleSummary?.pipeline?.duplicateRowsAfterDedupe ?? 0),
        autoAttachAcceptedOnly: prodCycleSummary?.pipeline?.autoAttachAcceptedOnly === true,
        reviewQueueHasAccepted: prodCycleSummary?.pipeline?.reviewQueueHasAccepted === true,
        candidateReviewQueueEntries: Number(prodCycleSummary?.queueClosure?.candidateReviewQueueEntries ?? 0),
        candidateReviewGroupEntries: Number(prodCycleSummary?.queueClosure?.candidateReviewGroupEntries ?? 0),
        sourceIntakeTemplateRows: Number(prodCycleSummary?.queueClosure?.sourceIntakeTemplateRows ?? 0),
        acceptedPromotionEligibleFromReviewQueue:
          Number(prodCycleSummary?.queueClosure?.acceptedPromotionEligibleFromReviewQueue ?? 0),
        acceptedBulkCandidateCount: Number(prodCycleSummary?.queueClosure?.acceptedBulkCandidateCount ?? 0),
        reviewOnlyCandidateCount: Number(prodCycleSummary?.queueClosure?.reviewOnlyCandidateCount ?? 0),
        pdfVerifiedMeasureBoxes: Number(prodCycleSummary?.pdfVerification?.verifiedMeasureBoxes ?? 0),
        pdfVerificationManifestUnchanged:
          prodCycleSummary?.pdfVerification?.emptyImportDryRun?.verificationManifestUnchanged === true,
        targetScript: "npm run audit:prod-cycle",
      },
      sourceDiscovery: {
        artifactPath: toProjectPath(sourceDiscoveryRunPath),
        verificationArtifactPath: toProjectPath(sourceDiscoveryVerificationPath),
        acceptedImportReadyArtifactPath: toProjectPath(sourceDiscoveryAcceptedImportReadyPath),
        providerCoverageArtifactPath: toProjectPath(sourceDiscoveryProviderCoveragePath),
        negativeCacheArtifactPath: toProjectPath(sourceDiscoveryNegativeCachePath),
        coverageDeltaArtifactPath: toProjectPath(sourceDiscoveryCoverageDeltaPath),
        generatedAt: sourceDiscoveryRun?.generatedAt ?? null,
        ok: sourceDiscoveryRun?.ok === true && sourceDiscoveryVerification?.ok === true,
        dryRun: sourceDiscoveryRun?.dryRun === true,
        scope: sourceDiscoveryRun?.scope ?? "missing",
        processedMissingCatalogEntries:
          Number(sourceDiscoveryVerification?.summary?.processedMissingCatalogEntries ?? sourceDiscoveryRun?.processedMissingCatalogEntries ?? 0),
        totalMissingCatalogEntries: Number(sourceDiscoveryRun?.totalMissingCatalogEntries ?? 0),
        providerCount: Number(sourceDiscoveryVerification?.summary?.providerCount ?? sourceDiscoveryRun?.providerCount ?? 0),
        candidateCount: Number(sourceDiscoveryVerification?.summary?.candidateCount ?? sourceDiscoveryRun?.candidateCount ?? 0),
        acceptedReadyCount:
          Number(sourceDiscoveryVerification?.summary?.acceptedReadyCount ?? sourceDiscoveryAcceptedImportReady?.summary?.acceptedReadyCount ?? sourceDiscoveryRun?.acceptedReadyCount ?? 0),
        needsReviewCount: Number(sourceDiscoveryVerification?.summary?.needsReviewCount ?? sourceDiscoveryRun?.needsReviewCount ?? 0),
        conflictCount: Number(sourceDiscoveryVerification?.summary?.conflictCount ?? sourceDiscoveryRun?.conflictCount ?? 0),
        deferredCount: Number(sourceDiscoveryRun?.deferredCount ?? 0),
        negativeCacheCount:
          Number(sourceDiscoveryVerification?.summary?.negativeCacheCount ?? sourceDiscoveryNegativeCache?.summary?.negativeCacheCount ?? sourceDiscoveryRun?.negativeCacheCount ?? 0),
        directAutoAttachCount:
          Number(sourceDiscoveryVerification?.summary?.directAutoAttachCount ?? sourceDiscoveryCoverageDelta?.directAutoAttachCount ?? sourceDiscoveryRun?.directAutoAttachCount ?? 0),
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
        coverageDelta: {
          before: sourceDiscoveryCoverageDelta?.before ?? null,
          afterDryRun: sourceDiscoveryCoverageDelta?.afterDryRun ?? null,
        },
      },
      candidateReviewGroupPage: {
        offset: 0,
        limit: DEFAULT_CANDIDATE_GROUP_LIMIT,
        returnedCount: Math.min(candidateReviewGroups.length, DEFAULT_CANDIDATE_GROUP_LIMIT),
        filteredTotal: candidateReviewGroups.length,
        totalRows: candidateReviewGroups.length,
        previousOffset: null,
        nextOffset: candidateReviewGroups.length > DEFAULT_CANDIDATE_GROUP_LIMIT ? DEFAULT_CANDIDATE_GROUP_LIMIT : null,
        artifactPath: toProjectPath(candidateGroupsPath),
      },
      candidateReviewGroupFacets: {
        statuses: summarizeByValue(candidateReviewGroups, (group) => group.status),
        composers: summarizeByValue(candidateReviewGroups, (group) => group.composer),
        priorityGroups: summarizeByValue(candidateReviewGroups, (group) => group.priorityGroup),
      },
      candidateReviewQueue: candidateReviewQueue.slice(0, DEFAULT_CANDIDATE_LIMIT),
      candidateReviewPage: {
        offset: 0,
        limit: DEFAULT_CANDIDATE_LIMIT,
        returnedCount: Math.min(candidateReviewQueue.length, DEFAULT_CANDIDATE_LIMIT),
        filteredTotal: candidateReviewQueue.length,
        totalRows: candidateReviewQueue.length,
        previousOffset: null,
        nextOffset: candidateReviewQueue.length > DEFAULT_CANDIDATE_LIMIT ? DEFAULT_CANDIDATE_LIMIT : null,
        artifactPath: toProjectPath(candidateQueuePath),
      },
      candidateReviewFacets: {
        statuses: summarizeByValue(candidateReviewQueue, (row) => row.status),
        profileIds: summarizeByValue(candidateReviewQueue, (row) => row.profileId),
        providers: summarizeByValue(candidateReviewQueue, (row) => row.provider),
        confidenceLevels: [],
        composers: summarizeByValue(candidateReviewQueue, (row) => row.composer),
      },
      backlogNextBatch: missingBacklog.slice(0, DEFAULT_BACKLOG_LIMIT),
      backlogPage: {
        scope: "missing",
        offset: 0,
        limit: DEFAULT_BACKLOG_LIMIT,
        returnedCount: Math.min(missingBacklog.length, DEFAULT_BACKLOG_LIMIT),
        filteredTotal: missingBacklog.length,
        totalRows: fullBacklog.length,
        totalMissing: missingBacklog.length,
        activeQueueCount: missingBacklog.filter((row) => row.deferredFromNextBatch !== true).length,
        deferredCount: missingBacklog.filter((row) => row.deferredFromNextBatch === true).length,
        previousOffset: null,
        nextOffset: missingBacklog.length > DEFAULT_BACKLOG_LIMIT ? DEFAULT_BACKLOG_LIMIT : null,
        artifactPaths: {
          backlogJson: toProjectPath(backlogPath),
          nextBatchJson: toProjectPath(nextBatchPath),
        },
      },
      backlogFacets: {
        makams: summarizeByValue(missingBacklog, (row) => row.makam),
        forms: summarizeByValue(missingBacklog, (row) => row.form),
        usuls: summarizeByValue(missingBacklog, (row) => row.usul),
        composers: summarizeByValue(missingBacklog, (row) => row.composer),
        priorityGroups: summarizeByValue(missingBacklog, (row) => row.priorityGroup),
        decisionStatuses: [],
      },
    },
  };
}

export default async function ReferencesCurationPage() {
  const initialState = await buildReadOnlyInitialState();

  return (
    <ReferencesCurationDashboard
      initialState={initialState}
      initialMessage="Read-only batch snapshot yüklendi. Yazma, import/export ve yenileme operasyonları ops token ister."
    />
  );
}

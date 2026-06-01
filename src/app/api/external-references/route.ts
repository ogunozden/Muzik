import {execFile} from "node:child_process";
import {randomUUID} from "node:crypto";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
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
  type BacklogQuery,
  type CandidateReviewGroup,
  type CandidateReviewGroupQuery,
  type CandidateReviewQuery,
  type CandidateReviewRow,
  type CurationBacklogRow,
} from "./curation-query";
import {getCandidateReviewGroupFingerprint} from "@/data/references/candidate-review-group-fingerprint.mjs";
import {getLocalOperationAccessError} from "@/shared/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();
const INBOX_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "external-source-inbox.json");
const MAPPING_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "mapped-external-reference-candidates.json",
);
const COVERAGE_SUMMARY_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "summary.json");
const PROD_CYCLE_SUMMARY_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "prod-cycle-summary.json");
const SOURCE_DISCOVERY_RUN_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "discovery-run.json");
const SOURCE_DISCOVERY_VERIFICATION_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "discovery-verification.json");
const SOURCE_DISCOVERY_ACCEPTED_IMPORT_READY_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "accepted-import-ready.json");
const SOURCE_DISCOVERY_PROVIDER_COVERAGE_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-coverage.json");
const SOURCE_DISCOVERY_NEGATIVE_CACHE_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "negative-cache.json");
const SOURCE_DISCOVERY_COVERAGE_DELTA_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "coverage-delta.json");
const SOURCE_PROVIDER_VERIFICATION_RUN_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-run.json");
const SOURCE_PROVIDER_VERIFICATION_EVIDENCE_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-evidence.json");
const SOURCE_PROVIDER_VERIFICATION_ACCEPTED_IMPORT_READY_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-accepted-import-ready.json");
const SOURCE_PROVIDER_VERIFICATION_PLAN_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-plan.json");
const AUTO_ATTACHED_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "auto-attached-references.json");
const FEEDBACK_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "source-feedback-events.json");
const MANUAL_CORRECTIONS_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "manual-source-corrections.json");
const RESEARCH_PROFILES_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "research-source-profiles.json");
const EMBED_STATES_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "embed-states.json");
const QUALITY_STATS_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "source-quality-stats.generated.json");
const BULK_CANDIDATES_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "external-reference-bulk-candidates.json");
const CANDIDATE_REVIEW_GROUP_DECISIONS_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "candidate-review-group-decisions.json");
const BACKLOG_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "symbtr-curated-reference-backlog.json");
const NEXT_BATCH_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "symbtr-curated-reference-next-batch.json");
const CANDIDATE_REVIEW_QUEUE_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-queue.json",
);
const CANDIDATE_REVIEW_GROUPS_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-groups.json",
);
const CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
);
const CANDIDATE_REVIEW_BATCH_PLAN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-batch-plan.json",
);
const SOURCE_INTAKE_TEMPLATE_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-source-intake-template.json",
);
const SOURCE_INTAKE_ACCEPTED_DRY_RUN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "source-intake-accepted-import-dry-run.json",
);
const SYMBTR_LAYOUT_VERIFICATION_SUMMARY_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-summary.json",
);
const SYMBTR_LAYOUT_REVIEW_TEMPLATE_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-review-template.json",
);
const SYMBTR_LAYOUT_REVIEW_BATCH_PLAN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-review-batch-plan.json",
);
const SYMBTR_LAYOUT_EMPTY_IMPORT_DRY_RUN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-empty-import-dry-run.json",
);
const TEMP_INPUT_DIR = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "ui-input");
const JSON_MAX_BUFFER_BYTES = 1024 * 1024 * 12;
const MAX_BULK_TEXT_CHARS = 100_000;
const MAX_CANDIDATE_IMPORT_CHARS = 8_000_000;
const MAX_CURATION_PAYLOAD_CHARS = 20_000;
const MAX_SOURCE_FIELD_CHARS = 2_048;
const DEFAULT_BACKLOG_LIMIT = 100;
const MAX_BACKLOG_LIMIT = 500;
const DEFAULT_CANDIDATE_LIMIT = 100;
const MAX_CANDIDATE_LIMIT = 500;
const DEFAULT_CANDIDATE_GROUP_LIMIT = 80;
const MAX_CANDIDATE_GROUP_LIMIT = 500;
const MAX_CANDIDATE_REVIEW_EXPORT_ROWS = 20_000;
const MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS = 5_000;
const MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS = 5_000;
const CANDIDATE_REVIEW_GROUP_DECISION_STATUSES = new Set(["rejected", "conflict", "deferred"]);
const OPS_TOKEN_HEADER = "x-external-reference-ops-token";
const UNSAFE_LOCAL_FLAG = "EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL";
let operationInFlight = false;

type ExternalReferenceAction =
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
  | "curation-manual-correction"
  | "curation-embed-state";

const EXTERNAL_REFERENCE_ACTIONS = new Set<ExternalReferenceAction>([
  "stage",
  "map",
  "sync",
  "audit",
  "candidate-export",
  "candidate-import",
  "candidate-review-export",
  "candidate-review-group-export",
  "candidate-review-group-decision-recommendation-export",
  "candidate-review-group-decision-template-export",
  "candidate-review-group-decision-import",
  "curation-auto-attach",
  "curation-stats",
  "curation-validate",
  "curation-feedback",
  "curation-feedback-batch",
  "curation-manual-correction",
  "curation-embed-state",
]);

interface StageSourceBody {
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

interface OperationBody {
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
  manualCorrection?: unknown;
  embedState?: unknown;
}

interface CandidateReviewGroupDecisionManifest {
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

interface CandidateReviewGroupDecisionRecommendation extends CandidateReviewGroup {
  reason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  recommendationRule?: string;
  sourceGroupStatus?: string;
}

interface CandidateReviewGroupDecisionRecommendationManifest {
  version?: number;
  type?: string;
  policyVersion?: string;
  generatedAt?: string;
  summary?: Record<string, unknown>;
  decisions?: CandidateReviewGroupDecisionRecommendation[];
}

interface CandidateReviewBatchPlanManifest {
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

interface SourceIntakeTemplateManifest {
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
    directAutoAttachCount?: number;
    reasonWhenEmpty?: string;
  };
  importContract?: {
    targetScript?: string;
    acceptedOnlyAfterValidation?: boolean;
  };
  candidates?: unknown[];
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

interface SourceProviderVerificationRunManifest {
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

interface BulkCandidateManifest {
  version?: number;
  candidates?: Array<{
    catalogId?: string;
    status?: string;
    checkedAt?: string;
    source?: ExternalReferenceSource;
  }>;
}

function getAccessError(request: Request): NextResponse | null {
  return getLocalOperationAccessError(request, {
    enabledEnv: "EXTERNAL_REFERENCE_OPERATIONS_ENABLED",
    tokenEnv: "EXTERNAL_REFERENCE_OPERATIONS_TOKEN",
    unsafeLocalEnv: UNSAFE_LOCAL_FLAG,
    tokenHeader: OPS_TOKEN_HEADER,
    disabledMessage: "Harici kaynak operasyonları production ortamında açık değil.",
    missingProductionTokenMessage: "Production ortamında harici kaynak operasyon token'ı zorunlu.",
    missingTokenMessage: `Harici kaynak operasyon token'ı gerekli. Local tokenless kullanım için ${UNSAFE_LOCAL_FLAG}=true gerekir.`,
    invalidTokenMessage: "Harici kaynak operasyon token'ı geçersiz veya eksik.",
  });
}

function toProjectRelativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
}

function validateSourceFieldLengths(source: StageSourceBody): NextResponse | null {
  for (const [field, value] of Object.entries(source)) {
    if (typeof value === "string" && value.length > MAX_SOURCE_FIELD_CHARS) {
      return NextResponse.json(
        {error: `${field} alanı ${MAX_SOURCE_FIELD_CHARS} karakterden uzun olamaz.`},
        {status: 413},
      );
    }
  }

  return null;
}

async function readJsonOrNull<T>(filePath: string): Promise<T | null> {
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

function readBacklogQuery(request: Request): BacklogQuery {
  const params = new URL(request.url).searchParams;
  const scope = params.get("backlogScope");

  return {
    limit: parseBoundedInteger(params.get("backlogLimit"), DEFAULT_BACKLOG_LIMIT, MAX_BACKLOG_LIMIT),
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

function readCandidateReviewQuery(request: Request): CandidateReviewQuery {
  const params = new URL(request.url).searchParams;

  return {
    limit: parseBoundedInteger(params.get("candidateLimit"), DEFAULT_CANDIDATE_LIMIT, MAX_CANDIDATE_LIMIT),
    offset: parseNonNegativeInteger(params.get("candidateOffset"), 0),
    query: normalizeFilterValue(params.get("candidateQ") ?? params.get("q")),
    status: normalizeFilterValue(params.get("candidateStatus")),
    profileId: normalizeFilterValue(params.get("candidateProfile")),
    provider: normalizeFilterValue(params.get("candidateProvider")),
    composer: normalizeFilterValue(params.get("candidateComposer") ?? params.get("composer")),
  };
}

function readCandidateReviewGroupQuery(request: Request): CandidateReviewGroupQuery {
  const params = new URL(request.url).searchParams;

  return {
    limit: parseBoundedInteger(params.get("groupLimit"), DEFAULT_CANDIDATE_GROUP_LIMIT, MAX_CANDIDATE_GROUP_LIMIT),
    offset: parseNonNegativeInteger(params.get("groupOffset"), 0),
    query: normalizeFilterValue(params.get("groupQ") ?? params.get("q")),
    status: normalizeFilterValue(params.get("groupStatus")),
    composer: normalizeFilterValue(params.get("groupComposer") ?? params.get("composer")),
    priorityGroup: normalizeFilterValue(params.get("groupPriorityGroup") ?? params.get("priorityGroup")),
  };
}

function readCandidateReviewExportQuery(body: OperationBody): CandidateReviewQuery {
  const query = body.candidateReviewQuery ?? {};

  return {
    limit: MAX_CANDIDATE_REVIEW_EXPORT_ROWS,
    offset: 0,
    query: normalizeBodyFilterValue(query.query),
    status: normalizeBodyFilterValue(query.status),
    profileId: normalizeBodyFilterValue(query.profileId),
    provider: normalizeBodyFilterValue(query.provider),
    composer: normalizeBodyFilterValue(query.composer),
  };
}

function readCandidateReviewGroupExportQuery(body: OperationBody): CandidateReviewGroupQuery {
  const query = body.candidateReviewGroupQuery ?? {};

  return {
    limit: MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS,
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

function readCandidateReviewGroupDecisionTemplate(body: OperationBody): {
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

function summarizeBulkCandidateManifest(manifest: BulkCandidateManifest | null) {
  const candidates = Array.isArray(manifest?.candidates) ? manifest.candidates : [];
  const statusCounts = candidates.reduce<Record<string, number>>((accumulator, candidate) => {
    const status = String(candidate.status ?? "unknown");
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    artifactPath: toProjectRelativePath(BULK_CANDIDATES_FILE),
    candidateCount: candidates.length,
    acceptedCount: statusCounts.accepted ?? 0,
    needsReviewCount: statusCounts["needs-review"] ?? 0,
    rejectedCount: statusCounts.rejected ?? 0,
    conflictCount: statusCounts.conflict ?? 0,
    statusCounts,
  };
}

function isExternalReferenceAction(action: unknown): action is ExternalReferenceAction {
  return typeof action === "string" && EXTERNAL_REFERENCE_ACTIONS.has(action as ExternalReferenceAction);
}

async function getExternalReferenceState(request: Request) {
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
    candidateReviewQueue,
    candidateReviewGroups,
    fullBacklog,
    nextBatch,
  ] = await Promise.all([
    readJsonOrNull<{sources?: unknown[]}>(INBOX_FILE),
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
    }>(MAPPING_FILE),
    readJsonOrNull<Record<string, unknown>>(COVERAGE_SUMMARY_FILE),
    readJsonOrNull<{matcherVersion?: string; references?: CurationReference[]}>(AUTO_ATTACHED_FILE),
    readJsonOrNull<{events?: unknown[]}>(FEEDBACK_FILE),
    readJsonOrNull<{corrections?: unknown[]}>(MANUAL_CORRECTIONS_FILE),
    readJsonOrNull<{profiles?: unknown[]}>(RESEARCH_PROFILES_FILE),
    readJsonOrNull<{states?: unknown[]}>(EMBED_STATES_FILE),
    readJsonOrNull<{generatedAt?: string | null; stats?: CurationStat[]}>(QUALITY_STATS_FILE),
    readJsonOrNull<BulkCandidateManifest>(BULK_CANDIDATES_FILE),
    readJsonOrNull<CandidateReviewGroupDecisionManifest>(CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
    readJsonOrNull<CandidateReviewGroupDecisionRecommendationManifest>(CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE),
    readJsonOrNull<CandidateReviewBatchPlanManifest>(CANDIDATE_REVIEW_BATCH_PLAN_FILE),
    readJsonOrNull<SourceIntakeTemplateManifest>(SOURCE_INTAKE_TEMPLATE_FILE),
    readJsonOrNull<SourceIntakeAcceptedImportDryRunManifest>(SOURCE_INTAKE_ACCEPTED_DRY_RUN_FILE),
    readJsonOrNull<SymbTrLayoutVerificationSummary>(SYMBTR_LAYOUT_VERIFICATION_SUMMARY_FILE),
    readJsonOrNull<Record<string, unknown>>(SYMBTR_LAYOUT_EMPTY_IMPORT_DRY_RUN_FILE),
    readJsonOrNull<ProdCycleSummary>(PROD_CYCLE_SUMMARY_FILE),
    readJsonOrNull<SourceDiscoveryRunManifest>(SOURCE_DISCOVERY_RUN_FILE),
    readJsonOrNull<SourceDiscoveryVerificationManifest>(SOURCE_DISCOVERY_VERIFICATION_FILE),
    readJsonOrNull<SourceDiscoveryAcceptedImportReadyManifest>(SOURCE_DISCOVERY_ACCEPTED_IMPORT_READY_FILE),
    readJsonOrNull<SourceDiscoveryProviderCoverageManifest>(SOURCE_DISCOVERY_PROVIDER_COVERAGE_FILE),
    readJsonOrNull<SourceDiscoveryNegativeCacheManifest>(SOURCE_DISCOVERY_NEGATIVE_CACHE_FILE),
    readJsonOrNull<SourceDiscoveryCoverageDeltaManifest>(SOURCE_DISCOVERY_COVERAGE_DELTA_FILE),
    readJsonOrNull<SourceProviderVerificationRunManifest>(SOURCE_PROVIDER_VERIFICATION_RUN_FILE),
    readJsonOrNull<CandidateReviewRow[]>(CANDIDATE_REVIEW_QUEUE_FILE),
    readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE),
    readJsonOrNull<CurationBacklogRow[]>(BACKLOG_FILE),
    readJsonOrNull<CurationBacklogRow[]>(NEXT_BATCH_FILE),
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
          : toProjectRelativePath(CANDIDATE_REVIEW_GROUPS_FILE),
        groupCount: candidateReviewGroupRows.length,
        visibleGroupCount: candidateReviewGroupPageRows.length,
      },
      candidateReviewGroupDecisionManifest: {
        artifactPath: typeof coverage?.candidateReviewGroupDecisionsJson === "string"
          ? coverage.candidateReviewGroupDecisionsJson
          : toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
        decisionCount: candidateReviewGroupDecisionManifest?.decisions?.length ?? 0,
      },
      candidateReviewGroupDecisionRecommendationManifest: {
        artifactPath: typeof coverage?.candidateReviewGroupDecisionRecommendationsJson === "string"
          ? coverage.candidateReviewGroupDecisionRecommendationsJson
          : toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE),
        decisionCount: candidateReviewGroupDecisionRecommendationManifest?.decisions?.length ?? 0,
        policyVersion: candidateReviewGroupDecisionRecommendationManifest?.policyVersion ?? null,
        generatedAt: candidateReviewGroupDecisionRecommendationManifest?.generatedAt ?? null,
        summary: candidateReviewGroupDecisionRecommendationManifest?.summary ?? null,
      },
      candidateReviewBatchPlanManifest: {
        artifactPath: typeof coverage?.candidateReviewBatchPlanJson === "string"
          ? coverage.candidateReviewBatchPlanJson
          : toProjectRelativePath(CANDIDATE_REVIEW_BATCH_PLAN_FILE),
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
          : toProjectRelativePath(SOURCE_INTAKE_TEMPLATE_FILE),
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
        artifactPath: toProjectRelativePath(SOURCE_INTAKE_ACCEPTED_DRY_RUN_FILE),
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
        summaryPath: toProjectRelativePath(SYMBTR_LAYOUT_VERIFICATION_SUMMARY_FILE),
        candidateEntries: symbtrLayoutVerificationSummary?.candidateEntries ?? 0,
        verificationEntries: symbtrLayoutVerificationSummary?.verificationEntries ?? 0,
        verifiedEntries: symbtrLayoutVerificationSummary?.verifiedEntries ?? 0,
        verifiedMeasureBoxes: symbtrLayoutVerificationSummary?.verifiedMeasureBoxes ?? 0,
        unresolvedCandidateEntries: symbtrLayoutVerificationSummary?.unresolvedCandidateEntries ?? 0,
        candidateStatus: symbtrLayoutVerificationSummary?.candidateStatus ?? null,
        promotionPolicy: symbtrLayoutVerificationSummary?.promotionPolicy ?? null,
        fingerprintAlgorithm: symbtrLayoutVerificationSummary?.fingerprintAlgorithm ?? null,
        reviewTemplatePath: symbtrLayoutVerificationSummary?.reviewTemplate?.path ?? toProjectRelativePath(SYMBTR_LAYOUT_REVIEW_TEMPLATE_FILE),
        reviewTemplateEntryCount: symbtrLayoutVerificationSummary?.reviewTemplate?.entryCount ?? 0,
        reviewTemplateCandidateRows: symbtrLayoutVerificationSummary?.reviewTemplate?.candidateReviewRows ?? 0,
        reviewBatchPlanPath: symbtrLayoutVerificationSummary?.reviewBatchPlan?.path ?? toProjectRelativePath(SYMBTR_LAYOUT_REVIEW_BATCH_PLAN_FILE),
        reviewBatchPacketCount: symbtrLayoutVerificationSummary?.reviewBatchPlan?.packetCount ?? 0,
        reviewBatchCandidateRows: symbtrLayoutVerificationSummary?.reviewBatchPlan?.candidateReviewRows ?? 0,
        emptyImportDryRunPath: symbtrLayoutVerificationSummary?.emptyImportDryRun?.path
          ?? toProjectRelativePath(SYMBTR_LAYOUT_EMPTY_IMPORT_DRY_RUN_FILE),
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
        artifactPath: toProjectRelativePath(PROD_CYCLE_SUMMARY_FILE),
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
        artifactPath: toProjectRelativePath(SOURCE_DISCOVERY_RUN_FILE),
        verificationArtifactPath: toProjectRelativePath(SOURCE_DISCOVERY_VERIFICATION_FILE),
        acceptedImportReadyArtifactPath: toProjectRelativePath(SOURCE_DISCOVERY_ACCEPTED_IMPORT_READY_FILE),
        providerCoverageArtifactPath: toProjectRelativePath(SOURCE_DISCOVERY_PROVIDER_COVERAGE_FILE),
        negativeCacheArtifactPath: toProjectRelativePath(SOURCE_DISCOVERY_NEGATIVE_CACHE_FILE),
        coverageDeltaArtifactPath: toProjectRelativePath(SOURCE_DISCOVERY_COVERAGE_DELTA_FILE),
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
          artifactPath: toProjectRelativePath(SOURCE_PROVIDER_VERIFICATION_RUN_FILE),
          evidenceArtifactPath: toProjectRelativePath(SOURCE_PROVIDER_VERIFICATION_EVIDENCE_FILE),
          acceptedImportReadyArtifactPath: toProjectRelativePath(SOURCE_PROVIDER_VERIFICATION_ACCEPTED_IMPORT_READY_FILE),
          planArtifactPath: toProjectRelativePath(SOURCE_PROVIDER_VERIFICATION_PLAN_FILE),
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
          : toProjectRelativePath(CANDIDATE_REVIEW_QUEUE_FILE),
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
          backlogJson: typeof coverage?.backlogJson === "string" ? coverage.backlogJson : toProjectRelativePath(BACKLOG_FILE),
          nextBatchJson: typeof coverage?.nextBatchJson === "string" ? coverage.nextBatchJson : toProjectRelativePath(NEXT_BATCH_FILE),
        },
      },
      backlogFacets: buildBacklogFacets(scopedBacklogRows),
    },
  };
}

function pushArg(args: string[], key: string, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) return;
  args.push(key, value.trim());
}

function parseScriptJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

async function runNodeScript(args: string[]): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: PROJECT_ROOT,
        maxBuffer: JSON_MAX_BUFFER_BYTES,
        timeout: 120_000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr.trim() || stdout.trim() || error.message;
          reject(new Error(message));
          return;
        }

        try {
          resolve(parseScriptJson(stdout));
        } catch {
          reject(new Error(stdout.trim() || "Operation did not return JSON."));
        }
      },
    );
  });
}

async function writeBulkTextInput(content: string): Promise<{filePath: string; relativePath: string}> {
  await mkdir(TEMP_INPUT_DIR, {recursive: true});

  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.txt`);
  await writeFile(filePath, content);
  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

async function writeCandidateManifestInput(content: string): Promise<{filePath: string; relativePath: string}> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Aday manifest JSON girdisi gerekli."), {status: 400});
  }

  if (trimmed.length > MAX_CANDIDATE_IMPORT_CHARS) {
    throw Object.assign(new Error(`Aday manifest JSON girdisi ${MAX_CANDIDATE_IMPORT_CHARS} karakterden uzun olamaz.`), {
      status: 413,
    });
  }

  try {
    JSON.parse(trimmed);
  } catch {
    throw Object.assign(new Error("Aday manifest geçerli JSON olmalı."), {status: 400});
  }

  await mkdir(TEMP_INPUT_DIR, {recursive: true});
  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.json`);
  await writeFile(filePath, trimmed);

  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

async function writeCandidateReviewGroupDecisionInput(content: string): Promise<{filePath: string; relativePath: string}> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Review grup karar JSON girdisi gerekli."), {status: 400});
  }

  if (trimmed.length > MAX_CANDIDATE_IMPORT_CHARS) {
    throw Object.assign(new Error(`Review grup karar JSON girdisi ${MAX_CANDIDATE_IMPORT_CHARS} karakterden uzun olamaz.`), {
      status: 413,
    });
  }

  try {
    JSON.parse(trimmed);
  } catch {
    throw Object.assign(new Error("Review grup karar girdisi geçerli JSON olmalı."), {status: 400});
  }

  await mkdir(TEMP_INPUT_DIR, {recursive: true});
  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.json`);
  await writeFile(filePath, trimmed);

  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

async function writeJsonPayloadInput(payload: unknown): Promise<{filePath: string; relativePath: string}> {
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_CURATION_PAYLOAD_CHARS) {
    throw Object.assign(new Error(`Kürasyon operasyon girdisi ${MAX_CURATION_PAYLOAD_CHARS} karakterden uzun olamaz.`), {
      status: 413,
    });
  }

  await mkdir(TEMP_INPUT_DIR, {recursive: true});
  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.json`);
  await writeFile(filePath, serialized);

  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

async function stageSources(body: OperationBody): Promise<unknown> {
  const args = ["scripts/stage-external-sources.mjs"];
  const source = body.source ?? {};
  const hasSourceUrl = typeof source.url === "string" && source.url.trim().length > 0;
  const hasBulkText = typeof body.bulkText === "string" && body.bulkText.trim().length > 0;
  let tempInputFilePath: string | null = null;

  if (!hasSourceUrl && !hasBulkText) {
    return NextResponse.json({error: "Kaynak URL veya toplu metin gerekli."}, {status: 400});
  }

  if (hasBulkText && (body.bulkText ?? "").length > MAX_BULK_TEXT_CHARS) {
    return NextResponse.json(
      {error: `Toplu kaynak metni ${MAX_BULK_TEXT_CHARS} karakterden uzun olamaz.`},
      {status: 413},
    );
  }

  const fieldLengthError = validateSourceFieldLengths(source);
  if (fieldLengthError) return fieldLengthError;

  if (hasBulkText) {
    const tempInput = await writeBulkTextInput(body.bulkText ?? "");
    tempInputFilePath = tempInput.filePath;
    args.push("--input", tempInput.relativePath);
  }

  if (hasSourceUrl) {
    pushArg(args, "--url", source.url);
    pushArg(args, "--title", source.title);
    pushArg(args, "--provider", source.provider === "auto" ? "" : source.provider);
    pushArg(args, "--source-provider", source.sourceProvider);
    pushArg(args, "--checked-at", source.checkedAt);
    pushArg(args, "--catalog-id", source.catalogId);
    pushArg(args, "--observed-title", source.observedTitle);
    pushArg(args, "--makam", source.makam);
    pushArg(args, "--form", source.form);
    pushArg(args, "--usul", source.usul);
    pushArg(args, "--composer", source.composer);
    pushArg(args, "--lyricist", source.lyricist);
    pushArg(args, "--lyrics", source.lyrics);
  }

  if (body.dryRun) args.push("--dry-run");

  try {
    return await runNodeScript(args);
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

async function exportCandidateManifest(): Promise<unknown> {
  const manifest = await readJsonOrNull<BulkCandidateManifest>(BULK_CANDIDATES_FILE) ?? {version: 1, candidates: []};

  return {
    summary: summarizeBulkCandidateManifest(manifest),
    manifest,
  };
}

async function exportCandidateReviewQueue(body: OperationBody): Promise<unknown> {
  const rows = await readJsonOrNull<CandidateReviewRow[]>(CANDIDATE_REVIEW_QUEUE_FILE) ?? [];
  const query = readCandidateReviewExportQuery(body);
  const filteredRows = applyCandidateReviewQuery(rows, query);

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_EXPORT_ROWS) {
    return NextResponse.json(
      {error: `Aday review export ${MAX_CANDIDATE_REVIEW_EXPORT_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_QUEUE_FILE),
      totalRows: rows.length,
      exportedCount: filteredRows.length,
      filters: {
        query: query.query,
        status: query.status,
        profileId: query.profileId,
        provider: query.provider,
      },
    },
    manifest: {
      version: 1,
      type: "candidate-review-queue-export",
      filters: {
        query: query.query,
        status: query.status,
        profileId: query.profileId,
        provider: query.provider,
      },
      candidates: filteredRows,
    },
  };
}

async function exportCandidateReviewGroups(body: OperationBody): Promise<unknown> {
  const rows = await readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE) ?? [];
  const query = readCandidateReviewGroupExportQuery(body);
  const filteredRows = applyCandidateReviewGroupQuery(rows, query);

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS) {
    return NextResponse.json(
      {error: `Aday group export ${MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUPS_FILE),
      totalRows: rows.length,
      exportedCount: filteredRows.length,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
    },
    manifest: {
      version: 1,
      type: "candidate-review-group-export",
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      groups: filteredRows,
    },
  };
}

async function exportCandidateReviewGroupDecisionRecommendations(body: OperationBody): Promise<unknown> {
  const manifest = await readJsonOrNull<CandidateReviewGroupDecisionRecommendationManifest>(
    CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE,
  ) ?? {version: 1, type: "candidate-review-group-decision-recommendations", decisions: []};
  const rows = manifest.decisions ?? [];
  const query = readCandidateReviewGroupExportQuery(body);
  const filteredRows = applyCandidateReviewGroupQuery(rows, query);

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS) {
    return NextResponse.json(
      {error: `Review grup karar önerisi ${MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE),
      targetArtifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
      totalRows: rows.length,
      exportedCount: filteredRows.length,
      policyVersion: manifest.policyVersion,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
    },
    manifest: {
      version: 1,
      type: "candidate-review-group-decision-recommendation-export",
      policyVersion: manifest.policyVersion,
      generatedAt: manifest.generatedAt,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      decisions: filteredRows,
    },
  };
}

async function exportCandidateReviewGroupDecisionTemplate(body: OperationBody): Promise<unknown> {
  const rows = await readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE) ?? [];
  const query = readCandidateReviewGroupExportQuery(body);
  const template = readCandidateReviewGroupDecisionTemplate(body);
  const filteredRows = applyCandidateReviewGroupQuery(rows, query);

  if (!CANDIDATE_REVIEW_GROUP_DECISION_STATUSES.has(template.status)) {
    return NextResponse.json(
      {error: "Review grup karar durumu rejected, conflict veya deferred olmalı."},
      {status: 400},
    );
  }

  if (!template.reason) {
    return NextResponse.json({error: "Review grup karar nedeni gerekli."}, {status: 400});
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(template.reviewedAt)) {
    return NextResponse.json({error: "Review grup karar tarihi YYYY-MM-DD olmalı."}, {status: 400});
  }

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS) {
    return NextResponse.json(
      {error: `Review grup karar şablonu ${MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  const decisions = filteredRows.map((group) => ({
    groupId: group.groupId,
    catalogId: group.catalogId,
    sourceGroupFingerprint: getCandidateReviewGroupFingerprint(group),
    status: template.status,
    reason: template.reason,
    reviewedAt: template.reviewedAt,
    reviewedBy: template.reviewedBy,
  }));

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
      sourceArtifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUPS_FILE),
      totalRows: rows.length,
      exportedCount: decisions.length,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      decisionStatus: template.status,
    },
    manifest: {
      version: 1,
      type: "candidate-review-group-decision-template",
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      decisions,
    },
  };
}

async function importCandidateManifest(body: OperationBody): Promise<unknown> {
  const candidateManifestText = typeof body.candidateManifestText === "string"
    ? body.candidateManifestText
    : typeof body.candidateManifest === "object" && body.candidateManifest !== null
      ? JSON.stringify(body.candidateManifest)
      : "";
  let tempInputFilePath: string | null = null;

  try {
    const tempInput = await writeCandidateManifestInput(candidateManifestText);
    tempInputFilePath = tempInput.filePath;

    const args = ["scripts/import-external-reference-candidates.mjs", "--input", tempInput.relativePath];
    if (body.dryRun) args.push("--dry-run");

    return await runNodeScript(args);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json({error: error.message}, {status: Number(error.status)});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

async function importCandidateReviewGroupDecisionManifest(body: OperationBody): Promise<unknown> {
  const manifestText = typeof body.candidateReviewGroupDecisionManifestText === "string"
    ? body.candidateReviewGroupDecisionManifestText
    : typeof body.candidateReviewGroupDecisionManifest === "object" && body.candidateReviewGroupDecisionManifest !== null
      ? JSON.stringify(body.candidateReviewGroupDecisionManifest)
      : "";
  let tempInputFilePath: string | null = null;

  try {
    const tempInput = await writeCandidateReviewGroupDecisionInput(manifestText);
    tempInputFilePath = tempInput.filePath;

    const args = ["scripts/import-candidate-review-group-decisions.mjs", "--input", tempInput.relativePath];
    if (!body.dryRun) args.push("--write");

    return await runNodeScript(args);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json({error: error.message}, {status: Number(error.status)});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

async function runCurationPayloadAction(
  action: "feedback" | "feedback-batch" | "manual-correction" | "embed-state",
  payload: unknown,
): Promise<unknown> {
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({error: "Kürasyon operasyon girdisi gerekli."}, {status: 400});
  }

  let tempInputFilePath: string | null = null;
  try {
    const tempInput = await writeJsonPayloadInput(payload);
    tempInputFilePath = tempInput.filePath;
    return await runNodeScript(["scripts/manage-source-curation.mjs", action, "--input", tempInput.relativePath]);
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 413) {
      return NextResponse.json({error: error.message}, {status: 413});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

function requiredObjectPayload(value: unknown, label: string): unknown | NextResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({error: `${label} gerekli.`}, {status: 400});
  }

  return value;
}

function requiredArrayPayload(value: unknown, label: string): unknown[] | NextResponse {
  if (!Array.isArray(value) || value.length === 0) {
    return NextResponse.json({error: `${label} gerekli.`}, {status: 400});
  }

  return value;
}

async function runCurationOperation(body: OperationBody): Promise<unknown> {
  if (body.action === "curation-auto-attach") {
    const args = ["scripts/manage-source-curation.mjs", "auto-attach"];
    if (!body.dryRun) args.push("--write");
    return await runNodeScript(args);
  }

  if (body.action === "curation-stats") {
    const args = ["scripts/manage-source-curation.mjs", "stats"];
    if (!body.dryRun) args.push("--write");
    return await runNodeScript(args);
  }

  if (body.action === "curation-validate") {
    return await runNodeScript(["scripts/validate-source-curation.mjs"]);
  }

  if (body.action === "curation-feedback") {
    const feedback = requiredObjectPayload(body.feedback, "Feedback girdisi");
    if (feedback instanceof NextResponse) return feedback;
    return await runCurationPayloadAction("feedback", {feedback});
  }

  if (body.action === "curation-feedback-batch") {
    const feedbackEvents = requiredArrayPayload(body.feedbackEvents, "Toplu feedback girdisi");
    if (feedbackEvents instanceof NextResponse) return feedbackEvents;
    return await runCurationPayloadAction("feedback-batch", {feedbackEvents});
  }

  if (body.action === "curation-manual-correction") {
    const manualCorrection = requiredObjectPayload(body.manualCorrection, "Manuel düzeltme girdisi");
    if (manualCorrection instanceof NextResponse) return manualCorrection;
    return await runCurationPayloadAction("manual-correction", {manualCorrection});
  }

  const embedState = requiredObjectPayload(body.embedState, "Embed state girdisi");
  if (embedState instanceof NextResponse) return embedState;
  return await runCurationPayloadAction("embed-state", {embedState});
}

async function readOperationBody(request: Request): Promise<OperationBody | NextResponse> {
  try {
    return (await request.json()) as OperationBody;
  } catch {
    return NextResponse.json({error: "Geçersiz JSON gövdesi."}, {status: 400});
  }
}

async function runExclusiveOperation(callback: () => Promise<NextResponse>): Promise<NextResponse> {
  if (operationInFlight) {
    return NextResponse.json(
      {error: "Başka bir harici kaynak operasyonu devam ediyor. Bitince tekrar dene."},
      {status: 409},
    );
  }

  operationInFlight = true;
  try {
    return await callback();
  } finally {
    operationInFlight = false;
  }
}

export async function GET(request: Request) {
  try {
    const accessError = getAccessError(request);
    if (accessError) return accessError;

    return NextResponse.json(await getExternalReferenceState(request));
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Harici kaynak durumu okunamadı."},
      {status: 500},
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessError = getAccessError(request);
    if (accessError) return accessError;

    const bodyResult = await readOperationBody(request);
    if (bodyResult instanceof NextResponse) return bodyResult;

    const body = bodyResult;
    if (!isExternalReferenceAction(body.action)) {
      return NextResponse.json({error: "Geçersiz operasyon."}, {status: 400});
    }

    return await runExclusiveOperation(async () => {
      let result: unknown;

      if (body.action === "stage") {
        result = await stageSources(body);
      } else if (body.action === "map") {
        result = await runNodeScript(["scripts/map-external-source-inbox.mjs"]);
      } else if (body.action === "sync") {
        result = await runNodeScript(["scripts/map-external-source-inbox.mjs", "--write"]);
      } else if (body.action === "audit") {
        result = await runNodeScript(["scripts/audit-external-reference-coverage.mjs"]);
      } else if (body.action === "candidate-export") {
        result = await exportCandidateManifest();
      } else if (body.action === "candidate-import") {
        result = await importCandidateManifest(body);
      } else if (body.action === "candidate-review-export") {
        result = await exportCandidateReviewQueue(body);
      } else if (body.action === "candidate-review-group-export") {
        result = await exportCandidateReviewGroups(body);
      } else if (body.action === "candidate-review-group-decision-recommendation-export") {
        result = await exportCandidateReviewGroupDecisionRecommendations(body);
      } else if (body.action === "candidate-review-group-decision-template-export") {
        result = await exportCandidateReviewGroupDecisionTemplate(body);
      } else if (body.action === "candidate-review-group-decision-import") {
        result = await importCandidateReviewGroupDecisionManifest(body);
      } else {
        result = await runCurationOperation(body);
      }

      if (result instanceof NextResponse) return result;

      return NextResponse.json({
        action: body.action,
        result,
        state: await getExternalReferenceState(request),
      });
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Harici kaynak operasyonu başarısız."},
      {status: 500},
    );
  }
}

import {execFile} from "node:child_process";
import {randomUUID} from "node:crypto";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
import {SYMBTR_CATALOG, type SymbTrCatalogEntry, type SymbTrFormat} from "@/data/symbtr/catalog";
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

interface CurationReference {
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
}

interface CatalogMetadata {
  id: string;
  makam: string;
  form: string;
  usul: string;
  title: string;
  composer: string;
  formats: SymbTrFormat[];
}

interface ExternalReferenceSource {
  id?: string;
  label?: string;
  provider?: string;
  url?: string;
  title?: string;
  access?: string;
  verification?: string;
  verifiedAt?: string;
  notes?: string;
}

interface CurationReferenceView extends CurationReference {
  catalog?: CatalogMetadata | null;
  source?: ExternalReferenceSource | null;
  feedbackEvents?: unknown[];
  manualCorrection?: unknown | null;
  embedState?: unknown | null;
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
  scoreSearchQuery?: string;
  scoreSearchUrl?: string;
  scoreSourceHintQueries?: string;
  scoreSourceHintUrls?: string;
  recordingSearchQuery?: string;
  recordingSearchUrl?: string;
}

interface BacklogQuery {
  limit: number;
  offset: number;
  scope: "missing" | "active" | "all";
  query: string;
  makam: string;
  form: string;
  usul: string;
  composer: string;
  priorityGroup: string;
}

interface BacklogFacet {
  value: string;
  count: number;
}

interface CandidateReviewQuery {
  limit: number;
  offset: number;
  query: string;
  status: string;
  profileId: string;
  provider: string;
  composer: string;
}

interface CandidateReviewGroupQuery {
  limit: number;
  offset: number;
  query: string;
  status: string;
  composer: string;
  priorityGroup: string;
}

interface CandidateReviewRow {
  candidateId?: string;
  catalogId?: string;
  status?: string;
  statusReason?: string;
  profileId?: string;
  profileLabel?: string;
  provider?: string;
  trustWeight?: number;
  reviewConfidenceScore?: number;
  reviewConfidenceLevel?: string;
  searchQuery?: string;
  searchUrl?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  priorityGroup?: string;
  deferredFromNextBatch?: boolean;
  curationDecisionStatus?: string;
}

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
  decisionReason?: string;
  decisionReviewedAt?: string;
  decisionReviewedBy?: string;
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

interface CurationStat {
  profileId?: string;
  acceptedCount?: number;
  removedCount?: number;
  deletedCount?: number;
  correctedCount?: number;
  mismatchCount?: number;
  embedSuccessCount?: number;
  embedFailureCount?: number;
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

function getReferenceCountByStatus(references: CurationReference[], status: string): number {
  return references.filter((reference) => reference.status === status).length;
}

function formatCatalogValue(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function toCatalogMetadata(entry: SymbTrCatalogEntry): CatalogMetadata {
  return {
    id: entry.id,
    makam: formatCatalogValue(entry.makam),
    form: formatCatalogValue(entry.form),
    usul: formatCatalogValue(entry.usul),
    title: formatCatalogValue(entry.title),
    composer: formatCatalogValue(entry.composer),
    formats: entry.formats,
  };
}

const CATALOG_LOOKUP = new Map<string, CatalogMetadata>(
  SYMBTR_CATALOG.map((entry) => [entry.id, toCatalogMetadata(entry)]),
);

function getCatalogMetadata(catalogId: string | undefined): CatalogMetadata | null {
  return catalogId ? CATALOG_LOOKUP.get(catalogId) ?? null : null;
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

function normalizeSearchText(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function rowMatchesQuery(row: CurationBacklogRow, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);

  return [
    row.catalogId,
    row.makam,
    row.form,
    row.usul,
    row.title,
    row.composer,
    row.priorityGroup,
    row.curationDecisionStatus,
  ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

function isMissingBacklogRow(row: CurationBacklogRow): boolean {
  return row.missingCuratedReference !== false && row.hasCuratedReference !== true;
}

function applyBacklogQuery(rows: CurationBacklogRow[], query: BacklogQuery): CurationBacklogRow[] {
  const scopedRows = rows.filter((row) => {
    if (query.scope === "all") return true;
    if (!isMissingBacklogRow(row)) return false;
    return query.scope === "active" ? row.deferredFromNextBatch !== true : true;
  });

  return scopedRows.filter((row) => {
    if (query.makam && row.makam !== query.makam) return false;
    if (query.form && row.form !== query.form) return false;
    if (query.usul && row.usul !== query.usul) return false;
    if (query.composer && row.composer !== query.composer) return false;
    if (query.priorityGroup && row.priorityGroup !== query.priorityGroup) return false;
    return rowMatchesQuery(row, query.query);
  });
}

function clampBacklogOffset(offset: number, total: number, limit: number): number {
  if (total === 0) return 0;
  return Math.min(offset, Math.floor((total - 1) / limit) * limit);
}

function summarizeBacklogFacet(rows: CurationBacklogRow[], field: keyof CurationBacklogRow): BacklogFacet[] {
  const counts = rows.reduce((accumulator, row) => {
    const value = String(row[field] ?? "").trim();
    if (!value) return accumulator;
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr-TR"));
}

function buildBacklogFacets(rows: CurationBacklogRow[]) {
  return {
    makams: summarizeBacklogFacet(rows, "makam"),
    forms: summarizeBacklogFacet(rows, "form"),
    usuls: summarizeBacklogFacet(rows, "usul"),
    composers: summarizeBacklogFacet(rows, "composer"),
    priorityGroups: summarizeBacklogFacet(rows, "priorityGroup"),
    decisionStatuses: summarizeBacklogFacet(rows, "curationDecisionStatus"),
  };
}

function candidateReviewMatchesQuery(row: CandidateReviewRow, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);

  return [
    row.candidateId,
    row.catalogId,
    row.status,
    row.profileId,
    row.provider,
    row.searchQuery,
    row.makam,
    row.form,
    row.usul,
    row.title,
    row.composer,
    row.priorityGroup,
    row.curationDecisionStatus,
  ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

function applyCandidateReviewQuery(rows: CandidateReviewRow[], query: CandidateReviewQuery): CandidateReviewRow[] {
  return rows.filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (query.profileId && row.profileId !== query.profileId) return false;
    if (query.provider && row.provider !== query.provider) return false;
    if (query.composer && row.composer !== query.composer) return false;
    return candidateReviewMatchesQuery(row, query.query);
  });
}

function candidateReviewGroupMatchesQuery(row: CandidateReviewGroup, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);

  return [
    row.groupId,
    row.catalogId,
    row.status,
    row.reviewAction,
    row.makam,
    row.form,
    row.usul,
    row.title,
    row.composer,
    row.priorityGroup,
    row.profiles?.join(" "),
    row.providers?.join(" "),
    row.confidenceLevels?.join(" "),
  ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

function applyCandidateReviewGroupQuery(rows: CandidateReviewGroup[], query: CandidateReviewGroupQuery): CandidateReviewGroup[] {
  return rows.filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (query.composer && row.composer !== query.composer) return false;
    if (query.priorityGroup && row.priorityGroup !== query.priorityGroup) return false;
    return candidateReviewGroupMatchesQuery(row, query.query);
  });
}

function summarizeCandidateReviewFacet(rows: CandidateReviewRow[], field: keyof CandidateReviewRow): BacklogFacet[] {
  const counts = rows.reduce((accumulator, row) => {
    const value = String(row[field] ?? "").trim();
    if (!value) return accumulator;
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr-TR"));
}

function summarizeCandidateReviewGroupFacet(rows: CandidateReviewGroup[], field: keyof CandidateReviewGroup): BacklogFacet[] {
  const counts = rows.reduce((accumulator, row) => {
    const value = String(row[field] ?? "").trim();
    if (!value) return accumulator;
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr-TR"));
}

function buildCandidateReviewFacets(rows: CandidateReviewRow[]) {
  return {
    statuses: summarizeCandidateReviewFacet(rows, "status"),
    profileIds: summarizeCandidateReviewFacet(rows, "profileId"),
    providers: summarizeCandidateReviewFacet(rows, "provider"),
    confidenceLevels: summarizeCandidateReviewFacet(rows, "reviewConfidenceLevel"),
    composers: summarizeCandidateReviewFacet(rows, "composer"),
  };
}

function buildCandidateReviewGroupFacets(rows: CandidateReviewGroup[]) {
  return {
    statuses: summarizeCandidateReviewGroupFacet(rows, "status"),
    composers: summarizeCandidateReviewGroupFacet(rows, "composer"),
    priorityGroups: summarizeCandidateReviewGroupFacet(rows, "priorityGroup"),
  };
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

function buildSourceLookup(
  mapping: {
    mappings?: Array<{candidate?: {source?: ExternalReferenceSource}}>;
    candidates?: Array<{source?: ExternalReferenceSource}>;
  } | null,
): Map<string, ExternalReferenceSource> {
  const sources = new Map<string, ExternalReferenceSource>();

  for (const mappingItem of mapping?.mappings ?? []) {
    const source = mappingItem.candidate?.source;
    if (source?.id) sources.set(source.id, source);
  }

  for (const candidate of mapping?.candidates ?? []) {
    const source = candidate.source;
    if (source?.id) sources.set(source.id, source);
  }

  return sources;
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
    readJsonOrNull<CandidateReviewRow[]>(CANDIDATE_REVIEW_QUEUE_FILE),
    readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE),
    readJsonOrNull<CurationBacklogRow[]>(BACKLOG_FILE),
    readJsonOrNull<CurationBacklogRow[]>(NEXT_BATCH_FILE),
  ]);
  const sources = inbox?.sources ?? [];
  const mappings = mapping?.mappings ?? [];
  const references = autoAttached?.references ?? [];
  const feedbackEvents = feedback?.events ?? [];
  const corrections = manualCorrections?.corrections ?? [];
  const states = embedStates?.states ?? [];
  const stats = qualityStats?.stats ?? [];
  const sourceLookup = buildSourceLookup(mapping);
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
  const referenceViews: CurationReferenceView[] = references.map((reference) => ({
    ...reference,
    catalog: getCatalogMetadata(reference.catalogId),
    source: reference.sourceId ? sourceLookup.get(reference.sourceId) ?? null : null,
    feedbackEvents: feedbackEvents.filter((event) => (
      typeof event === "object" &&
      event !== null &&
      "catalogId" in event &&
      "sourceId" in event &&
      event.catalogId === reference.catalogId &&
      event.sourceId === reference.sourceId
    )),
    manualCorrection: corrections.find((correction) => (
      typeof correction === "object" &&
      correction !== null &&
      "catalogId" in correction &&
      "sourceId" in correction &&
      correction.catalogId === reference.catalogId &&
      correction.sourceId === reference.sourceId
    )) ?? null,
    embedState: states.find((state) => (
      typeof state === "object" &&
      state !== null &&
      "sourceId" in state &&
      state.sourceId === reference.sourceId
    )) ?? null,
  }));

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
      summary: {
        autoAttachedCount: references.length,
        removedCount: getReferenceCountByStatus(references, "user-removed"),
        deleteRequestedCount: getReferenceCountByStatus(references, "delete-requested"),
        deletedCount: getReferenceCountByStatus(references, "deleted"),
        conflictCount: references.filter((reference) => reference.confidenceLevel === "conflict" || (reference.conflicts?.length ?? 0) > 0).length,
        feedbackEventCount: feedbackEvents.length,
        manualCorrectionCount: corrections.length,
        researchSourceProfileCount: researchProfiles?.profiles?.length ?? 0,
        embedStateCount: states.length,
        sourceQualityStatCount: stats.length,
        matcherVersion: autoAttached?.matcherVersion ?? null,
        statsGeneratedAt: qualityStats?.generatedAt ?? null,
      },
      autoAttachedReferences: referenceViews.slice(0, 160),
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
      feedbackEvents: feedbackEvents.slice(-80).reverse(),
      manualCorrections: corrections.slice(0, 160),
      researchSourceProfiles: researchProfiles?.profiles ?? [],
      embedStates: states.slice(0, 160),
      sourceQualityStats: stats,
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

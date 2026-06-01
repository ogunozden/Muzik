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
const REFERENCES_ROOT = path.join(PROJECT_ROOT, "src", "data", "references");
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

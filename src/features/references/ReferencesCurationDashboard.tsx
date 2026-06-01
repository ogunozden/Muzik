"use client";

import {useCallback, useMemo, useState} from "react";
import Link from "next/link";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {Button, Input} from "@/shared/ui";
import {tokens} from "@/shared/tokens";

type CurationAction =
  | "candidate-export"
  | "candidate-import"
  | "candidate-review-export"
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

interface ExternalReferenceState {
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
      validationGates?: string[];
    };
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
    candidateReviewQueue?: CandidateReviewRow[];
    candidateReviewPage?: CandidateReviewPage;
    candidateReviewFacets?: {
      statuses?: BacklogFacet[];
      profileIds?: BacklogFacet[];
      providers?: BacklogFacet[];
      confidenceLevels?: BacklogFacet[];
    };
    backlogNextBatch?: CurationBacklogRow[];
    backlogPage?: BacklogPage;
    backlogFacets?: {
      makams?: BacklogFacet[];
      forms?: BacklogFacet[];
      usuls?: BacklogFacet[];
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
    {label: "Conflict", value: formatNumber(summary.conflictCount), meta: "eşleşme"},
    {label: "Removed", value: formatNumber(summary.removedCount), meta: "kullanıcı"},
    {label: "Feedback", value: formatNumber(summary.feedbackEventCount), meta: "event"},
    {label: "Profiles", value: formatNumber(summary.researchSourceProfileCount), meta: "site"},
  ];
}

export function ReferencesCurationDashboard() {
  const [state, setState] = useState<ExternalReferenceState>(emptyState);
  const [opsToken, setOpsToken] = useState("");
  const [activeOperation, setActiveOperation] = useState<CurationAction | "refresh" | null>(null);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER_VALUE);
  const [providerFilter, setProviderFilter] = useState(ALL_FILTER_VALUE);
  const [makamFilter, setMakamFilter] = useState(ALL_FILTER_VALUE);
  const [formFilter, setFormFilter] = useState(ALL_FILTER_VALUE);
  const [usulFilter, setUsulFilter] = useState(ALL_FILTER_VALUE);
  const [priorityGroupFilter, setPriorityGroupFilter] = useState(ALL_FILTER_VALUE);
  const [backlogOffset, setBacklogOffset] = useState(0);
  const [backlogLimit, setBacklogLimit] = useState(100);
  const [selectedReferenceKeys, setSelectedReferenceKeys] = useState<string[]>([]);
  const [candidateManifestText, setCandidateManifestText] = useState("");
  const [candidateReviewExportText, setCandidateReviewExportText] = useState("");
  const [candidateImportDryRun, setCandidateImportDryRun] = useState(true);
  const [candidateOffset, setCandidateOffset] = useState(0);
  const [candidateLimit, setCandidateLimit] = useState(100);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState(ALL_FILTER_VALUE);
  const [candidateProfileFilter, setCandidateProfileFilter] = useState(ALL_FILTER_VALUE);
  const [query, setQuery] = useState("");

  const loadState = useCallback(async (requestedBacklogOffset = backlogOffset, requestedCandidateOffset = candidateOffset) => {
    const params = new URLSearchParams({
      backlogLimit: String(backlogLimit),
      backlogOffset: String(requestedBacklogOffset),
      backlogScope: "missing",
      candidateLimit: String(candidateLimit),
      candidateOffset: String(requestedCandidateOffset),
    });

    if (query.trim()) params.set("q", query.trim());
    if (candidateStatusFilter !== ALL_FILTER_VALUE) params.set("candidateStatus", candidateStatusFilter);
    if (candidateProfileFilter !== ALL_FILTER_VALUE) params.set("candidateProfile", candidateProfileFilter);
    if (makamFilter !== ALL_FILTER_VALUE) params.set("makam", makamFilter);
    if (formFilter !== ALL_FILTER_VALUE) params.set("form", formFilter);
    if (usulFilter !== ALL_FILTER_VALUE) params.set("usul", usulFilter);
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
  }, [
    backlogLimit,
    backlogOffset,
    candidateLimit,
    candidateOffset,
    candidateProfileFilter,
    candidateStatusFilter,
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

  const refresh = useCallback(async (requestedBacklogOffset = backlogOffset, requestedCandidateOffset = candidateOffset) => {
    setActiveOperation("refresh");
    setMessage("");

    try {
      await loadState(requestedBacklogOffset, requestedCandidateOffset);
      setMessage("Kürasyon durumu yenilendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kürasyon durumu okunamadı.");
    } finally {
      setActiveOperation(null);
    }
  }, [backlogOffset, candidateOffset, loadState]);

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
  }, [formFilter, makamFilter, providerFilter, query, state, statusFilter, usulFilter]);

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
      },
    });

    if (result && typeof result === "object" && "manifest" in result) {
      setCandidateReviewExportText(JSON.stringify(result.manifest, null, 2));
    }
  }, [candidateProfileFilter, candidateStatusFilter, query, runOperation]);

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

  const filteredBacklog = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return (state.curation?.backlogNextBatch ?? []).filter((row) => {
      if (makamFilter !== ALL_FILTER_VALUE && row.makam !== makamFilter) return false;
      if (formFilter !== ALL_FILTER_VALUE && row.form !== formFilter) return false;
      if (usulFilter !== ALL_FILTER_VALUE && row.usul !== usulFilter) return false;
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
  }, [formFilter, makamFilter, priorityGroupFilter, query, state, usulFilter]);

  const filterOptions = useMemo(() => {
    const references = state.curation?.autoAttachedReferences ?? [];
    const backlog = state.curation?.backlogNextBatch ?? [];
    const backlogFacets = state.curation?.backlogFacets ?? {};
    const candidateFacets = state.curation?.candidateReviewFacets ?? {};

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
      priorityGroups: getUniqueOptions([
        ...backlog.map((row) => row.priorityGroup),
        ...getFacetValues(backlogFacets.priorityGroups),
      ]),
      candidateStatuses: getUniqueOptions(getFacetValues(candidateFacets.statuses)),
      candidateProfiles: getUniqueOptions(getFacetValues(candidateFacets.profileIds)),
    };
  }, [state]);

  const metrics = useMemo(() => metricCards(state), [state]);
  const isBusy = activeOperation !== null;
  const backlogPage = state.curation?.backlogPage;
  const candidateManifest = state.curation?.candidateManifest;
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label="Ops token"
                type="password"
                value={opsToken}
                onChange={(event) => setOpsToken(event.target.value)}
                className="sm:w-64"
              />
              <Button variant="outline" disabled={isBusy} onPress={() => void refresh()}>
                Yenile
              </Button>
              <Button variant="primary" disabled={isBusy} onPress={() => void runOperation("curation-auto-attach")}>
                Auto-attach
              </Button>
              <Button variant="secondary" disabled={isBusy} onPress={() => void runOperation("curation-stats")}>
                Stats
              </Button>
            </div>
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
                  </p>
                )}
                {candidateManifest?.artifactPath && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{candidateManifest.artifactPath}</code>
                )}
                {state.coverage?.candidateReviewQueueJson && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{state.coverage.candidateReviewQueueJson}</code>
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

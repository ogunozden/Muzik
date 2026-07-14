"use client";

import {useCallback, useMemo, useState} from "react";
import {Button, Input, UnifiedLayout} from "@/shared/ui";
import {tokens} from "@/shared/tokens";
import {
  TerminalSourceDecisionsPanel,
  type SourceTerminalDecisionEntry,
  type SourceTerminalFeedbackEvent,
} from "./TerminalSourceDecisionsPanel";
import type {
  CurationAction,
  CurationReference,
  ExternalReferenceState,
} from "./curation-dashboard-types";

import {CurationTabs} from "./CurationTabs";
import {SourceDiscoveryPanel} from "./SourceDiscoveryPanel";
import {ArtifactInventoryPanel, ProdCycleAuditPanel, QualityFeedbackPanel} from "./CurationSummaryPanels";
import {BacklogBatchPanel} from "./BacklogBatchPanel";
import {AutoAttachedSection, ReviewGroupsSection, ReviewQueueSection, type CurationReviewSectionsCtx} from "./CurationReviewSections";
import {
  ALL_FILTER_VALUE,
  buildArtifactInventory,
  formatDate,
  formatNumber,
  getFacetValues,
  getOperationMessage,
  metricCards,
  getReferenceKey,
  getReferenceProfileLabel,
  getTodayIsoDate,
  getUniqueOptions,
  matchesQuery,
  normalizeFilterText,
} from "./curation-helpers";

// Curation page (server) bu tipi dashboard modulunden bekliyor; geriye uyumlu re-export.
export type {ExternalReferenceState} from "./curation-dashboard-types";

const OPS_TOKEN_HEADER = "x-external-reference-ops-token";
const emptyState: ExternalReferenceState = {};
const candidateGroupDecisionStatusOptions = ["rejected", "conflict", "deferred"];
const deletionFilterOptions = ["Silme yok", "Silme bekleyenler", "Silinenler"];

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
  const sourceTerminalDecisions = state.curation?.sourceTerminalDecisions;
  const candidateReviewGroupPage = state.curation?.candidateReviewGroupPage;
  const candidateReviewGroups = state.curation?.candidateReviewGroups ?? [];
  const candidateReviewPage = state.curation?.candidateReviewPage;
  const candidateReviewRows = state.curation?.candidateReviewQueue ?? [];
  const batchReport = state.coverage?.batchReport;
  const selectedReferenceCount = selectedReferences.length;
  const visibleSelectableCount = filteredReferences.filter((reference) => getReferenceKey(reference) !== ":").length;
  const allVisibleReferencesSelected = visibleSelectableCount > 0 && selectedReferenceCount >= visibleSelectableCount;

  const recordTerminalFeedback = useCallback((entry: SourceTerminalDecisionEntry, eventType: string) => {
    if (!entry.catalogId) return;

    void runOperation("source-terminal-feedback", {
      sourceTerminalFeedback: {
        catalogId: entry.catalogId,
        eventType,
        reason: `source-terminal-dashboard-${eventType}`,
        previousValue: {status: entry.status},
      },
    });
  }, [runOperation]);

  const rollbackTerminalFeedback = useCallback((event: SourceTerminalFeedbackEvent) => {
    if (!event.catalogId || !event.eventId) return;

    void runOperation("source-terminal-feedback", {
      sourceTerminalFeedback: {
        catalogId: event.catalogId,
        eventType: "rolled_back",
        reason: "source-terminal-dashboard-rollback",
        previousEventId: event.eventId,
        previousValue: {eventType: event.eventType, createdAt: event.createdAt},
      },
    });
  }, [runOperation]);

  const reviewSectionsCtx: CurationReviewSectionsCtx = {
    isBusy, refresh, filterOptions,
    backlogOffset, candidateOffset, candidateReviewBatchPlanManifest, sourceIntakeTemplateManifest, sourceIntakeAcceptedImportDryRunManifest, symbtrLayoutVerificationManifest, exportCandidateReviewGroups, exportCandidateReviewQueue, exportCandidateReviewGroupDecisionTemplate, exportCandidateReviewGroupDecisionRecommendations, importCandidateReviewGroupDecisions, recordBulkFeedback, selectedReferenceCount, visibleSelectableCount,
    candidateReviewGroups, candidateReviewGroupPage: candidateReviewGroupPage ?? {}, candidateReviewGroupManifest,
    candidateReviewGroupDecisionManifest, candidateReviewGroupDecisionRecommendationManifest,
    candidateGroupExportText,
    candidateGroupDecisionText, setCandidateGroupDecisionText,
    candidateGroupDecisionStatus, setCandidateGroupDecisionStatus,
    candidateGroupDecisionReason, setCandidateGroupDecisionReason,
    candidateGroupDecisionReviewedAt, setCandidateGroupDecisionReviewedAt,
    candidateGroupDecisionDryRun, setCandidateGroupDecisionDryRun,
    candidateGroupDecisionStatusOptions, candidateGroupStatusFilter, setCandidateGroupStatusFilter,
    candidateGroupStatuses: filterOptions.candidateGroupStatuses, candidateGroupLimit, setCandidateGroupLimit,
    candidateGroupOffset, setCandidateGroupOffset,
    candidateReviewRows, candidateReviewPage: candidateReviewPage ?? {}, candidateReviewExportText,
    candidateStatusFilter, setCandidateStatusFilter,
    candidateProfileFilter, setCandidateProfileFilter,
    candidateLimit, setCandidateLimit, setCandidateOffset,
    filteredReferences, query, setQuery,
    statusFilter, setStatusFilter, providerFilter, setProviderFilter,
    makamFilter, setMakamFilter, formFilter, setFormFilter,
    usulFilter, setUsulFilter, composerFilter, setComposerFilter,
    deletionFilter, setDeletionFilter, priorityGroupFilter, setPriorityGroupFilter,
    deletionFilterOptions, selectedReferenceKeys, allVisibleReferencesSelected,
    toggleReferenceSelection, toggleVisibleReferenceSelection, recordFeedback,
  };

  return (
    <UnifiedLayout>
      <div className={`min-h-screen ${tokens.colors.background.base}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
          <CurationTabs />
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
            <ProdCycleAuditPanel prodCycleAudit={prodCycleAudit} />
          )}

          {sourceDiscovery && <SourceDiscoveryPanel sourceDiscovery={sourceDiscovery} />}

          {sourceTerminalDecisions && (
            <TerminalSourceDecisionsPanel
              decisions={sourceTerminalDecisions}
              isBusy={isBusy}
              onRecordFeedback={recordTerminalFeedback}
              onRollbackFeedback={rollbackTerminalFeedback}
            />
          )}

          <ArtifactInventoryPanel filteredArtifactInventory={filteredArtifactInventory} artifactQuery={artifactQuery} onArtifactQueryChange={setArtifactQuery} artifactCategoryFilter={artifactCategoryFilter} onArtifactCategoryFilterChange={setArtifactCategoryFilter} artifactStatusFilter={artifactStatusFilter} onArtifactStatusFilterChange={setArtifactStatusFilter} artifactFilterOptions={artifactFilterOptions} totalArtifactCount={artifactInventory.length} />

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

          <ReviewGroupsSection ctx={reviewSectionsCtx} />

          <ReviewQueueSection ctx={reviewSectionsCtx} />

          <AutoAttachedSection ctx={reviewSectionsCtx} />

          <BacklogBatchPanel filteredBacklog={filteredBacklog} backlogPage={backlogPage ?? {}} backlogOffset={backlogOffset} backlogLimit={backlogLimit} onBacklogOffsetChange={setBacklogOffset} onBacklogLimitChange={setBacklogLimit} onRefresh={refresh} isBusy={isBusy} />

          <QualityFeedbackPanel sourceQualityStats={state.curation?.sourceQualityStats ?? []} feedbackEvents={state.curation?.feedbackEvents ?? []} />
        </div>
      </div>
    </UnifiedLayout>
  );
}


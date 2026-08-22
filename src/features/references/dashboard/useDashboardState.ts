"use client";

import {useCallback, useMemo, useState} from "react";
import type {
  CurationAction,
  CurationReference,
  ExternalReferenceState,
} from "../curation-dashboard-types";
import type {
  SourceTerminalDecisionEntry,
  SourceTerminalFeedbackEvent,
} from "../TerminalSourceDecisionsPanel";
import type {CurationReviewSectionsCtx} from "../review-sections/types";
import {fetchExternalReferenceState, runExternalReferenceAction} from "@/shared/api/external-references-client";
import {useArtifactInventoryFilters} from "../hooks/useArtifactInventoryFilters";
import {useReferenceFilters} from "../hooks/useReferenceFilters";
import {useCurationSelection} from "../hooks/useCurationSelection";
import {
  ALL_FILTER_VALUE,
  buildArtifactInventory,
  getFacetValues,
  getOperationMessage,
  metricCards,
  getReferenceKey,
  getReferenceProfileLabel,
  getTodayIsoDate,
  getUniqueOptions,
  matchesQuery,
  normalizeFilterText,
} from "../curation-helpers";
import {
  candidateGroupDecisionStatusOptions,
  deletionFilterOptions,
} from "@/shared/config/curation-dashboard.config";

const emptyState: ExternalReferenceState = {};

export function useDashboardState(
  initialState: ExternalReferenceState = emptyState,
  initialMessage = "",
) {
  const [state, setState] = useState<ExternalReferenceState>(initialState);
  const [opsToken, setOpsToken] = useState("");
  const [activeOperation, setActiveOperation] = useState<CurationAction | "refresh" | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const {
    statusFilter,
    setStatusFilter,
    providerFilter,
    setProviderFilter,
    deletionFilter,
    setDeletionFilter,
  } = useReferenceFilters();
  const [makamFilter, setMakamFilter] = useState(ALL_FILTER_VALUE);
  const [formFilter, setFormFilter] = useState(ALL_FILTER_VALUE);
  const [usulFilter, setUsulFilter] = useState(ALL_FILTER_VALUE);
  const [composerFilter, setComposerFilter] = useState(ALL_FILTER_VALUE);
  const [priorityGroupFilter, setPriorityGroupFilter] = useState(ALL_FILTER_VALUE);
  const [backlogOffset, setBacklogOffset] = useState(0);
  const [backlogLimit, setBacklogLimit] = useState(100);
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
  const {
    artifactCategoryFilter,
    setArtifactCategoryFilter,
    artifactStatusFilter,
    setArtifactStatusFilter,
    artifactQuery,
    setArtifactQuery,
  } = useArtifactInventoryFilters();
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

    const nextState = await fetchExternalReferenceState<ExternalReferenceState>(
      params,
      opsToken,
      undefined,
      "Kürasyon durumu okunamadı.",
    );
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
      const {state: nextState, result} = await runExternalReferenceAction<unknown, ExternalReferenceState>(
        action,
        payload,
        opsToken,
        undefined,
        "Kürasyon operasyonu tamamlanamadı.",
      );

      setState(nextState);
      setMessage(getOperationMessage(action, result));
      return result;
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

  const {
    selectedReferenceKeys,
    setSelectedReferenceKeys,
    selectedReferences,
    toggleReferenceSelection,
    toggleVisibleReferenceSelection,
  } = useCurationSelection(filteredReferences);

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
  }, [runOperation, selectedReferences, setSelectedReferenceKeys]);

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
    candidateGroupDecisionStatusOptions: [...candidateGroupDecisionStatusOptions], candidateGroupStatusFilter, setCandidateGroupStatusFilter,
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
    deletionFilterOptions: [...deletionFilterOptions], selectedReferenceKeys, allVisibleReferencesSelected,
    toggleReferenceSelection, toggleVisibleReferenceSelection, recordFeedback,
  };

  return {
    state,
    opsToken,
    setOpsToken,
    activeOperation,
    message,
    setMessage,
    isBusy,
    statusFilter,
    setStatusFilter,
    providerFilter,
    setProviderFilter,
    deletionFilter,
    setDeletionFilter,
    makamFilter,
    setMakamFilter,
    formFilter,
    setFormFilter,
    usulFilter,
    setUsulFilter,
    composerFilter,
    setComposerFilter,
    priorityGroupFilter,
    setPriorityGroupFilter,
    backlogOffset,
    setBacklogOffset,
    backlogLimit,
    setBacklogLimit,
    candidateManifestText,
    setCandidateManifestText,
    candidateReviewExportText,
    setCandidateReviewExportText,
    candidateImportDryRun,
    setCandidateImportDryRun,
    candidateGroupExportText,
    setCandidateGroupExportText,
    candidateGroupDecisionText,
    setCandidateGroupDecisionText,
    candidateGroupDecisionDryRun,
    setCandidateGroupDecisionDryRun,
    candidateGroupDecisionStatus,
    setCandidateGroupDecisionStatus,
    candidateGroupDecisionReason,
    setCandidateGroupDecisionReason,
    candidateGroupDecisionReviewedAt,
    setCandidateGroupDecisionReviewedAt,
    candidateGroupOffset,
    setCandidateGroupOffset,
    candidateGroupLimit,
    setCandidateGroupLimit,
    candidateGroupStatusFilter,
    setCandidateGroupStatusFilter,
    candidateOffset,
    setCandidateOffset,
    candidateLimit,
    setCandidateLimit,
    candidateStatusFilter,
    setCandidateStatusFilter,
    candidateProfileFilter,
    setCandidateProfileFilter,
    artifactCategoryFilter,
    setArtifactCategoryFilter,
    artifactStatusFilter,
    setArtifactStatusFilter,
    artifactQuery,
    setArtifactQuery,
    query,
    setQuery,
    loadState,
    runOperation,
    refresh,
    recordFeedback,
    filteredReferences,
    selectedReferenceKeys,
    setSelectedReferenceKeys,
    selectedReferences,
    toggleReferenceSelection,
    toggleVisibleReferenceSelection,
    recordBulkFeedback,
    exportCandidateManifest,
    exportCandidateReviewQueue,
    exportCandidateReviewGroups,
    exportCandidateReviewGroupDecisionRecommendations,
    exportCandidateReviewGroupDecisionTemplate,
    importCandidateManifest,
    importCandidateReviewGroupDecisions,
    filteredBacklog,
    filterOptions,
    metrics,
    artifactInventory,
    filteredArtifactInventory,
    artifactFilterOptions,
    backlogPage,
    candidateManifest,
    candidateReviewGroupManifest,
    candidateReviewGroupDecisionManifest,
    candidateReviewGroupDecisionRecommendationManifest,
    candidateReviewBatchPlanManifest,
    sourceIntakeTemplateManifest,
    sourceIntakeAcceptedImportDryRunManifest,
    symbtrLayoutVerificationManifest,
    prodCycleAudit,
    sourceDiscovery,
    sourceTerminalDecisions,
    candidateReviewGroupPage,
    candidateReviewGroups,
    candidateReviewPage,
    candidateReviewRows,
    batchReport,
    selectedReferenceCount,
    visibleSelectableCount,
    allVisibleReferencesSelected,
    recordTerminalFeedback,
    rollbackTerminalFeedback,
    reviewSectionsCtx,
    candidateGroupDecisionStatusOptions,
    deletionFilterOptions,
  };
}

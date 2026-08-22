"use client";
import {useMemo, useState} from "react";
import type {CurationAction, ExternalReferenceState} from "@/features/references/curation-dashboard-types";
import type {CurationReviewSectionsCtx} from "@/features/references/review-sections/types";
import {useDashboardActions} from "@/features/references/dashboard/hooks/useDashboardActions";
import {useDashboardFilters} from "@/features/references/dashboard/hooks/useDashboardFilters";
import {useDashboardSelection} from "@/features/references/dashboard/hooks/useDashboardSelection";
import {ALL_FILTER_VALUE, buildArtifactInventory, getFacetValues, getReferenceProfileLabel, getUniqueOptions, matchesQuery, metricCards, normalizeFilterText} from "@/features/references/curation-helpers";
import {candidateGroupDecisionStatusOptions, deletionFilterOptions} from "@/shared/config/curation-dashboard.config";
const emptyState: ExternalReferenceState = {};
export function useDashboardState(initialState: ExternalReferenceState = emptyState, initialMessage = "") {
  const [state, setState] = useState<ExternalReferenceState>(initialState);
  const [opsToken, setOpsToken] = useState("");
  const [activeOperation, setActiveOperation] = useState<CurationAction | "refresh" | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const filters = useDashboardFilters();
  const {statusFilter, providerFilter, deletionFilter, makamFilter, formFilter, usulFilter, composerFilter, priorityGroupFilter, backlogOffset, backlogLimit, candidateGroupOffset, candidateGroupLimit, candidateGroupStatusFilter, candidateOffset, candidateLimit, candidateStatusFilter, candidateProfileFilter, artifactCategoryFilter, artifactStatusFilter, artifactQuery, query} = filters;
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
      return matchesQuery([reference.catalogId, reference.sourceId, reference.status, reference.confidenceLevel, reference.profileId, reference.source?.provider, reference.source?.title, reference.source?.url, reference.catalog?.makam, reference.catalog?.form, reference.catalog?.usul, reference.catalog?.title, reference.catalog?.composer], normalizedQuery);
    });
  }, [composerFilter, deletionFilter, formFilter, makamFilter, providerFilter, query, state, statusFilter, usulFilter]);
  const selection = useDashboardSelection(filteredReferences);
  const actions = useDashboardActions({setState, opsToken, setActiveOperation, setMessage, filters, selection});
  const filteredBacklog = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return (state.curation?.backlogNextBatch ?? []).filter((row) => {
      if (makamFilter !== ALL_FILTER_VALUE && row.makam !== makamFilter) return false;
      if (formFilter !== ALL_FILTER_VALUE && row.form !== formFilter) return false;
      if (usulFilter !== ALL_FILTER_VALUE && row.usul !== usulFilter) return false;
      if (composerFilter !== ALL_FILTER_VALUE && row.composer !== composerFilter) return false;
      if (priorityGroupFilter !== ALL_FILTER_VALUE && row.priorityGroup !== priorityGroupFilter) return false;
      return matchesQuery([row.catalogId, row.makam, row.form, row.usul, row.title, row.composer, row.priorityGroup, row.curationDecisionStatus], normalizedQuery);
    });
  }, [composerFilter, formFilter, makamFilter, priorityGroupFilter, query, state, usulFilter]);
  const filterOptions = useMemo(() => {
    const references = state.curation?.autoAttachedReferences ?? [];
    const backlog = state.curation?.backlogNextBatch ?? [];
    const backlogFacets = state.curation?.backlogFacets ?? {};
    const candidateFacets = state.curation?.candidateReviewFacets ?? {};
    const candidateGroupFacets = state.curation?.candidateReviewGroupFacets ?? {};
    return {statuses: getUniqueOptions(references.map((reference) => reference.status)), providers: getUniqueOptions(references.map(getReferenceProfileLabel)), makams: getUniqueOptions([...references.map((reference) => reference.catalog?.makam), ...backlog.map((row) => row.makam), ...getFacetValues(backlogFacets.makams)]), forms: getUniqueOptions([...references.map((reference) => reference.catalog?.form), ...backlog.map((row) => row.form), ...getFacetValues(backlogFacets.forms)]), usuls: getUniqueOptions([...references.map((reference) => reference.catalog?.usul), ...backlog.map((row) => row.usul), ...getFacetValues(backlogFacets.usuls)]), composers: getUniqueOptions([...references.map((reference) => reference.catalog?.composer), ...backlog.map((row) => row.composer), ...getFacetValues(candidateFacets.composers), ...getFacetValues(candidateGroupFacets.composers)]), priorityGroups: getUniqueOptions([...backlog.map((row) => row.priorityGroup), ...getFacetValues(backlogFacets.priorityGroups), ...getFacetValues(candidateGroupFacets.priorityGroups)]), candidateStatuses: getUniqueOptions(getFacetValues(candidateFacets.statuses)), candidateProfiles: getUniqueOptions(getFacetValues(candidateFacets.profileIds)), candidateGroupStatuses: getUniqueOptions(getFacetValues(candidateGroupFacets.statuses))};
  }, [state]);
  const metrics = useMemo(() => metricCards(state), [state]);
  const artifactInventory = useMemo(() => buildArtifactInventory(state), [state]);
  const filteredArtifactInventory = useMemo(() => {
    const normalizedQuery = normalizeFilterText(artifactQuery);
    return artifactInventory.filter((artifact) => {
      if (artifactCategoryFilter !== ALL_FILTER_VALUE && artifact.category !== artifactCategoryFilter) return false;
      if (artifactStatusFilter !== ALL_FILTER_VALUE && artifact.status !== artifactStatusFilter) return false;
      return matchesQuery([artifact.label, artifact.category, artifact.status, artifact.path, artifact.command, ...artifact.metrics], normalizedQuery);
    });
  }, [artifactCategoryFilter, artifactInventory, artifactQuery, artifactStatusFilter]);
  const artifactFilterOptions = useMemo(() => ({categories: getUniqueOptions(artifactInventory.map((artifact) => artifact.category)), statuses: getUniqueOptions(artifactInventory.map((artifact) => artifact.status))}), [artifactInventory]);
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
  const reviewSectionsCtx: CurationReviewSectionsCtx = {
    isBusy, refresh: actions.refresh, filterOptions, backlogOffset, candidateOffset, candidateReviewBatchPlanManifest, sourceIntakeTemplateManifest, sourceIntakeAcceptedImportDryRunManifest, symbtrLayoutVerificationManifest, exportCandidateReviewGroups: actions.exportCandidateReviewGroups, exportCandidateReviewQueue: actions.exportCandidateReviewQueue, exportCandidateReviewGroupDecisionTemplate: actions.exportCandidateReviewGroupDecisionTemplate, exportCandidateReviewGroupDecisionRecommendations: actions.exportCandidateReviewGroupDecisionRecommendations, importCandidateReviewGroupDecisions: actions.importCandidateReviewGroupDecisions, recordBulkFeedback: actions.recordBulkFeedback, selectedReferenceCount: selection.selectedReferenceCount, visibleSelectableCount: selection.visibleSelectableCount, candidateReviewGroups, candidateReviewGroupPage: candidateReviewGroupPage ?? {}, candidateReviewGroupManifest, candidateReviewGroupDecisionManifest, candidateReviewGroupDecisionRecommendationManifest, candidateGroupExportText: actions.candidateGroupExportText, candidateGroupDecisionText: actions.candidateGroupDecisionText, setCandidateGroupDecisionText: actions.setCandidateGroupDecisionText, candidateGroupDecisionStatus: actions.candidateGroupDecisionStatus, setCandidateGroupDecisionStatus: actions.setCandidateGroupDecisionStatus, candidateGroupDecisionReason: actions.candidateGroupDecisionReason, setCandidateGroupDecisionReason: actions.setCandidateGroupDecisionReason, candidateGroupDecisionReviewedAt: actions.candidateGroupDecisionReviewedAt, setCandidateGroupDecisionReviewedAt: actions.setCandidateGroupDecisionReviewedAt, candidateGroupDecisionDryRun: actions.candidateGroupDecisionDryRun, setCandidateGroupDecisionDryRun: actions.setCandidateGroupDecisionDryRun, candidateGroupDecisionStatusOptions: [...candidateGroupDecisionStatusOptions], candidateGroupStatusFilter, setCandidateGroupStatusFilter: filters.setCandidateGroupStatusFilter, candidateGroupStatuses: filterOptions.candidateGroupStatuses, candidateGroupLimit, setCandidateGroupLimit: filters.setCandidateGroupLimit, candidateGroupOffset, setCandidateGroupOffset: filters.setCandidateGroupOffset, candidateReviewRows, candidateReviewPage: candidateReviewPage ?? {}, candidateReviewExportText: actions.candidateReviewExportText, candidateStatusFilter, setCandidateStatusFilter: filters.setCandidateStatusFilter, candidateProfileFilter, setCandidateProfileFilter: filters.setCandidateProfileFilter, candidateLimit, setCandidateLimit: filters.setCandidateLimit, setCandidateOffset: filters.setCandidateOffset, filteredReferences, query, setQuery: filters.setQuery, statusFilter, setStatusFilter: filters.setStatusFilter, providerFilter, setProviderFilter: filters.setProviderFilter, makamFilter, setMakamFilter: filters.setMakamFilter, formFilter, setFormFilter: filters.setFormFilter, usulFilter, setUsulFilter: filters.setUsulFilter, composerFilter, setComposerFilter: filters.setComposerFilter, deletionFilter, setDeletionFilter: filters.setDeletionFilter, priorityGroupFilter, setPriorityGroupFilter: filters.setPriorityGroupFilter, deletionFilterOptions: [...deletionFilterOptions], selectedReferenceKeys: selection.selectedReferenceKeys, allVisibleReferencesSelected: selection.allVisibleReferencesSelected, toggleReferenceSelection: selection.toggleReferenceSelection, toggleVisibleReferenceSelection: selection.toggleVisibleReferenceSelection, recordFeedback: actions.recordFeedback,
  };
  return {
    state, opsToken, setOpsToken, activeOperation, message, setMessage, isBusy,
    statusFilter, setStatusFilter: filters.setStatusFilter, providerFilter, setProviderFilter: filters.setProviderFilter, deletionFilter, setDeletionFilter: filters.setDeletionFilter, makamFilter, setMakamFilter: filters.setMakamFilter, formFilter, setFormFilter: filters.setFormFilter, usulFilter, setUsulFilter: filters.setUsulFilter, composerFilter, setComposerFilter: filters.setComposerFilter, priorityGroupFilter, setPriorityGroupFilter: filters.setPriorityGroupFilter, backlogOffset, setBacklogOffset: filters.setBacklogOffset, backlogLimit, setBacklogLimit: filters.setBacklogLimit, candidateManifestText: actions.candidateManifestText, setCandidateManifestText: actions.setCandidateManifestText, candidateReviewExportText: actions.candidateReviewExportText, setCandidateReviewExportText: actions.setCandidateReviewExportText, candidateImportDryRun: actions.candidateImportDryRun, setCandidateImportDryRun: actions.setCandidateImportDryRun, candidateGroupExportText: actions.candidateGroupExportText, setCandidateGroupExportText: actions.setCandidateGroupExportText, candidateGroupDecisionText: actions.candidateGroupDecisionText, setCandidateGroupDecisionText: actions.setCandidateGroupDecisionText, candidateGroupDecisionDryRun: actions.candidateGroupDecisionDryRun, setCandidateGroupDecisionDryRun: actions.setCandidateGroupDecisionDryRun, candidateGroupDecisionStatus: actions.candidateGroupDecisionStatus, setCandidateGroupDecisionStatus: actions.setCandidateGroupDecisionStatus, candidateGroupDecisionReason: actions.candidateGroupDecisionReason, setCandidateGroupDecisionReason: actions.setCandidateGroupDecisionReason, candidateGroupDecisionReviewedAt: actions.candidateGroupDecisionReviewedAt, setCandidateGroupDecisionReviewedAt: actions.setCandidateGroupDecisionReviewedAt, candidateGroupOffset, setCandidateGroupOffset: filters.setCandidateGroupOffset, candidateGroupLimit, setCandidateGroupLimit: filters.setCandidateGroupLimit, candidateGroupStatusFilter, setCandidateGroupStatusFilter: filters.setCandidateGroupStatusFilter, candidateOffset, setCandidateOffset: filters.setCandidateOffset, candidateLimit, setCandidateLimit: filters.setCandidateLimit, candidateStatusFilter, setCandidateStatusFilter: filters.setCandidateStatusFilter, candidateProfileFilter, setCandidateProfileFilter: filters.setCandidateProfileFilter, artifactCategoryFilter, setArtifactCategoryFilter: filters.setArtifactCategoryFilter, artifactStatusFilter, setArtifactStatusFilter: filters.setArtifactStatusFilter, artifactQuery, setArtifactQuery: filters.setArtifactQuery, query, setQuery: filters.setQuery,
    loadState: actions.loadState, runOperation: actions.runOperation, refresh: actions.refresh, recordFeedback: actions.recordFeedback, filteredReferences, selectedReferenceKeys: selection.selectedReferenceKeys, setSelectedReferenceKeys: selection.setSelectedReferenceKeys, selectedReferences: selection.selectedReferences, toggleReferenceSelection: selection.toggleReferenceSelection, toggleVisibleReferenceSelection: selection.toggleVisibleReferenceSelection, recordBulkFeedback: actions.recordBulkFeedback, exportCandidateManifest: actions.exportCandidateManifest, exportCandidateReviewQueue: actions.exportCandidateReviewQueue, exportCandidateReviewGroups: actions.exportCandidateReviewGroups, exportCandidateReviewGroupDecisionRecommendations: actions.exportCandidateReviewGroupDecisionRecommendations, exportCandidateReviewGroupDecisionTemplate: actions.exportCandidateReviewGroupDecisionTemplate, importCandidateManifest: actions.importCandidateManifest, importCandidateReviewGroupDecisions: actions.importCandidateReviewGroupDecisions, filteredBacklog, filterOptions, metrics, artifactInventory, filteredArtifactInventory, artifactFilterOptions, backlogPage, candidateManifest, candidateReviewGroupManifest, candidateReviewGroupDecisionManifest, candidateReviewGroupDecisionRecommendationManifest, candidateReviewBatchPlanManifest, sourceIntakeTemplateManifest, sourceIntakeAcceptedImportDryRunManifest, symbtrLayoutVerificationManifest, prodCycleAudit, sourceDiscovery, sourceTerminalDecisions, candidateReviewGroupPage, candidateReviewGroups, candidateReviewPage, candidateReviewRows, batchReport, selectedReferenceCount: selection.selectedReferenceCount, visibleSelectableCount: selection.visibleSelectableCount, allVisibleReferencesSelected: selection.allVisibleReferencesSelected, recordTerminalFeedback: actions.recordTerminalFeedback, rollbackTerminalFeedback: actions.rollbackTerminalFeedback, reviewSectionsCtx, candidateGroupDecisionStatusOptions, deletionFilterOptions,
  };
}

"use client";
import {useCallback, useState} from "react";
import type {Dispatch, SetStateAction} from "react";
import type {CurationAction, CurationReference, ExternalReferenceState} from "@/features/references/curation-dashboard-types";
import type {SourceTerminalDecisionEntry, SourceTerminalFeedbackEvent} from "@/features/references/TerminalSourceDecisionsPanel";
import {fetchExternalReferenceState, runExternalReferenceAction} from "@/shared/api/external-references-client";
import {ALL_FILTER_VALUE, getOperationMessage, getTodayIsoDate} from "@/features/references/curation-helpers";
import type {DashboardFilters} from "@/features/references/dashboard/hooks/useDashboardFilters";
import type {DashboardSelection} from "@/features/references/dashboard/hooks/useDashboardSelection";
interface UseDashboardActionsParams {
  setState: Dispatch<SetStateAction<ExternalReferenceState>>;
  opsToken: string;
  setActiveOperation: Dispatch<SetStateAction<CurationAction | "refresh" | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  filters: DashboardFilters;
  selection: DashboardSelection;
}
export function useDashboardActions({setState, opsToken, setActiveOperation, setMessage, filters, selection}: UseDashboardActionsParams) {
  const [candidateManifestText, setCandidateManifestText] = useState("");
  const [candidateReviewExportText, setCandidateReviewExportText] = useState("");
  const [candidateImportDryRun, setCandidateImportDryRun] = useState(true);
  const [candidateGroupExportText, setCandidateGroupExportText] = useState("");
  const [candidateGroupDecisionText, setCandidateGroupDecisionText] = useState("");
  const [candidateGroupDecisionDryRun, setCandidateGroupDecisionDryRun] = useState(true);
  const [candidateGroupDecisionStatus, setCandidateGroupDecisionStatus] = useState("rejected");
  const [candidateGroupDecisionReason, setCandidateGroupDecisionReason] = useState("batch-reviewed-no-safe-source");
  const [candidateGroupDecisionReviewedAt, setCandidateGroupDecisionReviewedAt] = useState(getTodayIsoDate);
  const loadState = useCallback(async (requestedBacklogOffset = filters.backlogOffset, requestedCandidateOffset = filters.candidateOffset, requestedCandidateGroupOffset = filters.candidateGroupOffset) => {
    const params = new URLSearchParams({backlogLimit: String(filters.backlogLimit), backlogOffset: String(requestedBacklogOffset), backlogScope: "missing", candidateLimit: String(filters.candidateLimit), candidateOffset: String(requestedCandidateOffset), groupLimit: String(filters.candidateGroupLimit), groupOffset: String(requestedCandidateGroupOffset)});
    if (filters.query.trim()) params.set("q", filters.query.trim());
    if (filters.candidateGroupStatusFilter !== ALL_FILTER_VALUE) params.set("groupStatus", filters.candidateGroupStatusFilter);
    if (filters.candidateStatusFilter !== ALL_FILTER_VALUE) params.set("candidateStatus", filters.candidateStatusFilter);
    if (filters.candidateProfileFilter !== ALL_FILTER_VALUE) params.set("candidateProfile", filters.candidateProfileFilter);
    if (filters.makamFilter !== ALL_FILTER_VALUE) params.set("makam", filters.makamFilter);
    if (filters.formFilter !== ALL_FILTER_VALUE) params.set("form", filters.formFilter);
    if (filters.usulFilter !== ALL_FILTER_VALUE) params.set("usul", filters.usulFilter);
    if (filters.composerFilter !== ALL_FILTER_VALUE) params.set("composer", filters.composerFilter);
    if (filters.priorityGroupFilter !== ALL_FILTER_VALUE) params.set("priorityGroup", filters.priorityGroupFilter);
    const nextState = await fetchExternalReferenceState<ExternalReferenceState>(params, opsToken, undefined, "Kürasyon durumu okunamadı.");
    setState(nextState);
    filters.setBacklogOffset(nextState.curation?.backlogPage?.offset ?? requestedBacklogOffset);
    filters.setCandidateOffset(nextState.curation?.candidateReviewPage?.offset ?? requestedCandidateOffset);
    filters.setCandidateGroupOffset(nextState.curation?.candidateReviewGroupPage?.offset ?? requestedCandidateGroupOffset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.backlogLimit, filters.backlogOffset, filters.candidateGroupLimit, filters.candidateGroupOffset, filters.candidateGroupStatusFilter, filters.candidateLimit, filters.candidateOffset, filters.candidateProfileFilter, filters.candidateStatusFilter, filters.composerFilter, filters.formFilter, filters.makamFilter, filters.priorityGroupFilter, filters.query, filters.usulFilter, opsToken, setState, filters.setBacklogOffset, filters.setCandidateGroupOffset, filters.setCandidateOffset]);
  const runOperation = useCallback(async (action: CurationAction, payload: Record<string, unknown> = {}) => {
    setActiveOperation(action);
    setMessage("");
    try {
      const {state: nextState, result} = await runExternalReferenceAction<unknown, ExternalReferenceState>(action, payload, opsToken, undefined, "Kürasyon operasyonu tamamlanamadı.");
      setState(nextState);
      setMessage(getOperationMessage(action, result));
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kürasyon operasyonu tamamlanamadı.");
      return null;
    } finally {
      setActiveOperation(null);
    }
  }, [opsToken, setActiveOperation, setMessage, setState]);
  const refresh = useCallback(async (requestedBacklogOffset = filters.backlogOffset, requestedCandidateOffset = filters.candidateOffset, requestedCandidateGroupOffset = filters.candidateGroupOffset) => {
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
  }, [filters.backlogOffset, filters.candidateGroupOffset, filters.candidateOffset, loadState, setActiveOperation, setMessage]);
  const recordFeedback = useCallback((reference: CurationReference, eventType: "user-approved" | "user-prioritized" | "user-removed") => {
    if (!reference.catalogId || !reference.sourceId) return;
    void runOperation("curation-feedback", {feedback: {catalogId: reference.catalogId, sourceId: reference.sourceId, eventType, reason: `curation-dashboard-${eventType}`}});
  }, [runOperation]);
  const recordBulkFeedback = useCallback((eventType: "user-approved" | "user-prioritized" | "user-removed") => {
    const feedbackEvents = selection.selectedReferences.filter((reference) => reference.catalogId && reference.sourceId).map((reference) => ({catalogId: reference.catalogId, sourceId: reference.sourceId, eventType, reason: `curation-dashboard-bulk-${eventType}`}));
    if (feedbackEvents.length === 0) return;
    void runOperation("curation-feedback-batch", {feedbackEvents});
    selection.setSelectedReferenceKeys([]);
  }, [runOperation, selection]);
  const exportCandidateManifest = useCallback(async () => {
    const result = await runOperation("candidate-export");
    if (result && typeof result === "object" && "manifest" in result) setCandidateManifestText(JSON.stringify((result as {manifest: unknown}).manifest, null, 2));
  }, [runOperation]);
  const exportCandidateReviewQueue = useCallback(async () => {
    const result = await runOperation("candidate-review-export", {candidateReviewQuery: {query: filters.query, status: filters.candidateStatusFilter, profileId: filters.candidateProfileFilter, composer: filters.composerFilter}});
    if (result && typeof result === "object" && "manifest" in result) setCandidateReviewExportText(JSON.stringify((result as {manifest: unknown}).manifest, null, 2));
  }, [filters.candidateProfileFilter, filters.candidateStatusFilter, filters.composerFilter, filters.query, runOperation]);
  const exportCandidateReviewGroups = useCallback(async () => {
    const result = await runOperation("candidate-review-group-export", {candidateReviewGroupQuery: {query: filters.query, status: filters.candidateGroupStatusFilter, composer: filters.composerFilter, priorityGroup: filters.priorityGroupFilter}});
    if (result && typeof result === "object" && "manifest" in result) setCandidateGroupExportText(JSON.stringify((result as {manifest: unknown}).manifest, null, 2));
  }, [filters.candidateGroupStatusFilter, filters.composerFilter, filters.priorityGroupFilter, filters.query, runOperation]);
  const exportCandidateReviewGroupDecisionRecommendations = useCallback(async () => {
    const result = await runOperation("candidate-review-group-decision-recommendation-export", {candidateReviewGroupQuery: {query: filters.query, status: filters.candidateGroupStatusFilter, composer: filters.composerFilter, priorityGroup: filters.priorityGroupFilter}});
    if (result && typeof result === "object" && "manifest" in result) setCandidateGroupDecisionText(JSON.stringify((result as {manifest: unknown}).manifest, null, 2));
  }, [filters.candidateGroupStatusFilter, filters.composerFilter, filters.priorityGroupFilter, filters.query, runOperation]);
  const exportCandidateReviewGroupDecisionTemplate = useCallback(async () => {
    const result = await runOperation("candidate-review-group-decision-template-export", {candidateReviewGroupQuery: {query: filters.query, status: filters.candidateGroupStatusFilter, composer: filters.composerFilter, priorityGroup: filters.priorityGroupFilter}, candidateReviewGroupDecisionTemplate: {status: candidateGroupDecisionStatus, reason: candidateGroupDecisionReason, reviewedAt: candidateGroupDecisionReviewedAt, reviewedBy: "local-operator"}});
    if (result && typeof result === "object" && "manifest" in result) setCandidateGroupDecisionText(JSON.stringify((result as {manifest: unknown}).manifest, null, 2));
  }, [candidateGroupDecisionReason, candidateGroupDecisionReviewedAt, candidateGroupDecisionStatus, filters.candidateGroupStatusFilter, filters.composerFilter, filters.priorityGroupFilter, filters.query, runOperation]);
  const importCandidateManifest = useCallback(() => {
    if (!candidateManifestText.trim()) { setMessage("Aday manifest JSON girdisi gerekli."); return; }
    void runOperation("candidate-import", {candidateManifestText, dryRun: candidateImportDryRun});
  }, [candidateImportDryRun, candidateManifestText, runOperation, setMessage]);
  const importCandidateReviewGroupDecisions = useCallback(() => {
    if (!candidateGroupDecisionText.trim()) { setMessage("Review grup karar JSON girdisi gerekli."); return; }
    void runOperation("candidate-review-group-decision-import", {candidateReviewGroupDecisionManifestText: candidateGroupDecisionText, dryRun: candidateGroupDecisionDryRun});
  }, [candidateGroupDecisionDryRun, candidateGroupDecisionText, runOperation, setMessage]);
  const recordTerminalFeedback = useCallback((entry: SourceTerminalDecisionEntry, eventType: string) => {
    if (!entry.catalogId) return;
    void runOperation("source-terminal-feedback", {sourceTerminalFeedback: {catalogId: entry.catalogId, eventType, reason: `source-terminal-dashboard-${eventType}`, previousValue: {status: entry.status}}});
  }, [runOperation]);
  const rollbackTerminalFeedback = useCallback((event: SourceTerminalFeedbackEvent) => {
    if (!event.catalogId || !event.eventId) return;
    void runOperation("source-terminal-feedback", {sourceTerminalFeedback: {catalogId: event.catalogId, eventType: "rolled_back", reason: "source-terminal-dashboard-rollback", previousEventId: event.eventId, previousValue: {eventType: event.eventType, createdAt: event.createdAt}}});
  }, [runOperation]);
  return {candidateManifestText, setCandidateManifestText, candidateReviewExportText, setCandidateReviewExportText, candidateImportDryRun, setCandidateImportDryRun, candidateGroupExportText, setCandidateGroupExportText, candidateGroupDecisionText, setCandidateGroupDecisionText, candidateGroupDecisionDryRun, setCandidateGroupDecisionDryRun, candidateGroupDecisionStatus, setCandidateGroupDecisionStatus, candidateGroupDecisionReason, setCandidateGroupDecisionReason, candidateGroupDecisionReviewedAt, setCandidateGroupDecisionReviewedAt, loadState, runOperation, refresh, recordFeedback, recordBulkFeedback, exportCandidateManifest, exportCandidateReviewQueue, exportCandidateReviewGroups, exportCandidateReviewGroupDecisionRecommendations, exportCandidateReviewGroupDecisionTemplate, importCandidateManifest, importCandidateReviewGroupDecisions, recordTerminalFeedback, rollbackTerminalFeedback};
}

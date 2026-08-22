"use client";

import {useState} from "react";
import {ALL_FILTER_VALUE} from "@/features/references/curation-helpers";
import {useArtifactInventoryFilters} from "@/features/references/hooks/useArtifactInventoryFilters";
import {useReferenceFilters} from "@/features/references/hooks/useReferenceFilters";

/**
 * Dashboard filter state — atomized slice of `useDashboardState`.
 * Owns all client-side filter/pagination/query state that drives
 * `loadState` params and local `filteredReferences` / `filteredBacklog` memos.
 * Delegates to existing leaf hooks (`useReferenceFilters`, `useArtifactInventoryFilters`)
 * so the composer re-exports a single flat API without duplication.
 * No hardcode; `ALL_FILTER_VALUE` from curation-helpers, imports via `@/`.
 */
export function useDashboardFilters() {
  const {
    statusFilter,
    setStatusFilter,
    providerFilter,
    setProviderFilter,
    deletionFilter,
    setDeletionFilter,
  } = useReferenceFilters();

  const {
    artifactCategoryFilter,
    setArtifactCategoryFilter,
    artifactStatusFilter,
    setArtifactStatusFilter,
    artifactQuery,
    setArtifactQuery,
  } = useArtifactInventoryFilters();

  const [makamFilter, setMakamFilter] = useState(ALL_FILTER_VALUE);
  const [formFilter, setFormFilter] = useState(ALL_FILTER_VALUE);
  const [usulFilter, setUsulFilter] = useState(ALL_FILTER_VALUE);
  const [composerFilter, setComposerFilter] = useState(ALL_FILTER_VALUE);
  const [priorityGroupFilter, setPriorityGroupFilter] = useState(ALL_FILTER_VALUE);
  const [backlogOffset, setBacklogOffset] = useState(0);
  const [backlogLimit, setBacklogLimit] = useState(100);
  const [candidateGroupOffset, setCandidateGroupOffset] = useState(0);
  const [candidateGroupLimit, setCandidateGroupLimit] = useState(80);
  const [candidateGroupStatusFilter, setCandidateGroupStatusFilter] = useState(ALL_FILTER_VALUE);
  const [candidateOffset, setCandidateOffset] = useState(0);
  const [candidateLimit, setCandidateLimit] = useState(100);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState(ALL_FILTER_VALUE);
  const [candidateProfileFilter, setCandidateProfileFilter] = useState(ALL_FILTER_VALUE);
  const [query, setQuery] = useState("");

  return {
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
  };
}

export type DashboardFilters = ReturnType<typeof useDashboardFilters>;

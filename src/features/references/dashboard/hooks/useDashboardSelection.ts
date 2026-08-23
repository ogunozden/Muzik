"use client";

import {useMemo} from "react";
import type {CurationReference} from "@/features/references/curation-dashboard-types";
import {getReferenceKey} from "@/features/references/curation-helpers";
import {useCurationSelection} from "@/features/references/hooks/useCurationSelection";

/**
 * Dashboard selection state — atomized slice of `useDashboardState`.
 * Wraps the existing leaf hook `useCurationSelection` which already owns
 * `selectedReferenceKeys` / `selectedReferences` / toggles. Adds derived
 * counts (`selectedReferenceCount`, `visibleSelectableCount`,
 * `allVisibleReferencesSelected`) that were previously inline in the god hook,
 * so the composer stays thin. Imports via `@/`, no hardcode.
 */
export function useDashboardSelection(filteredReferences: readonly CurationReference[]) {
  const {
    selectedReferenceKeys,
    setSelectedReferenceKeys,
    selectedReferences,
    toggleReferenceSelection,
    toggleVisibleReferenceSelection,
  } = useCurationSelection(filteredReferences);

  const selectedReferenceCount = selectedReferences.length;

  const visibleSelectableCount = useMemo(
    () => filteredReferences.filter((reference) => getReferenceKey(reference) !== ":").length,
    [filteredReferences],
  );

  const allVisibleReferencesSelected =
    visibleSelectableCount > 0 && selectedReferenceCount >= visibleSelectableCount;

  return {
    selectedReferenceKeys,
    setSelectedReferenceKeys,
    selectedReferences,
    toggleReferenceSelection,
    toggleVisibleReferenceSelection,
    selectedReferenceCount,
    visibleSelectableCount,
    allVisibleReferencesSelected,
  };
}

export type DashboardSelection = ReturnType<typeof useDashboardSelection>;

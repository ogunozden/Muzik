"use client";

import {UnifiedLayout} from "@/shared/ui";
import {tokens} from "@/shared/tokens";
import {TerminalSourceDecisionsPanel} from "./TerminalSourceDecisionsPanel";
import {SourceDiscoveryPanel} from "./SourceDiscoveryPanel";
import {ArtifactInventoryPanel, ProdCycleAuditPanel, QualityFeedbackPanel} from "./CurationSummaryPanels";
import {BacklogBatchPanel} from "./BacklogBatchPanel";
import {AutoAttachedSection, ReviewGroupsSection, ReviewQueueSection} from "./CurationReviewSections";
import {useDashboardState} from "./dashboard/useDashboardState";
import {DashboardHeader} from "./dashboard/DashboardHeader";
import {DashboardFilters} from "./dashboard/DashboardFilters";
import {DashboardTables} from "./dashboard/DashboardTables";
import type {ExternalReferenceState} from "./curation-dashboard-types";

// Curation page (server) bu tipi dashboard modulunden bekliyor; geriye uyumlu re-export.
export type {ExternalReferenceState} from "./curation-dashboard-types";

const emptyState: ExternalReferenceState = {};

export function ReferencesCurationDashboard({
  initialState = emptyState,
  initialMessage = "",
}: {
  initialState?: ExternalReferenceState;
  initialMessage?: string;
}) {
  const {
    state,
    opsToken,
    setOpsToken,
    isBusy,
    message,
    refresh,
    runOperation,
    metrics,
    filteredArtifactInventory,
    artifactQuery,
    setArtifactQuery,
    artifactCategoryFilter,
    setArtifactCategoryFilter,
    artifactStatusFilter,
    setArtifactStatusFilter,
    artifactFilterOptions,
    artifactInventory,
    prodCycleAudit,
    sourceDiscovery,
    sourceTerminalDecisions,
    recordTerminalFeedback,
    rollbackTerminalFeedback,
    filteredBacklog,
    backlogPage,
    backlogOffset,
    setBacklogOffset,
    backlogLimit,
    setBacklogLimit,
    candidateManifestText,
    setCandidateManifestText,
    candidateImportDryRun,
    setCandidateImportDryRun,
    exportCandidateManifest,
    importCandidateManifest,
    reviewSectionsCtx,
  } = useDashboardState(initialState, initialMessage);

  return (
    <UnifiedLayout>
      <div className={`min-h-screen ${tokens.colors.background.base}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
          <DashboardHeader
            state={state}
            opsToken={opsToken}
            setOpsToken={setOpsToken}
            isBusy={isBusy}
            message={message}
            refresh={refresh}
            runOperation={runOperation}
          />

          <DashboardFilters metrics={metrics} />

          {prodCycleAudit && <ProdCycleAuditPanel prodCycleAudit={prodCycleAudit} />}

          {sourceDiscovery && <SourceDiscoveryPanel sourceDiscovery={sourceDiscovery} />}

          {sourceTerminalDecisions && (
            <TerminalSourceDecisionsPanel
              decisions={sourceTerminalDecisions}
              isBusy={isBusy}
              onRecordFeedback={recordTerminalFeedback}
              onRollbackFeedback={rollbackTerminalFeedback}
            />
          )}

          <ArtifactInventoryPanel
            filteredArtifactInventory={filteredArtifactInventory}
            artifactQuery={artifactQuery}
            onArtifactQueryChange={setArtifactQuery}
            artifactCategoryFilter={artifactCategoryFilter}
            onArtifactCategoryFilterChange={setArtifactCategoryFilter}
            artifactStatusFilter={artifactStatusFilter}
            onArtifactStatusFilterChange={setArtifactStatusFilter}
            artifactFilterOptions={artifactFilterOptions}
            totalArtifactCount={artifactInventory.length}
          />

          <DashboardTables
            state={state}
            isBusy={isBusy}
            candidateManifestText={candidateManifestText}
            setCandidateManifestText={setCandidateManifestText}
            candidateImportDryRun={candidateImportDryRun}
            setCandidateImportDryRun={setCandidateImportDryRun}
            exportCandidateManifest={exportCandidateManifest}
            importCandidateManifest={importCandidateManifest}
          />

          <ReviewGroupsSection ctx={reviewSectionsCtx} />

          <ReviewQueueSection ctx={reviewSectionsCtx} />

          <AutoAttachedSection ctx={reviewSectionsCtx} />

          <BacklogBatchPanel
            filteredBacklog={filteredBacklog}
            backlogPage={backlogPage ?? {}}
            backlogOffset={backlogOffset}
            backlogLimit={backlogLimit}
            onBacklogOffsetChange={setBacklogOffset}
            onBacklogLimitChange={setBacklogLimit}
            onRefresh={refresh}
            isBusy={isBusy}
          />

          <QualityFeedbackPanel
            sourceQualityStats={state.curation?.sourceQualityStats ?? []}
            feedbackEvents={state.curation?.feedbackEvents ?? []}
          />
        </div>
      </div>
    </UnifiedLayout>
  );
}

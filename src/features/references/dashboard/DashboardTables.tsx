"use client";

import {Button} from "@/shared/ui";
import {tokens} from "@/shared/tokens";
import {formatNumber} from "../curation-helpers";
import type {ExternalReferenceState} from "../curation-dashboard-types";

interface DashboardTablesProps {
  state: ExternalReferenceState;
  isBusy: boolean;
  candidateManifestText: string;
  setCandidateManifestText: (value: string) => void;
  candidateImportDryRun: boolean;
  setCandidateImportDryRun: (value: boolean) => void;
  exportCandidateManifest: () => Promise<void> | void;
  importCandidateManifest: () => void;
}

export function DashboardTables({
  state,
  isBusy,
  candidateManifestText,
  setCandidateManifestText,
  candidateImportDryRun,
  setCandidateImportDryRun,
  exportCandidateManifest,
  importCandidateManifest,
}: DashboardTablesProps) {
  const candidateManifest = state.curation?.candidateManifest;
  const batchReport = state.coverage?.batchReport;

  return (
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
  );
}

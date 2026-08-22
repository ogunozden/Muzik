import type {CurationAction, CurationBacklogRow, ExternalReferenceState} from "@/features/references/curation-dashboard-types";

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatNumber(value: unknown): string {
  return typeof value === "number" ? new Intl.NumberFormat("tr-TR").format(value) : "-";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function statusClasses(status: string | undefined): string {
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

export function formatBacklogFormats(row: CurationBacklogRow): string {
  if (row.availableFormats) return row.availableFormats.replace(/\|/g, " / ");

  return [
    row.hasTxt ? "txt" : null,
    row.hasMusicXml ? "xml" : null,
    row.hasPdf ? "pdf" : null,
  ].filter(Boolean).join(" / ") || "-";
}

export function getArtifactStatusLabel(status: string): string {
  if (status === "ok") return "OK";
  if (status === "needs-review") return "Review";
  if (status === "dry-run") return "Dry-run";
  if (status === "empty-template") return "Boş template";
  if (status === "candidate-only") return "Aday";
  return status || "-";
}

export function getOperationMessage(action: CurationAction, result: unknown): string {
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

  if (action === "candidate-review-group-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Review grupları dışa aktarıldı: ${formatNumber(exportSummary.exportedCount)} grup.`;
  }

  if (action === "candidate-review-group-decision-template-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Review grup karar şablonu üretildi: ${formatNumber(exportSummary.exportedCount)} karar.`;
  }

  if (action === "candidate-review-group-decision-recommendation-export") {
    const exportSummary = (summary.summary ?? {}) as Record<string, unknown>;
    return `Review grup karar önerileri üretildi: ${formatNumber(exportSummary.exportedCount)} karar.`;
  }

  if (action === "candidate-review-group-decision-import") {
    return `Review grup kararları işlendi: ${formatNumber(summary.outputDecisionCount)} karar.`;
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

  if (action === "source-terminal-feedback") {
    return `Terminal kaynak feedback kaydedildi: ${formatNumber(summary.activeEventCount ?? summary.eventCount)} aktif, ${formatNumber(summary.rolledBackEventCount)} rollback.`;
  }

  return "Kürasyon doğrulandı.";
}

export function metricCards(state: ExternalReferenceState) {
  const summary = state.curation?.summary ?? {};
  const backlogPage = state.curation?.backlogPage ?? {};
  const batchReport = state.coverage?.batchReport;
  const terminal = state.curation?.sourceTerminalDecisions;

  return [
    {label: "Auto", value: formatNumber(summary.autoAttachedCount), meta: summary.matcherVersion ?? "matcher"},
    {label: "Terminal", value: formatNumber(terminal?.terminalDecisionGroupCount), meta: `${formatNumber(terminal?.disputedCount)} disputed`},
    {label: "Backlog", value: formatNumber(state.coverage?.missingCuratedEntries), meta: `${formatNumber(backlogPage.returnedCount)} / ${formatNumber(backlogPage.filteredTotal)} sırada`},
    {label: "Batch", value: formatNumber(batchReport?.processedCatalogEntries), meta: `${formatNumber(batchReport?.generatedReviewCandidates)} aday`},
    {label: "Matrix", value: formatNumber(state.coverage?.coverageMatrixEntries), meta: "coverage kırılımı"},
    {label: "Dedupe", value: formatNumber(state.coverage?.duplicateRowsAfterDedupe), meta: `${formatNumber(state.coverage?.cleanedDuplicateRows)} temizlenen`},
    {label: "Conflict", value: formatNumber(summary.conflictCount), meta: "eşleşme"},
    {label: "Removed", value: formatNumber(summary.removedCount), meta: "kullanıcı"},
    {label: "Feedback", value: formatNumber(summary.feedbackEventCount), meta: "event"},
    {label: "Profiles", value: formatNumber(summary.researchSourceProfileCount), meta: "site"},
  ];
}

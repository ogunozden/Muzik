import type {
  ArtifactInventoryItem,
  BacklogFacet,
  CatalogMetadata,
  CurationAction,
  CurationBacklogRow,
  CurationReference,
  ExternalReferenceState,
} from "./curation-dashboard-types";

/**
 * ReferencesCurationDashboard saf yardimcilari (M8.2 bolme): formatlama,
 * filtre eslesme, facet ve artifact envanteri. JSX/token icermez; bagimsiz
 * test edilebilir.
 */

export const ALL_FILTER_VALUE = "all";

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

export function normalizeFilterText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : "";
}

export function matchesQuery(values: unknown[], normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return values.some((value) => normalizeFilterText(value).includes(normalizedQuery));
}

export function getUniqueOptions(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((first, second) => first.localeCompare(second, "tr-TR"));
}

export function getFacetValues(facets: BacklogFacet[] | undefined): string[] {
  return (facets ?? []).map((facet) => facet.value).filter(Boolean);
}

export function renderCatalogLine(catalog: CatalogMetadata | null | undefined): string {
  return [catalog?.makam, catalog?.form, catalog?.usul].filter(Boolean).join(" / ") || "-";
}

export function getSourceLabel(reference: CurationReference): string {
  return reference.source?.title ?? reference.source?.label ?? reference.sourceId ?? "-";
}

export function getReferenceProfileLabel(reference: CurationReference): string {
  return [reference.profileId, reference.source?.provider].filter(Boolean).join(" / ") || "-";
}

export function getReferenceKey(reference: CurationReference): string {
  return `${reference.catalogId ?? ""}:${reference.sourceId ?? ""}`;
}

export function getFirstHintUrl(row: CurationBacklogRow): string | undefined {
  return row.scoreSourceHintUrls
    ?.split("|")
    .map((url) => url.trim())
    .find(Boolean);
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

export function buildArtifactInventory(state: ExternalReferenceState): ArtifactInventoryItem[] {
  const items = new Map<string, ArtifactInventoryItem>();

  const addItem = (item: ArtifactInventoryItem | null | undefined) => {
    if (!item?.path) return;
    const existing = items.get(item.path);
    if (!existing) {
      items.set(item.path, item);
      return;
    }

    items.set(item.path, {
      ...existing,
      metrics: Array.from(new Set([...existing.metrics, ...item.metrics])),
      command: existing.command ?? item.command,
    });
  };

  const coverage = state.coverage;
  const curation = state.curation;
  const summary = curation?.summary;
  const candidateManifest = curation?.candidateManifest;
  const candidateReviewGroupManifest = curation?.candidateReviewGroupManifest;
  const candidateReviewGroupDecisionManifest = curation?.candidateReviewGroupDecisionManifest;
  const candidateReviewGroupDecisionRecommendationManifest = curation?.candidateReviewGroupDecisionRecommendationManifest;
  const candidateReviewBatchPlanManifest = curation?.candidateReviewBatchPlanManifest;
  const sourceIntakeTemplateManifest = curation?.sourceIntakeTemplateManifest;
  const sourceIntakeAcceptedImportDryRunManifest = curation?.sourceIntakeAcceptedImportDryRunManifest;
  const symbtrLayoutVerificationManifest = curation?.symbtrLayoutVerificationManifest;
  const prodCycleAudit = curation?.prodCycleAudit;
  const sourceDiscovery = curation?.sourceDiscovery;
  const sourceTerminalDecisions = curation?.sourceTerminalDecisions;

  if (coverage) {
    addItem({
      id: "coverage-summary",
      label: "Coverage summary",
      category: "Coverage",
      status: "ok",
      path: "output/external-reference-coverage/summary.json",
      metrics: [
        `${formatNumber(coverage.totalCatalogEntries)} eser`,
        `${formatNumber(coverage.missingCuratedEntries)} eksik`,
        `${formatNumber(coverage.candidateReviewQueueEntries)} aday`,
      ],
      command: "npm run audit:external-references",
    });
  }

  addItem(candidateManifest?.artifactPath ? {
    id: "bulk-candidates",
    label: "Bulk candidate manifest",
    category: "Candidate",
    status: (candidateManifest.needsReviewCount ?? 0) > 0 ? "needs-review" : "ok",
    path: candidateManifest.artifactPath,
    metrics: [
      `${formatNumber(candidateManifest.candidateCount)} aday`,
      `${formatNumber(candidateManifest.acceptedCount)} accepted`,
      `${formatNumber(candidateManifest.needsReviewCount)} review`,
      `${formatNumber(candidateManifest.conflictCount)} conflict`,
    ],
    command: "npm run import:external-references -- --input <json>",
  } : null);

  addItem(coverage?.candidateReviewQueueJson ? {
    id: "candidate-review-queue",
    label: "Candidate review queue",
    category: "Review",
    status: "needs-review",
    path: coverage.candidateReviewQueueJson,
    metrics: [`${formatNumber(coverage.candidateReviewQueueEntries)} aday`],
  } : null);

  addItem(coverage?.coverageMatrixJson ? {
    id: "coverage-matrix",
    label: "Coverage matrix",
    category: "Coverage",
    status: "ok",
    path: coverage.coverageMatrixJson,
    metrics: [`${formatNumber(coverage.coverageMatrixEntries)} kırılım`],
  } : null);

  addItem(coverage?.dedupeReportJson ? {
    id: "dedupe-report",
    label: "Dedupe report",
    category: "Dedupe",
    status: (coverage.duplicateRowsAfterDedupe ?? 0) > 0 ? "needs-review" : "ok",
    path: coverage.dedupeReportJson,
    metrics: [
      `${formatNumber(coverage.duplicateRowsAfterDedupe)} duplicate`,
      `${formatNumber(coverage.cleanedDuplicateRows)} temizlenen`,
    ],
  } : null);

  addItem(curation?.backlogPage?.artifactPaths?.backlogJson ? {
    id: "backlog",
    label: "Missing source backlog",
    category: "Backlog",
    status: "needs-review",
    path: curation.backlogPage.artifactPaths.backlogJson,
    metrics: [
      `${formatNumber(curation.backlogPage.totalMissing)} eksik`,
      `${formatNumber(curation.backlogPage.activeQueueCount)} aktif`,
      `${formatNumber(curation.backlogPage.deferredCount)} deferred`,
    ],
  } : null);

  addItem(curation?.backlogPage?.artifactPaths?.nextBatchJson ? {
    id: "next-batch",
    label: "Next backlog batch",
    category: "Backlog",
    status: "needs-review",
    path: curation.backlogPage.artifactPaths.nextBatchJson,
    metrics: [`${formatNumber(curation.backlogPage.returnedCount)} gösterilen`],
  } : null);

  addItem(candidateReviewGroupManifest?.artifactPath ? {
    id: "candidate-review-groups",
    label: "Candidate review groups",
    category: "Review",
    status: "needs-review",
    path: candidateReviewGroupManifest.artifactPath,
    metrics: [`${formatNumber(candidateReviewGroupManifest.groupCount)} grup`],
  } : null);

  addItem(candidateReviewGroupDecisionManifest?.artifactPath ? {
    id: "candidate-review-decisions",
    label: "Review group decisions",
    category: "Decision",
    status: "ok",
    path: candidateReviewGroupDecisionManifest.artifactPath,
    metrics: [`${formatNumber(candidateReviewGroupDecisionManifest.decisionCount)} karar`],
    command: "npm run import:candidate-review-decisions -- --input <json>",
  } : null);

  addItem(candidateReviewGroupDecisionRecommendationManifest?.artifactPath ? {
    id: "candidate-review-recommendations",
    label: "Decision recommendations",
    category: "Decision",
    status: "needs-review",
    path: candidateReviewGroupDecisionRecommendationManifest.artifactPath,
    metrics: [`${formatNumber(candidateReviewGroupDecisionRecommendationManifest.decisionCount)} öneri`],
  } : null);

  addItem(candidateReviewBatchPlanManifest?.artifactPath ? {
    id: "candidate-review-batch-plan",
    label: "Review batch plan",
    category: "Batch",
    status: "needs-review",
    path: candidateReviewBatchPlanManifest.artifactPath,
    metrics: [
      `${formatNumber(candidateReviewBatchPlanManifest.packetCount)} paket`,
      `${formatNumber(candidateReviewBatchPlanManifest.plannedGroupCount)} grup`,
      `${formatNumber(candidateReviewBatchPlanManifest.plannedCandidateCount)} aday`,
    ],
  } : null);

  addItem(sourceIntakeTemplateManifest?.artifactPath ? {
    id: "source-intake-template",
    label: "Source intake template",
    category: "Intake",
    status: "empty-template",
    path: sourceIntakeTemplateManifest.artifactPath,
    metrics: [
      `${formatNumber(sourceIntakeTemplateManifest.packetCount)} paket`,
      `${formatNumber(sourceIntakeTemplateManifest.templateRowCount)} boş satır`,
    ],
    command: sourceIntakeTemplateManifest.targetScript,
  } : null);

  addItem(sourceIntakeAcceptedImportDryRunManifest?.artifactPath ? {
    id: "source-intake-accepted-dry-run",
    label: "Accepted source dry-run",
    category: "Validation",
    status: sourceIntakeAcceptedImportDryRunManifest.dryRun ? "dry-run" : "needs-review",
    path: sourceIntakeAcceptedImportDryRunManifest.artifactPath,
    metrics: [
      `${formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted`,
      `${formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationErrorCount)} hata`,
    ],
    command: sourceIntakeAcceptedImportDryRunManifest.targetScript,
  } : null);

  addItem(prodCycleAudit?.artifactPath ? {
    id: "prod-cycle-summary",
    label: "Prod-cycle audit summary",
    category: "Validation",
    status: prodCycleAudit.ok ? "ok" : "needs-review",
    path: prodCycleAudit.artifactPath,
    metrics: [
      `${formatNumber(prodCycleAudit.processedCatalogEntries)} eser`,
      `${formatNumber(prodCycleAudit.candidateReviewQueueEntries)} review-only`,
      `${formatNumber(prodCycleAudit.errorCount)} hata`,
      `${formatNumber(prodCycleAudit.warningCount)} uyarı`,
    ],
    command: prodCycleAudit.targetScript,
  } : null);

  addItem(sourceDiscovery?.artifactPath ? {
    id: "source-discovery-run",
    label: "External source discovery run",
    category: "Discovery",
    status: sourceDiscovery.ok ? "dry-run" : "needs-review",
    path: sourceDiscovery.artifactPath,
    metrics: [
      `${formatNumber(sourceDiscovery.processedMissingCatalogEntries)} eksik işlendi`,
      `${formatNumber(sourceDiscovery.candidateCount)} aday`,
      `${formatNumber(sourceDiscovery.acceptedReadyCount)} accepted-ready`,
      `${formatNumber(sourceDiscovery.directAutoAttachCount)} direct attach`,
    ],
    command: sourceDiscovery.targetScript,
  } : null);

  addItem(sourceDiscovery?.acceptedImportReadyArtifactPath ? {
    id: "source-discovery-accepted-import-ready",
    label: "Discovery accepted import-ready",
    category: "Discovery",
    status: sourceDiscovery.acceptedReadyCount ? "needs-review" : "dry-run",
    path: sourceDiscovery.acceptedImportReadyArtifactPath,
    metrics: [
      `${formatNumber(sourceDiscovery.acceptedReadyCount)} accepted-ready`,
      `${formatNumber(sourceDiscovery.directAutoAttachCount)} direct attach`,
    ],
    command: sourceDiscovery.targetImportDryRun,
  } : null);

  addItem(sourceDiscovery?.providerCoverageArtifactPath ? {
    id: "source-discovery-provider-coverage",
    label: "Discovery provider coverage",
    category: "Discovery",
    status: "dry-run",
    path: sourceDiscovery.providerCoverageArtifactPath,
    metrics: [
      `${formatNumber(sourceDiscovery.providerCount)} provider`,
      `${formatNumber(sourceDiscovery.negativeCacheCount)} negative cache`,
    ],
  } : null);

  const providerVerification = sourceDiscovery?.providerVerification;
  addItem(providerVerification?.artifactPath ? {
    id: "provider-verification-run",
    label: "Provider verification run",
    category: "Verification",
    status: providerVerification.ok ? "dry-run" : "needs-review",
    path: providerVerification.artifactPath,
    metrics: [
      `${formatNumber(providerVerification.processedGroupCount)} grup işlendi`,
      `${formatNumber(providerVerification.verificationPacketCount ?? providerVerification.resultCount)} packet`,
      `${formatNumber(providerVerification.acceptedReadyCount)} accepted-ready`,
      `${formatNumber(providerVerification.directAutoAttachCount)} direct attach`,
    ],
    command: providerVerification.targetScript,
  } : null);

  addItem(providerVerification?.evidenceArtifactPath ? {
    id: "provider-verification-evidence",
    label: "Provider verification evidence",
    category: "Verification",
    status: "dry-run",
    path: providerVerification.evidenceArtifactPath,
    metrics: [
      `${formatNumber(providerVerification.needsReviewCount)} review`,
      `${formatNumber(providerVerification.rejectedCount)} rejected`,
      `${formatNumber(providerVerification.cacheHitCount)} cache hit`,
    ],
  } : null);

  addItem(providerVerification?.planArtifactPath ? {
    id: "provider-verification-plan",
    label: "Provider verification plan",
    category: "Verification",
    status: "dry-run",
    path: providerVerification.planArtifactPath,
    metrics: [
      `${formatNumber(providerVerification.providerCount)} provider`,
      `${formatNumber(providerVerification.totalBacklogGroupCount)} backlog`,
      `${formatNumber(providerVerification.totalEligibleGroupCount)} eligible`,
    ],
    command: providerVerification.targetScript,
  } : null);

  addItem(providerVerification?.coverageArtifactPath ? {
    id: "provider-verification-coverage",
    label: "Provider verification coverage",
    category: "Verification",
    status: "dry-run",
    path: providerVerification.coverageArtifactPath,
    metrics: [
      `${formatNumber(providerVerification.cumulativeVerifiedOrClassifiedCount)} classified`,
      `${formatNumber(providerVerification.networkProviderRemainingGroupCount)} network left`,
      `${formatNumber(providerVerification.directAutoAttachCount)} direct attach`,
    ],
    command: providerVerification.targetScript,
  } : null);

  addItem(providerVerification?.batchRunArtifactPath ? {
    id: "provider-verification-batch-run",
    label: "Provider verification batch runner",
    category: "Verification",
    status: "dry-run",
    path: providerVerification.batchRunArtifactPath,
    metrics: [
      `${formatNumber(providerVerification.batchRunCompletedCount)} batch`,
      `${formatNumber(providerVerification.batchRunFinalVerifiedCount)} IA verified`,
      `${formatNumber(providerVerification.batchRunFinalRemainingCount)} IA left`,
    ],
    command: providerVerification.continueScript ?? "npm run verify:external-source-providers:continue",
  } : null);

  addItem(sourceTerminalDecisions?.artifactPath ? {
    id: "source-terminal-decisions",
    label: "Source terminal decisions",
    category: "Decision",
    status: "ok",
    path: sourceTerminalDecisions.artifactPath,
    metrics: [
      `${formatNumber(sourceTerminalDecisions.terminalDecisionGroupCount)} terminal`,
      `${formatNumber(sourceTerminalDecisions.disputedCount)} disputed`,
      `${formatNumber(sourceTerminalDecisions.verifiedUnavailableCount)} unavailable`,
      `${formatNumber(sourceTerminalDecisions.deferredCount)} deferred`,
    ],
    command: "npm run stage:source-terminal-decisions",
  } : null);

  addItem(sourceTerminalDecisions?.feedbackArtifactPath ? {
    id: "source-terminal-feedback",
    label: "Source terminal feedback events",
    category: "Runtime data",
    status: "ok",
    path: sourceTerminalDecisions.feedbackArtifactPath,
    metrics: [`${formatNumber(sourceTerminalDecisions.feedbackEventCount)} event`],
  } : null);

  addItem(symbtrLayoutVerificationManifest?.summaryPath ? {
    id: "symbtr-layout-summary",
    label: "SymbTr layout validation summary",
    category: "PDF",
    status: (symbtrLayoutVerificationManifest.validationErrorCount ?? 0) > 0 ? "needs-review" : "candidate-only",
    path: symbtrLayoutVerificationManifest.summaryPath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.candidateEntries)} aday eser`,
      `${formatNumber(symbtrLayoutVerificationManifest.verifiedMeasureBoxes)} verified`,
    ],
    command: "npm run verify:symbtr-measures",
  } : null);

  addItem(symbtrLayoutVerificationManifest?.reviewTemplatePath ? {
    id: "symbtr-layout-review-template",
    label: "PDF layout review template",
    category: "PDF",
    status: "candidate-only",
    path: symbtrLayoutVerificationManifest.reviewTemplatePath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.reviewTemplateEntryCount)} eser`,
      `${formatNumber(symbtrLayoutVerificationManifest.reviewTemplateCandidateRows)} aday satır`,
    ],
  } : null);

  addItem(symbtrLayoutVerificationManifest?.reviewBatchPlanPath ? {
    id: "symbtr-layout-review-batch",
    label: "PDF layout review batch",
    category: "PDF",
    status: "candidate-only",
    path: symbtrLayoutVerificationManifest.reviewBatchPlanPath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.reviewBatchPacketCount)} paket`,
      `${formatNumber(symbtrLayoutVerificationManifest.reviewBatchCandidateRows)} aday satır`,
    ],
  } : null);

  addItem(symbtrLayoutVerificationManifest?.emptyImportDryRunPath ? {
    id: "symbtr-layout-empty-dry-run",
    label: "PDF empty import dry-run",
    category: "Validation",
    status: "dry-run",
    path: symbtrLayoutVerificationManifest.emptyImportDryRunPath,
    metrics: [
      `${formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunInputEntries)} import`,
      `${formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunVerifiedMeasureBoxes)} verified`,
    ],
    command: symbtrLayoutVerificationManifest.emptyImportDryRunScript,
  } : null);

  addItem(symbtrLayoutVerificationManifest?.emptyImportTemplatePath ? {
    id: "symbtr-layout-empty-template",
    label: "PDF empty import template",
    category: "PDF",
    status: "empty-template",
    path: symbtrLayoutVerificationManifest.emptyImportTemplatePath,
    metrics: ["0 import"],
  } : null);

  addItem({
    id: "auto-attached",
    label: "Auto-attached references",
    category: "Runtime data",
    status: (summary?.conflictCount ?? 0) > 0 ? "needs-review" : "ok",
    path: "src/data/references/auto-attached-references.json",
    metrics: [
      `${formatNumber(summary?.autoAttachedCount)} auto`,
      `${formatNumber(summary?.conflictCount)} conflict`,
    ],
    command: "npm run curation:auto-attach",
  });

  addItem({
    id: "source-feedback",
    label: "Source feedback events",
    category: "Runtime data",
    status: "ok",
    path: "src/data/references/source-feedback-events.json",
    metrics: [`${formatNumber(summary?.feedbackEventCount)} event`],
  });

  addItem({
    id: "manual-corrections",
    label: "Manual source corrections",
    category: "Runtime data",
    status: "ok",
    path: "src/data/references/manual-source-corrections.json",
    metrics: [`${formatNumber(summary?.manualCorrectionCount)} düzeltme`],
  });

  addItem({
    id: "research-profiles",
    label: "Research source profiles",
    category: "Policy",
    status: "ok",
    path: "src/data/references/research-source-profiles.json",
    metrics: [`${formatNumber(summary?.researchSourceProfileCount)} profil`],
  });

  addItem({
    id: "source-quality-stats",
    label: "Source quality stats",
    category: "Quality",
    status: "ok",
    path: "src/data/references/source-quality-stats.generated.json",
    metrics: [`${formatNumber(summary?.sourceQualityStatCount)} site`],
    command: "npm run curation:stats",
  });

  return Array.from(items.values()).sort((left, right) => (
    left.category.localeCompare(right.category, "tr-TR") ||
    left.label.localeCompare(right.label, "tr-TR")
  ));
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

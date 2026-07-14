import {tokens} from "@/shared/tokens";
import {CurationFilterSelect} from "./CurationFilterSelect";
import {formatDate, formatNumber, getArtifactStatusLabel} from "./curation-helpers";
import type {ArtifactInventoryItem, ExternalReferenceState} from "./curation-dashboard-types";

type Curation = NonNullable<ExternalReferenceState["curation"]>;

/**
 * Kurasyon ozet panelleri (M8.2 bolme): prod-cycle audit ozeti, artifact
 * envanteri tablosu ve site-kalitesi/feedback loglari. Saf gosterim.
 */

export function ProdCycleAuditPanel({prodCycleAudit}: {prodCycleAudit: NonNullable<Curation["prodCycleAudit"]>}) {
  return (
            <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Prod-cycle audit</h2>
                  <p className={`text-xs ${tokens.colors.text.secondary}`}>
                    {prodCycleAudit.ok ? "OK" : "Review"} · {formatNumber(prodCycleAudit.commandCount)} komut · {formatNumber(prodCycleAudit.errorCount)} hata · {formatNumber(prodCycleAudit.warningCount)} uyarı · {formatDate(prodCycleAudit.generatedAt)}
                  </p>
                  {prodCycleAudit.artifactPath && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{prodCycleAudit.artifactPath}</code>
                  )}
                  {prodCycleAudit.targetScript && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{prodCycleAudit.targetScript}</code>
                  )}
                </div>
                <div className="grid w-full gap-2 text-sm sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Catalog</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(prodCycleAudit.processedCatalogEntries)} / {formatNumber(prodCycleAudit.totalCatalogEntries)}</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Queue</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(prodCycleAudit.candidateReviewQueueEntries)} aday · {formatNumber(prodCycleAudit.candidateReviewGroupEntries)} grup</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Safety</div>
                    <div className={tokens.colors.text.primary}>{prodCycleAudit.autoAttachAcceptedOnly ? "accepted-only" : "review"} · {formatNumber(prodCycleAudit.duplicateRowsAfterDedupe)} duplicate</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>PDF</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(prodCycleAudit.pdfVerifiedMeasureBoxes)} verified · {prodCycleAudit.pdfVerificationManifestUnchanged ? "hash OK" : "hash review"}</div>
                  </div>
                </div>
              </div>
            </section>
  );
}

export function ArtifactInventoryPanel({
  filteredArtifactInventory,
  artifactQuery,
  onArtifactQueryChange,
  artifactCategoryFilter,
  onArtifactCategoryFilterChange,
  artifactStatusFilter,
  onArtifactStatusFilterChange,
  artifactFilterOptions,
  totalArtifactCount,
}: {
  filteredArtifactInventory: ArtifactInventoryItem[];
  artifactQuery: string;
  onArtifactQueryChange: (value: string) => void;
  artifactCategoryFilter: string;
  onArtifactCategoryFilterChange: (value: string) => void;
  artifactStatusFilter: string;
  onArtifactStatusFilterChange: (value: string) => void;
  artifactFilterOptions: {categories: string[]; statuses: string[]};
  totalArtifactCount: number;
}) {
  return (
          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Artifact izleme</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(filteredArtifactInventory.length)} gösteriliyor · {formatNumber(totalArtifactCount)} artifact · batch pipeline kanıtları, manifestler ve runtime veri dosyaları
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3 lg:max-w-3xl">
                <label htmlFor="artifact-search" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Artifact ara
                  <input
                    id="artifact-search"
                    value={artifactQuery}
                    onChange={(event) => onArtifactQueryChange(event.target.value)}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  />
                </label>
                <CurationFilterSelect label="Artifact kategori" value={artifactCategoryFilter} options={artifactFilterOptions.categories} onChange={onArtifactCategoryFilterChange} />
                <CurationFilterSelect label="Artifact durum" value={artifactStatusFilter} options={artifactFilterOptions.statuses} onChange={onArtifactStatusFilterChange} />
              </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredArtifactInventory.length === 0 ? (
                <div className={`col-span-full py-6 text-sm ${tokens.colors.text.secondary}`}>Artifact yok.</div>
              ) : (
                filteredArtifactInventory.map((artifact) => (
                  <article key={artifact.id} className={`min-w-0 border ${tokens.colors.border.base} ${tokens.radius.md} p-3`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-sm border border-[var(--color-border)] px-2 py-1 text-xs ${tokens.colors.text.secondary}`}>{artifact.category}</span>
                      <span className={`rounded-sm px-2 py-1 text-xs ${artifact.status === "ok" || artifact.status === "dry-run" ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-warning)] text-[var(--color-text-primary)]"}`}>
                        {getArtifactStatusLabel(artifact.status)}
                      </span>
                    </div>
                    <h3 className={`mt-2 text-sm font-semibold ${tokens.colors.text.primary}`}>{artifact.label}</h3>
                    <code className="mt-2 block break-all text-xs text-[var(--color-text-primary)]">{artifact.path}</code>
                    <div className={`mt-2 flex flex-wrap gap-2 text-xs ${tokens.colors.text.secondary}`}>
                      {artifact.metrics.map((metric) => (
                        <span key={metric} className="rounded-sm bg-[var(--color-background-muted)] px-2 py-1">{metric}</span>
                      ))}
                    </div>
                    {artifact.command && (
                      <code className="mt-2 block break-all text-xs text-[var(--color-text-primary)]">{artifact.command}</code>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
  );
}

export function QualityFeedbackPanel({
  sourceQualityStats,
  feedbackEvents,
}: {
  sourceQualityStats: NonNullable<Curation["sourceQualityStats"]>;
  feedbackEvents: NonNullable<Curation["feedbackEvents"]>;
}) {
  return (
          <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
            <div className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Site kalitesi</h2>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                      <th className="px-4 py-3 font-medium">Site</th>
                      <th className="px-4 py-3 font-medium">Accepted</th>
                      <th className="px-4 py-3 font-medium">Removed</th>
                      <th className="px-4 py-3 font-medium">Mismatch</th>
                      <th className="px-4 py-3 font-medium">Embed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceQualityStats.map((stat) => (
                      <tr key={stat.profileId} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{stat.profileId}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatNumber(stat.acceptedCount)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatNumber(stat.removedCount)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatNumber(stat.mismatchCount)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {formatNumber(stat.embedSuccessCount)} / {formatNumber(stat.embedFailureCount)}
                        </td>
                      </tr>
                    ))}
                    {sourceQualityStats.length === 0 && (
                      <tr>
                        <td colSpan={5} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                          Kayıt yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Feedback log</h2>
              </div>
              <div className="flex max-h-[28rem] flex-col overflow-y-auto">
                {feedbackEvents.length === 0 ? (
                  <div className={`px-4 py-8 text-sm ${tokens.colors.text.secondary}`}>Kayıt yok.</div>
                ) : (
                  feedbackEvents.map((event) => (
                    <article key={event.eventId ?? `${event.catalogId}-${event.sourceId}-${event.createdAt}`} className="border-b border-[var(--color-border)] px-4 py-3 last:border-b-0">
                      <div className={`text-sm font-medium ${tokens.colors.text.primary}`}>{event.eventType ?? "-"}</div>
                      <div className={`mt-1 break-all text-xs ${tokens.colors.text.secondary}`}>{event.catalogId}</div>
                      <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{formatDate(event.createdAt)}</div>
                    </article>
                  ))
                )}
              </div>
            </aside>
          </section>
  );
}

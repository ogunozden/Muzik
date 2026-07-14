import {tokens} from "@/shared/tokens";
import {formatDate, formatNumber} from "./curation-helpers";
import type {ExternalReferenceState} from "./curation-dashboard-types";

type SourceDiscovery = NonNullable<NonNullable<ExternalReferenceState["curation"]>["sourceDiscovery"]>;

/**
 * Kaynak kesif/dogrulama ozeti paneli (M8.2 bolme). Saf gosterim;
 * discovery/provider-verification metrikleri ve artifact durumlari.
 */
export function SourceDiscoveryPanel({sourceDiscovery}: {sourceDiscovery: SourceDiscovery}) {
  return (
            <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Discovery runs</h2>
                  <p className={`text-xs ${tokens.colors.text.secondary}`}>
                    {sourceDiscovery.ok ? "Dry-run OK" : "Review"} · {formatNumber(sourceDiscovery.providerCount)} provider · {formatNumber(sourceDiscovery.verificationErrorCount)} hata · {formatDate(sourceDiscovery.generatedAt)}
                  </p>
                  {sourceDiscovery.artifactPath && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.artifactPath}</code>
                  )}
                  {sourceDiscovery.targetScript && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.targetScript}</code>
                  )}
                  {sourceDiscovery.targetImportDryRun && (
                    <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.targetImportDryRun}</code>
                  )}
                </div>
                <div className="grid w-full gap-2 text-sm sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-4">
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Scope</div>
                    <div className={tokens.colors.text.primary}>{sourceDiscovery.scope ?? "missing"} · {formatNumber(sourceDiscovery.processedMissingCatalogEntries)} / {formatNumber(sourceDiscovery.totalMissingCatalogEntries)}</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Candidates</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.candidateCount)} aday · {formatNumber(sourceDiscovery.acceptedReadyCount)} ready</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Queue</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.needsReviewCount)} review · {formatNumber(sourceDiscovery.conflictCount)} conflict · {formatNumber(sourceDiscovery.deferredCount)} deferred</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Safety</div>
                    <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.directAutoAttachCount)} direct attach · {formatNumber(sourceDiscovery.negativeCacheCount)} cache</div>
                  </div>
                </div>
              </div>
              {(sourceDiscovery.providerCoverage?.length ?? 0) > 0 && (
                <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-4">
                  {sourceDiscovery.providerCoverage?.map((provider) => (
                    <article key={provider.providerProfileId} className={`min-w-0 border ${tokens.colors.border.base} ${tokens.radius.md} p-3`}>
                      <div className={`text-sm font-semibold ${tokens.colors.text.primary}`}>{provider.providerProfileId}</div>
                      <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{provider.connector} · {provider.mode}</div>
                      <div className={`mt-2 text-xs ${tokens.colors.text.secondary}`}>
                        {formatNumber(provider.candidateCount)} aday · {formatNumber(provider.acceptedReadyCount)} ready · {formatNumber(provider.negativeCacheCount)} cache
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {sourceDiscovery.providerVerification && (
                <div className="border-t border-[var(--color-border)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className={`text-sm font-semibold ${tokens.colors.text.primary}`}>Provider verification</h3>
                      <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                        {sourceDiscovery.providerVerification.ok ? "Dry-run OK" : "Review"} · {sourceDiscovery.providerVerification.providerProfileId ?? "-"} · {formatNumber(sourceDiscovery.providerVerification.providerCount)} provider · {formatNumber(sourceDiscovery.providerVerification.warningCount)} uyarı · {formatDate(sourceDiscovery.providerVerification.generatedAt)}
                      </p>
                      {sourceDiscovery.providerVerification.artifactPath && (
                        <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.providerVerification.artifactPath}</code>
                      )}
                      {sourceDiscovery.providerVerification.evidenceArtifactPath && (
                        <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.providerVerification.evidenceArtifactPath}</code>
                      )}
                      {sourceDiscovery.providerVerification.planArtifactPath && (
                        <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.providerVerification.planArtifactPath}</code>
                      )}
                      {sourceDiscovery.providerVerification.coverageArtifactPath && (
                        <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.providerVerification.coverageArtifactPath}</code>
                      )}
                      {sourceDiscovery.providerVerification.batchRunArtifactPath && (
                        <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.providerVerification.batchRunArtifactPath}</code>
                      )}
                      {sourceDiscovery.providerVerification.continueScript && (
                        <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{sourceDiscovery.providerVerification.continueScript}</code>
                      )}
                    </div>
                    <div className="grid w-full gap-2 text-sm sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-4">
                      <div>
                        <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Processed</div>
                        <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.providerVerification.processedGroupCount)} / {formatNumber(sourceDiscovery.providerVerification.totalBacklogGroupCount ?? sourceDiscovery.providerVerification.totalEligibleGroupCount)}</div>
                      </div>
                      <div>
                        <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Evidence</div>
                        <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.providerVerification.verificationPacketCount ?? sourceDiscovery.providerVerification.resultCount)} packet · {formatNumber(sourceDiscovery.providerVerification.cacheHitCount)} cache</div>
                      </div>
                      <div>
                        <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Decision</div>
                        <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.providerVerification.batchRunFinalVerifiedCount ?? sourceDiscovery.providerVerification.cumulativeVerifiedOrClassifiedCount)} IA · {formatNumber(sourceDiscovery.providerVerification.batchRunFinalRemainingCount ?? sourceDiscovery.providerVerification.networkProviderRemainingGroupCount)} left</div>
                      </div>
                      <div>
                        <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Safety</div>
                        <div className={tokens.colors.text.primary}>{formatNumber(sourceDiscovery.providerVerification.directAutoAttachCount)} attach · {formatNumber(sourceDiscovery.providerVerification.mediaDownloadCount)} media</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
  );
}

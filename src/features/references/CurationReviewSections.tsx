import Link from "next/link";
import {tokens} from "@/shared/tokens";
import {Button, Input} from "@/shared/ui";
import {CurationFilterSelect} from "./CurationFilterSelect";
import {
  formatNumber,
  getReferenceKey,
  getReferenceProfileLabel,
  getSourceLabel,
  renderCatalogLine,
  statusClasses,
} from "./curation-helpers";
import type {
  CandidateReviewGroup,
  CandidateReviewGroupPage,
  CandidateReviewPage,
  CandidateReviewRow,
  CurationReference,
  ExternalReferenceState,
} from "./curation-dashboard-types";

type Curation = NonNullable<ExternalReferenceState["curation"]>;
type SetStr = (value: string) => void;
type SetNum = (value: number) => void;

/**
 * Kurasyon review section'lari (M8.2 bolme, tek-batch): review gruplari,
 * review queue ve auto-attached kaynak tablolari. Ctx deseni: alan adlari
 * ust bilesendeki degisken adlariyla birebir ayni oldugundan JSX govdesi
 * degistirilmeden tasindi; tum durum/callback'ler ctx uzerinden gelir.
 */
export interface CurationReviewSectionsCtx {
  isBusy: boolean;
  refresh: (backlogOffset?: number, candidateOffset?: number, groupOffset?: number) => Promise<void> | void;
  filterOptions: {statuses: string[]; providers: string[]; makams: string[]; forms: string[]; usuls: string[]; composers: string[]; priorityGroups: string[]; candidateStatuses: string[]; candidateProfiles: string[]; candidateGroupStatuses: string[]};
  // ek alanlar (tsc ile tespit)
  backlogOffset: number;
  candidateOffset: number;
  candidateReviewBatchPlanManifest: Curation["candidateReviewBatchPlanManifest"];
  sourceIntakeTemplateManifest: Curation["sourceIntakeTemplateManifest"];
  sourceIntakeAcceptedImportDryRunManifest: Curation["sourceIntakeAcceptedImportDryRunManifest"];
  symbtrLayoutVerificationManifest: Curation["symbtrLayoutVerificationManifest"];
  exportCandidateReviewGroups: () => void;
  exportCandidateReviewQueue: () => void;
  exportCandidateReviewGroupDecisionTemplate: () => void;
  exportCandidateReviewGroupDecisionRecommendations: () => void;
  importCandidateReviewGroupDecisions: () => void;
  recordBulkFeedback: (eventType: "user-approved" | "user-prioritized" | "user-removed") => void;
  selectedReferenceCount: number;
  visibleSelectableCount: number;
  // groups
  candidateReviewGroups: CandidateReviewGroup[];
  candidateReviewGroupPage: CandidateReviewGroupPage;
  candidateReviewGroupManifest: Curation["candidateReviewGroupManifest"];
  candidateReviewGroupDecisionManifest: Curation["candidateReviewGroupDecisionManifest"];
  candidateReviewGroupDecisionRecommendationManifest: Curation["candidateReviewGroupDecisionRecommendationManifest"];
  candidateGroupExportText: string;
  candidateGroupDecisionText: string;
  setCandidateGroupDecisionText: SetStr;
  candidateGroupDecisionStatus: string;
  setCandidateGroupDecisionStatus: SetStr;
  candidateGroupDecisionReason: string;
  setCandidateGroupDecisionReason: SetStr;
  candidateGroupDecisionReviewedAt: string;
  setCandidateGroupDecisionReviewedAt: SetStr;
  candidateGroupDecisionDryRun: boolean;
  setCandidateGroupDecisionDryRun: (value: boolean) => void;
  candidateGroupDecisionStatusOptions: string[];
  candidateGroupStatusFilter: string;
  setCandidateGroupStatusFilter: SetStr;
  candidateGroupStatuses: string[];
  candidateGroupLimit: number;
  setCandidateGroupLimit: SetNum;
  candidateGroupOffset: number;
  setCandidateGroupOffset: SetNum;
  // queue
  candidateReviewRows: CandidateReviewRow[];
  candidateReviewPage: CandidateReviewPage;
  candidateReviewExportText: string;
  candidateStatusFilter: string;
  setCandidateStatusFilter: SetStr;
  candidateProfileFilter: string;
  setCandidateProfileFilter: SetStr;
  candidateLimit: number;
  setCandidateLimit: SetNum;
  setCandidateOffset: SetNum;
  // auto-attached
  filteredReferences: CurationReference[];
  query: string;
  setQuery: SetStr;
  statusFilter: string; setStatusFilter: SetStr;
  providerFilter: string; setProviderFilter: SetStr;
  makamFilter: string; setMakamFilter: SetStr;
  formFilter: string; setFormFilter: SetStr;
  usulFilter: string; setUsulFilter: SetStr;
  composerFilter: string; setComposerFilter: SetStr;
  deletionFilter: string; setDeletionFilter: SetStr;
  priorityGroupFilter: string; setPriorityGroupFilter: SetStr;
  deletionFilterOptions: string[];
  selectedReferenceKeys: string[];
  allVisibleReferencesSelected: boolean;
  toggleReferenceSelection: (reference: CurationReference, checked: boolean) => void;
  toggleVisibleReferenceSelection: (checked: boolean, keys?: string[]) => void;
  recordFeedback: (reference: CurationReference, eventType: "user-approved" | "user-prioritized" | "user-removed") => void;
}

export function ReviewGroupsSection({ctx}: {ctx: CurationReviewSectionsCtx}) {
  const {backlogOffset, candidateOffset, candidateReviewBatchPlanManifest, sourceIntakeTemplateManifest, sourceIntakeAcceptedImportDryRunManifest, symbtrLayoutVerificationManifest, exportCandidateReviewGroups, exportCandidateReviewGroupDecisionTemplate, exportCandidateReviewGroupDecisionRecommendations, importCandidateReviewGroupDecisions, isBusy, refresh, filterOptions, candidateReviewGroups, candidateReviewGroupPage, candidateReviewGroupManifest, candidateReviewGroupDecisionManifest, candidateReviewGroupDecisionRecommendationManifest, candidateGroupExportText, candidateGroupDecisionText, setCandidateGroupDecisionText, candidateGroupDecisionStatus, setCandidateGroupDecisionStatus, candidateGroupDecisionReason, setCandidateGroupDecisionReason, candidateGroupDecisionReviewedAt, setCandidateGroupDecisionReviewedAt, candidateGroupDecisionDryRun, setCandidateGroupDecisionDryRun, candidateGroupDecisionStatusOptions, candidateGroupStatusFilter, setCandidateGroupStatusFilter, candidateGroupLimit, setCandidateGroupLimit, candidateGroupOffset, setCandidateGroupOffset} = ctx;
  return (
          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Aday review grupları</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(candidateReviewGroupPage?.returnedCount ?? candidateReviewGroupManifest?.visibleGroupCount ?? candidateReviewGroups.length)} gösteriliyor · {formatNumber(candidateReviewGroupPage?.filteredTotal ?? candidateReviewGroupManifest?.groupCount)} filtreli · {formatNumber(candidateReviewGroupManifest?.groupCount)} grup
                </p>
                {candidateReviewGroupManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">{candidateReviewGroupManifest.artifactPath}</code>
                )}
                {candidateReviewGroupDecisionManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {candidateReviewGroupDecisionManifest.artifactPath} · {formatNumber(candidateReviewGroupDecisionManifest.decisionCount)} karar
                  </code>
                )}
                {candidateReviewGroupDecisionRecommendationManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {candidateReviewGroupDecisionRecommendationManifest.artifactPath} · {formatNumber(candidateReviewGroupDecisionRecommendationManifest.decisionCount)} öneri
                  </code>
                )}
                {candidateReviewBatchPlanManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {candidateReviewBatchPlanManifest.artifactPath} · {formatNumber(candidateReviewBatchPlanManifest.packetCount)} paket · {formatNumber(candidateReviewBatchPlanManifest.plannedGroupCount)} grup · {formatNumber(candidateReviewBatchPlanManifest.plannedCandidateCount)} aday
                  </code>
                )}
                {sourceIntakeTemplateManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {sourceIntakeTemplateManifest.artifactPath} · {formatNumber(sourceIntakeTemplateManifest.packetCount)} paket · {formatNumber(sourceIntakeTemplateManifest.templateRowCount)} boş kaynak satırı · {formatNumber(sourceIntakeTemplateManifest.plannedCandidateCount)} aday
                    {sourceIntakeTemplateManifest.targetScript ? ` · ${sourceIntakeTemplateManifest.targetScript}` : ""}
                  </code>
                )}
                {sourceIntakeAcceptedImportDryRunManifest?.artifactPath && (
                  <code className="block break-all text-xs text-[var(--color-text-primary)]">
                    {sourceIntakeAcceptedImportDryRunManifest.artifactPath} · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted dry-run · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationErrorCount)} hata
                  </code>
                )}
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-6xl lg:grid-cols-9">
                <CurationFilterSelect label="Grup durum" value={candidateGroupStatusFilter} options={filterOptions.candidateGroupStatuses} onChange={(value) => {
                  setCandidateGroupStatusFilter(value);
                  setCandidateGroupOffset(0);
                }} />
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Grup sayfa
                  <select
                    name="candidate-group-limit"
                    value={candidateGroupLimit}
                    onChange={(event) => {
                      setCandidateGroupLimit(Number(event.target.value));
                      setCandidateGroupOffset(0);
                    }}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  >
                    <option value={80}>80</option>
                    <option value={160}>160</option>
                    <option value={320}>320</option>
                  </select>
                </label>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewGroupPage?.previousOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateOffset, candidateReviewGroupPage?.previousOffset ?? 0)}
                >
                  Grup önceki
                </Button>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewGroupPage?.nextOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateOffset, candidateReviewGroupPage?.nextOffset ?? candidateGroupOffset + candidateGroupLimit)}
                >
                  Grup sonraki
                </Button>
                <Button variant="secondary" disabled={isBusy} onPress={() => void exportCandidateReviewGroups()}>
                  Grup dışa aktar
                </Button>
                <Button variant="secondary" disabled={isBusy} onPress={() => void exportCandidateReviewGroupDecisionRecommendations()}>
                  Karar önerisi
                </Button>
                <CurationFilterSelect
                  label="Karar durum"
                  value={candidateGroupDecisionStatus}
                  options={candidateGroupDecisionStatusOptions}
                  onChange={setCandidateGroupDecisionStatus}
                />
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Karar tarihi
                  <input
                    type="date"
                    value={candidateGroupDecisionReviewedAt}
                    onChange={(event) => setCandidateGroupDecisionReviewedAt(event.target.value)}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  />
                </label>
                <Button
                  variant="secondary"
                  disabled={isBusy || !candidateGroupDecisionReason.trim() || !candidateGroupDecisionReviewedAt.trim()}
                  onPress={() => void exportCandidateReviewGroupDecisionTemplate()}
                >
                  Karar şablonu
                </Button>
                <label className={`flex items-center gap-2 text-sm ${tokens.colors.text.secondary}`}>
                  <input
                    type="checkbox"
                    checked={candidateGroupDecisionDryRun}
                    onChange={(event) => setCandidateGroupDecisionDryRun(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Karar dry run
                </label>
                <Button
                  variant="primary"
                  disabled={isBusy || !candidateGroupDecisionText.trim()}
                  onPress={importCandidateReviewGroupDecisions}
                >
                  Karar içe aktar
                </Button>
              </div>
            </div>
            {symbtrLayoutVerificationManifest && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <h3 className={`text-sm font-semibold ${tokens.colors.text.primary}`}>PDF layout doğrulama</h3>
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {symbtrLayoutVerificationManifest.candidateStatus ?? "bilinmiyor"} · {formatNumber(symbtrLayoutVerificationManifest.candidateEntries)} aday eser · {formatNumber(symbtrLayoutVerificationManifest.unresolvedCandidateEntries)} bekleyen
                    </p>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Verified</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(symbtrLayoutVerificationManifest.verifiedEntries)} eser · {formatNumber(symbtrLayoutVerificationManifest.verifiedMeasureBoxes)} ölçü kutusu
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Review batch</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(symbtrLayoutVerificationManifest.reviewBatchPacketCount)} paket · {formatNumber(symbtrLayoutVerificationManifest.reviewBatchCandidateRows)} aday satır
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Validation</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(symbtrLayoutVerificationManifest.validationErrorCount)} hata · {symbtrLayoutVerificationManifest.fingerprintAlgorithm ?? "-"}
                    </div>
                  </div>
                </div>
                {symbtrLayoutVerificationManifest.promotionPolicy && (
                  <p className={`mt-3 text-xs ${tokens.colors.text.secondary}`}>{symbtrLayoutVerificationManifest.promotionPolicy}</p>
                )}
                <div className="mt-3 grid gap-1">
                  {symbtrLayoutVerificationManifest.summaryPath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.summaryPath}
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.reviewTemplatePath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.reviewTemplatePath} · {formatNumber(symbtrLayoutVerificationManifest.reviewTemplateEntryCount)} eser · {formatNumber(symbtrLayoutVerificationManifest.reviewTemplateCandidateRows)} aday satır
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.reviewBatchPlanPath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.reviewBatchPlanPath} · {formatNumber(symbtrLayoutVerificationManifest.reviewBatchPacketCount)} paket
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.emptyImportDryRunPath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.emptyImportDryRunPath} · {formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunInputEntries)} import girişi · {formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunVerifiedMeasureBoxes)} verified
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.emptyImportTemplatePath && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.emptyImportTemplatePath}
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.targetScript && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.targetScript}
                    </code>
                  )}
                  {symbtrLayoutVerificationManifest.emptyImportDryRunScript && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {symbtrLayoutVerificationManifest.emptyImportDryRunScript}
                    </code>
                  )}
                </div>
              </div>
            )}
            {sourceIntakeAcceptedImportDryRunManifest && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <h3 className={`text-sm font-semibold ${tokens.colors.text.primary}`}>Source intake accepted dry-run</h3>
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {sourceIntakeAcceptedImportDryRunManifest.dryRun ? "dry-run" : "eksik"} · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.httpsAcceptedCount)} HTTPS
                    </p>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Evidence</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(sourceIntakeAcceptedImportDryRunManifest.evidenceCompleteCount)} tam · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationGateCount)} kapı
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Import sonucu</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(sourceIntakeAcceptedImportDryRunManifest.dryRunAddedCandidateCount)} eklenecek · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.dryRunSkippedDuplicateCount)} duplicate
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Validation</div>
                    <div className={`mt-1 text-sm ${tokens.colors.text.primary}`}>
                      {formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationErrorCount)} hata · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.dryRunOutputCandidateCount)} output
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-1">
                  {sourceIntakeAcceptedImportDryRunManifest.input && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {sourceIntakeAcceptedImportDryRunManifest.input}
                    </code>
                  )}
                  {sourceIntakeAcceptedImportDryRunManifest.targetScript && (
                    <code className="break-all text-xs text-[var(--color-text-primary)]">
                      {sourceIntakeAcceptedImportDryRunManifest.targetScript}
                    </code>
                  )}
                </div>
              </div>
            )}
            {candidateGroupExportText && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <label htmlFor="candidate-review-group-export-json" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Filtreli review grup JSON
                  <textarea
                    id="candidate-review-group-export-json"
                    value={candidateGroupExportText}
                    readOnly
                    className={`min-h-32 w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 font-mono text-xs ${tokens.colors.text.primary}`}
                  />
                </label>
              </div>
            )}
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <label htmlFor="candidate-review-group-decision-reason" className={`mb-3 flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                Review grup karar nedeni
                <input
                  id="candidate-review-group-decision-reason"
                  value={candidateGroupDecisionReason}
                  onChange={(event) => setCandidateGroupDecisionReason(event.target.value)}
                  className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                />
              </label>
              <label htmlFor="candidate-review-group-decision-json" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                Review grup karar JSON
                <textarea
                  id="candidate-review-group-decision-json"
                  value={candidateGroupDecisionText}
                  onChange={(event) => setCandidateGroupDecisionText(event.target.value)}
                  placeholder='{"version":1,"decisions":[{"groupId":"...:review-group","catalogId":"...","status":"rejected","reason":"batch-reviewed-no-safe-source","reviewedAt":"2026-06-01","reviewedBy":"local-operator"}]}'
                  className={`min-h-28 w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 font-mono text-xs ${tokens.colors.text.primary}`}
                />
              </label>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Profil seti</th>
                    <th className="px-4 py-3 font-medium">Aksiyon</th>
                    <th className="px-4 py-3 font-medium">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateReviewGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    candidateReviewGroups.slice(0, 20).map((group) => (
                      <tr key={group.groupId ?? group.catalogId} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3">
                          <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(group.status)}`}>
                            {group.status ?? "-"}
                          </span>
                          {group.deferredFromNextBatch && <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>deferred</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${tokens.colors.text.primary}`}>{group.title ?? "-"}</div>
                          <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{[group.makam, group.form, group.usul].filter(Boolean).join(" / ") || "-"}</div>
                          {group.catalogId && <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{group.catalogId}</code>}
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          <div>{formatNumber(group.candidateCount)} aday · {formatNumber(group.profileCount)} profil</div>
                          <div className="mt-1 text-xs">{group.profiles?.join(" / ") || "-"}</div>
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{group.reviewAction ?? "-"}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {formatNumber(group.highestReviewConfidenceScore)}
                          {group.confidenceLevels && group.confidenceLevels.length > 0 && (
                            <div className="mt-1 text-xs">{group.confidenceLevels.join(" / ")}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
  );
}

export function ReviewQueueSection({ctx}: {ctx: CurationReviewSectionsCtx}) {
  const {backlogOffset, candidateOffset, exportCandidateReviewQueue, isBusy, refresh, filterOptions, candidateReviewRows, candidateReviewPage, candidateReviewExportText, candidateStatusFilter, setCandidateStatusFilter, candidateProfileFilter, setCandidateProfileFilter, candidateLimit, setCandidateLimit, setCandidateOffset} = ctx;
  return (
          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Aday review queue</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(candidateReviewPage?.returnedCount ?? candidateReviewRows.length)} gösteriliyor · {formatNumber(candidateReviewPage?.filteredTotal ?? candidateReviewRows.length)} filtreli · {formatNumber(candidateReviewPage?.totalRows)} toplam
                </p>
                {candidateReviewPage?.artifactPath && (
                  <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{candidateReviewPage.artifactPath}</code>
                )}
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-6">
                <CurationFilterSelect label="Aday durum" value={candidateStatusFilter} options={filterOptions.candidateStatuses} onChange={(value) => {
                  setCandidateStatusFilter(value);
                  setCandidateOffset(0);
                }} />
                <CurationFilterSelect label="Aday profil" value={candidateProfileFilter} options={filterOptions.candidateProfiles} onChange={(value) => {
                  setCandidateProfileFilter(value);
                  setCandidateOffset(0);
                }} />
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Aday sayfa
                  <select
                    name="candidate-limit"
                    value={candidateLimit}
                    onChange={(event) => {
                      setCandidateLimit(Number(event.target.value));
                      setCandidateOffset(0);
                    }}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  >
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </label>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewPage?.previousOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateReviewPage?.previousOffset ?? 0)}
                >
                  Aday önceki
                </Button>
                <Button
                  variant="outline"
                  disabled={isBusy || candidateReviewPage?.nextOffset == null}
                  onPress={() => void refresh(backlogOffset, candidateReviewPage?.nextOffset ?? candidateOffset + candidateLimit)}
                >
                  Aday sonraki
                </Button>
                <Button variant="secondary" disabled={isBusy} onPress={() => void exportCandidateReviewQueue()}>
                  Queue dışa aktar
                </Button>
              </div>
            </div>

            {candidateReviewExportText && (
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <label htmlFor="candidate-review-export-json" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Filtreli review queue JSON
                  <textarea
                    id="candidate-review-export-json"
                    value={candidateReviewExportText}
                    readOnly
                    className={`min-h-32 w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 font-mono text-xs ${tokens.colors.text.primary}`}
                  />
                </label>
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Profil</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Güven</th>
                    <th className="px-4 py-3 font-medium">Arama</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateReviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    candidateReviewRows.map((row) => (
                      <tr key={row.candidateId ?? `${row.catalogId}-${row.profileId}`} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3">
                          <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(row.status)}`}>
                            {row.status ?? "-"}
                          </span>
                          {row.statusReason && <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{row.statusReason}</div>}
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          <div className="font-medium text-[var(--color-text-primary)]">{row.profileLabel ?? row.profileId ?? "-"}</div>
                          <div className="mt-1 text-xs">{[row.profileId, row.provider].filter(Boolean).join(" / ") || "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${tokens.colors.text.primary}`}>{row.title ?? "-"}</div>
                          <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{[row.makam, row.form, row.usul].filter(Boolean).join(" / ") || "-"}</div>
                          {row.catalogId && <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{row.catalogId}</code>}
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {row.reviewConfidenceLevel ?? "-"} · {formatNumber(row.reviewConfidenceScore)}
                          {row.scoreReasons && row.scoreReasons.length > 0 && (
                            <div className="mt-1 text-xs">{row.scoreReasons.slice(0, 3).join(" / ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.searchUrl ? (
                            <a
                              href={row.searchUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                            >
                              Aday ara
                            </a>
                          ) : (
                            <span className={tokens.colors.text.secondary}>-</span>
                          )}
                          {row.searchQuery && <div className={`mt-2 line-clamp-2 text-xs ${tokens.colors.text.secondary}`}>{row.searchQuery}</div>}
                          {row.queryFields && row.queryFields.length > 0 && (
                            <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>Alanlar: {row.queryFields.join(" / ")}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
  );
}

export function AutoAttachedSection({ctx}: {ctx: CurationReviewSectionsCtx}) {
  const {recordBulkFeedback, selectedReferenceCount, visibleSelectableCount, isBusy, refresh, filteredReferences, query, setQuery, statusFilter, setStatusFilter, providerFilter, setProviderFilter, makamFilter, setMakamFilter, formFilter, setFormFilter, usulFilter, setUsulFilter, composerFilter, setComposerFilter, deletionFilter, setDeletionFilter, priorityGroupFilter, setPriorityGroupFilter, deletionFilterOptions, selectedReferenceKeys, allVisibleReferencesSelected, toggleReferenceSelection, toggleVisibleReferenceSelection, recordFeedback, filterOptions} = ctx;
  return (
          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Auto-attached kaynaklar</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>{formatNumber(filteredReferences.length)} kayıt · {formatNumber(selectedReferenceCount)} seçili</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="xs" variant="outline" disabled={isBusy || selectedReferenceCount === 0} onPress={() => recordBulkFeedback("user-approved")}>
                    Toplu onayla
                  </Button>
                  <Button size="xs" variant="secondary" disabled={isBusy || selectedReferenceCount === 0} onPress={() => recordBulkFeedback("user-prioritized")}>
                    Toplu öne al
                  </Button>
                  <Button size="xs" variant="danger" disabled={isBusy || selectedReferenceCount === 0} onPress={() => recordBulkFeedback("user-removed")}>
                    Toplu kaldır
                  </Button>
                </div>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-6xl xl:grid-cols-8">
                <Input
                  label="Ara"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="xl:col-span-2"
                />
                <CurationFilterSelect label="Durum" value={statusFilter} options={filterOptions.statuses} onChange={setStatusFilter} />
                <CurationFilterSelect label="Provider" value={providerFilter} options={filterOptions.providers} onChange={setProviderFilter} />
                <CurationFilterSelect label="Makam" value={makamFilter} options={filterOptions.makams} onChange={setMakamFilter} />
                <CurationFilterSelect label="Usul" value={usulFilter} options={filterOptions.usuls} onChange={setUsulFilter} />
                <CurationFilterSelect label="Form" value={formFilter} options={filterOptions.forms} onChange={setFormFilter} />
                <CurationFilterSelect label="Besteci" value={composerFilter} options={filterOptions.composers} onChange={setComposerFilter} />
                <CurationFilterSelect label="Silme" value={deletionFilter} options={deletionFilterOptions} onChange={setDeletionFilter} />
                <CurationFilterSelect label="Öncelik" value={priorityGroupFilter} options={filterOptions.priorityGroups} onChange={setPriorityGroupFilter} />
                <div className="flex items-end">
                  <Button variant="outline" disabled={isBusy} onPress={() => void refresh(0)}>
                    Filtrele
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1240px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">
                      <input
                        type="checkbox"
                        aria-label="Görünenleri seç"
                        checked={allVisibleReferencesSelected}
                        disabled={visibleSelectableCount === 0}
                        onChange={(event) => toggleVisibleReferenceSelection(event.target.checked)}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Makam / Form / Usul</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Profil / Provider</th>
                    <th className="px-4 py-3 font-medium">Güven</th>
                    <th className="px-4 py-3 font-medium">Kanıt</th>
                    <th className="px-4 py-3 font-medium">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferences.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    filteredReferences.map((reference) => (
                      <tr key={`${reference.catalogId}-${reference.sourceId}`} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Satırı seç ${reference.sourceId ?? reference.catalogId ?? "kaynak"}`}
                            checked={selectedReferenceKeys.includes(getReferenceKey(reference))}
                            onChange={(event) => toggleReferenceSelection(reference, event.target.checked)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(reference.status)}`}>
                            {reference.status ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${tokens.colors.text.primary}`}>
                            {reference.catalog?.title ?? "-"}
                          </div>
                          <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                            {reference.catalog?.composer ?? "-"}
                          </div>
                          {reference.catalogId ? (
                            <Link
                              href={`/references/curation/${encodeURIComponent(reference.catalogId)}`}
                              className="mt-1 block break-all text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                            >
                              {reference.catalogId}
                            </Link>
                          ) : (
                            <span className="text-xs text-[var(--color-text-primary)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${tokens.colors.text.primary}`}>{renderCatalogLine(reference.catalog)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="break-all text-xs text-[var(--color-text-primary)]">
                            {getSourceLabel(reference)}
                          </code>
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{getReferenceProfileLabel(reference)}</td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {reference.confidenceLevel ?? "-"} · {formatNumber(reference.confidenceScore)}
                        </td>
                        <td className={`max-w-sm px-4 py-3 ${tokens.colors.text.secondary}`}>
                          <div className="line-clamp-2">{reference.matchReasons?.join(", ") || "-"}</div>
                          {reference.conflicts && reference.conflicts.length > 0 && (
                            <div className="mt-1 text-[var(--color-error)]">{reference.conflicts.join(", ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="xs" variant="outline" disabled={isBusy} onPress={() => recordFeedback(reference, "user-approved")}>
                              Onayla
                            </Button>
                            <Button size="xs" variant="secondary" disabled={isBusy} onPress={() => recordFeedback(reference, "user-prioritized")}>
                              Öne al
                            </Button>
                            <Button size="xs" variant="danger" disabled={isBusy} onPress={() => recordFeedback(reference, "user-removed")}>
                              Kaldır
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
  );
}

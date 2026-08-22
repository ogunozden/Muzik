import {tokens} from "@/shared/tokens";
import {Button} from "@/shared/ui";
import {CurationFilterSelect} from "../CurationFilterSelect";
import {formatNumber, statusClasses} from "../curation-helpers";
import type {CurationReviewSectionsCtx} from "./types";

export function ReviewGroupsSection({ctx}: {ctx: CurationReviewSectionsCtx}) {
  const {
    backlogOffset,
    candidateOffset,
    candidateReviewBatchPlanManifest,
    sourceIntakeTemplateManifest,
    sourceIntakeAcceptedImportDryRunManifest,
    symbtrLayoutVerificationManifest,
    exportCandidateReviewGroups,
    exportCandidateReviewGroupDecisionTemplate,
    exportCandidateReviewGroupDecisionRecommendations,
    importCandidateReviewGroupDecisions,
    isBusy,
    refresh,
    filterOptions,
    candidateReviewGroups,
    candidateReviewGroupPage,
    candidateReviewGroupManifest,
    candidateReviewGroupDecisionManifest,
    candidateReviewGroupDecisionRecommendationManifest,
    candidateGroupExportText,
    candidateGroupDecisionText,
    setCandidateGroupDecisionText,
    candidateGroupDecisionStatus,
    setCandidateGroupDecisionStatus,
    candidateGroupDecisionReason,
    setCandidateGroupDecisionReason,
    candidateGroupDecisionReviewedAt,
    setCandidateGroupDecisionReviewedAt,
    candidateGroupDecisionDryRun,
    setCandidateGroupDecisionDryRun,
    candidateGroupDecisionStatusOptions,
    candidateGroupStatusFilter,
    setCandidateGroupStatusFilter,
    candidateGroupLimit,
    setCandidateGroupLimit,
    candidateGroupOffset,
    setCandidateGroupOffset,
  } = ctx;
  return (
    <section
      className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Aday review grupları</h2>
          <p className={`text-xs ${tokens.colors.text.secondary}`}>
            {formatNumber(candidateReviewGroupPage?.returnedCount ?? candidateReviewGroupManifest?.visibleGroupCount ?? candidateReviewGroups.length)} gösteriliyor ·{" "}
            {formatNumber(candidateReviewGroupPage?.filteredTotal ?? candidateReviewGroupManifest?.groupCount)} filtreli ·{" "}
            {formatNumber(candidateReviewGroupManifest?.groupCount)} grup
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
              {candidateReviewBatchPlanManifest.artifactPath} · {formatNumber(candidateReviewBatchPlanManifest.packetCount)} paket ·{" "}
              {formatNumber(candidateReviewBatchPlanManifest.plannedGroupCount)} grup · {formatNumber(candidateReviewBatchPlanManifest.plannedCandidateCount)} aday
            </code>
          )}
          {sourceIntakeTemplateManifest?.artifactPath && (
            <code className="block break-all text-xs text-[var(--color-text-primary)]">
              {sourceIntakeTemplateManifest.artifactPath} · {formatNumber(sourceIntakeTemplateManifest.packetCount)} paket ·{" "}
              {formatNumber(sourceIntakeTemplateManifest.templateRowCount)} boş kaynak satırı · {formatNumber(sourceIntakeTemplateManifest.plannedCandidateCount)} aday
              {sourceIntakeTemplateManifest.targetScript ? ` · ${sourceIntakeTemplateManifest.targetScript}` : ""}
            </code>
          )}
          {sourceIntakeAcceptedImportDryRunManifest?.artifactPath && (
            <code className="block break-all text-xs text-[var(--color-text-primary)]">
              {sourceIntakeAcceptedImportDryRunManifest.artifactPath} · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted dry-run ·{" "}
              {formatNumber(sourceIntakeAcceptedImportDryRunManifest.validationErrorCount)} hata
            </code>
          )}
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-6xl lg:grid-cols-9">
          <CurationFilterSelect
            label="Grup durum"
            value={candidateGroupStatusFilter}
            options={filterOptions.candidateGroupStatuses}
            onChange={(value) => {
              setCandidateGroupStatusFilter(value);
              setCandidateGroupOffset(0);
            }}
          />
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
          <Button variant="primary" disabled={isBusy || !candidateGroupDecisionText.trim()} onPress={importCandidateReviewGroupDecisions}>
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
                {symbtrLayoutVerificationManifest.candidateStatus ?? "bilinmiyor"} · {formatNumber(symbtrLayoutVerificationManifest.candidateEntries)} aday eser ·{" "}
                {formatNumber(symbtrLayoutVerificationManifest.unresolvedCandidateEntries)} bekleyen
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
              <code className="break-all text-xs text-[var(--color-text-primary)]">{symbtrLayoutVerificationManifest.summaryPath}</code>
            )}
            {symbtrLayoutVerificationManifest.reviewTemplatePath && (
              <code className="break-all text-xs text-[var(--color-text-primary)]">
                {symbtrLayoutVerificationManifest.reviewTemplatePath} · {formatNumber(symbtrLayoutVerificationManifest.reviewTemplateEntryCount)} eser ·{" "}
                {formatNumber(symbtrLayoutVerificationManifest.reviewTemplateCandidateRows)} aday satır
              </code>
            )}
            {symbtrLayoutVerificationManifest.reviewBatchPlanPath && (
              <code className="break-all text-xs text-[var(--color-text-primary)]">
                {symbtrLayoutVerificationManifest.reviewBatchPlanPath} · {formatNumber(symbtrLayoutVerificationManifest.reviewBatchPacketCount)} paket
              </code>
            )}
            {symbtrLayoutVerificationManifest.emptyImportDryRunPath && (
              <code className="break-all text-xs text-[var(--color-text-primary)]">
                {symbtrLayoutVerificationManifest.emptyImportDryRunPath} · {formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunInputEntries)} import girişi ·{" "}
                {formatNumber(symbtrLayoutVerificationManifest.emptyImportDryRunVerifiedMeasureBoxes)} verified
              </code>
            )}
            {symbtrLayoutVerificationManifest.emptyImportTemplatePath && (
              <code className="break-all text-xs text-[var(--color-text-primary)]">{symbtrLayoutVerificationManifest.emptyImportTemplatePath}</code>
            )}
            {symbtrLayoutVerificationManifest.targetScript && (
              <code className="break-all text-xs text-[var(--color-text-primary)]">{symbtrLayoutVerificationManifest.targetScript}</code>
            )}
            {symbtrLayoutVerificationManifest.emptyImportDryRunScript && (
              <code className="break-all text-xs text-[var(--color-text-primary)]">{symbtrLayoutVerificationManifest.emptyImportDryRunScript}</code>
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
                {sourceIntakeAcceptedImportDryRunManifest.dryRun ? "dry-run" : "eksik"} · {formatNumber(sourceIntakeAcceptedImportDryRunManifest.acceptedCandidateCount)} accepted ·{" "}
                {formatNumber(sourceIntakeAcceptedImportDryRunManifest.httpsAcceptedCount)} HTTPS
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
              <code className="break-all text-xs text-[var(--color-text-primary)]">{sourceIntakeAcceptedImportDryRunManifest.input}</code>
            )}
            {sourceIntakeAcceptedImportDryRunManifest.targetScript && (
              <code className="break-all text-xs text-[var(--color-text-primary)]">{sourceIntakeAcceptedImportDryRunManifest.targetScript}</code>
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
                    <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(group.status)}`}>{group.status ?? "-"}</span>
                    {group.deferredFromNextBatch && <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>deferred</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className={`font-medium ${tokens.colors.text.primary}`}>{group.title ?? "-"}</div>
                    <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{[group.makam, group.form, group.usul].filter(Boolean).join(" / ") || "-"}</div>
                    {group.catalogId && <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{group.catalogId}</code>}
                  </td>
                  <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                    <div>
                      {formatNumber(group.candidateCount)} aday · {formatNumber(group.profileCount)} profil
                    </div>
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

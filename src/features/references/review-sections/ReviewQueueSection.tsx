import {tokens} from "@/shared/tokens";
import {Button} from "@/shared/ui";
import {CurationFilterSelect} from "../CurationFilterSelect";
import {formatNumber, statusClasses} from "../curation-helpers";
import type {CurationReviewSectionsCtx} from "./types";

export function ReviewQueueSection({ctx}: {ctx: CurationReviewSectionsCtx}) {
  const {
    backlogOffset,
    candidateOffset,
    exportCandidateReviewQueue,
    isBusy,
    refresh,
    filterOptions,
    candidateReviewRows,
    candidateReviewPage,
    candidateReviewExportText,
    candidateStatusFilter,
    setCandidateStatusFilter,
    candidateProfileFilter,
    setCandidateProfileFilter,
    candidateLimit,
    setCandidateLimit,
    setCandidateOffset,
  } = ctx;
  return (
    <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Aday review queue</h2>
          <p className={`text-xs ${tokens.colors.text.secondary}`}>
            {formatNumber(candidateReviewPage?.returnedCount ?? candidateReviewRows.length)} gösteriliyor · {formatNumber(candidateReviewPage?.filteredTotal ?? candidateReviewRows.length)} filtreli ·{" "}
            {formatNumber(candidateReviewPage?.totalRows)} toplam
          </p>
          {candidateReviewPage?.artifactPath && (
            <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{candidateReviewPage.artifactPath}</code>
          )}
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-6">
          <CurationFilterSelect
            label="Aday durum"
            value={candidateStatusFilter}
            options={filterOptions.candidateStatuses}
            onChange={(value) => {
              setCandidateStatusFilter(value);
              setCandidateOffset(0);
            }}
          />
          <CurationFilterSelect
            label="Aday profil"
            value={candidateProfileFilter}
            options={filterOptions.candidateProfiles}
            onChange={(value) => {
              setCandidateProfileFilter(value);
              setCandidateOffset(0);
            }}
          />
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
                    <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(row.status)}`}>{row.status ?? "-"}</span>
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
                    {row.scoreReasons && row.scoreReasons.length > 0 && <div className="mt-1 text-xs">{row.scoreReasons.slice(0, 3).join(" / ")}</div>}
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
                    {row.queryFields && row.queryFields.length > 0 && <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>Alanlar: {row.queryFields.join(" / ")}</div>}
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

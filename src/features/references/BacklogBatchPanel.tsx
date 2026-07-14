import {tokens} from "@/shared/tokens";
import {Button} from "@/shared/ui";
import {formatBacklogFormats, formatNumber, getFirstHintUrl} from "./curation-helpers";
import type {BacklogPage, CurationBacklogRow} from "./curation-dashboard-types";

/**
 * Siradaki kaynak backlog batch listesi (M8.2 bolme): sayfalama,
 * limit secimi ve satir tablosu. Saf gosterim + callback.
 */
export function BacklogBatchPanel({
  filteredBacklog,
  backlogPage,
  backlogOffset,
  backlogLimit,
  onBacklogOffsetChange,
  onBacklogLimitChange,
  onRefresh,
  isBusy,
}: {
  filteredBacklog: CurationBacklogRow[];
  backlogPage: BacklogPage;
  backlogOffset: number;
  backlogLimit: number;
  onBacklogOffsetChange: (offset: number) => void;
  onBacklogLimitChange: (limit: number) => void;
  onRefresh: (offset?: number, candidateOffset?: number, groupOffset?: number) => Promise<void> | void;
  isBusy: boolean;
}) {
  return (
          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Sıradaki kaynak backlog batch listesi</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>
                  {formatNumber(backlogPage?.returnedCount ?? filteredBacklog.length)} gösteriliyor · {formatNumber(backlogPage?.filteredTotal ?? filteredBacklog.length)} filtreli · {formatNumber(backlogPage?.activeQueueCount)} aktif · {formatNumber(backlogPage?.deferredCount)} deferred
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Sayfa
                  <select
                    value={backlogLimit}
                    onChange={(event) => {
                      onBacklogLimitChange(Number(event.target.value));
                      onBacklogOffsetChange(0);
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
                  disabled={isBusy || backlogPage?.previousOffset == null}
                  onPress={() => void onRefresh(backlogPage?.previousOffset ?? 0)}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  disabled={isBusy || backlogPage?.nextOffset == null}
                  onPress={() => void onRefresh(backlogPage?.nextOffset ?? backlogOffset + backlogLimit)}
                >
                  Sonraki
                </Button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">Öncelik</th>
                    <th className="px-4 py-3 font-medium">Eser</th>
                    <th className="px-4 py-3 font-medium">Makam / Form / Usul</th>
                    <th className="px-4 py-3 font-medium">Format</th>
                    <th className="px-4 py-3 font-medium">Queue</th>
                    <th className="px-4 py-3 font-medium">Nota arama</th>
                    <th className="px-4 py-3 font-medium">Kayıt arama</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBacklog.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>
                        Kayıt yok.
                      </td>
                    </tr>
                  ) : (
                    filteredBacklog.map((row) => {
                      const hintUrl = getFirstHintUrl(row);

                      return (
                        <tr key={row.catalogId} className="border-b border-[var(--color-border)] last:border-b-0">
                          <td className="px-4 py-3">
                            <div className={`text-sm font-medium ${tokens.colors.text.primary}`}>{row.priorityGroup ?? "-"}</div>
                            <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{formatNumber(row.curationPriorityScore)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-medium ${tokens.colors.text.primary}`}>{row.title ?? "-"}</div>
                            <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{row.composer ?? "-"}</div>
                            {row.catalogId && (
                              <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{row.catalogId}</code>
                            )}
                          </td>
                          <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                            {[row.makam, row.form, row.usul].filter(Boolean).join(" / ") || "-"}
                          </td>
                          <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatBacklogFormats(row)}</td>
                          <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                            <div>{row.deferredFromNextBatch ? "deferred" : "active"}</div>
                            {row.curationDecisionStatus && (
                              <div className="mt-1 text-xs text-[var(--color-warning)]">{row.curationDecisionStatus}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {row.scoreSearchUrl && (
                                <a
                                  href={row.scoreSearchUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                                >
                                  Genel
                                </a>
                              )}
                              {hintUrl && (
                                <a
                                  href={hintUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                                >
                                  Site
                                </a>
                              )}
                              {!row.scoreSearchUrl && !hintUrl && <span className={tokens.colors.text.secondary}>-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.recordingSearchUrl ? (
                              <a
                                href={row.recordingSearchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                              >
                                YouTube
                              </a>
                            ) : (
                              <span className={tokens.colors.text.secondary}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
  );
}

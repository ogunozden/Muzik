import Link from "next/link";
import {tokens} from "@/shared/tokens";
import {Button, Input} from "@/shared/ui";
import {CurationFilterSelect} from "../CurationFilterSelect";
import {formatNumber, getReferenceKey, getReferenceProfileLabel, getSourceLabel, renderCatalogLine, statusClasses} from "../curation-helpers";
import type {CurationReviewSectionsCtx} from "./types";

export function AutoAttachedSection({ctx}: {ctx: CurationReviewSectionsCtx}) {
  const {
    recordBulkFeedback,
    selectedReferenceCount,
    visibleSelectableCount,
    isBusy,
    refresh,
    filteredReferences,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    providerFilter,
    setProviderFilter,
    makamFilter,
    setMakamFilter,
    formFilter,
    setFormFilter,
    usulFilter,
    setUsulFilter,
    composerFilter,
    setComposerFilter,
    deletionFilter,
    setDeletionFilter,
    priorityGroupFilter,
    setPriorityGroupFilter,
    deletionFilterOptions,
    selectedReferenceKeys,
    allVisibleReferencesSelected,
    toggleReferenceSelection,
    toggleVisibleReferenceSelection,
    recordFeedback,
    filterOptions,
  } = ctx;
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
          <Input label="Ara" value={query} onChange={(event) => setQuery(event.target.value)} className="xl:col-span-2" />
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
                    <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(reference.status)}`}>{reference.status ?? "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`font-medium ${tokens.colors.text.primary}`}>{reference.catalog?.title ?? "-"}</div>
                    <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{reference.catalog?.composer ?? "-"}</div>
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
                    <code className="break-all text-xs text-[var(--color-text-primary)]">{getSourceLabel(reference)}</code>
                  </td>
                  <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{getReferenceProfileLabel(reference)}</td>
                  <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                    {reference.confidenceLevel ?? "-"} · {formatNumber(reference.confidenceScore)}
                  </td>
                  <td className={`max-w-sm px-4 py-3 ${tokens.colors.text.secondary}`}>
                    <div className="line-clamp-2">{reference.matchReasons?.join(", ") || "-"}</div>
                    {reference.conflicts && reference.conflicts.length > 0 && <div className="mt-1 text-[var(--color-error)]">{reference.conflicts.join(", ")}</div>}
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

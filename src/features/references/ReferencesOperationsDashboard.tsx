"use client";

import {FormEvent, useCallback, useMemo, useState} from "react";
import Link from "next/link";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {Button, Input} from "@/shared/ui";
import {tokens} from "@/shared/tokens";

type OperationAction = "stage" | "map" | "sync" | "audit";

interface SourceFormState {
  url: string;
  title: string;
  provider: string;
  sourceProvider: string;
  checkedAt: string;
  catalogId: string;
  observedTitle: string;
  makam: string;
  form: string;
  usul: string;
  composer: string;
}

export interface ExternalSourceInboxItem {
  id?: string;
  catalogId?: string;
  provider?: string;
  url?: string;
  title?: string;
  sourceProvider?: string;
  checkedAt?: string;
  observed?: {
    title?: string;
    makam?: string;
    form?: string;
    usul?: string;
    composer?: string;
  };
}

export interface ExternalReferenceMapping {
  inboxId?: string;
  catalogId?: string;
  status?: "accepted" | "needs-review" | "rejected";
  confidenceScore?: number;
  confidenceGap?: number;
  reason?: string;
  evidence?: {
    title?: string;
    makam?: string;
    form?: string;
    usul?: string;
    composer?: string;
    sourceProvider?: string;
  };
  candidate?: {
    source?: {
      title?: string;
      url?: string;
      provider?: string;
    };
  };
}

export interface ExternalReferenceState {
  inbox: {
    sourceCount: number;
    sources: ExternalSourceInboxItem[];
  };
  mapping: {
    generatedAt: string | null;
    summary: {
      sourceCount?: number;
      acceptedCount?: number;
      needsReviewCount?: number;
      rejectedCount?: number;
      addedCandidateCount?: number;
      skippedDuplicateCount?: number;
      outputCandidateCount?: number;
    };
    mappings: ExternalReferenceMapping[];
  };
  coverage: null | {
    totalCatalogEntries?: number;
    officialSymbTrMetadataEntries?: number;
    curatedReferenceEntries?: number;
    missingCuratedEntries?: number;
    curationDecisionEntries?: number;
    bulkCandidateEntries?: number;
    acceptedBulkCandidateEntries?: number;
  };
}

const emptyState: ExternalReferenceState = {
  inbox: {
    sourceCount: 0,
    sources: [],
  },
  mapping: {
    generatedAt: null,
    summary: {},
    mappings: [],
  },
  coverage: null,
};
const MAX_BULK_TEXT_CHARS = 100_000;
const MAX_SOURCE_FIELD_CHARS = 2_048;
const OPS_TOKEN_HEADER = "x-external-reference-ops-token";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialFormState(): SourceFormState {
  return {
    url: "",
    title: "",
    provider: "auto",
    sourceProvider: "",
    checkedAt: today(),
    catalogId: "",
    observedTitle: "",
    makam: "",
    form: "",
    usul: "",
    composer: "",
  };
}

function compactPayload(source: SourceFormState) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
  );
}

function formatNumber(value: unknown): string {
  return typeof value === "number" ? new Intl.NumberFormat("tr-TR").format(value) : "-";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClasses(status: string | undefined): string {
  if (status === "accepted") return "bg-[var(--color-success)] text-white";
  if (status === "needs-review") return "bg-[var(--color-warning)] text-[var(--color-text-primary)]";
  if (status === "rejected") return "bg-[var(--color-error)] text-white";
  return "bg-[var(--color-border)] text-[var(--color-text-primary)]";
}

interface ReferencesOperationsDashboardProps {
  initialState?: ExternalReferenceState;
  initialMessage?: string;
}

export function ReferencesOperationsDashboard({
  initialState = emptyState,
  initialMessage = "",
}: ReferencesOperationsDashboardProps) {
  const [state, setState] = useState<ExternalReferenceState>(initialState);
  const [form, setForm] = useState<SourceFormState>(() => initialFormState());
  const [bulkText, setBulkText] = useState("");
  const [opsToken, setOpsToken] = useState("");
  const [activeOperation, setActiveOperation] = useState<OperationAction | "refresh" | null>(null);
  const [message, setMessage] = useState(initialMessage);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/external-references", {
      cache: "no-store",
      headers: opsToken ? {[OPS_TOKEN_HEADER]: opsToken} : undefined,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Harici kaynak durumu okunamadı.");
    }

    setState(data as ExternalReferenceState);
  }, [opsToken]);

  const runOperation = useCallback(async (action: OperationAction, payload: Record<string, unknown> = {}) => {
    setActiveOperation(action);
    setMessage("");

    try {
      const response = await fetch("/api/external-references", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(opsToken ? {[OPS_TOKEN_HEADER]: opsToken} : {}),
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Operasyon tamamlanamadı.");
      }

      setState(data.state as ExternalReferenceState);
      setMessage(getOperationMessage(action, data.result));
      if (action === "stage" && !payload.dryRun) {
        setForm(initialFormState());
        setBulkText("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operasyon tamamlanamadı.");
    } finally {
      setActiveOperation(null);
    }
  }, [opsToken]);

  const refresh = useCallback(async () => {
    setActiveOperation("refresh");
    setMessage("");

    try {
      await loadState();
      setMessage("Kaynak operasyon durumu yenilendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Harici kaynak durumu okunamadı.");
    } finally {
      setActiveOperation(null);
    }
  }, [loadState]);

  const stageSource = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runOperation("stage", {
      source: compactPayload(form),
    });
  }, [form, runOperation]);

  const stageBulkText = useCallback(() => {
    void runOperation("stage", {
      bulkText,
    });
  }, [bulkText, runOperation]);

  const metrics = useMemo(() => {
    const summary = state.mapping.summary;
    const coverage = state.coverage ?? {};

    return [
      {label: "Inbox", value: formatNumber(state.inbox.sourceCount), meta: "kaynak"},
      {label: "Accepted", value: formatNumber(summary.acceptedCount), meta: "mapping"},
      {label: "Needs review", value: formatNumber(summary.needsReviewCount), meta: "mapping"},
      {label: "Curated", value: `${formatNumber(coverage.curatedReferenceEntries)} / ${formatNumber(coverage.totalCatalogEntries)}`, meta: "coverage"},
      {label: "Missing", value: formatNumber(coverage.missingCuratedEntries), meta: "backlog"},
      {label: "Bulk", value: formatNumber(coverage.acceptedBulkCandidateEntries), meta: "accepted"},
    ];
  }, [state]);

  const isBusy = activeOperation !== null;

  return (
    <UnifiedLayout>
      <div className={`min-h-screen ${tokens.colors.background.base}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
          <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${tokens.colors.text.secondary}`}>
                Kaynak operasyonları
              </p>
              <h1 className={`mt-2 text-3xl font-bold ${tokens.colors.text.primary}`}>
                Harici kaynak yönetimi
              </h1>
              <p className={`mt-2 max-w-3xl text-sm ${tokens.colors.text.secondary}`}>
                Kaynakları ekle, tüm katalogla eşleştir, accepted kayıtları ürün manifestine al.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className={`flex min-w-48 flex-col gap-1 text-xs ${tokens.colors.text.secondary}`}>
                Ops token
                <input
                  type="password"
                  value={opsToken}
                  onChange={(event) => setOpsToken(event.target.value)}
                  className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-1.5 text-sm ${tokens.colors.text.primary}`}
                  autoComplete="new-password"
                  placeholder="ops token"
                  maxLength={256}
                />
              </label>
              <Link
                href="/references/curation"
                className={`inline-flex items-center justify-center rounded-md border ${tokens.colors.border.base} bg-transparent px-3 py-1 text-sm font-medium ${tokens.colors.text.primary} transition-colors hover:bg-[var(--color-bg-muted)]`}
              >
                Kürasyon
              </Link>
              <Button variant="outline" size="sm" disabled={isBusy} onPress={() => void refresh()}>
                Yenile
              </Button>
              <Button variant="secondary" size="sm" disabled={isBusy} onPress={() => void runOperation("map")}>
                Map
              </Button>
              <Button variant="accent" size="sm" disabled={isBusy} onPress={() => void runOperation("sync")}>
                Sync
              </Button>
              <Button variant="primary" size="sm" disabled={isBusy} onPress={() => void runOperation("audit")}>
                Audit
              </Button>
            </div>
          </header>

          {message && (
            <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} px-4 py-3 text-sm ${tokens.colors.text.primary}`}>
              {message}
            </div>
          )}

          <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Kaynak operasyon özeti">
            {metrics.map((metric) => (
              <div key={metric.label} className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-4`}>
                <div className={`text-xs ${tokens.colors.text.secondary}`}>{metric.label}</div>
                <div className={`mt-2 text-2xl font-semibold ${tokens.colors.text.primary}`}>{metric.value}</div>
                <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{metric.meta}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
            <form
              onSubmit={stageSource}
              className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface} p-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Tek kaynak</h2>
                  <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>URL ve görünen metadata</p>
                </div>
                <span className={`rounded-sm border ${tokens.colors.border.base} px-2 py-1 text-xs ${tokens.colors.text.secondary}`}>
                  {activeOperation === "stage" ? "İşleniyor" : "Hazır"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input
                  label="URL"
                  value={form.url}
                  placeholder="https://..."
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, url: event.target.value}))}
                  required
                />
                <Input
                  label="Başlık"
                  value={form.title}
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, title: event.target.value}))}
                />
                <label className={`flex flex-col gap-1 ${tokens.colors.text.secondary} text-sm`}>
                  Provider
                  <select
                    className={`w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                    value={form.provider}
                    onChange={(event) => setForm((current) => ({...current, provider: event.target.value}))}
                  >
                    <option value="auto">Auto</option>
                    <option value="score">Score</option>
                    <option value="youtube">YouTube</option>
                    <option value="github">GitHub</option>
                    <option value="archive">Archive</option>
                    <option value="symbtr">SymbTr</option>
                  </select>
                </label>
                <Input
                  label="Kaynak adı"
                  value={form.sourceProvider}
                  placeholder="DîvânMakam, OGM..."
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, sourceProvider: event.target.value}))}
                />
                <Input
                  label="Kontrol tarihi"
                  type="date"
                  value={form.checkedAt}
                  onChange={(event) => setForm((current) => ({...current, checkedAt: event.target.value}))}
                />
                <Input
                  label="Catalog ID"
                  value={form.catalogId}
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, catalogId: event.target.value}))}
                />
                <Input
                  label="Eser adı"
                  value={form.observedTitle}
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, observedTitle: event.target.value}))}
                />
                <Input
                  label="Besteci"
                  value={form.composer}
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, composer: event.target.value}))}
                />
                <Input
                  label="Makam"
                  value={form.makam}
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, makam: event.target.value}))}
                />
                <Input
                  label="Form"
                  value={form.form}
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, form: event.target.value}))}
                />
                <Input
                  label="Usul"
                  value={form.usul}
                  maxLength={MAX_SOURCE_FIELD_CHARS}
                  onChange={(event) => setForm((current) => ({...current, usul: event.target.value}))}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={isBusy || form.url.trim().length === 0}>
                  Kaynağı ekle
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy || form.url.trim().length === 0}
                  onPress={() => void runOperation("stage", {source: compactPayload(form), dryRun: true})}
                >
                  Dry-run
                </Button>
              </div>
            </form>

            <section className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface} p-4`}>
              <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Toplu giriş</h2>
              <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>Markdown, TXT veya link listesi</p>
              <textarea
                aria-label="Toplu kaynak metni"
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                maxLength={MAX_BULK_TEXT_CHARS}
                className={`mt-4 min-h-64 w-full resize-y rounded-md border ${tokens.colors.border.base} bg-white p-3 text-sm ${tokens.colors.text.primary}`}
                placeholder="https://..."
              />
              <div className={`mt-2 text-xs ${tokens.colors.text.secondary}`}>
                {formatNumber(bulkText.length)} / {formatNumber(MAX_BULK_TEXT_CHARS)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" disabled={isBusy || bulkText.trim().length === 0} onPress={stageBulkText}>
                  Toplu ekle
                </Button>
                <Button
                  variant="outline"
                  disabled={isBusy || bulkText.trim().length === 0}
                  onPress={() => void runOperation("stage", {bulkText, dryRun: true})}
                >
                  Dry-run
                </Button>
              </div>
            </section>
          </section>

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Mapping sonuçları</h2>
                <p className={`text-xs ${tokens.colors.text.secondary}`}>Son üretim: {formatDate(state.mapping.generatedAt)}</p>
              </div>
              <div className={`text-xs ${tokens.colors.text.secondary}`}>
                {formatNumber(state.mapping.summary.sourceCount)} kaynak · {formatNumber(state.mapping.summary.skippedDuplicateCount)} duplicate skip
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Kaynak</th>
                    <th className="px-4 py-3 font-medium">Catalog ID</th>
                    <th className="px-4 py-3 font-medium">Skor</th>
                    <th className="px-4 py-3 font-medium">Kanıt</th>
                    <th className="px-4 py-3 font-medium">Sebep</th>
                  </tr>
                </thead>
                <tbody>
                  {state.mapping.mappings.length === 0 ? (
                    <tr>
                      <td className={`px-4 py-8 ${tokens.colors.text.secondary}`} colSpan={6}>
                        Mapping çıktısı yok.
                      </td>
                    </tr>
                  ) : (
                    state.mapping.mappings.map((mapping) => (
                      <tr key={`${mapping.inboxId}-${mapping.catalogId}`} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3">
                          <span className={`rounded-sm px-2 py-1 text-xs ${statusClasses(mapping.status)}`}>
                            {mapping.status ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {mapping.candidate?.source?.url ? (
                            <a
                              href={mapping.candidate.source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                            >
                              {mapping.candidate.source.title ?? mapping.inboxId}
                            </a>
                          ) : (
                            <span className={tokens.colors.text.primary}>{mapping.inboxId}</span>
                          )}
                          <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{mapping.evidence?.sourceProvider ?? mapping.candidate?.source?.provider ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="break-all text-xs text-[var(--color-text-primary)]">{mapping.catalogId}</code>
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {mapping.confidenceScore ?? "-"} / gap {mapping.confidenceGap ?? "-"}
                        </td>
                        <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>
                          <div>{mapping.evidence?.makam || "-"} · {mapping.evidence?.form || "-"} · {mapping.evidence?.usul || "-"}</div>
                          <div className="mt-1">{mapping.evidence?.composer || "-"}</div>
                        </td>
                        <td className={`max-w-xs px-4 py-3 ${tokens.colors.text.secondary}`}>
                          {mapping.reason ?? "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Inbox</h2>
              <p className={`text-xs ${tokens.colors.text.secondary}`}>{formatNumber(state.inbox.sourceCount)} staged kaynak</p>
            </div>
            <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
              {state.inbox.sources.length === 0 ? (
                <div className={`py-6 text-sm ${tokens.colors.text.secondary}`}>Inbox boş.</div>
              ) : (
                state.inbox.sources.map((source) => (
                  <article key={`${source.id}-${source.url}`} className={`border ${tokens.colors.border.base} ${tokens.radius.md} p-3`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={`truncate text-sm font-semibold ${tokens.colors.text.primary}`}>{source.title ?? source.observed?.title ?? source.id}</h3>
                        <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{source.sourceProvider ?? source.provider ?? "-"}</p>
                      </div>
                      <span className={`rounded-sm border ${tokens.colors.border.base} px-2 py-1 text-xs ${tokens.colors.text.secondary}`}>
                        {source.checkedAt ?? "-"}
                      </span>
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block truncate text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {source.url}
                    </a>
                    <div className={`mt-3 text-xs ${tokens.colors.text.secondary}`}>
                      {source.observed?.makam || "-"} · {source.observed?.form || "-"} · {source.observed?.usul || "-"}
                    </div>
                    {source.catalogId && <code className="mt-2 block break-all text-xs text-[var(--color-text-primary)]">{source.catalogId}</code>}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </UnifiedLayout>
  );
}

export default ReferencesOperationsDashboard;

function getOperationMessage(action: OperationAction, result: unknown): string {
  if (!result || typeof result !== "object") {
    return "Operasyon tamamlandı.";
  }

  const summary = result as Record<string, unknown>;

  if (action === "stage") {
    return `Stage tamamlandı: ${formatNumber(summary.addedCount)} eklendi, ${formatNumber(summary.skippedDuplicateCount)} duplicate atlandı.`;
  }

  if (action === "map") {
    return `Map tamamlandı: ${formatNumber(summary.acceptedCount)} accepted, ${formatNumber(summary.needsReviewCount)} review, ${formatNumber(summary.rejectedCount)} rejected.`;
  }

  if (action === "sync") {
    return `Sync tamamlandı: ${formatNumber(summary.addedCandidateCount)} yeni, ${formatNumber(summary.skippedDuplicateCount)} duplicate.`;
  }

  return `Audit tamamlandı: ${formatNumber(summary.curatedReferenceEntries)} curated, ${formatNumber(summary.missingCuratedEntries)} eksik.`;
}

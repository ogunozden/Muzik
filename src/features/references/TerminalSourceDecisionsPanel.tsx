"use client";

import {useMemo, useState} from "react";
import Link from "next/link";
import {Button} from "@/shared/ui";
import {tokens} from "@/shared/tokens";

const ALL_FILTER_VALUE = "all";

export interface SourceTerminalDecisionEntry {
  catalogId?: string;
  status?: string;
  reason?: string;
  providerResultCount?: number;
  importValidationRequired?: boolean;
  sourceUrl?: string | null;
}

export interface SourceTerminalFeedbackEvent {
  eventId?: string;
  catalogId?: string;
  eventType?: string;
  reason?: string;
  note?: string;
  alternateUrl?: string;
  previousEventId?: string;
  previousValue?: unknown;
  createdAt?: string;
  createdBy?: string;
  weakLabel?: boolean;
}

export interface SourceTerminalDecisionsState {
  artifactPath?: string;
  generatedAt?: string | null;
  terminalDecisionGroupCount?: number;
  disputedCount?: number;
  verifiedUnavailableCount?: number;
  deferredCount?: number;
  directAutoAttachCount?: number;
  mediaDownloadCount?: number;
  statusCounts?: Record<string, number>;
  visibleEntries?: SourceTerminalDecisionEntry[];
  feedbackArtifactPath?: string;
  feedbackEventCount?: number;
  feedbackActiveEventCount?: number;
  feedbackRolledBackEventCount?: number;
  feedbackEventTypeCounts?: Record<string, number>;
  feedbackEvents?: SourceTerminalFeedbackEvent[];
  allowedEventTypes?: string[];
  policy?: string;
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

function normalizeFilterText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : "";
}

function matchesQuery(values: unknown[], normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return values.some((value) => normalizeFilterText(value).includes(normalizedQuery));
}

function getUniqueOptions(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((first, second) => first.localeCompare(second, "tr-TR"));
}

function statusClasses(status: string | undefined): string {
  if (status === "accepted" || status === "auto-attached" || status === "user-approved") return "bg-[var(--color-success)] text-white";
  if (status === "conflict" || status === "rejected" || status === "deleted") return "bg-[var(--color-danger)] text-white";
  if (status === "needs-review" || status === "delete-requested") return "bg-[var(--color-warning)] text-[var(--color-text-primary)]";
  return "bg-[var(--color-border)] text-[var(--color-text-primary)]";
}

function terminalStatusClasses(status: string | undefined): string {
  if (status === "disputed") return "bg-[var(--color-warning)] text-[var(--color-text-primary)]";
  if (status === "verified-unavailable") return "bg-[var(--color-border)] text-[var(--color-text-primary)]";
  if (status === "deferred") return "bg-[var(--color-primary)] text-white";
  return statusClasses(status);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = `terminal-filter-${label.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-")}`;

  return (
    <label htmlFor={id} className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
      >
        <option value={ALL_FILTER_VALUE}>Tümü</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TerminalSourceDecisionsPanel({
  decisions,
  isBusy,
  onRecordFeedback,
  onRollbackFeedback,
}: {
  decisions: SourceTerminalDecisionsState;
  isBusy: boolean;
  onRecordFeedback: (entry: SourceTerminalDecisionEntry, eventType: string) => void;
  onRollbackFeedback: (event: SourceTerminalFeedbackEvent) => void;
}) {
  const [terminalStatusFilter, setTerminalStatusFilter] = useState(ALL_FILTER_VALUE);
  const [terminalQuery, setTerminalQuery] = useState("");
  const [terminalFeedbackTypeFilter, setTerminalFeedbackTypeFilter] = useState(ALL_FILTER_VALUE);
  const filteredTerminalEntries = useMemo(() => {
    const normalizedQuery = normalizeFilterText(terminalQuery);

    return (decisions.visibleEntries ?? []).filter((entry) => {
      const statusMatches = terminalStatusFilter === ALL_FILTER_VALUE || entry.status === terminalStatusFilter;
      return statusMatches && matchesQuery([
        entry.catalogId,
        entry.status,
        entry.reason,
        entry.sourceUrl,
      ], normalizedQuery);
    });
  }, [decisions.visibleEntries, terminalQuery, terminalStatusFilter]);
  const filteredTerminalFeedbackEvents = useMemo(() => (
    (decisions.feedbackEvents ?? []).filter((event) => (
      terminalFeedbackTypeFilter === ALL_FILTER_VALUE || event.eventType === terminalFeedbackTypeFilter
    ))
  ), [decisions.feedbackEvents, terminalFeedbackTypeFilter]);
  const terminalStatusOptions = useMemo(() => getUniqueOptions(Object.keys(decisions.statusCounts ?? {})), [decisions.statusCounts]);
  const terminalFeedbackTypeOptions = useMemo(() => getUniqueOptions([
    ...Object.keys(decisions.feedbackEventTypeCounts ?? {}),
    ...(decisions.allowedEventTypes ?? []),
  ]), [decisions.allowedEventTypes, decisions.feedbackEventTypeCounts]);

  return (
    <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Terminal kaynak kararları</h2>
          <p className={`text-xs ${tokens.colors.text.secondary}`}>
            {formatNumber(decisions.terminalDecisionGroupCount)} terminal · {formatNumber(decisions.disputedCount)} disputed · {formatNumber(decisions.verifiedUnavailableCount)} unavailable · {formatNumber(decisions.deferredCount)} deferred · {formatNumber(decisions.feedbackActiveEventCount ?? decisions.feedbackEventCount)} aktif weak label · {formatNumber(decisions.feedbackRolledBackEventCount)} rollback
          </p>
          {decisions.artifactPath && (
            <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{decisions.artifactPath}</code>
          )}
          {decisions.feedbackArtifactPath && (
            <code className="mt-1 block break-all text-xs text-[var(--color-text-primary)]">{decisions.feedbackArtifactPath}</code>
          )}
          {decisions.policy && (
            <p className={`mt-2 max-w-4xl text-xs ${tokens.colors.text.secondary}`}>{decisions.policy}</p>
          )}
        </div>
        <div className="grid w-full gap-2 text-sm sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
          <div>
            <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Safety</div>
            <div className={tokens.colors.text.primary}>{formatNumber(decisions.directAutoAttachCount)} attach · {formatNumber(decisions.mediaDownloadCount)} media</div>
          </div>
          <div>
            <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Disputed</div>
            <div className={tokens.colors.text.primary}>{formatNumber(decisions.disputedCount)} grup</div>
          </div>
          <div>
            <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Unavailable</div>
            <div className={tokens.colors.text.primary}>{formatNumber(decisions.verifiedUnavailableCount)} grup</div>
          </div>
          <div>
            <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>Deferred</div>
            <div className={tokens.colors.text.primary}>{formatNumber(decisions.deferredCount)} grup</div>
          </div>
        </div>
      </div>
      <div className="grid gap-2 border-b border-[var(--color-border)] px-4 py-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label htmlFor="terminal-search" className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
          Terminal ara
          <input
            id="terminal-search"
            value={terminalQuery}
            onChange={(event) => setTerminalQuery(event.target.value)}
            className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
          />
        </label>
        <FilterSelect label="Terminal durum" value={terminalStatusFilter} options={terminalStatusOptions} onChange={setTerminalStatusFilter} />
        <FilterSelect label="Feedback tipi" value={terminalFeedbackTypeFilter} options={terminalFeedbackTypeOptions} onChange={setTerminalFeedbackTypeFilter} />
      </div>
      <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr className={`border-b border-[var(--color-border)] text-left ${tokens.colors.text.secondary}`}>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Catalog</th>
                <th className="px-4 py-3 font-medium">Kanıt</th>
                <th className="px-4 py-3 font-medium">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerminalEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`px-4 py-8 ${tokens.colors.text.secondary}`}>Kayıt yok.</td>
                </tr>
              ) : (
                filteredTerminalEntries.map((entry) => (
                  <tr key={entry.catalogId} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-4 py-3">
                      <span className={`rounded-sm px-2 py-1 text-xs ${terminalStatusClasses(entry.status)}`}>
                        {entry.status ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.catalogId ? (
                        <Link
                          href={`/references/curation/${encodeURIComponent(entry.catalogId)}`}
                          className="break-all text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                        >
                          {entry.catalogId}
                        </Link>
                      ) : (
                        <span className={tokens.colors.text.secondary}>-</span>
                      )}
                      {entry.sourceUrl && (
                        <a
                          href={entry.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                        >
                          {entry.sourceUrl}
                        </a>
                      )}
                    </td>
                    <td className={`max-w-md px-4 py-3 ${tokens.colors.text.secondary}`}>
                      <div className="line-clamp-2">{entry.reason ?? "-"}</div>
                      <div className="mt-1 text-xs">
                        {formatNumber(entry.providerResultCount)} provider · {entry.importValidationRequired ? "import validator gerekli" : "accepted yok"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="xs" variant="outline" disabled={isBusy} onPress={() => onRecordFeedback(entry, "comment_added")}>
                          Yorum
                        </Button>
                        <Button size="xs" variant="secondary" disabled={isBusy} onPress={() => onRecordFeedback(entry, "alternate_proposed")}>
                          Alternatif
                        </Button>
                        <Button size="xs" variant="outline" disabled={isBusy} onPress={() => onRecordFeedback(entry, "verified")}>
                          Doğrula
                        </Button>
                        <Button size="xs" variant="secondary" disabled={isBusy} onPress={() => onRecordFeedback(entry, "community_verified_requested")}>
                          Community
                        </Button>
                        <Button size="xs" variant="danger" disabled={isBusy} onPress={() => onRecordFeedback(entry, "rejected")}>
                          Reddet
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <aside className={`border ${tokens.colors.border.base} ${tokens.radius.md}`}>
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <h3 className={`text-sm font-semibold ${tokens.colors.text.primary}`}>Terminal feedback</h3>
            <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
              {formatNumber(filteredTerminalFeedbackEvents.length)} gösteriliyor · {formatNumber(decisions.feedbackEventCount)} toplam
            </p>
          </div>
          <div className="flex max-h-[24rem] flex-col overflow-y-auto">
            {filteredTerminalFeedbackEvents.length === 0 ? (
              <div className={`px-4 py-8 text-sm ${tokens.colors.text.secondary}`}>Kayıt yok.</div>
            ) : (
              filteredTerminalFeedbackEvents.map((event) => (
                <article key={event.eventId ?? `${event.catalogId}-${event.createdAt}`} className="border-b border-[var(--color-border)] px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-sm font-medium ${tokens.colors.text.primary}`}>{event.eventType ?? "-"}</div>
                    {event.eventType !== "rolled_back" && event.eventId && (
                      <Button size="xs" variant="outline" disabled={isBusy} onPress={() => onRollbackFeedback(event)}>
                        Rollback
                      </Button>
                    )}
                  </div>
                  <div className={`mt-1 break-all text-xs ${tokens.colors.text.secondary}`}>{event.catalogId}</div>
                  {event.previousEventId && (
                    <div className={`mt-1 break-all text-xs ${tokens.colors.text.secondary}`}>geri alinan: {event.previousEventId}</div>
                  )}
                  <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{formatDate(event.createdAt)} · {event.weakLabel ? "weak label" : "review"}</div>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

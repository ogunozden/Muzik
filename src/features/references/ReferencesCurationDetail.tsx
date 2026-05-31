"use client";

import {FormEvent, useCallback, useMemo, useState} from "react";
import Link from "next/link";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {Button, Input} from "@/shared/ui";
import {tokens} from "@/shared/tokens";

type CurationAction = "curation-feedback" | "curation-manual-correction";
type DetailView = "scores" | "videos" | "archive" | "metadata" | "log" | "manual";

interface ExternalReferenceSource {
  id?: string;
  label?: string;
  provider?: string;
  url?: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  access?: string;
  verification?: string;
  verifiedAt?: string;
  notes?: string;
}

interface CurationReference {
  catalogId?: string;
  sourceId?: string;
  source?: ExternalReferenceSource | null;
  status?: string;
  rank?: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  matchReasons?: string[];
  conflicts?: string[];
  attachedAt?: string;
  feedbackEvents?: SourceFeedbackEvent[];
  manualCorrection?: ManualCorrection | null;
  embedState?: {
    embedType?: string;
    canEmbed?: boolean;
    lastFailureReason?: string;
    fallbackUrl?: string;
  } | null;
}

interface SourceFeedbackEvent {
  eventId?: string;
  catalogId?: string;
  sourceId?: string;
  eventType?: string;
  reason?: string;
  note?: string;
  createdAt?: string;
  createdBy?: string;
}

interface ManualCorrection {
  catalogId?: string;
  sourceId?: string;
  correctTitle?: string;
  correctMakam?: string;
  correctUsul?: string;
  correctForm?: string;
  correctComposer?: string;
  correctLyricist?: string;
  alternativeUrl?: string;
  tags?: string[];
  notes?: string;
  updatedAt?: string;
}

interface ExternalReferenceState {
  curation?: {
    autoAttachedReferences?: CurationReference[];
    feedbackEvents?: SourceFeedbackEvent[];
    manualCorrections?: ManualCorrection[];
  };
}

interface CorrectionFormState {
  correctTitle: string;
  correctMakam: string;
  correctUsul: string;
  correctForm: string;
  correctComposer: string;
  correctLyricist: string;
  alternativeUrl: string;
  tags: string;
  notes: string;
}

const OPS_TOKEN_HEADER = "x-external-reference-ops-token";
const emptyState: ExternalReferenceState = {};
const detailViews: Array<{id: DetailView; label: string}> = [
  {id: "scores", label: "Notalar"},
  {id: "videos", label: "Videolar"},
  {id: "archive", label: "PDF/Arşiv"},
  {id: "metadata", label: "Metadata"},
  {id: "log", label: "Log"},
  {id: "manual", label: "Manuel Düzeltme"},
];

function emptyCorrectionForm(): CorrectionFormState {
  return {
    correctTitle: "",
    correctMakam: "",
    correctUsul: "",
    correctForm: "",
    correctComposer: "",
    correctLyricist: "",
    alternativeUrl: "",
    tags: "",
    notes: "",
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function sourceMatchesView(reference: CurationReference, view: DetailView): boolean {
  const source = reference.source;
  if (view === "scores") return source?.provider === "score" || source?.label?.toLocaleLowerCase("tr-TR").includes("nota") === true;
  if (view === "videos") return source?.provider === "youtube";
  if (view === "archive") return source?.provider === "archive" || source?.provider === "github" || source?.provider === "symbtr";
  if (view === "metadata") return true;
  return false;
}

function compactCorrection(form: CorrectionFormState, catalogId: string, sourceId: string): ManualCorrection {
  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    catalogId,
    sourceId,
    ...(form.correctTitle.trim() ? {correctTitle: form.correctTitle.trim()} : {}),
    ...(form.correctMakam.trim() ? {correctMakam: form.correctMakam.trim()} : {}),
    ...(form.correctUsul.trim() ? {correctUsul: form.correctUsul.trim()} : {}),
    ...(form.correctForm.trim() ? {correctForm: form.correctForm.trim()} : {}),
    ...(form.correctComposer.trim() ? {correctComposer: form.correctComposer.trim()} : {}),
    ...(form.correctLyricist.trim() ? {correctLyricist: form.correctLyricist.trim()} : {}),
    ...(form.alternativeUrl.trim() ? {alternativeUrl: form.alternativeUrl.trim()} : {}),
    ...(tags.length > 0 ? {tags} : {}),
    ...(form.notes.trim() ? {notes: form.notes.trim()} : {}),
  };
}

function getSourceTitle(reference: CurationReference): string {
  return reference.source?.title ?? reference.source?.label ?? reference.sourceId ?? "Kaynak";
}

function getYoutubeEmbedUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }

    if (url.hostname.endsWith("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function getInlinePreviewUrl(reference: CurationReference | null): string | null {
  const source = reference?.source;
  if (!source?.url) return null;

  if (source.provider === "youtube" && source.verification === "oembed") {
    return getYoutubeEmbedUrl(source.url);
  }

  if (source.access === "embed-allowed" && reference?.embedState?.canEmbed === true) {
    return source.url;
  }

  return null;
}

export function ReferencesCurationDetail({catalogId}: {catalogId: string}) {
  const [state, setState] = useState<ExternalReferenceState>(emptyState);
  const [opsToken, setOpsToken] = useState("");
  const [activeOperation, setActiveOperation] = useState<CurationAction | "refresh" | null>(null);
  const [message, setMessage] = useState("");
  const [activeView, setActiveView] = useState<DetailView>("scores");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [previewVisible, setPreviewVisible] = useState(true);
  const [form, setForm] = useState<CorrectionFormState>(() => emptyCorrectionForm());

  const references = useMemo(() => (
    state.curation?.autoAttachedReferences?.filter((reference) => reference.catalogId === catalogId) ?? []
  ), [catalogId, state]);
  const currentReference = references.find((reference) => reference.sourceId === selectedSourceId) ?? references[0] ?? null;
  const previewUrl = getInlinePreviewUrl(currentReference);
  const visibleReferences = useMemo(() => (
    activeView === "log" || activeView === "manual"
      ? references
      : references.filter((reference) => sourceMatchesView(reference, activeView))
  ), [activeView, references]);
  const eventLog = useMemo(() => (
    state.curation?.feedbackEvents?.filter((event) => event.catalogId === catalogId) ?? []
  ), [catalogId, state]);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/external-references", {
      cache: "no-store",
      headers: opsToken ? {[OPS_TOKEN_HEADER]: opsToken} : undefined,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Kürasyon detayı okunamadı.");
    }

    setState(data as ExternalReferenceState);
  }, [opsToken]);

  const runOperation = useCallback(async (action: CurationAction, payload: Record<string, unknown>) => {
    setActiveOperation(action);
    setMessage("");

    try {
      const response = await fetch("/api/external-references", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(opsToken ? {[OPS_TOKEN_HEADER]: opsToken} : {}),
        },
        body: JSON.stringify({action, ...payload}),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Kürasyon işlemi tamamlanamadı.");
      }

      setState(data.state as ExternalReferenceState);
      setMessage(action === "curation-manual-correction" ? "Manuel düzeltme kaydedildi." : "Feedback kaydedildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kürasyon işlemi tamamlanamadı.");
    } finally {
      setActiveOperation(null);
    }
  }, [opsToken]);

  const refresh = useCallback(async () => {
    setActiveOperation("refresh");
    setMessage("");

    try {
      await loadState();
      setMessage("Kürasyon detayı yenilendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kürasyon detayı okunamadı.");
    } finally {
      setActiveOperation(null);
    }
  }, [loadState]);

  const submitCorrection = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentReference?.sourceId) return;

    void runOperation("curation-manual-correction", {
      manualCorrection: compactCorrection(form, catalogId, currentReference.sourceId),
    });
  }, [catalogId, currentReference, form, runOperation]);

  const recordFeedback = useCallback((eventType: "user-approved" | "user-prioritized" | "user-removed") => {
    if (!currentReference?.sourceId) return;

    void runOperation("curation-feedback", {
      feedback: {
        catalogId,
        sourceId: currentReference.sourceId,
        eventType,
        reason: `curation-detail-${eventType}`,
      },
    });
  }, [catalogId, currentReference, runOperation]);

  const isBusy = activeOperation !== null;

  return (
    <UnifiedLayout>
      <div className={`min-h-screen ${tokens.colors.background.base}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
          <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link href="/references/curation" className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline">
                Kürasyon
              </Link>
              <h1 className={`mt-2 break-words text-2xl font-semibold ${tokens.colors.text.primary}`}>{catalogId}</h1>
              <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                {references.length} kaynak · {eventLog.length} feedback
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label="Ops token"
                type="password"
                value={opsToken}
                onChange={(event) => setOpsToken(event.target.value)}
                className="sm:w-64"
              />
              <Button variant="outline" disabled={isBusy} onPress={() => void refresh()}>
                Yenile
              </Button>
            </div>
          </header>

          {message && (
            <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} px-4 py-3 text-sm ${tokens.colors.text.primary}`}>
              {message}
            </div>
          )}

          <nav className="flex gap-2 overflow-x-auto" aria-label="Kürasyon detay görünümleri">
            {detailViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`shrink-0 rounded-md border px-3 py-2 text-sm ${
                  activeView === view.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : `${tokens.colors.border.base} bg-white ${tokens.colors.text.primary}`
                }`}
              >
                {view.label}
              </button>
            ))}
          </nav>

          {activeView !== "log" && activeView !== "manual" && (
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
              <div className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
                <div className="border-b border-[var(--color-border)] px-4 py-3">
                  <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>{detailViews.find((view) => view.id === activeView)?.label}</h2>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {visibleReferences.length === 0 ? (
                    <div className={`px-4 py-8 text-sm ${tokens.colors.text.secondary}`}>Bu görünümde kaynak yok.</div>
                  ) : (
                    visibleReferences.map((reference) => (
                      <article key={reference.sourceId} className="p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <h3 className={`break-words text-base font-semibold ${tokens.colors.text.primary}`}>{getSourceTitle(reference)}</h3>
                            <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                              {reference.source?.provider ?? "-"} · {reference.source?.verification ?? "-"} · {reference.status ?? "-"}
                            </p>
                          </div>
                          <span className={`rounded-sm border ${tokens.colors.border.base} px-2 py-1 text-xs ${tokens.colors.text.secondary}`}>
                            {reference.confidenceLevel ?? "-"} · {reference.confidenceScore ?? "-"}
                          </span>
                        </div>
                        {reference.source?.url && (
                          <a
                            href={reference.source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 block break-all text-sm text-[var(--color-primary)] underline-offset-2 hover:underline"
                          >
                            {reference.source.url}
                          </a>
                        )}
                        {reference.conflicts && reference.conflicts.length > 0 && (
                          <div className="mt-3 rounded-md border border-[var(--color-error)] px-3 py-2 text-sm text-[var(--color-error)]">
                            {reference.conflicts.join(", ")}
                          </div>
                        )}
                        {reference.matchReasons && reference.matchReasons.length > 0 && (
                          <div className={`mt-3 text-xs ${tokens.colors.text.secondary}`}>{reference.matchReasons.join(", ")}</div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>

              <aside className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface} p-4`}>
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Seçili kaynak</h2>
                <label className={`mt-4 flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Kaynak
                  <select
                    value={currentReference?.sourceId ?? ""}
                    onChange={(event) => setSelectedSourceId(event.target.value)}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  >
                    {references.map((reference) => (
                      <option key={reference.sourceId} value={reference.sourceId}>{getSourceTitle(reference)}</option>
                    ))}
                  </select>
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={isBusy || !currentReference} onPress={() => recordFeedback("user-approved")}>
                    Onayla
                  </Button>
                  <Button size="sm" variant="secondary" disabled={isBusy || !currentReference} onPress={() => recordFeedback("user-prioritized")}>
                    Öne al
                  </Button>
                  <Button size="sm" variant="danger" disabled={isBusy || !currentReference} onPress={() => recordFeedback("user-removed")}>
                    Kaldır
                  </Button>
                </div>
                <dl className={`mt-5 grid grid-cols-[8rem_minmax(0,1fr)] gap-2 text-sm ${tokens.colors.text.secondary}`}>
                  <dt>Status</dt>
                  <dd className="break-words text-[var(--color-text-primary)]">{currentReference?.status ?? "-"}</dd>
                  <dt>Access</dt>
                  <dd className="break-words text-[var(--color-text-primary)]">{currentReference?.source?.access ?? "-"}</dd>
                  <dt>Embed</dt>
                  <dd className="break-words text-[var(--color-text-primary)]">
                    {currentReference?.embedState?.canEmbed === true ? "available" : currentReference?.embedState?.lastFailureReason ?? "not checked"}
                  </dd>
                </dl>
                <div className={`mt-5 border-t ${tokens.colors.border.base} pt-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`text-base font-semibold ${tokens.colors.text.primary}`}>Önizleme</h3>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={!previewUrl}
                      onPress={() => setPreviewVisible((current) => !current)}
                    >
                      {previewVisible ? "Gizle" : "Göster"}
                    </Button>
                  </div>
                  {currentReference?.source?.url && (
                    <a
                      href={currentReference.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block break-all text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {currentReference.source.url}
                    </a>
                  )}
                  {previewUrl && previewVisible ? (
                    <iframe
                      title={`${getSourceTitle(currentReference)} önizleme`}
                      src={previewUrl}
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      referrerPolicy="strict-origin-when-cross-origin"
                      className={`mt-3 aspect-video w-full rounded-md border ${tokens.colors.border.base} bg-white`}
                    />
                  ) : (
                    <div className={`mt-3 rounded-md border ${tokens.colors.border.base} px-3 py-2 text-sm ${tokens.colors.text.secondary}`}>
                      {previewUrl ? "Önizleme gizli." : "Güvenli inline preview yok."}
                    </div>
                  )}
                </div>
              </aside>
            </section>
          )}

          {activeView === "log" && (
            <section className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Feedback log</h2>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {eventLog.length === 0 ? (
                  <div className={`px-4 py-8 text-sm ${tokens.colors.text.secondary}`}>Kayıt yok.</div>
                ) : (
                  eventLog.map((event) => (
                    <article key={event.eventId ?? `${event.sourceId}-${event.createdAt}`} className="p-4">
                      <div className={`font-medium ${tokens.colors.text.primary}`}>{event.eventType ?? "-"}</div>
                      <div className={`mt-1 break-all text-xs ${tokens.colors.text.secondary}`}>{event.sourceId}</div>
                      <div className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>{formatDate(event.createdAt)}</div>
                      {event.reason && <div className={`mt-2 text-sm ${tokens.colors.text.secondary}`}>{event.reason}</div>}
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {activeView === "manual" && (
            <form
              onSubmit={submitCorrection}
              className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface} p-4`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Manuel Düzeltme</h2>
                  <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>{currentReference ? getSourceTitle(currentReference) : "Kaynak seçilmedi"}</p>
                </div>
                <label className={`flex min-w-64 flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                  Kaynak
                  <select
                    value={currentReference?.sourceId ?? ""}
                    onChange={(event) => setSelectedSourceId(event.target.value)}
                    className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                  >
                    {references.map((reference) => (
                      <option key={reference.sourceId} value={reference.sourceId}>{getSourceTitle(reference)}</option>
                    ))}
                  </select>
                </label>
              </div>

              {currentReference?.manualCorrection && (
                <div className={`mt-4 rounded-md border ${tokens.colors.border.base} p-3 text-sm ${tokens.colors.text.secondary}`}>
                  Son düzeltme: {formatDate(currentReference.manualCorrection.updatedAt)}
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input label="Doğru başlık" value={form.correctTitle} onChange={(event) => setForm((current) => ({...current, correctTitle: event.target.value}))} />
                <Input label="Makam" value={form.correctMakam} onChange={(event) => setForm((current) => ({...current, correctMakam: event.target.value}))} />
                <Input label="Usul" value={form.correctUsul} onChange={(event) => setForm((current) => ({...current, correctUsul: event.target.value}))} />
                <Input label="Form" value={form.correctForm} onChange={(event) => setForm((current) => ({...current, correctForm: event.target.value}))} />
                <Input label="Besteci" value={form.correctComposer} onChange={(event) => setForm((current) => ({...current, correctComposer: event.target.value}))} />
                <Input label="Güfteci" value={form.correctLyricist} onChange={(event) => setForm((current) => ({...current, correctLyricist: event.target.value}))} />
                <Input label="Alternatif URL" value={form.alternativeUrl} onChange={(event) => setForm((current) => ({...current, alternativeUrl: event.target.value}))} />
                <Input label="Etiketler" value={form.tags} placeholder="virgül ile ayır" onChange={(event) => setForm((current) => ({...current, tags: event.target.value}))} />
              </div>
              <label className={`mt-3 flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
                Not
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({...current, notes: event.target.value}))}
                  className={`min-h-28 rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={isBusy || !currentReference}>
                  Kaydet
                </Button>
                <Button type="button" variant="outline" disabled={isBusy} onPress={() => setForm(emptyCorrectionForm())}>
                  Temizle
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </UnifiedLayout>
  );
}

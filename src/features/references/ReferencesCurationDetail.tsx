"use client";

import {FormEvent, useCallback, useMemo, useState} from "react";
import Link from "next/link";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {Button, Input} from "@/shared/ui";
import {tokens} from "@/shared/tokens";

type CurationAction = "curation-feedback" | "curation-manual-correction";
type FeedbackEventType =
  | "user-approved"
  | "user-prioritized"
  | "user-removed"
  | "delete-requested"
  | "deleted"
  | "restored";
type DetailView = "scores" | "videos" | "archive" | "metadata" | "log" | "manual";

interface CatalogMetadata {
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
}

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
  catalog?: CatalogMetadata | null;
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
const deleteStatuses = new Set(["delete-requested", "deleted", "user-removed"]);
const manualNoteScopes = new Set(["manual-correction", "manual-notes", "manual-tags"]);

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

function normalizeFacet(value: string | null | undefined): string {
  return value?.trim() || "";
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeFacet).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "tr-TR"));
}

function getReferenceComposer(reference: CurationReference): string {
  return normalizeFacet(reference.manualCorrection?.correctComposer ?? reference.catalog?.composer);
}

function getReferenceLyricist(reference: CurationReference): string {
  return normalizeFacet(reference.manualCorrection?.correctLyricist ?? reference.source?.author);
}

function getReferenceProvider(reference: CurationReference): string {
  return normalizeFacet(reference.source?.provider);
}

function getReferenceHostname(reference: CurationReference): string {
  const url = reference.source?.url;
  if (!url) return "";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getReferenceConfidence(reference: CurationReference): string {
  return normalizeFacet(reference.confidenceLevel);
}

function hasManualNotes(reference: CurationReference): boolean {
  const correction = reference.manualCorrection;
  return Boolean(
    correction &&
    (
      normalizeFacet(correction.notes) ||
      normalizeFacet(correction.correctTitle) ||
      normalizeFacet(correction.correctMakam) ||
      normalizeFacet(correction.correctUsul) ||
      normalizeFacet(correction.correctForm) ||
      normalizeFacet(correction.correctComposer) ||
      normalizeFacet(correction.correctLyricist) ||
      normalizeFacet(correction.alternativeUrl) ||
      (correction.tags?.length ?? 0) > 0
    ),
  );
}

function matchesManualNoteScope(reference: CurationReference, scope: string): boolean {
  if (!scope) return true;
  const correction = reference.manualCorrection;
  if (!correction) return false;
  if (scope === "manual-correction") return hasManualNotes(reference);
  if (scope === "manual-notes") return Boolean(normalizeFacet(correction.notes));
  if (scope === "manual-tags") return (correction.tags?.length ?? 0) > 0;
  return !manualNoteScopes.has(scope);
}

function matchesDeleteScope(reference: CurationReference, scope: string): boolean {
  if (!scope) return true;
  if (scope === "pending-delete") return reference.status === "delete-requested";
  if (scope === "deleted") return reference.status === "deleted";
  if (scope === "removed") return reference.status === "user-removed";
  if (scope === "active") return !deleteStatuses.has(reference.status ?? "");
  return true;
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
  const [composerFilter, setComposerFilter] = useState("");
  const [lyricistFilter, setLyricistFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("");
  const [manualNoteFilter, setManualNoteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteScopeFilter, setDeleteScopeFilter] = useState("");
  const [previewVisible, setPreviewVisible] = useState(true);
  const [form, setForm] = useState<CorrectionFormState>(() => emptyCorrectionForm());

  const references = useMemo(() => (
    state.curation?.autoAttachedReferences?.filter((reference) => reference.catalogId === catalogId) ?? []
  ), [catalogId, state]);
  const composerFacets = useMemo(() => uniqueSorted(references.map(getReferenceComposer)), [references]);
  const lyricistFacets = useMemo(() => uniqueSorted(references.map(getReferenceLyricist)), [references]);
  const providerFacets = useMemo(() => uniqueSorted(references.map(getReferenceProvider)), [references]);
  const siteFacets = useMemo(() => uniqueSorted(references.map(getReferenceHostname)), [references]);
  const confidenceFacets = useMemo(() => uniqueSorted(references.map(getReferenceConfidence)), [references]);
  const statusFacets = useMemo(() => uniqueSorted(references.map((reference) => reference.status ?? "")), [references]);
  const filteredReferences = useMemo(() => (
    references.filter((reference) => {
      if (composerFilter && getReferenceComposer(reference) !== composerFilter) return false;
      if (lyricistFilter && getReferenceLyricist(reference) !== lyricistFilter) return false;
      if (providerFilter && getReferenceProvider(reference) !== providerFilter) return false;
      if (siteFilter && getReferenceHostname(reference) !== siteFilter) return false;
      if (confidenceFilter && getReferenceConfidence(reference) !== confidenceFilter) return false;
      if (!matchesManualNoteScope(reference, manualNoteFilter)) return false;
      if (statusFilter && reference.status !== statusFilter) return false;
      return matchesDeleteScope(reference, deleteScopeFilter);
    })
  ), [composerFilter, confidenceFilter, deleteScopeFilter, lyricistFilter, manualNoteFilter, providerFilter, references, siteFilter, statusFilter]);
  const deleteQueueCount = references.filter((reference) => reference.status === "delete-requested").length;
  const deletedCount = references.filter((reference) => reference.status === "deleted").length;
  const manualNoteCount = references.filter(hasManualNotes).length;
  const currentReference =
    filteredReferences.find((reference) => reference.sourceId === selectedSourceId) ??
    filteredReferences[0] ??
    references[0] ??
    null;
  const previewUrl = getInlinePreviewUrl(currentReference);
  const visibleReferences = useMemo(() => (
    activeView === "log" || activeView === "manual"
      ? filteredReferences
      : filteredReferences.filter((reference) => sourceMatchesView(reference, activeView))
  ), [activeView, filteredReferences]);
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

  const recordFeedback = useCallback((eventType: FeedbackEventType) => {
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

          <section className={`grid gap-3 border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface} p-4 md:grid-cols-4`}>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Besteci
              <select
                value={composerFilter}
                onChange={(event) => setComposerFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                {composerFacets.map((composer) => <option key={composer} value={composer}>{composer}</option>)}
              </select>
            </label>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Güfteci
              <select
                value={lyricistFilter}
                onChange={(event) => setLyricistFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                {lyricistFacets.map((lyricist) => <option key={lyricist} value={lyricist}>{lyricist}</option>)}
              </select>
            </label>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Durum
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                {statusFacets.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Silme
              <select
                value={deleteScopeFilter}
                onChange={(event) => setDeleteScopeFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                <option value="active">Aktif</option>
                <option value="pending-delete">Silme bekleyen</option>
                <option value="deleted">Silindi</option>
                <option value="removed">Kaldırıldı</option>
              </select>
            </label>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Kaynak tipi
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                {providerFacets.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
              </select>
            </label>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Site
              <select
                value={siteFilter}
                onChange={(event) => setSiteFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                {siteFacets.map((site) => <option key={site} value={site}>{site}</option>)}
              </select>
            </label>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Güven
              <select
                value={confidenceFilter}
                onChange={(event) => setConfidenceFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                {confidenceFacets.map((confidence) => <option key={confidence} value={confidence}>{confidence}</option>)}
              </select>
            </label>
            <label className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
              Manuel not
              <select
                value={manualNoteFilter}
                onChange={(event) => setManualNoteFilter(event.target.value)}
                className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
              >
                <option value="">Tümü</option>
                <option value="manual-correction">Manuel düzeltmeli</option>
                <option value="manual-notes">Notlu</option>
                <option value="manual-tags">Etiketli</option>
              </select>
            </label>
            <div className={`md:col-span-4 text-xs ${tokens.colors.text.secondary}`}>
              {visibleReferences.length} / {references.length} kaynak görünür · silme bekleyen {deleteQueueCount} · silindi {deletedCount} · manuel notlu {manualNoteCount}
            </div>
          </section>

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
                    {filteredReferences.map((reference) => (
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
                  <Button size="sm" variant="danger" disabled={isBusy || !currentReference} onPress={() => recordFeedback("delete-requested")}>
                    Silme İste
                  </Button>
                  <Button size="sm" variant="danger" disabled={isBusy || !currentReference} onPress={() => recordFeedback("deleted")}>
                    Silindi İşaretle
                  </Button>
                  <Button size="sm" variant="outline" disabled={isBusy || !currentReference} onPress={() => recordFeedback("restored")}>
                    Geri Al
                  </Button>
                </div>
                <dl className={`mt-5 grid grid-cols-[8rem_minmax(0,1fr)] gap-2 text-sm ${tokens.colors.text.secondary}`}>
                  <dt>Status</dt>
                  <dd className="break-words text-[var(--color-text-primary)]">{currentReference?.status ?? "-"}</dd>
                  <dt>Site</dt>
                  <dd className="break-words text-[var(--color-text-primary)]">{currentReference ? getReferenceHostname(currentReference) || "-" : "-"}</dd>
                  <dt>Güven</dt>
                  <dd className="break-words text-[var(--color-text-primary)]">{currentReference?.confidenceLevel ?? "-"} · {currentReference?.confidenceScore ?? "-"}</dd>
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
                    {filteredReferences.map((reference) => (
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

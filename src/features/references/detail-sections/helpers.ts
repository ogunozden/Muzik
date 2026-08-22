import type {CurationReference, ManualCorrection, CorrectionFormState, DetailView} from "./types";

export const emptyState = {};
export const detailViews: Array<{id: DetailView; label: string}> = [
  {id: "scores", label: "Notalar"},
  {id: "videos", label: "Videolar"},
  {id: "archive", label: "PDF/Arşiv"},
  {id: "metadata", label: "Metadata"},
  {id: "log", label: "Log"},
  {id: "manual", label: "Manuel Düzeltme"},
];
export const deleteStatuses = new Set(["delete-requested", "deleted", "user-removed"]);
export const manualNoteScopes = new Set(["manual-correction", "manual-notes", "manual-tags"]);

export function emptyCorrectionForm(): CorrectionFormState {
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

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {dateStyle: "short", timeStyle: "short"}).format(new Date(value));
}

export function sourceMatchesView(reference: CurationReference, view: DetailView): boolean {
  const source = reference.source;
  if (view === "scores") return source?.provider === "score" || source?.label?.toLocaleLowerCase("tr-TR").includes("nota") === true;
  if (view === "videos") return source?.provider === "youtube";
  if (view === "archive") return source?.provider === "archive" || source?.provider === "github" || source?.provider === "symbtr";
  if (view === "metadata") return true;
  return false;
}

export function compactCorrection(form: CorrectionFormState, catalogId: string, sourceId: string): ManualCorrection {
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

export function getSourceTitle(reference: CurationReference): string {
  return reference.source?.title ?? reference.source?.label ?? reference.sourceId ?? "Kaynak";
}

function normalizeFacet(value: string | null | undefined): string {
  return value?.trim() || "";
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeFacet).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr-TR"));
}

export function getReferenceComposer(reference: CurationReference): string {
  return normalizeFacet(reference.manualCorrection?.correctComposer ?? reference.catalog?.composer);
}

export function getReferenceLyricist(reference: CurationReference): string {
  return normalizeFacet(reference.manualCorrection?.correctLyricist ?? reference.source?.author);
}

export function getReferenceProvider(reference: CurationReference): string {
  return normalizeFacet(reference.source?.provider);
}

export function getReferenceHostname(reference: CurationReference): string {
  const url = reference.source?.url;
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getReferenceConfidence(reference: CurationReference): string {
  return normalizeFacet(reference.confidenceLevel);
}

export function hasManualNotes(reference: CurationReference): boolean {
  const correction = reference.manualCorrection;
  return Boolean(
    correction &&
      (normalizeFacet(correction.notes) ||
        normalizeFacet(correction.correctTitle) ||
        normalizeFacet(correction.correctMakam) ||
        normalizeFacet(correction.correctUsul) ||
        normalizeFacet(correction.correctForm) ||
        normalizeFacet(correction.correctComposer) ||
        normalizeFacet(correction.correctLyricist) ||
        normalizeFacet(correction.alternativeUrl) ||
        (correction.tags?.length ?? 0) > 0),
  );
}

export function matchesManualNoteScope(reference: CurationReference, scope: string): boolean {
  if (!scope) return true;
  const correction = reference.manualCorrection;
  if (!correction) return false;
  if (scope === "manual-correction") return hasManualNotes(reference);
  if (scope === "manual-notes") return Boolean(normalizeFacet(correction.notes));
  if (scope === "manual-tags") return (correction.tags?.length ?? 0) > 0;
  return !manualNoteScopes.has(scope);
}

export function matchesDeleteScope(reference: CurationReference, scope: string): boolean {
  if (!scope) return true;
  if (scope === "pending-delete") return reference.status === "delete-requested";
  if (scope === "deleted") return reference.status === "deleted";
  if (scope === "removed") return reference.status === "user-removed";
  if (scope === "active") return !deleteStatuses.has(reference.status ?? "");
  return true;
}

export function getYoutubeEmbedUrl(value: string | undefined): string | null {
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

export function getInlinePreviewUrl(reference: CurationReference | null): string | null {
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

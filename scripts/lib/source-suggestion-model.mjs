import {createHash, randomUUID} from "node:crypto";

export const SOURCE_SUGGESTION_STATUSES = new Set([
  "auto-suggested",
  "user-attached",
  "community-verified",
  "disputed",
  "user-removed",
  "rejected",
  "deferred",
]);

export const GROUNDED_SUGGESTION_OUTPUT_STATUSES = new Set([
  "auto-suggested",
  "disputed",
  "rejected",
  "deferred",
]);

export const SOURCE_SUGGESTION_EVENT_TYPES = new Set([
  "source_suggested",
  "source_added",
  "source_removed",
  "alternate_proposed",
  "comment_added",
  "verified",
  "disputed",
  "rejected",
  "rolled_back",
]);

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/_/g, "-");
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function normalizeUrlIdentity(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      parsed.searchParams.delete(key);
    }
    if (parsed.hostname === "youtu.be") {
      return `youtube:${parsed.pathname.replace(/^\/+/, "")}`;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `youtube:${videoId}`;
    }
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizedHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLocaleLowerCase("en-US");
  } catch {
    return "";
  }
}

export function matchResearchProfile(url, profiles = []) {
  const sourceHost = normalizedHost(url);
  if (!sourceHost) return null;

  return profiles.find((profile) => {
    const profileHost = normalizedHost(profile?.baseUrl);
    return profileHost && (sourceHost === profileHost || sourceHost.endsWith(`.${profileHost}`));
  }) ?? null;
}

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

function buildSuggestionId(catalogId, url, index) {
  const identity = normalizeUrlIdentity(url) || String(url ?? "");
  const digest = createHash("sha256").update(`${catalogId}:${identity}`).digest("hex").slice(0, 12);
  return `ai-suggestion-${slugify(catalogId)}-${index + 1}-${digest}`;
}

function getGroundingSummary(groundingMetadata) {
  const webSearchQueries = Array.isArray(groundingMetadata?.webSearchQueries)
    ? groundingMetadata.webSearchQueries
    : [];
  const groundingChunks = Array.isArray(groundingMetadata?.groundingChunks)
    ? groundingMetadata.groundingChunks
    : [];
  return {
    webSearchQueryCount: webSearchQueries.length,
    webSearchQueries,
    groundingChunkCount: groundingChunks.length,
  };
}

export function normalizeGroundedSuggestion({
  catalogId,
  suggestion,
  index = 0,
  checkedAt = new Date().toISOString(),
  profiles = [],
  metadata = {},
  groundingMetadata = null,
  seenIdentities = null,
} = {}) {
  const validationErrors = [];
  const parsedUrl = safeHttpsUrl(suggestion?.url ?? suggestion?.httpsUrl);
  const identity = parsedUrl ? normalizeUrlIdentity(parsedUrl.toString()) : "";
  const profile = parsedUrl ? matchResearchProfile(parsedUrl.toString(), profiles) : null;
  const llmStatus = normalizeStatus(suggestion?.status ?? suggestion?.recommendedStatus);
  const forcedSuggestionStatus = ["accepted", "verified", "community-verified", "user-attached"].includes(llmStatus);
  let status = forcedSuggestionStatus ? "auto-suggested" : llmStatus;

  if (!GROUNDED_SUGGESTION_OUTPUT_STATUSES.has(status)) {
    status = "deferred";
  }
  if (!parsedUrl) {
    status = "rejected";
    validationErrors.push("url must be HTTPS");
  }
  if (identity && seenIdentities?.has(identity)) {
    status = "deferred";
    validationErrors.push("duplicate URL identity in this suggestion run");
  }
  if (identity && seenIdentities) {
    seenIdentities.add(identity);
  }
  if (!profile && status === "auto-suggested") {
    status = "deferred";
    validationErrors.push("no research source profile matched the URL host");
  }

  const metadataSignals = [
    ...(Array.isArray(metadata?.metadataSignals) ? metadata.metadataSignals : []),
    ...(Array.isArray(metadata?.signals) ? metadata.signals : []),
  ];
  const metadataTitle = metadata?.title ?? metadata?.schemaName ?? "";
  const profileId = profile?.id ?? "external";
  const sourceId = suggestion?.sourceId || suggestion?.id || buildSuggestionId(catalogId, parsedUrl?.toString() ?? "", index);

  return {
    type: "source-suggestion",
    policyVersion: "source-suggestion-v1",
    catalogId,
    sourceId,
    suggestionId: sourceId,
    url: parsedUrl?.toString() ?? String(suggestion?.url ?? suggestion?.httpsUrl ?? ""),
    normalizedIdentity: identity,
    status,
    title: String(suggestion?.title ?? metadataTitle ?? "").trim(),
    sourceProvider: String(suggestion?.sourceProvider ?? profile?.label ?? "").trim(),
    profileId,
    provider: profile?.provider ?? suggestion?.provider ?? "external",
    confidence: normalizeStatus(suggestion?.confidence || "low") || "low",
    reason: String(suggestion?.reason ?? "").trim(),
    conflicts: Array.isArray(suggestion?.conflicts) ? suggestion.conflicts.map(String) : [],
    validationErrors,
    checkedAt,
    weakLabelOnly: true,
    acceptedEligible: false,
    directAutoAttach: false,
    mediaDownload: false,
    evidence: {
      profileMatch: {
        verified: Boolean(profile),
        profileId,
      },
      metadataCheck: {
        checked: Object.keys(metadata ?? {}).length > 0,
        title: metadataTitle,
        description: metadata?.description ?? "",
        author: metadata?.author ?? metadata?.schemaComposer ?? metadata?.schemaByArtist ?? "",
        signals: metadataSignals,
        notes: metadata?.notes ?? "",
      },
      grounding: getGroundingSummary(groundingMetadata),
      policy: {
        acceptedEligible: false,
        directAutoAttach: false,
        mediaDownload: false,
        preview: "metadata-only until accepted-source validation passes",
      },
    },
  };
}

export function buildSourceSuggestionEvent(event = {}) {
  const eventType = String(event.eventType ?? "");
  if (!SOURCE_SUGGESTION_EVENT_TYPES.has(eventType)) {
    throw new Error(`Unsupported source suggestion eventType: ${eventType || "<missing>"}`);
  }

  return {
    eventId: event.eventId ?? `suggestion-event-${randomUUID().slice(0, 12)}`,
    catalogId: event.catalogId,
    sourceId: event.sourceId,
    eventType,
    reason: event.reason,
    note: event.note,
    createdAt: event.createdAt ?? new Date().toISOString(),
    createdBy: event.createdBy ?? "local-user",
    weakLabel: true,
    labelPolicy: "Feedback can influence ranking only with domain trust, metadata match and repeated user signal; it never promotes a source by itself.",
    previousValue: event.previousValue,
    nextValue: event.nextValue,
  };
}

export function validateSourceSuggestionManifest(manifest) {
  const errors = [];
  if (manifest?.version !== 1) errors.push("source-suggestions: version must be 1");
  if (manifest?.type !== "gemini-grounded-source-suggestions") {
    errors.push("source-suggestions: type must be gemini-grounded-source-suggestions");
  }
  if (!Array.isArray(manifest?.suggestions)) {
    errors.push("source-suggestions: suggestions must be an array");
  }

  for (const suggestion of manifest?.suggestions ?? []) {
    const prefix = `source-suggestions: ${suggestion?.suggestionId ?? suggestion?.sourceId ?? "<missing>"}`;
    if (!SOURCE_SUGGESTION_STATUSES.has(suggestion?.status)) {
      errors.push(`${prefix} has invalid status ${suggestion?.status}`);
    }
    if (suggestion?.status === "accepted") {
      errors.push(`${prefix} must not use accepted status`);
    }
    if (suggestion?.status !== "rejected" && !safeHttpsUrl(suggestion?.url)) {
      errors.push(`${prefix} url must be HTTPS`);
    }
    if (suggestion?.acceptedEligible !== false) {
      errors.push(`${prefix} acceptedEligible must be false`);
    }
    if (suggestion?.directAutoAttach !== false) {
      errors.push(`${prefix} directAutoAttach must be false`);
    }
    if (suggestion?.mediaDownload !== false) {
      errors.push(`${prefix} mediaDownload must be false`);
    }
    if (suggestion?.weakLabelOnly !== true) {
      errors.push(`${prefix} weakLabelOnly must be true`);
    }
  }

  for (const event of manifest?.events ?? []) {
    const prefix = `source-suggestion-events: ${event?.eventId ?? "<missing>"}`;
    if (!SOURCE_SUGGESTION_EVENT_TYPES.has(event?.eventType)) {
      errors.push(`${prefix} invalid eventType ${event?.eventType}`);
    }
    if (event?.weakLabel !== true) {
      errors.push(`${prefix} weakLabel must be true`);
    }
  }

  return {ok: errors.length === 0, errors};
}

export function summarizeSuggestionStatuses(suggestions) {
  const counts = new Map();
  for (const suggestion of suggestions) {
    counts.set(suggestion.status, (counts.get(suggestion.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({value, count}))
    .sort((left, right) => left.value.localeCompare(right.value, "en"));
}

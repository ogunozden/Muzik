import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {profileIdForSource, validateSourceCurationRegistries} from "./source-curation-validation.mjs";

const DEFAULT_MATCHER_VERSION = "external-source-map-v1";

export const CURATION_PATHS = {
  catalog: "src/data/symbtr/catalog.generated.json",
  autoAttached: "src/data/references/auto-attached-references.json",
  feedback: "src/data/references/source-feedback-events.json",
  manualCorrections: "src/data/references/manual-source-corrections.json",
  researchProfiles: "src/data/references/research-source-profiles.json",
  embedStates: "src/data/references/embed-states.json",
  qualityStats: "src/data/references/source-quality-stats.generated.json",
  mapping: "output/external-reference-coverage/mapped-external-reference-candidates.json",
  bulkCandidates: "src/data/references/external-reference-bulk-candidates.json",
};

function resolvePath(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, relativePath);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to access path outside project: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function readJson(root, relativePath, fallback) {
  const filePath = resolvePath(root, relativePath);
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(root, relativePath, value) {
  const filePath = resolvePath(root, relativePath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeConfidenceScore(score) {
  if (typeof score !== "number") return 0;
  return Math.max(0, Math.min(1, Math.round((score / 220) * 100) / 100));
}

function confidenceLevel(status, normalizedScore, conflicts) {
  if (conflicts.length > 0 || status === "needs-review") return "conflict";
  if (normalizedScore >= 0.75) return "high";
  if (normalizedScore >= 0.45) return "medium";
  return "low";
}

function buildSourceLookup(mappingData, bulkCandidateData) {
  const sources = new Map();

  for (const mapping of mappingData?.mappings ?? []) {
    const source = mapping?.candidate?.source;
    if (source?.id) sources.set(source.id, source);
  }

  for (const candidate of bulkCandidateData?.candidates ?? []) {
    const source = candidate?.source;
    if (source?.id) sources.set(source.id, source);
  }

  return sources;
}

function attachableMappings(mappingData) {
  return (mappingData?.mappings ?? [])
    .filter((mapping) => mapping.status === "accepted")
    .filter((mapping) => mapping.catalogId && mapping?.candidate?.source?.id);
}

function buildAutoAttachedReference(mapping, rank, profiles) {
  const source = mapping.candidate.source;
  const topAlternative = mapping.alternatives?.[0] ?? {};
  const conflicts = Array.isArray(topAlternative.mismatches) ? topAlternative.mismatches : [];
  const matchReasons = [
    ...(Array.isArray(topAlternative.reasons) ? topAlternative.reasons : []),
    `mapping:${mapping.status}`,
  ];
  const normalizedScore = normalizeConfidenceScore(mapping.confidenceScore);

  return {
    catalogId: mapping.catalogId,
    sourceId: source.id,
    profileId: profileIdForSource(source, profiles),
    status: "auto-attached",
    rank,
    confidenceScore: normalizedScore,
    confidenceLevel: confidenceLevel(mapping.status, normalizedScore, conflicts),
    matchReasons: [...new Set(matchReasons)],
    conflicts,
    attachedAt: today(),
    matcherVersion: DEFAULT_MATCHER_VERSION,
  };
}

function validateCurrent(root, registries) {
  const validation = validateSourceCurationRegistries({
    catalog: readJson(root, CURATION_PATHS.catalog, {entries: []}),
    autoAttached: registries.autoAttached,
    feedback: registries.feedback,
    manualCorrections: registries.manualCorrections,
    researchProfiles: registries.researchProfiles,
    embedStates: registries.embedStates,
    qualityStats: registries.qualityStats,
  });
  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }
  return validation;
}

export function readCurationRegistries(root = process.cwd()) {
  return {
    autoAttached: readJson(root, CURATION_PATHS.autoAttached, {version: 1, matcherVersion: "bootstrap", references: []}),
    feedback: readJson(root, CURATION_PATHS.feedback, {version: 1, events: []}),
    manualCorrections: readJson(root, CURATION_PATHS.manualCorrections, {version: 1, corrections: []}),
    researchProfiles: readJson(root, CURATION_PATHS.researchProfiles, {version: 1, profiles: []}),
    embedStates: readJson(root, CURATION_PATHS.embedStates, {version: 1, states: []}),
    qualityStats: readJson(root, CURATION_PATHS.qualityStats, {version: 1, generatedAt: null, stats: []}),
  };
}

export function getCurationState(root = process.cwd()) {
  const registries = readCurationRegistries(root);
  const mappingData = readJson(root, CURATION_PATHS.mapping, {mappings: []});
  const bulkCandidateData = readJson(root, CURATION_PATHS.bulkCandidates, {candidates: []});
  const sourceLookup = buildSourceLookup(mappingData, bulkCandidateData);
  const references = registries.autoAttached.references ?? [];
  const feedbackEvents = registries.feedback.events ?? [];
  const manualCorrections = registries.manualCorrections.corrections ?? [];
  const embedStates = registries.embedStates.states ?? [];

  return {
    summary: {
      autoAttachedCount: references.length,
      removedCount: references.filter((reference) => reference.status === "user-removed").length,
      deleteRequestedCount: references.filter((reference) => reference.status === "delete-requested").length,
      deletedCount: references.filter((reference) => reference.status === "deleted").length,
      feedbackEventCount: feedbackEvents.length,
      manualCorrectionCount: manualCorrections.length,
      researchSourceProfileCount: registries.researchProfiles.profiles?.length ?? 0,
      embedStateCount: embedStates.length,
    },
    autoAttachedReferences: references.map((reference) => ({
      ...reference,
      source: sourceLookup.get(reference.sourceId) ?? null,
      feedbackEvents: feedbackEvents.filter((event) => event.catalogId === reference.catalogId && event.sourceId === reference.sourceId),
      manualCorrection: manualCorrections.find((correction) => correction.catalogId === reference.catalogId && correction.sourceId === reference.sourceId) ?? null,
      embedState: embedStates.find((state) => state.sourceId === reference.sourceId) ?? null,
    })),
    feedbackEvents: feedbackEvents.slice(-160).reverse(),
    manualCorrections,
    researchSourceProfiles: registries.researchProfiles.profiles ?? [],
    embedStates,
    sourceQualityStats: registries.qualityStats.stats ?? [],
  };
}

export function generateAutoAttachedReferences({root = process.cwd(), write = false} = {}) {
  const registries = readCurationRegistries(root);
  const mappingData = readJson(root, CURATION_PATHS.mapping, {mappings: []});
  const profiles = registries.researchProfiles.profiles ?? [];
  const existingByKey = new Map(
    (registries.autoAttached.references ?? []).map((reference) => [`${reference.catalogId}:${reference.sourceId}`, reference]),
  );
  const perCatalogRank = new Map();
  const generated = [];

  for (const mapping of attachableMappings(mappingData)) {
    const currentRank = (perCatalogRank.get(mapping.catalogId) ?? 0) + 1;
    perCatalogRank.set(mapping.catalogId, currentRank);

    const nextReference = buildAutoAttachedReference(mapping, currentRank, profiles);
    const key = `${nextReference.catalogId}:${nextReference.sourceId}`;
    const existing = existingByKey.get(key);

    if (existing && existing.status !== "auto-attached") {
      generated.push(existing);
      continue;
    }

    const merged = existing ? {...existing, ...nextReference, status: existing.status} : nextReference;
    existingByKey.set(key, merged);
    generated.push(merged);
  }

  const generatedKeys = new Set(generated.map((item) => `${item.catalogId}:${item.sourceId}`));
  const prunedAutoAttachedCount = (registries.autoAttached.references ?? []).filter((reference) => (
    reference.status === "auto-attached" && !generatedKeys.has(`${reference.catalogId}:${reference.sourceId}`)
  )).length;
  const untouched = (registries.autoAttached.references ?? []).filter((reference) => {
    const key = `${reference.catalogId}:${reference.sourceId}`;
    if (generatedKeys.has(key)) return false;
    return reference.status !== "auto-attached";
  });
  const nextAutoAttached = {
    version: 1,
    matcherVersion: DEFAULT_MATCHER_VERSION,
    references: [...untouched, ...generated].sort(
      (left, right) => left.catalogId.localeCompare(right.catalogId, "en") || left.rank - right.rank || left.sourceId.localeCompare(right.sourceId, "en"),
    ),
  };
  const nextRegistries = {...registries, autoAttached: nextAutoAttached};
  const validation = validateCurrent(root, nextRegistries);

  if (write) {
    writeJson(root, CURATION_PATHS.autoAttached, nextAutoAttached);
  }

  return {
    ...validation.summary,
    wroteAutoAttached: write,
    generatedCount: generated.length,
    prunedAutoAttachedCount,
    outputReferenceCount: nextAutoAttached.references.length,
  };
}

function statusForEvent(eventType) {
  if (eventType === "restored") return "auto-attached";
  if (eventType === "user-corrected") return "user-corrected";
  if (eventType === "manual-entry") return "manual-entry";
  return eventType;
}

function buildFeedbackEvent(feedback) {
  if (!feedback || typeof feedback !== "object") {
    throw new Error("Feedback payload must be an object");
  }

  return {
    eventId: feedback.eventId ?? `event-${today()}-${randomUUID().slice(0, 8)}`,
    catalogId: feedback.catalogId,
    sourceId: feedback.sourceId,
    eventType: feedback.eventType,
    reason: feedback.reason,
    note: feedback.note,
    createdAt: feedback.createdAt ?? nowIso(),
    createdBy: feedback.createdBy ?? "local-user",
    previousValue: feedback.previousValue,
    nextValue: feedback.nextValue,
  };
}

export function recordSourceFeedbackBatch({root = process.cwd(), feedbackEvents}) {
  if (!Array.isArray(feedbackEvents) || feedbackEvents.length === 0) {
    throw new Error("feedbackEvents must be a non-empty array");
  }

  const registries = readCurationRegistries(root);
  const events = feedbackEvents.map(buildFeedbackEvent);
  const statusByReferenceKey = new Map(
    events.map((event) => [`${event.catalogId}:${event.sourceId}`, statusForEvent(event.eventType)]),
  );
  const nextFeedback = {
    version: 1,
    events: [...(registries.feedback.events ?? []), ...events],
  };
  const nextAutoAttached = {
    ...registries.autoAttached,
    references: (registries.autoAttached.references ?? []).map((reference) => {
      const nextStatus = statusByReferenceKey.get(`${reference.catalogId}:${reference.sourceId}`);
      return nextStatus ? {...reference, status: nextStatus} : reference;
    }),
  };
  const nextRegistries = {...registries, feedback: nextFeedback, autoAttached: nextAutoAttached};
  const validation = validateCurrent(root, nextRegistries);

  writeJson(root, CURATION_PATHS.feedback, nextFeedback);
  writeJson(root, CURATION_PATHS.autoAttached, nextAutoAttached);

  return {
    ...validation.summary,
    eventCount: events.length,
    events,
  };
}

export function recordSourceFeedback({root = process.cwd(), feedback}) {
  const result = recordSourceFeedbackBatch({root, feedbackEvents: [feedback]});

  return {
    ...result,
    event: result.events[0],
  };
}

export function upsertManualSourceCorrection({root = process.cwd(), correction}) {
  const registries = readCurationRegistries(root);
  const nextCorrection = {
    ...correction,
    updatedAt: correction.updatedAt ?? today(),
  };
  const existing = registries.manualCorrections.corrections ?? [];
  const nextManualCorrections = {
    version: 1,
    corrections: [
      ...existing.filter((item) => !(item.catalogId === nextCorrection.catalogId && item.sourceId === nextCorrection.sourceId)),
      nextCorrection,
    ],
  };
  const nextRegistries = {...registries, manualCorrections: nextManualCorrections};
  const validation = validateCurrent(root, nextRegistries);

  writeJson(root, CURATION_PATHS.manualCorrections, nextManualCorrections);

  return {
    ...validation.summary,
    correction: nextCorrection,
  };
}

export function upsertEmbedState({root = process.cwd(), embedState}) {
  const registries = readCurationRegistries(root);
  const nextEmbedState = {
    ...embedState,
    lastCheckedAt: embedState.lastCheckedAt ?? today(),
  };
  const existing = registries.embedStates.states ?? [];
  const nextEmbedStates = {
    version: 1,
    states: [
      ...existing.filter((item) => item.sourceId !== nextEmbedState.sourceId),
      nextEmbedState,
    ],
  };
  const nextRegistries = {...registries, embedStates: nextEmbedStates};
  const validation = validateCurrent(root, nextRegistries);

  writeJson(root, CURATION_PATHS.embedStates, nextEmbedStates);

  return {
    ...validation.summary,
    embedState: nextEmbedState,
  };
}

export function generateSourceQualityStats({root = process.cwd(), write = false} = {}) {
  const registries = readCurationRegistries(root);
  const profiles = registries.researchProfiles.profiles ?? [];
  const statsByProfile = new Map();
  const autoAttachedByKey = new Map(
    (registries.autoAttached.references ?? []).map((reference) => [`${reference.catalogId}:${reference.sourceId}`, reference]),
  );
  const autoAttachedBySourceId = new Map(
    (registries.autoAttached.references ?? []).map((reference) => [reference.sourceId, reference]),
  );

  function ensure(profileId) {
    if (!statsByProfile.has(profileId)) {
      statsByProfile.set(profileId, {
        profileId,
        acceptedCount: 0,
        removedCount: 0,
        deletedCount: 0,
        correctedCount: 0,
        mismatchCount: 0,
        embedSuccessCount: 0,
        embedFailureCount: 0,
      });
    }
    return statsByProfile.get(profileId);
  }

  for (const profile of profiles) ensure(profile.id);

  for (const reference of registries.autoAttached.references ?? []) {
    const stats = ensure(reference.profileId ?? profileIdForSource({id: reference.sourceId}, profiles));
    if (["auto-attached", "user-approved", "user-prioritized"].includes(reference.status)) stats.acceptedCount += 1;
    if (reference.confidenceLevel === "conflict" || reference.conflicts?.length > 0) stats.mismatchCount += 1;
  }

  for (const event of registries.feedback.events ?? []) {
    const reference = autoAttachedByKey.get(`${event.catalogId}:${event.sourceId}`);
    const stats = ensure(reference?.profileId ?? profileIdForSource({id: event.sourceId}, profiles));
    if (event.eventType === "user-removed") stats.removedCount += 1;
    if (event.eventType === "deleted") stats.deletedCount += 1;
    if (event.eventType === "user-corrected") stats.correctedCount += 1;
  }

  for (const state of registries.embedStates.states ?? []) {
    const reference = autoAttachedBySourceId.get(state.sourceId);
    const stats = ensure(reference?.profileId ?? profileIdForSource({id: state.sourceId}, profiles));
    if (state.canEmbed) stats.embedSuccessCount += 1;
    if (!state.canEmbed && state.lastFailureReason) stats.embedFailureCount += 1;
  }

  const nextQualityStats = {
    version: 1,
    generatedAt: nowIso(),
    stats: [...statsByProfile.values()].sort((left, right) => left.profileId.localeCompare(right.profileId, "en")),
  };
  const nextRegistries = {...registries, qualityStats: nextQualityStats};
  const validation = validateCurrent(root, nextRegistries);

  if (write) {
    writeJson(root, CURATION_PATHS.qualityStats, nextQualityStats);
  }

  return {
    ...validation.summary,
    wroteStats: write,
    stats: nextQualityStats.stats,
  };
}

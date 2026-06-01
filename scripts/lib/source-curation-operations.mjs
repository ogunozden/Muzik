import {profileIdForSource} from "./source-curation-validation.mjs";
import {
  CURATION_PATHS,
  readCurationRegistries,
  readJson,
  today,
  validateCurrent,
  writeJson,
} from "./source-curation-registry.mjs";

export {
  generateSourceQualityStats,
  recordSourceFeedback,
  recordSourceFeedbackBatch,
  upsertEmbedState,
  upsertManualSourceCorrection,
} from "./source-curation-events.mjs";

const DEFAULT_MATCHER_VERSION = "external-source-map-v1";

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

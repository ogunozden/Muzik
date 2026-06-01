import {
  CURATION_PATHS,
  readCurationRegistries,
  readJson,
} from "./source-curation-registry.mjs";

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

function referenceKey(value) {
  return `${value.catalogId}:${value.sourceId}`;
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
  const qualityStats = registries.qualityStats.stats ?? [];

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
      sourceQualityStatCount: qualityStats.length,
      statsGeneratedAt: registries.qualityStats.generatedAt ?? null,
      matcherVersion: registries.autoAttached.matcherVersion ?? null,
    },
    autoAttachedReferences: references.map((reference) => ({
      ...reference,
      source: sourceLookup.get(reference.sourceId) ?? null,
      feedbackEvents: feedbackEvents.filter((event) => referenceKey(event) === referenceKey(reference)),
      manualCorrection: manualCorrections.find((correction) => referenceKey(correction) === referenceKey(reference)) ?? null,
      embedState: embedStates.find((state) => state.sourceId === reference.sourceId) ?? null,
    })),
    feedbackEvents: feedbackEvents.slice(-160).reverse(),
    manualCorrections,
    researchSourceProfiles: registries.researchProfiles.profiles ?? [],
    embedStates,
    sourceQualityStats: qualityStats,
  };
}

export function summarizeCurationState(root = process.cwd()) {
  const state = getCurationState(root);

  return {
    ...state.summary,
    feedbackEvents: state.feedbackEvents.length,
    autoAttachedReferences: state.autoAttachedReferences.length,
    sourceQualityStats: state.sourceQualityStats.length,
  };
}

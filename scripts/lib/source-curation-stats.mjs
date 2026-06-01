import {profileIdForSource} from "./source-curation-validation.mjs";
import {
  CURATION_PATHS,
  nowIso,
  readCurationRegistries,
  validateCurrent,
  writeJson,
} from "./source-curation-registry.mjs";

function emptySourceQualityStat(profileId) {
  return {
    profileId,
    acceptedCount: 0,
    removedCount: 0,
    deletedCount: 0,
    correctedCount: 0,
    mismatchCount: 0,
    embedSuccessCount: 0,
    embedFailureCount: 0,
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
      statsByProfile.set(profileId, emptySourceQualityStat(profileId));
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

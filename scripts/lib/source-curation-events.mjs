import {randomUUID} from "node:crypto";
import {profileIdForSource} from "./source-curation-validation.mjs";
import {
  CURATION_PATHS,
  nowIso,
  readCurationRegistries,
  today,
  validateCurrent,
  writeJson,
} from "./source-curation-registry.mjs";

function statusForEvent(eventType) {
  if (eventType === "restored") return "auto-attached";
  if (eventType === "user-corrected") return "user-corrected";
  if (eventType === "manual-entry") return "manual-entry";
  return eventType;
}

export function buildFeedbackEvent(feedback) {
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

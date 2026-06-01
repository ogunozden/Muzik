import {randomUUID} from "node:crypto";
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

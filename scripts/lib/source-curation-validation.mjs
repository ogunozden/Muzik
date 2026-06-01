const KEBAB_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export const AUTO_ATTACHED_REFERENCE_STATUSES = new Set([
  "auto-attached",
  "user-approved",
  "user-prioritized",
  "user-demoted",
  "user-removed",
  "delete-requested",
  "deleted",
  "user-corrected",
  "manual-entry",
]);

export const SOURCE_FEEDBACK_EVENT_TYPES = new Set([
  "user-approved",
  "user-prioritized",
  "user-demoted",
  "user-removed",
  "delete-requested",
  "deleted",
  "restored",
  "user-corrected",
  "manual-entry",
]);

const CONFIDENCE_LEVELS = new Set(["high", "medium", "low", "conflict"]);
const CANDIDATE_REVIEW_CONFIDENCE_LEVELS = new Set(["high", "medium", "low", "conflict", "needs-context"]);
const CANDIDATE_REVIEW_STATUSES = new Set(["needs-review", "conflict"]);
const PROVIDERS = new Set(["score", "symbtr", "youtube", "archive", "github"]);
const EMBED_CAPABILITIES = new Set(["none", "iframe", "pdf", "youtube"]);
const EMBED_TYPES = new Set(["none", "iframe", "pdf", "youtube"]);
const METADATA_STRATEGIES = new Set(["none", "html-title", "og-title", "oembed", "site-specific"]);
const REQUIRED_BATCH_FLOW_STEPS = [
  "ingest",
  "normalize",
  "dedupe",
  "provider-profile-classify",
  "candidate-generate",
  "confidence-score",
  "status-assign",
  "safe-auto-attach-accepted-only",
  "validate",
  "coverage-report",
];
const REQUIRED_BATCH_VALIDATION_GATES = [
  "catalog-id",
  "accepted-identity-dedupe",
  "status-contract",
  "candidate-review-only",
  "profile-count-drift",
  "summary-count-drift",
  "metadata-strategy-profile-drift",
];

function hasCatalogId(catalogIds, catalogId) {
  return typeof catalogId === "string" && catalogIds.has(catalogId);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizedHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function profileIdForSource(source, profiles) {
  const sourceHost = normalizedHost(source?.url);
  const matchedByHost = profiles.find((profile) => {
    const profileHost = normalizedHost(profile.baseUrl);
    return profileHost && sourceHost && (sourceHost === profileHost || sourceHost.endsWith(`.${profileHost}`));
  });
  if (matchedByHost) return matchedByHost.id;

  const sourceId = source?.id ?? "";
  return profiles.find((profile) => sourceId === profile.id || sourceId.startsWith(`${profile.id}-`) || sourceId.includes(`-${profile.id}-`))?.id ?? "external";
}

function validateVersion(registryName, registry, errors) {
  if (registry?.version !== 1) {
    errors.push(`${registryName}: version must be 1`);
  }
}

function validateUnique(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${label}: duplicate ${value}`);
    }
    seen.add(value);
  }
}

function validateIsoDate(label, value, errors) {
  if (!ISO_DATE_PATTERN.test(value) && !ISO_DATE_TIME_PATTERN.test(value)) {
    errors.push(`${label} must be YYYY-MM-DD or ISO date-time`);
  }
}

function validateOptionalIsoDate(label, value, errors) {
  if (value === undefined || value === null || value === "") return;
  validateIsoDate(label, value, errors);
}

function registryReferenceKey(value) {
  return `${value?.catalogId ?? ""}:${value?.sourceId ?? ""}`;
}

function incrementCount(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function validateCoverageCount(summary, field, actual, errors) {
  const expected = summary?.[field];
  if (!Number.isInteger(expected) || expected < 0) {
    errors.push(`coverage-summary: ${field} must be a non-negative integer`);
  } else if (expected !== actual) {
    errors.push(`coverage-summary: ${field} ${expected} does not match candidate review queue rows ${actual}`);
  }
}

function validateCoverageBreakdown(summaryRows, label, actualCounts, errors) {
  if (!Array.isArray(summaryRows)) {
    errors.push(`coverage-summary: ${label} must be an array`);
    return;
  }

  for (const row of summaryRows) {
    const value = row?.value;
    const count = row?.count;
    if (!isNonEmptyString(value) || !Number.isInteger(count) || count < 0) {
      errors.push(`coverage-summary: ${label} rows must have value and non-negative count`);
      continue;
    }
    const actual = actualCounts.get(value) ?? 0;
    if (actual !== count) {
      errors.push(`coverage-summary: ${label} ${value} count ${count} does not match candidate review queue rows ${actual}`);
    }
  }
}

function getCountFromSummaryRows(summaryRows, value) {
  if (!Array.isArray(summaryRows)) return null;
  const row = summaryRows.find((item) => item?.value === value);
  return Number.isInteger(row?.count) ? row.count : 0;
}

function validateRequiredStrings(values, requiredValues, label, errors) {
  if (!Array.isArray(values) || values.some((value) => !isNonEmptyString(value))) {
    errors.push(`coverage-summary: ${label} must be a non-empty string array`);
    return;
  }

  for (const requiredValue of requiredValues) {
    if (!values.includes(requiredValue)) {
      errors.push(`coverage-summary: ${label} must include ${requiredValue}`);
    }
  }
}

function validateBatchReport(summary, actualCandidateReviewCount, enabledProfileCount, errors) {
  const report = summary?.batchReport;
  if (report === undefined) return;
  if (!report || typeof report !== "object") {
    errors.push("coverage-summary: batchReport must be an object");
    return;
  }

  const integerFields = [
    "processedCatalogEntries",
    "curatedBeforeBulkCandidates",
    "newlyAcceptedCatalogEntries",
    "curatedAfterBatch",
    "missingAfterBatch",
    "deferredMissingEntries",
    "nextBatchSize",
    "generatedReviewCandidates",
  ];
  for (const field of integerFields) {
    if (!Number.isInteger(report[field]) || report[field] < 0) {
      errors.push(`coverage-summary: batchReport.${field} must be a non-negative integer`);
    }
  }

  if (report.processedCatalogEntries !== summary?.totalCatalogEntries) {
    errors.push("coverage-summary: batchReport.processedCatalogEntries must match totalCatalogEntries");
  }
  if (report.curatedAfterBatch !== summary?.curatedReferenceEntries) {
    errors.push("coverage-summary: batchReport.curatedAfterBatch must match curatedReferenceEntries");
  }
  if (report.missingAfterBatch !== summary?.missingCuratedEntries) {
    errors.push("coverage-summary: batchReport.missingAfterBatch must match missingCuratedEntries");
  }
  if (report.deferredMissingEntries !== summary?.deferredMissingEntries) {
    errors.push("coverage-summary: batchReport.deferredMissingEntries must match deferredMissingEntries");
  }
  if (report.nextBatchSize !== summary?.nextBatchSize) {
    errors.push("coverage-summary: batchReport.nextBatchSize must match nextBatchSize");
  }
  if (report.generatedReviewCandidates !== actualCandidateReviewCount) {
    errors.push("coverage-summary: batchReport.generatedReviewCandidates must match candidate review queue rows");
  }
  if (report.generatedReviewCandidates !== report.missingAfterBatch * enabledProfileCount) {
    errors.push("coverage-summary: batchReport.generatedReviewCandidates must equal missingAfterBatch times enabled profile count");
  }
  if (report.newlyAcceptedCatalogEntries > summary?.acceptedBulkCandidateEntries) {
    errors.push("coverage-summary: batchReport.newlyAcceptedCatalogEntries cannot exceed acceptedBulkCandidateEntries");
  }

  const reviewOnlyCount =
    getCountFromSummaryRows(report.candidateReviewStatusCounts, "needs-review") +
    getCountFromSummaryRows(report.candidateReviewStatusCounts, "conflict");
  if (reviewOnlyCount !== report.generatedReviewCandidates) {
    errors.push("coverage-summary: batchReport candidateReviewStatusCounts must contain only review-only rows");
  }
  if (!Array.isArray(report.validationGates) || report.validationGates.length === 0) {
    errors.push("coverage-summary: batchReport.validationGates must list validation gates");
  }

  validateRequiredStrings(report.flow, REQUIRED_BATCH_FLOW_STEPS, "batchReport.flow", errors);
  validateRequiredStrings(report.validationGates, REQUIRED_BATCH_VALIDATION_GATES, "batchReport.validationGates", errors);
  if (report.autoAttachPolicy !== "only accepted bulk candidates are counted as curated and eligible for auto-attach") {
    errors.push("coverage-summary: batchReport.autoAttachPolicy must document accepted-only auto-attach");
  }
  if (report.duplicateAcceptedIdentityPolicy !== "duplicate accepted URL identities fail validation before merge") {
    errors.push("coverage-summary: batchReport.duplicateAcceptedIdentityPolicy must document duplicate accepted URL protection");
  }
}

export function validateSourceCurationRegistries({
  catalog,
  autoAttached,
  feedback,
  manualCorrections,
  researchProfiles,
  embedStates,
  qualityStats,
  sources,
  candidateReviewQueue,
  coverageSummary,
}) {
  const errors = [];
  const catalogEntries = Array.isArray(catalog) ? catalog : Array.isArray(catalog?.entries) ? catalog.entries : [];
  const catalogIds = new Set(catalogEntries.map((entry) => entry.id));
  const autoAttachedReferences = Array.isArray(autoAttached?.references) ? autoAttached.references : [];
  const autoAttachedReferenceKeys = new Set(autoAttachedReferences.map(registryReferenceKey));
  const autoAttachedSourceIds = new Set(autoAttachedReferences.map((reference) => reference.sourceId));
  const researchProfileEntries = Array.isArray(researchProfiles?.profiles) ? researchProfiles.profiles : [];
  const researchProfileIds = new Set(
    researchProfileEntries.map((profile) => profile.id).filter((profileId) => KEBAB_ID_PATTERN.test(profileId ?? "")),
  );
  const enabledResearchProfileIds = new Set(
    researchProfileEntries
      .filter((profile) => profile.enabled !== false)
      .map((profile) => profile.id)
      .filter((profileId) => KEBAB_ID_PATTERN.test(profileId ?? "")),
  );
  const researchProfileById = new Map(researchProfileEntries.map((profile) => [profile.id, profile]));
  const allowedSourceProfileIds = new Set([...researchProfileIds, "external"]);
  const sourceById = new Map(
    Array.isArray(sources)
      ? sources.filter((source) => typeof source?.id === "string").map((source) => [source.id, source])
      : [],
  );

  validateVersion("auto-attached-references", autoAttached, errors);
  validateVersion("source-feedback-events", feedback, errors);
  validateVersion("manual-source-corrections", manualCorrections, errors);
  validateVersion("research-source-profiles", researchProfiles, errors);
  validateVersion("embed-states", embedStates, errors);
  validateVersion("source-quality-stats", qualityStats, errors);

  if (!Array.isArray(autoAttached?.references)) {
    errors.push("auto-attached-references: references must be an array");
  } else {
    validateUnique(
      autoAttached.references.map((reference) => `${reference.catalogId}:${reference.sourceId}`),
      "auto-attached-references",
      errors,
    );

    for (const reference of autoAttached.references) {
      if (!hasCatalogId(catalogIds, reference.catalogId)) {
        errors.push(`auto-attached-references: unknown catalogId ${reference.catalogId}`);
      }
      if (!KEBAB_ID_PATTERN.test(reference.sourceId ?? "")) {
        errors.push(`auto-attached-references: invalid sourceId ${reference.sourceId}`);
      }
      if (!KEBAB_ID_PATTERN.test(reference.profileId ?? "")) {
        errors.push(`auto-attached-references: ${reference.sourceId} profileId is required`);
      } else if (!allowedSourceProfileIds.has(reference.profileId)) {
        errors.push(`auto-attached-references: ${reference.sourceId} profileId ${reference.profileId} is not a research profile id`);
      } else if (sourceById.size > 0) {
        const source = sourceById.get(reference.sourceId);
        if (!source) {
          errors.push(`auto-attached-references: ${reference.sourceId} source metadata is missing`);
        } else {
          const expectedProfileId = profileIdForSource(source, researchProfiles?.profiles ?? []);
          if (reference.profileId !== expectedProfileId) {
            errors.push(`auto-attached-references: ${reference.sourceId} profileId ${reference.profileId} does not match source profile ${expectedProfileId}`);
          }
        }
      }
      if (!AUTO_ATTACHED_REFERENCE_STATUSES.has(reference.status)) {
        errors.push(`auto-attached-references: invalid status ${reference.status}`);
      }
      if (!Number.isInteger(reference.rank) || reference.rank < 1) {
        errors.push(`auto-attached-references: ${reference.sourceId} rank must be a positive integer`);
      }
      if (typeof reference.confidenceScore !== "number" || reference.confidenceScore < 0 || reference.confidenceScore > 1) {
        errors.push(`auto-attached-references: ${reference.sourceId} confidenceScore must be between 0 and 1`);
      }
      if (!CONFIDENCE_LEVELS.has(reference.confidenceLevel)) {
        errors.push(`auto-attached-references: ${reference.sourceId} has invalid confidenceLevel`);
      }
      if (!Array.isArray(reference.matchReasons) || !Array.isArray(reference.conflicts)) {
        errors.push(`auto-attached-references: ${reference.sourceId} matchReasons/conflicts must be arrays`);
      }
      if (!isNonEmptyString(reference.matcherVersion)) {
        errors.push(`auto-attached-references: ${reference.sourceId} matcherVersion is required`);
      }
      validateIsoDate(`auto-attached-references: ${reference.sourceId} attachedAt`, reference.attachedAt ?? "", errors);
    }
  }

  if (!Array.isArray(feedback?.events)) {
    errors.push("source-feedback-events: events must be an array");
  } else {
    validateUnique(feedback.events.map((event) => event.eventId), "source-feedback-events", errors);

    for (const event of feedback.events) {
      if (!KEBAB_ID_PATTERN.test(event.eventId ?? "")) {
        errors.push(`source-feedback-events: invalid eventId ${event.eventId}`);
      }
      if (!hasCatalogId(catalogIds, event.catalogId)) {
        errors.push(`source-feedback-events: unknown catalogId ${event.catalogId}`);
      }
      if (!KEBAB_ID_PATTERN.test(event.sourceId ?? "")) {
        errors.push(`source-feedback-events: invalid sourceId ${event.sourceId}`);
      }
      if (!SOURCE_FEEDBACK_EVENT_TYPES.has(event.eventType)) {
        errors.push(`source-feedback-events: invalid eventType ${event.eventType}`);
      }
      if (!autoAttachedReferenceKeys.has(registryReferenceKey(event))) {
        errors.push(`source-feedback-events: ${event.eventId} does not reference an auto-attached source`);
      }
      if (!isNonEmptyString(event.createdBy)) {
        errors.push(`source-feedback-events: ${event.eventId} createdBy is required`);
      }
      validateIsoDate(`source-feedback-events: ${event.eventId} createdAt`, event.createdAt ?? "", errors);
    }
  }

  if (!Array.isArray(manualCorrections?.corrections)) {
    errors.push("manual-source-corrections: corrections must be an array");
  } else {
    validateUnique(
      manualCorrections.corrections.map((correction) => `${correction.catalogId}:${correction.sourceId}`),
      "manual-source-corrections",
      errors,
    );

    for (const correction of manualCorrections.corrections) {
      if (!hasCatalogId(catalogIds, correction.catalogId)) {
        errors.push(`manual-source-corrections: unknown catalogId ${correction.catalogId}`);
      }
      if (!KEBAB_ID_PATTERN.test(correction.sourceId ?? "")) {
        errors.push(`manual-source-corrections: invalid sourceId ${correction.sourceId}`);
      }
      if (!autoAttachedReferenceKeys.has(registryReferenceKey(correction))) {
        errors.push(`manual-source-corrections: ${correction.sourceId} does not reference an auto-attached source`);
      }
      if (correction.alternativeUrl && !isHttpUrl(correction.alternativeUrl)) {
        errors.push(`manual-source-corrections: ${correction.sourceId} alternativeUrl must be HTTPS`);
      }
      if (correction.tags !== undefined && !Array.isArray(correction.tags)) {
        errors.push(`manual-source-corrections: ${correction.sourceId} tags must be an array`);
      }
      validateIsoDate(`manual-source-corrections: ${correction.sourceId} updatedAt`, correction.updatedAt ?? "", errors);
    }
  }

  if (!Array.isArray(researchProfiles?.profiles)) {
    errors.push("research-source-profiles: profiles must be an array");
  } else {
    validateUnique(researchProfiles.profiles.map((profile) => profile.id), "research-source-profiles", errors);

    for (const profile of researchProfiles.profiles) {
      if (!KEBAB_ID_PATTERN.test(profile.id ?? "")) {
        errors.push(`research-source-profiles: invalid id ${profile.id}`);
      }
      if (!isNonEmptyString(profile.label)) {
        errors.push(`research-source-profiles: ${profile.id} label is required`);
      }
      if (!isHttpUrl(profile.baseUrl)) {
        errors.push(`research-source-profiles: ${profile.id} baseUrl must be HTTPS`);
      }
      if (!isHttpUrl(profile.searchUrlTemplate?.replace("{query}", "test")) || !profile.searchUrlTemplate?.includes("{query}")) {
        errors.push(`research-source-profiles: ${profile.id} searchUrlTemplate must be HTTPS and include {query}`);
      }
      if (!PROVIDERS.has(profile.provider)) {
        errors.push(`research-source-profiles: ${profile.id} provider is invalid`);
      }
      if (typeof profile.trustWeight !== "number" || profile.trustWeight < 0 || profile.trustWeight > 1) {
        errors.push(`research-source-profiles: ${profile.id} trustWeight must be between 0 and 1`);
      }
      if (!EMBED_CAPABILITIES.has(profile.embedCapability)) {
        errors.push(`research-source-profiles: ${profile.id} embedCapability is invalid`);
      }
      if (!METADATA_STRATEGIES.has(profile.metadataStrategy)) {
        errors.push(`research-source-profiles: ${profile.id} metadataStrategy is invalid`);
      }
      if (typeof profile.enabled !== "boolean") {
        errors.push(`research-source-profiles: ${profile.id} enabled must be boolean`);
      }
    }
  }

  if (!Array.isArray(embedStates?.states)) {
    errors.push("embed-states: states must be an array");
  } else {
    validateUnique(embedStates.states.map((state) => state.sourceId), "embed-states", errors);

    for (const state of embedStates.states) {
      if (!KEBAB_ID_PATTERN.test(state.sourceId ?? "")) {
        errors.push(`embed-states: invalid sourceId ${state.sourceId}`);
      }
      if (!autoAttachedSourceIds.has(state.sourceId)) {
        errors.push(`embed-states: ${state.sourceId} does not reference an auto-attached source`);
      }
      if (!EMBED_TYPES.has(state.embedType)) {
        errors.push(`embed-states: ${state.sourceId} embedType is invalid`);
      }
      if (typeof state.canEmbed !== "boolean") {
        errors.push(`embed-states: ${state.sourceId} canEmbed must be boolean`);
      }
      if (state.fallbackUrl && !isHttpUrl(state.fallbackUrl)) {
        errors.push(`embed-states: ${state.sourceId} fallbackUrl must be HTTPS`);
      }
      validateOptionalIsoDate(`embed-states: ${state.sourceId} lastCheckedAt`, state.lastCheckedAt, errors);
    }
  }

  if (!Array.isArray(qualityStats?.stats)) {
    errors.push("source-quality-stats: stats must be an array");
  } else {
    validateUnique(qualityStats.stats.map((stat) => stat.profileId), "source-quality-stats", errors);

    for (const stat of qualityStats.stats) {
      if (!KEBAB_ID_PATTERN.test(stat.profileId ?? "")) {
        errors.push(`source-quality-stats: invalid profileId ${stat.profileId}`);
      }
      if (!allowedSourceProfileIds.has(stat.profileId)) {
        errors.push(`source-quality-stats: ${stat.profileId} is not a research profile id`);
      }
      for (const field of ["acceptedCount", "removedCount", "deletedCount", "correctedCount", "mismatchCount", "embedSuccessCount", "embedFailureCount"]) {
        if (!Number.isInteger(stat[field]) || stat[field] < 0) {
          errors.push(`source-quality-stats: ${stat.profileId} ${field} must be a non-negative integer`);
        }
      }
    }

    if (qualityStats.generatedAt) {
      const qualityStatProfileIds = new Set(qualityStats.stats.map((stat) => stat.profileId));
      for (const profileId of researchProfileIds) {
        if (!qualityStatProfileIds.has(profileId)) {
          errors.push(`source-quality-stats: missing stat row for research profile ${profileId}`);
        }
      }
    }
  }

  if (candidateReviewQueue !== undefined) {
    if (!Array.isArray(candidateReviewQueue)) {
      errors.push("candidate-review-queue: rows must be an array");
    } else {
      validateUnique(candidateReviewQueue.map((row) => row.candidateId), "candidate-review-queue", errors);

      const candidateReviewStatusCounts = new Map();
      const candidateReviewProfileCounts = new Map();

      for (const row of candidateReviewQueue) {
        const candidateLabel = row?.candidateId ?? "<missing-candidate-id>";
        incrementCount(candidateReviewStatusCounts, row?.status);
        incrementCount(candidateReviewProfileCounts, row?.profileId);

        if (!isNonEmptyString(row?.candidateId)) {
          errors.push("candidate-review-queue: candidateId is required");
        } else if (row.candidateId !== `${row.catalogId}:${row.profileId}:search`) {
          errors.push(`candidate-review-queue: ${candidateLabel} candidateId must match catalogId:profileId:search`);
        }
        if (!hasCatalogId(catalogIds, row?.catalogId)) {
          errors.push(`candidate-review-queue: ${candidateLabel} unknown catalogId ${row?.catalogId}`);
        }
        if (!CANDIDATE_REVIEW_STATUSES.has(row?.status)) {
          errors.push(`candidate-review-queue: ${candidateLabel} invalid status ${row?.status}`);
        }
        if (row?.status === "conflict" && !isNonEmptyString(row.statusReason)) {
          errors.push(`candidate-review-queue: ${candidateLabel} conflict rows require statusReason`);
        }
        if (row?.sourceId !== undefined || row?.sourceUrl !== undefined || row?.url !== undefined) {
          errors.push(`candidate-review-queue: ${candidateLabel} must not carry accepted source ids or source URLs`);
        }
        if (!researchProfileIds.has(row?.profileId)) {
          errors.push(`candidate-review-queue: ${candidateLabel} profileId ${row?.profileId} is not a research profile id`);
        } else {
          const profile = researchProfileById.get(row.profileId);
          if (profile?.provider !== row.provider) {
            errors.push(`candidate-review-queue: ${candidateLabel} provider ${row.provider} does not match profile ${row.profileId}`);
          }
          if (profile?.trustWeight !== row.trustWeight) {
            errors.push(`candidate-review-queue: ${candidateLabel} trustWeight ${row.trustWeight} does not match profile ${row.profileId}`);
          }
          if ((profile?.metadataStrategy ?? "none") !== row.metadataStrategy) {
            errors.push(`candidate-review-queue: ${candidateLabel} metadataStrategy ${row.metadataStrategy} does not match profile ${row.profileId}`);
          }
        }
        if (typeof row?.reviewConfidenceScore !== "number" || row.reviewConfidenceScore < 0 || row.reviewConfidenceScore > 100) {
          errors.push(`candidate-review-queue: ${candidateLabel} reviewConfidenceScore must be between 0 and 100`);
        }
        if (!CANDIDATE_REVIEW_CONFIDENCE_LEVELS.has(row?.reviewConfidenceLevel)) {
          errors.push(`candidate-review-queue: ${candidateLabel} has invalid reviewConfidenceLevel`);
        }
        if (!Array.isArray(row?.scoreReasons) || row.scoreReasons.length === 0 || row.scoreReasons.some((reason) => !isNonEmptyString(reason))) {
          errors.push(`candidate-review-queue: ${candidateLabel} scoreReasons must list scoring evidence`);
        }
        if (row?.metadataStrategy && row.metadataStrategy !== "none" && !row.scoreReasons?.includes(`metadata-strategy:${row.metadataStrategy}`)) {
          errors.push(`candidate-review-queue: ${candidateLabel} scoreReasons must include metadata strategy evidence`);
        }
        const requiredQueryFields = [];
        if (isNonEmptyString(row?.makam) && row.makam !== "-") requiredQueryFields.push("makam");
        if (isNonEmptyString(row?.form) && row.form !== "-") requiredQueryFields.push("form");
        if (isNonEmptyString(row?.usul) && row.usul !== "-") requiredQueryFields.push("usul");
        if (isNonEmptyString(row?.title) && row.title !== "-") requiredQueryFields.push("title");
        if (isNonEmptyString(row?.composer) && row.composer !== "-") requiredQueryFields.push("composer");
        if (!Array.isArray(row?.queryFields) || !requiredQueryFields.every((field) => row.queryFields.includes(field))) {
          errors.push(`candidate-review-queue: ${candidateLabel} queryFields must include every available catalog query field`);
        }
        if (!isNonEmptyString(row?.searchQuery)) {
          errors.push(`candidate-review-queue: ${candidateLabel} searchQuery is required`);
        }
        if (!isHttpUrl(row?.searchUrl)) {
          errors.push(`candidate-review-queue: ${candidateLabel} searchUrl must be HTTPS`);
        }
      }

      if (coverageSummary !== undefined) {
        validateCoverageCount(coverageSummary, "candidateReviewQueueEntries", candidateReviewQueue.length, errors);
        validateCoverageBreakdown(coverageSummary.candidateReviewQueueByStatus, "candidateReviewQueueByStatus", candidateReviewStatusCounts, errors);
        validateCoverageBreakdown(coverageSummary.candidateReviewQueueByProfile, "candidateReviewQueueByProfile", candidateReviewProfileCounts, errors);

        const missingCuratedEntries = coverageSummary?.missingCuratedEntries;
        if (!Number.isInteger(missingCuratedEntries) || missingCuratedEntries < 0) {
          errors.push("coverage-summary: missingCuratedEntries must be a non-negative integer");
        } else {
          for (const profileId of enabledResearchProfileIds) {
            const profileCount = candidateReviewProfileCounts.get(profileId) ?? 0;
            if (profileCount !== missingCuratedEntries) {
              errors.push(`candidate-review-queue: profile ${profileId} has ${profileCount} rows, expected ${missingCuratedEntries}`);
            }
          }
        }

        validateBatchReport(
          coverageSummary,
          candidateReviewQueue.length,
          enabledResearchProfileIds.size,
          errors,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      catalogEntries: catalogIds.size,
      autoAttachedReferences: autoAttached?.references?.length ?? 0,
      feedbackEvents: feedback?.events?.length ?? 0,
      manualCorrections: manualCorrections?.corrections?.length ?? 0,
      researchSourceProfiles: researchProfiles?.profiles?.length ?? 0,
      embedStates: embedStates?.states?.length ?? 0,
      sourceQualityStats: qualityStats?.stats?.length ?? 0,
      candidateReviewQueueEntries: Array.isArray(candidateReviewQueue) ? candidateReviewQueue.length : 0,
    },
  };
}

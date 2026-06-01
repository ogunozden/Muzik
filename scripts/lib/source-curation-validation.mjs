import {getCandidateReviewGroupFingerprint} from "../../src/data/references/candidate-review-group-fingerprint.mjs";

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
const CANDIDATE_REVIEW_GROUP_STATUSES = new Set(["needs-review", "conflict", "rejected", "deferred"]);
const CANDIDATE_REVIEW_GROUP_DECISION_STATUSES = new Set(["rejected", "conflict", "deferred"]);
const CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_TYPE = "candidate-review-group-decision-recommendations";
const CANDIDATE_REVIEW_BATCH_PLAN_TYPE = "candidate-review-batch-plan";
const COVERAGE_MATRIX_TYPE = "external-reference-coverage-matrix";
const DEDUPE_REPORT_TYPE = "external-reference-dedupe-report";
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
  "candidate-review-group-drift",
  "candidate-review-group-decision-drift",
  "candidate-review-group-decision-recommendation-drift",
  "candidate-review-batch-plan-drift",
  "coverage-matrix-drift",
  "dedupe-report-drift",
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

function hasSourceIdentityKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasSourceIdentityKey);
  return Object.entries(value).some(([key, child]) => (
    key === "sourceId" ||
    key === "sourceUrl" ||
    key === "url" ||
    hasSourceIdentityKey(child)
  ));
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

function validateBatchReport(summary, actualCandidateReviewCount, actualCandidateReviewGroupCount, enabledProfileCount, errors) {
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
    "generatedReviewGroups",
    "recommendedReviewGroupDecisions",
    "plannedReviewPackets",
    "plannedReviewGroups",
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
  if (report.generatedReviewGroups !== actualCandidateReviewGroupCount) {
    errors.push("coverage-summary: batchReport.generatedReviewGroups must match candidate review group rows");
  }
  if (report.generatedReviewCandidates !== report.missingAfterBatch * enabledProfileCount) {
    errors.push("coverage-summary: batchReport.generatedReviewCandidates must equal missingAfterBatch times enabled profile count");
  }
  if (report.generatedReviewGroups !== report.missingAfterBatch) {
    errors.push("coverage-summary: batchReport.generatedReviewGroups must equal missingAfterBatch");
  }
  if (report.recommendedReviewGroupDecisions !== summary?.candidateReviewGroupDecisionRecommendationEntries) {
    errors.push("coverage-summary: batchReport.recommendedReviewGroupDecisions must match candidateReviewGroupDecisionRecommendationEntries");
  }
  if (report.plannedReviewPackets !== summary?.candidateReviewBatchPlanEntries) {
    errors.push("coverage-summary: batchReport.plannedReviewPackets must match candidateReviewBatchPlanEntries");
  }
  if (report.plannedReviewGroups > report.generatedReviewGroups) {
    errors.push("coverage-summary: batchReport.plannedReviewGroups cannot exceed generatedReviewGroups");
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

function validateCoverageMatrixTotals({
  coverageMatrix,
  coverageSummary,
  actualCandidateReviewCount,
  actualCandidateReviewGroupCount,
  enabledProfileCount,
  errors,
}) {
  if (coverageMatrix === undefined) return;
  if (!coverageMatrix || typeof coverageMatrix !== "object") {
    errors.push("coverage-matrix: artifact must be an object");
    return;
  }

  if (coverageMatrix.version !== 1) {
    errors.push("coverage-matrix: version must be 1");
  }
  if (coverageMatrix.type !== COVERAGE_MATRIX_TYPE) {
    errors.push(`coverage-matrix: type must be ${COVERAGE_MATRIX_TYPE}`);
  }

  const summary = coverageMatrix.summary ?? {};
  const expectedTotals = {
    totalCatalogEntries: coverageSummary?.totalCatalogEntries,
    curatedReferenceEntries: coverageSummary?.curatedReferenceEntries,
    missingCuratedEntries: coverageSummary?.missingCuratedEntries,
    candidateReviewQueueEntries: actualCandidateReviewCount,
    candidateReviewGroupEntries: actualCandidateReviewGroupCount,
    researchSourceProfileEntries: enabledProfileCount,
  };
  for (const [field, expected] of Object.entries(expectedTotals)) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      errors.push(`coverage-matrix: summary.${field} must be a non-negative integer`);
    } else if (summary[field] !== expected) {
      errors.push(`coverage-matrix: summary.${field} ${summary[field]} does not match ${expected}`);
    }
  }

  const catalogDimensions = coverageMatrix.catalogDimensions ?? {};
  for (const dimension of ["makam", "form", "usul", "priorityGroup"]) {
    const rows = catalogDimensions[dimension];
    if (!Array.isArray(rows) || rows.length === 0) {
      errors.push(`coverage-matrix: catalogDimensions.${dimension} must be a non-empty array`);
      continue;
    }

    const totals = rows.reduce((accumulator, row) => {
      for (const field of [
        "totalCatalogEntries",
        "curatedReferenceEntries",
        "missingCuratedEntries",
        "activeMissingEntries",
        "deferredMissingEntries",
      ]) {
        if (!Number.isInteger(row?.[field]) || row[field] < 0) {
          errors.push(`coverage-matrix: catalogDimensions.${dimension} rows must have non-negative ${field}`);
        }
        accumulator[field] += Number(row?.[field] ?? 0);
      }
      if (!isNonEmptyString(row?.value)) {
        errors.push(`coverage-matrix: catalogDimensions.${dimension} rows must have value`);
      }
      if ((row?.curatedReferenceEntries ?? 0) + (row?.missingCuratedEntries ?? 0) !== row?.totalCatalogEntries) {
        errors.push(`coverage-matrix: catalogDimensions.${dimension} ${row?.value ?? "<missing>"} curated plus missing must equal total`);
      }
      if ((row?.activeMissingEntries ?? 0) + (row?.deferredMissingEntries ?? 0) !== row?.missingCuratedEntries) {
        errors.push(`coverage-matrix: catalogDimensions.${dimension} ${row?.value ?? "<missing>"} active plus deferred must equal missing`);
      }
      return accumulator;
    }, {
      totalCatalogEntries: 0,
      curatedReferenceEntries: 0,
      missingCuratedEntries: 0,
      activeMissingEntries: 0,
      deferredMissingEntries: 0,
    });

    if (totals.totalCatalogEntries !== coverageSummary?.totalCatalogEntries) {
      errors.push(`coverage-matrix: catalogDimensions.${dimension} totalCatalogEntries drift`);
    }
    if (totals.curatedReferenceEntries !== coverageSummary?.curatedReferenceEntries) {
      errors.push(`coverage-matrix: catalogDimensions.${dimension} curatedReferenceEntries drift`);
    }
    if (totals.missingCuratedEntries !== coverageSummary?.missingCuratedEntries) {
      errors.push(`coverage-matrix: catalogDimensions.${dimension} missingCuratedEntries drift`);
    }
    if (totals.deferredMissingEntries !== coverageSummary?.deferredMissingEntries) {
      errors.push(`coverage-matrix: catalogDimensions.${dimension} deferredMissingEntries drift`);
    }
  }

  const candidateDimensions = coverageMatrix.candidateDimensions ?? {};
  for (const dimension of ["profileId", "provider", "status", "confidenceLevel"]) {
    const rows = candidateDimensions[dimension];
    if (!Array.isArray(rows) || rows.length === 0) {
      errors.push(`coverage-matrix: candidateDimensions.${dimension} must be a non-empty array`);
      continue;
    }

    const totalCandidates = rows.reduce((total, row) => {
      if (!isNonEmptyString(row?.value)) {
        errors.push(`coverage-matrix: candidateDimensions.${dimension} rows must have value`);
      }
      if (!Number.isInteger(row?.candidateReviewQueueEntries) || row.candidateReviewQueueEntries < 0) {
        errors.push(`coverage-matrix: candidateDimensions.${dimension} rows must have non-negative candidateReviewQueueEntries`);
      }
      if (!Number.isInteger(row?.affectedCatalogEntries) || row.affectedCatalogEntries < 0) {
        errors.push(`coverage-matrix: candidateDimensions.${dimension} rows must have non-negative affectedCatalogEntries`);
      }
      if ((row?.needsReviewEntries ?? 0) + (row?.conflictEntries ?? 0) !== row?.candidateReviewQueueEntries) {
        errors.push(`coverage-matrix: candidateDimensions.${dimension} ${row?.value ?? "<missing>"} needs-review plus conflict must equal candidates`);
      }
      return total + Number(row?.candidateReviewQueueEntries ?? 0);
    }, 0);

    if (totalCandidates !== actualCandidateReviewCount) {
      errors.push(`coverage-matrix: candidateDimensions.${dimension} candidateReviewQueueEntries drift`);
    }
  }
}

function getDuplicateRowCount(rows, getKey) {
  const counts = new Map();
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.values()).reduce((total, count) => total + Math.max(0, count - 1), 0);
}

function normalizeReferenceIdentity(source) {
  try {
    const parsedUrl = new URL(source?.url ?? "");
    parsedUrl.hash = "";
    parsedUrl.searchParams.delete("utm_source");
    parsedUrl.searchParams.delete("utm_medium");
    parsedUrl.searchParams.delete("utm_campaign");
    parsedUrl.searchParams.delete("utm_term");
    parsedUrl.searchParams.delete("utm_content");

    if (parsedUrl.hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.replace(/^\/+/, "");
      return `youtube:${videoId}`;
    }
    if (parsedUrl.hostname.endsWith("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) return `youtube:${videoId}`;
    }
    parsedUrl.searchParams.sort();
    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return String(source?.url ?? "");
  }
}

function validateDedupeReport({
  dedupeReport,
  coverageSummary,
  candidateReviewQueue,
  bulkCandidates,
  errors,
}) {
  if (dedupeReport === undefined) return;
  if (!dedupeReport || typeof dedupeReport !== "object") {
    errors.push("dedupe-report: artifact must be an object");
    return;
  }

  if (dedupeReport.version !== 1) {
    errors.push("dedupe-report: version must be 1");
  }
  if (dedupeReport.type !== DEDUPE_REPORT_TYPE) {
    errors.push(`dedupe-report: type must be ${DEDUPE_REPORT_TYPE}`);
  }

  const summary = dedupeReport.summary ?? {};
  const candidateRows = Array.isArray(candidateReviewQueue) ? candidateReviewQueue : [];
  const bulkRows = Array.isArray(bulkCandidates) ? bulkCandidates : [];
  const acceptedRows = bulkRows.filter((candidate) => candidate?.status === "accepted");
  const expected = {
    bulkCandidateEntries: coverageSummary?.bulkCandidateEntries ?? bulkRows.length,
    acceptedBulkCandidateEntries: coverageSummary?.acceptedBulkCandidateEntries ?? acceptedRows.length,
    candidateReviewQueueEntries: candidateRows.length,
    acceptedDuplicateSourceIdRows: getDuplicateRowCount(acceptedRows, (candidate) => `${candidate.catalogId}:${candidate.source?.id ?? ""}`),
    acceptedDuplicateUrlIdentityRows: getDuplicateRowCount(acceptedRows, (candidate) => normalizeReferenceIdentity(candidate.source ?? {})),
    candidateReviewDuplicateIdRows: getDuplicateRowCount(candidateRows, (row) => row.candidateId),
  };
  expected.duplicateRows =
    expected.acceptedDuplicateSourceIdRows +
    expected.acceptedDuplicateUrlIdentityRows +
    expected.candidateReviewDuplicateIdRows;
  expected.cleanedDuplicateRows = expected.duplicateRows;

  for (const [field, value] of Object.entries(expected)) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      errors.push(`dedupe-report: summary.${field} must be a non-negative integer`);
    } else if (summary[field] !== value) {
      errors.push(`dedupe-report: summary.${field} ${summary[field]} does not match ${value}`);
    }
  }

  if (summary.duplicateRows !== 0) {
    errors.push("dedupe-report: duplicateRows must be 0 before auto-attach");
  }
  if (coverageSummary?.batchReport?.duplicateRowsAfterDedupe !== summary.duplicateRows) {
    errors.push("coverage-summary: batchReport.duplicateRowsAfterDedupe must match dedupe report");
  }
  if (coverageSummary?.batchReport?.cleanedDuplicateRows !== summary.cleanedDuplicateRows) {
    errors.push("coverage-summary: batchReport.cleanedDuplicateRows must match dedupe report");
  }
  if (coverageSummary?.duplicateRowsAfterDedupe !== summary.duplicateRows) {
    errors.push("coverage-summary: duplicateRowsAfterDedupe must match dedupe report");
  }
  if (coverageSummary?.cleanedDuplicateRows !== summary.cleanedDuplicateRows) {
    errors.push("coverage-summary: cleanedDuplicateRows must match dedupe report");
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
  candidateReviewGroups,
  candidateReviewGroupDecisions,
  candidateReviewGroupDecisionRecommendations,
  candidateReviewBatchPlan,
  coverageMatrix,
  dedupeReport,
  bulkCandidates,
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
      const candidateRowsByCatalogId = new Map();
      const groupDecisionsByCatalogId = new Map();
      const groupRecommendationsByCatalogId = new Map();

      if (candidateReviewGroupDecisions !== undefined) {
        if (candidateReviewGroupDecisions?.version !== 1) {
          errors.push("candidate-review-group-decisions: version must be 1");
        }
        if (!Array.isArray(candidateReviewGroupDecisions?.decisions)) {
          errors.push("candidate-review-group-decisions: decisions must be an array");
        } else {
          validateUnique(
            candidateReviewGroupDecisions.decisions.map((decision) => decision.groupId),
            "candidate-review-group-decisions",
            errors,
          );

          for (const decision of candidateReviewGroupDecisions.decisions) {
            const decisionLabel = decision?.groupId ?? "<missing-group-id>";
            if (!isNonEmptyString(decision?.groupId)) {
              errors.push("candidate-review-group-decisions: groupId is required");
            } else if (decision.groupId !== `${decision.catalogId}:review-group`) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} groupId must match catalogId:review-group`);
            }
            if (!hasCatalogId(catalogIds, decision?.catalogId)) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} unknown catalogId ${decision?.catalogId}`);
            }
            if (!CANDIDATE_REVIEW_GROUP_DECISION_STATUSES.has(decision?.status)) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} invalid status ${decision?.status}`);
            }
            if (decision?.status === "accepted") {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} cannot accept sources without a validated source URL`);
            }
            if (decision?.sourceId !== undefined || decision?.sourceUrl !== undefined || decision?.url !== undefined) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} must not carry accepted source ids or source URLs`);
            }
            if (!isNonEmptyString(decision?.reason)) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} reason is required`);
            }
            if (!isNonEmptyString(decision?.reviewedBy)) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} reviewedBy is required`);
            }
            if (!/^[a-f0-9]{64}$/.test(String(decision?.sourceGroupFingerprint ?? ""))) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} sourceGroupFingerprint must be a SHA-256 hex string`);
            }
            validateIsoDate(`candidate-review-group-decisions: ${decisionLabel} reviewedAt`, decision?.reviewedAt ?? "", errors);
            if (groupDecisionsByCatalogId.has(decision?.catalogId)) {
              errors.push(`candidate-review-group-decisions: ${decisionLabel} duplicate catalog decision`);
            }
            groupDecisionsByCatalogId.set(decision?.catalogId, decision);
          }
        }
      }

      if (candidateReviewGroupDecisionRecommendations !== undefined) {
        if (candidateReviewGroupDecisionRecommendations?.version !== 1) {
          errors.push("candidate-review-group-decision-recommendations: version must be 1");
        }
        if (candidateReviewGroupDecisionRecommendations?.type !== CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_TYPE) {
          errors.push(`candidate-review-group-decision-recommendations: type must be ${CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_TYPE}`);
        }
        if (!Array.isArray(candidateReviewGroupDecisionRecommendations?.decisions)) {
          errors.push("candidate-review-group-decision-recommendations: decisions must be an array");
        } else {
          validateUnique(
            candidateReviewGroupDecisionRecommendations.decisions.map((decision) => decision.groupId),
            "candidate-review-group-decision-recommendations",
            errors,
          );

          for (const recommendation of candidateReviewGroupDecisionRecommendations.decisions) {
            const recommendationLabel = recommendation?.groupId ?? "<missing-group-id>";
            if (!isNonEmptyString(recommendation?.groupId)) {
              errors.push("candidate-review-group-decision-recommendations: groupId is required");
            } else if (recommendation.groupId !== `${recommendation.catalogId}:review-group`) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} groupId must match catalogId:review-group`);
            }
            if (!hasCatalogId(catalogIds, recommendation?.catalogId)) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} unknown catalogId ${recommendation?.catalogId}`);
            }
            if (!CANDIDATE_REVIEW_GROUP_DECISION_STATUSES.has(recommendation?.status)) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} invalid status ${recommendation?.status}`);
            }
            if (recommendation?.status === "accepted") {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} cannot recommend accepted without a validated source URL`);
            }
            if (recommendation?.sourceId !== undefined || recommendation?.sourceUrl !== undefined || recommendation?.url !== undefined) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} must not carry accepted source ids or source URLs`);
            }
            if (!isNonEmptyString(recommendation?.reason)) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} reason is required`);
            }
            if (!isNonEmptyString(recommendation?.reviewedBy)) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} reviewedBy is required`);
            }
            if (!/^[a-f0-9]{64}$/.test(String(recommendation?.sourceGroupFingerprint ?? ""))) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} sourceGroupFingerprint must be a SHA-256 hex string`);
            }
            if (!isNonEmptyString(recommendation?.recommendationRule)) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} recommendationRule is required`);
            }
            validateIsoDate(
              `candidate-review-group-decision-recommendations: ${recommendationLabel} reviewedAt`,
              recommendation?.reviewedAt ?? "",
              errors,
            );
            if (groupRecommendationsByCatalogId.has(recommendation?.catalogId)) {
              errors.push(`candidate-review-group-decision-recommendations: ${recommendationLabel} duplicate catalog recommendation`);
            }
            groupRecommendationsByCatalogId.set(recommendation?.catalogId, recommendation);
          }
        }
      }

      for (const row of candidateReviewQueue) {
        const candidateLabel = row?.candidateId ?? "<missing-candidate-id>";
        incrementCount(candidateReviewStatusCounts, row?.status);
        incrementCount(candidateReviewProfileCounts, row?.profileId);
        if (isNonEmptyString(row?.catalogId)) {
          const rowsForCatalog = candidateRowsByCatalogId.get(row.catalogId) ?? [];
          rowsForCatalog.push(row);
          candidateRowsByCatalogId.set(row.catalogId, rowsForCatalog);
        }

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
          Array.isArray(candidateReviewGroups) ? candidateReviewGroups.length : 0,
          enabledResearchProfileIds.size,
          errors,
        );
        validateCoverageMatrixTotals({
          coverageMatrix,
          coverageSummary,
          actualCandidateReviewCount: candidateReviewQueue.length,
          actualCandidateReviewGroupCount: Array.isArray(candidateReviewGroups) ? candidateReviewGroups.length : 0,
          enabledProfileCount: enabledResearchProfileIds.size,
          errors,
        });
        validateDedupeReport({
          dedupeReport,
          coverageSummary,
          candidateReviewQueue,
          bulkCandidates,
          errors,
        });
      }

      if (candidateReviewGroups !== undefined) {
        if (!Array.isArray(candidateReviewGroups)) {
          errors.push("candidate-review-groups: rows must be an array");
        } else {
          validateUnique(candidateReviewGroups.map((row) => row.groupId), "candidate-review-groups", errors);

          const candidateReviewGroupStatusCounts = new Map();
          for (const group of candidateReviewGroups) {
            const groupLabel = group?.groupId ?? "<missing-group-id>";
            const rowsForCatalog = candidateRowsByCatalogId.get(group?.catalogId) ?? [];
            const expectedProfiles = Array.from(new Set(rowsForCatalog.map((row) => row.profileId).filter(Boolean))).sort();
            const decision = groupDecisionsByCatalogId.get(group?.catalogId);
            const recommendation = groupRecommendationsByCatalogId.get(group?.catalogId);
            const generatedStatus = rowsForCatalog.some((row) => row.status === "conflict") ? "conflict" : "needs-review";
            const expectedStatus = decision?.status ?? generatedStatus;
            incrementCount(candidateReviewGroupStatusCounts, group?.status);

            if (!isNonEmptyString(group?.groupId)) {
              errors.push("candidate-review-groups: groupId is required");
            } else if (group.groupId !== `${group.catalogId}:review-group`) {
              errors.push(`candidate-review-groups: ${groupLabel} groupId must match catalogId:review-group`);
            }
            if (!hasCatalogId(catalogIds, group?.catalogId)) {
              errors.push(`candidate-review-groups: ${groupLabel} unknown catalogId ${group?.catalogId}`);
            }
            if (!CANDIDATE_REVIEW_GROUP_STATUSES.has(group?.status)) {
              errors.push(`candidate-review-groups: ${groupLabel} invalid status ${group?.status}`);
            }
            if (group?.sourceId !== undefined || group?.sourceUrl !== undefined || group?.url !== undefined) {
              errors.push(`candidate-review-groups: ${groupLabel} must not carry accepted source ids or source URLs`);
            }
            if (!Number.isInteger(group?.candidateCount) || group.candidateCount !== rowsForCatalog.length) {
              errors.push(`candidate-review-groups: ${groupLabel} candidateCount must match review queue rows`);
            }
            if (!Number.isInteger(group?.profileCount) || group.profileCount !== expectedProfiles.length) {
              errors.push(`candidate-review-groups: ${groupLabel} profileCount must match unique review profiles`);
            }
            if (!Array.isArray(group?.profiles) || group.profiles.join("|") !== expectedProfiles.join("|")) {
              errors.push(`candidate-review-groups: ${groupLabel} profiles must match review queue profiles`);
            }
            if (group.status !== expectedStatus) {
              errors.push(`candidate-review-groups: ${groupLabel} status must reflect review queue rows or group decision`);
            }
            if (decision) {
              const undecidedGroup = {
                ...group,
                status: generatedStatus,
                reviewAction: generatedStatus === "conflict" ? "resolve-conflict-before-import" : "review-provider-candidates",
                decisionReason: undefined,
                decisionReviewedAt: undefined,
                decisionReviewedBy: undefined,
              };
              if (group.reviewAction !== `batch-decision-${decision.status}`) {
                errors.push(`candidate-review-groups: ${groupLabel} reviewAction must reflect group decision`);
              }
              if (group.decisionReason !== decision.reason || group.decisionReviewedAt !== decision.reviewedAt) {
                errors.push(`candidate-review-groups: ${groupLabel} decision metadata must reflect group decision`);
              }
              if (decision.sourceGroupFingerprint !== getCandidateReviewGroupFingerprint(undecidedGroup)) {
                errors.push(`candidate-review-group-decisions: ${groupLabel} sourceGroupFingerprint must match the generated review group before decisions`);
              }
            }
            if (recommendation) {
              if (recommendation.sourceGroupFingerprint !== getCandidateReviewGroupFingerprint(group)) {
                errors.push(`candidate-review-group-decision-recommendations: ${groupLabel} sourceGroupFingerprint must match the generated review group`);
              }
              if (recommendation.sourceGroupStatus !== group.status) {
                errors.push(`candidate-review-group-decision-recommendations: ${groupLabel} sourceGroupStatus must match the generated review group status`);
              }
              if (recommendation.status === "conflict" && group.status !== "conflict") {
                errors.push(`candidate-review-group-decision-recommendations: ${groupLabel} conflict recommendations require a conflict review group`);
              }
              if (recommendation.status === "deferred" && group.deferredFromNextBatch !== true) {
                errors.push(`candidate-review-group-decision-recommendations: ${groupLabel} deferred recommendations require deferredFromNextBatch`);
              }
            }
            if (!isNonEmptyString(group?.reviewAction)) {
              errors.push(`candidate-review-groups: ${groupLabel} reviewAction is required`);
            }
            if (typeof group?.highestReviewConfidenceScore !== "number" || group.highestReviewConfidenceScore < 0 || group.highestReviewConfidenceScore > 100) {
              errors.push(`candidate-review-groups: ${groupLabel} highestReviewConfidenceScore must be between 0 and 100`);
            }
          }

          if (coverageSummary !== undefined) {
            validateCoverageCount(coverageSummary, "candidateReviewGroupEntries", candidateReviewGroups.length, errors);
            validateCoverageBreakdown(coverageSummary.candidateReviewGroupsByStatus, "candidateReviewGroupsByStatus", candidateReviewGroupStatusCounts, errors);
            validateCoverageCount(
              coverageSummary,
              "candidateReviewGroupDecisionEntries",
              Array.isArray(candidateReviewGroupDecisions?.decisions) ? candidateReviewGroupDecisions.decisions.length : 0,
              errors,
            );
            validateCoverageCount(
              coverageSummary,
              "candidateReviewGroupDecisionRecommendationEntries",
              Array.isArray(candidateReviewGroupDecisionRecommendations?.decisions)
                ? candidateReviewGroupDecisionRecommendations.decisions.length
                : 0,
              errors,
            );
          }
        }
      }

      if (candidateReviewBatchPlan !== undefined) {
        if (!candidateReviewBatchPlan || typeof candidateReviewBatchPlan !== "object") {
          errors.push("candidate-review-batch-plan: artifact must be an object");
        } else if (Array.isArray(candidateReviewGroups)) {
          if (candidateReviewBatchPlan.version !== 1) {
            errors.push("candidate-review-batch-plan: version must be 1");
          }
          if (candidateReviewBatchPlan.type !== CANDIDATE_REVIEW_BATCH_PLAN_TYPE) {
            errors.push(`candidate-review-batch-plan: type must be ${CANDIDATE_REVIEW_BATCH_PLAN_TYPE}`);
          }
          if (!Array.isArray(candidateReviewBatchPlan.packets)) {
            errors.push("candidate-review-batch-plan: packets must be an array");
          } else {
            const activeReviewGroups = candidateReviewGroups.filter(
              (group) => group.status === "needs-review" && group.deferredFromNextBatch !== true,
            );
            const activeReviewGroupIds = new Set(activeReviewGroups.map((group) => group.groupId));
            const reviewGroupByCatalogId = new Map(candidateReviewGroups.map((group) => [group.catalogId, group]));
            const plannedCatalogIds = [];

            validateUnique(candidateReviewBatchPlan.packets.map((packet) => packet.packetId), "candidate-review-batch-plan", errors);

            for (const packet of candidateReviewBatchPlan.packets) {
              const packetLabel = packet?.packetId ?? "<missing-packet-id>";
              if (!isNonEmptyString(packet?.packetId)) {
                errors.push("candidate-review-batch-plan: packetId is required");
              }
              if (packet?.status !== "needs-review") {
                errors.push(`candidate-review-batch-plan: ${packetLabel} status must be needs-review`);
              }
              if (hasSourceIdentityKey(packet)) {
                errors.push(`candidate-review-batch-plan: ${packetLabel} must not carry accepted source ids or source URLs`);
              }
              if (!Array.isArray(packet?.catalogIds) || packet.catalogIds.length === 0) {
                errors.push(`candidate-review-batch-plan: ${packetLabel} catalogIds must be a non-empty array`);
                continue;
              }
              if (!Number.isInteger(packet.groupCount) || packet.groupCount !== packet.catalogIds.length) {
                errors.push(`candidate-review-batch-plan: ${packetLabel} groupCount must match catalogIds`);
              }

              const expectedCandidateCount = packet.catalogIds.reduce(
                (total, catalogId) => total + (candidateRowsByCatalogId.get(catalogId) ?? []).length,
                0,
              );
              if (!Number.isInteger(packet.candidateCount) || packet.candidateCount !== expectedCandidateCount) {
                errors.push(`candidate-review-batch-plan: ${packetLabel} candidateCount must match review queue rows`);
              }

              if (!Array.isArray(packet?.decisionTemplate?.decisions) || packet.decisionTemplate.decisions.length !== packet.catalogIds.length) {
                errors.push(`candidate-review-batch-plan: ${packetLabel} decisionTemplate decisions must match catalogIds`);
              }

              for (const catalogId of packet.catalogIds) {
                plannedCatalogIds.push(catalogId);
                const group = reviewGroupByCatalogId.get(catalogId);
                if (!group || !activeReviewGroupIds.has(group.groupId)) {
                  errors.push(`candidate-review-batch-plan: ${packetLabel} catalogId ${catalogId} is not an active needs-review group`);
                  continue;
                }

                const decision = packet.decisionTemplate?.decisions?.find((row) => row.catalogId === catalogId);
                if (!decision) {
                  errors.push(`candidate-review-batch-plan: ${packetLabel} missing decision template row for ${catalogId}`);
                } else {
                  if (decision.status === "accepted" || decision.sourceId !== undefined || decision.sourceUrl !== undefined || decision.url !== undefined) {
                    errors.push(`candidate-review-batch-plan: ${packetLabel} decision template for ${catalogId} must not accept or carry source URLs`);
                  }
                  if (decision.groupId !== group.groupId) {
                    errors.push(`candidate-review-batch-plan: ${packetLabel} decision groupId must match ${group.groupId}`);
                  }
                  if (decision.sourceGroupFingerprint !== getCandidateReviewGroupFingerprint(group)) {
                    errors.push(`candidate-review-batch-plan: ${packetLabel} sourceGroupFingerprint must match ${group.groupId}`);
                  }
                }
              }
            }

            validateUnique(plannedCatalogIds, "candidate-review-batch-plan catalogIds", errors);
            const summary = candidateReviewBatchPlan.summary ?? {};
            if (summary.totalGroups !== candidateReviewGroups.length) {
              errors.push("candidate-review-batch-plan: summary.totalGroups must match candidate review groups");
            }
            if (summary.candidateReviewQueueEntries !== candidateReviewQueue.length) {
              errors.push("candidate-review-batch-plan: summary.candidateReviewQueueEntries must match candidate review queue");
            }
            if (summary.activeGroupCount !== activeReviewGroups.length) {
              errors.push("candidate-review-batch-plan: summary.activeGroupCount must match active needs-review groups");
            }
            if (summary.packetCount !== candidateReviewBatchPlan.packets.length) {
              errors.push("candidate-review-batch-plan: summary.packetCount must match packets");
            }
            if (summary.plannedGroupCount !== plannedCatalogIds.length) {
              errors.push("candidate-review-batch-plan: summary.plannedGroupCount must match packet catalogIds");
            }
            if (coverageSummary !== undefined) {
              validateCoverageCount(
                coverageSummary,
                "candidateReviewBatchPlanEntries",
                candidateReviewBatchPlan.packets.length,
                errors,
              );
            }
          }
        }
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
      candidateReviewGroupEntries: Array.isArray(candidateReviewGroups) ? candidateReviewGroups.length : 0,
      candidateReviewGroupDecisionEntries: Array.isArray(candidateReviewGroupDecisions?.decisions)
        ? candidateReviewGroupDecisions.decisions.length
        : 0,
      candidateReviewGroupDecisionRecommendationEntries: Array.isArray(candidateReviewGroupDecisionRecommendations?.decisions)
        ? candidateReviewGroupDecisionRecommendations.decisions.length
        : 0,
      candidateReviewBatchPlanEntries: Array.isArray(candidateReviewBatchPlan?.packets)
        ? candidateReviewBatchPlan.packets.length
        : 0,
    },
  };
}

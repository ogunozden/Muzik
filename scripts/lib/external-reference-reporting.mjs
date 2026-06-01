export const COVERAGE_MATRIX_VERSION = "external-reference-coverage-matrix-v1";
export const DEDUPE_REPORT_VERSION = "external-reference-dedupe-report-v1";

export function summarizeCounts(rows, field) {
  return Array.from(
    rows.reduce((counts, row) => {
      const key = row[field] || "-";
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map()),
    ([value, count]) => ({value, count}),
  ).sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr"));
}

function incrementMatrixRow(rowsByValue, value, mutator) {
  const key = value || "-";
  const row = rowsByValue.get(key) ?? {
    value: key,
    totalCatalogEntries: 0,
    curatedReferenceEntries: 0,
    missingCuratedEntries: 0,
    activeMissingEntries: 0,
    deferredMissingEntries: 0,
  };
  mutator(row);
  rowsByValue.set(key, row);
}

function summarizeCatalogCoverage(rows, field) {
  const rowsByValue = new Map();

  for (const row of rows) {
    incrementMatrixRow(rowsByValue, row[field], (summary) => {
      summary.totalCatalogEntries += 1;
      if (row.hasCuratedReference) {
        summary.curatedReferenceEntries += 1;
      } else {
        summary.missingCuratedEntries += 1;
        if (row.deferredFromNextBatch) {
          summary.deferredMissingEntries += 1;
        } else {
          summary.activeMissingEntries += 1;
        }
      }
    });
  }

  return Array.from(rowsByValue.values()).sort((left, right) => (
    right.missingCuratedEntries - left.missingCuratedEntries ||
    right.totalCatalogEntries - left.totalCatalogEntries ||
    left.value.localeCompare(right.value, "tr")
  ));
}

function summarizeCandidateCoverage(rows, field) {
  const rowsByValue = new Map();
  const catalogIdsByValue = new Map();

  for (const row of rows) {
    const key = row[field] || "-";
    const summary = rowsByValue.get(key) ?? {
      value: key,
      candidateReviewQueueEntries: 0,
      affectedCatalogEntries: 0,
      needsReviewEntries: 0,
      conflictEntries: 0,
    };
    summary.candidateReviewQueueEntries += 1;
    if (row.status === "conflict") {
      summary.conflictEntries += 1;
    } else {
      summary.needsReviewEntries += 1;
    }
    rowsByValue.set(key, summary);

    const catalogIds = catalogIdsByValue.get(key) ?? new Set();
    if (row.catalogId) catalogIds.add(row.catalogId);
    catalogIdsByValue.set(key, catalogIds);
  }

  return Array.from(rowsByValue.values())
    .map((row) => ({
      ...row,
      affectedCatalogEntries: catalogIdsByValue.get(row.value)?.size ?? 0,
    }))
    .sort((left, right) => (
      right.candidateReviewQueueEntries - left.candidateReviewQueueEntries ||
      left.value.localeCompare(right.value, "tr")
    ));
}

export function buildCoverageMatrix({
  rows,
  candidateReviewRows,
  candidateReviewGroups,
  researchProfiles,
  generatedAt,
}) {
  const missingRows = rows.filter((row) => row.missingCuratedReference);
  const curatedRows = rows.filter((row) => row.hasCuratedReference);

  return {
    version: 1,
    type: "external-reference-coverage-matrix",
    policyVersion: COVERAGE_MATRIX_VERSION,
    generatedAt,
    summary: {
      totalCatalogEntries: rows.length,
      curatedReferenceEntries: curatedRows.length,
      missingCuratedEntries: missingRows.length,
      candidateReviewQueueEntries: candidateReviewRows.length,
      candidateReviewGroupEntries: candidateReviewGroups.length,
      researchSourceProfileEntries: researchProfiles.length,
    },
    catalogDimensions: {
      makam: summarizeCatalogCoverage(rows, "makam"),
      form: summarizeCatalogCoverage(rows, "form"),
      usul: summarizeCatalogCoverage(rows, "usul"),
      priorityGroup: summarizeCatalogCoverage(rows, "priorityGroup"),
    },
    candidateDimensions: {
      profileId: summarizeCandidateCoverage(candidateReviewRows, "profileId"),
      provider: summarizeCandidateCoverage(candidateReviewRows, "provider"),
      status: summarizeCandidateCoverage(candidateReviewRows, "status"),
      confidenceLevel: summarizeCandidateCoverage(candidateReviewRows, "reviewConfidenceLevel"),
    },
    policy:
      "Coverage is measured by catalog dimensions and provider/status review dimensions; search candidates remain review-only and accepted coverage only comes from validated accepted sources.",
  };
}

function getDuplicateGroups(rows, getKey) {
  const groups = new Map();
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      count: group.length,
      duplicateCount: group.length - 1,
    }));
}

export function buildDedupeReport({
  bulkCandidates,
  acceptedBulkCandidates,
  candidateReviewRows,
  generatedAt,
  getAcceptedIdentity,
}) {
  const acceptedSourceIdDuplicates = getDuplicateGroups(
    acceptedBulkCandidates,
    (candidate) => `${candidate.catalogId}:${candidate.source?.id ?? ""}`,
  );
  const acceptedUrlIdentityDuplicates = getDuplicateGroups(
    acceptedBulkCandidates,
    (candidate) => getAcceptedIdentity(candidate.source ?? {}),
  );
  const candidateReviewIdDuplicates = getDuplicateGroups(candidateReviewRows, (row) => row.candidateId);
  const acceptedDuplicateSourceIdRows = acceptedSourceIdDuplicates.reduce((total, group) => total + group.duplicateCount, 0);
  const acceptedDuplicateUrlIdentityRows = acceptedUrlIdentityDuplicates.reduce((total, group) => total + group.duplicateCount, 0);
  const candidateReviewDuplicateIdRows = candidateReviewIdDuplicates.reduce((total, group) => total + group.duplicateCount, 0);
  const duplicateRows = acceptedDuplicateSourceIdRows + acceptedDuplicateUrlIdentityRows + candidateReviewDuplicateIdRows;

  return {
    version: 1,
    type: "external-reference-dedupe-report",
    policyVersion: DEDUPE_REPORT_VERSION,
    generatedAt,
    summary: {
      bulkCandidateEntries: bulkCandidates.length,
      acceptedBulkCandidateEntries: acceptedBulkCandidates.length,
      candidateReviewQueueEntries: candidateReviewRows.length,
      acceptedDuplicateSourceIdRows,
      acceptedDuplicateUrlIdentityRows,
      candidateReviewDuplicateIdRows,
      duplicateRows,
      cleanedDuplicateRows: duplicateRows,
      policy:
        "Accepted source ids, accepted URL identities, and generated review candidate ids must be unique; duplicate accepted identities fail validation before auto-attach.",
    },
    duplicateGroups: {
      acceptedSourceIds: acceptedSourceIdDuplicates,
      acceptedUrlIdentities: acceptedUrlIdentityDuplicates,
      candidateReviewIds: candidateReviewIdDuplicates,
    },
  };
}

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {
  CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_VERSION,
  buildCandidateReviewGroupDecisionRecommendations,
  buildCandidateReviewGroups,
  buildCandidateReviewRows,
} from "./external-reference-candidate-review.mjs";

export {
  CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_VERSION,
  buildCandidateReviewGroupDecisionRecommendations,
  buildCandidateReviewGroups,
  buildCandidateReviewRows,
};

export const DEFAULT_OUT_DIR = "output/external-reference-coverage";
export const DEFAULT_BATCH_SIZE = 100;

const OFFICIAL_ZENODO_URL = "https://zenodo.org/records/15470412";
const OFFICIAL_GITHUB_URL = "https://github.com/MTG/SymbTr";
const ALLOWED_CURATION_DECISION_STATUSES = new Set(["needs-disambiguation", "source-mismatch", "deferred"]);
const NEXT_BATCH_DEFER_STATUSES = new Set(["needs-disambiguation", "source-mismatch", "deferred"]);
const ALLOWED_BULK_CANDIDATE_STATUSES = new Set(["accepted", "needs-review", "rejected", "conflict"]);
const ALLOWED_CANDIDATE_REVIEW_GROUP_DECISION_STATUSES = new Set(["needs-review", "rejected", "conflict", "deferred"]);
const COVERAGE_MATRIX_VERSION = "external-reference-coverage-matrix-v1";
const DEDUPE_REPORT_VERSION = "external-reference-dedupe-report-v1";
const SCORE_SOURCE_HINTS = [
  "site:neyzen.com nota",
  "site:defteriniz.com nota",
  "site:turksanatmuzigi.org nota",
];

function createAuditPaths(root) {
  return {
    catalog: path.join(root, "src", "data", "symbtr", "catalog.generated.json"),
    pieceData: path.join(root, "src", "data", "pieces", "hicazkarPesrev.ts"),
    referenceManifest: path.join(root, "src", "data", "references", "piece-external-references.ts"),
    curationDecisions: path.join(root, "src", "data", "references", "external-curation-decisions.json"),
    candidateReviewGroupDecisions: path.join(root, "src", "data", "references", "candidate-review-group-decisions.json"),
    bulkCandidates: path.join(root, "src", "data", "references", "external-reference-bulk-candidates.json"),
    researchProfiles: path.join(root, "src", "data", "references", "research-source-profiles.json"),
  };
}

function assertInsideProject(targetPath, root) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to write outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function toProjectPath(targetPath) {
  return targetPath.split(path.sep).join("/");
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function humanizeSegment(value) {
  return String(value)
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("tr-TR"));
}

export function readCuratedCatalogIds(entries, paths) {
  const source = [paths.pieceData, paths.referenceManifest].map((sourcePath) => readFileSync(sourcePath, "utf8")).join("\n");
  const ids = new Set();
  const pattern = /symbtrCatalogId:\s*"([^"]+)"/g;
  let match;

  while ((match = pattern.exec(source))) {
    ids.add(match[1]);
  }

  for (const entry of entries) {
    if (source.includes(entry.id)) {
      ids.add(entry.id);
    }
  }

  return ids;
}

export function readCurationDecisions(entries, curationDecisionsPath) {
  if (!existsSync(curationDecisionsPath)) {
    return new Map();
  }

  const catalogIds = new Set(entries.map((entry) => entry.id));
  const parsed = JSON.parse(readFileSync(curationDecisionsPath, "utf8"));
  const decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];
  const decisionsByCatalogId = new Map();
  const errors = [];

  for (const decision of decisions) {
    const catalogId = String(decision.catalogId ?? "");
    const status = String(decision.status ?? "");
    const reason = String(decision.reason ?? "").trim();
    const reviewedAt = String(decision.reviewedAt ?? "");

    if (!catalogIds.has(catalogId)) {
      errors.push(`${catalogId || "<missing>"}: curation decision catalog id is not present in the SymbTr catalog`);
    }

    if (!ALLOWED_CURATION_DECISION_STATUSES.has(status)) {
      errors.push(`${catalogId || "<missing>"}: unsupported curation decision status ${status || "<missing>"}`);
    }

    if (!reason) {
      errors.push(`${catalogId || "<missing>"}: curation decision reason is empty`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) {
      errors.push(`${catalogId || "<missing>"}: curation decision reviewedAt must use YYYY-MM-DD`);
    }

    if (decisionsByCatalogId.has(catalogId)) {
      errors.push(`${catalogId}: duplicate curation decision`);
    }

    decisionsByCatalogId.set(catalogId, {
      catalogId,
      status,
      reason,
      reviewedAt,
    });
  }

  if (errors.length > 0) {
    throw new Error(`Invalid external curation decisions:\n${errors.join("\n")}`);
  }

  return decisionsByCatalogId;
}

export function normalizeCandidateReviewGroupDecision(decision) {
  const catalogId = String(decision.catalogId ?? "").trim();
  const groupId = String(decision.groupId ?? `${catalogId}:review-group`).trim();

  return {
    groupId,
    catalogId,
    status: String(decision.status ?? "").trim(),
    reason: String(decision.reason ?? "").trim(),
    reviewedAt: String(decision.reviewedAt ?? "").trim(),
    reviewedBy: String(decision.reviewedBy ?? "local-operator").trim(),
  };
}

export function readCandidateReviewGroupDecisions(entries, decisionsPath) {
  if (!existsSync(decisionsPath)) {
    return new Map();
  }

  const catalogIds = new Set(entries.map((entry) => entry.id));
  const parsed = JSON.parse(readFileSync(decisionsPath, "utf8"));
  const decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];
  const decisionsByCatalogId = new Map();
  const errors = [];

  for (const rawDecision of decisions) {
    const decision = normalizeCandidateReviewGroupDecision(rawDecision);
    const label = decision.groupId || decision.catalogId || "<missing>";

    if (!catalogIds.has(decision.catalogId)) {
      errors.push(`${label}: review group decision catalog id is not present in the SymbTr catalog`);
    }

    if (decision.groupId !== `${decision.catalogId}:review-group`) {
      errors.push(`${label}: review group decision groupId must match catalogId:review-group`);
    }

    if (!ALLOWED_CANDIDATE_REVIEW_GROUP_DECISION_STATUSES.has(decision.status)) {
      errors.push(`${label}: unsupported review group decision status ${decision.status || "<missing>"}`);
    }

    if (decision.status === "needs-review") {
      errors.push(`${label}: needs-review is generated by the pipeline and must not be persisted as an operator decision`);
    }

    if (!decision.reason) {
      errors.push(`${label}: review group decision reason is empty`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.reviewedAt)) {
      errors.push(`${label}: review group decision reviewedAt must use YYYY-MM-DD`);
    }

    if (!decision.reviewedBy) {
      errors.push(`${label}: review group decision reviewedBy is empty`);
    }

    if (rawDecision.sourceId !== undefined || rawDecision.sourceUrl !== undefined || rawDecision.url !== undefined) {
      errors.push(`${label}: review group decisions must not carry accepted source ids or source URLs`);
    }

    if (decisionsByCatalogId.has(decision.catalogId)) {
      errors.push(`${label}: duplicate review group decision`);
    }

    decisionsByCatalogId.set(decision.catalogId, decision);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid candidate review group decisions:\n${errors.join("\n")}`);
  }

  return decisionsByCatalogId;
}

export function normalizeUrlForIdentity(value) {
  try {
    const url = new URL(value);
    url.hash = "";

    if (url.hostname === "youtu.be") {
      return `https://www.youtube.com/watch?v=${url.pathname.replace("/", "")}`.toLocaleLowerCase("en-US");
    }

    if (url.hostname.endsWith("youtube.com") && url.searchParams.has("v")) {
      return `https://www.youtube.com/watch?v=${url.searchParams.get("v")}`.toLocaleLowerCase("en-US");
    }

    url.searchParams.sort();
    return url.toString().replace(/\/$/, "").toLocaleLowerCase("en-US");
  } catch {
    return null;
  }
}

export function getReferenceIdentity(source) {
  return `${source.provider}:${
    normalizeUrlForIdentity(source.url) ?? String(source.url ?? "").trim().toLocaleLowerCase("en-US")
  }`;
}

export function validateBulkCandidateSource(catalogId, source) {
  const errors = [];
  const normalizedUrl = normalizeUrlForIdentity(source?.url);
  const parsedRawUrl = (() => {
    try {
      return new URL(source?.url);
    } catch {
      return null;
    }
  })();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(source?.id ?? ""))) {
    errors.push(`${catalogId}: invalid bulk candidate reference id ${source?.id ?? "<missing>"}`);
  }

  if (!String(source?.label ?? "").trim()) {
    errors.push(`${catalogId}: bulk candidate reference label is empty`);
  }

  if (!normalizedUrl || !parsedRawUrl) {
    errors.push(`${catalogId}: bulk candidate reference has an invalid URL`);
  } else if (parsedRawUrl.protocol !== "https:") {
    errors.push(`${catalogId}: bulk candidate reference must use HTTPS`);
  }

  if (source?.access === "embed-allowed" && source?.verification === "manual") {
    errors.push(`${catalogId}: bulk candidate reference cannot be embedded with manual-only verification`);
  }

  if (source?.provider === "youtube" && source?.verification !== "oembed") {
    errors.push(`${catalogId}: bulk YouTube candidate must be verified with oEmbed metadata`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(source?.verifiedAt ?? ""))) {
    errors.push(`${catalogId}: bulk candidate verifiedAt must use YYYY-MM-DD`);
  }

  return errors;
}

export function readBulkReferenceCandidates(entries, bulkCandidatesPath) {
  if (!existsSync(bulkCandidatesPath)) {
    return [];
  }

  const catalogIds = new Set(entries.map((entry) => entry.id));
  const parsed = JSON.parse(readFileSync(bulkCandidatesPath, "utf8"));
  const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const seenCandidateIds = new Set();
  const seenAcceptedIdentities = new Set();
  const errors = [];

  for (const candidate of candidates) {
    const catalogId = String(candidate.catalogId ?? "");
    const status = String(candidate.status ?? "");
    const checkedAt = String(candidate.checkedAt ?? "");
    const source = candidate.source ?? {};

    if (!catalogIds.has(catalogId)) {
      errors.push(`${catalogId || "<missing>"}: bulk candidate catalog id is not present in the SymbTr catalog`);
    }

    if (!ALLOWED_BULK_CANDIDATE_STATUSES.has(status)) {
      errors.push(`${catalogId || "<missing>"}: unsupported bulk candidate status ${status || "<missing>"}`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
      errors.push(`${catalogId || "<missing>"}: bulk candidate checkedAt must use YYYY-MM-DD`);
    }

    if (status === "accepted") {
      errors.push(...validateBulkCandidateSource(catalogId, source));

      const candidateId = `${catalogId}:${source.id ?? "<missing>"}`;
      if (seenCandidateIds.has(candidateId)) {
        errors.push(`${catalogId}: duplicate bulk candidate source id ${source.id}`);
      }
      seenCandidateIds.add(candidateId);

      const identity = getReferenceIdentity(source);
      if (seenAcceptedIdentities.has(identity)) {
        errors.push(`${catalogId}: duplicate accepted bulk candidate URL identity`);
      }
      seenAcceptedIdentities.add(identity);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid external reference bulk candidates:\n${errors.join("\n")}`);
  }

  return candidates;
}

export function readResearchSourceProfiles(researchProfilesPath) {
  if (!existsSync(researchProfilesPath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(researchProfilesPath, "utf8"));
  const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
  const errors = [];

  for (const profile of profiles) {
    const id = String(profile.id ?? "").trim();
    const label = String(profile.label ?? "").trim();
    const template = String(profile.searchUrlTemplate ?? "").trim();
    const trustWeight = Number(profile.trustWeight ?? 0);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      errors.push(`${id || "<missing>"}: invalid research source profile id`);
    }

    if (!label) {
      errors.push(`${id || "<missing>"}: research source profile label is empty`);
    }

    if (!template.includes("{query}")) {
      errors.push(`${id || "<missing>"}: research source profile searchUrlTemplate must include {query}`);
    }

    if (!Number.isFinite(trustWeight) || trustWeight < 0 || trustWeight > 1) {
      errors.push(`${id || "<missing>"}: research source profile trustWeight must be between 0 and 1`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid research source profiles:\n${errors.join("\n")}`);
  }

  return profiles.filter((profile) => profile.enabled !== false);
}

function buildSearchQuery(entry, suffix) {
  const parts = [
    humanizeSegment(entry.makam),
    humanizeSegment(entry.form),
    humanizeSegment(entry.title),
    humanizeSegment(entry.composer),
    suffix,
  ].filter((part) => part && part !== "-");

  return parts.join(" ");
}

function buildSearchUrl(query) {
  const url = new URL("https://duckduckgo.com/");
  url.searchParams.set("q", query);
  return url.toString();
}

function buildYoutubeSearchUrl(query) {
  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set("search_query", query);
  return url.toString();
}

function includesFormat(entry, format) {
  return Array.isArray(entry.formats) && entry.formats.includes(format);
}

function getEntryPriorityScore(entry, hasCuratedReference) {
  if (hasCuratedReference) return 1000;

  let score = 0;
  if (includesFormat(entry, "pdf")) score -= 25;
  if (includesFormat(entry, "xml")) score -= 15;
  if (includesFormat(entry, "txt")) score -= 10;
  if (entry.title) score -= 5;
  if (entry.composer) score -= 5;

  if (["pesrev", "sazsemaisi", "sarki", "ilahi"].includes(entry.form)) score -= 8;
  if (["devrikebir", "duyek", "sofyan", "aksak"].includes(entry.usul)) score -= 4;

  return score;
}

function getPriorityGroup(entry, hasCuratedReference) {
  if (hasCuratedReference) return "curated-reference-present";
  if (includesFormat(entry, "pdf") && includesFormat(entry, "xml")) return "pdf-and-musicxml";
  if (includesFormat(entry, "pdf")) return "pdf-only";
  if (includesFormat(entry, "xml")) return "musicxml-only";
  return "metadata-only";
}

function compareRowsByPriority(left, right) {
  return (
    Number(left.hasCuratedReference) - Number(right.hasCuratedReference) ||
    left.curationPriorityScore - right.curationPriorityScore ||
    left.form.localeCompare(right.form, "tr") ||
    left.makam.localeCompare(right.makam, "tr") ||
    left.title.localeCompare(right.title, "tr") ||
    left.catalogId.localeCompare(right.catalogId, "en")
  );
}

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

function countCatalogFormats(entries) {
  return entries.reduce((counts, entry) => {
    for (const format of entry.formats ?? []) {
      counts[format] = (counts[format] ?? 0) + 1;
    }
    return counts;
  }, {});
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
}) {
  const acceptedSourceIdDuplicates = getDuplicateGroups(
    acceptedBulkCandidates,
    (candidate) => `${candidate.catalogId}:${candidate.source?.id ?? ""}`,
  );
  const acceptedUrlIdentityDuplicates = getDuplicateGroups(
    acceptedBulkCandidates,
    (candidate) => getReferenceIdentity(candidate.source ?? {}),
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

export function buildBacklogRows(entries, curatedCatalogIds, curationDecisionsByCatalogId) {
  return entries
    .map((entry) => {
      const hasCuratedReference = curatedCatalogIds.has(entry.id);
      const curationDecision = curationDecisionsByCatalogId.get(entry.id);
      const isDeferredFromNextBatch =
        !hasCuratedReference && curationDecision && NEXT_BATCH_DEFER_STATUSES.has(curationDecision.status);
      const availableFormats = Array.isArray(entry.formats) ? entry.formats.join("|") : "";
      const scoreSearchQuery = buildSearchQuery(entry, "nota");
      const recordingSearchQuery = buildSearchQuery(entry, "icra kayıt YouTube");
      const sourceHintQueries = SCORE_SOURCE_HINTS.map((hint) => buildSearchQuery(entry, hint));

      return {
        catalogId: entry.id,
        makam: humanizeSegment(entry.makam),
        form: humanizeSegment(entry.form),
        usul: humanizeSegment(entry.usul),
        title: humanizeSegment(entry.title),
        composer: humanizeSegment(entry.composer),
        availableFormats,
        hasPdf: includesFormat(entry, "pdf"),
        hasMusicXml: includesFormat(entry, "xml"),
        hasTxt: includesFormat(entry, "txt"),
        hasOfficialSymbTrMetadata: true,
        hasCuratedReference,
        missingCuratedReference: !hasCuratedReference,
        curationDecisionStatus: curationDecision?.status ?? "",
        curationDecisionReason: curationDecision?.reason ?? "",
        curationDecisionReviewedAt: curationDecision?.reviewedAt ?? "",
        deferredFromNextBatch: Boolean(isDeferredFromNextBatch),
        priorityGroup: getPriorityGroup(entry, hasCuratedReference),
        curationPriorityScore: getEntryPriorityScore(entry, hasCuratedReference),
        officialZenodoUrl: OFFICIAL_ZENODO_URL,
        officialGithubUrl: OFFICIAL_GITHUB_URL,
        scoreSearchQuery,
        scoreSearchUrl: buildSearchUrl(scoreSearchQuery),
        scoreSourceHintQueries: sourceHintQueries.join(" | "),
        scoreSourceHintUrls: sourceHintQueries.map(buildSearchUrl).join(" | "),
        recordingSearchQuery,
        recordingSearchUrl: buildYoutubeSearchUrl(recordingSearchQuery),
      };
    })
    .sort(compareRowsByPriority);
}

function getLatestIsoDate(values, fallback = "1970-01-01") {
  return values
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")))
    .sort()
    .at(-1) ?? fallback;
}

export function renderCsv(rows) {
  const columns = [
    "catalogId",
    "makam",
    "form",
    "usul",
    "title",
    "composer",
    "availableFormats",
    "hasPdf",
    "hasMusicXml",
    "hasTxt",
    "hasOfficialSymbTrMetadata",
    "hasCuratedReference",
    "missingCuratedReference",
    "curationDecisionStatus",
    "curationDecisionReason",
    "curationDecisionReviewedAt",
    "deferredFromNextBatch",
    "priorityGroup",
    "curationPriorityScore",
    "officialZenodoUrl",
    "officialGithubUrl",
    "scoreSearchQuery",
    "scoreSearchUrl",
    "scoreSourceHintQueries",
    "scoreSourceHintUrls",
    "recordingSearchQuery",
    "recordingSearchUrl",
  ];
  const header = columns.map(csvValue).join(",");
  const lines = rows.map((row) => columns.map((column) => csvValue(row[column])).join(","));

  return `${[header, ...lines].join("\n")}\n`;
}

export function buildBulkCandidateRows(candidates) {
  return candidates.map((candidate) => {
    const source = candidate.source ?? {};
    const evidence = candidate.evidence ?? {};

    return {
      catalogId: candidate.catalogId ?? "",
      status: candidate.status ?? "",
      checkedAt: candidate.checkedAt ?? "",
      sourceId: source.id ?? "",
      provider: source.provider ?? "",
      url: source.url ?? "",
      title: source.title ?? "",
      evidenceTitle: evidence.title ?? "",
      evidenceMakam: evidence.makam ?? "",
      evidenceForm: evidence.form ?? "",
      evidenceUsul: evidence.usul ?? "",
      evidenceComposer: evidence.composer ?? "",
      evidenceSourceProvider: evidence.sourceProvider ?? "",
    };
  });
}

export function renderBulkCandidateCsv(rows) {
  const columns = [
    "catalogId",
    "status",
    "checkedAt",
    "sourceId",
    "provider",
    "url",
    "title",
    "evidenceTitle",
    "evidenceMakam",
    "evidenceForm",
    "evidenceUsul",
    "evidenceComposer",
    "evidenceSourceProvider",
  ];
  const header = columns.map(csvValue).join(",");
  const lines = rows.map((row) => columns.map((column) => csvValue(row[column])).join(","));

  return `${[header, ...lines].join("\n")}\n`;
}

export function renderCandidateReviewCsv(rows) {
  const columns = [
    "candidateId",
    "catalogId",
    "status",
    "statusReason",
    "profileId",
    "profileLabel",
    "provider",
    "trustWeight",
    "metadataStrategy",
    "reviewConfidenceScore",
    "reviewConfidenceLevel",
    "scoreReasons",
    "queryFields",
    "searchQuery",
    "searchUrl",
    "makam",
    "form",
    "usul",
    "title",
    "composer",
    "priorityGroup",
    "deferredFromNextBatch",
    "curationDecisionStatus",
  ];
  const header = columns.map(csvValue).join(",");
  const lines = rows.map((row) => columns.map((column) => csvValue(Array.isArray(row[column]) ? row[column].join("|") : row[column])).join(","));

  return `${[header, ...lines].join("\n")}\n`;
}

export function renderCandidateReviewGroupCsv(rows) {
  const columns = [
    "groupId",
    "catalogId",
    "status",
    "reviewAction",
    "candidateCount",
    "profileCount",
    "profiles",
    "providers",
    "confidenceLevels",
    "highestReviewConfidenceScore",
    "deferredFromNextBatch",
    "makam",
    "form",
    "usul",
    "title",
    "composer",
    "priorityGroup",
    "decisionReason",
    "decisionReviewedAt",
    "decisionReviewedBy",
  ];
  const header = columns.map(csvValue).join(",");
  const lines = rows.map((row) => columns.map((column) => csvValue(Array.isArray(row[column]) ? row[column].join("|") : row[column])).join(","));

  return `${[header, ...lines].join("\n")}\n`;
}

export function runExternalReferenceCoverageAudit({
  root = process.cwd(),
  outDir = DEFAULT_OUT_DIR,
  batchSize = DEFAULT_BATCH_SIZE,
} = {}) {
  const paths = createAuditPaths(root);
  const catalogData = JSON.parse(readFileSync(paths.catalog, "utf8"));
  const entries = catalogData.entries ?? [];
  const bulkCandidates = readBulkReferenceCandidates(entries, paths.bulkCandidates);
  const researchProfiles = readResearchSourceProfiles(paths.researchProfiles);
  const acceptedBulkCandidates = bulkCandidates.filter((candidate) => candidate.status === "accepted");
  const curatedCatalogIds = readCuratedCatalogIds(entries, paths);
  const curatedBeforeBulkCandidates = curatedCatalogIds.size;
  const newlyAcceptedCatalogIds = [];
  for (const candidate of acceptedBulkCandidates) {
    if (!curatedCatalogIds.has(candidate.catalogId)) {
      newlyAcceptedCatalogIds.push(candidate.catalogId);
    }
    curatedCatalogIds.add(candidate.catalogId);
  }
  const curationDecisionsByCatalogId = readCurationDecisions(entries, paths.curationDecisions);
  const candidateReviewGroupDecisionsByCatalogId = readCandidateReviewGroupDecisions(
    entries,
    paths.candidateReviewGroupDecisions,
  );
  const rows = buildBacklogRows(entries, curatedCatalogIds, curationDecisionsByCatalogId);
  const missingRows = rows.filter((row) => row.missingCuratedReference);
  const deferredRows = missingRows.filter((row) => row.deferredFromNextBatch);
  const nextBatchRows = missingRows.filter((row) => !row.deferredFromNextBatch).slice(0, batchSize);
  const bulkCandidateRows = buildBulkCandidateRows(bulkCandidates);
  const candidateReviewRows = buildCandidateReviewRows(rows, researchProfiles);
  const candidateReviewGroups = buildCandidateReviewGroups(candidateReviewRows, candidateReviewGroupDecisionsByCatalogId);
  const safeOutDir = assertInsideProject(outDir, root);
  mkdirSync(safeOutDir, {recursive: true});

  const csvPath = path.join(safeOutDir, "symbtr-curated-reference-backlog.csv");
  const backlogJsonPath = path.join(safeOutDir, "symbtr-curated-reference-backlog.json");
  const nextBatchCsvPath = path.join(safeOutDir, "symbtr-curated-reference-next-batch.csv");
  const nextBatchJsonPath = path.join(safeOutDir, "symbtr-curated-reference-next-batch.json");
  const bulkCandidatesCsvPath = path.join(safeOutDir, "symbtr-curated-reference-bulk-candidates.csv");
  const bulkCandidatesJsonPath = path.join(safeOutDir, "symbtr-curated-reference-bulk-candidates.json");
  const candidateReviewCsvPath = path.join(safeOutDir, "symbtr-curated-reference-candidate-review-queue.csv");
  const candidateReviewJsonPath = path.join(safeOutDir, "symbtr-curated-reference-candidate-review-queue.json");
  const candidateReviewGroupCsvPath = path.join(safeOutDir, "symbtr-curated-reference-candidate-review-groups.csv");
  const candidateReviewGroupJsonPath = path.join(safeOutDir, "symbtr-curated-reference-candidate-review-groups.json");
  const candidateReviewGroupRecommendationJsonPath = path.join(
    safeOutDir,
    "symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
  );
  const coverageMatrixJsonPath = path.join(safeOutDir, "symbtr-curated-reference-coverage-matrix.json");
  const dedupeReportJsonPath = path.join(safeOutDir, "symbtr-curated-reference-dedupe-report.json");
  const recommendationReviewedAt = getLatestIsoDate(
    Array.from(curationDecisionsByCatalogId.values()).map((decision) => decision.reviewedAt),
  );
  const generatedAt = `${recommendationReviewedAt}T00:00:00.000Z`;
  const candidateReviewGroupDecisionRecommendations = buildCandidateReviewGroupDecisionRecommendations(
    candidateReviewGroups,
    recommendationReviewedAt,
  );
  const candidateReviewGroupDecisionRecommendationManifest = {
    version: 1,
    type: "candidate-review-group-decision-recommendations",
    policyVersion: CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_VERSION,
    generatedAt,
    summary: {
      totalGroups: candidateReviewGroups.length,
      recommendedDecisionCount: candidateReviewGroupDecisionRecommendations.length,
      recommendedByStatus: summarizeCounts(candidateReviewGroupDecisionRecommendations, "status"),
      policy: "Recommendations may only produce rejected, conflict, or deferred review group decisions; accepted sources require validated source URLs through the bulk candidate pipeline.",
    },
    decisions: candidateReviewGroupDecisionRecommendations,
  };
  const coverageMatrix = buildCoverageMatrix({
    rows,
    candidateReviewRows,
    candidateReviewGroups,
    researchProfiles,
    generatedAt,
  });
  const dedupeReport = buildDedupeReport({
    bulkCandidates,
    acceptedBulkCandidates,
    candidateReviewRows,
    generatedAt,
  });
  writeFileSync(csvPath, renderCsv(rows));
  writeFileSync(backlogJsonPath, `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(nextBatchCsvPath, renderCsv(nextBatchRows));
  writeFileSync(nextBatchJsonPath, `${JSON.stringify(nextBatchRows, null, 2)}\n`);
  writeFileSync(bulkCandidatesCsvPath, renderBulkCandidateCsv(bulkCandidateRows));
  writeFileSync(bulkCandidatesJsonPath, `${JSON.stringify(bulkCandidateRows, null, 2)}\n`);
  writeFileSync(candidateReviewCsvPath, renderCandidateReviewCsv(candidateReviewRows));
  writeFileSync(candidateReviewJsonPath, `${JSON.stringify(candidateReviewRows, null, 2)}\n`);
  writeFileSync(candidateReviewGroupCsvPath, renderCandidateReviewGroupCsv(candidateReviewGroups));
  writeFileSync(candidateReviewGroupJsonPath, `${JSON.stringify(candidateReviewGroups, null, 2)}\n`);
  writeFileSync(
    candidateReviewGroupRecommendationJsonPath,
    `${JSON.stringify(candidateReviewGroupDecisionRecommendationManifest, null, 2)}\n`,
  );
  writeFileSync(coverageMatrixJsonPath, `${JSON.stringify(coverageMatrix, null, 2)}\n`);
  writeFileSync(dedupeReportJsonPath, `${JSON.stringify(dedupeReport, null, 2)}\n`);

  const batchReport = {
    version: 1,
    flow: [
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
    ],
    processedCatalogEntries: rows.length,
    curatedBeforeBulkCandidates,
    newlyAcceptedCatalogEntries: newlyAcceptedCatalogIds.length,
    curatedAfterBatch: rows.length - missingRows.length,
    missingAfterBatch: missingRows.length,
    deferredMissingEntries: deferredRows.length,
    nextBatchSize: nextBatchRows.length,
    bulkCandidateStatusCounts: summarizeCounts(bulkCandidates, "status"),
    candidateReviewStatusCounts: summarizeCounts(candidateReviewRows, "status"),
    candidateReviewProfileCounts: summarizeCounts(candidateReviewRows, "profileId"),
    candidateReviewConfidenceLevelCounts: summarizeCounts(candidateReviewRows, "reviewConfidenceLevel"),
    generatedReviewCandidates: candidateReviewRows.length,
    generatedReviewGroups: candidateReviewGroups.length,
    appliedReviewGroupDecisions: candidateReviewGroupDecisionsByCatalogId.size,
    recommendedReviewGroupDecisions: candidateReviewGroupDecisionRecommendations.length,
    candidateReviewQueryFields: ["makam", "form", "usul", "title", "composer"],
    candidateReviewScoringSignals: ["profile-trust", "profile-metadata-strategy", "catalog-formats", "catalog-fields", "curation-decision"],
    candidateReviewGroupDecisionRecommendationPolicy: CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_VERSION,
    duplicateAcceptedIdentityPolicy: "duplicate accepted URL identities fail validation before merge",
    dedupeReportPolicy: DEDUPE_REPORT_VERSION,
    dedupeCheckedRows: dedupeReport.summary.bulkCandidateEntries + dedupeReport.summary.candidateReviewQueueEntries,
    cleanedDuplicateRows: dedupeReport.summary.cleanedDuplicateRows,
    duplicateRowsAfterDedupe: dedupeReport.summary.duplicateRows,
    autoAttachPolicy: "only accepted bulk candidates are counted as curated and eligible for auto-attach",
    acceptedCatalogIds: acceptedBulkCandidates.map((candidate) => candidate.catalogId),
    newlyAcceptedCatalogIds,
    validationGates: [
      "catalog-id",
      "https-url-policy",
      "accepted-identity-dedupe",
      "status-contract",
      "candidate-review-only",
      "profile-count-drift",
      "summary-count-drift",
      "metadata-strategy-profile-drift",
      "candidate-review-group-drift",
      "candidate-review-group-decision-drift",
      "candidate-review-group-decision-recommendation-drift",
      "coverage-matrix-drift",
      "dedupe-report-drift",
    ],
  };

  const summary = {
    totalCatalogEntries: rows.length,
    officialSymbTrMetadataEntries: rows.length,
    curatedReferenceEntries: rows.length - missingRows.length,
    missingCuratedEntries: missingRows.length,
    curationDecisionEntries: curationDecisionsByCatalogId.size,
    candidateReviewGroupDecisionEntries: candidateReviewGroupDecisionsByCatalogId.size,
    deferredMissingEntries: deferredRows.length,
    bulkCandidateEntries: bulkCandidates.length,
    acceptedBulkCandidateEntries: acceptedBulkCandidates.length,
    acceptedBulkCandidateCatalogIds: acceptedBulkCandidates.map((candidate) => candidate.catalogId),
    researchSourceProfileEntries: researchProfiles.length,
    candidateReviewQueueEntries: candidateReviewRows.length,
    candidateReviewGroupEntries: candidateReviewGroups.length,
    candidateReviewGroupDecisionRecommendationEntries: candidateReviewGroupDecisionRecommendations.length,
    candidateReviewQueueByStatus: summarizeCounts(candidateReviewRows, "status"),
    candidateReviewQueueByProfile: summarizeCounts(candidateReviewRows, "profileId"),
    candidateReviewGroupsByStatus: summarizeCounts(candidateReviewGroups, "status"),
    candidateReviewGroupDecisionRecommendationsByStatus: summarizeCounts(
      candidateReviewGroupDecisionRecommendations,
      "status",
    ),
    coverageMatrixEntries: Object.values(coverageMatrix.catalogDimensions).reduce(
      (total, dimensionRows) => total + dimensionRows.length,
      0,
    ) + Object.values(coverageMatrix.candidateDimensions).reduce((total, dimensionRows) => total + dimensionRows.length, 0),
    dedupeReportEntries:
      dedupeReport.duplicateGroups.acceptedSourceIds.length +
      dedupeReport.duplicateGroups.acceptedUrlIdentities.length +
      dedupeReport.duplicateGroups.candidateReviewIds.length,
    cleanedDuplicateRows: dedupeReport.summary.cleanedDuplicateRows,
    duplicateRowsAfterDedupe: dedupeReport.summary.duplicateRows,
    candidateReviewGroupDecisionsByStatus: summarizeCounts(
      Array.from(candidateReviewGroupDecisionsByCatalogId.values()),
      "status",
    ),
    batchReport,
    catalogFormatCoverage: countCatalogFormats(entries),
    missingByPriorityGroup: summarizeCounts(missingRows, "priorityGroup"),
    topMissingByForm: summarizeCounts(missingRows, "form").slice(0, 20),
    topMissingByMakam: summarizeCounts(missingRows, "makam").slice(0, 20),
    topMissingByUsul: summarizeCounts(missingRows, "usul").slice(0, 20),
    nextBatchSize: nextBatchRows.length,
    nextBatchCatalogIds: nextBatchRows.map((row) => row.catalogId),
    deferredCatalogIds: deferredRows.map((row) => row.catalogId),
    backlogCsv: toProjectPath(path.relative(root, csvPath)),
    backlogJson: toProjectPath(path.relative(root, backlogJsonPath)),
    nextBatchCsv: toProjectPath(path.relative(root, nextBatchCsvPath)),
    nextBatchJson: toProjectPath(path.relative(root, nextBatchJsonPath)),
    bulkCandidatesCsv: toProjectPath(path.relative(root, bulkCandidatesCsvPath)),
    bulkCandidatesJson: toProjectPath(path.relative(root, bulkCandidatesJsonPath)),
    candidateReviewQueueCsv: toProjectPath(path.relative(root, candidateReviewCsvPath)),
    candidateReviewQueueJson: toProjectPath(path.relative(root, candidateReviewJsonPath)),
    candidateReviewGroupsCsv: toProjectPath(path.relative(root, candidateReviewGroupCsvPath)),
    candidateReviewGroupsJson: toProjectPath(path.relative(root, candidateReviewGroupJsonPath)),
    candidateReviewGroupDecisionRecommendationsJson: toProjectPath(
      path.relative(root, candidateReviewGroupRecommendationJsonPath),
    ),
    coverageMatrixJson: toProjectPath(path.relative(root, coverageMatrixJsonPath)),
    dedupeReportJson: toProjectPath(path.relative(root, dedupeReportJsonPath)),
    candidateReviewGroupDecisionsJson: toProjectPath(path.relative(root, paths.candidateReviewGroupDecisions)),
    policy:
      "No media is downloaded. Safe inline preview/embed is allowed only for validated HTTPS sources with provider-specific verification, sandbox, lazy loading and fallback links.",
    curationRule:
      "Entries are prioritized by missing curated references, catalog-reported PDF/MusicXML/TXT source formats, named title/composer fields, and common form/usul groups. Search URLs are generated for review only; they are not evidence by themselves.",
    nextBatchRule:
      "Rows with needs-disambiguation, source-mismatch, or deferred curation decisions remain in the backlog but are skipped from the next manual batch.",
    bulkCandidateRule:
      "Accepted bulk candidates are counted as curated references only after catalog id, source URL policy, duplicate identity, status, and date checks pass.",
    candidateReviewRule:
      "Provider-profile search candidates are review queue entries, not source evidence; they stay needs-review or conflict until a validated source URL is imported and accepted.",
    candidateReviewGroupDecisionRule:
      "Review group decisions and recommendations may mark generated groups rejected, conflict, or deferred in batch; they never create accepted sources or auto-attach without a validated source URL.",
  };

  writeFileSync(path.join(safeOutDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  return summary;
}

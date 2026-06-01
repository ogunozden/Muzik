import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

export const DEFAULT_OUT_DIR = "output/external-reference-coverage";
export const DEFAULT_BATCH_SIZE = 100;

const OFFICIAL_ZENODO_URL = "https://zenodo.org/records/15470412";
const OFFICIAL_GITHUB_URL = "https://github.com/MTG/SymbTr";
const ALLOWED_CURATION_DECISION_STATUSES = new Set(["needs-disambiguation", "source-mismatch", "deferred"]);
const NEXT_BATCH_DEFER_STATUSES = new Set(["needs-disambiguation", "source-mismatch", "deferred"]);
const ALLOWED_BULK_CANDIDATE_STATUSES = new Set(["accepted", "needs-review", "rejected", "conflict"]);
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

function buildProfileSearchQuery(row, profile) {
  const suffix = profile.provider === "youtube" ? "icra kayıt" : "nota";
  return [row.makam, row.form, row.usul, row.title, row.composer, suffix].filter((part) => part && part !== "-").join(" ");
}

function buildProfileSearchUrl(profile, query) {
  return String(profile.searchUrlTemplate).replace("{query}", encodeURIComponent(query));
}

function getCandidateReviewStatus(row) {
  if (row.curationDecisionStatus === "source-mismatch") return "conflict";
  return "needs-review";
}

function getCandidateReviewReason(row) {
  if (row.curationDecisionStatus) {
    return row.curationDecisionReason || row.curationDecisionStatus;
  }

  return "provider-profile-search-candidate";
}

function getCandidateReviewScoreDetails(row, profile) {
  const trustWeight = Number(profile.trustWeight ?? 0.5);
  let score = Math.round(trustWeight * 70);
  const reasons = [`profile-trust:${trustWeight.toFixed(2)}`];
  if (profile.metadataStrategy && profile.metadataStrategy !== "none") {
    score += profile.metadataStrategy === "oembed" ? 6 : 4;
    reasons.push(`metadata-strategy:${profile.metadataStrategy}`);
  }
  if (row.hasPdf) {
    score += 8;
    reasons.push("catalog-format:pdf");
  }
  if (row.hasMusicXml) {
    score += 6;
    reasons.push("catalog-format:musicxml");
  }
  if (row.hasTxt) {
    score += 4;
    reasons.push("catalog-format:txt");
  }
  if (row.title && row.title !== "-") {
    score += 6;
    reasons.push("catalog-field:title");
  }
  if (row.composer && row.composer !== "-") {
    score += 6;
    reasons.push("catalog-field:composer");
  }
  if (row.usul && row.usul !== "-") {
    reasons.push("catalog-field:usul");
  }
  if (row.deferredFromNextBatch) {
    score -= 20;
    reasons.push("decision:deferred-penalty");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

function getCandidateReviewLevel(score) {
  if (score >= 80) return "medium";
  if (score >= 55) return "low";
  return "needs-context";
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

export function buildCandidateReviewRows(backlogRows, researchProfiles) {
  const missingRows = backlogRows.filter((row) => row.missingCuratedReference);
  const rows = [];

  for (const row of missingRows) {
    for (const profile of researchProfiles) {
      const searchQuery = buildProfileSearchQuery(row, profile);
      const scoreDetails = getCandidateReviewScoreDetails(row, profile);
      const queryFields = ["makam", "form", "usul", "title", "composer"].filter((field) => row[field] && row[field] !== "-");

      rows.push({
        candidateId: `${row.catalogId}:${profile.id}:search`,
        catalogId: row.catalogId,
        status: getCandidateReviewStatus(row),
        statusReason: getCandidateReviewReason(row),
        profileId: profile.id,
        profileLabel: profile.label,
        provider: profile.provider ?? "score",
        trustWeight: profile.trustWeight ?? 0,
        metadataStrategy: profile.metadataStrategy ?? "none",
        reviewConfidenceScore: scoreDetails.score,
        reviewConfidenceLevel: getCandidateReviewLevel(scoreDetails.score),
        scoreReasons: scoreDetails.reasons,
        queryFields,
        searchQuery,
        searchUrl: buildProfileSearchUrl(profile, searchQuery),
        makam: row.makam,
        form: row.form,
        usul: row.usul,
        title: row.title,
        composer: row.composer,
        priorityGroup: row.priorityGroup,
        deferredFromNextBatch: row.deferredFromNextBatch,
        curationDecisionStatus: row.curationDecisionStatus,
      });
    }
  }

  return rows.sort((left, right) => (
    left.status.localeCompare(right.status, "en") ||
    right.reviewConfidenceScore - left.reviewConfidenceScore ||
    left.profileId.localeCompare(right.profileId, "en") ||
    left.catalogId.localeCompare(right.catalogId, "en")
  ));
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
  const rows = buildBacklogRows(entries, curatedCatalogIds, curationDecisionsByCatalogId);
  const missingRows = rows.filter((row) => row.missingCuratedReference);
  const deferredRows = missingRows.filter((row) => row.deferredFromNextBatch);
  const nextBatchRows = missingRows.filter((row) => !row.deferredFromNextBatch).slice(0, batchSize);
  const bulkCandidateRows = buildBulkCandidateRows(bulkCandidates);
  const candidateReviewRows = buildCandidateReviewRows(rows, researchProfiles);
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
  writeFileSync(csvPath, renderCsv(rows));
  writeFileSync(backlogJsonPath, `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(nextBatchCsvPath, renderCsv(nextBatchRows));
  writeFileSync(nextBatchJsonPath, `${JSON.stringify(nextBatchRows, null, 2)}\n`);
  writeFileSync(bulkCandidatesCsvPath, renderBulkCandidateCsv(bulkCandidateRows));
  writeFileSync(bulkCandidatesJsonPath, `${JSON.stringify(bulkCandidateRows, null, 2)}\n`);
  writeFileSync(candidateReviewCsvPath, renderCandidateReviewCsv(candidateReviewRows));
  writeFileSync(candidateReviewJsonPath, `${JSON.stringify(candidateReviewRows, null, 2)}\n`);

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
    candidateReviewQueryFields: ["makam", "form", "usul", "title", "composer"],
    candidateReviewScoringSignals: ["profile-trust", "profile-metadata-strategy", "catalog-formats", "catalog-fields", "curation-decision"],
    duplicateAcceptedIdentityPolicy: "duplicate accepted URL identities fail validation before merge",
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
    ],
  };

  const summary = {
    totalCatalogEntries: rows.length,
    officialSymbTrMetadataEntries: rows.length,
    curatedReferenceEntries: rows.length - missingRows.length,
    missingCuratedEntries: missingRows.length,
    curationDecisionEntries: curationDecisionsByCatalogId.size,
    deferredMissingEntries: deferredRows.length,
    bulkCandidateEntries: bulkCandidates.length,
    acceptedBulkCandidateEntries: acceptedBulkCandidates.length,
    acceptedBulkCandidateCatalogIds: acceptedBulkCandidates.map((candidate) => candidate.catalogId),
    researchSourceProfileEntries: researchProfiles.length,
    candidateReviewQueueEntries: candidateReviewRows.length,
    candidateReviewQueueByStatus: summarizeCounts(candidateReviewRows, "status"),
    candidateReviewQueueByProfile: summarizeCounts(candidateReviewRows, "profileId"),
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
  };

  writeFileSync(path.join(safeOutDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  return summary;
}

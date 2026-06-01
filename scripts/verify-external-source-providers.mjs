import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runImport} from "./import-external-reference-candidates.mjs";
import {buildDiscoveryIdentity, buildCatalogSearchQuery} from "./discovery/query-builder.mjs";
import {normalizeText, slugify} from "./lib/external-source-matcher.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_COVERAGE_DIR = "output/external-reference-coverage";
const DEFAULT_OUT_DIR = "output/external-source-discovery";
const DEFAULT_POLICY_PATH = "src/data/references/external-source-discovery-policy.json";
const DEFAULT_PROVIDER = "internet-archive";
const DEFAULT_LIMIT = 25;
const DEFAULT_CHECKED_AT = "2026-06-01";
const INTERNET_ARCHIVE_ADVANCED_SEARCH_URL = "https://archive.org/advancedsearch.php";

function resolveProjectPath(projectPath, label) {
  const filePath = path.resolve(PROJECT_ROOT, projectPath);
  const relative = path.relative(PROJECT_ROOT, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to use ${label} outside project: ${filePath}`);
  }
  return filePath;
}

function readJson(projectPath, label, fallback = null) {
  const filePath = resolveProjectPath(projectPath, label);
  if (!existsSync(filePath)) {
    if (fallback !== null) return fallback;
    throw new Error(`${label} missing: ${projectPath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(projectPath, value) {
  const filePath = resolveProjectPath(projectPath, "provider verification artifact");
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseCliOptions(args) {
  const options = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      options.set(key, next);
      index += 1;
    } else {
      options.set(key, "true");
    }
  }
  return options;
}

function toProjectPath(projectPath) {
  return path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, projectPath)).split(path.sep).join("/");
}

function tokenCoverage(needle, haystack) {
  const needleTokens = normalizeText(needle).split(" ").filter((token) => token.length > 1);
  if (needleTokens.length === 0) return 0;
  const haystackText = normalizeText(haystack);
  const matched = needleTokens.filter((token) => haystackText.includes(token)).length;
  return matched / needleTokens.length;
}

function providerPolicy(policy, providerId) {
  const provider = (policy.providers ?? []).find((candidate) => candidate.id === providerId);
  if (!provider) throw new Error(`Unknown provider in discovery policy: ${providerId}`);
  if (provider.enabled === false) throw new Error(`Provider is disabled in discovery policy: ${providerId}`);
  return provider;
}

function buildArchiveSearchUrl(group, rows) {
  const params = new URLSearchParams();
  params.set("q", [group.title, group.composer, group.makam, group.form, group.usul].filter(Boolean).join(" "));
  params.set("output", "json");
  params.set("rows", String(rows));
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "creator");
  params.append("fl[]", "description");
  params.append("fl[]", "mediatype");
  params.append("fl[]", "collection");
  params.append("fl[]", "date");
  return `${INTERNET_ARCHIVE_ADVANCED_SEARCH_URL}?${params.toString()}`;
}

async function fetchJson(url, {timeoutMs, maxResponseBytes}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {"user-agent": "MuzikExternalSourceVerifier/1.0 (+local dry-run curation)"},
    });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > maxResponseBytes) {
      throw new Error(`response too large: ${contentLength}`);
    }
    const text = await response.text();
    if (text.length > maxResponseBytes) {
      throw new Error(`response body too large: ${text.length}`);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

function scoreArchiveDoc(group, doc) {
  const title = String(doc.title ?? "");
  const creator = Array.isArray(doc.creator) ? doc.creator.join(" ") : String(doc.creator ?? "");
  const description = String(doc.description ?? "");
  const mediatype = String(doc.mediatype ?? "");
  const text = [title, creator, description, doc.identifier].join(" ");
  const titleCoverage = tokenCoverage(group.title, text);
  const composerCoverage = tokenCoverage(group.composer, text);
  const makamCoverage = tokenCoverage(group.makam, text);
  const usulCoverage = tokenCoverage(group.usul, text);
  const formCoverage = tokenCoverage(group.form, text);
  const metadataScore = Math.round(
    titleCoverage * 50
    + composerCoverage * 25
    + makamCoverage * 10
    + usulCoverage * 10
    + formCoverage * 5,
  );
  const completeEvidence = titleCoverage >= 0.9 && composerCoverage >= 0.75 && (makamCoverage >= 0.5 || usulCoverage >= 0.5);

  return {
    score: Math.min(100, metadataScore),
    titleCoverage,
    composerCoverage,
    makamCoverage,
    usulCoverage,
    formCoverage,
    completeEvidence,
    reasons: [
      titleCoverage >= 0.9 ? "archive-title-token-match" : "archive-title-incomplete",
      composerCoverage >= 0.75 ? "archive-creator-token-match" : "archive-creator-incomplete",
      makamCoverage >= 0.5 ? "archive-makam-signal" : "",
      usulCoverage >= 0.5 ? "archive-usul-signal" : "",
      formCoverage >= 0.5 ? "archive-form-signal" : "",
      mediatype ? `archive-mediatype:${mediatype}` : "",
    ].filter(Boolean),
  };
}

function buildAcceptedCandidate({group, doc, checkedAt, score}) {
  const sourceId = slugify(["archive", doc.identifier, group.catalog?.title].filter(Boolean).join(" ")).split("-").slice(0, 12).join("-");
  return {
    catalogId: group.catalogId,
    status: "accepted",
    checkedAt,
    evidence: {
      complete: true,
      providerVerification: "internet-archive-advancedsearch-metadata",
      score,
    },
    source: {
      id: sourceId,
      label: "Internet Archive kaynağı",
      provider: "archive",
      url: `https://archive.org/details/${doc.identifier}`,
      title: doc.title,
      author: Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator,
      metadata: {
        htmlTitle: doc.title,
        htmlAuthor: Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator,
        signals: ["internet-archive:advancedsearch", `internet-archive:identifier:${doc.identifier}`],
      },
      access: "external-link",
      verification: "provider-metadata",
      verifiedAt: checkedAt,
      notes: "Accepted-ready only after Internet Archive structured metadata matches catalog fields and import dry-run passes.",
    },
  };
}

async function verifyInternetArchiveGroup({group, provider, checkedAt, timeoutMs, maxResponseBytes, rows, cache}) {
  const query = buildCatalogSearchQuery(group);
  const cacheKey = buildDiscoveryIdentity(group.catalogId, provider.id, query);
  const cached = cache.entries?.[cacheKey];
  if (cached) return {...cached, cacheHit: true};

  const searchUrl = buildArchiveSearchUrl(group, rows);
  const fetched = await fetchJson(searchUrl, {timeoutMs, maxResponseBytes});
  const docs = Array.isArray(fetched?.response?.docs) ? fetched.response.docs : [];
  const scored = docs.map((doc) => ({
    identifier: doc.identifier,
    title: doc.title,
    creator: doc.creator,
    mediatype: doc.mediatype,
    collection: doc.collection,
    date: doc.date,
    sourceUrl: doc.identifier ? `https://archive.org/details/${doc.identifier}` : null,
    confidence: scoreArchiveDoc(group, doc),
  })).sort((left, right) => right.confidence.score - left.confidence.score);
  const best = scored[0] ?? null;
  const acceptedReady = Boolean(best?.identifier && best.confidence.completeEvidence && best.confidence.score >= 92);
  const result = {
    cacheKey,
    cacheHit: false,
    catalogId: group.catalogId,
    providerProfileId: provider.id,
    connector: provider.connector,
    status: acceptedReady ? "accepted-ready" : scored.length > 0 ? "needs-review" : "rejected",
    statusReason: acceptedReady ? "provider-metadata-complete" : scored.length > 0 ? "provider-metadata-incomplete" : "no-provider-result",
    checkedAt,
    searchQuery: query,
    searchUrl,
    resultCount: scored.length,
    best,
    candidates: scored.slice(0, rows),
    catalog: {
      makam: group.makam,
      form: group.form,
      usul: group.usul,
      title: group.title,
      composer: group.composer,
      priorityGroup: group.priorityGroup,
    },
    safety: {
      directAutoAttach: false,
      mediaDownload: false,
      sourceContentCopied: false,
    },
  };
  cache.entries = {...(cache.entries ?? {}), [cacheKey]: result};
  return result;
}

export async function runProviderVerification({
  providerId = DEFAULT_PROVIDER,
  limit = DEFAULT_LIMIT,
  rows = 3,
  checkedAt = DEFAULT_CHECKED_AT,
  coverageDir = DEFAULT_COVERAGE_DIR,
  outDir = DEFAULT_OUT_DIR,
  policyPath = DEFAULT_POLICY_PATH,
} = {}) {
  const policy = readJson(policyPath, "discovery policy");
  const provider = providerPolicy(policy, providerId);
  if (provider.id !== "internet-archive") {
    throw new Error(`Provider verification connector is not implemented yet: ${provider.id}`);
  }
  const groups = readJson(path.join(coverageDir, "symbtr-curated-reference-candidate-review-groups.json"), "candidate review groups")
    .filter((group) => group.status === "needs-review");
  const selectedGroups = groups.slice(0, Math.max(0, limit));
  const generatedAt = `${checkedAt}T00:00:00.000Z`;
  const cachePath = path.join(outDir, "provider-verification-cache.json");
  const cache = readJson(cachePath, "provider verification cache", {version: 1, entries: {}});
  const evidence = [];
  const warnings = [];

  for (const group of selectedGroups) {
    try {
      evidence.push(await verifyInternetArchiveGroup({
        group,
        provider,
        checkedAt,
        timeoutMs: Number(policy.timeoutMs ?? 8000),
        maxResponseBytes: Number(policy.maxResponseBytes ?? 262144),
        rows,
        cache,
      }));
    } catch (error) {
      warnings.push(`${group.catalogId}: ${error instanceof Error ? error.message : String(error)}`);
      evidence.push({
        catalogId: group.catalogId,
        providerProfileId: provider.id,
        connector: provider.connector,
        status: "deferred",
        statusReason: "provider-request-failed",
        checkedAt,
        resultCount: 0,
        best: null,
        candidates: [],
        safety: {directAutoAttach: false, mediaDownload: false, sourceContentCopied: false},
      });
    }
  }

  const acceptedReady = evidence
    .filter((row) => row.status === "accepted-ready" && row.best?.identifier)
    .map((row) => buildAcceptedCandidate({group: row, doc: row.best, checkedAt, score: row.best.confidence.score}));
  const acceptedManifest = {
    version: 1,
    type: "external-source-provider-verification-accepted-import-ready",
    generatedAt,
    dryRun: true,
    importContract: {
      directAutoAttach: false,
      targetScript: "npm run import:external-references -- --input output/external-source-discovery/provider-verification-accepted-import-ready.json --dry-run",
      acceptedOnlyAfterValidation: true,
    },
    summary: {
      acceptedReadyCount: acceptedReady.length,
      directAutoAttachCount: 0,
      providerProfileId: provider.id,
    },
    candidates: acceptedReady,
  };
  writeJson(cachePath, cache);
  writeJson(path.join(outDir, "provider-verification-evidence.json"), {
    version: 1,
    type: "external-source-provider-verification-evidence",
    generatedAt,
    providerProfileId: provider.id,
    evidence,
  });
  writeJson(path.join(outDir, "provider-verification-accepted-import-ready.json"), acceptedManifest);

  let acceptedImportDryRun = null;
  try {
    acceptedImportDryRun = runImport({
      root: PROJECT_ROOT,
      inputPath: path.join(outDir, "provider-verification-accepted-import-ready.json"),
      dryRun: true,
    });
  } catch (error) {
    warnings.push(`accepted import dry-run failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const run = {
    version: 1,
    type: "external-source-provider-verification-run",
    policyVersion: policy.policyVersion,
    generatedAt,
    ok: true,
    dryRun: true,
    providerProfileId: provider.id,
    connector: provider.connector,
    checkedAt,
    processedGroupCount: selectedGroups.length,
    totalEligibleGroupCount: groups.length,
    resultCount: evidence.reduce((sum, row) => sum + Number(row.resultCount ?? 0), 0),
    acceptedReadyCount: acceptedReady.length,
    needsReviewCount: evidence.filter((row) => row.status === "needs-review").length,
    rejectedCount: evidence.filter((row) => row.status === "rejected").length,
    deferredCount: evidence.filter((row) => row.status === "deferred").length,
    cacheHitCount: evidence.filter((row) => row.cacheHit).length,
    directAutoAttachCount: 0,
    mediaDownloadCount: 0,
    sourceContentCopiedCount: 0,
    warnings,
    artifacts: {
      evidence: toProjectPath(path.join(outDir, "provider-verification-evidence.json")),
      acceptedImportReady: toProjectPath(path.join(outDir, "provider-verification-accepted-import-ready.json")),
      cache: toProjectPath(cachePath),
    },
    acceptedImportDryRun,
    source: {
      documentation: "https://doc-tools.readthedocs.io/en/ia-test-gsod/item-search-apis.html",
      endpoint: INTERNET_ARCHIVE_ADVANCED_SEARCH_URL,
    },
  };
  writeJson(path.join(outDir, "provider-verification-run.json"), run);
  return run;
}

export async function runCli(args = process.argv.slice(2)) {
  const options = parseCliOptions(args);
  return runProviderVerification({
    providerId: options.get("provider") ?? DEFAULT_PROVIDER,
    limit: Number(options.get("limit") ?? DEFAULT_LIMIT),
    rows: Number(options.get("rows") ?? 3),
    checkedAt: options.get("checked-at") ?? DEFAULT_CHECKED_AT,
    coverageDir: options.get("coverage-dir") ?? DEFAULT_COVERAGE_DIR,
    outDir: options.get("out-dir") ?? DEFAULT_OUT_DIR,
    policyPath: options.get("policy") ?? DEFAULT_POLICY_PATH,
  });
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  runCli()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
      if (!summary.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

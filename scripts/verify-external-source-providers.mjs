import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runImport} from "./import-external-reference-candidates.mjs";
import {buildDiscoveryIdentity, buildCatalogSearchQuery} from "./discovery/query-builder.mjs";
import {normalizeText, slugify} from "./lib/external-source-matcher.mjs";
import {buildArchiveSearchUrlWithStrategy, findBestStrategy} from "./lib/strategy-engine.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_COVERAGE_DIR = "output/external-reference-coverage";
const DEFAULT_OUT_DIR = "output/external-source-discovery";
const DEFAULT_POLICY_PATH = "src/data/references/external-source-discovery-policy.json";
const DEFAULT_PROVIDER = "internet-archive";
const DEFAULT_LIMIT = "25";
const DEFAULT_CHECKED_AT = "2026-06-01";
const DEFAULT_STATUSES = ["needs-review", "deferred", "conflict"];
const RATE_LIMIT_DISABLED_VALUES = new Set(["0", "false", "off", "no"]);
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

function parseLimit(value) {
  if (value === "all" || value === "unbounded") return Number.POSITIVE_INFINITY;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid provider verification limit: ${value}`);
  }
  return parsed;
}

function parseCsv(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeProviderId(providerId) {
  return providerId === "youtube" ? "youtube-oembed" : providerId;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceProviderRateLimit(provider, state, enabled) {
  if (!enabled) return;
  const perSecond = Number(provider.rateLimitPerSecond ?? 0);
  if (!Number.isFinite(perSecond) || perSecond <= 0) return;
  const intervalMs = Math.ceil(1000 / perSecond);
  const lastRequestAt = state.lastRequestAtByProvider.get(provider.id) ?? 0;
  const waitMs = Math.max(0, intervalMs - (Date.now() - lastRequestAt));
  if (waitMs > 0) await sleep(waitMs);
  state.lastRequestAtByProvider.set(provider.id, Date.now());
}

function tokenCoverage(needle, haystack) {
  const needleTokens = normalizeText(needle).split(" ").filter((token) => token.length > 1);
  if (needleTokens.length === 0) return 0;
  const haystackText = normalizeText(haystack);
  const matched = needleTokens.filter((token) => haystackText.includes(token)).length;
  return matched / needleTokens.length;
}

function providerPolicy(policy, providerId) {
  const normalizedProviderId = normalizeProviderId(providerId);
  const provider = (policy.providers ?? []).find((candidate) => candidate.id === normalizedProviderId);
  if (!provider) throw new Error(`Unknown provider in discovery policy: ${normalizedProviderId}`);
  if (provider.enabled === false) throw new Error(`Provider is disabled in discovery policy: ${providerId}`);
  return provider;
}

function providerPolicies(policy, providerOption) {
  const providerIds = parseCsv(providerOption, [DEFAULT_PROVIDER]).map(normalizeProviderId);
  if (providerIds.includes("all")) {
    return (policy.providers ?? []).filter((provider) => provider.enabled !== false);
  }
  return providerIds.map((providerId) => providerPolicy(policy, providerId));
}

function sortGroupsForVerification(groups) {
  const statusRank = new Map([["needs-review", 0], ["deferred", 1], ["conflict", 2]]);
  return [...groups].sort((left, right) => {
    const statusDelta = (statusRank.get(left.status) ?? 9) - (statusRank.get(right.status) ?? 9);
    if (statusDelta !== 0) return statusDelta;
    return String(left.catalogId).localeCompare(String(right.catalogId));
  });
}

function buildArchiveSearchUrl(group, rows) {
  return buildArchiveSearchUrlWithStrategy(group, rows, "internet-archive");
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

async function verifyInternetArchiveGroup({group, provider, checkedAt, timeoutMs, maxResponseBytes, rows, cache, rateLimitState, respectRateLimit}) {
  const query = buildCatalogSearchQuery(group);
  const cacheKey = buildDiscoveryIdentity(group.catalogId, provider.id, query);
  const cached = cache.entries?.[cacheKey];
  if (cached) return {...cached, cacheHit: true};

  const searchUrl = buildArchiveSearchUrl(group, rows);
  await enforceProviderRateLimit(provider, rateLimitState, respectRateLimit);
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
    networkRequest: true,
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

function buildDeferredProviderResult({group, provider, checkedAt, reason, candidate = null}) {
  const query = buildCatalogSearchQuery(group);
  return {
    cacheKey: buildDiscoveryIdentity(group.catalogId, provider.id, `${query}:${reason}`),
    cacheHit: false,
    catalogId: group.catalogId,
    providerProfileId: provider.id,
    connector: provider.connector,
    status: "deferred",
    statusReason: reason,
    checkedAt,
    searchQuery: query,
    searchUrl: candidate?.searchUrl ?? null,
    resultCount: 0,
    best: null,
    candidates: candidate ? [candidate] : [],
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
}

function discoveryCandidateLookup(candidates) {
  const lookup = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.catalogId}:${candidate.providerProfileId}`;
    if (!lookup.has(key)) lookup.set(key, candidate);
  }
  return lookup;
}

async function verifyProviderGroup({
  group,
  provider,
  checkedAt,
  timeoutMs,
  maxResponseBytes,
  rows,
  cache,
  discoveryLookup,
  rateLimitState,
  respectRateLimit,
}) {
  if (group.status !== "needs-review") {
    return buildDeferredProviderResult({
      group,
      provider,
      checkedAt,
      reason: `${group.status}-group-decision-not-auto-verifiable`,
      candidate: discoveryLookup.get(`${group.catalogId}:${provider.id}`),
    });
  }

  if (provider.id === "internet-archive") {
    return verifyInternetArchiveGroup({
      group,
      provider,
      checkedAt,
      timeoutMs,
      maxResponseBytes,
      rows,
      cache,
      rateLimitState,
      respectRateLimit,
    });
  }

  return buildDeferredProviderResult({
    group,
    provider,
    checkedAt,
    reason: `${provider.connector}-requires-validated-source-url-before-metadata-probe`,
    candidate: discoveryLookup.get(`${group.catalogId}:${provider.id}`),
  });
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row) ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || String(left.value).localeCompare(String(right.value)));
}

function buildProviderCoverage({groups, providers, evidence, cache, generatedAt, policy}) {
  const groupIds = new Set(groups.map((group) => group.catalogId));
  const cacheEntries = Object.values(cache.entries ?? {});
  const byProvider = providers.map((provider) => {
    const currentRows = evidence.filter((row) => row.providerProfileId === provider.id);
    const cachedRows = cacheEntries.filter((row) => row.providerProfileId === provider.id && groupIds.has(row.catalogId));
    const cachedGroupCount = new Set(cachedRows.map((row) => row.catalogId)).size;
    const deterministicDeferred = provider.id === "internet-archive" ? 0 : groups.length;
    const verifiedOrClassifiedGroupCount = provider.id === "internet-archive" ? cachedGroupCount : deterministicDeferred;
    return {
      providerProfileId: provider.id,
      connector: provider.connector,
      rateLimitPerSecond: provider.rateLimitPerSecond ?? null,
      totalEligibleGroupCount: groups.length,
      verifiedOrClassifiedGroupCount,
      remainingGroupCount: Math.max(0, groups.length - verifiedOrClassifiedGroupCount),
      currentBatchPacketCount: currentRows.length,
      currentBatchStatusCounts: countBy(currentRows, (row) => row.status),
      cachedGroupCount,
      deterministicDeferredGroupCount: deterministicDeferred,
      networkRequestCount: currentRows.filter((row) => row.networkRequest).length,
      cacheHitCount: currentRows.filter((row) => row.cacheHit).length,
      acceptedReadyCount: currentRows.filter((row) => row.status === "accepted-ready").length,
    };
  });
  return {
    version: 1,
    type: "external-source-provider-verification-coverage",
    generatedAt,
    dryRun: true,
    policyVersion: policy.policyVersion,
    totalBacklogGroupCount: groups.length,
    providerProfileIds: providers.map((provider) => provider.id),
    providerCount: providers.length,
    fullyClassifiedProviderCount: byProvider.filter((row) => row.remainingGroupCount === 0).length,
    networkProviderRemainingGroupCount: byProvider
      .filter((row) => row.providerProfileId === "internet-archive")
      .reduce((sum, row) => sum + row.remainingGroupCount, 0),
    byProvider,
    safety: {
      directAutoAttachCount: 0,
      mediaDownloadCount: 0,
      sourceContentCopiedCount: 0,
      searchOnlyCandidatesAccepted: 0,
    },
  };
}

export async function runProviderVerification({
  providerId = DEFAULT_PROVIDER,
  limit = DEFAULT_LIMIT,
  offset = 0,
  statuses = DEFAULT_STATUSES,
  rows = 3,
  checkedAt = DEFAULT_CHECKED_AT,
  coverageDir = DEFAULT_COVERAGE_DIR,
  outDir = DEFAULT_OUT_DIR,
  policyPath = DEFAULT_POLICY_PATH,
  respectRateLimit = true,
} = {}) {
  const policy = readJson(policyPath, "discovery policy");
  const providers = providerPolicies(policy, providerId);
  const allowedStatuses = new Set(statuses);
  const groups = sortGroupsForVerification(
    readJson(path.join(coverageDir, "symbtr-curated-reference-candidate-review-groups.json"), "candidate review groups")
      .filter((group) => allowedStatuses.has(group.status)),
  );
  const parsedLimit = parseLimit(limit);
  const parsedOffset = Math.max(0, Number(offset) || 0);
  const selectedGroups = groups.slice(
    parsedOffset,
    Number.isFinite(parsedLimit) ? parsedOffset + parsedLimit : undefined,
  );
  const timeoutMs = Number(policy.timeoutMs ?? 8000);
  const maxResponseBytes = Number(policy.maxResponseBytes ?? 262144);

  if (parsedOffset === 0 && providers.some((p) => p.id === "internet-archive")) {
    try {
      const catalogIds = groups.map((g) => g.catalogId);
      await findBestStrategy(providers.map((p) => [p.id, p]), catalogIds, rows, { timeoutMs, maxResponseBytes });
    } catch (error) {
      warnings.push(`strategy-discovery: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const discoveryCandidates = readJson(path.join(outDir, "discovery-candidates.json"), "source discovery candidates", {candidates: []});
  const discoveryLookup = discoveryCandidateLookup(Array.isArray(discoveryCandidates) ? discoveryCandidates : discoveryCandidates.candidates ?? []);
  const generatedAt = `${checkedAt}T00:00:00.000Z`;
  const cachePath = path.join(outDir, "provider-verification-cache.json");
  const cache = readJson(cachePath, "provider verification cache", {version: 1, entries: {}});
  const evidence = [];
  const warnings = [];
  const rateLimitState = {lastRequestAtByProvider: new Map()};

  for (const provider of providers) {
    for (const group of selectedGroups) {
      try {
        evidence.push(await verifyProviderGroup({
          group,
          provider,
          checkedAt,
          timeoutMs,
          maxResponseBytes,
          rows,
          cache,
          discoveryLookup,
          rateLimitState,
          respectRateLimit,
        }));
      } catch (error) {
        warnings.push(`${provider.id}:${group.catalogId}: ${error instanceof Error ? error.message : String(error)}`);
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
      providerProfileIds: providers.map((provider) => provider.id),
    },
    candidates: acceptedReady,
  };
  const coverage = buildProviderCoverage({groups, providers, evidence, cache, generatedAt, policy});
  const internetArchiveCoverage = coverage.byProvider.find((row) => row.providerProfileId === "internet-archive");
  const nextOffset = Number.isFinite(parsedLimit)
    ? Math.max(parsedOffset + parsedLimit, Number(internetArchiveCoverage?.verifiedOrClassifiedGroupCount ?? 0))
    : groups.length;
  writeJson(cachePath, cache);
  writeJson(path.join(outDir, "provider-verification-evidence.json"), {
    version: 1,
    type: "external-source-provider-verification-evidence",
    generatedAt,
    providerProfileIds: providers.map((provider) => provider.id),
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
    providerProfileId: providers.length === 1 ? providers[0].id : "multi-provider",
    providerProfileIds: providers.map((provider) => provider.id),
    connector: providers.length === 1 ? providers[0].connector : "multi-provider-verification",
    checkedAt,
    processedGroupCount: selectedGroups.length,
    verificationPacketCount: evidence.length,
    totalEligibleGroupCount: groups.length,
    totalBacklogGroupCount: readJson(path.join(coverageDir, "symbtr-curated-reference-candidate-review-groups.json"), "candidate review groups").length,
    offset: parsedOffset,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : "all",
    selectedStatuses: [...allowedStatuses],
    providerCount: providers.length,
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
    byProviderProfile: countBy(evidence, (row) => row.providerProfileId),
    byStatus: countBy(evidence, (row) => row.status),
    byStatusReason: countBy(evidence, (row) => row.statusReason),
    artifacts: {
      evidence: toProjectPath(path.join(outDir, "provider-verification-evidence.json")),
      acceptedImportReady: toProjectPath(path.join(outDir, "provider-verification-accepted-import-ready.json")),
      cache: toProjectPath(cachePath),
      plan: toProjectPath(path.join(outDir, "provider-verification-plan.json")),
      coverage: toProjectPath(path.join(outDir, "provider-verification-coverage.json")),
    },
    acceptedImportDryRun,
    source: {
      documentation: "https://doc-tools.readthedocs.io/en/ia-test-gsod/item-search-apis.html",
      endpoint: INTERNET_ARCHIVE_ADVANCED_SEARCH_URL,
    },
  };
  writeJson(path.join(outDir, "provider-verification-plan.json"), {
    version: 1,
    type: "external-source-provider-verification-plan",
    generatedAt,
    dryRun: true,
    policyVersion: policy.policyVersion,
    totalBacklogGroupCount: run.totalBacklogGroupCount,
    totalEligibleGroupCount: run.totalEligibleGroupCount,
    selectedGroupCount: selectedGroups.length,
    providerProfileIds: run.providerProfileIds,
    verificationPacketCount: evidence.length,
    networkRequestCount: evidence.filter((row) => row.networkRequest).length,
    cacheHitCount: evidence.filter((row) => row.cacheHit).length,
    respectRateLimit,
    providerCoverageArtifactPath: toProjectPath(path.join(outDir, "provider-verification-coverage.json")),
    nextBatch: Number.isFinite(parsedLimit) && nextOffset < groups.length
      ? {
          offset: nextOffset,
          command: `npm run verify:external-source-providers -- --provider ${providers.map((provider) => provider.id).join(",")} --offset ${nextOffset} --limit ${parsedLimit}`,
        }
      : null,
    backlogByStatus: countBy(groups, (group) => group.status),
    selectedByStatus: countBy(selectedGroups, (group) => group.status),
    packetByProviderProfile: run.byProviderProfile,
    packetByStatus: run.byStatus,
    safety: {
      directAutoAttachCount: 0,
      mediaDownloadCount: 0,
      sourceContentCopiedCount: 0,
      searchOnlyCandidatesAccepted: 0,
    },
  });
  writeJson(path.join(outDir, "provider-verification-coverage.json"), coverage);
  writeJson(path.join(outDir, "provider-verification-run.json"), run);
  return run;
}

export async function runCli(args = process.argv.slice(2)) {
  const options = parseCliOptions(args);
  return runProviderVerification({
    providerId: options.get("providers") ?? options.get("provider") ?? DEFAULT_PROVIDER,
    limit: options.get("limit") ?? DEFAULT_LIMIT,
    offset: Number(options.get("offset") ?? 0),
    statuses: parseCsv(options.get("statuses"), DEFAULT_STATUSES),
    rows: Number(options.get("rows") ?? 3),
    checkedAt: options.get("checked-at") ?? DEFAULT_CHECKED_AT,
    coverageDir: options.get("coverage-dir") ?? DEFAULT_COVERAGE_DIR,
    outDir: options.get("out-dir") ?? DEFAULT_OUT_DIR,
    policyPath: options.get("policy") ?? DEFAULT_POLICY_PATH,
    respectRateLimit: !RATE_LIMIT_DISABLED_VALUES.has(String(options.get("respect-rate-limit") ?? "true").toLowerCase()),
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

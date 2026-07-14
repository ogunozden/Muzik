#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CACHE_PATH = "output/external-source-discovery/provider-verification-cache.json";
const DEFAULT_COVERAGE_PATH = "output/external-source-discovery/provider-verification-coverage.json";
const DEFAULT_POLICY_PATH = "src/data/references/external-source-discovery-policy.json";
const DEFAULT_REVIEW_GROUPS_PATH = "output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json";
const DEFAULT_OUTPUT = "output/prod-closure/source-terminal-decisions.json";

function parseArgs(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options.set(key, next);
      index += 1;
    } else {
      options.set(key, "true");
    }
  }
  return options;
}

function resolveProjectPath(projectPath, label) {
  const filePath = path.resolve(PROJECT_ROOT, projectPath);
  const relative = path.relative(PROJECT_ROOT, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to use ${label} outside project: ${filePath}`);
  }
  return filePath;
}

function readJson(projectPath, label) {
  const filePath = resolveProjectPath(projectPath, label);
  if (!existsSync(filePath)) throw new Error(`${label} missing: ${projectPath}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(projectPath, value) {
  const filePath = resolveProjectPath(projectPath, "source terminal decisions output");
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function groupCacheEntries(cacheData) {
  const grouped = new Map();
  for (const entry of Object.values(cacheData?.entries ?? {})) {
    const catalogId = entry?.catalogId;
    if (!catalogId) continue;
    if (!grouped.has(catalogId)) grouped.set(catalogId, []);
    grouped.get(catalogId).push(entry);
  }
  return grouped;
}

function enabledPolicyProviders(policyData) {
  return (policyData?.providers ?? []).filter((provider) => provider.enabled !== false);
}

function providerProfileIdsFromPolicy(policyData, coverageData) {
  const policyProviderIds = enabledPolicyProviders(policyData).map((provider) => provider.id);
  return policyProviderIds.length > 0 ? policyProviderIds : (coverageData?.providerProfileIds ?? []);
}

function deterministicProviderEntries(coverageData, policyData) {
  const coverageEntries = (coverageData?.byProvider ?? [])
    .filter((row) => Number(row.remainingGroupCount ?? 0) === 0 && Number(row.deterministicDeferredGroupCount ?? 0) > 0)
    .map((row) => ({
      providerProfileId: row.providerProfileId,
      status: "deferred",
      statusReason: "deterministic-provider-classified-without-accepted-evidence",
      resultCount: 0,
      virtualEvidence: true,
    }));
  const coveredProviderIds = new Set(coverageEntries.map((entry) => entry.providerProfileId));
  const policyEntries = enabledPolicyProviders(policyData)
    .filter((provider) => provider.id !== "internet-archive")
    .filter((provider) => !coveredProviderIds.has(provider.id))
    .map((provider) => ({
      providerProfileId: provider.id,
      status: "deferred",
      statusReason: "policy-provider-search-only-without-accepted-evidence",
      resultCount: 0,
      virtualEvidence: true,
    }));
  return [...coverageEntries, ...policyEntries];
}

function reviewGroupCatalogIds(reviewGroupsData) {
  if (!Array.isArray(reviewGroupsData)) return [];
  return reviewGroupsData
    .map((entry) => entry?.catalogId)
    .filter((catalogId) => typeof catalogId === "string" && catalogId.length > 0);
}

function decideSourceGroup({catalogId, entries, providerProfileIds, decidedAt}) {
  const byProvider = new Map(entries.map((entry) => [entry.providerProfileId, entry]));
  const missingProviders = providerProfileIds.filter((providerId) => !byProvider.has(providerId));
  if (missingProviders.length > 0) return null;

  const acceptedEntry = entries.find((entry) => entry.status === "accepted-ready");
  if (acceptedEntry) {
    return {
      catalogId,
      status: "disputed",
      reason: "Provider verification produced accepted-ready evidence, but import validator remains final authority; keep disputed until accepted import dry-run passes.",
      decidedAt,
      providerResultCount: entries.length,
      acceptedProviderProfileId: acceptedEntry.providerProfileId,
      sourceUrl: acceptedEntry.best?.sourceUrl ?? null,
      importValidationRequired: true,
      directAutoAttach: false,
      mediaDownload: false,
    };
  }

  const needsReviewEntries = entries.filter((entry) => entry.status === "needs-review");
  const status = needsReviewEntries.length > 0 ? "disputed" : "verified-unavailable";
  return {
    catalogId,
    status,
    reason: status === "disputed"
      ? "Provider evidence exists but metadata is incomplete or ambiguous; no accepted source is created."
      : "All configured provider checks for this group completed without accepted evidence.",
    decidedAt,
    providerResultCount: entries.length,
    providerStatuses: entries.map((entry) => ({
      providerProfileId: entry.providerProfileId,
      status: entry.status,
      statusReason: entry.statusReason,
      resultCount: entry.resultCount ?? 0,
    })),
    directAutoAttach: false,
    mediaDownload: false,
  };
}

export function buildSourceTerminalDecisions({
  cacheData,
  coverageData,
  policyData,
  reviewGroupsData,
  generatedAt = new Date().toISOString(),
} = {}) {
  const providerProfileIds = providerProfileIdsFromPolicy(policyData, coverageData);
  const grouped = groupCacheEntries(cacheData);
  const virtualProviderEntries = deterministicProviderEntries(coverageData, policyData);
  const entries = [];

  for (const [catalogId, cacheEntries] of grouped.entries()) {
    const knownProviders = new Set(cacheEntries.map((entry) => entry.providerProfileId));
    const supplementedEntries = [
      ...cacheEntries,
      ...virtualProviderEntries
        .filter((entry) => !knownProviders.has(entry.providerProfileId))
        .map((entry) => ({...entry, catalogId})),
    ];
    const decision = decideSourceGroup({
      catalogId,
      entries: supplementedEntries,
      providerProfileIds,
      decidedAt: generatedAt,
    });
    if (decision) entries.push(decision);
  }

  const decidedCatalogIds = new Set(entries.map((entry) => entry.catalogId));
  for (const catalogId of reviewGroupCatalogIds(reviewGroupsData)) {
    if (decidedCatalogIds.has(catalogId)) continue;
    entries.push({
      catalogId,
      status: "deferred",
      reason: "Configured provider checks did not produce accepted or unavailable evidence for this group; keep it in the user/human-review queue.",
      decidedAt: generatedAt,
      providerResultCount: 0,
      providerStatuses: [],
      directAutoAttach: false,
      mediaDownload: false,
    });
    decidedCatalogIds.add(catalogId);
  }

  entries.sort((left, right) => left.catalogId.localeCompare(right.catalogId, "en"));
  const statusCounts = entries.reduce((counts, entry) => {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
    return counts;
  }, {});

  return {
    version: 1,
    type: "source-terminal-decisions",
    generatedAt,
    policy: "Provider search evidence may close a group as accepted, disputed, or verified-unavailable; it never downloads media or direct-attaches search-only candidates.",
    summary: {
      providerCount: providerProfileIds.length,
      processedCatalogGroupCount: grouped.size,
      reviewGroupCount: reviewGroupCatalogIds(reviewGroupsData).length,
      terminalDecisionGroupCount: entries.length,
      statusCounts,
      directAutoAttachCount: 0,
      mediaDownloadCount: 0,
    },
    entries,
  };
}

export function runSourceTerminalDecisionStaging({
  cachePath = DEFAULT_CACHE_PATH,
  coveragePath = DEFAULT_COVERAGE_PATH,
  policyPath = DEFAULT_POLICY_PATH,
  reviewGroupsPath = DEFAULT_REVIEW_GROUPS_PATH,
  output = DEFAULT_OUTPUT,
} = {}) {
  const payload = buildSourceTerminalDecisions({
    cacheData: readJson(cachePath, "provider verification cache"),
    coverageData: readJson(coveragePath, "provider verification coverage"),
    policyData: readJson(policyPath, "external source discovery policy"),
    reviewGroupsData: readJson(reviewGroupsPath, "candidate review groups"),
  });
  writeJson(output, payload);
  return payload;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const options = parseArgs(process.argv.slice(2));
  const payload = runSourceTerminalDecisionStaging({
    cachePath: options.get("cache") ?? DEFAULT_CACHE_PATH,
    coveragePath: options.get("coverage") ?? DEFAULT_COVERAGE_PATH,
    policyPath: options.get("policy") ?? DEFAULT_POLICY_PATH,
    reviewGroupsPath: options.get("review-groups") ?? DEFAULT_REVIEW_GROUPS_PATH,
    output: options.get("output") ?? DEFAULT_OUTPUT,
  });
  console.log(JSON.stringify({
    output: options.get("output") ?? DEFAULT_OUTPUT,
    ...payload.summary,
  }, null, 2));
}

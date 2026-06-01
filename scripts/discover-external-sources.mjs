import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {getOption, getOptionValues, parseCliOptions} from "./lib/external-source-intake.mjs";
import {buildDiscoveryIdentity, buildProviderSearchUrl, buildCatalogSearchQuery} from "./discovery/query-builder.mjs";
import {getEnabledDiscoveryProviders, getResearchProfileById} from "./discovery/provider-registry.mjs";
import {classifyDiscoveryCandidate, scoreDiscoveryCandidate} from "./discovery/discovery-scorer.mjs";
import {buildNegativeCacheEntry} from "./discovery/discovery-cache.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT_DIR = "output/external-source-discovery";
const DEFAULT_POLICY_PATH = "src/data/references/external-source-discovery-policy.json";
const DEFAULT_COVERAGE_DIR = "output/external-reference-coverage";
const DEFAULT_CHECKED_AT = "2026-06-01";

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
  if (!existsSync(filePath)) {
    throw new Error(`${label} missing: ${projectPath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(projectPath, value) {
  const filePath = resolveProjectPath(projectPath, "discovery artifact");
  const compactArtifacts = new Set([
    "discovery-candidates.json",
    "needs-review-groups.json",
    "negative-cache.json",
  ]);
  const shouldCompact = compactArtifacts.has(path.basename(projectPath));
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, shouldCompact ? 0 : 2)}\n`);
}

function toProjectPath(projectPath) {
  return path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, projectPath)).split(path.sep).join("/");
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row[key] ?? "unknown");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([value, count]) => ({value, count}));
}

function readInputs({coverageDir, policyPath}) {
  return {
    policy: readJson(policyPath, "discovery policy"),
    researchProfiles: readJson("src/data/references/research-source-profiles.json", "research source profiles"),
    coverage: readJson(path.join(coverageDir, "summary.json"), "external reference coverage summary"),
    candidateReviewGroups: readJson(
      path.join(coverageDir, "symbtr-curated-reference-candidate-review-groups.json"),
      "candidate review groups",
    ),
  };
}

function mergeProviderPolicy(policyProvider, researchProfile) {
  return {
    ...researchProfile,
    policy: policyProvider,
    id: policyProvider.id,
    provider: policyProvider.provider ?? researchProfile?.provider,
    label: researchProfile?.label ?? policyProvider.id,
    baseUrl: policyProvider.baseUrl ?? researchProfile?.baseUrl,
    searchUrlTemplate: researchProfile?.searchUrlTemplate,
    trustWeight: researchProfile?.trustWeight ?? 0,
    connector: policyProvider.connector,
    mode: policyProvider.mode,
  };
}

function buildCandidate({group, provider, checkedAt, acceptedThreshold}) {
  const query = buildCatalogSearchQuery(group);
  const confidence = scoreDiscoveryCandidate({provider, group});
  const status = classifyDiscoveryCandidate({group, score: confidence.score, acceptedThreshold});
  const discoveryId = buildDiscoveryIdentity(group.catalogId, provider.id, query);

  return {
    discoveryId,
    catalogId: group.catalogId,
    providerProfileId: provider.id,
    provider: provider.provider,
    connector: provider.connector,
    status,
    statusReason: status === "accepted-ready"
      ? "accepted-ready-requires-import-dry-run"
      : "search-lead-not-source-evidence",
    checkedAt,
    searchQuery: query,
    searchUrl: buildProviderSearchUrl(provider, query),
    confidence,
    evidence: {
      complete: false,
      missing: [
        "validated-https-source-url",
        "provider-metadata",
        "catalog-id-or-deterministic-metadata-match",
        "duplicate-identity-check",
      ],
      signals: ["provider-profile-search-query"],
    },
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

export function runExternalSourceDiscovery({
  outDir = DEFAULT_OUT_DIR,
  coverageDir = DEFAULT_COVERAGE_DIR,
  policyPath = DEFAULT_POLICY_PATH,
  scope = "missing",
  providerIds = [],
  checkedAt = DEFAULT_CHECKED_AT,
} = {}) {
  const {policy, researchProfiles, coverage, candidateReviewGroups} = readInputs({coverageDir, policyPath});
  const researchById = getResearchProfileById(researchProfiles);
  const policyProviders = getEnabledDiscoveryProviders(policy, providerIds);
  const providers = policyProviders.map((provider) => mergeProviderPolicy(provider, researchById.get(provider.id)));
  const acceptedThreshold = Number(policy.acceptedThreshold ?? 92);
  const groups = scope === "missing"
    ? candidateReviewGroups.filter((group) => group.status === "needs-review" || group.status === "conflict" || group.status === "deferred")
    : candidateReviewGroups;
  const candidates = groups.flatMap((group) => providers.map((provider) => buildCandidate({
    group,
    provider,
    checkedAt,
    acceptedThreshold,
  })));
  const acceptedReady = candidates.filter((candidate) => candidate.status === "accepted-ready");
  const needsReview = candidates.filter((candidate) => candidate.status === "needs-review");
  const conflicts = candidates.filter((candidate) => candidate.status === "conflict");
  const negativeCache = candidates
    .filter((candidate) => candidate.status !== "accepted-ready")
    .map(buildNegativeCacheEntry);
  const generatedAt = `${checkedAt}T00:00:00.000Z`;
  const artifactPaths = {
    discoveryRun: path.join(outDir, "discovery-run.json"),
    discoveryCandidates: path.join(outDir, "discovery-candidates.json"),
    acceptedImportReady: path.join(outDir, "accepted-import-ready.json"),
    needsReviewGroups: path.join(outDir, "needs-review-groups.json"),
    conflicts: path.join(outDir, "conflicts.json"),
    providerCoverage: path.join(outDir, "provider-coverage.json"),
    negativeCache: path.join(outDir, "negative-cache.json"),
    coverageDelta: path.join(outDir, "coverage-delta.json"),
  };
  const providerCoverage = providers.map((provider) => {
    const providerCandidates = candidates.filter((candidate) => candidate.providerProfileId === provider.id);
    return {
      providerProfileId: provider.id,
      connector: provider.connector,
      mode: provider.mode,
      candidateCount: providerCandidates.length,
      acceptedReadyCount: providerCandidates.filter((candidate) => candidate.status === "accepted-ready").length,
      needsReviewCount: providerCandidates.filter((candidate) => candidate.status === "needs-review").length,
      conflictCount: providerCandidates.filter((candidate) => candidate.status === "conflict").length,
      deferredCount: providerCandidates.filter((candidate) => candidate.status === "deferred").length,
      negativeCacheCount: providerCandidates.filter((candidate) => candidate.status !== "accepted-ready").length,
    };
  });
  const run = {
    version: 1,
    type: "external-source-discovery-run",
    policyVersion: policy.policyVersion,
    generatedAt,
    ok: true,
    dryRun: true,
    scope,
    processedMissingCatalogEntries: groups.length,
    totalMissingCatalogEntries: coverage.missingCuratedEntries ?? groups.length,
    providerCount: providers.length,
    candidateCount: candidates.length,
    acceptedReadyCount: acceptedReady.length,
    needsReviewCount: needsReview.length,
    conflictCount: conflicts.length,
    deferredCount: candidates.filter((candidate) => candidate.status === "deferred").length,
    negativeCacheCount: negativeCache.length,
    directAutoAttachCount: 0,
    forbiddenAutomationTriggered: [],
    acceptedRequirements: policy.acceptedRequirements,
    artifacts: Object.fromEntries(Object.entries(artifactPaths).map(([key, value]) => [key, toProjectPath(value)])),
    targetImportDryRun: policy.writeSafety?.acceptedReadyImportTarget,
  };
  const acceptedManifest = {
    version: 1,
    type: "external-source-discovery-accepted-import-ready",
    generatedAt,
    dryRun: true,
    importContract: {
      directAutoAttach: false,
      targetScript: "npm run import:external-references -- --input output/external-source-discovery/accepted-import-ready.json --dry-run",
      acceptedOnlyAfterValidation: true,
    },
    summary: {
      acceptedReadyCount: acceptedReady.length,
      directAutoAttachCount: 0,
      reasonWhenEmpty: acceptedReady.length === 0
        ? "No candidate has complete provider metadata evidence in dry-run discovery."
        : "",
    },
    candidates: acceptedReady.map((candidate) => ({
      catalogId: candidate.catalogId,
      status: "accepted",
      checkedAt: candidate.checkedAt,
      evidence: candidate.evidence,
      source: candidate.source,
    })),
  };
  const needsReviewGroups = {
    version: 1,
    type: "external-source-discovery-needs-review-groups",
    generatedAt,
    summary: {
      groupCount: groups.length,
      candidateCount: needsReview.length,
      byProviderProfile: countBy(needsReview, "providerProfileId"),
    },
    groups: groups.map((group) => ({
      groupId: group.groupId,
      catalogId: group.catalogId,
      status: group.status,
      candidateCount: candidates.filter((candidate) => candidate.catalogId === group.catalogId).length,
      acceptedReadyCount: candidates.filter((candidate) => candidate.catalogId === group.catalogId && candidate.status === "accepted-ready").length,
      needsReviewCount: candidates.filter((candidate) => candidate.catalogId === group.catalogId && candidate.status === "needs-review").length,
      conflictCount: candidates.filter((candidate) => candidate.catalogId === group.catalogId && candidate.status === "conflict").length,
      deferredCount: candidates.filter((candidate) => candidate.catalogId === group.catalogId && candidate.status === "deferred").length,
      reason: "Provider search leads require validated HTTPS source evidence before accepted import.",
    })),
  };
  const coverageDelta = {
    version: 1,
    type: "external-source-discovery-coverage-delta",
    generatedAt,
    before: {
      curatedReferenceEntries: coverage.curatedReferenceEntries ?? 0,
      missingCuratedEntries: coverage.missingCuratedEntries ?? 0,
      acceptedBulkCandidateEntries: coverage.acceptedBulkCandidateEntries ?? 0,
    },
    afterDryRun: {
      curatedReferenceEntries: coverage.curatedReferenceEntries ?? 0,
      missingCuratedEntries: coverage.missingCuratedEntries ?? 0,
      acceptedBulkCandidateEntries: coverage.acceptedBulkCandidateEntries ?? 0,
    },
    acceptedReadyCount: acceptedReady.length,
    directAutoAttachCount: 0,
    policy: "Dry-run discovery never changes product-attached references.",
  };

  writeJson(artifactPaths.discoveryRun, run);
  writeJson(artifactPaths.discoveryCandidates, {
    version: 1,
    type: "external-source-discovery-candidates",
    generatedAt,
    summary: {
      candidateCount: candidates.length,
      byStatus: countBy(candidates, "status"),
      byProviderProfile: countBy(candidates, "providerProfileId"),
    },
    candidates,
  });
  writeJson(artifactPaths.acceptedImportReady, acceptedManifest);
  writeJson(artifactPaths.needsReviewGroups, needsReviewGroups);
  writeJson(artifactPaths.conflicts, {
    version: 1,
    type: "external-source-discovery-conflicts",
    generatedAt,
    summary: {conflictCount: conflicts.length},
    conflicts,
  });
  writeJson(artifactPaths.providerCoverage, {
    version: 1,
    type: "external-source-discovery-provider-coverage",
    generatedAt,
    providers: providerCoverage,
  });
  writeJson(artifactPaths.negativeCache, {
    version: 1,
    type: "external-source-discovery-negative-cache",
    generatedAt,
    summary: {negativeCacheCount: negativeCache.length},
    entries: negativeCache,
  });
  writeJson(artifactPaths.coverageDelta, coverageDelta);

  return run;
}

export function runCli(args = process.argv.slice(2)) {
  const options = parseCliOptions(args);
  const providerIds = getOptionValues(options, "providers")
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return runExternalSourceDiscovery({
    outDir: getOption(options, "out-dir", DEFAULT_OUT_DIR),
    coverageDir: getOption(options, "coverage-dir", DEFAULT_COVERAGE_DIR),
    policyPath: getOption(options, "policy", DEFAULT_POLICY_PATH),
    scope: getOption(options, "scope", "missing"),
    providerIds,
    checkedAt: getOption(options, "checked-at", DEFAULT_CHECKED_AT),
  });
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  console.log(JSON.stringify(runCli(), null, 2));
}

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runImport} from "./import-external-reference-candidates.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DISCOVERY_DIR = "output/external-source-discovery";
const REQUIRED_ARTIFACTS = [
  "discovery-run.json",
  "discovery-candidates.json",
  "accepted-import-ready.json",
  "needs-review-groups.json",
  "conflicts.json",
  "provider-coverage.json",
  "negative-cache.json",
  "coverage-delta.json",
];

function readJson(projectPath, errors) {
  const filePath = path.resolve(PROJECT_ROOT, projectPath);
  if (!existsSync(filePath)) {
    errors.push(`missing artifact: ${projectPath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`invalid JSON artifact ${projectPath}: ${error.message}`);
    return null;
  }
}

function writeJson(projectPath, value) {
  const filePath = path.resolve(PROJECT_ROOT, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function countByStatus(candidates) {
  return candidates.reduce((counts, candidate) => {
    const status = String(candidate.status ?? "unknown");
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

export function verifyExternalSourceDiscovery({discoveryDir = DEFAULT_DISCOVERY_DIR} = {}) {
  const errors = [];
  for (const artifact of REQUIRED_ARTIFACTS) {
    readJson(path.join(discoveryDir, artifact), errors);
  }
  const run = readJson(path.join(discoveryDir, "discovery-run.json"), errors);
  const candidatesManifest = readJson(path.join(discoveryDir, "discovery-candidates.json"), errors);
  const acceptedManifest = readJson(path.join(discoveryDir, "accepted-import-ready.json"), errors);
  const providerCoverage = readJson(path.join(discoveryDir, "provider-coverage.json"), errors);
  const negativeCache = readJson(path.join(discoveryDir, "negative-cache.json"), errors);
  const coverageDelta = readJson(path.join(discoveryDir, "coverage-delta.json"), errors);
  const candidates = candidatesManifest?.candidates ?? [];
  const statusCounts = countByStatus(candidates);

  if (run?.dryRun !== true) errors.push("discovery run must be dry-run");
  if ((run?.processedMissingCatalogEntries ?? 0) <= 0) errors.push("processedMissingCatalogEntries must be positive");
  if ((run?.directAutoAttachCount ?? -1) !== 0) errors.push("directAutoAttachCount must be 0");
  if (!Array.isArray(run?.forbiddenAutomationTriggered) || run.forbiddenAutomationTriggered.length !== 0) {
    errors.push("forbiddenAutomationTriggered must be empty");
  }
  if ((run?.candidateCount ?? -1) !== candidates.length) errors.push("discovery candidate count drift");
  if ((run?.acceptedReadyCount ?? 0) !== (statusCounts["accepted-ready"] ?? 0)) {
    errors.push("acceptedReadyCount drift");
  }
  if ((acceptedManifest?.summary?.directAutoAttachCount ?? -1) !== 0) {
    errors.push("accepted import-ready directAutoAttachCount must be 0");
  }
  if (!Array.isArray(acceptedManifest?.candidates)) {
    errors.push("accepted-import-ready candidates must be an array");
  }
  if ((providerCoverage?.providers?.length ?? 0) !== (run?.providerCount ?? -1)) {
    errors.push("provider coverage count drift");
  }
  if ((negativeCache?.summary?.negativeCacheCount ?? -1) !== (run?.negativeCacheCount ?? -2)) {
    errors.push("negative cache count drift");
  }
  if ((coverageDelta?.directAutoAttachCount ?? -1) !== 0) {
    errors.push("coverage delta directAutoAttachCount must be 0");
  }

  let acceptedImportDryRun = null;
  if (acceptedManifest && Array.isArray(acceptedManifest.candidates)) {
    try {
      acceptedImportDryRun = runImport({
        root: PROJECT_ROOT,
        inputPath: path.join(discoveryDir, "accepted-import-ready.json"),
        dryRun: true,
      });
    } catch (error) {
      errors.push(`accepted-import-ready dry-run failed: ${error.message}`);
    }
  }

  return {
    version: 1,
    type: "external-source-discovery-verification",
    generatedAt: new Date().toISOString(),
    discoveryDir,
    ok: errors.length === 0,
    errors,
    warnings: [],
    validationGates: [
      "all-discovery-artifacts-present",
      "dry-run-only",
      "direct-auto-attach-zero",
      "accepted-import-ready-dry-run",
      "provider-coverage-drift",
      "negative-cache-drift",
    ],
    summary: {
      processedMissingCatalogEntries: run?.processedMissingCatalogEntries ?? 0,
      providerCount: run?.providerCount ?? 0,
      candidateCount: candidates.length,
      acceptedReadyCount: run?.acceptedReadyCount ?? 0,
      needsReviewCount: run?.needsReviewCount ?? 0,
      conflictCount: run?.conflictCount ?? 0,
      negativeCacheCount: run?.negativeCacheCount ?? 0,
      directAutoAttachCount: run?.directAutoAttachCount ?? null,
      acceptedImportDryRun,
    },
  };
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const summary = verifyExternalSourceDiscovery();
  writeJson(path.join(DEFAULT_DISCOVERY_DIR, "discovery-verification.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

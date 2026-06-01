import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runProviderVerification} from "./verify-external-source-providers.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT_DIR = "output/external-source-discovery";
const DEFAULT_PROVIDER = "all";
const DEFAULT_LIMIT = 25;
const DEFAULT_BATCHES = 1;
const DEFAULT_CHECKED_AT = "2026-06-01";
const RATE_LIMIT_DISABLED_VALUES = new Set(["0", "false", "off", "no"]);

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
  const filePath = resolveProjectPath(projectPath, "provider verification batch artifact");
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

function toPositiveInteger(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer, got ${value}`);
  }
  return parsed;
}

function internetArchiveCoverage(coverage) {
  return (coverage?.byProvider ?? []).find((row) => row.providerProfileId === "internet-archive") ?? null;
}

function nextOffsetFromCoverage(coverage) {
  return Number(internetArchiveCoverage(coverage)?.verifiedOrClassifiedGroupCount ?? 0);
}

function remainingFromCoverage(coverage) {
  return Number(internetArchiveCoverage(coverage)?.remainingGroupCount ?? coverage?.totalBacklogGroupCount ?? 0);
}

export async function runProviderVerificationBatches({
  providerId = DEFAULT_PROVIDER,
  limit = DEFAULT_LIMIT,
  batches = DEFAULT_BATCHES,
  rows = 3,
  checkedAt = DEFAULT_CHECKED_AT,
  outDir = DEFAULT_OUT_DIR,
  respectRateLimit = true,
} = {}) {
  const startedAt = new Date().toISOString();
  const coveragePath = path.join(outDir, "provider-verification-coverage.json");
  const initialCoverage = readJson(coveragePath, "provider verification coverage", null);
  const runs = [];
  let coverage = initialCoverage;
  let nextOffset = nextOffsetFromCoverage(coverage);

  for (let batchIndex = 0; batchIndex < batches; batchIndex += 1) {
    const remainingBefore = remainingFromCoverage(coverage);
    if (remainingBefore <= 0) break;

    const run = await runProviderVerification({
      providerId,
      offset: nextOffset,
      limit,
      rows,
      checkedAt,
      outDir,
      respectRateLimit,
    });
    coverage = readJson(coveragePath, "provider verification coverage");
    const remainingAfter = remainingFromCoverage(coverage);
    runs.push({
      batchIndex: batchIndex + 1,
      offset: nextOffset,
      limit,
      processedGroupCount: run.processedGroupCount,
      verificationPacketCount: run.verificationPacketCount,
      acceptedReadyCount: run.acceptedReadyCount,
      rejectedCount: run.rejectedCount,
      deferredCount: run.deferredCount,
      cacheHitCount: run.cacheHitCount,
      networkRequestCount: run.verificationPacketCount - run.cacheHitCount - run.deferredCount,
      remainingBefore,
      remainingAfter,
      warnings: run.warnings ?? [],
    });
    nextOffset = nextOffsetFromCoverage(coverage);
  }

  const summary = {
    version: 1,
    type: "external-source-provider-verification-batch-run",
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun: true,
    providerId,
    limit,
    requestedBatchCount: batches,
    completedBatchCount: runs.length,
    initialInternetArchiveVerifiedCount: nextOffsetFromCoverage(initialCoverage),
    finalInternetArchiveVerifiedCount: nextOffsetFromCoverage(coverage),
    finalInternetArchiveRemainingCount: remainingFromCoverage(coverage),
    directAutoAttachCount: 0,
    mediaDownloadCount: 0,
    sourceContentCopiedCount: 0,
    respectRateLimit,
    runs,
    artifacts: {
      run: path.join(outDir, "provider-verification-run.json").split(path.sep).join("/"),
      plan: path.join(outDir, "provider-verification-plan.json").split(path.sep).join("/"),
      coverage: coveragePath.split(path.sep).join("/"),
      batchRun: path.join(outDir, "provider-verification-batch-run.json").split(path.sep).join("/"),
    },
  };
  writeJson(path.join(outDir, "provider-verification-batch-run.json"), summary);
  return summary;
}

export async function runCli(args = process.argv.slice(2)) {
  const options = parseCliOptions(args);
  return runProviderVerificationBatches({
    providerId: options.get("providers") ?? options.get("provider") ?? DEFAULT_PROVIDER,
    limit: toPositiveInteger(options.get("limit"), DEFAULT_LIMIT, "limit"),
    batches: toPositiveInteger(options.get("batches"), DEFAULT_BATCHES, "batches"),
    rows: toPositiveInteger(options.get("rows"), 3, "rows"),
    checkedAt: options.get("checked-at") ?? DEFAULT_CHECKED_AT,
    outDir: options.get("out-dir") ?? DEFAULT_OUT_DIR,
    respectRateLimit: !RATE_LIMIT_DISABLED_VALUES.has(String(options.get("respect-rate-limit") ?? "true").toLowerCase()),
  });
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  runCli()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
      if (summary.runs.some((run) => run.warnings.length > 0)) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

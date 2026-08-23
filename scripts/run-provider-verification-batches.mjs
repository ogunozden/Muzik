import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  buildAcceptedCandidate,
  dedupeAcceptedCandidatesByIdentity,
  DEFAULT_STATUSES,
  runProviderVerification,
  sortGroupsForVerification,
} from "./verify-external-source-providers.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT_DIR = "output/external-source-discovery";
const DEFAULT_PROVIDER = "all";
const DEFAULT_LIMIT = 25;
const DEFAULT_BATCHES = 1;
const DEFAULT_CHECKED_AT = "2026-06-01";
const DEFAULT_THROTTLE_MS = 0;
const DEFAULT_COVERAGE_DIR = "output/external-reference-coverage";
const RATE_LIMIT_DISABLED_VALUES = new Set(["0", "false", "off", "no"]);
const AUTO_VERIFIABLE_STATUSES = new Set(["needs-review"]);

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

/**
 * Kaldigi yer (devamli kosucu): sirali grupta hic cache'lenmemis ilk grubun
 * indeksi + kalan grup sayisi. Cache seti listenin on eki olmadigi icin
 * "cache sayisi" offset olarak KULLANILAMAZ (2026-08-08'de 74 grup bu yuzden
 * takilmisti); burada her zaman cache'ten dogrudan hesaplanir.
 */
function readResumePoint(outDir, coverageDir) {
  const groups = sortGroupsForVerification(
    readJson(
      path.join(coverageDir, "symbtr-curated-reference-candidate-review-groups.json"),
      "candidate review groups",
    ).filter((group) => DEFAULT_STATUSES.includes(group.status)),
  );
  const cache = readJson(path.join(outDir, "provider-verification-cache.json"), "provider verification cache", {
    version: 1,
    entries: {},
  });
  const cachedCatalogIds = new Set(
    Object.values(cache.entries ?? {})
      .filter((row) => row.providerProfileId === "internet-archive")
      .map((row) => row.catalogId),
  );
  // Yalnizca otomatik dogrulanabilir (needs-review) gruplar kosucunun isidir;
  // conflict/deferred kararlari insan kurasyonuna aittir ve kosucu bunlarda
  // bosuna donmemelidir (2026-08-08: 1 conflict + 4 deferred grup her partide
  // yeniden isleniyordu).
  const autoVerifiableGroups = groups.filter((group) => AUTO_VERIFIABLE_STATUSES.has(group.status));
  const remainingGroups = autoVerifiableGroups.filter((group) => !cachedCatalogIds.has(group.catalogId));
  const index = remainingGroups.length === 0
    ? autoVerifiableGroups.length
    : autoVerifiableGroups.findIndex((group) => !cachedCatalogIds.has(group.catalogId));
  return {index, remaining: remainingGroups.length, nonAutoVerifiableRemaining: groups.length - autoVerifiableGroups.length};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kabul manifestini cache'ten DETERMINISTIK yeniden kurar (dogruluk kaynagi
 * cache'tir; manifest turetilmis gorunumdur). Her kosu sonunda cagrilir —
 * boylece 0 parti calisan bir kosuda bile onceki kabul edilenler kaybolmaz.
 */
function rebuildAcceptedImportReadyManifest(outDir, checkedAt) {
  const cache = readJson(path.join(outDir, "provider-verification-cache.json"), "provider verification cache", {
    version: 1,
    entries: {},
  });
  const rows = Object.values(cache.entries ?? {}).filter(
    (row) => row.providerProfileId === "internet-archive" && row.status === "accepted-ready" && row.best?.identifier,
  );
  const byCatalog = new Map();
  for (const row of rows) {
    byCatalog.set(
      row.catalogId,
      buildAcceptedCandidate({group: row, doc: row.best, checkedAt, score: row.best.confidence.score}),
    );
  }
  const candidates = dedupeAcceptedCandidatesByIdentity([...byCatalog.values()]);
  const duplicateUrlExcludedCount = Math.max(0, byCatalog.size - candidates.length);
  const manifest = {
    version: 1,
    type: "external-source-provider-verification-accepted-import-ready",
    generatedAt: `${checkedAt}T00:00:00.000Z`,
    dryRun: true,
    importContract: {
      directAutoAttach: false,
      targetScript: "npm run import:external-references -- --input output/external-source-discovery/provider-verification-accepted-import-ready.json --dry-run",
      acceptedOnlyAfterValidation: true,
    },
    summary: {
      acceptedReadyCount: candidates.length,
      duplicateUrlExcludedCount,
      directAutoAttachCount: 0,
      providerProfileIds: ["internet-archive"],
    },
    candidates,
  };
  writeJson(path.join(outDir, "provider-verification-accepted-import-ready.json"), manifest);
  return {acceptedReadyCount: candidates.length, duplicateUrlExcludedCount};
}

/** Tek partide AG hatasi (failureKind: network) sayisi. */
function networkFailureCount(run) {
  return Number((run.byFailureKind ?? []).find((row) => row.value === "network")?.count ?? 0);
}

/** Tek partide connector kodu hatasi (failureKind: connector) sayisi. */
function connectorFailureCount(run) {
  return Number((run.byFailureKind ?? []).find((row) => row.value === "connector")?.count ?? 0);
}

/**
 * Durma algilama (deterministik): bir parti HIC coverage ilerlemesi
 * yapmadiysa (remainingBefore == remainingAfter) VE en az bir hata varsa
 * pipeline kilitlenmistir: ag kapali (network) veya politika/connector
 * kaynakli deterministik basarisizlik (connector). Cache ile yeniden islenen
 * bir partide hata 0 olur. Loop'u durdurmak, zamanlanmis kosucunun
 * saatlerce bos beklememesini saglar; sebep ayri raporlanir.
 */
export function detectOfflineRun(run, remainingBefore, remainingAfter) {
  if (run.processedGroupCount <= 0) return false;
  const failures = networkFailureCount(run) + connectorFailureCount(run);
  if (failures <= 0) return false;
  if (remainingAfter >= remainingBefore) {
    return networkFailureCount(run) > 0 ? "network-outage" : "deterministic-failures";
  }
  return false;
}

export async function runProviderVerificationBatches({
  providerId = DEFAULT_PROVIDER,
  limit = DEFAULT_LIMIT,
  batches = DEFAULT_BATCHES,
  rows = 3,
  checkedAt = DEFAULT_CHECKED_AT,
  outDir = DEFAULT_OUT_DIR,
  respectRateLimit = true,
  throttleMs = DEFAULT_THROTTLE_MS,
} = {}) {
  const startedAt = new Date().toISOString();
  const coveragePath = path.join(outDir, "provider-verification-coverage.json");
  const initialCoverage = readJson(coveragePath, "provider verification coverage", null);
  const runs = [];
  let resume = readResumePoint(outDir, DEFAULT_COVERAGE_DIR);
  let offlineDetected = false;

  for (let batchIndex = 0; batchIndex < batches; batchIndex += 1) {
    const remainingBefore = resume.remaining;
    if (remainingBefore <= 0) break;

    const run = await runProviderVerification({
      providerId,
      offset: resume.index,
      limit,
      rows,
      checkedAt,
      outDir,
      respectRateLimit,
      excludeCached: true,
    });
    resume = readResumePoint(outDir, DEFAULT_COVERAGE_DIR);
    const remainingAfter = resume.remaining;
    const networkFailures = networkFailureCount(run);
    const connectorFailures = connectorFailureCount(run);
    const progressMade = remainingAfter < remainingBefore;
    const runOffline = detectOfflineRun(run, remainingBefore, remainingAfter);
    if (runOffline) offlineDetected = true;
    const stallReason = runOffline || null;
    runs.push({
      batchIndex: batchIndex + 1,
      offset: resume.index,
      limit,
      processedGroupCount: run.processedGroupCount,
      verificationPacketCount: run.verificationPacketCount,
      acceptedReadyCount: run.acceptedReadyCount,
      rejectedCount: run.rejectedCount,
      deferredCount: run.deferredCount,
      cacheHitCount: run.cacheHitCount,
      networkFailureCount: networkFailures,
      connectorFailureCount: connectorFailures,
      progressMade,
      offlineDetected: Boolean(runOffline),
      stallReason,
      remainingBefore,
      remainingAfter,
      warnings: run.warnings ?? [],
    });
    if (offlineDetected) break;
    if (throttleMs > 0 && batchIndex < batches - 1 && resume.remaining > 0) {
      await sleep(throttleMs);
    }
  }

  const finalCoverage = readJson(coveragePath, "provider verification coverage", null);
  const finalAccepted = rebuildAcceptedImportReadyManifest(outDir, checkedAt);

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
    finalInternetArchiveVerifiedCount: nextOffsetFromCoverage(finalCoverage),
    finalInternetArchiveRemainingCount: resume.remaining,
    finalNonAutoVerifiableRemainingCount: resume.nonAutoVerifiableRemaining,
    finalAcceptedReadyCount: finalAccepted.acceptedReadyCount,
    finalDuplicateUrlExcludedCount: finalAccepted.duplicateUrlExcludedCount,
    directAutoAttachCount: 0,
    mediaDownloadCount: 0,
    sourceContentCopiedCount: 0,
    respectRateLimit,
    throttleMs,
    offlineDetected,
    stallReason: offlineDetected ? (runs.find((run) => run.stallReason)?.stallReason ?? "unknown") : null,
    runs,
    scheduling: {
      cadence: "daily",
      deterministic: true,
      nextOffset: resume.index,
      command: `npm run verify:external-source-providers:schedule`,
      invocation:
        "Zamanlanmis kosucu: Windows Gorev Zamanlayici veya CI cron, gunluk sinirli partiyi cagirir (orn. 4x25 grup/gun). Insan gerekmez; coverage artifact ilerler.",
    },
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
    throttleMs: Math.max(0, Number(options.get("throttle-ms") ?? DEFAULT_THROTTLE_MS) || 0),
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

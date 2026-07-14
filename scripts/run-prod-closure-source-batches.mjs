#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = "output/prod-closure/source-batch-run.json";
const DEFAULT_LIMIT = 250;
const DEFAULT_BATCHES = 1;

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

function readJson(projectPath, fallback = null) {
  const filePath = resolveProjectPath(projectPath, "source closure input");
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(projectPath, value) {
  const filePath = resolveProjectPath(projectPath, "source closure batch output");
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer, got ${value}`);
  }
  return parsed;
}

function runNode(args, timeoutMs) {
  const result = spawnSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });
  return {
    ok: result.status === 0 && !result.error,
    exitCode: typeof result.status === "number" ? result.status : 1,
    timedOut: result.error?.code === "ETIMEDOUT",
    stdout: result.stdout ?? "",
    stderr: [result.stderr, result.error?.message].filter(Boolean).join("\n"),
  };
}

function parseJsonFromStdout(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    return null;
  }
}

function currentOffset(closure) {
  return Number(closure?.sourceClosure?.providerNetworkClassifiedGroupCount ?? 0);
}

function currentRemaining(closure) {
  return Number(closure?.sourceClosure?.unresolvedGroupCount ?? 0);
}

export function planNextSourceBatch({closure, limit = DEFAULT_LIMIT} = {}) {
  const offset = currentOffset(closure);
  const remaining = currentRemaining(closure);
  return {
    offset,
    remaining,
    limit: Math.min(limit, Math.max(remaining, 0)),
    complete: remaining === 0,
  };
}

export function runProdClosureSourceBatches({
  batches = DEFAULT_BATCHES,
  limit = DEFAULT_LIMIT,
  rows = 3,
  output = DEFAULT_OUTPUT,
  timeoutMs = 600_000,
} = {}) {
  const startedAt = new Date().toISOString();
  const runs = [];
  let closure = readJson("output/prod-closure/prod-closure-readiness.json", {});

  for (let batchIndex = 0; batchIndex < batches; batchIndex += 1) {
    const plan = planNextSourceBatch({closure, limit});
    if (plan.complete || plan.limit <= 0) break;

    const providerResult = runNode([
      "scripts/verify-external-source-providers.mjs",
      "--provider", "internet-archive",
      "--offset", String(plan.offset),
      "--limit", String(plan.limit),
      "--rows", String(rows),
    ], timeoutMs);
    if (!providerResult.ok) {
      runs.push({
        batchIndex: batchIndex + 1,
        offset: plan.offset,
        limit: plan.limit,
        ok: false,
        reason: providerResult.stderr || providerResult.stdout,
      });
      break;
    }

    const stagedResult = runNode(["scripts/stage-source-terminal-decisions.mjs"], 120_000);
    const closureResult = runNode(["scripts/audit-prod-closure.mjs"], 120_000);
    closure = readJson("output/prod-closure/prod-closure-readiness.json", closure);
    const providerSummary = parseJsonFromStdout(providerResult.stdout) ?? {};
    const stagedSummary = parseJsonFromStdout(stagedResult.stdout) ?? {};
    const closureSummary = parseJsonFromStdout(closureResult.stdout) ?? closure;

    runs.push({
      batchIndex: batchIndex + 1,
      offset: plan.offset,
      limit: plan.limit,
      ok: stagedResult.ok,
      providerProcessedGroupCount: providerSummary.processedGroupCount ?? null,
      providerAcceptedReadyCount: providerSummary.acceptedReadyCount ?? null,
      providerWarningCount: providerSummary.warnings?.length ?? 0,
      terminalDecisionGroupCount: stagedSummary.terminalDecisionGroupCount ?? closure?.sourceClosure?.terminalDecisionGroupCount ?? null,
      remainingAfter: closureSummary.sourceClosure?.unresolvedGroupCount ?? closure?.sourceClosure?.unresolvedGroupCount ?? null,
      directAutoAttachCount: closureSummary.safety?.directAutoAttachCount ?? null,
      mediaDownloadCount: closureSummary.safety?.mediaDownloadCount ?? null,
      sourceContentCopiedCount: closureSummary.safety?.sourceContentCopiedCount ?? null,
    });
  }

  const summary = {
    version: 1,
    type: "prod-closure-source-batch-run",
    startedAt,
    finishedAt: new Date().toISOString(),
    requestedBatchCount: batches,
    limit,
    rows,
    completedBatchCount: runs.filter((run) => run.ok).length,
    runs,
    finalClosure: {
      sourceUnresolvedGroups: closure?.sourceClosure?.unresolvedGroupCount ?? null,
      sourceTerminalDecisionGroups: closure?.sourceClosure?.terminalDecisionGroupCount ?? null,
      pdfUnresolvedEntries: closure?.pdfClosure?.unresolvedEntryCount ?? null,
      directAutoAttachCount: closure?.safety?.directAutoAttachCount ?? null,
      mediaDownloadCount: closure?.safety?.mediaDownloadCount ?? null,
      sourceContentCopiedCount: closure?.safety?.sourceContentCopiedCount ?? null,
    },
  };
  writeJson(output, summary);
  return summary;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const options = parseArgs(process.argv.slice(2));
  const summary = runProdClosureSourceBatches({
    batches: positiveInteger(options.get("batches"), DEFAULT_BATCHES, "batches"),
    limit: positiveInteger(options.get("limit"), DEFAULT_LIMIT, "limit"),
    rows: positiveInteger(options.get("rows"), 3, "rows"),
    output: options.get("output") ?? DEFAULT_OUTPUT,
    timeoutMs: positiveInteger(options.get("timeout-ms"), 600_000, "timeout-ms"),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.runs.some((run) => !run.ok)) process.exitCode = 1;
}

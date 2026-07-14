#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = "output/prod-closure/prod-closure-readiness.json";
const DEFAULT_SOURCE_TARGET_GROUPS = 2978;
const DEFAULT_PDF_TARGET_UNRESOLVED = 1285;
const SOURCE_TERMINAL_STATUSES = new Set([
  "accepted",
  "community-verified",
  "rejected",
  "verified-unavailable",
  "disputed",
  "deferred",
]);
const PDF_TERMINAL_STATUSES = new Set([
  "verified",
  "needs-human-review",
  "rejected",
  "geometry-failure",
]);

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
  const filePath = resolveProjectPath(projectPath, "prod closure input");
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(projectPath, value) {
  const filePath = resolveProjectPath(projectPath, "prod closure output");
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeEntries(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.entries)) return input.entries;
  if (input.entries && typeof input.entries === "object") return Object.values(input.entries);
  if (Array.isArray(input.decisions)) return input.decisions;
  return [];
}

function countTerminal(entries, terminalStatuses) {
  return normalizeEntries(entries).filter((entry) => terminalStatuses.has(String(entry.status ?? entry.decision ?? ""))).length;
}

function buildSourceClosure({
  coverageSummary,
  providerVerificationCoverage,
  providerVerificationBatchRun,
  sourceTerminalDecisions,
  sourceTargetGroupCount = DEFAULT_SOURCE_TARGET_GROUPS,
}) {
  const currentMissing = Number(coverageSummary?.missingCuratedEntries ?? sourceTargetGroupCount);
  const currentReviewGroups = Number(coverageSummary?.candidateReviewGroupEntries ?? sourceTargetGroupCount);
  const terminalDecisionGroupCount = countTerminal(sourceTerminalDecisions, SOURCE_TERMINAL_STATUSES);
  const terminalCoveredGroups = Math.min(sourceTargetGroupCount, terminalDecisionGroupCount + Math.max(0, sourceTargetGroupCount - currentMissing));
  const unresolvedGroupCount = Math.max(0, sourceTargetGroupCount - terminalCoveredGroups);
  const providerRows = Array.isArray(providerVerificationCoverage?.byProvider) ? providerVerificationCoverage.byProvider : [];
  const networkProvider = providerRows.find((row) => Number(row.remainingGroupCount ?? 0) > 0) ?? providerRows[0] ?? null;
  const providerRemaining = Number(providerVerificationCoverage?.networkProviderRemainingGroupCount ?? sourceTargetGroupCount);
  const nextProviderOffset = Number(networkProvider?.verifiedOrClassifiedGroupCount ?? 0);
  const nextProviderCommand = `npm run run:prod-closure-source-batches -- --batches 1 --limit 250 --rows 3 --timeout-ms 600000`;

  return {
    targetGroupCount: sourceTargetGroupCount,
    currentReviewGroupCount: currentReviewGroups,
    currentMissingCuratedEntries: currentMissing,
    terminalDecisionGroupCount,
    terminalCoveredGroupCount: terminalCoveredGroups,
    unresolvedGroupCount,
    acceptedOrCuratedProgressCount: Math.max(0, sourceTargetGroupCount - currentMissing),
    providerNetworkClassifiedGroupCount: Number(networkProvider?.verifiedOrClassifiedGroupCount ?? 0),
    providerClassifiedPacketCount: providerRows.reduce((sum, row) => sum + Number(row.verifiedOrClassifiedGroupCount ?? 0), 0),
    providerNetworkRemainingGroupCount: providerRemaining,
    nextProviderOffset,
    lastBatchCompletedCount: Number(providerVerificationBatchRun?.completedBatchCount ?? 0),
    directAutoAttachCount: Number(providerVerificationBatchRun?.directAutoAttachCount ?? providerVerificationCoverage?.safety?.directAutoAttachCount ?? 0),
    mediaDownloadCount: Number(providerVerificationBatchRun?.mediaDownloadCount ?? 0),
    sourceContentCopiedCount: Number(providerVerificationBatchRun?.sourceContentCopiedCount ?? 0),
    complete: unresolvedGroupCount === 0,
    nextCommand: unresolvedGroupCount > 0
      ? nextProviderCommand
      : "npm run audit:external-references",
  };
}

function buildPdfClosure({
  pdfSummary,
  pdfTerminalDecisions,
  pdfTargetUnresolvedCount = DEFAULT_PDF_TARGET_UNRESOLVED,
}) {
  const unresolvedFromValidator = Number(pdfSummary?.unresolvedCandidateEntries ?? pdfTargetUnresolvedCount);
  const terminalDecisionEntryCount = countTerminal(pdfTerminalDecisions, PDF_TERMINAL_STATUSES);
  const unresolvedEntryCount = Math.max(0, unresolvedFromValidator - terminalDecisionEntryCount);

  return {
    targetUnresolvedEntryCount: pdfTargetUnresolvedCount,
    candidateEntries: Number(pdfSummary?.candidateEntries ?? 0),
    verificationEntries: Number(pdfSummary?.verificationEntries ?? 0),
    verifiedEntries: Number(pdfSummary?.verifiedEntries ?? 0),
    verifiedMeasureBoxes: Number(pdfSummary?.verifiedMeasureBoxes ?? 0),
    baselineVerifiedMeasureBoxes: 18334,
    validatorUnresolvedCandidateEntries: unresolvedFromValidator,
    terminalDecisionEntryCount,
    unresolvedEntryCount,
    promotionPolicy: pdfSummary?.promotionPolicy ?? null,
    fingerprintAlgorithm: pdfSummary?.fingerprintAlgorithm ?? null,
    complete: unresolvedEntryCount === 0,
    nextCommand: unresolvedEntryCount > 0
      ? "npm run verify:symbtr-measures:aligned && npm run verify:symbtr-measures"
      : "npm run verify:symbtr-measures",
  };
}

export function buildProdClosureReadinessSummary({
  coverageSummary,
  providerVerificationCoverage,
  providerVerificationBatchRun,
  sourceTerminalDecisions,
  pdfSummary,
  pdfTerminalDecisions,
  prodCycleSummary,
  sourceTargetGroupCount = DEFAULT_SOURCE_TARGET_GROUPS,
  pdfTargetUnresolvedCount = DEFAULT_PDF_TARGET_UNRESOLVED,
  generatedAt = new Date().toISOString(),
} = {}) {
  const sourceClosure = buildSourceClosure({
    coverageSummary,
    providerVerificationCoverage,
    providerVerificationBatchRun,
    sourceTerminalDecisions,
    sourceTargetGroupCount,
  });
  const pdfClosure = buildPdfClosure({
    pdfSummary,
    pdfTerminalDecisions,
    pdfTargetUnresolvedCount,
  });
  const safety = {
    directAutoAttachCount: sourceClosure.directAutoAttachCount,
    mediaDownloadCount: sourceClosure.mediaDownloadCount,
    sourceContentCopiedCount: sourceClosure.sourceContentCopiedCount,
    prodCycleOk: prodCycleSummary?.ok === true,
  };
  const blockers = [
    sourceClosure.unresolvedGroupCount > 0 ? `source unresolved groups: ${sourceClosure.unresolvedGroupCount}` : "",
    pdfClosure.unresolvedEntryCount > 0 ? `PDF unresolved entries: ${pdfClosure.unresolvedEntryCount}` : "",
    safety.directAutoAttachCount !== 0 ? `direct auto attach count is ${safety.directAutoAttachCount}` : "",
    safety.mediaDownloadCount !== 0 ? `media download count is ${safety.mediaDownloadCount}` : "",
    safety.sourceContentCopiedCount !== 0 ? `source content copied count is ${safety.sourceContentCopiedCount}` : "",
    safety.prodCycleOk !== true ? "prod-cycle audit is not proven ok" : "",
  ].filter(Boolean);

  return {
    version: 1,
    type: "prod-closure-readiness",
    generatedAt,
    ok: blockers.length === 0,
    blockers,
    targets: {
      sourceTerminalGroups: sourceTargetGroupCount,
      pdfUnresolvedEntriesToClose: pdfTargetUnresolvedCount,
      pdfBaselineVerifiedMeasureBoxes: 18334,
    },
    sourceClosure,
    pdfClosure,
    safety,
    nextCommands: [
      sourceClosure.complete ? "" : sourceClosure.nextCommand,
      pdfClosure.complete ? "" : pdfClosure.nextCommand,
      "npm run audit:prod-cycle",
    ].filter(Boolean),
  };
}

export function runProdClosureReadiness({
  output = DEFAULT_OUTPUT,
} = {}) {
  const summary = buildProdClosureReadinessSummary({
    coverageSummary: readJson("output/external-reference-coverage/summary.json"),
    providerVerificationCoverage: readJson("output/external-source-discovery/provider-verification-coverage.json"),
    providerVerificationBatchRun: readJson("output/external-source-discovery/provider-verification-batch-run.json"),
    sourceTerminalDecisions: readJson("output/prod-closure/source-terminal-decisions.json"),
    pdfSummary: readJson("output/symbtr-layout-review/layout-verification-summary.json"),
    pdfTerminalDecisions: readJson("output/prod-closure/pdf-terminal-decisions.json"),
    prodCycleSummary: readJson("output/external-reference-coverage/prod-cycle-summary.json"),
  });
  writeJson(output, summary);
  return summary;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const options = parseArgs(process.argv.slice(2));
  const summary = runProdClosureReadiness({
    output: options.get("output") ?? DEFAULT_OUTPUT,
  });
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

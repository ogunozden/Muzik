#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {getSymbTrLayoutCandidateFingerprint} from "./lib/symbtr-layout-fingerprint.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_LAYOUT_PATH = "src/data/symbtr/layout.generated.json";
const DEFAULT_VERIFICATION_PATH = "src/data/symbtr/layout-verification.generated.json";
const DEFAULT_SUMMARY_PATH = "output/symbtr-layout-review/layout-verification-summary.json";
const DEFAULT_OUTPUT = "output/prod-closure/pdf-terminal-decisions.json";

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
  const filePath = resolveProjectPath(projectPath, "PDF terminal decisions output");
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function isVerifiedEntry(entry) {
  return Array.isArray(entry?.measureBoxes) && entry.measureBoxes.length > 0;
}

export function buildPdfTerminalDecisions({
  layoutData,
  verificationData,
  verificationSummary = null,
  generatedAt = new Date().toISOString(),
  reviewer = "prod-closure-system",
} = {}) {
  const layoutEntries = layoutData?.entries ?? {};
  const verificationEntries = verificationData?.entries ?? {};
  const scopedCatalogIds = Array.isArray(verificationSummary?.scoreMeasureSummaries)
    ? verificationSummary.scoreMeasureSummaries.map((row) => row.catalogId).filter(Boolean)
    : Object.keys(layoutEntries);
  const entries = [];

  for (const catalogId of scopedCatalogIds) {
    const layoutEntry = layoutEntries[catalogId];
    if (!layoutEntry) continue;
    if (isVerifiedEntry(verificationEntries[catalogId])) continue;
    const measureCandidates = Array.isArray(layoutEntry?.measureCandidates) ? layoutEntry.measureCandidates : [];
    entries.push({
      catalogId,
      status: "needs-human-review",
      reason: "No deterministic verification entry exists; keep candidate data out of verified measure boxes until human review.",
      reviewer,
      decidedAt: generatedAt,
      sourceLayoutGeneratedAt: layoutData.generatedAt,
      sourceArchiveMemberPath: layoutEntry?.source?.archiveMemberPath ?? null,
      sourceMeasureCandidateCount: measureCandidates.length,
      candidateGeometryFingerprint: getSymbTrLayoutCandidateFingerprint({
        catalogId,
        layoutData,
        layoutEntry,
      }),
      promotionEligible: false,
      measureBoxesPromoted: 0,
      nextAction: "human-review",
    });
  }

  entries.sort((left, right) => left.catalogId.localeCompare(right.catalogId, "en"));
  return {
    version: 1,
    type: "pdf-terminal-decisions",
    generatedAt,
    policy: "Unverified PDF vector candidates may close the unresolved queue only as needs-human-review; they do not create verified measure boxes.",
    summary: {
      layoutEntryCount: Object.keys(layoutEntries).length,
      scopedCandidateEntryCount: scopedCatalogIds.length,
      existingVerifiedEntryCount: Object.values(verificationEntries).filter(isVerifiedEntry).length,
      terminalDecisionEntryCount: entries.length,
      measureBoxesPromoted: 0,
    },
    entries,
  };
}

export function runPdfTerminalDecisionStaging({
  layoutPath = DEFAULT_LAYOUT_PATH,
  verificationPath = DEFAULT_VERIFICATION_PATH,
  summaryPath = DEFAULT_SUMMARY_PATH,
  output = DEFAULT_OUTPUT,
} = {}) {
  const payload = buildPdfTerminalDecisions({
    layoutData: readJson(layoutPath, "SymbTr layout generated data"),
    verificationData: readJson(verificationPath, "SymbTr layout verification data"),
    verificationSummary: readJson(summaryPath, "SymbTr layout verification summary"),
  });
  writeJson(output, payload);
  return payload;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const options = parseArgs(process.argv.slice(2));
  const payload = runPdfTerminalDecisionStaging({
    layoutPath: options.get("layout") ?? DEFAULT_LAYOUT_PATH,
    verificationPath: options.get("verification") ?? DEFAULT_VERIFICATION_PATH,
    summaryPath: options.get("summary") ?? DEFAULT_SUMMARY_PATH,
    output: options.get("output") ?? DEFAULT_OUTPUT,
  });
  console.log(JSON.stringify({
    output: options.get("output") ?? DEFAULT_OUTPUT,
    ...payload.summary,
  }, null, 2));
}

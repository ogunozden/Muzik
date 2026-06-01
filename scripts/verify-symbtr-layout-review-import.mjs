#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const ROOT = process.cwd();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_GENERATED_AT = "2026-06-01";
const DEFAULT_REVIEW_TEMPLATE = "output/symbtr-layout-review/layout-verification-review-template.json";
const DEFAULT_REVIEW_BATCH_PLAN = "output/symbtr-layout-review/layout-verification-review-batch-plan.json";
const DEFAULT_IMPORT_TEMPLATE = "output/symbtr-layout-review/layout-verification-empty-import-template.json";
const DEFAULT_SUMMARY_OUTPUT = "output/symbtr-layout-review/layout-verification-empty-import-dry-run.json";
const IMPORT_SCRIPT = path.join(SCRIPT_DIR, "import-symbtr-layout-verification.mjs");

function parseCliOptions(argv) {
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

function assertInsideProject(targetPath, root = ROOT, label = "path") {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to use ${label} outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function toProjectPath(filePath, root = ROOT) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function readJson(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function hasPromotedMeasureBoxes(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasPromotedMeasureBoxes);
  return Object.entries(value).some(([key, child]) => (
    key === "measureBoxes" && Array.isArray(child) && child.length > 0
  ) || (
    key === "confidence" && child === "verified"
  ) || hasPromotedMeasureBoxes(child));
}

function countReviewRows(reviewTemplate) {
  return Object.values(reviewTemplate.entries ?? {}).reduce(
    (total, entry) => total + (Array.isArray(entry?.candidateReviewRows) ? entry.candidateReviewRows.length : 0),
    0,
  );
}

function countBatchRows(reviewBatchPlan) {
  return (reviewBatchPlan.packets ?? []).reduce(
    (total, packet) => total + (Array.isArray(packet?.candidateReviewRows) ? packet.candidateReviewRows.length : 0),
    0,
  );
}

function validateReviewInputs({reviewTemplate, reviewBatchPlan}) {
  const errors = [];
  const templateEntryCount = Object.keys(reviewTemplate.entries ?? {}).length;
  const templateReviewRows = countReviewRows(reviewTemplate);
  const batchRows = countBatchRows(reviewBatchPlan);

  if (reviewTemplate.type !== "symbtr-pdf-layout-verification-review-template") {
    errors.push("review template type must be symbtr-pdf-layout-verification-review-template");
  }
  if (reviewBatchPlan.type !== "symbtr-pdf-layout-verification-review-batch-plan") {
    errors.push("review batch plan type must be symbtr-pdf-layout-verification-review-batch-plan");
  }
  if (reviewBatchPlan.entryCount !== templateEntryCount) {
    errors.push("review batch plan entryCount must match review template entries");
  }
  if (reviewBatchPlan.candidateReviewRows !== templateReviewRows || batchRows !== templateReviewRows) {
    errors.push("review batch plan must cover every review template candidate row exactly once");
  }
  if (hasPromotedMeasureBoxes(reviewTemplate)) {
    errors.push("review template must not carry verified measure boxes");
  }
  if (hasPromotedMeasureBoxes(reviewBatchPlan)) {
    errors.push("review batch plan must not carry verified measure boxes");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid SymbTr layout review import proof:\n${errors.join("\n")}`);
  }

  return {
    templateEntryCount,
    templateReviewRows,
    batchPacketCount: Array.isArray(reviewBatchPlan.packets) ? reviewBatchPlan.packets.length : 0,
    batchRows,
  };
}

function runImportDryRun({root, importTemplatePath}) {
  const stdout = execFileSync(
    process.execPath,
    [
      IMPORT_SCRIPT,
      "--input",
      toProjectPath(importTemplatePath, root),
      "--dry-run",
    ],
    {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]},
  );

  return JSON.parse(stdout);
}

export function buildSymbTrLayoutReviewImportDryRun({
  root = ROOT,
  reviewTemplatePath = DEFAULT_REVIEW_TEMPLATE,
  reviewBatchPlanPath = DEFAULT_REVIEW_BATCH_PLAN,
  importTemplatePath = DEFAULT_IMPORT_TEMPLATE,
  generatedAt = DEFAULT_GENERATED_AT,
} = {}) {
  const safeReviewTemplatePath = assertInsideProject(reviewTemplatePath, root, "layout review template");
  const safeReviewBatchPlanPath = assertInsideProject(reviewBatchPlanPath, root, "layout review batch plan");
  const safeImportTemplatePath = assertInsideProject(importTemplatePath, root, "layout empty import template");
  const reviewTemplate = readJson(safeReviewTemplatePath, "layout review template");
  const reviewBatchPlan = readJson(safeReviewBatchPlanPath, "layout review batch plan");
  const inputSummary = validateReviewInputs({reviewTemplate, reviewBatchPlan});

  const emptyImportTemplate = {
    schemaVersion: 1,
    type: "symbtr-pdf-layout-verification-empty-import-template",
    generatedAt,
    policy: "Empty import template proves that PDF layout review packets do not promote candidates until verified measureBoxes are explicitly supplied.",
    sourceReviewTemplate: toProjectPath(safeReviewTemplatePath, root),
    sourceReviewBatchPlan: toProjectPath(safeReviewBatchPlanPath, root),
    entries: {},
  };

  mkdirSync(path.dirname(safeImportTemplatePath), {recursive: true});
  writeFileSync(safeImportTemplatePath, `${JSON.stringify(emptyImportTemplate, null, 2)}\n`);

  const dryRunResult = runImportDryRun({root, importTemplatePath: safeImportTemplatePath});

  return {
    version: 1,
    type: "symbtr-pdf-layout-verification-empty-import-dry-run",
    generatedAt,
    dryRun: true,
    input: toProjectPath(safeImportTemplatePath, root),
    sourceReviewTemplate: toProjectPath(safeReviewTemplatePath, root),
    sourceReviewBatchPlan: toProjectPath(safeReviewBatchPlanPath, root),
    targetScript: "npm run import:symbtr-measure-verification -- --input <json>",
    validationGates: [
      "review-template-non-promoting",
      "review-batch-plan-complete",
      "empty-import-no-write",
      "verified-manifest-unchanged",
    ],
    summary: {
      reviewTemplateEntryCount: inputSummary.templateEntryCount,
      reviewTemplateCandidateRows: inputSummary.templateReviewRows,
      reviewBatchPacketCount: inputSummary.batchPacketCount,
      reviewBatchCandidateRows: inputSummary.batchRows,
      dryRunInputEntryCount: dryRunResult.inputEntryCount,
      dryRunOutputEntryCount: dryRunResult.outputEntryCount,
      dryRunVerifiedMeasureBoxCount: dryRunResult.verifiedMeasureBoxCount,
    },
    dryRunResult,
    errors: [],
  };
}

export function runSymbTrLayoutReviewImportDryRun({
  root = ROOT,
  reviewTemplatePath = DEFAULT_REVIEW_TEMPLATE,
  reviewBatchPlanPath = DEFAULT_REVIEW_BATCH_PLAN,
  importTemplatePath = DEFAULT_IMPORT_TEMPLATE,
  summaryOutput = DEFAULT_SUMMARY_OUTPUT,
  generatedAt,
} = {}) {
  const report = buildSymbTrLayoutReviewImportDryRun({
    root,
    reviewTemplatePath,
    reviewBatchPlanPath,
    importTemplatePath,
    generatedAt,
  });
  const outputPath = assertInsideProject(summaryOutput, root, "layout empty import dry-run summary");

  mkdirSync(path.dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  return {
    ...report,
    summaryOutput: toProjectPath(outputPath, root),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = parseCliOptions(process.argv.slice(2));
  const result = runSymbTrLayoutReviewImportDryRun({
    reviewTemplatePath: options.get("review-template") ?? DEFAULT_REVIEW_TEMPLATE,
    reviewBatchPlanPath: options.get("review-batch-plan") ?? DEFAULT_REVIEW_BATCH_PLAN,
    importTemplatePath: options.get("import-template") ?? DEFAULT_IMPORT_TEMPLATE,
    summaryOutput: options.get("summary-output") ?? DEFAULT_SUMMARY_OUTPUT,
    generatedAt: options.get("generated-at"),
  });

  console.log(JSON.stringify(result, null, 2));
}

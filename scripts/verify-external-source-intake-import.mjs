#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {
  normalizeCandidates,
  parseCliOptions,
  runImport,
} from "./import-external-reference-candidates.mjs";

const DEFAULT_ROOT = process.cwd();
const DEFAULT_INPUT = "src/data/references/external-reference-bulk-candidates.json";
const DEFAULT_SUMMARY_OUTPUT = "output/external-reference-coverage/source-intake-accepted-import-dry-run.json";
const DEFAULT_GENERATED_AT = "2026-06-01";
const REQUIRED_EVIDENCE_FIELDS = [
  "title",
  "makam",
  "form",
  "usul",
  "composer",
  "sourceProvider",
];

function assertInsideProject(targetPath, root, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to use ${label} outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function toProjectPath(filePath, root) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function readJson(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isCompleteEvidence(candidate) {
  const evidence = candidate.evidence ?? {};
  return REQUIRED_EVIDENCE_FIELDS.every((field) => (
    typeof evidence[field] === "string" && evidence[field].trim().length > 0
  ));
}

function validateAcceptedEvidence(candidates) {
  const errors = [];
  const accepted = candidates.filter((candidate) => candidate.status === "accepted");

  if (accepted.length === 0) {
    errors.push("accepted source intake dry-run requires at least one accepted candidate");
  }

  for (const candidate of accepted) {
    const catalogId = candidate.catalogId ?? "<missing>";
    const missingEvidenceFields = REQUIRED_EVIDENCE_FIELDS.filter((field) => {
      const value = candidate.evidence?.[field];
      return typeof value !== "string" || value.trim().length === 0;
    });

    if (missingEvidenceFields.length > 0) {
      errors.push(`${catalogId}: accepted candidate evidence missing ${missingEvidenceFields.join(", ")}`);
    }

    if (candidate.source?.access !== "external-link") {
      errors.push(`${catalogId}: accepted source access must stay external-link`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid source intake accepted import proof:\n${errors.join("\n")}`);
  }

  return accepted;
}

export function buildSourceIntakeAcceptedImportDryRun({
  root = DEFAULT_ROOT,
  inputPath = DEFAULT_INPUT,
  generatedAt = DEFAULT_GENERATED_AT,
} = {}) {
  const safeInputPath = assertInsideProject(inputPath, root, "source intake accepted import input");
  const inputData = readJson(safeInputPath, "source intake accepted import input");
  const candidates = normalizeCandidates(inputData);
  const acceptedCandidates = validateAcceptedEvidence(candidates);
  const dryRunResult = runImport({
    root,
    inputPath: toProjectPath(safeInputPath, root),
    dryRun: true,
  });
  const httpsAcceptedCount = acceptedCandidates.filter((candidate) => {
    try {
      return new URL(candidate.source?.url).protocol === "https:";
    } catch {
      return false;
    }
  }).length;
  const evidenceCompleteCount = acceptedCandidates.filter(isCompleteEvidence).length;

  return {
    version: 1,
    type: "source-intake-accepted-import-dry-run",
    generatedAt,
    input: toProjectPath(safeInputPath, root),
    dryRun: true,
    policy:
      "Accepted source intake examples are validated through the bulk candidate importer in dry-run mode before any auto-attach or write operation.",
    validationGates: [
      "accepted-candidates-present",
      "accepted-evidence-complete",
      "https-url-policy",
      "research-profile-match",
      "accepted-identity-dedupe",
      "dry-run-import-no-write",
    ],
    summary: {
      totalCandidateCount: candidates.length,
      acceptedCandidateCount: acceptedCandidates.length,
      httpsAcceptedCount,
      evidenceCompleteCount,
      dryRunAddedCandidateCount: dryRunResult.addedCandidateCount,
      dryRunSkippedDuplicateCount: dryRunResult.skippedDuplicateCount,
      dryRunExistingCandidateCount: dryRunResult.existingCandidateCount,
      dryRunOutputCandidateCount: dryRunResult.outputCandidateCount,
      acceptedCatalogIds: acceptedCandidates.map((candidate) => candidate.catalogId).sort(),
    },
    dryRunResult,
    errors: [],
  };
}

export function runSourceIntakeAcceptedImportDryRun({
  root = DEFAULT_ROOT,
  inputPath = DEFAULT_INPUT,
  summaryOutput = DEFAULT_SUMMARY_OUTPUT,
  generatedAt,
} = {}) {
  const report = buildSourceIntakeAcceptedImportDryRun({root, inputPath, generatedAt});
  const outputPath = assertInsideProject(summaryOutput, root, "source intake accepted dry-run summary output");

  mkdirSync(path.dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  return {
    ...report,
    summaryOutput: toProjectPath(outputPath, root),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = parseCliOptions(process.argv.slice(2));
  const result = runSourceIntakeAcceptedImportDryRun({
    inputPath: options.get("input") ?? DEFAULT_INPUT,
    summaryOutput: options.get("summary-output") ?? DEFAULT_SUMMARY_OUTPUT,
    generatedAt: options.get("generated-at"),
  });

  console.log(JSON.stringify(result, null, 2));
}

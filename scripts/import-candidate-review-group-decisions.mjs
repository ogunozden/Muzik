#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import path from "node:path";
import {
  normalizeCandidateReviewGroupDecision,
  readCandidateReviewGroupDecisions,
} from "./lib/external-reference-audit.mjs";

const root = process.cwd();
const outputPath = path.join(root, "src", "data", "references", "candidate-review-group-decisions.json");
const catalogPath = path.join(root, "src", "data", "symbtr", "catalog.generated.json");

function parseArgs(argv) {
  const args = {write: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      args.input = argv[index + 1];
      index += 1;
    } else if (arg === "--write") {
      args.write = true;
    } else if (arg === "--dry-run") {
      args.write = false;
    }
  }
  return args;
}

function assertProjectInput(input) {
  if (!input) {
    throw new Error("--input is required");
  }

  const resolvedRoot = path.resolve(root);
  const resolvedInput = path.resolve(root, input);
  const relative = path.relative(resolvedRoot, resolvedInput);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to read outside project: ${resolvedInput}`);
  }
  return resolvedInput;
}

function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readInputDecisions(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  const rows = Array.isArray(parsed.decisions)
    ? parsed.decisions
    : Array.isArray(parsed.groups)
      ? parsed.groups
      : [];

  if (rows.length === 0) {
    throw new Error("Input must include a non-empty decisions or groups array.");
  }

  return rows.map(normalizeCandidateReviewGroupDecision);
}

const args = parseArgs(process.argv.slice(2));
const inputPath = assertProjectInput(args.input);
const catalog = readJson(catalogPath, {entries: []});
const catalogEntries = Array.isArray(catalog.entries) ? catalog.entries : [];
const current = readJson(outputPath, {version: 1, decisions: []});
const incomingDecisions = readInputDecisions(inputPath);
const mergedByCatalogId = new Map(
  (Array.isArray(current.decisions) ? current.decisions : [])
    .map(normalizeCandidateReviewGroupDecision)
    .map((decision) => [decision.catalogId, decision]),
);

let addedDecisionCount = 0;
let updatedDecisionCount = 0;
for (const decision of incomingDecisions) {
  if (mergedByCatalogId.has(decision.catalogId)) {
    updatedDecisionCount += 1;
  } else {
    addedDecisionCount += 1;
  }
  mergedByCatalogId.set(decision.catalogId, decision);
}

const nextManifest = {
  version: 1,
  decisions: Array.from(mergedByCatalogId.values()).sort((left, right) => left.catalogId.localeCompare(right.catalogId, "en")),
};
const tempValidationPath = path.join(root, "output", "external-reference-coverage", "candidate-review-group-decisions.import-preview.json");
mkdirSync(path.dirname(tempValidationPath), {recursive: true});
writeFileSync(tempValidationPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

try {
  readCandidateReviewGroupDecisions(catalogEntries, tempValidationPath);
} finally {
  if (existsSync(tempValidationPath)) {
    rmSync(tempValidationPath);
  }
}

if (args.write) {
  writeFileSync(outputPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
}

console.log(JSON.stringify({
  dryRun: !args.write,
  inputDecisionCount: incomingDecisions.length,
  existingDecisionCount: Array.isArray(current.decisions) ? current.decisions.length : 0,
  outputDecisionCount: nextManifest.decisions.length,
  addedDecisionCount,
  updatedDecisionCount,
  outputPath: path.relative(root, outputPath).split(path.sep).join("/"),
}, null, 2));

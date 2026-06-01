import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {validateSourceCurationRegistries} from "./source-curation-validation.mjs";

export const CURATION_PATHS = {
  catalog: "src/data/symbtr/catalog.generated.json",
  autoAttached: "src/data/references/auto-attached-references.json",
  feedback: "src/data/references/source-feedback-events.json",
  manualCorrections: "src/data/references/manual-source-corrections.json",
  researchProfiles: "src/data/references/research-source-profiles.json",
  embedStates: "src/data/references/embed-states.json",
  qualityStats: "src/data/references/source-quality-stats.generated.json",
  mapping: "output/external-reference-coverage/mapped-external-reference-candidates.json",
  bulkCandidates: "src/data/references/external-reference-bulk-candidates.json",
};

export function resolveCurationPath(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, relativePath);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to access path outside project: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

export function readJson(root, relativePath, fallback) {
  const filePath = resolveCurationPath(root, relativePath);
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeJson(root, relativePath, value) {
  const filePath = resolveCurationPath(root, relativePath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function readCurationRegistries(root = process.cwd()) {
  return {
    autoAttached: readJson(root, CURATION_PATHS.autoAttached, {version: 1, matcherVersion: "bootstrap", references: []}),
    feedback: readJson(root, CURATION_PATHS.feedback, {version: 1, events: []}),
    manualCorrections: readJson(root, CURATION_PATHS.manualCorrections, {version: 1, corrections: []}),
    researchProfiles: readJson(root, CURATION_PATHS.researchProfiles, {version: 1, profiles: []}),
    embedStates: readJson(root, CURATION_PATHS.embedStates, {version: 1, states: []}),
    qualityStats: readJson(root, CURATION_PATHS.qualityStats, {version: 1, generatedAt: null, stats: []}),
  };
}

export function validateCurrent(root, registries) {
  const validation = validateSourceCurationRegistries({
    catalog: readJson(root, CURATION_PATHS.catalog, {entries: []}),
    autoAttached: registries.autoAttached,
    feedback: registries.feedback,
    manualCorrections: registries.manualCorrections,
    researchProfiles: registries.researchProfiles,
    embedStates: registries.embedStates,
    qualityStats: registries.qualityStats,
  });
  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }
  return validation;
}

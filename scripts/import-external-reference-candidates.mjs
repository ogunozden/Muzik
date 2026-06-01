import {existsSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";

const DEFAULT_ROOT = process.cwd();
export const ALLOWED_BULK_CANDIDATE_STATUSES = new Set(["accepted", "needs-review", "rejected", "conflict"]);

function createImportPaths(root) {
  return {
    catalog: path.join(root, "src", "data", "symbtr", "catalog.generated.json"),
    bulkCandidates: path.join(root, "src", "data", "references", "external-reference-bulk-candidates.json"),
    researchProfiles: path.join(root, "src", "data", "references", "research-source-profiles.json"),
  };
}

export function parseCliOptions(args) {
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

function assertInsideProject(targetPath, root, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to use ${label} outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function readJsonFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readCatalogIds(catalogPath) {
  const catalogData = readJsonFile(catalogPath, "SymbTr catalog");
  return new Set((catalogData.entries ?? []).map((entry) => entry.id));
}

function normalizedHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLocaleLowerCase("en-US");
  } catch {
    return "";
  }
}

function readEnabledResearchProfiles(researchProfilesPath) {
  const profileData = readJsonFile(researchProfilesPath, "research source profiles");
  const profiles = Array.isArray(profileData.profiles) ? profileData.profiles : [];
  return profiles.filter((profile) => profile.enabled !== false);
}

function profileForSourceUrl(source, profiles) {
  const sourceHost = normalizedHost(source?.url);
  if (!sourceHost) return null;

  return profiles.find((profile) => {
    const profileHost = normalizedHost(profile.baseUrl);
    return profileHost && (sourceHost === profileHost || sourceHost.endsWith(`.${profileHost}`));
  }) ?? null;
}

export function normalizeUrlForIdentity(value) {
  try {
    const url = new URL(value);
    url.hash = "";

    if (url.hostname === "youtu.be") {
      return `https://www.youtube.com/watch?v=${url.pathname.replace("/", "")}`.toLocaleLowerCase("en-US");
    }

    if (url.hostname.endsWith("youtube.com") && url.searchParams.has("v")) {
      return `https://www.youtube.com/watch?v=${url.searchParams.get("v")}`.toLocaleLowerCase("en-US");
    }

    url.searchParams.sort();
    return url.toString().replace(/\/$/, "").toLocaleLowerCase("en-US");
  } catch {
    return null;
  }
}

export function getReferenceIdentity(source) {
  return `${source.provider}:${normalizeUrlForIdentity(source.url) ?? String(source.url ?? "").trim().toLocaleLowerCase("en-US")}`;
}

export function validateCandidateSource(catalogId, source, profiles = []) {
  const errors = [];
  const parsedRawUrl = (() => {
    try {
      return new URL(source?.url);
    } catch {
      return null;
    }
  })();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(source?.id ?? ""))) {
    errors.push(`${catalogId}: invalid reference id ${source?.id ?? "<missing>"}`);
  }

  if (!String(source?.label ?? "").trim()) {
    errors.push(`${catalogId}: reference label is empty`);
  }

  if (!parsedRawUrl || !normalizeUrlForIdentity(source?.url)) {
    errors.push(`${catalogId}: reference has an invalid URL`);
  } else if (parsedRawUrl.protocol !== "https:") {
    errors.push(`${catalogId}: reference must use HTTPS`);
  }

  if (source?.access === "embed-allowed" && source?.verification === "manual") {
    errors.push(`${catalogId}: reference cannot be embedded with manual-only verification`);
  }

  if (source?.provider === "youtube" && source?.verification !== "oembed") {
    errors.push(`${catalogId}: YouTube reference must be verified with oEmbed metadata`);
  }

  const sourceProfile = profileForSourceUrl(source, profiles);
  if (!sourceProfile) {
    errors.push(`${catalogId}: accepted reference URL must match a research source profile`);
  } else if (sourceProfile.provider !== source?.provider) {
    errors.push(`${catalogId}: accepted reference provider ${source?.provider ?? "<missing>"} must match research profile ${sourceProfile.id} provider ${sourceProfile.provider}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(source?.verifiedAt ?? ""))) {
    errors.push(`${catalogId}: reference verifiedAt must use YYYY-MM-DD`);
  }

  return errors;
}

export function normalizeCandidates(inputData) {
  if (Array.isArray(inputData)) return inputData;
  if (Array.isArray(inputData.candidates)) return inputData.candidates;
  throw new Error("Input must be an array of candidates or an object with a candidates array");
}

export function validateCandidates(candidates, catalogIds, profiles = []) {
  const seenCandidateIds = new Set();
  const seenAcceptedIdentities = new Set();
  const errors = [];

  for (const candidate of candidates) {
    const catalogId = String(candidate.catalogId ?? "");
    const status = String(candidate.status ?? "");
    const checkedAt = String(candidate.checkedAt ?? "");
    const source = candidate.source ?? {};

    if (!catalogIds.has(catalogId)) {
      errors.push(`${catalogId || "<missing>"}: candidate catalog id is not present in the SymbTr catalog`);
    }

    if (!ALLOWED_BULK_CANDIDATE_STATUSES.has(status)) {
      errors.push(`${catalogId || "<missing>"}: unsupported candidate status ${status || "<missing>"}`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
      errors.push(`${catalogId || "<missing>"}: candidate checkedAt must use YYYY-MM-DD`);
    }

    if (!String(source.id ?? "").trim()) {
      errors.push(`${catalogId || "<missing>"}: candidate source id is required for stable bulk dedupe`);
    }

    const candidateId = `${catalogId}:${source.id ?? "<missing>"}`;
    if (seenCandidateIds.has(candidateId)) {
      errors.push(`${catalogId}: duplicate candidate source id ${source.id}`);
    }
    seenCandidateIds.add(candidateId);

    if (status === "accepted") {
      errors.push(...validateCandidateSource(catalogId, source, profiles));

      const identity = getReferenceIdentity(source);
      if (seenAcceptedIdentities.has(identity)) {
        errors.push(`${catalogId}: duplicate accepted candidate URL identity`);
      }
      seenAcceptedIdentities.add(identity);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid external reference candidates:\n${errors.join("\n")}`);
  }
}

export function mergeCandidates(existingCandidates, incomingCandidates) {
  const byCandidateId = new Map();
  const acceptedIdentities = new Map();
  const merged = [];
  const skipped = [];
  const added = [];

  for (const candidate of existingCandidates) {
    const candidateId = `${candidate.catalogId}:${candidate.source?.id ?? "<missing>"}`;
    byCandidateId.set(candidateId, candidate);
    if (candidate.status === "accepted") {
      acceptedIdentities.set(getReferenceIdentity(candidate.source), candidate);
    }
    merged.push(candidate);
  }

  for (const candidate of incomingCandidates) {
    const candidateId = `${candidate.catalogId}:${candidate.source?.id ?? "<missing>"}`;
    const acceptedIdentity = candidate.status === "accepted" ? getReferenceIdentity(candidate.source) : null;

    if (byCandidateId.has(candidateId) || (acceptedIdentity && acceptedIdentities.has(acceptedIdentity))) {
      skipped.push(candidate);
      continue;
    }

    byCandidateId.set(candidateId, candidate);
    if (acceptedIdentity) {
      acceptedIdentities.set(acceptedIdentity, candidate);
    }
    merged.push(candidate);
    added.push(candidate);
  }

  return {merged, added, skipped};
}

export function runImport({root = DEFAULT_ROOT, inputPath, dryRun}) {
  const paths = createImportPaths(root);
  const safeInputPath = assertInsideProject(inputPath, root, "input file");
  const catalogIds = readCatalogIds(paths.catalog);
  const profiles = readEnabledResearchProfiles(paths.researchProfiles);
  const existingData = readJsonFile(paths.bulkCandidates, "bulk candidate manifest");
  const incomingData = readJsonFile(safeInputPath, "candidate import input");
  const existingCandidates = normalizeCandidates(existingData);
  const incomingCandidates = normalizeCandidates(incomingData);

  validateCandidates(existingCandidates, catalogIds, profiles);
  validateCandidates(incomingCandidates, catalogIds, profiles);

  const {merged, added, skipped} = mergeCandidates(existingCandidates, incomingCandidates);

  if (!dryRun && added.length > 0) {
    writeFileSync(paths.bulkCandidates, `${JSON.stringify({version: existingData.version ?? 1, candidates: merged}, null, 2)}\n`);
  }

  return {
    input: path.relative(root, safeInputPath).split(path.sep).join("/"),
    dryRun,
    existingCandidateCount: existingCandidates.length,
    incomingCandidateCount: incomingCandidates.length,
    addedCandidateCount: added.length,
    skippedDuplicateCount: skipped.length,
    outputCandidateCount: merged.length,
    output: path.relative(root, paths.bulkCandidates).split(path.sep).join("/"),
    addedCatalogIds: added.map((candidate) => candidate.catalogId),
  };
}

export function runImportCli(args = process.argv.slice(2)) {
  const options = parseCliOptions(args);
  const input = options.get("input");

  if (!input) {
    throw new Error("Usage: node scripts/import-external-reference-candidates.mjs --input <project-relative-json> [--dry-run]");
  }

  return runImport({inputPath: input, dryRun: options.get("dry-run") === "true"});
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(runImportCli(), null, 2));
}

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fetchExternalHtmlMetadata} from "./lib/external-metadata-fetch.mjs";
import {inferProvider, mapInboxSource} from "./lib/external-source-matcher.mjs";

const root = process.cwd();
const DEFAULT_INPUT = "src/data/references/external-source-inbox.json";
const DEFAULT_OUTPUT = "output/external-reference-coverage/mapped-external-reference-candidates.json";
const DEFAULT_CSV_OUTPUT = "output/external-reference-coverage/mapped-external-reference-candidates.csv";
const catalogPath = path.join(root, "src", "data", "symbtr", "catalog.generated.json");
const bulkCandidatesPath = path.join(root, "src", "data", "references", "external-reference-bulk-candidates.json");
const ACCEPTED_STATUSES_FOR_WRITE = new Set(["accepted"]);

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

function assertInsideProject(targetPath, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to use ${label} outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function ensureParentDirectory(targetPath) {
  mkdirSync(path.dirname(targetPath), {recursive: true});
}

function readJsonFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  ensureParentDirectory(filePath);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toProjectPath(targetPath) {
  return path.relative(root, targetPath).split(path.sep).join("/");
}

async function fetchPageMetadata(source) {
  return fetchExternalHtmlMetadata(source);
}

async function enrichSource(source, {verifyYoutubeOembed, fetchPageMetadataEnabled}) {
  const provider = inferProvider(source);
  let enrichedSource = source;

  if (fetchPageMetadataEnabled && !source.title) {
    const metadata = await fetchPageMetadata(source);
    enrichedSource = {
      ...enrichedSource,
      title: source.title ?? metadata.title,
      notes: metadata.notes ?? source.notes,
    };
  }

  if (!verifyYoutubeOembed || provider !== "youtube" || enrichedSource.oembedVerified) {
    return enrichedSource;
  }

  const oembedUrl = new URL("https://www.youtube.com/oembed");
  oembedUrl.searchParams.set("url", enrichedSource.url);
  oembedUrl.searchParams.set("format", "json");

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    return {
      ...enrichedSource,
      oembedVerified: false,
      notes: `${enrichedSource.notes ?? ""} YouTube oEmbed verification failed with HTTP ${response.status}.`.trim(),
    };
  }

  const metadata = await response.json();

  return {
    ...enrichedSource,
    title: enrichedSource.title ?? metadata.title,
    author: enrichedSource.author ?? metadata.author_name,
    thumbnailUrl: enrichedSource.thumbnailUrl ?? metadata.thumbnail_url,
    oembedVerified: true,
    verification: "oembed",
  };
}

function normalizeUrlForIdentity(value) {
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

function getReferenceIdentity(source) {
  return `${source.provider}:${normalizeUrlForIdentity(source.url) ?? String(source.url ?? "").trim().toLocaleLowerCase("en-US")}`;
}

function mergeCandidates(existingCandidates, incomingCandidates) {
  const byCandidateId = new Set();
  const acceptedIdentities = new Set();
  const merged = [];
  const added = [];
  const skipped = [];

  for (const candidate of existingCandidates) {
    byCandidateId.add(`${candidate.catalogId}:${candidate.source?.id ?? "<missing>"}`);
    if (candidate.status === "accepted") {
      acceptedIdentities.add(getReferenceIdentity(candidate.source));
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

    byCandidateId.add(candidateId);
    if (acceptedIdentity) acceptedIdentities.add(acceptedIdentity);
    merged.push(candidate);
    added.push(candidate);
  }

  return {merged, added, skipped};
}

function csvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function renderCsv(mappings) {
  const columns = [
    "inboxId",
    "catalogId",
    "status",
    "confidenceScore",
    "confidenceGap",
    "reason",
    "title",
    "makam",
    "form",
    "usul",
    "composer",
    "sourceProvider",
  ];
  const rows = mappings.map((mapping) => ({
    ...mapping,
    ...mapping.evidence,
  }));

  return `${[columns.map(csvValue).join(","), ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(","))].join("\n")}\n`;
}

async function runPipeline({inputPath, outputPath, csvOutputPath, shouldWrite, verifyYoutubeOembed, fetchPageMetadataEnabled}) {
  const safeInputPath = assertInsideProject(inputPath, "source inbox");
  const safeOutputPath = assertInsideProject(outputPath, "mapping output");
  const safeCsvOutputPath = assertInsideProject(csvOutputPath, "mapping CSV output");
  const catalogData = readJsonFile(catalogPath, "SymbTr catalog");
  const inboxData = readJsonFile(safeInputPath, "external source inbox");
  const sources = Array.isArray(inboxData.sources) ? inboxData.sources : [];
  const catalogEntries = catalogData.entries ?? [];
  const enrichedSources = [];
  for (const source of sources) {
    enrichedSources.push(await enrichSource(source, {verifyYoutubeOembed, fetchPageMetadataEnabled}));
  }
  const mappings = enrichedSources.map((source) => mapInboxSource(source, catalogEntries));
  const acceptedCandidates = mappings
    .filter((mapping) => ACCEPTED_STATUSES_FOR_WRITE.has(mapping.status))
    .map((mapping) => mapping.candidate);
  let writeSummary = {
    wroteBulkManifest: false,
    addedCandidateCount: 0,
    skippedDuplicateCount: 0,
    outputCandidateCount: 0,
  };

  if (shouldWrite) {
    const existingData = readJsonFile(bulkCandidatesPath, "bulk candidate manifest");
    const existingCandidates = Array.isArray(existingData.candidates) ? existingData.candidates : [];
    const {merged, added, skipped} = mergeCandidates(existingCandidates, acceptedCandidates);

    if (added.length > 0) {
      writeJsonFile(bulkCandidatesPath, {version: existingData.version ?? 1, candidates: merged});
    }

    writeSummary = {
      wroteBulkManifest: added.length > 0,
      addedCandidateCount: added.length,
      skippedDuplicateCount: skipped.length,
      outputCandidateCount: merged.length,
    };
  }

  const summary = {
    input: toProjectPath(safeInputPath),
    output: toProjectPath(safeOutputPath),
    csvOutput: toProjectPath(safeCsvOutputPath),
    sourceCount: sources.length,
    acceptedCount: mappings.filter((mapping) => mapping.status === "accepted").length,
    needsReviewCount: mappings.filter((mapping) => mapping.status === "needs-review").length,
    rejectedCount: mappings.filter((mapping) => mapping.status === "rejected").length,
    ...writeSummary,
    rule: "Only accepted mappings are eligible for bulk manifest write. Needs-review and rejected mappings stay in the report for curation decisions.",
  };

  writeJsonFile(safeOutputPath, {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary,
    candidates: mappings.map((mapping) => mapping.candidate),
    mappings,
  });
  ensureParentDirectory(safeCsvOutputPath);
  writeFileSync(safeCsvOutputPath, renderCsv(mappings));

  return summary;
}

const options = parseCliOptions(process.argv.slice(2));
const summary = await runPipeline({
  inputPath: options.get("input") ?? DEFAULT_INPUT,
  outputPath: options.get("output") ?? DEFAULT_OUTPUT,
  csvOutputPath: options.get("csv-output") ?? DEFAULT_CSV_OUTPUT,
  shouldWrite: options.get("write") === "true" && options.get("dry-run") !== "true",
  verifyYoutubeOembed: options.get("verify-youtube-oembed") === "true",
  fetchPageMetadataEnabled: options.get("fetch-page-metadata") === "true",
});

console.log(JSON.stringify(summary, null, 2));

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fetchExternalHtmlMetadata} from "./external-metadata-fetch.mjs";
import {inferProvider, mapInboxSource} from "./external-source-matcher.mjs";

export const DEFAULT_MAPPING_INPUT = "src/data/references/external-source-inbox.json";
export const DEFAULT_MAPPING_OUTPUT = "output/external-reference-coverage/mapped-external-reference-candidates.json";
export const DEFAULT_MAPPING_CSV_OUTPUT = "output/external-reference-coverage/mapped-external-reference-candidates.csv";
export const ACCEPTED_STATUSES_FOR_WRITE = new Set(["accepted"]);

function catalogPath(root) {
  return path.join(root, "src", "data", "symbtr", "catalog.generated.json");
}

function bulkCandidatesPath(root) {
  return path.join(root, "src", "data", "references", "external-reference-bulk-candidates.json");
}

export function assertInsideProject(targetPath, root, label) {
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

export function readJsonFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeJsonFile(filePath, value) {
  ensureParentDirectory(filePath);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toProjectPath(targetPath, root) {
  return path.relative(root, targetPath).split(path.sep).join("/");
}

async function fetchPageMetadata(source, fetchImpl) {
  return fetchExternalHtmlMetadata(source, {fetchImpl});
}

function mergeMetadataSignals(currentSignals, incomingSignals) {
  return [
    ...new Set([
      ...(Array.isArray(currentSignals) ? currentSignals : []),
      ...(Array.isArray(incomingSignals) ? incomingSignals : []),
    ].filter(Boolean)),
  ];
}

export async function enrichExternalSource(source, {
  verifyYoutubeOembed = false,
  fetchPageMetadataEnabled = false,
  fetchImpl = fetch,
} = {}) {
  const provider = inferProvider(source);
  let enrichedSource = source;

  if (fetchPageMetadataEnabled && !source.title) {
    const metadata = await fetchPageMetadata(source, fetchImpl);
    enrichedSource = {
      ...enrichedSource,
      title: source.title ?? metadata.title,
      notes: metadata.notes ?? source.notes,
      metadata: {
        ...(enrichedSource.metadata ?? {}),
        htmlTitle: metadata.title,
        htmlDescription: metadata.description,
        htmlAuthor: metadata.author,
        signals: mergeMetadataSignals(enrichedSource.metadata?.signals, metadata.metadataSignals),
      },
    };
  }

  if (!verifyYoutubeOembed || provider !== "youtube" || enrichedSource.oembedVerified) {
    return enrichedSource;
  }

  const oembedUrl = new URL("https://www.youtube.com/oembed");
  oembedUrl.searchParams.set("url", enrichedSource.url);
  oembedUrl.searchParams.set("format", "json");

  const response = await fetchImpl(oembedUrl);
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
    metadata: {
      ...(enrichedSource.metadata ?? {}),
      oembedTitle: metadata.title,
      oembedAuthor: metadata.author_name,
      oembedProvider: metadata.provider_name,
      oembedThumbnailUrl: metadata.thumbnail_url,
      signals: mergeMetadataSignals(enrichedSource.metadata?.signals, [
        "youtube:oembed-title",
        metadata.author_name ? "youtube:oembed-author" : "",
        metadata.provider_name ? "youtube:oembed-provider" : "",
      ]),
    },
    oembedVerified: true,
    verification: "oembed",
  };
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
  return `${source.provider}:${
    normalizeUrlForIdentity(source.url) ?? String(source.url ?? "").trim().toLocaleLowerCase("en-US")
  }`;
}

export function mergeAcceptedCandidates(existingCandidates, incomingCandidates) {
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
    if (!ACCEPTED_STATUSES_FOR_WRITE.has(candidate.status)) {
      skipped.push(candidate);
      continue;
    }

    const candidateId = `${candidate.catalogId}:${candidate.source?.id ?? "<missing>"}`;
    const acceptedIdentity = getReferenceIdentity(candidate.source);

    if (byCandidateId.has(candidateId) || acceptedIdentities.has(acceptedIdentity)) {
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

export function renderMappingCsv(mappings) {
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

export async function runExternalSourceMappingPipeline({
  root = process.cwd(),
  inputPath = DEFAULT_MAPPING_INPUT,
  outputPath = DEFAULT_MAPPING_OUTPUT,
  csvOutputPath = DEFAULT_MAPPING_CSV_OUTPUT,
  shouldWrite = false,
  verifyYoutubeOembed = false,
  fetchPageMetadataEnabled = false,
  fetchImpl = fetch,
} = {}) {
  const safeInputPath = assertInsideProject(inputPath, root, "source inbox");
  const safeOutputPath = assertInsideProject(outputPath, root, "mapping output");
  const safeCsvOutputPath = assertInsideProject(csvOutputPath, root, "mapping CSV output");
  const catalogData = readJsonFile(catalogPath(root), "SymbTr catalog");
  const inboxData = readJsonFile(safeInputPath, "external source inbox");
  const sources = Array.isArray(inboxData.sources) ? inboxData.sources : [];
  const catalogEntries = catalogData.entries ?? [];
  const enrichedSources = [];

  for (const source of sources) {
    enrichedSources.push(await enrichExternalSource(source, {
      verifyYoutubeOembed,
      fetchPageMetadataEnabled,
      fetchImpl,
    }));
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
    const existingData = readJsonFile(bulkCandidatesPath(root), "bulk candidate manifest");
    const existingCandidates = Array.isArray(existingData.candidates) ? existingData.candidates : [];
    const {merged, added, skipped} = mergeAcceptedCandidates(existingCandidates, acceptedCandidates);

    if (added.length > 0) {
      writeJsonFile(bulkCandidatesPath(root), {version: existingData.version ?? 1, candidates: merged});
    }

    writeSummary = {
      wroteBulkManifest: added.length > 0,
      addedCandidateCount: added.length,
      skippedDuplicateCount: skipped.length,
      outputCandidateCount: merged.length,
    };
  }

  const summary = {
    input: toProjectPath(safeInputPath, root),
    output: toProjectPath(safeOutputPath, root),
    csvOutput: toProjectPath(safeCsvOutputPath, root),
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
  writeFileSync(safeCsvOutputPath, renderMappingCsv(mappings));

  return summary;
}

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

const DEFAULT_ROOT = process.cwd();
const DEFAULT_INBOX = "src/data/references/external-source-inbox.json";
const ALLOWED_PROVIDERS = new Set(["archive", "github", "score", "symbtr", "youtube"]);
const OBSERVED_FIELDS = new Set(["makam", "form", "usul", "composer", "lyricist", "lyrics"]);

export function parseCliOptions(args) {
  const options = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const value = inlineValue ?? (args[index + 1]?.startsWith("--") ? "true" : args[index + 1] ?? "true");
    if (inlineValue === undefined && args[index + 1] && !args[index + 1].startsWith("--")) {
      index += 1;
    }

    const values = options.get(key) ?? [];
    values.push(value);
    options.set(key, values);
  }

  return options;
}

export function getOption(options, key, fallback = undefined) {
  const values = options.get(key);
  return values?.at(-1) ?? fallback;
}

export function getOptionValues(options, key) {
  return options.get(key) ?? [];
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
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

export function inferProvider(source) {
  if (source.provider) return source.provider;

  try {
    const hostname = new URL(source.url).hostname;
    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return "youtube";
    if (hostname.endsWith("github.com")) return "github";
    if (hostname.endsWith("zenodo.org") || hostname.includes("archive")) return "archive";
  } catch {
    return "score";
  }

  return "score";
}

export function inferSourceProvider(source) {
  if (source.sourceProvider) return source.sourceProvider;

  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return "external";
  }
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

function toProjectPath(targetPath, root) {
  return path.relative(root, targetPath).split(path.sep).join("/");
}

function readJsonFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function trimExtractedUrl(url) {
  return url.replace(/[),.;:]+$/g, "");
}

export function extractUrlsFromText(text) {
  return [...String(text).matchAll(/https:\/\/[^\s<>"'\]]+/g)].map((match) => trimExtractedUrl(match[0]));
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function normalizeHeader(value) {
  return slugify(value).replace(/-/g, "");
}

function mapFlatSource(record) {
  const source = {};
  const observed = {};

  for (const [rawKey, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") continue;

    const key = normalizeHeader(rawKey);
    if (key === "sourceprovider") {
      source.sourceProvider = value;
    } else if (key === "checkedat" || key === "verifiedat") {
      source.checkedAt = value;
    } else if (key === "catalogid") {
      source.catalogId = value;
    } else if (key === "referenceid") {
      source.referenceId = value;
    } else if (key === "observedtitle") {
      observed.title = value;
    } else if (OBSERVED_FIELDS.has(key)) {
      observed[key] = value;
    } else {
      source[key] = value;
    }
  }

  if (Object.keys(observed).length > 0) source.observed = observed;
  return source;
}

function parseCsvSources(content) {
  const rows = String(content)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);

  if (rows.length === 0) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    return mapFlatSource(record);
  });
}

export function parseSourceInput(content, inputPath = "sources.txt") {
  const extension = path.extname(inputPath).toLocaleLowerCase("en-US");

  if (extension === ".json") {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.sources)) return parsed.sources;
    if (parsed.url) return [parsed];
    throw new Error(`JSON source input must be an array, {sources: []}, or a single source object: ${inputPath}`);
  }

  if (extension === ".csv") {
    return parseCsvSources(content);
  }

  return extractUrlsFromText(content).map((url) => ({url}));
}

function applyCliDefaults(source, defaults) {
  const observed = {
    ...(source.observed ?? {}),
    ...Object.fromEntries(Object.entries(defaults.observed ?? {}).filter(([, value]) => value)),
  };

  return {
    ...defaults.source,
    ...source,
    observed: Object.keys(observed).length > 0 ? observed : undefined,
  };
}

function buildSourceId(source) {
  if (source.id) return slugify(source.id);

  const sourceProvider = slugify(inferSourceProvider(source)).split("-").slice(0, 3).join("-");
  const sourceLabel = slugify(source.title ?? source.observed?.title ?? source.url).split("-").slice(0, 10).join("-");
  return [sourceProvider, sourceLabel].filter(Boolean).join("-");
}

export function normalizeIncomingSource(source, existingIds = new Set()) {
  const url = String(source.url ?? "").trim();
  const parsedUrl = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();

  if (!parsedUrl) {
    throw new Error(`External source has an invalid URL: ${url || "<missing>"}`);
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(`External source must use HTTPS: ${url}`);
  }

  const provider = inferProvider(source);
  if (!ALLOWED_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported external source provider "${provider}" for ${url}`);
  }

  const checkedAt = source.checkedAt ?? todayIsoDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
    throw new Error(`External source checkedAt must use YYYY-MM-DD: ${checkedAt}`);
  }

  const sourceId = buildSourceId({...source, url, provider});
  let uniqueSourceId = sourceId;
  let suffix = 2;
  while (existingIds.has(uniqueSourceId)) {
    uniqueSourceId = `${sourceId}-${suffix}`;
    suffix += 1;
  }
  existingIds.add(uniqueSourceId);

  return {
    id: uniqueSourceId,
    catalogId: source.catalogId,
    provider,
    url,
    title: source.title,
    sourceProvider: inferSourceProvider(source),
    checkedAt,
    observed: source.observed,
    referenceId: source.referenceId,
    label: source.label,
    notes: source.notes,
    access: source.access,
  };
}

function compactSource(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "object" && Object.keys(value).length === 0) return false;
      return true;
    }),
  );
}

function mergeSource(existing, incoming) {
  return compactSource({
    ...existing,
    ...incoming,
    id: existing.id,
    observed: compactSource({
      ...(existing.observed ?? {}),
      ...(incoming.observed ?? {}),
    }),
  });
}

export function createSourcesFromCliOptions(options) {
  const urls = getOptionValues(options, "url");
  const defaults = {
    source: {
      catalogId: getOption(options, "catalog-id"),
      provider: getOption(options, "provider"),
      title: getOption(options, "title"),
      sourceProvider: getOption(options, "source-provider"),
      checkedAt: getOption(options, "checked-at"),
      referenceId: getOption(options, "reference-id"),
      label: getOption(options, "label"),
      notes: getOption(options, "notes"),
      access: getOption(options, "access"),
    },
    observed: {
      title: getOption(options, "observed-title"),
      makam: getOption(options, "makam"),
      form: getOption(options, "form"),
      usul: getOption(options, "usul"),
      composer: getOption(options, "composer"),
      lyricist: getOption(options, "lyricist"),
      lyrics: getOption(options, "lyrics"),
    },
  };

  return urls.map((url) => applyCliDefaults({url}, defaults));
}

export function loadSourcesFromInput(inputPath, root = DEFAULT_ROOT) {
  const safeInputPath = assertInsideProject(inputPath, root, "source input");
  return parseSourceInput(readFileSync(safeInputPath, "utf8"), safeInputPath);
}

export function stageExternalSources({
  root = DEFAULT_ROOT,
  inboxPath = DEFAULT_INBOX,
  inputPath,
  cliSources = [],
  updateExisting = false,
  dryRun = false,
} = {}) {
  const safeInboxPath = assertInsideProject(inboxPath, root, "source inbox");
  const inboxData = readJsonFile(safeInboxPath, "external source inbox");
  const existingSources = Array.isArray(inboxData.sources) ? inboxData.sources : [];
  const inputSources = inputPath ? loadSourcesFromInput(inputPath, root) : [];
  const incomingSources = [...inputSources, ...cliSources];

  if (incomingSources.length === 0) {
    throw new Error("Provide at least one source with --url or --input.");
  }

  const existingIds = new Set(existingSources.map((source) => source.id).filter(Boolean));
  const normalizedIncomingSources = incomingSources.map((source) => compactSource(normalizeIncomingSource(source, existingIds)));
  const byIdentity = new Map(
    existingSources.map((source, index) => [`${inferProvider(source)}:${normalizeUrlForIdentity(source.url) ?? source.url}`, index]),
  );
  const outputSources = [...existingSources];
  const added = [];
  const updated = [];
  const skipped = [];

  for (const source of normalizedIncomingSources) {
    const identity = `${source.provider}:${normalizeUrlForIdentity(source.url) ?? source.url}`;
    const existingIndex = byIdentity.get(identity);

    if (existingIndex !== undefined) {
      if (updateExisting) {
        outputSources[existingIndex] = mergeSource(outputSources[existingIndex], source);
        updated.push(outputSources[existingIndex]);
      } else {
        skipped.push(source);
      }
      continue;
    }

    byIdentity.set(identity, outputSources.length);
    outputSources.push(source);
    added.push(source);
  }

  if (!dryRun && (added.length > 0 || updated.length > 0)) {
    writeJsonFile(safeInboxPath, {
      version: inboxData.version ?? 1,
      sources: outputSources,
    });
  }

  return {
    input: inputPath ? toProjectPath(path.resolve(root, inputPath), root) : "cli",
    inbox: toProjectPath(safeInboxPath, root),
    incomingCount: incomingSources.length,
    addedCount: added.length,
    updatedCount: updated.length,
    skippedDuplicateCount: skipped.length,
    outputSourceCount: outputSources.length,
    dryRun,
    addedIds: added.map((source) => source.id),
    updatedIds: updated.map((source) => source.id),
    skippedDuplicateIds: skipped.map((source) => source.id),
    rule: "Sources are staged by provider plus normalized URL identity. Duplicates are skipped unless --update-existing is set.",
  };
}

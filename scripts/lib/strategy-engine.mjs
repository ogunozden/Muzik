import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeText } from "./external-source-matcher.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const METRICS_DIR = path.join(PROJECT_ROOT, "output", "metrics");
const BEST_STRATEGY_FILE = path.join(METRICS_DIR, "best-strategies.json");
const LOG_FILE = path.join(METRICS_DIR, "strategy-scores.ndjson");

const STRATEGIES = {
  "title-composer": {
    name: "title-composer",
    buildQuery: (group) => [group.title, group.composer].filter(Boolean).join(" "),
    description: "Title + composer only, most distinctive fields",
  },
  "composer-only": {
    name: "composer-only",
    buildQuery: (group) => group.composer || group.title || "",
    description: "Composer only, broadest search",
  },
  "fielded-creator": {
    name: "fielded-creator",
    buildQuery: (group) => {
      const parts = [];
      if (group.title) parts.push(`title:("${group.title}")`);
      if (group.composer) parts.push(`creator:("${group.composer}")`);
      return parts.join(" AND ");
    },
    description: "IA fielded search using title and creator fields",
  },
};

const INTERNET_ARCHIVE_ADVANCED_SEARCH_URL = "https://archive.org/advancedsearch.php";

function buildArchiveSearchUrl(group, rows, strategy) {
  const params = new URLSearchParams();
  const q = strategy.buildQuery(group);
  if (!q) return null;
  params.set("q", q);
  params.set("output", "json");
  params.set("rows", String(rows));
  for (const field of ["identifier", "title", "creator", "description", "mediatype", "collection", "date"]) {
    params.append("fl[]", field);
  }
  return `${INTERNET_ARCHIVE_ADVANCED_SEARCH_URL}?${params.toString()}`;
}

async function tryStrategy(group, rows, strategy, fetchOptions) {
  const url = buildArchiveSearchUrl(group, rows, strategy);
  if (!url) return { strategy: strategy.name, resultCount: 0, error: "empty-query" };

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(fetchOptions.timeoutMs),
      headers: { "user-agent": "MuzikExternalSourceVerifier/1.0 (+local dry-run curation)" },
    });
    const text = await response.text();
    if (text.length > fetchOptions.maxResponseBytes) {
      return { strategy: strategy.name, resultCount: 0, error: "response-too-large" };
    }
    const data = JSON.parse(text);
    const docs = data?.response?.docs ?? [];
    return {
      strategy: strategy.name,
      resultCount: docs.length,
      bestMatch: docs.length > 0 ? scoreTopMatch(group, docs[0]) : 0,
    };
  } catch (error) {
    return { strategy: strategy.name, resultCount: 0, error: error.message };
  }
}

function scoreTopMatch(group, doc) {
  const title = String(doc.title ?? "");
  const creator = Array.isArray(doc.creator) ? doc.creator.join(" ") : String(doc.creator ?? "");
  const text = [title, creator, doc.identifier, String(doc.description ?? "")].join(" ");
  const normalizedText = normalizeText(text);
  const titleTokens = normalizeText(group.title || "").split(/\s+/).filter(Boolean);
  const composerTokens = normalizeText(group.composer || "").split(/\s+/).filter(Boolean);
  let score = 0;
  for (const token of titleTokens) {
    if (normalizedText.includes(token)) score += 10;
  }
  for (const token of composerTokens) {
    if (normalizedText.includes(token)) score += 15;
  }
  return titleTokens.length > 0 ? Math.round((score / (titleTokens.length * 10 + Math.max(composerTokens.length, 1) * 15)) * 100) : 0;
}

function readBestStrategies() {
  try {
    return JSON.parse(readFileSync(BEST_STRATEGY_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeBestStrategies(data) {
  mkdirSync(METRICS_DIR, { recursive: true });
  writeFileSync(BEST_STRATEGY_FILE, JSON.stringify(data, null, 2));
}

function appendLog(entry) {
  mkdirSync(METRICS_DIR, { recursive: true });
  writeFileSync(LOG_FILE, JSON.stringify(entry) + "\n", { flag: "a" });
}

export async function findBestStrategy(providers, catalogIds, rows, fetchOptions) {
  const scores = {};
  const allStrategies = Object.values(STRATEGIES);

  for (const strategy of allStrategies) {
    scores[strategy.name] = { totalResults: 0, totalMatches: 0, attempts: 0 };
  }

  const sampleSize = Math.min(catalogIds.length, 10);
  const sampleIds = catalogIds.slice(0, sampleSize);

  for (const [provider] of providers) {
    if (provider !== "internet-archive") continue;

    for (const catalogId of sampleIds) {
      const group = { title: catalogId.split("--")[3] || "", composer: catalogId.split("--")[4] || "", makam: catalogId.split("--")[0] || "" };
      for (const strategy of allStrategies) {
        const result = await tryStrategy(group, rows, strategy, fetchOptions);
        scores[strategy.name].attempts++;
        scores[strategy.name].totalResults += result.resultCount;
        scores[strategy.name].totalMatches += result.bestMatch || 0;
      }
    }
  }

  const ranked = Object.entries(scores)
    .map(([name, s]) => ({
      name,
      avgResults: s.attempts > 0 ? (s.totalResults / s.attempts).toFixed(2) : 0,
      avgMatchScore: s.attempts > 0 ? (s.totalMatches / s.attempts).toFixed(2) : 0,
    }))
    .sort((a, b) => Number(b.avgMatchScore) - Number(a.avgMatchScore) || Number(b.avgResults) - Number(a.avgResults));

  const best = ranked[0]?.name || "title-composer";

  const entry = {
    timestamp: new Date().toISOString(),
    provider: "internet-archive",
    sampleSize,
    ranked,
    selected: best,
  };

  appendLog(entry);

  const bestStrategies = readBestStrategies();
  bestStrategies["internet-archive"] = { strategy: best, lastUpdated: entry.timestamp };
  writeBestStrategies(bestStrategies);

  return STRATEGIES[best] || STRATEGIES["title-composer"];
}

export function getStrategy(provider, defaultStrategy = "title-composer") {
  const bestStrategies = readBestStrategies();
  const entry = bestStrategies[provider];
  if (entry && STRATEGIES[entry.strategy]) {
    return STRATEGIES[entry.strategy];
  }
  return STRATEGIES[defaultStrategy] || STRATEGIES["title-composer"];
}

export function buildArchiveSearchUrlWithStrategy(group, rows, provider = "internet-archive") {
  const strategy = getStrategy(provider);
  return buildArchiveSearchUrl(group, rows, strategy);
}

#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {callGeminiGrounded} from "./lib/ai-client.mjs";
import {getConfig} from "./lib/ai-config.mjs";
import {getOption, parseCliOptions} from "./lib/external-source-intake.mjs";
import {fetchExternalHtmlMetadata} from "./lib/external-metadata-fetch.mjs";
import {
  buildSourceSuggestionEvent,
  normalizeGroundedSuggestion,
  summarizeSuggestionStatuses,
  validateSourceSuggestionManifest,
} from "./lib/source-suggestion-model.mjs";

const PROJECT_ROOT = process.cwd();
const DEFAULT_GROUPS_PATH = "output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json";
const DEFAULT_PROFILES_PATH = "src/data/references/research-source-profiles.json";
const DEFAULT_OUT_DIR = "output/external-source-discovery";
const DEFAULT_LIMIT = 5;

export const SOURCE_SUGGESTION_SYSTEM_PROMPT = `You are producing external source suggestions for a Turkish classical music catalog.
Use Google Search grounding only to find plausible public source pages.

Rules:
- Return JSON only.
- Never return status "accepted" or "verified".
- Allowed suggestion statuses are "auto-suggested", "disputed", "rejected", "deferred".
- Prefer public catalog, score, archive, official page, and recording URLs.
- Do not request or imply media/PDF/audio/video download.
- Do not copy page content. Return URL, title/provider metadata, conflicts and short rationale only.
- If metadata conflicts with makam, usul, form, title or composer, use "disputed".
- If the source cannot be independently checked, use "deferred".

JSON shape:
{
  "catalogId": "string",
  "suggestions": [
    {
      "url": "https://...",
      "title": "visible source title",
      "sourceProvider": "site or collection name",
      "status": "auto-suggested|disputed|rejected|deferred",
      "confidence": "high|medium|low",
      "reason": "short Turkish reason",
      "conflicts": ["optional conflict"]
    }
  ]
}`;

function resolveInsideProject(relativePath, label) {
  const target = path.resolve(PROJECT_ROOT, relativePath);
  const relative = path.relative(PROJECT_ROOT, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to access ${label} outside project: ${target}`);
  }
  return target;
}

function readJson(relativePath, fallback = null) {
  const filePath = resolveInsideProject(relativePath, "input");
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(relativePath, value) {
  const filePath = resolveInsideProject(relativePath, "output");
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readCheckpoint(outDir) {
  return readJson(path.join(outDir, "gemini-source-suggestions-checkpoint.json"), {
    version: 1,
    completedCatalogIds: [],
    failed: [],
    lastOffset: -1,
  });
}

function writeCheckpoint(outDir, checkpoint) {
  writeJson(path.join(outDir, "gemini-source-suggestions-checkpoint.json"), checkpoint);
}

function asCatalogSnapshot(group) {
  return {
    catalogId: group.catalogId,
    title: group.title,
    makam: group.makam,
    form: group.form,
    usul: group.usul,
    composer: group.composer,
    priorityGroup: group.priorityGroup,
    currentStatus: group.status,
    candidateCount: group.candidateCount,
    knownProfiles: group.profiles,
  };
}

export function buildGroundedSourcePrompt(group) {
  return [
    "Find public source suggestions for this catalog entry.",
    "Return at most 3 suggestions. Search leads are suggestions only, never accepted product data.",
    JSON.stringify({catalog: asCatalogSnapshot(group)}, null, 2),
  ].join("\n\n");
}

export function extractSuggestionsFromParsed(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.suggestions)) return parsed.suggestions;
  if (Array.isArray(parsed?.sources)) return parsed.sources;
  return [];
}

export function extractSuggestionsFromGroundingMetadata(groundingMetadata) {
  const chunks = Array.isArray(groundingMetadata?.groundingChunks) ? groundingMetadata.groundingChunks : [];
  return chunks
    .map((chunk) => chunk?.web)
    .filter((web) => typeof web?.uri === "string" && web.uri.startsWith("https://"))
    .map((web) => ({
      url: web.uri,
      title: web.title || web.uri,
      sourceProvider: (() => {
        try {
          return new URL(web.uri).hostname.replace(/^www\./, "");
        } catch {
          return "grounding-metadata";
        }
      })(),
      status: "deferred",
      confidence: "low",
      reason: "Gemini JSON onerisi donmedi; Google Search grounding kaynagi metadata validator incelemesine alindi.",
      conflicts: ["llm-json-missing"],
    }));
}

async function getMetadataForSuggestion(suggestion, skipMetadataFetch) {
  if (skipMetadataFetch) return {};
  const url = suggestion?.url ?? suggestion?.httpsUrl;
  if (typeof url !== "string" || !url.startsWith("https://")) return {};
  try {
    return await fetchExternalHtmlMetadata({url});
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "metadata fetch failed",
    };
  }
}

export async function resolveGroundingRedirectSuggestion(suggestion, fetcher = fetch) {
  const url = suggestion?.url ?? suggestion?.httpsUrl;
  if (typeof url !== "string") return suggestion;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return suggestion;
  }
  if (parsed.hostname !== "vertexaisearch.cloud.google.com") return suggestion;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {"user-agent": "MuzikGeminiGroundingRedirectResolver/1.0"},
    });
    const location = response.headers?.get?.("location");
    if (typeof location !== "string" || !location.startsWith("https://")) return suggestion;
    return {
      ...suggestion,
      url: location,
      sourceProvider: (() => {
        try {
          return new URL(location).hostname.replace(/^www\./, "");
        } catch {
          return suggestion.sourceProvider;
        }
      })(),
      groundingRedirectUrl: url,
    };
  } catch {
    return suggestion;
  } finally {
    clearTimeout(timer);
  }
}

function buildManifest({startedAt, generatedAt, provider, config, groupsPath, offset, limit, selectedGroups, suggestions, events, failures}) {
  return {
    version: 1,
    type: "gemini-grounded-source-suggestions",
    generatedAt,
    dryRun: true,
    provider,
    model: config.model,
    limitPolicy: config.limitPolicy,
    quota: {
      maxPromptsPerRun: config.maxPromptsPerRun,
      dailySoftLimit: config.dailySoftLimit,
      usagePath: config.usagePath,
      minIntervalMs: config.minIntervalMs,
    },
    input: {
      groupsPath,
      offset,
      limit,
      selectedGroupCount: selectedGroups.length,
      selectedCatalogIds: selectedGroups.map((group) => group.catalogId),
    },
    policy: {
      acceptedOutputCount: 0,
      directAutoAttachCount: 0,
      mediaDownloadCount: 0,
      acceptedOnlyAfterValidation: true,
      weakLabelOnly: true,
    },
    summary: {
      startedAt,
      generatedAt,
      suggestionCount: suggestions.length,
      failedGroupCount: failures.length,
      statuses: summarizeSuggestionStatuses(suggestions),
    },
    suggestions,
    events,
    failures,
  };
}

function isQuotaError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /RESOURCE_EXHAUSTED|Quota exceeded|generate_content_free_tier_requests|rate-limits/i.test(message);
}

export async function runGeminiGroundedSourceSuggestions({
  groupsPath = DEFAULT_GROUPS_PATH,
  profilesPath = DEFAULT_PROFILES_PATH,
  outDir = DEFAULT_OUT_DIR,
  limit = DEFAULT_LIMIT,
  offset = 0,
  provider = "gemini-grounded",
  skipCompleted = true,
  skipMetadataFetch = false,
  maxPrompts = null,
} = {}) {
  const groups = readJson(groupsPath, []);
  const profiles = readJson(profilesPath, {profiles: []})?.profiles ?? [];
  const {config} = getConfig(provider);
  const promptLimit = Math.min(
    Number(limit),
    Number.isInteger(maxPrompts) ? maxPrompts : Number(config.maxPromptsPerRun ?? limit),
  );
  const checkpoint = readCheckpoint(outDir);
  const completed = new Set(checkpoint.completedCatalogIds ?? []);
  const selectedGroups = groups
    .slice(offset, offset + Number(limit))
    .filter((group) => !skipCompleted || !completed.has(group.catalogId))
    .slice(0, promptLimit);
  const startedAt = new Date().toISOString();
  const suggestions = [];
  const events = [];
  const failures = [];
  const seenIdentities = new Set();

  for (const [requestIndex, group] of selectedGroups.entries()) {
    const requestId = `source-suggestion:${group.catalogId}`;
    try {
      const response = await callGeminiGrounded(
        SOURCE_SUGGESTION_SYSTEM_PROMPT,
        buildGroundedSourcePrompt(group),
        {providerOverride: provider, requestIndex, requestId},
      );
      const rawSuggestions = extractSuggestionsFromParsed(response.parsed);
      const fallbackSuggestions = rawSuggestions.length > 0
        ? []
        : extractSuggestionsFromGroundingMetadata(response.groundingMetadata);
      const candidateSuggestions = rawSuggestions.length > 0 ? rawSuggestions : fallbackSuggestions;
      const checkedAt = new Date().toISOString();

      if (candidateSuggestions.length === 0) {
        failures.push({catalogId: group.catalogId, reason: "no suggestions in grounded response"});
      }

      for (const [suggestionIndex, rawSuggestion] of candidateSuggestions.entries()) {
        const resolvedSuggestion = await resolveGroundingRedirectSuggestion(rawSuggestion);
        const metadata = await getMetadataForSuggestion(resolvedSuggestion, skipMetadataFetch);
        const normalized = normalizeGroundedSuggestion({
          catalogId: group.catalogId,
          suggestion: resolvedSuggestion,
          index: suggestionIndex,
          checkedAt,
          profiles,
          metadata,
          groundingMetadata: response.groundingMetadata,
          seenIdentities,
        });
        suggestions.push(normalized);
        events.push(buildSourceSuggestionEvent({
          catalogId: group.catalogId,
          sourceId: normalized.sourceId,
          eventType: "source_suggested",
          createdAt: checkedAt,
          createdBy: provider,
          nextValue: {
            status: normalized.status,
            url: normalized.url,
            profileId: normalized.profileId,
            acceptedEligible: false,
          },
        }));
      }

      completed.add(group.catalogId);
      checkpoint.completedCatalogIds = Array.from(completed).sort((left, right) => left.localeCompare(right, "en"));
      checkpoint.lastOffset = offset + requestIndex;
      writeCheckpoint(outDir, checkpoint);
    } catch (error) {
      const failure = {
        catalogId: group.catalogId,
        reason: error instanceof Error ? error.message : "unknown error",
      };
      failures.push(failure);
      checkpoint.failed = [...(checkpoint.failed ?? []), failure];
      checkpoint.lastOffset = offset + requestIndex;
      writeCheckpoint(outDir, checkpoint);
      if (isQuotaError(error)) {
        checkpoint.quotaExhaustedAt = new Date().toISOString();
        checkpoint.quotaExhaustedReason = failure.reason;
        writeCheckpoint(outDir, checkpoint);
        break;
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const manifest = buildManifest({
    startedAt,
    generatedAt,
    provider,
    config,
    groupsPath,
    offset,
    limit,
    selectedGroups,
    suggestions,
    events,
    failures,
  });
  const validation = validateSourceSuggestionManifest(manifest);
  if (!validation.ok) {
    throw new Error(`Invalid Gemini source suggestion manifest:\n${validation.errors.join("\n")}`);
  }

  writeJson(path.join(outDir, "gemini-source-suggestions.json"), manifest);
  writeJson(path.join(outDir, "gemini-source-suggestions-summary.json"), {
    version: 1,
    type: "gemini-grounded-source-suggestions-summary",
    generatedAt,
    summary: manifest.summary,
    quota: manifest.quota,
    policy: manifest.policy,
  });

  return manifest;
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const limit = Number(getOption(options, "limit", DEFAULT_LIMIT));
  const offset = Number(getOption(options, "offset", 0));
  const maxPromptsOption = getOption(options, "max-prompts");
  const outDir = getOption(options, "out-dir", DEFAULT_OUT_DIR);
  const manifest = await runGeminiGroundedSourceSuggestions({
    groupsPath: getOption(options, "groups-path", DEFAULT_GROUPS_PATH),
    profilesPath: getOption(options, "profiles-path", DEFAULT_PROFILES_PATH),
    outDir,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    provider: getOption(options, "provider", "gemini-grounded"),
    skipCompleted: getOption(options, "skip-completed", "true") !== "false",
    skipMetadataFetch: getOption(options, "skip-metadata-fetch", "true") !== "false",
    maxPrompts: maxPromptsOption === undefined ? null : Number(maxPromptsOption),
  });

  console.log(JSON.stringify({
    suggestionCount: manifest.summary.suggestionCount,
    failedGroupCount: manifest.summary.failedGroupCount,
    statuses: manifest.summary.statuses,
    output: path.join(outDir, "gemini-source-suggestions.json"),
  }, null, 2));
}

const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

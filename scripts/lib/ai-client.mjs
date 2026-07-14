import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {GoogleGenAI} from "@google/genai";
import {getConfig} from "./ai-config.mjs";

// Parse JSON from LLM response (handles markdown fences + comments + partial JSON)
export function parseJsonResponse(content) {
  let text = content.trim();

  // Strip JSON comments (/* */ and //)
  text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
      }
    }

    const startObj = text.indexOf("{");
    const startArr = text.indexOf("[");
    const start = startObj >= 0 && startArr >= 0
      ? Math.min(startObj, startArr)
      : Math.max(startObj, startArr);

    if (start >= 0) {
      const opening = text[start];
      const closing = opening === "{" ? "}" : "]";
      let depth = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
          if (escapeNext) {escapeNext = false; continue;}
          if (ch === "\\") {escapeNext = true; continue;}
          if (ch === '"') {inString = false;}
          continue;
        }
        if (ch === '"') {inString = true; continue;}
        if (ch === opening) {depth++;}
        else if (ch === closing) {depth--; if (depth === 0) {
          try {
            return JSON.parse(text.substring(start, i + 1));
          } catch {
            break;
          }
        }}
      }
    }
    throw new Error("Could not extract valid JSON from LLM response");
  }
}

let lastGeminiCall = 0;

async function waitForRateLimit(config = {}) {
  const now = Date.now();
  const minInterval = Number(config.minIntervalMs ?? 1000);
  if (lastGeminiCall > 0) {
    const elapsed = now - lastGeminiCall;
    if (elapsed < minInterval) {
      const wait = minInterval - elapsed;
      await new Promise(r => setTimeout(r, wait));
    }
  }
  lastGeminiCall = Date.now();
}

function assertGeminiApiKey(config) {
  if (!config.apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is required for Gemini providers");
  }
}

function getTextFromGeminiResponse(response) {
  if (typeof response.text === "function") return response.text();
  return response.text ?? response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

function getGroundingMetadata(response) {
  return response.candidates?.[0]?.groundingMetadata ?? response.groundingMetadata ?? null;
}

function safeProjectPath(projectRoot, relativePath) {
  const target = path.resolve(projectRoot, relativePath);
  const relative = path.relative(projectRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write AI usage outside project: ${target}`);
  }
  return target;
}

function readGroundingUsage(config, projectRoot) {
  if (!config.usagePath) return {version: 1, days: {}};
  const usagePath = safeProjectPath(projectRoot, config.usagePath);
  if (!existsSync(usagePath)) return {version: 1, days: {}};
  return JSON.parse(readFileSync(usagePath, "utf8"));
}

function writeGroundingUsage(config, projectRoot, usage) {
  if (!config.usagePath) return;
  const usagePath = safeProjectPath(projectRoot, config.usagePath);
  mkdirSync(path.dirname(usagePath), {recursive: true});
  writeFileSync(usagePath, `${JSON.stringify(usage, null, 2)}\n`);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function assertGroundingBudget(config, projectRoot, requestIndex = 0) {
  const maxPromptsPerRun = Number(config.maxPromptsPerRun ?? 0);
  if (maxPromptsPerRun > 0 && requestIndex >= maxPromptsPerRun) {
    throw new Error(`Gemini grounding run budget exhausted: ${requestIndex}/${maxPromptsPerRun}`);
  }

  const dailySoftLimit = Number(config.dailySoftLimit ?? 0);
  if (dailySoftLimit > 0) {
    const usage = readGroundingUsage(config, projectRoot);
    const today = getTodayKey();
    const used = Number(usage.days?.[today]?.groundedPromptCount ?? 0);
    if (used >= dailySoftLimit) {
      throw new Error(`Gemini grounding daily soft limit exhausted: ${used}/${dailySoftLimit}`);
    }
  }
}

function recordGroundingUse(config, projectRoot, metadata, requestInfo = {}) {
  const usage = readGroundingUsage(config, projectRoot);
  const today = getTodayKey();
  const day = usage.days[today] ?? {
    groundedPromptCount: 0,
    webSearchQueryCount: 0,
    requests: [],
  };
  const webSearchQueries = Array.isArray(metadata?.webSearchQueries) ? metadata.webSearchQueries : [];
  day.groundedPromptCount += 1;
  day.webSearchQueryCount += webSearchQueries.length;
  day.requests.push({
    at: new Date().toISOString(),
    model: config.model,
    provider: requestInfo.provider,
    requestId: requestInfo.requestId,
    webSearchQueryCount: webSearchQueries.length,
    webSearchQueries,
  });
  usage.days[today] = day;
  writeGroundingUsage(config, projectRoot, usage);
  return day;
}

// Call Gemini API
async function callGemini(systemPrompt, userPrompt, config, options = {}) {
  assertGeminiApiKey(config);
  await waitForRateLimit(config);
  const genAI = new GoogleGenAI({apiKey: config.apiKey});
  const response = await genAI.models.generateContent({
    model: config.model,
    contents: `${systemPrompt}\n\n${userPrompt}`,
    config: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      tools: config.grounding ? [{googleSearch: {}}] : undefined,
    },
  });

  const text = getTextFromGeminiResponse(response);
  return {
    text,
    groundingMetadata: getGroundingMetadata(response),
    response,
    requestInfo: options.requestInfo ?? {},
  };
}

// Call Ollama API (OpenAI-compatible endpoint)
async function callOllama(systemPrompt, userPrompt, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        model: config.model,
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: userPrompt},
        ],
        stream: false,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    clearTimeout(timer);
    if (error.name === "AbortError") throw new Error("Ollama request timed out");
    throw error;
  }
}

// Unified AI call: returns {raw, parsed} - parsed is null on JSON failure
export async function callAI(systemPrompt, userPrompt, providerOverride) {
  const {provider, config} = getConfig(providerOverride);
  const activeProvider = providerOverride || provider;

  let rawContent;
  if (activeProvider === "ollama") {
    rawContent = await callOllama(systemPrompt, userPrompt, config);
  } else if (activeProvider === "gemini-flash" || activeProvider === "gemini-pro" || activeProvider === "gemini-3.5-flash") {
    rawContent = (await callGemini(systemPrompt, userPrompt, config)).text;
  } else {
    throw new Error(`Unsupported provider: ${activeProvider}`);
  }

  try {
    return {raw: rawContent, parsed: parseJsonResponse(rawContent)};
  } catch {
    return {raw: rawContent, parsed: null};
  }
}

export async function callGeminiGrounded(systemPrompt, userPrompt, {
  providerOverride = "gemini-grounded",
  requestIndex = 0,
  requestId,
} = {}) {
  const {config, projectRoot} = getConfig(providerOverride);
  if (!config.grounding) {
    throw new Error(`Provider ${providerOverride} is not configured for Gemini grounding`);
  }

  assertGroundingBudget(config, projectRoot, requestIndex);
  const result = await callGemini(systemPrompt, userPrompt, config, {
    requestInfo: {provider: providerOverride, requestId},
  });
  const usage = recordGroundingUse(config, projectRoot, result.groundingMetadata, {
    provider: providerOverride,
    requestId,
  });

  try {
    return {
      raw: result.text,
      parsed: parseJsonResponse(result.text),
      groundingMetadata: result.groundingMetadata,
      usage,
      limitPolicy: config.limitPolicy,
    };
  } catch {
    return {
      raw: result.text,
      parsed: null,
      groundingMetadata: result.groundingMetadata,
      usage,
      limitPolicy: config.limitPolicy,
    };
  }
}

// Health check: test connection to configured provider
export async function checkHealth(providerOverride) {
  const {provider, config} = getConfig(providerOverride);
  const activeProvider = providerOverride || provider;

  try {
    if (activeProvider === "ollama") {
      const res = await fetch(`${config.baseUrl}/models`, {method: "GET"});
      if (!res.ok) throw new Error("Ollama not reachable");
      const data = await res.json();
      return {ok: true, model: data.data?.[0]?.id || "unknown", provider: "ollama"};
    } else {
      assertGeminiApiKey(config);
      const genAI = new GoogleGenAI({apiKey: config.apiKey});
      const result = await genAI.models.generateContent({
        model: config.model,
        contents: "test",
      });
      if (!getTextFromGeminiResponse(result)) throw new Error("Gemini not reachable");
      return {ok: true, model: config.model, provider: "gemini"};
    }
  } catch (error) {
    return {ok: false, error: error.message, provider: activeProvider};
  }
}

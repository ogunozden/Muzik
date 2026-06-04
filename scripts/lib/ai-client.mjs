import {GoogleGenerativeAI} from "@google/generative-ai";
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

// Rate limiter: Gemini free tier = 1K RPM, 0.06s aralik yeterli
let lastGeminiCall = 0;

async function waitForRateLimit() {
  const now = Date.now();
  const minInterval = 100; // 100ms = ~600 RPM (emniyet marjiyla 1K RPM altinda)
  if (lastGeminiCall > 0) {
    const elapsed = now - lastGeminiCall;
    if (elapsed < minInterval) {
      const wait = minInterval - elapsed;
      await new Promise(r => setTimeout(r, wait));
    }
  }
  lastGeminiCall = Date.now();
}

// Call Gemini API
async function callGemini(systemPrompt, userPrompt, config) {
  await waitForRateLimit();
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({model: config.model});

  const result = await model.generateContent({
    contents: [{role: "user", parts: [{text: `${systemPrompt}\n\n${userPrompt}`}]}],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    },
  });

  const text = result.response.text();
  return text;
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
  } else if (activeProvider === "gemini-flash" || activeProvider === "gemini-pro") {
    rawContent = await callGemini(systemPrompt, userPrompt, config);
  } else {
    throw new Error(`Unsupported provider: ${activeProvider}`);
  }

  try {
    return {raw: rawContent, parsed: parseJsonResponse(rawContent)};
  } catch {
    return {raw: rawContent, parsed: null};
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
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({model: config.model});
      const result = await model.generateContent("test");
      if (!result.response) throw new Error("Gemini not reachable");
      return {ok: true, model: config.model, provider: "gemini"};
    }
  } catch (error) {
    return {ok: false, error: error.message, provider: activeProvider};
  }
}

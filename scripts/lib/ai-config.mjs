import {loadEnvFile} from "node:process";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {existsSync} from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");

// Load local script env files without exposing their values.
for (const envFile of [".env", ".env.local"]) {
  const envPath = resolve(PROJECT_ROOT, envFile);
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

export function getConfig(providerOverride) {
  const provider = providerOverride || process.env.AI_PROVIDER || "gemini-flash";
  const groundingMaxPrompts = Number(process.env.GEMINI_GROUNDING_MAX_PROMPTS_PER_RUN ?? 10);
  const groundingDailySoftLimit = Number(process.env.GEMINI_GROUNDING_DAILY_SOFT_LIMIT ?? 20);

  const configs = {
    "gemini-flash": {
      provider: "gemini",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: "gemini-2.5-flash-lite",
      temperature: 0.1,
      maxTokens: 8192,
      timeout: 60000,
      grounding: false,
      minIntervalMs: 1000,
      limitPolicy: "Model quotas are provider-managed; scripts must not assume unlimited free use.",
    },
    "gemini-pro": {
      provider: "gemini",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: "gemini-2.5-pro",
      temperature: 0.1,
      maxTokens: 8192,
      timeout: 120000,
      grounding: false,
      minIntervalMs: 1000,
      limitPolicy: "Use only when an explicit batch budget is set.",
    },
    "gemini-grounded": {
      provider: "gemini",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: process.env.GEMINI_GROUNDING_MODEL || "gemini-2.5-flash",
      temperature: 0.1,
      maxTokens: 8192,
      timeout: 120000,
      grounding: true,
      minIntervalMs: Number(process.env.GEMINI_GROUNDING_MIN_INTERVAL_MS ?? 2500),
      maxPromptsPerRun: Number.isFinite(groundingMaxPrompts) ? Math.max(0, groundingMaxPrompts) : 25,
      dailySoftLimit: Number.isFinite(groundingDailySoftLimit) ? Math.max(0, groundingDailySoftLimit) : 450,
      usagePath: "output/ai-usage/gemini-grounding-usage.json",
      limitPolicy: "Grounding calls are capped per run and per local-day soft limit; search results stay suggestions until validated.",
    },
    "gemini-3.5-flash": {
      provider: "gemini",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: "gemini-3.5-flash",
      temperature: 0.1,
      maxTokens: 8192,
      timeout: 120000,
      grounding: false,
      minIntervalMs: 1000,
      limitPolicy: "Preview/new model quotas can change; scripts must use explicit limits.",
    },
    ollama: {
      provider: "ollama",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
      model: process.env.OLLAMA_MODEL || "qwen2.5:14b",
      temperature: 0.1,
      maxTokens: 4096,
      timeout: 300000,
    },
  };

  const config = configs[provider];
  if (!config) throw new Error(`Unknown AI provider: ${provider}`);

  return {provider, config, projectRoot: PROJECT_ROOT};
}

import {loadEnvFile} from "node:process";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {existsSync} from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");

// Load .env from project root
const envPath = resolve(PROJECT_ROOT, ".env");
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

export function getConfig(providerOverride) {
  const provider = providerOverride || process.env.AI_PROVIDER || "gemini-flash";

  const configs = {
    "gemini-flash": {
      provider: "gemini",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: "gemini-2.5-flash-lite",
      temperature: 0.1,
      maxTokens: 8192,
      timeout: 60000,
      freeTier: true,      // 4K RPM, Unlimited RPD, $0
    },
    "gemini-pro": {
      provider: "gemini",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: "gemini-2.5-pro",
      temperature: 0.1,
      maxTokens: 8192,
      timeout: 120000,
      freeTier: false,     // billing gerekli
    },
    "gemini-3.5-flash": {
      provider: "gemini",
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: "gemini-3.5-flash",
      temperature: 0.1,
      maxTokens: 8192,
      timeout: 120000,
      freeTier: true,      // 1K RPM, 10K RPD, $0
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

#!/usr/bin/env node
/**
 * Muzik AI Source Discovery
 * Uses local LM Studio (192.168.1.16:1234) for catalog-to-source matching.
 * Devinim-independent. Direct HTTP to local inference.
 */

import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const LM_STUDIO_BASE_URL = "http://192.168.1.16:1234";
const LM_STUDIO_MODEL = "qwen3.5-35b-a3b-main";
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes for thinking mode

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Read system prompt
function loadSystemPrompt() {
  const promptPath = path.join(PROJECT_ROOT, "docs", "ai-orchestrator-prompt.md");
  try {
    return readFileSync(promptPath, "utf8");
  } catch {
    // Fallback if file missing
    return `You are a Turkish classical music source matching assistant.
Rules: 1) Only suggest sources with URLs 2) Never use "maybe"/"probably" 3) Reject collection-level matches 4) Output strict JSON`;
  }
}

// Read catalog entries
function loadCatalogEntries(limit = 10) {
  const catalogPath = path.join(PROJECT_ROOT, "src", "data", "symbtr", "catalog.generated.json");
  const data = JSON.parse(readFileSync(catalogPath, "utf8"));
  const entries = data.entries || [];
  return entries.slice(0, limit);
}

// Build user prompt from catalog entries
function buildUserPrompt(entries) {
  const entryTexts = entries.map((e, i) => {
    return `${i + 1}. ${e.title} | Makam: ${e.makam} | Form: ${e.form} | Usul: ${e.usul} | Bestekar: ${e.composer}${e.lyricist ? " | Guftekar: " + e.lyricist : ""}`;
  }).join("\n");

  return `Aşağıdaki klasik Türk müziği eserleri için DivanMakam (divanmakam.com/forum), SalihBora (salihbora.com), veya OGM Materyal (ogmmateryal.eba.gov.tr) sitelerinde gerçek nota/kaynak URL'leri var mı araştır.

Eserler:
${entryTexts}

Her eser için SADECE kesin bulduğun kaynakları JSON olarak döndür. Emin değilsen rejected olarak işaretle.

Cevap formatı:
{
  "results": [
    {
      "catalogId": "...",
      "status": "accepted|needs-review|rejected",
      "source": {
        "url": "https://...",
        "title": "...",
        "provider": "divanmakam|salihbora|ogm-materyal|other"
      },
      "matchEvidence": {
        "titleMatch": true|false,
        "composerMatch": true|false,
        "makamMatch": true|false,
        "usulMatch": true|false
      },
      "reason": "..."
    }
  ]
}`;
}

// Call LM Studio API
async function callLmStudio(systemPrompt, userPrompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${LM_STUDIO_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: LM_STUDIO_MODEL,
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: userPrompt},
        ],
        stream: false,
        temperature: 0.1, // Deterministic, low creativity
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`LM Studio HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return content;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === "AbortError") {
      throw new Error("LM Studio request timed out after 5 minutes");
    }
    throw error;
  }
}

// Parse JSON from LLM response (handles markdown fences)
function parseJsonResponse(content) {
  const text = content.trim();

  // Try direct JSON parse
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // fall through
      }
    }

    // Try finding JSON object/array in text
    const startObj = text.indexOf("{");
    const startArr = text.indexOf("[");
    const start = startObj >= 0 && startArr >= 0
      ? Math.min(startObj, startArr)
      : Math.max(startObj, startArr);

    if (start >= 0) {
      // Find matching end bracket
      const opening = text[start];
      const closing = opening === "{" ? "}" : "]";
      let depth = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
          if (escapeNext) { escapeNext = false; continue; }
          if (ch === "\\") { escapeNext = true; continue; }
          if (ch === '"') { inString = false; }
          continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === opening) { depth++; }
        else if (ch === closing) { depth--; if (depth === 0) {
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

// Main
async function main() {
  const args = process.argv.slice(2);
  const limit = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1]) || 5;
  const offset = Number(args.find(a => a.startsWith("--offset="))?.split("=")[1]) || 0;

  console.log(`[Muzik AI Discovery] Connecting to LM Studio at ${LM_STUDIO_BASE_URL}...`);

  // Health check
  try {
    const health = await fetch(`${LM_STUDIO_BASE_URL}/v1/models`, {method: "GET"});
    if (!health.ok) throw new Error("Health check failed");
    const models = await health.json();
    const modelId = models.data?.[0]?.id || "unknown";
    console.log(`[OK] LM Studio reachable. Model: ${modelId}`);
  } catch (error) {
    console.error(`[FAIL] Cannot reach LM Studio: ${error.message}`);
    console.error("Make sure LM Studio is running at 192.168.1.16:1234");
    process.exit(1);
  }

  const systemPrompt = loadSystemPrompt();
  const allEntries = loadCatalogEntries(offset + limit);
  const entries = allEntries.slice(offset, offset + limit);

  console.log(`[INFO] Processing ${entries.length} catalog entries (offset=${offset}, limit=${limit})...`);

  const userPrompt = buildUserPrompt(entries);

  console.log("[INFO] Sending request to LM Studio (this may take a few minutes with thinking mode)...");
  const startTime = Date.now();

  try {
    const content = await callLmStudio(systemPrompt, userPrompt);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[OK] Response received in ${duration}s`);

    const parsed = parseJsonResponse(content);

    // Validate structure
    if (!parsed.results || !Array.isArray(parsed.results)) {
      throw new Error("Invalid response structure: missing 'results' array");
    }

    // Summary
    const accepted = parsed.results.filter(r => r.status === "accepted");
    const needsReview = parsed.results.filter(r => r.status === "needs-review");
    const rejected = parsed.results.filter(r => r.status === "rejected");

    console.log(`\n=== RESULTS ===`);
    console.log(`Total processed: ${parsed.results.length}`);
    console.log(`Accepted: ${accepted.length}`);
    console.log(`Needs review: ${needsReview.length}`);
    console.log(`Rejected: ${rejected.length}`);

    if (accepted.length > 0) {
      console.log(`\n--- ACCEPTED ---`);
      for (const r of accepted) {
        console.log(`  ${r.catalogId}`);
        console.log(`    URL: ${r.source?.url || "N/A"}`);
        console.log(`    Title: ${r.source?.title || "N/A"}`);
        console.log(`    Provider: ${r.source?.provider || "N/A"}`);
        console.log(`    Reason: ${r.reason || "N/A"}`);
      }
    }

    if (needsReview.length > 0) {
      console.log(`\n--- NEEDS REVIEW ---`);
      for (const r of needsReview) {
        console.log(`  ${r.catalogId}: ${r.reason || "N/A"}`);
      }
    }

    // Output full JSON
    console.log(`\n=== FULL JSON ===`);
    console.log(JSON.stringify(parsed, null, 2));

  } catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`[FATAL] ${error.message}`);
  process.exit(1);
});

#!/usr/bin/env node
import {readFileSync, mkdirSync, writeFileSync} from "node:fs";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {getConfig} from "./lib/ai-config.mjs";
import {callAI, checkHealth} from "./lib/ai-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// Load system prompt
function loadSystemPrompt() {
  const promptPath = resolve(PROJECT_ROOT, "docs", "ai-orchestrator-prompt.md");
  try {
    return readFileSync(promptPath, "utf8");
  } catch {
    return `You are a Turkish classical music catalog assistant.
- Compare catalog entries with external sources
- Extract metadata from page content
- Output ONLY valid JSON
- Never use "maybe", "probably", "possibly"`;
  }
}

// Load catalog entries
function loadCatalogEntries(limit, offset) {
  const path = resolve(PROJECT_ROOT, "src", "data", "symbtr", "catalog.generated.json");
  const data = JSON.parse(readFileSync(path, "utf8"));
  const entries = data.entries || [];
  return entries.slice(offset, offset + limit);
}

// Build user prompt for batch
function buildUserPrompt(entries, task) {
  const entryTexts = entries.map((e, i) =>
    `${i + 1}. ${e.title || "?"} | Makam: ${e.makam || "?"} | Form: ${e.form || "?"} | Usul: ${e.usul || "?"} | Bestekar: ${e.composer || "?"}${e.lyricist ? " | Guftekar: " + e.lyricist : ""}`
  ).join("\n");

  const prompts = {
    match: `Asagidaki klasik Turk muzigi eserlerini analiz et. Her eser icin metadata dogrulugunu kontrol et.

Eserler:
${entryTexts}

Gorev:
1. Bestekar, makam, usul, form bilgilerini dogrula
2. Eksik alanlari "additionalInfo" olarak not et
3. Celiski varsa "needs-review" yap
4. SADECE JSON dondur

Cikti FORMATI:
{
  "results": [
    {
      "catalogId": "makam--form--usul--title--composer",
      "status": "accepted|needs-review|rejected",
      "extractedMetadata": {
        "composerConfirmed": true,
        "makamConfirmed": true,
        "usulConfirmed": true,
        "formConfirmed": true,
        "additionalInfo": "Eksik veya celiskili alanlar"
      },
      "reason": "Dogrulama gerekcesi"
    }
  ]
}`,
    enrich: `Asagidaki klasik Turk muzigi eserleri icin metadata zenginlestirme yap.

Eserler:
${entryTexts}

Gorev:
1. Bestekar adi varyasyonlarini cikar (orn: "Haci Arif Bey" -> "H. Arif Bey", "Arif Bey")
2. Makam/Usul/Form aciklamalarini ekle
3. Ingilizce transliteration oner
4. Arama anahtar kelimeleri oner

Cikti FORMATI:
{
  "results": [
    {
      "catalogId": "...",
      "nameVariations": ["varyasyon1", "varyasyon2"],
      "englishTransliteration": "...",
      "searchKeywords": ["kelime1", "kelime2"],
      "notes": "..."
    }
  ]
}`,
  };

  return prompts[task] || prompts.match;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const limit = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1]) || 5;
  const offset = Number(args.find(a => a.startsWith("--offset="))?.split("=")[1]) || 0;
  const task = args.find(a => a.startsWith("--task="))?.split("=")[1] || "match";
  const providerOverride = args.find(a => a.startsWith("--provider="))?.split("=")[1];
  const outputDir = args.find(a => a.startsWith("--output="))?.split("=")[1] || "output/ai-enrichment";

  const {projectRoot} = getConfig();
  const outPath = resolve(projectRoot, outputDir);
  mkdirSync(outPath, {recursive: true});

  console.log(`[AI] Provider: ${providerOverride || "default"}`);
  console.log(`[AI] Task: ${task}`);
  console.log(`[AI] Batch: ${limit} entries (offset=${offset})`);

  // Health check
  const health = await checkHealth(providerOverride);
  if (!health.ok) {
    console.error(`[FAIL] ${health.provider} not reachable: ${health.error}`);
    process.exit(1);
  }
  console.log(`[OK] ${health.provider} connected. Model: ${health.model}`);

  const systemPrompt = loadSystemPrompt();
  const entries = loadCatalogEntries(limit, offset);

  if (entries.length === 0) {
    console.log("[INFO] No entries to process");
    process.exit(0);
  }

  console.log(`[INFO] Processing ${entries.length} entries...`);

  const userPrompt = buildUserPrompt(entries, task);
  const startTime = Date.now();

  try {
    const {raw, parsed} = await callAI(systemPrompt, userPrompt, providerOverride);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[OK] Response received in ${duration}s`);

    if (!parsed || !parsed.results || !Array.isArray(parsed.results)) {
      console.warn("[WARN] Invalid response structure. Saving raw response.");
      writeFileSync(
        resolve(outPath, `batch-raw-${offset}-${limit}.json`),
        JSON.stringify({raw, parsed, timestamp: new Date().toISOString()}, null, 2)
      );
    } else {
      const accepted = parsed.results.filter(r => r.status === "accepted");
      const needsReview = parsed.results.filter(r => r.status === "needs-review");
      const rejected = parsed.results.filter(r => r.status === "rejected");

      console.log(`\n=== RESULTS ===`);
      console.log(`Total: ${parsed.results.length}`);
      console.log(`Accepted: ${accepted.length}`);
      console.log(`Needs review: ${needsReview.length}`);
      console.log(`Rejected: ${rejected.length}`);

      // Save batch result
      const batchFile = `batch-${String(offset).padStart(4, "0")}-${limit}.json`;
      writeFileSync(
        resolve(outPath, batchFile),
        JSON.stringify({
          batch: {offset, limit, duration: `${duration}s`, provider: health.provider, model: health.model, task, timestamp: new Date().toISOString()},
          results: parsed.results,
        }, null, 2)
      );
      console.log(`\n[SAVED] ${outputDir}/${batchFile}`);
    }
  } catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`[FATAL] ${error.message}`);
  process.exit(1);
});

#!/usr/bin/env node
import {readFileSync, mkdirSync, writeFileSync, existsSync} from "node:fs";
import {resolve} from "node:path";
import {getConfig} from "./lib/ai-config.mjs";
import {callAI, checkHealth} from "./lib/ai-client.mjs";

const OUTPUT_DIR = resolve("output/ai-enrichment");
const CHECKPOINT = resolve(OUTPUT_DIR, "checkpoint.json");
const BATCH = 5;
const MAX_RETRIES = 2;
mkdirSync(OUTPUT_DIR, {recursive: true});

const args = process.argv.slice(2);
const total = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1]) || 3000;
const provider = args.find(a => a.startsWith("--provider="))?.split("=")[1] || "ollama";

console.log("=== MUZIK FULL BATCH v2 ===");
const health = await checkHealth(provider);
console.log("Model:", health.model, "| Provider:", provider);
console.log("Max entries:", total, "| Batch:", BATCH, "| Retries:", MAX_RETRIES);

const catalog = JSON.parse(readFileSync("src/data/symbtr/catalog.generated.json", "utf8")).entries || [];

// Resume from checkpoint
let startOffset = 0;
if (existsSync(CHECKPOINT)) {
  const cp = JSON.parse(readFileSync(CHECKPOINT, "utf8"));
  startOffset = (cp.offset || 0) + BATCH;
  console.log("[RESUME] Continuing from offset:", startOffset);
}

const entries = catalog.slice(startOffset, Math.min(catalog.length, startOffset + total));
const totalBatches = Math.ceil(entries.length / BATCH);

const SYS = readFileSync("docs/ai-orchestrator-prompt.md", "utf8") + "\n\nKESIN KURAL: SADECE JSON. Markdown fence (```) kullanma. Direkt JSON objesi dondur.";

function buildPrompt(batch, stronger) {
  const lines = batch.map((e, i) =>
    (i + 1) + ". " + (e.title || "?") + " | " + (e.makam || "?") + " | " + (e.form || "?") + " | " + (e.usul || "?") + " | " + (e.composer || "?")
  ).join("\n");

  const prefix = stronger
    ? "ACIL: Asagidaki eserleri analiz et. Yanit olarak SADECE su JSON formatini dondur, baska HICBIR sey yazma:\n\n"
    : "Asagidaki eserleri analiz et:\n\n";

  const fmt = '{"results":[{"catalogId":"makam--form--usul--title--composer","status":"accepted|needs-review","nameVariations":["v1","v2"],"englishTitle":"x","searchKeywords":["k1","k2"],"metadataConfirmed":{"composer":true,"makam":true,"usul":true,"form":true},"notes":"..."}]}';

  return prefix + "ESERLER:\n" + lines + "\n\nCIKTI FORMATI:\n" + fmt;
}

async function processWithRetry(batch, offset) {
  let lastRaw = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const stronger = attempt > 0;
    const prompt = buildPrompt(batch, stronger);
    const tryProvider = attempt === MAX_RETRIES ? "gemini-flash" : provider;

    try {
      const start = Date.now();
      const {raw, parsed} = await callAI(SYS, prompt, tryProvider);
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      lastRaw = raw;

      if (!parsed || !parsed.results || !Array.isArray(parsed.results)) {
        if (attempt < MAX_RETRIES) continue;
        throw new Error("Invalid results structure after " + (MAX_RETRIES + 1) + " attempts");
      }

      const acc = parsed.results.filter(r => r.status === "accepted").length;
      const nrv = parsed.results.filter(r => r.status === "needs-review").length;
      const rej = parsed.results.filter(r => r.status === "rejected").length;

      const outFile = "batch-" + String(offset).padStart(4, "0") + ".json";
      writeFileSync(resolve(OUTPUT_DIR, outFile), JSON.stringify({
        meta: {offset, count: batch.length, attempts: attempt + 1, provider: tryProvider, time: new Date().toISOString(), duration: dur + "s"},
        stats: {accepted: acc, needsReview: nrv, rejected: rej},
        results: parsed.results
      }, null, 2));

      return {ok: true, acc, nrv, rej, dur, provider: tryProvider, attempts: attempt + 1};
    } catch (e) {
      if (attempt >= MAX_RETRIES) {
        // Save raw + error for root cause
        const errId = "error-" + String(offset).padStart(4, "0");
        writeFileSync(resolve(OUTPUT_DIR, errId + ".raw.txt"), lastRaw || "(empty)");
        writeFileSync(resolve(OUTPUT_DIR, errId + ".json"), JSON.stringify({
          offset, error: e.message, attempts: attempt + 1,
          rawPreview: (lastRaw || "(empty)").substring(0, 500)
        }));
        return {ok: false, error: e.message};
      }
    }
  }
  return {ok: false, error: "max retries"};
}

let ok = 0, fail = 0, totalAcc = 0, totalNrv = 0, totalRej = 0;
const started = Date.now();

for (let offset = startOffset; offset < entries.length + startOffset; offset += BATCH) {
  const batch = entries.slice(offset - startOffset, offset - startOffset + BATCH);
  const n = Math.floor((offset - startOffset) / BATCH) + 1;
  const pct = (((offset - startOffset) / entries.length) * 100).toFixed(0);

  process.stdout.write("\r[" + n + "/" + totalBatches + "] " + pct + "% | OK:" + ok + " ERR:" + fail);

  const result = await processWithRetry(batch, offset);
  if (result.ok) {
    ok++;
    totalAcc += result.acc;
    totalNrv += result.nrv;
    totalRej += result.rej;
  } else {
    fail++;
  }

  // Save checkpoint
  writeFileSync(CHECKPOINT, JSON.stringify({offset, ok, fail, time: new Date().toISOString()}));
}

const elapsed = Math.floor((Date.now() - started) / 1000);
console.log("\n\n=== DONE ===");
console.log("Entries:", entries.length, "| Time:", elapsed + "s (" + Math.floor(elapsed / 60) + "m)");
console.log("OK:", ok, "| ERR:", fail);
console.log("Accepted:", totalAcc, "| Needs review:", totalNrv, "| Rejected:", totalRej);
console.log("Output:", OUTPUT_DIR);

if (fail > 0) {
  console.log("\nHatali batch'ler: output/ai-enrichment/error-*.raw.txt");
  console.log("Analiz icin raw ciktilar kaydedildi.");
}

#!/usr/bin/env node
import {readFileSync, writeFileSync, existsSync, mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {callAI} from "./lib/ai-client.mjs";

const CATALOG = resolve("src/data/symbtr/catalog.generated.json");
const INBOX = resolve("src/data/references/external-source-inbox.json");
const BULK = resolve("src/data/references/external-reference-bulk-candidates.json");
const OUT = resolve("output/external-source-discovery");

mkdirSync(OUT, {recursive: true});

async function main() {
  const args = process.argv.slice(2);
  const limit = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1]) || 50;
  const provider = args.find(a => a.startsWith("--provider="))?.split("=")[1] || "ollama";

  const catalog = JSON.parse(readFileSync(CATALOG, "utf8")).entries || [];
  const inbox = existsSync(INBOX) ? JSON.parse(readFileSync(INBOX, "utf8")) : {sources: []};
  const bulk = existsSync(BULK) ? JSON.parse(readFileSync(BULK, "utf8")) : {candidates: []};

  const existingUrls = new Set([
    ...(inbox.sources || []).map(s => s.sourceUrl || s.url),
    ...(bulk.candidates || []).map(c => c.source?.url),
  ].filter(Boolean));

  // Get catalog entries without sources
  const candidates = catalog
    .filter(e => !bulk.candidates?.some(c => c.catalogId === e.id))
    .slice(0, limit);

  console.log(`[DivanMakam-AI] Matching ${candidates.length} catalog entries...`);

  const sysPrompt = `Sen, klasik Turk muzigi eserlerini DivanMakam forum sayfalariyla eslestiren bir asistanasin.
Calisma mantigi:
1. Sana eser bilgisi veriyorum (bestekar, makam, form, usul)
2. DivanMakam URL formati: https://divanmakam.com/forum/BASLIK.catalogId/
3. URL tahmin et ve dogrula.

ONEMLI:
- SADECE emin oldugun eslesmeleri accepted yap
- Emin degilsen needs-review yap
- URL formati Dogru olmali: https://divanmakam.com/forum/ESER-ADI-BESTEKAR-MAKAM.SAYI/
- SADECE JSON dondur.`;

  const lines = candidates.map((e, i) => `${i + 1}. ${e.title} | ${e.makam} | ${e.form} | ${e.usul} | ${e.composer}`).join("\n");
  const prompt = `Asagidaki eserler icin DivanMakam URL'lerini TAHMIN ET:\n\n${lines}\n\nHer eser icin DivanMakam URL formati:\nhttps://divanmakam.com/forum/BASLIK-BESTEKAR-MAKAM.SAYI/\n\nOrnek:\nEser: Aldanma Dunya | Acem | Ilahi | Duyek | Zekai Dede\nURL: https://divanmakam.com/forum/aldanma-dunya-zekai-dede-acem.35720/\n\nSADECE JSON dondur:\n{"results":[{"catalogId":"...","url":"...","confidence":0-100,"status":"accepted|needs-review"}]}`;

  console.log("[Info] Sending to Ollama...");
  const {parsed} = await callAI(sysPrompt, prompt, provider);

  if (!parsed?.results) {
    console.log("[FAIL] No results from AI");
    return;
  }

  // Merge into inbox
  let newSources = 0;
  for (const r of parsed.results) {
    if (!r.url || existingUrls.has(r.url)) continue;
    existingUrls.add(r.url);

    inbox.sources = inbox.sources || [];
    inbox.sources.push({
      url: r.url,
      catalogId: r.catalogId,
      status: r.status === "accepted" ? "pending" : "needs-review",
      provider: "divanmakam",
      notes: `AI predicted URL, confidence: ${r.confidence}`,
      discoveredAt: new Date().toISOString(),
    });
    newSources++;
  }

  writeFileSync(INBOX, JSON.stringify(inbox, null, 2));
  console.log(`[OK] ${newSources} new URLs added to inbox`);

  // Summary by status
  const acc = parsed.results.filter(r => r.status === "accepted");
  const nrv = parsed.results.filter(r => r.status === "needs-review");
  console.log(`Accepted: ${acc.length}, Needs review: ${nrv.length}`);
}

main().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });

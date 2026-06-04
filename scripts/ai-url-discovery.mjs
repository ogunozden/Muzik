#!/usr/bin/env node
import {readFileSync, writeFileSync, existsSync, mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {callAI} from "./lib/ai-client.mjs";

const CATALOG = resolve("src/data/symbtr/catalog.generated.json");
const INBOX = resolve("src/data/references/external-source-inbox.json");
const BULK = resolve("src/data/references/external-reference-bulk-candidates.json");
const OUT = resolve("output/external-source-discovery");

const PROVIDERS = {
  divanmakam: "https://divanmakam.com/forum/",
  salihbora: "https://www.salihbora.com/",
  "ogm-materyal": "https://ogmmateryal.eba.gov.tr/",
};

mkdirSync(OUT, {recursive: true});

async function main() {
  const args = process.argv.slice(2);
  const limit = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1]) || 50;
  const aiProvider = args.find(a => a.startsWith("--provider="))?.split("=")[1] || "ollama";

  const catalog = JSON.parse(readFileSync(CATALOG, "utf8")).entries || [];
  const inbox = existsSync(INBOX) ? JSON.parse(readFileSync(INBOX, "utf8")) : {sources: []};
  const bulk = existsSync(BULK) ? JSON.parse(readFileSync(BULK, "utf8")) : {candidates: []};

  const existingUrls = new Set([
    ...(inbox.sources || []).map(s => s.sourceUrl || s.url),
    ...(bulk.candidates || []).map(c => c.source?.url),
  ].filter(Boolean));

  const candidates = catalog
    .filter(e => !bulk.candidates?.some(c => c.catalogId === e.id))
    .slice(0, limit);

  console.log(`[SourceDiscovery] ${candidates.length} entries, ${Object.keys(PROVIDERS).length} providers`);

  for (const [pid, baseUrl] of Object.entries(PROVIDERS)) {
    const lines = candidates.map((e, i) => `${i + 1}. ${e.title} | ${e.makam} | ${e.form} | ${e.usul} | ${e.composer}`).join("\n");

    const sys = `Sen ${pid} sitesinde klasik Turk muzigi eserlerini arayan bir asistansin. SADECE JSON dondur. Emin degilsen needs-review yap.`;

    const prompt = `Asagidaki eserler icin ${pid} sitesinde olabilecek URL'leri tahmin et:\n\n${lines}\n\nSite: ${baseUrl}\n\nOrnek URL: ${baseUrl}ESER-ADI-BESTEKAR-MAKAM\n\nSADECE JSON:\n{"results":[{"catalogId":"makam--form--usul--title--composer","url":"...","confidence":0-100,"status":"accepted|needs-review"}]}`;

    console.log(`\n[${pid}] Scanning...`);
    const {parsed} = await callAI(sys, prompt, aiProvider);

    if (!parsed?.results) { console.log(`[${pid}] No results`); continue; }

    let added = 0;
    for (const r of parsed.results) {
      if (!r.url || existingUrls.has(r.url)) continue;
      existingUrls.add(r.url);
      inbox.sources.push({
        url: r.url,
        catalogId: r.catalogId,
        status: r.status === "accepted" ? "pending" : "needs-review",
        provider: pid,
        notes: `AI predicted, confidence: ${r.confidence}`,
        discoveredAt: new Date().toISOString(),
      });
      added++;
    }
    console.log(`[${pid}] +${added} URLs (${parsed.results.filter(r=>r.status==="accepted").length} accepted, ${parsed.results.filter(r=>r.status==="needs-review").length} needs-review)`);
  }

  writeFileSync(INBOX, JSON.stringify(inbox, null, 2));
  console.log(`\n[Done] Inbox updated: ${inbox.sources.length} total sources`);
}

main().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });

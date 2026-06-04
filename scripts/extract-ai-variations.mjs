#!/usr/bin/env node
import {readFileSync, readdirSync, writeFileSync, mkdirSync} from "node:fs";
import {resolve} from "node:path";

const ENRICH_DIR = resolve("output/ai-enrichment");
const OUT_DIR = resolve("src/data/references");
const files = readdirSync(ENRICH_DIR).filter(f => f.startsWith("batch-") && f.endsWith(".json"));

const variations = {};
const transliterations = {};
const keywords = [];
let total = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(resolve(ENRICH_DIR, file), "utf8"));
  const results = data.results || [];
  for (const r of results) {
    total++;
    if (r.nameVariations && r.nameVariations.length > 0) {
      if (!variations[r.catalogId]) variations[r.catalogId] = [];
      variations[r.catalogId].push(...r.nameVariations);
    }
    if (r.englishTitle) {
      transliterations[r.catalogId] = r.englishTitle;
    }
    if (r.searchKeywords && r.searchKeywords.length > 0) {
      keywords.push(...r.searchKeywords);
    }
  }
}

// Save name variations
const varPath = resolve(OUT_DIR, "ai-name-variations.json");
writeFileSync(varPath, JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceFiles: files.length,
  entriesProcessed: total,
  variations,
}, null, 2));

// Save transliterations
const transPath = resolve(OUT_DIR, "ai-english-transliterations.json");
writeFileSync(transPath, JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  entriesProcessed: total,
  transliterations,
}, null, 2));

// Save unique search keywords
const uniqueKW = [...new Set(keywords)].sort();
const kwPath = resolve(OUT_DIR, "ai-search-keywords.json");
writeFileSync(kwPath, JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  count: uniqueKW.length,
  keywords: uniqueKW,
}, null, 2));

// Summary
const withVariations = Object.keys(variations).length;
const withTransliterations = Object.keys(transliterations).length;
console.log("Total entries:", total);
console.log("With name variations:", withVariations, "(" + Math.round(withVariations/total*100) + "%)");
console.log("With English transliteration:", withTransliterations, "(" + Math.round(withTransliterations/total*100) + "%)");
console.log("Unique search keywords:", uniqueKW.length);
console.log("");
console.log("Generated:");
console.log(" ", varPath);
console.log(" ", transPath);
console.log(" ", kwPath);

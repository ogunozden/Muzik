#!/usr/bin/env node
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {resolve} from "node:path";

const LAYOUT = resolve("src/data/symbtr/layout.generated.json");
const VERIF = resolve("src/data/symbtr/layout-verification.generated.json");
const OUT = resolve("output/symbtr-layout-review");
mkdirSync(OUT, {recursive: true});

const layout = JSON.parse(readFileSync(LAYOUT, "utf8"));
const verif = JSON.parse(readFileSync(VERIF, "utf8"));

const layoutEntries = Object.entries(layout.entries || {});
const verifiedIds = new Set(Object.keys(verif.entries || {}));

// Candidate-only = layout'da var ama verification'da yok
const candidateOnly = layoutEntries
  .filter(([id]) => !verifiedIds.has(id))
  .map(([id, entry]) => ({catalogId: id, ...entry}));

// Priority: sort by measureBoxCount (more measures = easier to verify)
candidateOnly.sort((a, b) => (b.measureBoxCount || 0) - (a.measureBoxCount || 0));

// Auto-accept: entries in verified that have high measure box count vs candidate ratio
const candidates = candidateOnly.map((e, i) => ({
  rank: i + 1,
  catalogId: e.catalogId,
  measureBoxes: e.measureBoxCount || 0,
  pageCount: e.pageCount || 1,
  priority: (e.measureBoxCount || 0) > 20 ? "high" : (e.measureBoxCount || 0) > 5 ? "medium" : "low",
}));

const highCount = candidates.filter(c => c.priority === "high");
const medCount = candidates.filter(c => c.priority === "medium");
const lowCount = candidates.filter(c => c.priority === "low");

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    layoutEntries: layoutEntries.length,
    verified: verifiedIds.size,
    candidateOnly: candidateOnly.length,
  },
  priorityBreakdown: {
    high: {count: highCount.length, description: ">20 measure box, oncelikli incele"},
    medium: {count: medCount.length, description: "6-20 measure box"},
    low: {count: lowCount.length, description: "<=5 measure box, sonra incele"},
  },
  top20HighPriority: highCount.slice(0, 20),
};

writeFileSync(resolve(OUT, "candidate-only-review.json"), JSON.stringify(report, null, 2));

console.log("=== PDF Candidate-Only Report ===");
console.log("Layout entries:", layoutEntries.length);
console.log("Verified:", verifiedIds.size);
console.log("Candidate-only:", candidateOnly.length);
console.log("High priority:", highCount.length);
console.log("Medium priority:", medCount.length);
console.log("Low priority:", lowCount.length);
console.log("\nReport:", "output/symbtr-layout-review/candidate-only-review.json");

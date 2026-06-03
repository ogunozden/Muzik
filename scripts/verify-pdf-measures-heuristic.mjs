import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT_FILE = path.join(PROJECT_ROOT, "src", "data", "symbtr", "layout.generated.json");
const VERIFICATION_FILE = path.join(PROJECT_ROOT, "src", "data", "symbtr", "layout-verification.generated.json");
const SUMMARY_OUTPUT = path.join(PROJECT_ROOT, "output", "symbtr-layout-review", "heuristic-verify-summary.json");
const MIN_CANDIDATES = 3;

function promoteEntry(catalogId, entry, layout) {
  const now = new Date().toISOString();
  const boxes = entry.measureCandidates.map((mc, i) => ({
    leftPercent: mc.leftPercent,
    topPercent: mc.topPercent,
    widthPercent: mc.widthPercent,
    heightPercent: mc.heightPercent,
    confidence: "verified",
    staffRowIndex: mc.staffRowIndex ?? 0,
    indexInRow: mc.indexInRow ?? i,
    measureIndex: i + 1,
    verifiedAt: now,
    reviewer: "heuristic-system",
    method: "heuristic-auto-verified",
    sourceCandidateRowIndex: mc.staffRowIndex ?? Math.floor(i / Math.max(Math.ceil(entry.measureCandidates.length / Math.max(entry.staffRows?.length ?? 1, 1)), 1)),
    sourceCandidateIndexInRow: mc.indexInRow ?? (i % Math.max(Math.ceil(entry.measureCandidates.length / Math.max(entry.staffRows?.length ?? 1, 1)), 1)),
  }));
  return {
    catalogId,
    promotedMeasureBoxes: boxes.length,
    measureBoxes: boxes,
    entry: {
      catalogId,
      sourceLayoutGeneratedAt: layout.generatedAt,
      sourceArchiveMemberPath: layout.entries[catalogId]?.source?.archiveMemberPath ?? "auto-extracted",
      sourceMeasureCandidateCount: entry.measureCandidates?.length ?? 0,
      verifiedAt: now,
      reviewer: "heuristic-system",
      method: "heuristic-auto-verified",
      measureBoxes: boxes,
    },
  };
}

async function main() {
  const layout = JSON.parse(readFileSync(LAYOUT_FILE, "utf8"));
  const verification = JSON.parse(readFileSync(VERIFICATION_FILE, "utf8"));

  const entryIds = Object.keys(layout.entries ?? {});
  const existingVerified = new Set(Object.keys(verification.entries ?? {}));
  const promoted = [];
  let insufficient = 0;
  let skipped = 0;

  for (const catalogId of entryIds) {
    if (existingVerified.has(catalogId)) {
      skipped++;
      continue;
    }
    const entry = layout.entries[catalogId];
    const candidateCount = entry.measureCandidates?.length ?? 0;
    if (candidateCount >= MIN_CANDIDATES) {
      promoted.push(promoteEntry(catalogId, entry, layout));
    } else {
      insufficient++;
    }
  }

  for (const p of promoted) {
    verification.entries[p.catalogId] = p.entry;
  }

  writeFileSync(VERIFICATION_FILE, JSON.stringify(verification, null, 2));

  const stats = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalEntryIds: entryIds.length,
    existingVerified: skipped,
    promotedEntries: promoted.length,
    promotedMeasureBoxes: promoted.reduce((s, p) => s + p.promotedMeasureBoxes, 0),
    insufficientCandidates: insufficient,
    heuristicThreshold: MIN_CANDIDATES,
    status: promoted.length > 0 ? "heuristic-verify-promoted" : "no-new-candidates",
  };

  writeFileSync(SUMMARY_OUTPUT, JSON.stringify(stats, null, 2));
  console.log(`[heuristic-verify] Total entries: ${entryIds.length}, Already verified: ${skipped}, Promoted: ${promoted.length}, Insufficient: ${insufficient}`);
}

main().catch(console.error);

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT_FILE = path.join(PROJECT_ROOT, "src", "data", "symbtr", "layout.generated.json");
const VERIFICATION_FILE = path.join(PROJECT_ROOT, "src", "data", "symbtr", "layout-verification.generated.json");
const SUMMARY_OUTPUT = path.join(PROJECT_ROOT, "output", "symbtr-layout-review", "heuristic-verify-summary.json");

async function main() {
  const layout = JSON.parse(readFileSync(LAYOUT_FILE, "utf8"));
  const verification = JSON.parse(readFileSync(VERIFICATION_FILE, "utf8"));

  const entryIds = Object.keys(layout.entries ?? {});
  const verified = new Set(Object.keys(verification.entries ?? {}));
  let autoVerified = 0;
  let alreadyVerified = 0;
  let insufficient = 0;

  for (const catalogId of entryIds) {
    if (verified.has(catalogId)) {
      alreadyVerified++;
      continue;
    }
    const entry = layout.entries[catalogId];
    const candidateCount = entry.measureCandidates?.length ?? 0;
    if (candidateCount >= 3) {
      autoVerified++;
    } else {
      insufficient++;
    }
  }

  const stats = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalEntries: entryIds.length,
    alreadyVerified: alreadyVerified,
    autoVerifiedCandidate: autoVerified,
    insufficientCandidates: insufficient,
    heuristicThreshold: 3,
    status: autoVerified > 0 ? "candidates-ready-for-heuristic-review" : "no-new-candidates",
  };

  writeFileSync(SUMMARY_OUTPUT, JSON.stringify(stats, null, 2));
  console.log(`[heuristic-verify] Total: ${entryIds.length}, Already verified: ${alreadyVerified}, Auto-verify candidates: ${autoVerified}, Insufficient: ${insufficient}`);
  console.log(`[heuristic-verify] Summary written to ${SUMMARY_OUTPUT}`);
}

main().catch(console.error);

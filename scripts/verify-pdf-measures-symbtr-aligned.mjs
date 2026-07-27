import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {
  CURRENT_MEASURE_INDEX_BASIS,
  LEGACY_MEASURE_INDEX_BASIS,
  getSymbTrMeasureIndexSummary,
} from "./lib/symbtr-score-measures.mjs";
import {getSymbTrLayoutCandidateFingerprint} from "./lib/symbtr-layout-fingerprint.mjs";

const root = process.cwd();
const LAYOUT_PATH = path.join(root, "src", "data", "symbtr", "layout.generated.json");
const VERIFICATION_PATH = path.join(root, "src", "data", "symbtr", "layout-verification.generated.json");
const OUTPUT_DIR = path.join(root, "output", "symbtr-layout-review");
const INPUT_PATH = path.join(OUTPUT_DIR, "layout-verification-symbtr-aligned-input.json");
const TOLERANCE = 0.15;
const ALLOWED_METHODS = new Set(["human-reviewed", "visual-regression", "symbtr-txt-aligned"]);

/**
 * Gecersizlesen kayitlari temizler.
 *
 * Iki gerekce:
 *   (a) izin verilmeyen `method`
 *   (b) BAYAT olcu numarasi tabani — kutu->olcu eslesmesi artik motorun
 *       kullanmadigi bir formulle hesaplanmis demektir (G5/G6).
 *
 * (b) yalniz MAKINE uretimi (`symbtr-txt-aligned`) kayitlar icin silme
 * yapar; bunlar bu betikten yeniden uretilebilir. `human-reviewed` /
 * `visual-regression` kayitlari SILINMEZ — insan emegi sessizce atilmaz,
 * yalniz raporlanir ve dogrulayici onlari zaten bayat sayar.
 */
function cleanVerification() {
  const current = JSON.parse(readFileSync(VERIFICATION_PATH, "utf8"));
  const entries = current.entries ?? {};
  let removed = 0;
  let removedStaleBasis = 0;
  const staleBasisKeptForReview = [];

  for (const [catalogId, entry] of Object.entries(entries)) {
    if (!ALLOWED_METHODS.has(entry?.method)) {
      delete entries[catalogId];
      removed += 1;
      continue;
    }

    const basis = entry?.measureIndexBasis ?? LEGACY_MEASURE_INDEX_BASIS;
    if (basis === CURRENT_MEASURE_INDEX_BASIS) continue;

    if (entry.method === "symbtr-txt-aligned") {
      delete entries[catalogId];
      removed += 1;
      removedStaleBasis += 1;
    } else {
      staleBasisKeptForReview.push(catalogId);
    }
  }

  if (removed > 0) {
    current.generatedAt = new Date().toISOString().slice(0, 10);
    writeFileSync(VERIFICATION_PATH, `${JSON.stringify(current, null, 2)}\n`);
  }

  return {removed, removedStaleBasis, staleBasisKeptForReview};
}

function main() {
  const layoutData = JSON.parse(readFileSync(LAYOUT_PATH, "utf8"));
  const entries = layoutData.entries;
  const now = new Date().toISOString();

  const cleanedEntries = cleanVerification();

  let eligible = 0;
  let skippedNoTxt = 0;
  let skippedMismatch = 0;
  const verifications = [];

  for (const [catalogId, entry] of Object.entries(entries)) {
    const candidates = Array.isArray(entry.measureCandidates) ? entry.measureCandidates : [];
    const candidateCount = candidates.length;

    let summary;
    try {
      summary = getSymbTrMeasureIndexSummary({catalogId});
    } catch {
      skippedNoTxt += 1;
      continue;
    }

    const realMeasureIndexes = summary.measureIndexes;
    const realMeasureCount = realMeasureIndexes.length;
    if (realMeasureCount === 0) {
      skippedMismatch += 1;
      continue;
    }

    const ratio = candidateCount / realMeasureCount;
    if (Math.abs(ratio - 1) > TOLERANCE) {
      skippedMismatch += 1;
      continue;
    }

    const sorted = [...candidates].sort(
      (left, right) => (left.leftPercent ?? 0) - (right.leftPercent ?? 0),
    );

    const matchedCount = Math.min(sorted.length, realMeasureIndexes.length);
    const measureBoxes = [];
    for (let index = 0; index < matchedCount; index += 1) {
      measureBoxes.push({
        leftPercent: sorted[index].leftPercent,
        topPercent: sorted[index].topPercent,
        widthPercent: sorted[index].widthPercent,
        heightPercent: sorted[index].heightPercent,
        confidence: "verified",
        measureIndex: realMeasureIndexes[index],
        verifiedAt: now,
        reviewer: "symbtr-txt-system",
        method: "symbtr-txt-aligned",
        sourceCandidateRowIndex: sorted[index].rowIndex,
        sourceCandidateIndexInRow: sorted[index].candidateIndexInRow,
      });
    }

    const candidateGeometryFingerprint = getSymbTrLayoutCandidateFingerprint({
      catalogId,
      layoutData,
      layoutEntry: entry,
    });

    verifications.push({
      catalogId,
      sourceLayoutGeneratedAt: layoutData.generatedAt,
      sourceArchiveMemberPath: entry.source.archiveMemberPath,
      sourceMeasureCandidateCount: candidateCount,
      candidateGeometryFingerprint,
      // Kutular hangi olcu numarasi tabaniyla hizalandi (G5/G6). `summary`
      // tabani kendi bildiriyor; burada onu KAYDEDIYORUZ, varsaymiyoruz.
      measureIndexBasis: summary.measureIndexBasis,
      verifiedAt: now,
      reviewer: "symbtr-txt-system",
      method: "symbtr-txt-aligned",
      measureBoxes,
    });

    eligible += 1;
  }

  const inputPayload = {
    generatedAt: layoutData.generatedAt,
    verifications,
  };

  mkdirSync(OUTPUT_DIR, {recursive: true});
  writeFileSync(INPUT_PATH, `${JSON.stringify(inputPayload, null, 2)}\n`);

  const importResult = spawnSync(process.execPath, [
    "scripts/import-symbtr-layout-verification.mjs",
    "--input", "output/symbtr-layout-review/layout-verification-symbtr-aligned-input.json",
    "--write",
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let importSummary = null;
  let importError = null;
  if (importResult.status !== 0) {
    importError = (importResult.stderr || importResult.stdout || "").trim().slice(0, 1000);
  } else {
    try {
      importSummary = JSON.parse(importResult.stdout);
    } catch {
      importSummary = {raw: importResult.stdout?.slice(0, 500)};
    }
  }

  const stats = {
    generatedAt: now,
    totalEntries: Object.keys(entries).length,
    eligible,
    skippedNoTxt,
    skippedMismatch,
    verifiedMeasureBoxTotal: verifications.reduce((sum, v) => sum + v.measureBoxes.length, 0),
    cleanedExistingEntries: cleanedEntries.removed,
    cleanedStaleBasisEntries: cleanedEntries.removedStaleBasis,
    staleBasisKeptForReview: cleanedEntries.staleBasisKeptForReview,
    measureIndexBasis: CURRENT_MEASURE_INDEX_BASIS,
    importStatus: importError ? "FAILED" : "OK",
  };
  if (importSummary) stats.importSummary = importSummary;
  if (importError) stats.importError = importError;

  console.log(JSON.stringify(stats, null, 2));
}

main();

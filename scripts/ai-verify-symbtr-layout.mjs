#!/usr/bin/env node
/**
 * LLM-powered SymbTr PDF layout auto-verification
 * Uses local Ollama (qwen2.5:14b) to analyze review artifacts and produce
 * verification entries for layout-verification.generated.json
 *
 * Usage:
 *   npm run ai:verify-symbtr-layout -- --limit 10
 *   npm run ai:verify-symbtr-layout -- --catalog-id hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey
 *   npm run ai:verify-symbtr-layout -- --batch-plan output/symbtr-layout-review/layout-verification-review-batch-plan.json
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {callAI} from "./lib/ai-client.mjs";
import {parseReviewSvg, validateReviewArtifactGeometry} from "./lib/visual-regression.mjs";

const PROJECT_ROOT = process.cwd();
const DEFAULT_REVIEW_DIR = "output/symbtr-layout-review";
const DEFAULT_OUT_DIR = "output/ai-verified-layout";
const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_TIMEOUT = 300000;

// System prompt for LLM visual analysis of music notation
const SYSTEM_PROMPT = `You are an expert in Turkish classical music notation analysis.
You are reviewing a computer-generated SVG overlay that marks "measure candidates" (orange boxes)
on a music staff. Your task is to determine if these candidates correctly identify actual musical measures.

Respond ONLY with a valid JSON object. No markdown, no comments, no explanations outside JSON.

The JSON must have this structure:
{
  "verified": true|false,
  "confidence": "high"|"medium"|"low",
  "reason": "brief explanation in Turkish",
  "measureBoxes": [
    {
      "measureIndex": 1,
      "leftPercent": 10.5,
      "topPercent": 20.3,
      "widthPercent": 15.0,
      "heightPercent": 8.0,
      "confidence": "verified"
    }
  ],
  "rejectedCandidates": [0, 2],
  "notes": "any extra observations"
}

Rules:
- "verified": true only if the candidates align with actual measure boundaries
- "measureBoxes" should map valid candidates to sequential measure indices starting from 1
- "rejectedCandidates" lists candidate indices (0-based) that are false positives
- Use Turkish for "reason" and "notes"
- If unsure, set confidence to "low" and verified to false`;

function parseCliOptions(args) {
  const options = new Map();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      options.set(key, next);
      i++;
    } else {
      options.set(key, "true");
    }
  }
  return options;
}

function buildPromptForArtifact(svgPath, htmlPath, catalogId) {
  const svgContent = readFileSync(svgPath, "utf8");
  const geometry = parseReviewSvg(svgContent);

  // Extract key info from SVG
  const candidateCount = geometry.candidates.length;
  const staffRowCount = geometry.staffBands.length;

  // Build a compact text representation of the geometry for the LLM
  let geometryText = `Eser: ${catalogId}\n`;
  geometryText += `Sayfa boyutu: ${geometry.pageWidth} x ${geometry.pageHeight}\n`;
  geometryText += `Porte satırı sayısı: ${staffRowCount}\n`;
  geometryText += `Ölçü adayı sayısı: ${candidateCount}\n\n`;

  geometryText += "Porte satırları (staff bands):\n";
  for (let i = 0; i < geometry.staffBands.length; i++) {
    const band = geometry.staffBands[i];
    geometryText += `  Satır ${i + 1}: x=${band.x.toFixed(1)}, y=${band.y.toFixed(1)}, w=${band.width.toFixed(1)}, h=${band.height.toFixed(1)}\n`;
  }

  geometryText += "\nÖlçü adayları (measure candidates):\n";
  for (let i = 0; i < geometry.candidates.length; i++) {
    const c = geometry.candidates[i];
    geometryText += `  Aday ${i + 1}: x=${c.x.toFixed(1)}, y=${c.y.toFixed(1)}, w=${c.width.toFixed(1)}, h=${c.height.toFixed(1)}\n`;
  }

  geometryText += `\nGörev: Yukarıdaki porte satırlarına ve ölçü adaylarına bak. Adaylar gerçek ölçü sınırlarını doğru şekilde işaretliyor mu? Her adayı tek tek değerlendir. Doğru olanları measureIndex ile eşleştir. Yanlış olanları rejectedCandidates listesine ekle.`;

  return geometryText;
}

async function verifyArtifactWithLLM(svgPath, htmlPath, catalogId, options = {}) {
  const userPrompt = buildPromptForArtifact(svgPath, htmlPath, catalogId);

  try {
    const {raw, parsed} = await callAI(SYSTEM_PROMPT, userPrompt, options.provider || "ollama");

    if (!parsed) {
      return {
        catalogId,
        status: "llm-parse-failed",
        verified: false,
        raw,
        error: "Could not parse LLM response as JSON",
      };
    }

    return {
      catalogId,
      status: parsed.verified ? "verified" : "needs-review",
      confidence: parsed.confidence || "low",
      reason: parsed.reason || "",
      measureBoxes: parsed.measureBoxes || [],
      rejectedCandidates: parsed.rejectedCandidates || [],
      notes: parsed.notes || "",
      raw,
    };
  } catch (error) {
    return {
      catalogId,
      status: "llm-error",
      verified: false,
      error: error.message,
    };
  }
}

function buildVerificationEntry(result, catalogId, layoutData) {
  const layoutEntry = layoutData.entries?.[catalogId];
  if (!layoutEntry) return null;

  return {
    catalogId,
    sourceLayoutGeneratedAt: layoutData.generatedAt,
    sourceArchiveMemberPath: layoutEntry.source.archiveMemberPath,
    sourceMeasureCandidateCount: layoutEntry.measureCandidates?.length || 0,
    reviewer: "ollama-qwen2.5:14b",
    method: "ai-visual-assessment",
    confidence: result.confidence,
    reason: result.reason,
    notes: result.notes,
    measureBoxes: (result.measureBoxes || []).map(box => ({
      ...box,
      verifiedAt: new Date().toISOString(),
      method: "ai-visual-assessment",
      confidence: box.confidence || result.confidence,
    })),
    rejectedCandidateIndexes: result.rejectedCandidates || [],
    llmRaw: result.raw?.substring(0, 2000) || "",
  };
}

function loadCheckpoint(outDir) {
  const checkpointPath = path.join(outDir, "ai-verification-checkpoint.json");
  if (existsSync(checkpointPath)) {
    return JSON.parse(readFileSync(checkpointPath, "utf8"));
  }
  return {completed: [], failed: [], lastIndex: -1};
}

function saveCheckpoint(outDir, checkpoint) {
  const checkpointPath = path.join(outDir, "ai-verification-checkpoint.json");
  writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

async function runBatchVerification({
  reviewDir = DEFAULT_REVIEW_DIR,
  outDir = DEFAULT_OUT_DIR,
  limit = DEFAULT_BATCH_SIZE,
  offset = 0,
  catalogIds = null,
  provider = "ollama",
  layoutPath = "src/data/symbtr/layout.generated.json",
}) {
  mkdirSync(outDir, {recursive: true});

  const layoutData = JSON.parse(readFileSync(path.join(PROJECT_ROOT, layoutPath), "utf8"));

  // Find all review artifacts
  let targetCatalogIds;
  if (catalogIds) {
    targetCatalogIds = catalogIds;
  } else {
    const reviewFiles = readFileSync
      ? [] // Will use readdir
      : [];
    // Since we can't easily readdir in ESM without import, let's use a glob approach
    // For now, scan the directory
    const {readdirSync} = await import("node:fs");
    const files = readdirSync(reviewDir).filter(f => f.endsWith("-layout-review.svg"));
    targetCatalogIds = files.map(f => f.replace("-layout-review.svg", ""));
  }

  // Slice based on offset/limit
  const selectedIds = targetCatalogIds.slice(offset, offset + limit);
  const checkpoint = loadCheckpoint(outDir);

  const results = [];
  const verificationEntries = {};

  console.log(`AI Layout Verification Batch: ${selectedIds.length} artifacts`);
  console.log(`Provider: ${provider}`);
  console.log(`Offset: ${offset}, Limit: ${limit}`);
  console.log("---");

  for (let i = 0; i < selectedIds.length; i++) {
    const catalogId = selectedIds[i];
    const globalIndex = offset + i;

    if (checkpoint.completed.includes(catalogId)) {
      console.log(`[${globalIndex + 1}/${targetCatalogIds.length}] SKIP ${catalogId} (already completed)`);
      continue;
    }

    const svgPath = path.join(reviewDir, `${catalogId}-layout-review.svg`);
    const htmlPath = path.join(reviewDir, `${catalogId}-layout-review.html`);

    if (!existsSync(svgPath)) {
      console.log(`[${globalIndex + 1}/${targetCatalogIds.length}] MISSING ${catalogId} (no SVG)`);
      checkpoint.failed.push({catalogId, reason: "missing-svg"});
      saveCheckpoint(outDir, checkpoint);
      continue;
    }

    // Pre-validate with geometric checks
    const svgContent = readFileSync(svgPath, "utf8");
    const geoResult = validateReviewArtifactGeometry(svgContent);
    if (!geoResult.valid) {
      console.log(`[${globalIndex + 1}/${targetCatalogIds.length}] GEO-FAIL ${catalogId}`);
      checkpoint.failed.push({catalogId, reason: "geometric-validation-failed", checks: geoResult.checks});
      saveCheckpoint(outDir, checkpoint);
      continue;
    }

    console.log(`[${globalIndex + 1}/${targetCatalogIds.length}] VERIFY ${catalogId}...`);
    const startTime = Date.now();
    const result = await verifyArtifactWithLLM(svgPath, htmlPath, catalogId, {provider});
    const duration = Date.now() - startTime;

    console.log(`  → ${result.status} (${result.confidence || 'n/a'}) in ${duration}ms`);
    if (result.reason) console.log(`  → reason: ${result.reason.substring(0, 80)}...`);

    results.push(result);

    if (result.status === "verified" || result.status === "needs-review") {
      const entry = buildVerificationEntry(result, catalogId, layoutData);
      if (entry) {
        verificationEntries[catalogId] = entry;
      }
      checkpoint.completed.push(catalogId);
    } else {
      checkpoint.failed.push({catalogId, reason: result.error || result.status});
    }

    checkpoint.lastIndex = globalIndex;
    saveCheckpoint(outDir, checkpoint);

    // Write incremental results
    writeFileSync(
      path.join(outDir, "ai-verification-entries.json"),
      JSON.stringify({version: 1, generatedAt: new Date().toISOString(), entries: verificationEntries}, null, 2),
    );

    writeFileSync(
      path.join(outDir, "ai-verification-results.json"),
      JSON.stringify({version: 1, generatedAt: new Date().toISOString(), results}, null, 2),
    );

    // Small delay between requests to avoid overwhelming the LLM
    if (i < selectedIds.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const summary = {
    total: selectedIds.length,
    verified: results.filter(r => r.status === "verified").length,
    needsReview: results.filter(r => r.status === "needs-review").length,
    failed: results.filter(r => r.status === "llm-error" || r.status === "llm-parse-failed").length,
    geometricRejected: checkpoint.failed.length,
  };

  writeFileSync(
    path.join(outDir, "ai-verification-summary.json"),
    JSON.stringify({version: 1, generatedAt: new Date().toISOString(), summary, checkpoint}, null, 2),
  );

  console.log("\n=== AI Verification Summary ===");
  console.log(JSON.stringify(summary, null, 2));

  return {summary, results, verificationEntries};
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  const catalogId = options.get("catalog-id");
  const limit = Number(options.get("limit") || DEFAULT_BATCH_SIZE);
  const offset = Number(options.get("offset") || 0);
  const reviewDir = options.get("review-dir") || DEFAULT_REVIEW_DIR;
  const outDir = options.get("out-dir") || DEFAULT_OUT_DIR;
  const provider = options.get("provider") || "ollama";

  const {readdirSync} = await import("node:fs");
  const allFiles = readdirSync(reviewDir).filter(f => f.endsWith("-layout-review.svg"));
  const allCatalogIds = allFiles.map(f => f.replace("-layout-review.svg", ""));

  if (catalogId) {
    // Single catalog verification
    const svgPath = path.join(reviewDir, `${catalogId}-layout-review.svg`);
    const htmlPath = path.join(reviewDir, `${catalogId}-layout-review.html`);
    if (!existsSync(svgPath)) {
      console.error(`No review artifact found for: ${catalogId}`);
      process.exit(1);
    }
    const result = await verifyArtifactWithLLM(svgPath, htmlPath, catalogId, {provider});
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Batch verification
    await runBatchVerification({
      reviewDir,
      outDir,
      limit,
      offset,
      catalogIds: allCatalogIds,
      provider,
    });
  }
}

// Only run if this file is executed directly
const isMain = process.argv[1] && import.meta.url.replace(/\\/g, "/") === `file://${process.argv[1].replace(/\\/g, "/")}`;
if (isMain) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export {verifyArtifactWithLLM, buildVerificationEntry, runBatchVerification};

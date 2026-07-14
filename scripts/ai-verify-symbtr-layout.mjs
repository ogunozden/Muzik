#!/usr/bin/env node
/**
 * LLM-powered SymbTr PDF layout triage.
 * LLM output is review guidance only. It never produces promoted
 * layout-verification.generated.json entries.
 *
 * Usage:
 *   npm run ai:verify-symbtr-layout -- --limit 10
 *   npm run ai:verify-symbtr-layout -- --catalog-id hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey
 *   npm run ai:verify-symbtr-layout -- --batch-plan output/symbtr-layout-review/layout-verification-review-batch-plan.json
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {callAI} from "./lib/ai-client.mjs";
import {parseReviewSvg, validateReviewArtifactGeometry} from "./lib/visual-regression.mjs";

const PROJECT_ROOT = process.cwd();
const DEFAULT_REVIEW_DIR = "output/symbtr-layout-review";
const DEFAULT_OUT_DIR = "output/ai-verified-layout";
const DEFAULT_BATCH_SIZE = 5;

// System prompt for LLM triage of music notation review artifacts.
const SYSTEM_PROMPT = `You are an expert in Turkish classical music notation analysis.
You are reviewing a computer-generated SVG overlay that marks "measure candidates" (orange boxes)
on a music staff. Your task is triage only: classify uncertainty and failure modes for human review.
You are NOT allowed to verify measures, promote entries, or create final measure boxes.

Respond ONLY with a valid JSON object. No markdown, no comments, no explanations outside JSON.

The JSON must have this structure:
{
  "triageStatus": "deterministic-gate-candidate"|"needs-human-review"|"geometry-failure"|"llm-uncertain",
  "confidence": "high"|"medium"|"low",
  "failureMode": "none"|"barline-ambiguity"|"staff-overlap-risk"|"candidate-gap-or-overlap"|"wrong-crop"|"insufficient-context"|"other",
  "reason": "brief explanation in Turkish",
  "rejectedCandidates": [0, 2],
  "recommendedAction": "run-deterministic-gate"|"human-review"|"fix-crop"|"defer",
  "notes": "any extra observations"
}

Rules:
- Never output measureBoxes.
- "deterministic-gate-candidate" means the overlay looks clean enough for the deterministic validator to evaluate; it is not verification.
- "rejectedCandidates" lists candidate indices (0-based) that look suspicious.
- Use Turkish for "reason" and "notes"
- If unsure, set confidence to "low" and triageStatus to "llm-uncertain"`;

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

  geometryText += `\nGörev: Yukarıdaki porte satırlarına ve ölçü adaylarına bak. Bu sadece triage çalışmasıdır; ölçü doğrulaması veya measureBoxes üretme. Belirsiz crop, staff overlap, komşu aday boşluğu/çakışması ve barline sınırı risklerini sınıflandır.`;

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
      status: "triage-only",
      triageStatus: parsed.triageStatus || "llm-uncertain",
      confidence: parsed.confidence || "low",
      failureMode: parsed.failureMode || "insufficient-context",
      reason: parsed.reason || "",
      rejectedCandidates: parsed.rejectedCandidates || [],
      recommendedAction: parsed.recommendedAction || "human-review",
      notes: parsed.notes || "",
      promotionEligible: false,
      raw,
    };
  } catch (error) {
    return {
      catalogId,
      status: "llm-error",
      verified: false,
      promotionEligible: false,
      error: error.message,
    };
  }
}

function buildVerificationEntry() {
  return null;
}

function buildTriageEntry(result, catalogId, layoutData, geometryResult = null) {
  const layoutEntry = layoutData.entries?.[catalogId];
  if (!layoutEntry) return null;

  return {
    type: "symbtr-layout-llm-triage-entry",
    catalogId,
    sourceLayoutGeneratedAt: layoutData.generatedAt,
    sourceArchiveMemberPath: layoutEntry.source.archiveMemberPath,
    sourceMeasureCandidateCount: layoutEntry.measureCandidates?.length || 0,
    reviewer: "llm-triage",
    method: "llm-triage-only",
    promotionEligible: false,
    promotionPolicy: "LLM output cannot promote PDF measure boxes; deterministic geometry/staff/barline/fingerprint evidence is required.",
    triageStatus: result.triageStatus || result.status,
    confidence: result.confidence,
    failureMode: result.failureMode,
    reason: result.reason,
    notes: result.notes,
    recommendedAction: result.recommendedAction || "human-review",
    rejectedCandidateIndexes: result.rejectedCandidates || [],
    deterministicChecks: geometryResult?.checks ?? null,
    llmRaw: result.raw?.substring(0, 2000) || "",
  };
}

function loadCheckpoint(outDir) {
  const checkpointPath = path.join(outDir, "ai-triage-checkpoint.json");
  if (existsSync(checkpointPath)) {
    return JSON.parse(readFileSync(checkpointPath, "utf8"));
  }
  return {completed: [], failed: [], lastIndex: -1};
}

function saveCheckpoint(outDir, checkpoint) {
  const checkpointPath = path.join(outDir, "ai-triage-checkpoint.json");
  writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

function writeTriageArtifacts(outDir, triageEntries, results) {
  const generatedAt = new Date().toISOString();
  writeFileSync(
    path.join(outDir, "ai-triage-entries.json"),
    JSON.stringify({version: 1, type: "symbtr-layout-llm-triage", generatedAt, entries: triageEntries}, null, 2),
  );

  writeFileSync(
    path.join(outDir, "ai-verification-entries.json"),
    JSON.stringify({
      version: 1,
      type: "symbtr-layout-llm-verification-disabled",
      generatedAt,
      policy: "LLM triage cannot create verified measure boxes.",
      entries: {},
    }, null, 2),
  );

  writeFileSync(
    path.join(outDir, "ai-triage-results.json"),
    JSON.stringify({version: 1, generatedAt, results}, null, 2),
  );
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
    const {readdirSync} = await import("node:fs");
    const files = readdirSync(reviewDir).filter(f => f.endsWith("-layout-review.svg"));
    targetCatalogIds = files.map(f => f.replace("-layout-review.svg", ""));
  }

  // Slice based on offset/limit
  const selectedIds = targetCatalogIds.slice(offset, offset + limit);
  const checkpoint = loadCheckpoint(outDir);

  const results = [];
  const triageEntries = {};

  console.log(`AI Layout Triage Batch: ${selectedIds.length} artifacts`);
  console.log(`Provider: ${provider}`);
  console.log(`Offset: ${offset}, Limit: ${limit}`);
  console.log("Promotion: disabled; LLM output is triage-only");
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
      const result = {
        catalogId,
        status: "geometry-failure",
        triageStatus: "geometry-failure",
        confidence: "high",
        failureMode: "staff-overlap-risk",
        reason: "Deterministic geometry validation failed before LLM triage.",
        recommendedAction: "human-review",
        rejectedCandidates: [],
        promotionEligible: false,
      };
      results.push(result);
      const entry = buildTriageEntry(result, catalogId, layoutData, geoResult);
      if (entry) triageEntries[catalogId] = entry;
      checkpoint.completed.push(catalogId);
      checkpoint.lastIndex = globalIndex;
      saveCheckpoint(outDir, checkpoint);
      writeTriageArtifacts(outDir, triageEntries, results);
      continue;
    }

    console.log(`[${globalIndex + 1}/${targetCatalogIds.length}] TRIAGE ${catalogId}...`);
    const startTime = Date.now();
    const result = await verifyArtifactWithLLM(svgPath, htmlPath, catalogId, {provider});
    const duration = Date.now() - startTime;

    console.log(`  → ${result.triageStatus || result.status} (${result.confidence || 'n/a'}) in ${duration}ms`);
    if (result.reason) console.log(`  → reason: ${result.reason.substring(0, 80)}...`);

    results.push(result);

    if (result.status === "triage-only") {
      const entry = buildTriageEntry(result, catalogId, layoutData, geoResult);
      if (entry) {
        triageEntries[catalogId] = entry;
      }
      checkpoint.completed.push(catalogId);
    } else {
      checkpoint.failed.push({catalogId, reason: result.error || result.status});
    }

    checkpoint.lastIndex = globalIndex;
    saveCheckpoint(outDir, checkpoint);

    writeTriageArtifacts(outDir, triageEntries, results);

    // Small delay between requests to avoid overwhelming the LLM
    if (i < selectedIds.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const summary = {
    total: selectedIds.length,
    deterministicGateCandidates: results.filter(r => r.triageStatus === "deterministic-gate-candidate").length,
    needsHumanReview: results.filter(r => r.triageStatus === "needs-human-review").length,
    geometryFailures: results.filter(r => r.triageStatus === "geometry-failure").length,
    llmUncertain: results.filter(r => r.triageStatus === "llm-uncertain").length,
    failed: results.filter(r => r.status === "llm-error" || r.status === "llm-parse-failed").length,
    promotedVerificationEntries: 0,
  };

  writeFileSync(
    path.join(outDir, "ai-triage-summary.json"),
    JSON.stringify({version: 1, generatedAt: new Date().toISOString(), summary, checkpoint}, null, 2),
  );

  console.log("\n=== AI Triage Summary ===");
  console.log(JSON.stringify(summary, null, 2));

  return {summary, results, triageEntries};
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
const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export {verifyArtifactWithLLM, buildVerificationEntry, buildTriageEntry, runBatchVerification};

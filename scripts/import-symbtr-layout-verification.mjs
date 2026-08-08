#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import path from "node:path";
import {getSymbTrLayoutCandidateFingerprint} from "./lib/symbtr-layout-fingerprint.mjs";
import {
  CURRENT_MEASURE_INDEX_BASIS,
  LEGACY_MEASURE_INDEX_BASIS,
  MEASURE_INDEX_BASES,
} from "./lib/symbtr-score-measures.mjs";

const root = process.cwd();
const outputPath = path.join(root, "src", "data", "symbtr", "layout-verification.generated.json");
const layoutPath = path.join(root, "src", "data", "symbtr", "layout.generated.json");
const previewPath = path.join(root, "output", "symbtr-layout-review", "layout-verification.import-preview.json");
const allowedMethods = new Set(["human-reviewed", "visual-regression", "symbtr-txt-aligned"]);

function parseArgs(argv) {
  const args = {write: false};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      args.input = argv[index + 1];
      index += 1;
    } else if (arg === "--write") {
      args.write = true;
    } else if (arg === "--dry-run") {
      args.write = false;
    }
  }

  return args;
}

function assertProjectInput(input) {
  if (!input) {
    throw new Error("--input is required");
  }

  const resolvedRoot = path.resolve(root);
  const resolvedInput = path.resolve(root, input);
  const relative = path.relative(resolvedRoot, resolvedInput);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to read outside project: ${resolvedInput}`);
  }

  return resolvedInput;
}

function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeEntries(input) {
  if (isObject(input.entries)) return input.entries;
  if (Array.isArray(input.entries)) {
    return Object.fromEntries(input.entries.map((entry) => [entry.catalogId, entry]));
  }
  if (Array.isArray(input.verifications)) {
    return Object.fromEntries(input.verifications.map((entry) => [entry.catalogId, entry]));
  }
  throw new Error("Input must include entries object/array or verifications array.");
}

function getCandidatePairSet(layoutEntry) {
  return new Set(
    (Array.isArray(layoutEntry.measureCandidates) ? layoutEntry.measureCandidates : [])
      .map((candidate) => `${candidate.rowIndex}:${candidate.candidateIndexInRow}`),
  );
}

function validateIncomingEntries({incomingEntries, layoutData}) {
  const errors = [];
  const layoutEntries = isObject(layoutData.entries) ? layoutData.entries : {};

  for (const [catalogId, entry] of Object.entries(incomingEntries)) {
    const prefix = `entries.${catalogId}`;
    const layoutEntry = layoutEntries[catalogId];

    if (!isObject(entry)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }

    if (!isObject(layoutEntry)) {
      errors.push(`${prefix} is not a generated PDF layout candidate entry`);
      continue;
    }

    if (entry.catalogId !== catalogId) {
      errors.push(`${prefix}.catalogId must match the entry key`);
    }

    if (entry.sourceLayoutGeneratedAt !== layoutData.generatedAt) {
      errors.push(`${prefix}.sourceLayoutGeneratedAt must match layout.generated.json`);
    }

    if (entry.sourceArchiveMemberPath !== layoutEntry.source?.archiveMemberPath) {
      errors.push(`${prefix}.sourceArchiveMemberPath must match the generated PDF candidate source`);
    }

    const measureCandidates = Array.isArray(layoutEntry.measureCandidates) ? layoutEntry.measureCandidates : [];
    if (entry.sourceMeasureCandidateCount !== measureCandidates.length) {
      errors.push(`${prefix}.sourceMeasureCandidateCount must equal ${measureCandidates.length}`);
    }

    const expectedCandidateGeometryFingerprint = getSymbTrLayoutCandidateFingerprint({
      catalogId,
      layoutData,
      layoutEntry,
    });
    if (entry.candidateGeometryFingerprint !== expectedCandidateGeometryFingerprint) {
      errors.push(`${prefix}.candidateGeometryFingerprint must match the generated PDF candidate geometry fingerprint`);
    }

    // G5: kutular olcu numarasi tabanina bagimli. Alan yoksa eski kayit
    // sayilir (`offset-ceil-v1`) — `layout.ts` ile AYNI varsayilan; boylece
    // alani unutulmus yeni bir kayit burada yakalanir, calisma zamaninda
    // sessizce bayatlamaz.
    const entryBasis = entry.measureIndexBasis ?? LEGACY_MEASURE_INDEX_BASIS;
    if (!MEASURE_INDEX_BASES.includes(entryBasis)) {
      errors.push(`${prefix}.measureIndexBasis must be one of ${MEASURE_INDEX_BASES.join(", ")}`);
    } else if (entryBasis !== CURRENT_MEASURE_INDEX_BASIS) {
      errors.push(
        `${prefix}.measureIndexBasis is "${entryBasis}" but the engine now uses "${CURRENT_MEASURE_INDEX_BASIS}"; re-verify the measure boxes`,
      );
    }

    if (!allowedMethods.has(entry.method)) {
      errors.push(`${prefix}.method must be human-reviewed or visual-regression`);
    }

    if (typeof entry.reviewer !== "string" || entry.reviewer.trim().length === 0) {
      errors.push(`${prefix}.reviewer must be a non-empty string`);
    }

    // Geometrik otomatik hizalama (symbtr-txt-aligned) yalniz KANIT ZARFIYLA
    // kabul edilir: median delta <= 4% + confidence high + rapor referansi.
    // 2026-08-08 oncesi bu kapinin yoklugu, satir-basi adaylarini olcu diye
    // isaretleyen 14.694 kutunun manifeste girmesine izin vermisti.
    if (entry.method === "symbtr-txt-aligned") {
      const evidence = entry.alignmentEvidence;
      if (
        !isObject(evidence) ||
        typeof evidence.reportPath !== "string" ||
        evidence.reportPath.length === 0 ||
        evidence.confidence !== "high" ||
        !Number.isFinite(evidence.medianDeltaPercent) ||
        evidence.medianDeltaPercent > 4
      ) {
        errors.push(
          `${prefix}.alignmentEvidence must prove geometric alignment (medianDeltaPercent <= 4, confidence high, reportPath)`,
        );
      }
    }

    if (!Array.isArray(entry.measureBoxes) || entry.measureBoxes.length === 0) {
      errors.push(`${prefix}.measureBoxes must include at least one verified box`);
      continue;
    }

    const candidatePairs = getCandidatePairSet(layoutEntry);
    const seenMeasures = new Set();
    const seenCandidates = new Set();

    for (const [index, box] of entry.measureBoxes.entries()) {
      const boxPrefix = `${prefix}.measureBoxes[${index}]`;
      const candidatePair = `${box?.sourceCandidateRowIndex}:${box?.sourceCandidateIndexInRow}`;

      if (!isObject(box)) {
        errors.push(`${boxPrefix} must be an object`);
        continue;
      }

      if (box.confidence !== "verified") {
        errors.push(`${boxPrefix}.confidence must be verified`);
      }

      if (!Number.isInteger(box.measureIndex) || box.measureIndex < 1) {
        errors.push(`${boxPrefix}.measureIndex must be a positive integer`);
      } else if (seenMeasures.has(box.measureIndex)) {
        errors.push(`${boxPrefix} duplicates measureIndex ${box.measureIndex}`);
      } else {
        seenMeasures.add(box.measureIndex);
      }

      if (!candidatePairs.has(candidatePair)) {
        errors.push(`${boxPrefix} references missing generated candidate ${candidatePair}`);
      } else if (seenCandidates.has(candidatePair)) {
        errors.push(`${boxPrefix} duplicates generated candidate ${candidatePair}`);
      } else {
        seenCandidates.add(candidatePair);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid SymbTr layout verification import:\n${errors.join("\n")}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const inputPath = assertProjectInput(args.input);
const layoutData = readJson(layoutPath, {entries: {}});
const current = readJson(outputPath, {schemaVersion: 1, generatedAt: "2026-05-10", entries: {}});
const incoming = readJson(inputPath, {});
const incomingEntries = normalizeEntries(incoming);

validateIncomingEntries({incomingEntries, layoutData});

const newBoxCount = Object.values(incomingEntries)
  .reduce((total, entry) => total + (Array.isArray(entry.measureBoxes) ? entry.measureBoxes.length : 0), 0);

const nextManifest = {
  schemaVersion: 1,
  generatedAt: incoming.generatedAt ?? new Date().toISOString().slice(0, 10),
  policy: current.policy,
  entries: Object.fromEntries(
    Object.entries({
      ...(isObject(current.entries) ? current.entries : {}),
      ...incomingEntries,
    }).sort(([left], [right]) => left.localeCompare(right, "en")),
  ),
};

mkdirSync(path.dirname(previewPath), {recursive: true});
writeFileSync(previewPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

try {
  // Keep the project validator as the final authority before writing the real manifest.
  const {spawnSync} = await import("node:child_process");
  const result = spawnSync(process.execPath, [
    "scripts/validate-symbtr-layout-verification.mjs",
    "--verification-path",
    path.relative(root, previewPath),
    "--skip-empty-import-dry-run",
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "validate-symbtr-layout-verification failed");
  }
} finally {
  if (existsSync(previewPath)) {
    rmSync(previewPath);
  }
}

if (args.write) {
  writeFileSync(outputPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
}

console.log(JSON.stringify({
  dryRun: !args.write,
  inputEntryCount: Object.keys(incomingEntries).length,
  existingEntryCount: Object.keys(isObject(current.entries) ? current.entries : {}).length,
  outputEntryCount: Object.keys(nextManifest.entries).length,
  verifiedMeasureBoxCount: Object.values(nextManifest.entries)
    .reduce((total, entry) => total + (Array.isArray(entry.measureBoxes) ? entry.measureBoxes.length : 0), 0),
  newVerifiedMeasureBoxCount: newBoxCount,
  outputPath: path.relative(root, outputPath).split(path.sep).join("/"),
}, null, 2));

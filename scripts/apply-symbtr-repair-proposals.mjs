#!/usr/bin/env node
// W4.1h: operator-onayli repair-proposals uygulamasi.
//
// Kapsam (repair-proposals.json siniflandirmasinin birebir semantigi):
// - keep    -> stored kutu AYNEN korunur (yeni hizalama ile esit).
// - replace -> kutu, onerilen adayin geometrisiyle degisir
//              (geometrik kanitli onarim; reviewer: symbtr-txt-aligner-v1).
// - review  -> DOKUNULMAZ: kanit yok, insan/gorsel onay yuzeyidir
//              (verified olarak kalir; adaylar review template'te durur).
// - add     -> YAZILMAZ: yeni kutu, ayri import-ready kapisindan gecer.
//
// Akis: onarilmis manifest bir preview dosyasina yazilir, son otorite
// (validate-symbtr-layout-verification.mjs) preview'i dogrular; hata yoksa
// --write ile gercek manifest guncellenir. Hata varsa HICBIR SEY yazilmaz.
//
// Kullanim:
//   node scripts/apply-symbtr-repair-proposals.mjs            # preview + dogrula
//   node scripts/apply-symbtr-repair-proposals.mjs --write    # dogrulama sonrasi yaz
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPAIR_PROPOSAL_PATH = path.join(PROJECT_ROOT, "output", "symbtr-layout-review", "repair-proposals.json");
const VERIFICATION_PATH = path.join(PROJECT_ROOT, "src", "data", "symbtr", "layout-verification.generated.json");
const LAYOUT_PATH = path.join(PROJECT_ROOT, "src", "data", "symbtr", "layout.generated.json");
const PREVIEW_PATH = path.join(PROJECT_ROOT, "output", "symbtr-layout-review", "repair-apply-preview.json");
const APPLY_REPORT_PATH = path.join(PROJECT_ROOT, "output", "symbtr-layout-review", "repair-apply-report.json");
const VALIDATOR_PATH = path.join(PROJECT_ROOT, "scripts", "validate-symbtr-layout-verification.mjs");
const REPAIR_REVIEWER = "symbtr-txt-aligner-v1";

function readJson(filePath, label, fallback = null) {
  if (!existsSync(filePath)) {
    if (fallback !== null) return fallback;
    throw new Error(`${label} missing: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseCliOptions(argv) {
  const options = new Map();
  for (const arg of argv) {
    if (arg === "--write") options.set("write", true);
  }
  return options;
}

/**
 * Repair-proposals -> onarilmis manifest girisleri.
 * Stored entry metadata (fingerprint, basis, reviewer, verifiedAt, ...) AYNEN
 * korunur; yalnizca kutu kumesi siniflandirmaya gore yeniden kurulur.
 */
export function buildRepairEntries({
  proposalPath = REPAIR_PROPOSAL_PATH,
  verificationPath = VERIFICATION_PATH,
  layoutPath = LAYOUT_PATH,
} = {}) {
  const proposals = readJson(proposalPath, "repair proposals");
  const verification = readJson(verificationPath, "verification manifest");
  const layout = readJson(layoutPath, "layout candidate data");
  const previewEntries = {...(verification.entries ?? {})};
  const stats = {
    verifiedEntries: Object.keys(proposals.entries ?? {}).length,
    appliedEntryCount: 0,
    keepBoxCount: 0,
    replaceBoxCount: 0,
    reviewBoxCount: 0,
    reviewBoxDroppedCandidateCollisionCount: 0,
    addBoxExcludedCount: 0,
    skippedEntryCount: 0,
  };
  const appliedCatalogIds = [];

  for (const [catalogId, proposal] of Object.entries(proposals.entries ?? {})) {
    const stored = verification.entries?.[catalogId];
    const layoutEntry = layout.entries?.[catalogId];
    if (!stored || !layoutEntry) {
      stats.skippedEntryCount += 1;
      continue;
    }
    const candidatesByKey = new Map(
      (layoutEntry.measureCandidates ?? []).map((candidate) => (
        [`${Number(candidate.rowIndex)}:${Number(candidate.candidateIndexInRow)}`, candidate]
      )),
    );
    const storedBoxByMeasure = new Map(
      (stored.measureBoxes ?? []).map((box) => [Number(box.measureIndex), box]),
    );

    const boxes = [];
    const usedCandidateKeys = new Set();
    let blocked = false;
    let entryReplace = 0;
    let entryReviewDropped = 0;
    // 1. gecis: replace'ler once islenir — aday sahipligi kanitli onarima aittir.
    for (const action of (proposal.actions ?? []).filter((item) => item.action === "replace")) {
      const candidateKey = `${Number(action.proposed?.sourceCandidateRowIndex)}:${Number(action.proposed?.sourceCandidateIndexInRow)}`;
      const candidate = candidatesByKey.get(candidateKey);
      if (!candidate || usedCandidateKeys.has(candidateKey)) {
        blocked = true;
        break;
      }
      usedCandidateKeys.add(candidateKey);
      boxes.push({
        leftPercent: candidate.leftPercent,
        topPercent: candidate.topPercent,
        widthPercent: candidate.widthPercent,
        heightPercent: candidate.heightPercent,
        confidence: "verified",
        measureIndex: action.measureIndex,
        verifiedAt: new Date().toISOString(),
        reviewer: REPAIR_REVIEWER,
        method: "symbtr-txt-aligned",
        sourceCandidateRowIndex: Number(action.proposed.sourceCandidateRowIndex),
        sourceCandidateIndexInRow: Number(action.proposed.sourceCandidateIndexInRow),
      });
      entryReplace += 1;
    }
    if (blocked) {
      stats.skippedEntryCount += 1;
      continue;
    }
    // 2. gecis: keep/review stored kutulari — adayi zaten replace sahiplendiyse
    // review kutusu verified'dan duser (aday kalir; insan yuzeyi korunur).
    for (const action of (proposal.actions ?? []).filter(
      (item) => item.action === "keep" || item.action === "review",
    )) {
      const storedBox = storedBoxByMeasure.get(Number(action.measureIndex));
      if (!storedBox) {
        blocked = true;
        break;
      }
      const candidateKey = `${Number(storedBox.sourceCandidateRowIndex)}:${Number(storedBox.sourceCandidateIndexInRow)}`;
      if (usedCandidateKeys.has(candidateKey)) {
        if (action.action === "keep") {
          blocked = true;
          break;
        }
        stats.reviewBoxDroppedCandidateCollisionCount += 1;
        entryReviewDropped += 1;
        continue;
      }
      usedCandidateKeys.add(candidateKey);
      boxes.push({...storedBox});
    }
    if (blocked) {
      stats.skippedEntryCount += 1;
      continue;
    }
    stats.addBoxExcludedCount += (proposal.actions ?? []).filter((item) => item.action === "add").length;

    boxes.sort((left, right) => left.measureIndex - right.measureIndex);
    stats.appliedEntryCount += 1;
    stats.keepBoxCount += proposal.counts?.keep ?? 0;
    stats.replaceBoxCount += proposal.counts?.replace ?? 0;
    stats.reviewBoxCount += proposal.counts?.review ?? 0;
    appliedCatalogIds.push(catalogId);
    previewEntries[catalogId] = {
      ...stored,
      measureBoxes: boxes,
      ...(entryReplace > 0
        ? {
            repairEvidence: {
              reportPath: path.relative(PROJECT_ROOT, proposalPath).split(path.sep).join("/"),
              proposalGeneratedAt: proposals.generatedAt,
              appliedAt: new Date().toISOString(),
              replaceBoxCount: entryReplace,
              reviewBoxCount: proposal.counts?.review ?? 0,
              reviewBoxDroppedCandidateCollisionCount: entryReviewDropped,
              addBoxExcludedCount: proposal.counts?.add ?? 0,
            },
          }
        : {}),
    };
  }

  return {previewEntries, stats, appliedCatalogIds};
}

export function runRepairApply(args = process.argv.slice(2)) {
  const options = parseCliOptions(args);
  const verification = readJson(VERIFICATION_PATH, "verification manifest");
  const {previewEntries, stats, appliedCatalogIds} = buildRepairEntries();
  const previewManifest = {
    schemaVersion: verification.schemaVersion,
    generatedAt: verification.generatedAt,
    policy: verification.policy,
    entries: previewEntries,
  };
  writeJson(PREVIEW_PATH, previewManifest);

  const validator = spawnSync(
    process.execPath,
    [
      path.relative(PROJECT_ROOT, VALIDATOR_PATH),
      "--verification-path",
      path.relative(PROJECT_ROOT, PREVIEW_PATH),
      "--skip-empty-import-dry-run",
    ],
    {cwd: PROJECT_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 100 * 1024 * 1024},
  );
  if (validator.status !== 0) {
    throw new Error(
      `Validator rejected the repaired preview:\n${validator.stderr || validator.stdout}`,
    );
  }

  const report = {
    version: 1,
    type: "symbtr-measure-repair-apply",
    generatedAt: new Date().toISOString(),
    dryRun: !options.get("write"),
    proposalPath: path.relative(PROJECT_ROOT, REPAIR_PROPOSAL_PATH).split(path.sep).join("/"),
    previewPath: path.relative(PROJECT_ROOT, PREVIEW_PATH).split(path.sep).join("/"),
    verificationManifestPath: path.relative(PROJECT_ROOT, VERIFICATION_PATH).split(path.sep).join("/"),
    policy:
      "Yalnizca replace (geometrik kanitli) uygulanir; keep korunur; review insan/gorsel onay yuzeyidir (dokunulmaz); add yazilmaz (ayri import-ready kapisi). Preview son otorite dogrulayicidan gecer.",
    stats,
    validator: {ok: true, exitCode: 0},
    appliedCatalogIds,
  };
  writeJson(APPLY_REPORT_PATH, report);

  if (options.get("write")) {
    writeJson(VERIFICATION_PATH, previewManifest);
  }
  return report;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  try {
    console.log(JSON.stringify(runRepairApply(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

#!/usr/bin/env node
/**
 * W4.3 oto-yeniden-tarama kancasi (P3): sample havuzu DEGISTIGINDE
 * (manifest sha256 farki) claimed klasorlerini otomatik yeniden korelasyonla
 * tarar. Insan hatirlatmasi gerekmez; deterministik ve idempotent.
 *
 * Kanit ilkesi: `claimed` bir iddiadir; kaynak havuzu buyudukce iddia
 * yeniden olculebilir. Bu kanca, olcumu yeni kaynak girisiyle tetikler.
 */
import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROVENANCE_PATH = path.join(PROJECT_ROOT, "public", "samples", "provenance.json");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "public", "samples", "manifest.json");
const FINGERPRINT_PATH = path.join(PROJECT_ROOT, "output", "samples", "claimed-pool-fingerprint.json");
const IDENTIFY_SCRIPT = path.join(PROJECT_ROOT, "scripts", "identify-sample-provenance.mjs");

function sha256File(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function claimedFolderIds() {
  const provenance = readJson(PROVENANCE_PATH, {folders: {}});
  return Object.entries(provenance.folders ?? {})
    .filter(([, entry]) => entry?.confidence === "claimed")
    .map(([folderId]) => folderId)
    .sort();
}

function main() {
  const claimed = claimedFolderIds();
  if (claimed.length === 0) {
    console.log(JSON.stringify({rescanned: false, claimedFolders: [], reason: "no-claimed-folders"}));
    return;
  }

  const poolFingerprint = sha256File(MANIFEST_PATH);
  const stored = readJson(FINGERPRINT_PATH, null);
  if (stored?.poolFingerprint === poolFingerprint) {
    console.log(JSON.stringify({
      rescanned: false,
      claimedFolders: claimed,
      poolFingerprint,
      reason: "sample-pool-unchanged",
      lastRescanAt: stored.lastRescanAt,
    }));
    return;
  }

  console.log(`[auto-rescan] havuz degisti (${stored?.poolFingerprint ? "yeni" : "ilk"}); claimed klasorler yeniden taranıyor: ${claimed.join(", ")}`);
  const result = spawnSync(
    process.execPath,
    [IDENTIFY_SCRIPT, "--folders", claimed.join(",")],
    {cwd: PROJECT_ROOT, encoding: "utf8", stdio: "inherit", shell: false},
  );
  if (result.status !== 0) {
    console.error(`[auto-rescan] identify-sample-provenance cikisi: ${result.status}`);
    process.exitCode = result.status ?? 1;
    return;
  }

  mkdirSync(path.dirname(FINGERPRINT_PATH), {recursive: true});
  writeFileSync(
    FINGERPRINT_PATH,
    `${JSON.stringify({poolFingerprint, lastRescanAt: new Date().toISOString(), claimedFolders: claimed}, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    rescanned: true,
    claimedFolders: claimed,
    poolFingerprint,
    lastRescanAt: new Date().toISOString(),
  }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

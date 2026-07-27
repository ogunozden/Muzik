#!/usr/bin/env node
// SymbTr v3.0 sembolik korpusunu (Zenodo 15470412, CC-BY 4.0) indirir ve
// `symb/SymbTr-3.0/{MusicXML,mu2,txt}` altina v2 klasor duzeniyle acar.
// F8.7 cikis kriterinin "kaynakli yeni korpus verisi" kanali budur: v3,
// v2'de olmayan tied/slur/repeat/ending ogelerini tasir (ornegin Hicazkar
// Pesrev'de <tied> x2 + mu2 caret x2). Script idempotenttir: hedef klasor
// beklenen dosya sayisina sahipse indirme atlanir.
import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync} from "node:fs";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TARGET_ROOT = path.join(PROJECT_ROOT, "symb", "SymbTr-3.0");
const DOWNLOAD_ROOT = path.join(PROJECT_ROOT, "symb", "_downloads");
const ZENODO_RECORD_URL = "https://zenodo.org/api/records/15470412";
const EXPECTED_FILE_COUNT = 3000;

// Zenodo arsiv adi -> v2 uyumlu hedef klasor adi. PDF (563MB) bilincli olarak
// kapsam disi: sembolik kanallar (xml/mu2/txt) F8.7 icin yeterlidir.
const ARCHIVES = [
  {key: "xml_v3.zip", innerDir: "xml_v3", targetDir: "MusicXML"},
  {key: "mu2_v3.zip", innerDir: "mu2_v3", targetDir: "mu2"},
  {key: "txt_v3.zip", innerDir: "txt_v3", targetDir: "txt"},
];

function countFiles(dirPath) {
  if (!existsSync(dirPath)) return 0;
  return readdirSync(dirPath).length;
}

function isArchiveAlreadyExtracted(archive) {
  return countFiles(path.join(TARGET_ROOT, archive.targetDir)) >= EXPECTED_FILE_COUNT;
}

async function fetchZenodoManifest() {
  const response = await fetch(ZENODO_RECORD_URL);
  if (!response.ok) {
    throw new Error(`Zenodo record fetch failed: ${response.status} ${response.statusText}`);
  }
  const record = await response.json();
  const manifest = new Map();
  for (const file of record.files ?? []) {
    manifest.set(file.key, {
      checksum: String(file.checksum ?? ""),
      size: Number(file.size ?? 0),
      url: file.links?.self,
    });
  }
  return manifest;
}

async function verifyChecksum(filePath, expectedChecksum) {
  // Zenodo checksum formati: "md5:<hex>".
  const [algorithm, expectedHex] = expectedChecksum.split(":");
  if (!algorithm || !expectedHex) return;
  const digest = createHash(algorithm).update(await readFile(filePath)).digest("hex");
  if (digest !== expectedHex) {
    throw new Error(`Checksum mismatch for ${path.basename(filePath)}: expected ${expectedHex}, got ${digest}`);
  }
}

async function downloadArchive(archive, manifest) {
  const meta = manifest.get(archive.key);
  if (!meta?.url) throw new Error(`Zenodo manifest missing ${archive.key}`);
  mkdirSync(DOWNLOAD_ROOT, {recursive: true});
  const zipPath = path.join(DOWNLOAD_ROOT, archive.key);
  if (!existsSync(zipPath)) {
    console.log(`[fetch-symbtr-v3] downloading ${archive.key} (${(meta.size / 1e6).toFixed(1)}MB)...`);
    const response = await fetch(meta.url);
    if (!response.ok) {
      throw new Error(`Download failed for ${archive.key}: ${response.status} ${response.statusText}`);
    }
    writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
  }
  await verifyChecksum(zipPath, meta.checksum);
  return zipPath;
}

function extractArchive(archive, zipPath) {
  const stagingDir = path.join(DOWNLOAD_ROOT, `_extract-${archive.innerDir}`);
  rmSync(stagingDir, {recursive: true, force: true});
  mkdirSync(stagingDir, {recursive: true});
  // ── ZIP ACMA: platforma gore FARKLI arac ───────────────────────────────
  // Windows/macOS'ta `tar` bsdtar'dir ve zip okur. LINUX'ta ise GNU tar'dir
  // ve **zip okuyamaz** — bu betik CI'da (ubuntu-latest) tam olarak burada
  // kiriliyordu ve kimse gormemisti, cunku korpus CI'da hic indirilmiyordu.
  // Linux'ta `unzip` kullanilir (ubuntu-latest'te kurulu gelir).
  //
  // Windows notu: PATH'teki tar Git'in GNU tar'i olabilir, bu yuzden
  // System32\tar.exe acikca secilir. Yollar cwd'ye gore GORELI verilir; GNU
  // tar fallback'i mutlak `C:` onekini uzak-makine sanip "Cannot connect to
  // C" ile duser.
  const relativeStaging = path.relative(DOWNLOAD_ROOT, stagingDir) || ".";
  const [command, args] =
    process.platform === "linux"
      ? ["unzip", ["-q", "-o", path.basename(zipPath), "-d", relativeStaging]]
      : [
          (() => {
            const systemTar =
              process.platform === "win32"
                ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
                : null;
            return systemTar && existsSync(systemTar) ? systemTar : "tar";
          })(),
          ["-xf", path.basename(zipPath), "-C", relativeStaging],
        ];

  const result = spawnSync(command, args, {cwd: DOWNLOAD_ROOT, stdio: "inherit"});
  if (result.error || result.status !== 0) {
    throw new Error(
      `zip extraction failed for ${archive.key} via \`${command}\` (exit ${result.status ?? "error"})`,
    );
  }
  const innerPath = path.join(stagingDir, archive.innerDir);
  const sourceDir = existsSync(innerPath) ? innerPath : stagingDir;
  const targetDir = path.join(TARGET_ROOT, archive.targetDir);
  rmSync(targetDir, {recursive: true, force: true});
  mkdirSync(path.dirname(targetDir), {recursive: true});
  renameSync(sourceDir, targetDir);
  rmSync(stagingDir, {recursive: true, force: true});
}

export async function fetchSymbtrV3() {
  const pending = ARCHIVES.filter((archive) => !isArchiveAlreadyExtracted(archive));
  if (pending.length === 0) {
    console.log(`[fetch-symbtr-v3] OK: ${TARGET_ROOT} zaten tam (3 klasor x >=${EXPECTED_FILE_COUNT} dosya).`);
    return {downloaded: [], skipped: ARCHIVES.map((archive) => archive.key)};
  }
  const manifest = await fetchZenodoManifest();
  for (const archive of pending) {
    const zipPath = await downloadArchive(archive, manifest);
    extractArchive(archive, zipPath);
    console.log(
      `[fetch-symbtr-v3] ${archive.key} -> ${path.join("symb", "SymbTr-3.0", archive.targetDir)} (${countFiles(
        path.join(TARGET_ROOT, archive.targetDir),
      )} dosya)`,
    );
  }
  return {
    downloaded: pending.map((archive) => archive.key),
    skipped: ARCHIVES.filter((archive) => !pending.includes(archive)).map((archive) => archive.key),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchSymbtrV3().catch((error) => {
    console.error(`[fetch-symbtr-v3] HATA: ${error.message}`);
    process.exitCode = 1;
  });
}

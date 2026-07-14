import fs from "node:fs";
import path from "node:path";

/**
 * Client bundle butcesi kapisi (F2.4).
 *
 * `.next/static/chunks` altindaki client JS chunk'larini tarar ve tek bir
 * chunk'in butcesini asmasini fail eder. 2026-07-14'te `/studio/follow` ve
 * `/studio/score-engine` 32MB SymbTr layout verisini tek chunk'a gomuyordu
 * (23.5MB); bu kapi o sinif regresyonu build sonrasi yakalar.
 *
 * Kullanim: once `npm run build`, sonra `node scripts/audit-bundle-size.mjs`.
 */

const root = process.cwd();
const CHUNKS_DIR = path.join(root, ".next", "static", "chunks");

// Tek client chunk icin ust sinir (uncompressed). Mevcut en buyuk chunk
// ~0.47MB; 1.5MB esigi normal buyumeye alan birakir ama 32MB'lik veri-gomme
// regresyonunu kesin yakalar.
const MAX_SINGLE_CHUNK_BYTES = 1.5 * 1024 * 1024;
// Tum client static JS toplami icin ust sinir. Mevcut ~2.5MB.
const MAX_TOTAL_CHUNK_BYTES = 8 * 1024 * 1024;

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function collectChunkFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectChunkFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(CHUNKS_DIR)) {
    console.error(`[bundle-size] Client chunk dizini yok: ${path.relative(root, CHUNKS_DIR)}`);
    console.error("[bundle-size] Once `npm run build` calistir.");
    process.exit(1);
  }

  const files = collectChunkFiles(CHUNKS_DIR).map((file) => ({
    file: path.relative(root, file),
    bytes: fs.statSync(file).size,
  }));

  const totalBytes = files.reduce((sum, entry) => sum + entry.bytes, 0);
  const largest = [...files].sort((a, b) => b.bytes - a.bytes);
  const failures = [];

  for (const entry of largest) {
    if (entry.bytes > MAX_SINGLE_CHUNK_BYTES) {
      failures.push(
        `Chunk butcesini asiyor: ${entry.file} ${formatMb(entry.bytes)} > ${formatMb(MAX_SINGLE_CHUNK_BYTES)}`,
      );
    }
  }

  if (totalBytes > MAX_TOTAL_CHUNK_BYTES) {
    failures.push(
      `Toplam client chunk butcesini asiyor: ${formatMb(totalBytes)} > ${formatMb(MAX_TOTAL_CHUNK_BYTES)}`,
    );
  }

  console.log(`[bundle-size] ${files.length} client chunk, toplam ${formatMb(totalBytes)}`);
  console.log("[bundle-size] En buyuk 3 chunk:");
  for (const entry of largest.slice(0, 3)) {
    console.log(`  ${formatMb(entry.bytes).padStart(10)}  ${entry.file}`);
  }

  if (failures.length > 0) {
    console.error("\n[bundle-size] FAIL:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("[bundle-size] OK: tum client chunk'lar butce icinde.");
}

main();

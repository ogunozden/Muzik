#!/usr/bin/env node
/**
 * clean-output — Merkezi temizlik (Faz A otomatik)
 *
 * Atıl artifact'leri siler: dev-runtime logları, ai-enrichment batchleri,
 * eski playwright screenshotları, coverage, .next/cache.
 * CI'da her build öncesi çalışır; localde `npm run clean` ile.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function rmRecursive(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return 0;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    fs.rmSync(full, {recursive: true, force: true});
    return 1;
  }
  fs.rmSync(full, {force: true});
  return 1;
}

function rmGlob(dir, pattern) {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(fullDir)) {
    if (pattern.test(entry)) {
      fs.rmSync(path.join(fullDir, entry), {recursive: true, force: true});
      count++;
    }
  }
  return count;
}

let cleaned = 0;
cleaned += rmGlob("output", /^dev-runtime-.*\.log$/);
cleaned += rmRecursive("output/ai-enrichment");
cleaned += rmRecursive("output/design-qa-artifacts");
cleaned += rmRecursive("coverage");
cleaned += rmRecursive(".next/cache");
cleaned += rmRecursive("test-results");
cleaned += rmRecursive("playwright-report");

// symbtr-layout-review içindeki 1800+ PDF review'lar — son 7 gün korunur, eskiler silinir
const reviewDir = path.join(root, "output/symbtr-layout-review");
if (fs.existsSync(reviewDir)) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(reviewDir)) {
    if (entry.endsWith("-layout-review.pdf")) {
      const p = path.join(reviewDir, entry);
      if (fs.statSync(p).mtimeMs < cutoff) {
        fs.rmSync(p, {force: true});
        cleaned++;
      }
    }
  }
}

console.log(`[clean-output] ${cleaned} atıl artifact temizlendi`);

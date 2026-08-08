#!/usr/bin/env node
// W4.2: duplicate-URL demote listesi.
//
// Kabul manifesti (provider-verification-accepted-import-ready.json) URL
// kimligine gore deterministik dedupe eder: ayni kaynak URL'sine birden fazla
// catalogId isaret edemez (import kapisinin kurali). Kazanan en yuksek
// evidence.score; esitlikte catalogId (localeCompare). Kaybeden satirlar
// cache'te hala "accepted-ready" durur ve manifestte gorunmez — bu durum
// turetilen manifestte duplicateUrlExcludedCount olarak kendini gosterir.
//
// Bu betik kaybedenleri DETERMINISTIK olarak "conflict" statusune demote eder
// (neden: duplicate-url-identity-excluded; kazanan kaydedilir). conflict,
// AUTO_VERIFIABLE_STATUSES disindadir, bu yuzden zamanlanmis kosucu bunlara
// dokunmaz ve schedule ayni kalir (0 parti terminal).
//
// Kullanim:
//   node scripts/demote-duplicate-url-candidates.mjs            # liste + dry-run
//   node scripts/demote-duplicate-url-candidates.mjs --write    # cache'i guncelle
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  buildAcceptedCandidate,
  dedupeAcceptedCandidatesByIdentity,
} from "./verify-external-source-providers.mjs";
import {getReferenceIdentity} from "./import-external-reference-candidates.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(PROJECT_ROOT, "output", "external-source-discovery");
const CACHE_PATH = path.join(OUT_DIR, "provider-verification-cache.json");
const DEMOTE_LIST_PATH = path.join(OUT_DIR, "duplicate-url-demote-list.json");
const CHECKED_AT = "2026-06-01";
const REASON = "duplicate-url-identity-excluded";

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

export function buildDuplicateUrlDemoteList({cachePath = CACHE_PATH, checkedAt = CHECKED_AT} = {}) {
  const cache = readJson(cachePath, "provider verification cache", {version: 1, entries: {}});
  const rows = Object.values(cache.entries ?? {}).filter(
    (row) => row.providerProfileId === "internet-archive" && row.status === "accepted-ready" && row.best?.identifier,
  );

  const candidates = rows.map((row) => (
    buildAcceptedCandidate({group: row, doc: row.best, checkedAt, score: row.best.confidence.score})
  ));
  const winners = dedupeAcceptedCandidatesByIdentity(candidates);

  const demotions = rows
    .map((row) => {
      const candidate = buildAcceptedCandidate({
        group: row,
        doc: row.best,
        checkedAt,
        score: row.best.confidence.score,
      });
      const identity = getReferenceIdentity(candidate.source);
      const winnerCandidate = winners.find((w) => getReferenceIdentity(w.source) === identity);
      return {
        cacheKey: row.cacheKey ?? `${row.catalogId}:internet-archive:${row.searchQuery}`,
        catalogId: row.catalogId,
        source: {
          id: candidate.source.id,
          provider: candidate.source.provider,
          url: candidate.source.url,
          identifier: row.best.identifier,
          title: row.best.title,
        },
        winnerCatalogId: winnerCandidate ? winnerCandidate.catalogId : null,
        winnerUrl: winnerCandidate ? winnerCandidate.source.url : null,
        status: "conflict",
        reason: REASON,
        previousStatus: "accepted-ready",
        evidenceScore: candidate.evidence.score,
      };
    })
    .filter((demotion) => demotion.winnerCatalogId !== demotion.catalogId)
    .sort((left, right) => (
      String(left.catalogId).localeCompare(String(right.catalogId), "en") ||
      String(left.source.url).localeCompare(String(right.source.url), "en")
    ));

  return {
    version: 1,
    type: "external-source-provider-duplicate-url-demote-list",
    generatedAt: new Date().toISOString(),
    cachePath: path.relative(PROJECT_ROOT, cachePath).split(path.sep).join("/"),
    summary: {
      acceptedReadyRowCount: rows.length,
      winnerCandidateCount: winners.length,
      demoteCount: demotions.length,
      reason: REASON,
      policy:
        "Ayni kaynak URL'sine birden fazla catalogId isaret edemez; kazanan en yuksek evidence.score (esitlikte catalogId). Kaybedenler conflict'e demote edilir ve zamanlanmis kosucuya is acmaz.",
    },
    demotions,
  };
}

export function applyDuplicateUrlDemotions({cachePath = CACHE_PATH, list} = {}) {
  const cache = readJson(cachePath, "provider verification cache", {version: 1, entries: {}});
  let applied = 0;
  for (const demotion of list.demotions) {
    const row = cache.entries?.[demotion.cacheKey];
    if (!row || row.status !== "accepted-ready") continue;
    row.status = demotion.status;
    row.statusReason = demotion.reason;
    row.demotion = {
      reason: demotion.reason,
      previousStatus: demotion.previousStatus,
      winnerCatalogId: demotion.winnerCatalogId,
      winnerUrl: demotion.winnerUrl,
      demotedAt: list.generatedAt,
    };
    applied += 1;
  }
  if (applied > 0) writeJson(cachePath, cache);
  return {applied};
}

export function runDemoteCli(args = process.argv.slice(2)) {
  const options = parseCliOptions(args);
  const list = buildDuplicateUrlDemoteList();
  writeJson(DEMOTE_LIST_PATH, list);
  const result = applyDuplicateUrlDemotions({list});
  console.log(JSON.stringify({
    ...list,
    cacheUpdated: Boolean(options.get("write")),
    appliedDemotionCount: options.get("write") ? result.applied : 0,
    demoteListPath: path.relative(PROJECT_ROOT, DEMOTE_LIST_PATH).split(path.sep).join("/"),
    nextCommand: options.get("write")
      ? "npm run verify:external-source-providers:schedule"
      : "node scripts/demote-duplicate-url-candidates.mjs --write",
  }, null, 2));
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  try {
    runDemoteCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  applyDuplicateUrlDemotions,
  buildDuplicateUrlDemoteList,
} from "../demote-duplicate-url-candidates.mjs";

function cacheEntry({cacheKey, catalogId, identifier, title, score}) {
  return {
    cacheKey,
    catalogId,
    providerProfileId: "internet-archive",
    status: "accepted-ready",
    statusReason: "provider-metadata-complete",
    checkedAt: "2026-06-01",
    searchQuery: catalogId,
    best: {
      identifier,
      title,
      confidence: {
        score,
        titleCoverage: 1,
        composerCoverage: 1,
        completeEvidence: true,
      },
    },
  };
}

function fixtureCache() {
  return {
    version: 1,
    entries: {
      catA: cacheEntry({
        cacheKey: "catA",
        catalogId: "catA",
        identifier: "shared-item",
        title: "Shared Item",
        score: 95,
      }),
      catB: cacheEntry({
        cacheKey: "catB",
        catalogId: "catB",
        identifier: "shared-item",
        title: "Shared Item",
        score: 90,
      }),
      catC: cacheEntry({
        cacheKey: "catC",
        catalogId: "catC",
        identifier: "unique-item",
        title: "Unique Item",
        score: 80,
      }),
    },
  };
}

function writeFixture(root, cache) {
  const cachePath = path.join(root, "provider-verification-cache.json");
  mkdirSync(path.dirname(cachePath), {recursive: true});
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  return cachePath;
}

describe("demote-duplicate-url-candidates", () => {
  it("deterministik olarak yalnizca duplicate-URL kaybedenlerini demote eder", () => {
    const root = mkdtempSync(path.join(tmpdir(), "muzik-demote-"));
    const cachePath = writeFixture(root, fixtureCache());

    const list = buildDuplicateUrlDemoteList({cachePath});

    expect(list.summary.acceptedReadyRowCount).toBe(3);
    expect(list.summary.winnerCandidateCount).toBe(2); // catA (95) + catC (unique)
    expect(list.summary.demoteCount).toBe(1);
    expect(list.demotions[0].catalogId).toBe("catB");
    expect(list.demotions[0].winnerCatalogId).toBe("catA");
    expect(list.demotions[0].winnerUrl).toBe("https://archive.org/details/shared-item");
    expect(list.demotions[0].status).toBe("conflict");
    expect(list.demotions[0].reason).toBe("duplicate-url-identity-excluded");
    expect(list.demotions[0].previousStatus).toBe("accepted-ready");

    const second = buildDuplicateUrlDemoteList({cachePath});
    expect(second.summary.demoteCount).toBe(1);
    expect(JSON.stringify(second.demotions)).toBe(JSON.stringify(list.demotions));
  });

  it("--write akisi: cache guncellenir ve tekrar uygulama idempotenttir", () => {
    const root = mkdtempSync(path.join(tmpdir(), "muzik-demote-"));
    const cachePath = writeFixture(root, fixtureCache());

    const list = buildDuplicateUrlDemoteList({cachePath});
    const first = applyDuplicateUrlDemotions({cachePath, list});
    expect(first.applied).toBe(1);

    const updated = JSON.parse(readFileSync(cachePath, "utf8"));
    expect(updated.entries.catB.status).toBe("conflict");
    expect(updated.entries.catB.statusReason).toBe("duplicate-url-identity-excluded");
    expect(updated.entries.catB.demotion.reason).toBe("duplicate-url-identity-excluded");
    expect(updated.entries.catB.demotion.winnerCatalogId).toBe("catA");
    expect(updated.entries.catA.status).toBe("accepted-ready");
    expect(updated.entries.catC.status).toBe("accepted-ready");

    const second = applyDuplicateUrlDemotions({cachePath, list});
    expect(second.applied).toBe(0); // zaten demote edilmis — dokunmaz
  });
});

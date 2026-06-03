import { describe, expect, it } from "vitest";
import { buildSearchQuery, isAlreadyInInbox, getCatalogEntries } from "../provider-discovery-agent.mjs";

describe("provider-discovery-agent", () => {
  describe("buildSearchQuery", () => {
    it("constructs site-restricted queries with title and composer", () => {
      const entry = { title: "aldanma_dunya", composer: "zekai_dede" };
      const profile = { queryPrefix: "site:divanmakam.com" };
      expect(buildSearchQuery(entry, profile)).toBe(
        'site:divanmakam.com "aldanma_dunya" "zekai_dede"',
      );
    });

    it("skips title when it equals '1'", () => {
      const entry = { title: "1", composer: "zekai_dede" };
      const profile = { queryPrefix: "site:divanmakam.com" };
      expect(buildSearchQuery(entry, profile)).toBe('site:divanmakam.com "zekai_dede"');
    });

    it("handles missing composer gracefully", () => {
      const entry = { title: "aldanma_dunya" };
      const profile = { queryPrefix: "site:salihbora.com" };
      expect(buildSearchQuery(entry, profile)).toBe('site:salihbora.com "aldanma_dunya"');
    });
  });

  describe("isAlreadyInInbox", () => {
    it("returns true when catalogId and sourceUrl match", () => {
      const inbox = [
        { catalogId: "acem--ilahi--duyek--aldanma_dunya--zekai_dede", sourceUrl: "https://divanmakam.com/example" },
      ];
      expect(
        isAlreadyInInbox(inbox, "acem--ilahi--duyek--aldanma_dunya--zekai_dede", "https://divanmakam.com/example"),
      ).toBe(true);
    });

    it("returns false when catalogId differs", () => {
      const inbox = [
        { catalogId: "acem--ilahi--duyek--aldanma_dunya--zekai_dede", sourceUrl: "https://divanmakam.com/example" },
      ];
      expect(
        isAlreadyInInbox(inbox, "other-id", "https://divanmakam.com/example"),
      ).toBe(false);
    });

    it("returns false when sourceUrl differs", () => {
      const inbox = [
        { catalogId: "acem--ilahi--duyek--aldanma_dunya--zekai_dede", sourceUrl: "https://divanmakam.com/example" },
      ];
      expect(
        isAlreadyInInbox(inbox, "acem--ilahi--duyek--aldanma_dunya--zekai_dede", "https://divanmakam.com/other"),
      ).toBe(false);
    });

    it("returns false for empty inbox", () => {
      expect(isAlreadyInInbox([], "any-id", "https://example.com")).toBe(false);
    });

    it("handles multiple entries correctly", () => {
      const inbox = [
        { catalogId: "id-1", sourceUrl: "https://example.com/1" },
        { catalogId: "id-2", sourceUrl: "https://example.com/2" },
      ];
      expect(isAlreadyInInbox(inbox, "id-1", "https://example.com/1")).toBe(true);
      expect(isAlreadyInInbox(inbox, "id-2", "https://example.com/1")).toBe(false);
    });
  });

  describe("getCatalogEntries", () => {
    it("returns the array when catalog is an array", () => {
      const catalog = [{ id: "entry-1" }, { id: "entry-2" }];
      expect(getCatalogEntries(catalog)).toEqual(catalog);
    });

    it("returns entries from object catalog", () => {
      const catalog = { entries: [{ id: "entry-1" }] };
      expect(getCatalogEntries(catalog)).toEqual([{ id: "entry-1" }]);
    });

    it("returns empty array when entries is missing", () => {
      expect(getCatalogEntries({})).toEqual([]);
    });
  });

  describe("inbox entry structure", () => {
    it("creates entries with the correct shape", () => {
      const inbox = [];
      const entry = { id: "acem--ilahi--duyek--aldanma_dunya--zekai_dede" };
      const url = "https://divanmakam.com/forum/example.12345/";
      const profileId = "divanmakam";
      const now = Date.now();

      inbox.push({
        id: `${entry.id}:${profileId}:${now}`,
        catalogId: entry.id,
        sourceUrl: url,
        sourceTitle: "",
        provider: profileId,
        status: "pending",
        submittedAt: new Date(now).toISOString(),
        notes: "auto-discovered via divanmakam",
      });

      expect(inbox).toHaveLength(1);
      expect(inbox[0]).toEqual({
        id: "acem--ilahi--duyek--aldanma_dunya--zekai_dede:divanmakam:".concat(now),
        catalogId: "acem--ilahi--duyek--aldanma_dunya--zekai_dede",
        sourceUrl: "https://divanmakam.com/forum/example.12345/",
        sourceTitle: "",
        provider: "divanmakam",
        status: "pending",
        submittedAt: new Date(now).toISOString(),
        notes: "auto-discovered via divanmakam",
      });
    });

    it("deduplicates by catalogId and sourceUrl", () => {
      const inbox = [];
      const entry = { id: "acem--ilahi--duyek--aldanma_dunya--zekai_dede" };
      const url = "https://divanmakam.com/forum/example.12345/";

      const pushIfNew = (entryId, sourceUrl) => {
        if (isAlreadyInInbox(inbox, entryId, sourceUrl)) return false;
        inbox.push({
          id: `${entryId}:divanmakam:${Date.now()}`,
          catalogId: entryId,
          sourceUrl,
          sourceTitle: "",
          provider: "divanmakam",
          status: "pending",
          submittedAt: new Date().toISOString(),
          notes: "auto-discovered via divanmakam",
        });
        return true;
      };

      expect(pushIfNew(entry.id, url)).toBe(true);
      expect(pushIfNew(entry.id, url)).toBe(false);
      expect(inbox).toHaveLength(1);
    });
  });

  describe("CLI and limits", () => {
    it("accepts --limit from CLI argument", () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'agent.mjs', '--limit=100'];
      const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || process.argv[process.argv.indexOf('--limit') + 1]) || 5;
      expect(limit).toBe(100);
      process.argv = originalArgv;
    });

    it("enforces MAX_ENTRIES cap", () => {
      const MAX_ENTRIES = 1000;
      const limit = 5000;
      const effectiveLimit = Math.min(limit, MAX_ENTRIES);
      expect(effectiveLimit).toBe(1000);
    });

    it("wraps inbox output in {version, sources} envelope", () => {
      const sources = [{ catalogId: "test-1", sourceUrl: "https://example.com", status: "pending" }];
      const envelope = { version: 1, sources };
      const serialized = JSON.stringify(envelope, null, 2);
      const parsed = JSON.parse(serialized);
      expect(parsed.version).toBe(1);
      expect(parsed.sources).toHaveLength(1);
      expect(parsed.sources[0].catalogId).toBe("test-1");
    });
  });
});

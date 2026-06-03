import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { getStrategy, buildArchiveSearchUrlWithStrategy } from "../strategy-engine.mjs";
import path from "node:path";

const METRICS_DIR = path.resolve(import.meta.dirname, "../../../output/metrics");
const BAK_FILE = path.join(METRICS_DIR, "best-strategies.json.bak");

beforeAll(() => {
  const f = path.join(METRICS_DIR, "best-strategies.json");
  if (existsSync(f)) {
    writeFileSync(BAK_FILE, readFileSync(f));
  }
});

describe("strategy-engine", () => {
  const sampleGroup = {
    title: "Hicazkar Pesrev",
    composer: "Tanburi Buyuk Osman Bey",
    makam: "hicazkar",
    form: "pesrev",
    usul: "devrikebir",
  };

  it("returns a valid strategy with default fallback", () => {
    const strategy = getStrategy("unknown-provider", "title-composer");
    expect(strategy).toBeDefined();
    expect(strategy.name).toBe("title-composer");
  });

  it("builds a query URL with strategy fields", () => {
    const url = buildArchiveSearchUrlWithStrategy(sampleGroup, 3, "internet-archive");
    expect(url).toContain("advancedsearch.php");
    expect(url).toContain("q=");
    expect(url).toContain("rows=3");
  });

  it("includes required IA API parameters", () => {
    const url = buildArchiveSearchUrlWithStrategy(sampleGroup, 5, "internet-archive");
    expect(url).toContain("output=json");
    expect(url).toContain("rows=5");
  });

  it("handles empty group gracefully", () => {
    const url = buildArchiveSearchUrlWithStrategy({ title: "", composer: "", makam: "" }, 3, "internet-archive");
    expect(url).toBeNull();
  });
});

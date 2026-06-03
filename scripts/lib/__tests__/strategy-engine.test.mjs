import { describe, it, expect } from "vitest";
import { getStrategy, buildArchiveSearchUrlWithStrategy } from "../strategy-engine.mjs";

describe("strategy-engine", () => {
  const sampleGroup = {
    title: "Hicazkar Pesrev",
    composer: "Tanburi Buyuk Osman Bey",
    makam: "hicazkar",
    form: "pesrev",
    usul: "devrikebir",
  };

  it("returns a valid strategy without prior training data", () => {
    const strategy = getStrategy("internet-archive", "title-composer");
    expect(strategy).toBeDefined();
    expect(strategy.name).toBe("title-composer");
  });

  it("builds a title-composer query URL", () => {
    const url = buildArchiveSearchUrlWithStrategy(sampleGroup, 3, "internet-archive");
    expect(url).toContain("advancedsearch.php");
    expect(url).toContain("q=");
    expect(url).toContain("Hicazkar");
    expect(url).toContain("Tanburi");
    expect(url).toContain("%5B%5D=identifier");
    expect(url).toContain("rows=3");
  });

  it("includes all required IA fields", () => {
    const url = buildArchiveSearchUrlWithStrategy(sampleGroup, 5, "internet-archive");
    expect(url).toContain("output=json");
    expect(url).toContain("rows=5");
  });

  it("handles empty group gracefully", () => {
    const url = buildArchiveSearchUrlWithStrategy({ title: "", composer: "", makam: "" }, 3, "internet-archive");
    expect(url).toBeNull();
  });
});

import {describe, expect, it} from "vitest";
import {
  formatBacklogFormats,
  formatNumber,
  getFacetValues,
  getFirstHintUrl,
  getReferenceKey,
  getReferenceProfileLabel,
  getSourceLabel,
  getUniqueOptions,
  matchesQuery,
  normalizeFilterText,
  renderCatalogLine,
} from "../curation-helpers";

describe("curation-helpers", () => {
  describe("formatNumber", () => {
    it("returns dash for non-numeric input", () => {
      expect(formatNumber("x")).toBe("-");
      expect(formatNumber(undefined)).toBe("-");
    });

    it("formats numbers with tr-TR grouping", () => {
      expect(formatNumber(1234)).toBe("1.234");
    });
  });

  describe("normalizeFilterText", () => {
    it("lowercases and trims strings, empty for non-strings", () => {
      expect(normalizeFilterText("  HeLLo  ")).toBe("hello");
      expect(normalizeFilterText(42)).toBe("");
    });
  });

  describe("matchesQuery", () => {
    it("matches when the query is empty", () => {
      expect(matchesQuery(["anything"], "")).toBe(true);
    });

    it("matches on substring across values", () => {
      expect(matchesQuery(["Uşşak", "Zekai Dede"], "zekai")).toBe(true);
      expect(matchesQuery(["Uşşak"], "hicaz")).toBe(false);
    });
  });

  describe("getUniqueOptions", () => {
    it("dedupes, drops falsy and sorts (tr locale)", () => {
      expect(getUniqueOptions(["b", "a", null, "a", undefined, "c"])).toEqual(["a", "b", "c"]);
    });
  });

  describe("getFacetValues", () => {
    it("maps facet values and drops empties", () => {
      expect(getFacetValues([{value: "x", count: 1}, {value: "", count: 0}])).toEqual(["x"]);
      expect(getFacetValues(undefined)).toEqual([]);
    });
  });

  describe("renderCatalogLine", () => {
    it("joins makam/form/usul, dash when empty", () => {
      expect(renderCatalogLine({makam: "Rast", form: "Peşrev", usul: "Düyek"})).toBe("Rast / Peşrev / Düyek");
      expect(renderCatalogLine(null)).toBe("-");
    });
  });

  describe("getSourceLabel", () => {
    it("prefers title, then label, then sourceId", () => {
      expect(getSourceLabel({source: {title: "T", label: "L"}})).toBe("T");
      expect(getSourceLabel({source: {label: "L"}})).toBe("L");
      expect(getSourceLabel({sourceId: "sid"})).toBe("sid");
      expect(getSourceLabel({})).toBe("-");
    });
  });

  describe("getReferenceProfileLabel", () => {
    it("joins profile and provider", () => {
      expect(getReferenceProfileLabel({profileId: "p", source: {provider: "prov"}})).toBe("p / prov");
      expect(getReferenceProfileLabel({})).toBe("-");
    });
  });

  describe("getReferenceKey", () => {
    it("combines catalogId and sourceId", () => {
      expect(getReferenceKey({catalogId: "c", sourceId: "s"})).toBe("c:s");
      expect(getReferenceKey({})).toBe(":");
    });
  });

  describe("getFirstHintUrl", () => {
    it("returns the first non-empty pipe-split url", () => {
      expect(getFirstHintUrl({scoreSourceHintUrls: " | https://a.com | https://b.com"})).toBe("https://a.com");
      expect(getFirstHintUrl({})).toBeUndefined();
    });
  });

  describe("formatBacklogFormats", () => {
    it("renders explicit availableFormats with slashes", () => {
      expect(formatBacklogFormats({availableFormats: "txt|xml|pdf"})).toBe("txt / xml / pdf");
    });
  });
});

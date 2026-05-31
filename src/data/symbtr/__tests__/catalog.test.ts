import {describe, expect, it} from "vitest";
import {
  SYMBTR_CATALOG,
  SYMBTR_CATALOG_COUNT,
  getSymbTrCatalogSourceCoverage,
  getSymbTrEntryById,
  getSymbTrEntrySourceReferences,
  searchSymbTrCatalog,
} from "../catalog";

describe("SymbTr catalog", () => {
  it("contains the full local v3 catalog without duplicate ids", () => {
    const ids = SYMBTR_CATALOG.map((entry) => entry.id);
    expect(SYMBTR_CATALOG_COUNT).toBe(3000);
    expect(new Set(ids).size).toBe(3000);
  });

  it("parses canonical filename segments into makam, form, usul, title and composer", () => {
    const entry = getSymbTrEntryById("acem--ilahi--duyek--aldanma_dunya--zekai_dede");

    expect(entry).toEqual(
      expect.objectContaining({
        makam: "acem",
        form: "ilahi",
        usul: "duyek",
        title: "aldanma_dunya",
        composer: "zekai_dede",
      }),
    );
  });

  it("searches across canonical metadata fields", () => {
    const results = searchSymbTrCatalog("devrikebir", 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((entry) => entry.id.includes("devrikebir") || entry.usul.includes("devrikebir"))).toBe(true);
  });

  it("derives deterministic local archive references for every canonical format", () => {
    const entry = getSymbTrEntryById("acem--ilahi--duyek--aldanma_dunya--zekai_dede");
    expect(entry).toBeDefined();

    const references = getSymbTrEntrySourceReferences(entry!);
    const localReferences = references.filter((reference) => reference.access === "local-archive");

    expect(localReferences).toHaveLength(5);
    expect(new Set(references.map((reference) => reference.id)).size).toBe(references.length);
    expect(localReferences.map((reference) => reference.format)).toEqual(["txt", "mid", "xml", "mu2", "pdf"]);
    expect(localReferences[0]).toMatchObject({
      id: "acem--ilahi--duyek--aldanma_dunya--zekai_dede:txt",
      archivePath: "symb/txt_v3.zip",
      archiveMemberPath: "txt_v3/acem--ilahi--duyek--aldanma_dunya--zekai_dede.txt",
      canonical: true,
    });
    expect(references.some((reference) => reference.access === "external-link" && reference.url?.includes("MTG/SymbTr"))).toBe(true);
  });

  it("reports full v3 source coverage without duplicate catalog entries", () => {
    const coverage = getSymbTrCatalogSourceCoverage();

    expect(coverage.totalEntries).toBe(3000);
    expect(coverage.entriesWithAllFormats).toBe(3000);
    expect(coverage.missingFormatEntries).toEqual([]);
  });
});

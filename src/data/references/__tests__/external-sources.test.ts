import {describe, expect, it} from "vitest";
import {HICAZKAR_PESREV} from "@/data/pieces/hicazkarPesrev";
import {SYMBTR_CATALOG} from "@/data/symbtr/catalog";
import curationDecisionData from "../external-curation-decisions.json";
import {
  EXTERNAL_REFERENCE_POLICY,
  dedupeExternalReferenceSources,
  getExternalReferenceIdentity,
  validateExternalReferenceSource,
  type ExternalReferenceSource,
} from "../external-sources";
import {
  PIECE_EXTERNAL_REFERENCE_MANIFEST,
  getOfficialSymbTrV3ExternalReferences,
  getPieceExternalReferenceCoverage,
  getPieceExternalReferences,
  getResolvedPieceExternalReferenceCoverage,
  validatePieceExternalReferenceManifest,
} from "../piece-external-references";

const YOUTUBE_REFERENCE: ExternalReferenceSource = {
  id: "youtube-nwbnzn75br8",
  label: "Referans kayıt",
  provider: "youtube",
  url: "https://www.youtube.com/watch?v=NwbNZN75bR8&t=12s",
  title: "Hicazkâr Peşrev",
  access: "external-link",
  verification: "oembed",
  verifiedAt: "2026-05-10",
};
const ALLOWED_CURATION_DECISION_STATUSES = new Set(["needs-disambiguation", "source-mismatch", "deferred"]);

describe("external source registry", () => {
  it("validates the curated external reference manifest", () => {
    expect(validatePieceExternalReferenceManifest()).toEqual([]);
  });

  it("keeps the external reference policy aligned with safe inline preview", () => {
    expect(EXTERNAL_REFERENCE_POLICY.autoDownloadMedia).toBe(false);
    expect(EXTERNAL_REFERENCE_POLICY.autoEmbedMedia).toBe(false);
    expect(EXTERNAL_REFERENCE_POLICY.inlinePreviewMedia).toBe(true);
    expect(EXTERNAL_REFERENCE_POLICY.allowedEmbedProviders).toContain("youtube");
    expect(EXTERNAL_REFERENCE_POLICY.iframeSandbox).toContain("allow-presentation");
  });

  it("keeps every curated manifest key attached to a canonical catalog entry", () => {
    for (const catalogId of Object.keys(PIECE_EXTERNAL_REFERENCE_MANIFEST)) {
      expect(getOfficialSymbTrV3ExternalReferences(catalogId)).toHaveLength(2);
    }
  });

  it("keeps curation decisions attached to canonical catalog entries", () => {
    const catalogIds = new Set(SYMBTR_CATALOG.map((entry) => entry.id));
    const seenDecisionIds = new Set<string>();

    for (const decision of curationDecisionData.decisions) {
      expect(catalogIds.has(decision.catalogId)).toBe(true);
      expect(seenDecisionIds.has(decision.catalogId)).toBe(false);
      expect(ALLOWED_CURATION_DECISION_STATUSES.has(decision.status)).toBe(true);
      expect(decision.reason.trim().length).toBeGreaterThan(0);
      expect(decision.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      seenDecisionIds.add(decision.catalogId);
    }
  });

  it("keeps verified references addressable by canonical SymbTr catalog id", () => {
    const references = getPieceExternalReferences(HICAZKAR_PESREV.symbtrCatalogId);

    expect(references).toHaveLength(5);
    expect(references.map((reference) => reference.provider)).toEqual(["symbtr", "github", "score", "symbtr", "youtube"]);
    expect(references.map((reference) => reference.label)).toEqual([
      "SymbTr v3 Zenodo",
      "MTG/SymbTr GitHub",
      "Nota kaynağı",
      "SymbTr",
      "Referans kayıt",
    ]);
  });

  it("generates official metadata-only SymbTr v3 references for any catalog entry", () => {
    const references = getOfficialSymbTrV3ExternalReferences("acem--ilahi--duyek--aldanma_dunya--zekai_dede");

    expect(references).toHaveLength(2);
    expect(references).toEqual([
      expect.objectContaining({
        id: "acem-ilahi-duyek-aldanma-dunya-zekai-dede-symbtr-v3-zenodo",
        label: "SymbTr v3 Zenodo",
        access: "metadata-only",
        verification: "catalog",
        url: "https://zenodo.org/records/15470412",
      }),
      expect.objectContaining({
        id: "acem-ilahi-duyek-aldanma-dunya-zekai-dede-mtg-symbtr-github",
        provider: "github",
        access: "metadata-only",
      }),
    ]);
  });

  it("keeps manually curated score pages separate from generated official metadata", () => {
    const references = getPieceExternalReferences("beyati--sarki--aksak--benzemez_kimse--fehmi_tokay");

    expect(references).toHaveLength(3);
    expect(references.at(-1)).toEqual(
      expect.objectContaining({
        id: "salihbora-benzemez-kimse-sana-score",
        provider: "score",
        verification: "manual",
        access: "external-link",
        url: "https://www.salihbora.com/benzemez-kimse-sana-tavrina-hayran-olayim/",
      }),
    );
  });

  it("reports external reference coverage separately from local SymbTr archive coverage", () => {
    const coverage = getPieceExternalReferenceCoverage();

    expect(coverage.totalCatalogEntries).toBe(3000);
    expect(coverage.catalogEntriesWithReferences).toBe(22);
    expect(coverage.missingCatalogEntryCount).toBe(2978);
    expect(coverage.referenceCount).toBe(24);
  });

  it("reports generated official external reference coverage for the full catalog", () => {
    const coverage = getResolvedPieceExternalReferenceCoverage();

    expect(coverage.totalCatalogEntries).toBe(3000);
    expect(coverage.catalogEntriesWithOfficialReferences).toBe(3000);
    expect(coverage.missingOfficialReferenceCount).toBe(0);
    expect(coverage.catalogEntriesWithCuratedReferences).toBe(22);
    expect(coverage.missingCuratedReferenceCount).toBe(2978);
    expect(coverage.officialReferenceCount).toBe(6000);
    expect(coverage.curatedReferenceCount).toBe(24);
    expect(coverage.resolvedReferenceCount).toBe(6024);
  });

  it("normalizes YouTube identities so URL variants do not create duplicates", () => {
    const duplicateReference: ExternalReferenceSource = {
      ...YOUTUBE_REFERENCE,
      id: "youtube-short-link",
      url: "https://youtu.be/NwbNZN75bR8",
    };

    expect(getExternalReferenceIdentity(YOUTUBE_REFERENCE)).toBe("youtube:https://www.youtube.com/watch?v=nwbnzn75br8");
    expect(dedupeExternalReferenceSources([YOUTUBE_REFERENCE, duplicateReference])).toHaveLength(1);
  });

  it("rejects unsafe or weakly verified external media references", () => {
    const errors = validateExternalReferenceSource({
      ...YOUTUBE_REFERENCE,
      id: "Bad Id",
      url: "http://www.youtube.com/watch?v=NwbNZN75bR8",
      access: "embed-allowed",
      verification: "manual",
      verifiedAt: "10-05-2026",
    });

    expect(errors).toEqual([
      "Invalid reference id: Bad Id",
      "Reference Bad Id must use HTTPS",
      "Reference Bad Id cannot be embedded with manual-only verification",
      "YouTube reference Bad Id must be verified with oEmbed metadata",
      "Reference Bad Id must use YYYY-MM-DD verifiedAt",
    ]);
  });
});

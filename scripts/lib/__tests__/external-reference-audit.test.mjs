import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  buildBacklogRows,
  buildCandidateReviewRows,
  normalizeUrlForIdentity,
  readBulkReferenceCandidates,
  readResearchSourceProfiles,
  runExternalReferenceCoverageAudit,
} from "../external-reference-audit.mjs";

const catalogEntries = [
  {
    id: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
    makam: "ussak",
    form: "ilahi",
    usul: "duyek",
    title: "allah_emrin",
    composer: "zekai_dede",
    formats: ["txt", "xml", "pdf"],
  },
  {
    id: "rast--sarki--sofyan--baska_eser--diger_besteci",
    makam: "rast",
    form: "sarki",
    usul: "sofyan",
    title: "baska_eser",
    composer: "diger_besteci",
    formats: ["txt"],
  },
  {
    id: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
    makam: "hicaz",
    form: "pesrev",
    usul: "devrikebir",
    title: "ucuncu_eser",
    composer: "besteci",
    formats: ["xml"],
  },
];

function writeJson(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, value);
}

function createAuditRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-external-reference-audit-"));
  writeJson(root, "src/data/symbtr/catalog.generated.json", {entries: catalogEntries});
  writeText(
    root,
    "src/data/pieces/hicazkarPesrev.ts",
    'export const piece = { symbtrCatalogId: "ussak--ilahi--duyek--allah_emrin--zekai_dede" };\n',
  );
  writeText(root, "src/data/references/piece-external-references.ts", "export const refs = [];\n");
  writeJson(root, "src/data/references/external-curation-decisions.json", {
    decisions: [
      {
        catalogId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
        status: "needs-disambiguation",
        reason: "title overlaps with multiple sources",
        reviewedAt: "2026-05-10",
      },
    ],
  });
  writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {
    candidates: [
      {
        catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
        status: "accepted",
        checkedAt: "2026-05-10",
        source: {
          id: "youtube-baska-eser",
          provider: "youtube",
          label: "Başka eser icrası",
          url: "https://youtu.be/NwbNZN75bR8",
          verification: "oembed",
          verifiedAt: "2026-05-10",
        },
        evidence: {
          title: "Başka Eser",
          makam: "Rast",
          form: "Şarkı",
          usul: "Sofyan",
          composer: "Diğer Besteci",
          sourceProvider: "youtube.com",
        },
      },
    ],
  });
  writeJson(root, "src/data/references/research-source-profiles.json", {
    profiles: [
      {
        id: "divanmakam",
        label: "DîvânMakam",
        searchUrlTemplate: "https://duckduckgo.com/?q=site%3Adivanmakam.com%2Fforum%2F+{query}",
        provider: "score",
        trustWeight: 0.85,
        enabled: true,
      },
      {
        id: "youtube",
        label: "YouTube",
        searchUrlTemplate: "https://www.youtube.com/results?search_query={query}",
        provider: "youtube",
        trustWeight: 0.65,
        enabled: true,
      },
    ],
  });
  return root;
}

describe("external reference audit", () => {
  it("normalizes YouTube identities before duplicate checks", () => {
    expect(normalizeUrlForIdentity("https://youtu.be/NwbNZN75bR8?t=12")).toBe(
      "https://www.youtube.com/watch?v=nwbnzn75br8",
    );
    expect(normalizeUrlForIdentity("https://www.youtube.com/watch?v=NwbNZN75bR8&t=12")).toBe(
      "https://www.youtube.com/watch?v=nwbnzn75br8",
    );
  });

  it("builds backlog rows with deferred decisions kept out of next batch", () => {
    const rows = buildBacklogRows(
      catalogEntries,
      new Set(["ussak--ilahi--duyek--allah_emrin--zekai_dede"]),
      new Map([
        [
          "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
          {
            status: "needs-disambiguation",
            reason: "ambiguous",
            reviewedAt: "2026-05-10",
          },
        ],
      ]),
    );

    expect(rows.find((row) => row.catalogId === "ussak--ilahi--duyek--allah_emrin--zekai_dede")).toEqual(
      expect.objectContaining({
        hasCuratedReference: true,
        priorityGroup: "curated-reference-present",
      }),
    );
    expect(rows.find((row) => row.catalogId === "hicaz--pesrev--devrikebir--ucuncu_eser--besteci")).toEqual(
      expect.objectContaining({
        curationDecisionStatus: "needs-disambiguation",
        deferredFromNextBatch: true,
      }),
    );
  });

  it("runs the coverage audit and writes deterministic backlog artifacts", () => {
    const root = createAuditRoot();
    const summary = runExternalReferenceCoverageAudit({root, batchSize: 10});

    expect(summary).toEqual(
      expect.objectContaining({
        totalCatalogEntries: 3,
        curatedReferenceEntries: 2,
        missingCuratedEntries: 1,
        curationDecisionEntries: 1,
        bulkCandidateEntries: 1,
        acceptedBulkCandidateEntries: 1,
        researchSourceProfileEntries: 2,
        candidateReviewQueueEntries: 2,
        nextBatchSize: 0,
        deferredCatalogIds: ["hicaz--pesrev--devrikebir--ucuncu_eser--besteci"],
        batchReport: expect.objectContaining({
          processedCatalogEntries: 3,
          curatedBeforeBulkCandidates: 1,
          newlyAcceptedCatalogEntries: 1,
          curatedAfterBatch: 2,
          missingAfterBatch: 1,
          deferredMissingEntries: 1,
          generatedReviewCandidates: 2,
          validationGates: expect.arrayContaining(["candidate-review-only", "summary-count-drift"]),
        }),
      }),
    );

    const nextBatchJson = JSON.parse(
      readFileSync(path.join(root, "output", "external-reference-coverage", "symbtr-curated-reference-next-batch.json"), "utf8"),
    );
    const backlogJson = JSON.parse(
      readFileSync(path.join(root, "output", "external-reference-coverage", "symbtr-curated-reference-backlog.json"), "utf8"),
    );
    const candidateReviewJson = JSON.parse(
      readFileSync(path.join(root, "output", "external-reference-coverage", "symbtr-curated-reference-candidate-review-queue.json"), "utf8"),
    );
    expect(nextBatchJson).toEqual([]);
    expect(backlogJson).toHaveLength(3);
    expect(candidateReviewJson).toHaveLength(2);
    expect(candidateReviewJson[0]).toEqual(expect.objectContaining({
      catalogId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
      status: "needs-review",
      searchUrl: expect.stringContaining("https://"),
    }));
    expect(summary.backlogJson).toBe("output/external-reference-coverage/symbtr-curated-reference-backlog.json");
    expect(summary.candidateReviewQueueJson).toBe("output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json");
  });

  it("builds provider-profile search candidates as review-only queue rows", () => {
    const root = createAuditRoot();
    const rows = buildBacklogRows(
      catalogEntries,
      new Set(["ussak--ilahi--duyek--allah_emrin--zekai_dede"]),
      new Map(),
    );
    const profiles = readResearchSourceProfiles(path.join(root, "src/data/references/research-source-profiles.json"));
    const candidates = buildCandidateReviewRows(rows, profiles);

    expect(candidates).toHaveLength(4);
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        candidateId: "rast--sarki--sofyan--baska_eser--diger_besteci:divanmakam:search",
        status: "needs-review",
        provider: "score",
        reviewConfidenceScore: expect.any(Number),
      }),
      expect.objectContaining({
        candidateId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci:youtube:search",
        status: "needs-review",
        provider: "youtube",
      }),
    ]));
  });

  it("rejects duplicate accepted bulk candidate identities", () => {
    const root = createAuditRoot();
    writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {
      candidates: [
        {
          catalogId: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
          status: "accepted",
          checkedAt: "2026-05-10",
          source: {
            id: "youtube-one",
            provider: "youtube",
            label: "One",
            url: "https://youtu.be/NwbNZN75bR8",
            verification: "oembed",
            verifiedAt: "2026-05-10",
          },
        },
        {
          catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
          status: "accepted",
          checkedAt: "2026-05-10",
          source: {
            id: "youtube-two",
            provider: "youtube",
            label: "Two",
            url: "https://www.youtube.com/watch?v=NwbNZN75bR8&t=12",
            verification: "oembed",
            verifiedAt: "2026-05-10",
          },
        },
      ],
    });

    expect(() =>
      readBulkReferenceCandidates(catalogEntries, path.join(root, "src/data/references/external-reference-bulk-candidates.json")),
    ).toThrow("duplicate accepted bulk candidate URL identity");
  });

  it("keeps conflict bulk candidates in the manifest without counting them as curated", () => {
    const root = createAuditRoot();
    writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {
      candidates: [
        {
          catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
          status: "conflict",
          checkedAt: "2026-05-10",
          source: {id: "conflict-example"},
        },
      ],
    });

    const candidates = readBulkReferenceCandidates(
      catalogEntries,
      path.join(root, "src/data/references/external-reference-bulk-candidates.json"),
    );
    const summary = runExternalReferenceCoverageAudit({root, batchSize: 10});

    expect(candidates).toHaveLength(1);
    expect(summary.bulkCandidateEntries).toBe(1);
    expect(summary.acceptedBulkCandidateEntries).toBe(0);
    expect(summary.missingCuratedEntries).toBe(2);
    expect(summary.candidateReviewQueueEntries).toBe(4);
  });
});

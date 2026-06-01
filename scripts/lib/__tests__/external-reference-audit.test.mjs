import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  buildBacklogRows,
  buildCandidateReviewGroupDecisionRecommendations,
  buildCandidateReviewGroups,
  buildCandidateReviewRows,
  buildCoverageMatrix,
  humanizeSegment,
  readCandidateReviewGroupDecisions,
  normalizeUrlForIdentity,
  readBulkReferenceCandidates,
  readResearchSourceProfiles,
  runExternalReferenceCoverageAudit,
} from "../external-reference-audit.mjs";
import {getCandidateReviewGroupFingerprint} from "../../../src/data/references/candidate-review-group-fingerprint.mjs";

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
      {
        id: "internet-archive",
        label: "Internet Archive",
        searchUrlTemplate: "https://archive.org/search?query={query}",
        provider: "archive",
        trustWeight: 0.55,
        enabled: true,
      },
    ],
  });
  return root;
}

describe("external reference audit", () => {
  it("normalizes slug-like catalog segments without leading whitespace", () => {
    expect(humanizeSegment("-aksak")).toBe("Aksak");
  });

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
        researchSourceProfileEntries: 3,
        candidateReviewQueueEntries: 3,
        candidateReviewGroupEntries: 1,
        nextBatchSize: 0,
        deferredCatalogIds: ["hicaz--pesrev--devrikebir--ucuncu_eser--besteci"],
        batchReport: expect.objectContaining({
          processedCatalogEntries: 3,
          curatedBeforeBulkCandidates: 1,
          newlyAcceptedCatalogEntries: 1,
          curatedAfterBatch: 2,
          missingAfterBatch: 1,
          deferredMissingEntries: 1,
          generatedReviewCandidates: 3,
          generatedReviewGroups: 1,
          validationGates: expect.arrayContaining(["candidate-review-only", "summary-count-drift", "candidate-review-group-drift"]),
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
    const candidateReviewGroupJson = JSON.parse(
      readFileSync(path.join(root, "output", "external-reference-coverage", "symbtr-curated-reference-candidate-review-groups.json"), "utf8"),
    );
    const candidateReviewGroupRecommendationsJson = JSON.parse(
      readFileSync(
        path.join(
          root,
          "output",
          "external-reference-coverage",
          "symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
        ),
        "utf8",
      ),
    );
    const coverageMatrixJson = JSON.parse(
      readFileSync(
        path.join(root, "output", "external-reference-coverage", "symbtr-curated-reference-coverage-matrix.json"),
        "utf8",
      ),
    );
    const dedupeReportJson = JSON.parse(
      readFileSync(
        path.join(root, "output", "external-reference-coverage", "symbtr-curated-reference-dedupe-report.json"),
        "utf8",
      ),
    );
    expect(nextBatchJson).toEqual([]);
    expect(backlogJson).toHaveLength(3);
    expect(candidateReviewJson).toHaveLength(3);
    expect(candidateReviewGroupJson).toEqual([
      expect.objectContaining({
        groupId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci:review-group",
        candidateCount: 3,
        profileCount: 3,
        profiles: ["divanmakam", "internet-archive", "youtube"],
      }),
    ]);
    expect(candidateReviewJson[0]).toEqual(expect.objectContaining({
      catalogId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
      status: "needs-review",
      searchUrl: expect.stringContaining("https://"),
    }));
    expect(summary.backlogJson).toBe("output/external-reference-coverage/symbtr-curated-reference-backlog.json");
    expect(summary.candidateReviewQueueJson).toBe("output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json");
    expect(summary.candidateReviewGroupsJson).toBe("output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json");
    expect(summary.candidateReviewGroupDecisionRecommendationsJson).toBe(
      "output/external-reference-coverage/symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
    );
    expect(summary.coverageMatrixJson).toBe("output/external-reference-coverage/symbtr-curated-reference-coverage-matrix.json");
    expect(summary.coverageMatrixEntries).toBeGreaterThan(0);
    expect(summary.dedupeReportJson).toBe("output/external-reference-coverage/symbtr-curated-reference-dedupe-report.json");
    expect(summary.dedupeReportEntries).toBe(0);
    expect(summary.duplicateRowsAfterDedupe).toBe(0);
    expect(summary.cleanedDuplicateRows).toBe(0);
    expect(summary.candidateReviewGroupDecisionRecommendationEntries).toBe(1);
    expect(candidateReviewGroupRecommendationsJson).toEqual(expect.objectContaining({
      type: "candidate-review-group-decision-recommendations",
      summary: expect.objectContaining({
        recommendedDecisionCount: 1,
      }),
      decisions: [
        expect.objectContaining({
          catalogId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
          status: "deferred",
          reason: "batch-recommend-existing-curation-deferred",
          reviewedBy: "batch-policy",
        }),
      ],
    }));
    expect(coverageMatrixJson).toEqual(expect.objectContaining({
      type: "external-reference-coverage-matrix",
      summary: expect.objectContaining({
        totalCatalogEntries: 3,
        curatedReferenceEntries: 2,
        missingCuratedEntries: 1,
        candidateReviewQueueEntries: 3,
      }),
      catalogDimensions: expect.objectContaining({
        makam: expect.arrayContaining([
          expect.objectContaining({
            value: "Hicaz",
            missingCuratedEntries: 1,
            deferredMissingEntries: 1,
          }),
        ]),
      }),
      candidateDimensions: expect.objectContaining({
        provider: expect.arrayContaining([
          expect.objectContaining({
            value: "youtube",
            candidateReviewQueueEntries: 1,
          }),
        ]),
      }),
    }));
    expect(dedupeReportJson).toEqual(expect.objectContaining({
      type: "external-reference-dedupe-report",
      summary: expect.objectContaining({
        bulkCandidateEntries: 1,
        acceptedBulkCandidateEntries: 1,
        candidateReviewQueueEntries: 3,
        duplicateRows: 0,
        cleanedDuplicateRows: 0,
      }),
    }));
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

    expect(candidates).toHaveLength(6);
    expect(buildCandidateReviewGroups(candidates)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
        candidateCount: 3,
        reviewAction: "review-provider-candidates",
      }),
    ]));
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        candidateId: "rast--sarki--sofyan--baska_eser--diger_besteci:divanmakam:search",
        status: "needs-review",
        provider: "score",
        reviewConfidenceScore: expect.any(Number),
        scoreReasons: expect.arrayContaining(["catalog-field:usul", "catalog-field:title", "catalog-field:composer"]),
        queryFields: expect.arrayContaining(["makam", "form", "usul", "title", "composer"]),
        searchQuery: expect.stringContaining("Sofyan"),
      }),
      expect.objectContaining({
        candidateId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci:youtube:search",
        status: "needs-review",
        provider: "youtube",
      }),
      expect.objectContaining({
        candidateId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci:internet-archive:search",
        status: "needs-review",
        provider: "archive",
        searchUrl: expect.stringContaining("archive.org/search"),
      }),
    ]));
  });

  it("builds safe review group decision recommendations without accepted source fields", () => {
    const groups = [
      {
        groupId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci:review-group",
        catalogId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
        status: "conflict",
        candidateCount: 3,
        profileCount: 3,
        highestReviewConfidenceScore: 74,
      },
      {
        groupId: "rast--sarki--sofyan--baska_eser--diger_besteci:review-group",
        catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
        status: "needs-review",
        deferredFromNextBatch: true,
        candidateCount: 3,
        profileCount: 3,
        highestReviewConfidenceScore: 74,
      },
      {
        groupId: "ussak--ilahi--duyek--allah_emrin--zekai_dede:review-group",
        catalogId: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
        status: "needs-review",
        deferredFromNextBatch: false,
        candidateCount: 3,
        profileCount: 3,
        highestReviewConfidenceScore: 94,
      },
    ];

    const recommendations = buildCandidateReviewGroupDecisionRecommendations(groups, "2026-06-01");

    expect(recommendations).toHaveLength(2);
    expect(recommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogId: "hicaz--pesrev--devrikebir--ucuncu_eser--besteci",
        status: "conflict",
        reason: "batch-recommend-source-mismatch-conflict",
      }),
      expect.objectContaining({
        catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
        status: "deferred",
        reason: "batch-recommend-existing-curation-deferred",
      }),
    ]));
    expect(recommendations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: "accepted",
      }),
      expect.objectContaining({
        sourceUrl: expect.anything(),
      }),
      expect.objectContaining({
        sourceId: expect.anything(),
      }),
    ]));
  });

  it("builds catalog and provider coverage matrix without source attachment data", () => {
    const root = createAuditRoot();
    const rows = buildBacklogRows(
      catalogEntries,
      new Set(["ussak--ilahi--duyek--allah_emrin--zekai_dede"]),
      new Map(),
    );
    const profiles = readResearchSourceProfiles(path.join(root, "src/data/references/research-source-profiles.json"));
    const candidateRows = buildCandidateReviewRows(rows, profiles);
    const groups = buildCandidateReviewGroups(candidateRows);
    const matrix = buildCoverageMatrix({
      rows,
      candidateReviewRows: candidateRows,
      candidateReviewGroups: groups,
      researchProfiles: profiles,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(matrix.summary).toEqual(expect.objectContaining({
      totalCatalogEntries: 3,
      curatedReferenceEntries: 1,
      missingCuratedEntries: 2,
      candidateReviewQueueEntries: 6,
      candidateReviewGroupEntries: 2,
      researchSourceProfileEntries: 3,
    }));
    expect(matrix.catalogDimensions.form).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: "Sarki",
        missingCuratedEntries: 1,
      }),
    ]));
    expect(matrix.candidateDimensions.profileId).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: "internet-archive",
        candidateReviewQueueEntries: 2,
        affectedCatalogEntries: 2,
      }),
    ]));
    expect(JSON.stringify(matrix)).not.toMatch(/sourceUrl|sourceId|"accepted"/);
  });

  it("applies batch review group decisions without producing accepted sources", () => {
    const root = createAuditRoot();
    const rows = buildBacklogRows(catalogEntries, new Set(["ussak--ilahi--duyek--allah_emrin--zekai_dede"]), new Map());
    const profiles = readResearchSourceProfiles(path.join(root, "src/data/references/research-source-profiles.json"));
    const sourceGroup = buildCandidateReviewGroups(buildCandidateReviewRows(rows, profiles))
      .find((group) => group.catalogId === "rast--sarki--sofyan--baska_eser--diger_besteci");

    writeJson(root, "src/data/references/candidate-review-group-decisions.json", {
      version: 1,
      decisions: [
        {
          groupId: "rast--sarki--sofyan--baska_eser--diger_besteci:review-group",
          catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
          sourceGroupFingerprint: getCandidateReviewGroupFingerprint(sourceGroup),
          status: "rejected",
          reason: "batch-reviewed-no-safe-source",
          reviewedAt: "2026-06-01",
          reviewedBy: "local-operator",
        },
      ],
    });
    writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {candidates: []});

    const decisions = readCandidateReviewGroupDecisions(
      catalogEntries,
      path.join(root, "src/data/references/candidate-review-group-decisions.json"),
    );
    const groups = buildCandidateReviewGroups(buildCandidateReviewRows(rows, profiles), decisions);
    const summary = runExternalReferenceCoverageAudit({root, batchSize: 10});

    expect(groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
        status: "rejected",
        reviewAction: "batch-decision-rejected",
        decisionReason: "batch-reviewed-no-safe-source",
      }),
    ]));
    expect(summary.candidateReviewGroupDecisionEntries).toBe(1);
    expect(summary.candidateReviewGroupsByStatus).toEqual(expect.arrayContaining([
      expect.objectContaining({value: "rejected", count: 1}),
    ]));
    expect(summary.acceptedBulkCandidateEntries).toBe(0);
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

  it("rejects malformed accepted bulk candidate metadata", () => {
    const root = createAuditRoot();
    writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {
      candidates: [
        {
          catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
          status: "accepted",
          checkedAt: "2026-05-10",
          source: {
            id: "youtube-bad-metadata",
            provider: "youtube",
            label: "Bad metadata",
            url: "https://youtu.be/NwbNZN75bR8",
            verification: "oembed",
            verifiedAt: "2026-05-10",
            metadata: {
              oembedTitle: "",
              signals: ["youtube:oembed-title", ""],
            },
          },
        },
      ],
    });

    expect(() =>
      readBulkReferenceCandidates(catalogEntries, path.join(root, "src/data/references/external-reference-bulk-candidates.json")),
    ).toThrow("bulk candidate metadata.oembedTitle must be a non-empty string");
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
    expect(summary.candidateReviewQueueEntries).toBe(6);
  });
});

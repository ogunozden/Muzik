import {describe, expect, it} from "vitest";
import {
  buildCoverageMatrix,
  buildDedupeReport,
  summarizeCounts,
} from "../external-reference-reporting.mjs";

describe("external-reference-reporting", () => {
  it("builds catalog/provider coverage without accepted attachment fields", () => {
    const rows = [
      {
        catalogId: "a",
        makam: "Ussak",
        form: "Ilahi",
        usul: "Duyek",
        priorityGroup: "pdf-and-musicxml",
        hasCuratedReference: true,
        missingCuratedReference: false,
      },
      {
        catalogId: "b",
        makam: "Rast",
        form: "Sarki",
        usul: "Sofyan",
        priorityGroup: "pdf-only",
        hasCuratedReference: false,
        missingCuratedReference: true,
        deferredFromNextBatch: true,
      },
    ];
    const candidateReviewRows = [
      {
        catalogId: "b",
        profileId: "ogm-materyal",
        provider: "score",
        status: "needs-review",
        reviewConfidenceLevel: "low",
      },
      {
        catalogId: "b",
        profileId: "youtube",
        provider: "youtube",
        status: "conflict",
        reviewConfidenceLevel: "needs-context",
      },
    ];

    const matrix = buildCoverageMatrix({
      rows,
      candidateReviewRows,
      candidateReviewGroups: [{catalogId: "b"}],
      researchProfiles: [{id: "ogm-materyal"}, {id: "youtube"}],
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(matrix.summary).toEqual(expect.objectContaining({
      totalCatalogEntries: 2,
      curatedReferenceEntries: 1,
      missingCuratedEntries: 1,
      candidateReviewQueueEntries: 2,
      candidateReviewGroupEntries: 1,
      researchSourceProfileEntries: 2,
    }));
    expect(matrix.catalogDimensions.makam).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: "Rast",
        missingCuratedEntries: 1,
        deferredMissingEntries: 1,
      }),
    ]));
    expect(matrix.candidateDimensions.status).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: "conflict",
        conflictEntries: 1,
      }),
    ]));
    expect(JSON.stringify(matrix)).not.toMatch(/sourceId|sourceUrl|"accepted"/);
  });

  it("summarizes counts and reports duplicate accepted identities", () => {
    const bulkCandidates = [
      {catalogId: "a", status: "accepted", source: {id: "one", url: "https://example.test/a"}},
      {catalogId: "b", status: "accepted", source: {id: "two", url: "https://example.test/a"}},
      {catalogId: "c", status: "needs-review", source: {id: "review"}},
    ];
    const acceptedBulkCandidates = bulkCandidates.filter((candidate) => candidate.status === "accepted");
    const candidateReviewRows = [
      {candidateId: "b:ogm:search"},
      {candidateId: "b:ogm:search"},
    ];

    const report = buildDedupeReport({
      bulkCandidates,
      acceptedBulkCandidates,
      candidateReviewRows,
      generatedAt: "2026-06-01T00:00:00.000Z",
      getAcceptedIdentity: (source) => source.url,
    });

    expect(summarizeCounts(bulkCandidates, "status")).toEqual([
      {value: "accepted", count: 2},
      {value: "needs-review", count: 1},
    ]);
    expect(report.summary).toEqual(expect.objectContaining({
      bulkCandidateEntries: 3,
      acceptedBulkCandidateEntries: 2,
      candidateReviewDuplicateIdRows: 1,
      acceptedDuplicateUrlIdentityRows: 1,
      duplicateRows: 2,
      cleanedDuplicateRows: 2,
    }));
    expect(report.duplicateGroups.acceptedUrlIdentities).toEqual([
      expect.objectContaining({
        key: "https://example.test/a",
        count: 2,
        duplicateCount: 1,
      }),
    ]);
  });
});

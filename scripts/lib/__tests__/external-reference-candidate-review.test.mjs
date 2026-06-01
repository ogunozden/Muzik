import {describe, expect, it} from "vitest";
import {
  buildCandidateReviewBatchPlan,
  buildCandidateReviewGroupDecisionRecommendations,
  buildCandidateReviewGroups,
  buildCandidateReviewRows,
} from "../external-reference-candidate-review.mjs";

describe("external-reference-candidate-review", () => {
  it("builds review-only provider candidates and safe group recommendations", () => {
    const backlogRows = [
      {
        catalogId: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
        missingCuratedReference: true,
        hasPdf: true,
        hasMusicXml: true,
        hasTxt: true,
        makam: "Ussak",
        form: "Ilahi",
        usul: "Duyek",
        title: "Allah Emrin",
        composer: "Zekai Dede",
        priorityGroup: "pdf-and-musicxml",
        deferredFromNextBatch: false,
      },
      {
        catalogId: "muhayyer--ilahi--sofyan--duseli_bu_askin--dede_efendi",
        missingCuratedReference: true,
        hasPdf: true,
        hasMusicXml: true,
        hasTxt: true,
        makam: "Muhayyer",
        form: "Ilahi",
        usul: "Sofyan",
        title: "Duseli Bu Askin",
        composer: "Dede Efendi",
        priorityGroup: "pdf-and-musicxml",
        deferredFromNextBatch: true,
        curationDecisionStatus: "source-mismatch",
        curationDecisionReason: "visible source usul conflicts with catalog",
      },
    ];
    const profiles = [
      {
        id: "ogm-materyal",
        label: "OGM Materyal",
        provider: "score",
        trustWeight: 0.74,
        metadataStrategy: "html",
        searchUrlTemplate: "https://example.test/search?q={query}",
      },
      {
        id: "youtube",
        label: "YouTube",
        provider: "youtube",
        trustWeight: 0.55,
        metadataStrategy: "oembed",
        searchUrlTemplate: "https://youtube.test/results?search_query={query}",
      },
    ];

    const candidates = buildCandidateReviewRows(backlogRows, profiles);
    const groups = buildCandidateReviewGroups(candidates);
    const recommendations = buildCandidateReviewGroupDecisionRecommendations(groups, "2026-06-01");
    const batchPlan = buildCandidateReviewBatchPlan(groups, candidates, {
      generatedAt: "2026-06-01T00:00:00.000Z",
      packetSize: 1,
      reviewedAt: "2026-06-01",
    });

    expect(candidates).toHaveLength(4);
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogId: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
        status: "needs-review",
        profileId: "ogm-materyal",
        metadataStrategy: "html",
        queryFields: expect.arrayContaining(["makam", "form", "usul", "title", "composer"]),
        scoreReasons: expect.arrayContaining(["metadata-strategy:html", "catalog-field:usul"]),
      }),
      expect.objectContaining({
        catalogId: "muhayyer--ilahi--sofyan--duseli_bu_askin--dede_efendi",
        status: "conflict",
        statusReason: "visible source usul conflicts with catalog",
      }),
    ]));
    expect(candidates.some((candidate) => "sourceId" in candidate || "sourceUrl" in candidate)).toBe(false);
    expect(groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogId: "muhayyer--ilahi--sofyan--duseli_bu_askin--dede_efendi",
        status: "conflict",
        reviewAction: "resolve-conflict-before-import",
        profileCount: 2,
      }),
    ]));
    expect(recommendations).toEqual([
      expect.objectContaining({
        catalogId: "muhayyer--ilahi--sofyan--duseli_bu_askin--dede_efendi",
        status: "conflict",
        reviewedBy: "batch-policy",
        recommendationRule: "generated-conflict-review-group",
      }),
    ]);
    expect(batchPlan).toEqual(expect.objectContaining({
      type: "candidate-review-batch-plan",
      summary: expect.objectContaining({
        activeGroupCount: 1,
        packetCount: 1,
        plannedGroupCount: 1,
        plannedCandidateCount: 2,
      }),
      packets: [
        expect.objectContaining({
          packetId: "candidate-review-packet-0001",
          groupCount: 1,
          candidateCount: 2,
          catalogIds: ["ussak--ilahi--duyek--allah_emrin--zekai_dede"],
          decisionTemplate: expect.objectContaining({
            decisions: [
              expect.objectContaining({
                catalogId: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
                status: "rejected",
                reason: "batch-reviewed-no-safe-source",
              }),
            ],
          }),
        }),
      ],
    }));
    expect(JSON.stringify(batchPlan)).not.toContain("sourceUrl");
  });
});

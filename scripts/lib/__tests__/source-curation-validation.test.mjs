import {describe, expect, it} from "vitest";
import {validateSourceCurationRegistries} from "../source-curation-validation.mjs";

const catalog = [{id: "hicazkar--pesrev--duyek--test--besteci"}];

function validRegistries() {
  return {
    catalog,
    autoAttached: {
      version: 1,
      matcherVersion: "test",
      references: [
        {
          catalogId: catalog[0].id,
          sourceId: "youtube-test",
          profileId: "youtube",
          status: "auto-attached",
          rank: 1,
          confidenceScore: 0.94,
          confidenceLevel: "high",
          matchReasons: ["title:exact", "makam:exact"],
          conflicts: [],
          attachedAt: "2026-05-10",
          matcherVersion: "test",
        },
      ],
    },
    feedback: {
      version: 1,
      events: [
        {
          eventId: "event-one",
          catalogId: catalog[0].id,
          sourceId: "youtube-test",
          eventType: "user-approved",
          createdAt: "2026-05-10T12:00:00Z",
          createdBy: "local-user",
        },
      ],
    },
    manualCorrections: {
      version: 1,
      corrections: [
        {
          catalogId: catalog[0].id,
          sourceId: "youtube-test",
          correctTitle: "Test Peşrev",
          alternativeUrl: "https://example.com/test",
          tags: ["kontrol-edildi"],
          updatedAt: "2026-05-10",
        },
      ],
    },
    researchProfiles: {
      version: 1,
      profiles: [
        {
          id: "youtube",
          label: "YouTube",
          baseUrl: "https://www.youtube.com",
          searchUrlTemplate: "https://www.youtube.com/results?search_query={query}",
          provider: "youtube",
          trustWeight: 0.65,
          embedCapability: "youtube",
          metadataStrategy: "oembed",
          enabled: true,
        },
      ],
    },
    embedStates: {
      version: 1,
      states: [
        {
          sourceId: "youtube-test",
          embedType: "youtube",
          canEmbed: true,
          lastCheckedAt: "2026-05-10",
          fallbackUrl: "https://www.youtube.com/watch?v=test",
        },
      ],
    },
    qualityStats: {
      version: 1,
      generatedAt: null,
      stats: [
        {
          profileId: "youtube",
          acceptedCount: 1,
          removedCount: 0,
          deletedCount: 0,
          correctedCount: 0,
          mismatchCount: 0,
          embedSuccessCount: 1,
          embedFailureCount: 0,
        },
      ],
    },
    candidateReviewQueue: [
      {
        candidateId: `${catalog[0].id}:youtube:search`,
        catalogId: catalog[0].id,
        status: "needs-review",
        statusReason: "Review-only search candidate.",
        profileId: "youtube",
        profileLabel: "YouTube",
        provider: "youtube",
        trustWeight: 0.65,
        reviewConfidenceScore: 64,
        reviewConfidenceLevel: "low",
        searchQuery: "Test Peşrev YouTube",
        searchUrl: "https://www.youtube.com/results?search_query=Test%20Pe%C5%9Frev",
        makam: "Hicazkar",
        form: "Peşrev",
        usul: "Düyek",
        title: "Test Peşrev",
        composer: "Besteci",
        priorityGroup: "pdf-and-musicxml",
        deferredFromNextBatch: false,
      },
    ],
    coverageSummary: {
      totalCatalogEntries: 2,
      curatedReferenceEntries: 1,
      missingCuratedEntries: 1,
      deferredMissingEntries: 0,
      nextBatchSize: 1,
      candidateReviewQueueEntries: 1,
      candidateReviewQueueByStatus: [{value: "needs-review", count: 1}],
      candidateReviewQueueByProfile: [{value: "youtube", count: 1}],
      batchReport: {
        version: 1,
        processedCatalogEntries: 2,
        curatedBeforeBulkCandidates: 1,
        newlyAcceptedCatalogEntries: 0,
        curatedAfterBatch: 1,
        missingAfterBatch: 1,
        deferredMissingEntries: 0,
        nextBatchSize: 1,
        generatedReviewCandidates: 1,
        candidateReviewStatusCounts: [{value: "needs-review", count: 1}],
        validationGates: ["catalog-id", "candidate-review-only", "summary-count-drift"],
      },
    },
  };
}

describe("source curation validation", () => {
  it("accepts valid curation registries", () => {
    expect(validateSourceCurationRegistries(validRegistries())).toEqual(
      expect.objectContaining({
        ok: true,
        errors: [],
        summary: expect.objectContaining({
          autoAttachedReferences: 1,
          feedbackEvents: 1,
          researchSourceProfiles: 1,
          candidateReviewQueueEntries: 1,
        }),
      }),
    );
  });

  it("rejects unknown catalog ids, weak URLs and invalid profile weights", () => {
    const registries = validRegistries();
    registries.autoAttached.references[0].catalogId = "missing";
    registries.autoAttached.references[0].profileId = "unknown-site";
    registries.manualCorrections.corrections[0].alternativeUrl = "http://example.com/test";
    registries.researchProfiles.profiles[0].trustWeight = 2;

    const result = validateSourceCurationRegistries(registries);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "auto-attached-references: unknown catalogId missing",
        "auto-attached-references: youtube-test profileId unknown-site is not a research profile id",
        "manual-source-corrections: youtube-test alternativeUrl must be HTTPS",
        "research-source-profiles: youtube trustWeight must be between 0 and 1",
      ]),
    );
  });

  it("rejects feedback, corrections and embed states that are not tied to an auto-attached source", () => {
    const registries = validRegistries();
    registries.feedback.events[0].sourceId = "missing-source";
    registries.manualCorrections.corrections[0].sourceId = "missing-source";
    registries.embedStates.states[0].sourceId = "missing-source";

    const result = validateSourceCurationRegistries(registries);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "source-feedback-events: event-one does not reference an auto-attached source",
        "manual-source-corrections: missing-source does not reference an auto-attached source",
        "embed-states: missing-source does not reference an auto-attached source",
      ]),
    );
  });

  it("keeps source quality stats aligned with research source profiles", () => {
    const registries = validRegistries();
    registries.researchProfiles.profiles.push({
      id: "ogm-materyal",
      label: "OGM Materyal",
      baseUrl: "https://ogmmateryal.eba.gov.tr",
      searchUrlTemplate: "https://duckduckgo.com/?q=site%3Aogmmateryal.eba.gov.tr+{query}",
      provider: "score",
      trustWeight: 0.75,
      embedCapability: "iframe",
      metadataStrategy: "html-title",
      enabled: true,
    });

    registries.qualityStats.generatedAt = "2026-05-31T22:01:59.450Z";
    registries.qualityStats.stats[0].profileId = "unknown-site";
    expect(validateSourceCurationRegistries(registries).errors).toEqual(
      expect.arrayContaining([
        "source-quality-stats: unknown-site is not a research profile id",
        "source-quality-stats: missing stat row for research profile ogm-materyal",
      ]),
    );

    registries.qualityStats.stats[0].profileId = "external";
    expect(validateSourceCurationRegistries(registries).errors).toContain(
      "source-quality-stats: missing stat row for research profile ogm-materyal",
    );
  });

  it("rejects auto-attached profile ids that disagree with source metadata", () => {
    const registries = validRegistries();
    registries.autoAttached.references[0].profileId = "external";

    const result = validateSourceCurationRegistries({
      ...registries,
      sources: [
        {
          id: "youtube-test",
          url: "https://www.youtube.com/watch?v=test",
        },
      ],
    });

    expect(result.errors).toContain(
      "auto-attached-references: youtube-test profileId external does not match source profile youtube",
    );
  });

  it("rejects candidate review queue rows that drift into unsafe accepted data", () => {
    const registries = validRegistries();
    const candidate = registries.candidateReviewQueue[0];
    candidate.status = "accepted";
    candidate.sourceId = "youtube-test";
    candidate.reviewConfidenceScore = 101;
    registries.coverageSummary.candidateReviewQueueEntries = 2;

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        `candidate-review-queue: ${candidate.candidateId} invalid status accepted`,
        `candidate-review-queue: ${candidate.candidateId} must not carry accepted source ids or source URLs`,
        `candidate-review-queue: ${candidate.candidateId} reviewConfidenceScore must be between 0 and 100`,
        "coverage-summary: candidateReviewQueueEntries 2 does not match candidate review queue rows 1",
      ]),
    );
  });

  it("rejects batch report drift from coverage and review queue counts", () => {
    const registries = validRegistries();
    registries.coverageSummary.batchReport.generatedReviewCandidates = 2;
    registries.coverageSummary.batchReport.candidateReviewStatusCounts = [{value: "accepted", count: 1}];
    registries.coverageSummary.batchReport.validationGates = [];

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "coverage-summary: batchReport.generatedReviewCandidates must match candidate review queue rows",
        "coverage-summary: batchReport.generatedReviewCandidates must equal missingAfterBatch times enabled profile count",
        "coverage-summary: batchReport candidateReviewStatusCounts must contain only review-only rows",
        "coverage-summary: batchReport.validationGates must list validation gates",
      ]),
    );
  });
});

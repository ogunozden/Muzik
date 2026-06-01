import {describe, expect, it} from "vitest";
import {getCandidateReviewGroupFingerprint} from "../../../src/data/references/candidate-review-group-fingerprint.mjs";
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
        metadataStrategy: "oembed",
        reviewConfidenceScore: 64,
        reviewConfidenceLevel: "low",
        scoreReasons: ["profile-trust:0.65", "metadata-strategy:oembed", "catalog-field:usul", "catalog-field:title", "catalog-field:composer"],
        queryFields: ["makam", "form", "usul", "title", "composer"],
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
    candidateReviewGroups: [
      {
        groupId: `${catalog[0].id}:review-group`,
        catalogId: catalog[0].id,
        status: "needs-review",
        reviewAction: "review-provider-candidates",
        candidateCount: 1,
        profileCount: 1,
        profiles: ["youtube"],
        providers: ["youtube"],
        confidenceLevels: ["low"],
        highestReviewConfidenceScore: 64,
        deferredFromNextBatch: false,
        makam: "Hicazkar",
        form: "Peşrev",
        usul: "Düyek",
        title: "Test Peşrev",
        composer: "Besteci",
        priorityGroup: "pdf-and-musicxml",
      },
    ],
    candidateReviewGroupDecisions: {
      version: 1,
      decisions: [],
    },
    candidateReviewGroupDecisionRecommendations: {
      version: 1,
      type: "candidate-review-group-decision-recommendations",
      policyVersion: "candidate-review-group-decision-recommendations-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
      summary: {
        totalGroups: 1,
        recommendedDecisionCount: 0,
      },
      decisions: [],
    },
    candidateReviewBatchPlan: {
      version: 1,
      type: "candidate-review-batch-plan",
      policyVersion: "candidate-review-batch-plan-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
      summary: {
        totalGroups: 1,
        candidateReviewQueueEntries: 1,
        activeGroupCount: 1,
        conflictGroupCount: 0,
        deferredGroupCount: 0,
        rejectedGroupCount: 0,
        packetSize: 25,
        packetCount: 1,
        plannedGroupCount: 1,
        plannedCandidateCount: 1,
        safetyPolicy: "Review packets do not create accepted references and do not carry source URLs; they only group review candidates for operator batch decisions.",
      },
      packets: [
        {
          packetId: "candidate-review-packet-0001",
          sequence: 1,
          status: "needs-review",
          reviewAction: "batch-review-provider-candidates",
          groupCount: 1,
          candidateCount: 1,
          profileCount: 1,
          highestReviewConfidenceScore: 64,
          profiles: ["youtube"],
          providers: ["youtube"],
          confidenceLevels: [{value: "low", count: 1}],
          priorityGroups: [{value: "pdf-and-musicxml", count: 1}],
          makamCounts: [{value: "Hicazkar", count: 1}],
          formCounts: [{value: "Peşrev", count: 1}],
          catalogIds: [catalog[0].id],
          decisionTemplate: {
            version: 1,
            type: "candidate-review-group-decision-template",
            policy: "Packet decisions may reject, defer, or mark conflict review groups; accepted sources must be imported through validated bulk candidate manifests.",
            decisions: [
              {
                groupId: `${catalog[0].id}:review-group`,
                catalogId: catalog[0].id,
                sourceGroupFingerprint: getCandidateReviewGroupFingerprint({
                  groupId: `${catalog[0].id}:review-group`,
                  catalogId: catalog[0].id,
                  status: "needs-review",
                  reviewAction: "review-provider-candidates",
                  candidateCount: 1,
                  profileCount: 1,
                  profiles: ["youtube"],
                  providers: ["youtube"],
                  confidenceLevels: ["low"],
                  highestReviewConfidenceScore: 64,
                  deferredFromNextBatch: false,
                  makam: "Hicazkar",
                  form: "Peşrev",
                  usul: "Düyek",
                  title: "Test Peşrev",
                  composer: "Besteci",
                  priorityGroup: "pdf-and-musicxml",
                }),
                status: "rejected",
                reason: "batch-reviewed-no-safe-source",
                reviewedAt: "2026-06-01",
                reviewedBy: "local-operator",
              },
            ],
          },
        },
      ],
    },
    sourceIntakeTemplate: {
      version: 1,
      type: "candidate-review-source-intake-template",
      policyVersion: "candidate-review-source-intake-template-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
      summary: {
        totalGroups: 1,
        candidateReviewQueueEntries: 1,
        activeGroupCount: 1,
        packetSize: 25,
        packetCount: 1,
        templateRowCount: 1,
        plannedCandidateCount: 1,
        safetyPolicy: "Source intake templates are blank operator worklists. They do not create accepted references; filled sources must be imported through the validated bulk candidate pipeline.",
      },
      importContract: {
        targetManifestType: "external-reference-bulk-candidates",
        targetScript: "npm run import:external-references -- --input <json>",
        acceptedOnlyAfterValidation: true,
        requiredValidation: [
          "catalog-id",
          "https-url-policy",
          "research-profile-match",
          "accepted-identity-dedupe",
          "checked-at-date",
          "metadata-evidence-normalization",
        ],
      },
      packets: [
        {
          packetId: "source-intake-packet-0001",
          sequence: 1,
          status: "needs-source-url",
          groupCount: 1,
          candidateCount: 1,
          catalogIds: [catalog[0].id],
          rows: [
            {
              groupId: `${catalog[0].id}:review-group`,
              catalogId: catalog[0].id,
              sourceGroupFingerprint: getCandidateReviewGroupFingerprint({
                groupId: `${catalog[0].id}:review-group`,
                catalogId: catalog[0].id,
                status: "needs-review",
                reviewAction: "review-provider-candidates",
                candidateCount: 1,
                profileCount: 1,
                profiles: ["youtube"],
                providers: ["youtube"],
                confidenceLevels: ["low"],
                highestReviewConfidenceScore: 64,
                deferredFromNextBatch: false,
                makam: "Hicazkar",
                form: "Peşrev",
                usul: "Düyek",
                title: "Test Peşrev",
                composer: "Besteci",
                priorityGroup: "pdf-and-musicxml",
              }),
              status: "needs-source-url",
              requiredAction: "fill-empty-source-fields-then-import-through-validated-bulk-candidate-manifest",
              checkedAt: "2026-06-01",
              catalog: {
                makam: "Hicazkar",
                form: "Peşrev",
                usul: "Düyek",
                title: "Test Peşrev",
                composer: "Besteci",
                priorityGroup: "pdf-and-musicxml",
              },
              sourceFields: {
                sourceId: "",
                provider: "",
                label: "",
                title: "",
                httpsUrl: "",
                verification: "",
                evidenceTitle: "",
                evidenceMakam: "",
                evidenceForm: "",
                evidenceUsul: "",
                evidenceComposer: "",
                evidenceSourceProvider: "",
                htmlTitle: "",
                htmlDescription: "",
                htmlAuthor: "",
                oembedTitle: "",
                oembedAuthor: "",
                oembedProvider: "",
                schemaName: "",
                schemaComposer: "",
                schemaLyricist: "",
                schemaLyrics: "",
                schemaByArtist: "",
                metadataSignals: "",
              },
              candidates: [
                {
                  candidateId: `${catalog[0].id}:youtube:search`,
                  profileId: "youtube",
                  profileLabel: "YouTube",
                  provider: "youtube",
                  reviewConfidenceScore: 64,
                  reviewConfidenceLevel: "low",
                  searchQuery: "Test Peşrev YouTube",
                  searchUrl: "https://www.youtube.com/results?search_query=Test%20Pe%C5%9Frev",
                },
              ],
            },
          ],
        },
      ],
    },
    coverageMatrix: {
      version: 1,
      type: "external-reference-coverage-matrix",
      policyVersion: "external-reference-coverage-matrix-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
      summary: {
        totalCatalogEntries: 2,
        curatedReferenceEntries: 1,
        missingCuratedEntries: 1,
        candidateReviewQueueEntries: 1,
        candidateReviewGroupEntries: 1,
        researchSourceProfileEntries: 1,
      },
      catalogDimensions: {
        makam: [{value: "Hicazkar", totalCatalogEntries: 2, curatedReferenceEntries: 1, missingCuratedEntries: 1, activeMissingEntries: 1, deferredMissingEntries: 0}],
        form: [{value: "Peşrev", totalCatalogEntries: 2, curatedReferenceEntries: 1, missingCuratedEntries: 1, activeMissingEntries: 1, deferredMissingEntries: 0}],
        usul: [{value: "Düyek", totalCatalogEntries: 2, curatedReferenceEntries: 1, missingCuratedEntries: 1, activeMissingEntries: 1, deferredMissingEntries: 0}],
        priorityGroup: [{value: "pdf-and-musicxml", totalCatalogEntries: 2, curatedReferenceEntries: 1, missingCuratedEntries: 1, activeMissingEntries: 1, deferredMissingEntries: 0}],
      },
      candidateDimensions: {
        profileId: [{value: "youtube", candidateReviewQueueEntries: 1, affectedCatalogEntries: 1, needsReviewEntries: 1, conflictEntries: 0}],
        provider: [{value: "youtube", candidateReviewQueueEntries: 1, affectedCatalogEntries: 1, needsReviewEntries: 1, conflictEntries: 0}],
        status: [{value: "needs-review", candidateReviewQueueEntries: 1, affectedCatalogEntries: 1, needsReviewEntries: 1, conflictEntries: 0}],
        confidenceLevel: [{value: "low", candidateReviewQueueEntries: 1, affectedCatalogEntries: 1, needsReviewEntries: 1, conflictEntries: 0}],
      },
    },
    dedupeReport: {
      version: 1,
      type: "external-reference-dedupe-report",
      policyVersion: "external-reference-dedupe-report-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
      summary: {
        bulkCandidateEntries: 0,
        acceptedBulkCandidateEntries: 0,
        candidateReviewQueueEntries: 1,
        acceptedDuplicateSourceIdRows: 0,
        acceptedDuplicateUrlIdentityRows: 0,
        candidateReviewDuplicateIdRows: 0,
        duplicateRows: 0,
        cleanedDuplicateRows: 0,
      },
      duplicateGroups: {
        acceptedSourceIds: [],
        acceptedUrlIdentities: [],
        candidateReviewIds: [],
      },
    },
    coverageSummary: {
      totalCatalogEntries: 2,
      curatedReferenceEntries: 1,
      missingCuratedEntries: 1,
      deferredMissingEntries: 0,
      nextBatchSize: 1,
      candidateReviewQueueEntries: 1,
      candidateReviewGroupEntries: 1,
      candidateReviewGroupDecisionEntries: 0,
      candidateReviewGroupDecisionRecommendationEntries: 0,
      candidateReviewBatchPlanEntries: 1,
      sourceIntakeTemplatePacketEntries: 1,
      sourceIntakeTemplateRowEntries: 1,
      candidateReviewQueueByStatus: [{value: "needs-review", count: 1}],
      candidateReviewQueueByProfile: [{value: "youtube", count: 1}],
      candidateReviewGroupsByStatus: [{value: "needs-review", count: 1}],
      batchReport: {
        version: 1,
        flow: [
          "ingest",
          "normalize",
          "dedupe",
          "provider-profile-classify",
          "candidate-generate",
          "confidence-score",
          "status-assign",
          "safe-auto-attach-accepted-only",
          "validate",
          "coverage-report",
        ],
        processedCatalogEntries: 2,
        curatedBeforeBulkCandidates: 1,
        newlyAcceptedCatalogEntries: 0,
        curatedAfterBatch: 1,
        missingAfterBatch: 1,
        deferredMissingEntries: 0,
        nextBatchSize: 1,
        generatedReviewCandidates: 1,
        generatedReviewGroups: 1,
        recommendedReviewGroupDecisions: 0,
        plannedReviewPackets: 1,
        plannedReviewGroups: 1,
        plannedSourceIntakePackets: 1,
        plannedSourceIntakeRows: 1,
        candidateReviewStatusCounts: [{value: "needs-review", count: 1}],
        duplicateAcceptedIdentityPolicy: "duplicate accepted URL identities fail validation before merge",
        autoAttachPolicy: "only accepted bulk candidates are counted as curated and eligible for auto-attach",
        validationGates: [
          "catalog-id",
          "https-url-policy",
          "accepted-identity-dedupe",
          "status-contract",
          "candidate-review-only",
          "profile-count-drift",
          "summary-count-drift",
          "metadata-strategy-profile-drift",
          "candidate-review-group-drift",
          "candidate-review-group-decision-drift",
          "candidate-review-group-decision-recommendation-drift",
          "candidate-review-batch-plan-drift",
          "source-intake-template-drift",
          "coverage-matrix-drift",
          "dedupe-report-drift",
        ],
        cleanedDuplicateRows: 0,
        duplicateRowsAfterDedupe: 0,
      },
      cleanedDuplicateRows: 0,
      duplicateRowsAfterDedupe: 0,
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
          candidateReviewGroupEntries: 1,
          candidateReviewGroupDecisionRecommendationEntries: 0,
          candidateReviewBatchPlanEntries: 1,
          sourceIntakeTemplatePacketEntries: 1,
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
    candidate.scoreReasons = [];
    candidate.metadataStrategy = "none";
    candidate.queryFields = ["title"];
    registries.coverageSummary.candidateReviewQueueEntries = 2;
    registries.coverageSummary.candidateReviewGroupEntries = 2;

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        `candidate-review-queue: ${candidate.candidateId} invalid status accepted`,
        `candidate-review-queue: ${candidate.candidateId} must not carry accepted source ids or source URLs`,
        `candidate-review-queue: ${candidate.candidateId} reviewConfidenceScore must be between 0 and 100`,
        `candidate-review-queue: ${candidate.candidateId} scoreReasons must list scoring evidence`,
        `candidate-review-queue: ${candidate.candidateId} metadataStrategy none does not match profile youtube`,
        `candidate-review-queue: ${candidate.candidateId} queryFields must include every available catalog query field`,
        "coverage-summary: candidateReviewQueueEntries 2 does not match candidate review queue rows 1",
        "coverage-summary: candidateReviewGroupEntries 2 does not match candidate review queue rows 1",
      ]),
    );
  });

  it("rejects candidate review groups that drift from queue rows", () => {
    const registries = validRegistries();
    const group = registries.candidateReviewGroups[0];
    group.status = "accepted";
    group.sourceId = "youtube-test";
    group.candidateCount = 2;
    group.profileCount = 2;
    group.profiles = ["divanmakam"];
    group.highestReviewConfidenceScore = 120;
    registries.coverageSummary.batchReport.generatedReviewGroups = 2;

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        `candidate-review-groups: ${group.groupId} invalid status accepted`,
        `candidate-review-groups: ${group.groupId} must not carry accepted source ids or source URLs`,
        `candidate-review-groups: ${group.groupId} candidateCount must match review queue rows`,
        `candidate-review-groups: ${group.groupId} profileCount must match unique review profiles`,
        `candidate-review-groups: ${group.groupId} profiles must match review queue profiles`,
        `candidate-review-groups: ${group.groupId} status must reflect review queue rows or group decision`,
        `candidate-review-groups: ${group.groupId} highestReviewConfidenceScore must be between 0 and 100`,
        "coverage-summary: batchReport.generatedReviewGroups must match candidate review group rows",
        "coverage-summary: batchReport.generatedReviewGroups must equal missingAfterBatch",
      ]),
    );
  });

  it("validates batch review group decisions without allowing accepted source data", () => {
    const registries = validRegistries();
    const sourceGroupFingerprint = getCandidateReviewGroupFingerprint(registries.candidateReviewGroups[0]);
    registries.candidateReviewGroupDecisions.decisions.push({
      groupId: `${catalog[0].id}:review-group`,
      catalogId: catalog[0].id,
      sourceGroupFingerprint,
      status: "rejected",
      reason: "batch-reviewed-no-safe-source",
      reviewedAt: "2026-06-01",
      reviewedBy: "local-operator",
    });
    registries.candidateReviewGroups[0].status = "rejected";
    registries.candidateReviewGroups[0].reviewAction = "batch-decision-rejected";
    registries.candidateReviewGroups[0].decisionReason = "batch-reviewed-no-safe-source";
    registries.candidateReviewGroups[0].decisionReviewedAt = "2026-06-01";
    registries.candidateReviewGroups[0].decisionReviewedBy = "local-operator";
    registries.coverageSummary.candidateReviewGroupDecisionEntries = 1;
    registries.coverageSummary.candidateReviewGroupsByStatus = [{value: "rejected", count: 1}];
    registries.candidateReviewBatchPlan.summary.activeGroupCount = 0;
    registries.candidateReviewBatchPlan.summary.packetCount = 0;
    registries.candidateReviewBatchPlan.summary.plannedGroupCount = 0;
    registries.candidateReviewBatchPlan.summary.plannedCandidateCount = 0;
    registries.candidateReviewBatchPlan.packets = [];
    registries.sourceIntakeTemplate.summary.activeGroupCount = 0;
    registries.sourceIntakeTemplate.summary.packetCount = 0;
    registries.sourceIntakeTemplate.summary.templateRowCount = 0;
    registries.sourceIntakeTemplate.summary.plannedCandidateCount = 0;
    registries.sourceIntakeTemplate.packets = [];
    registries.coverageSummary.candidateReviewBatchPlanEntries = 0;
    registries.coverageSummary.sourceIntakeTemplatePacketEntries = 0;
    registries.coverageSummary.sourceIntakeTemplateRowEntries = 0;
    registries.coverageSummary.batchReport.plannedReviewPackets = 0;
    registries.coverageSummary.batchReport.plannedReviewGroups = 0;
    registries.coverageSummary.batchReport.plannedSourceIntakePackets = 0;
    registries.coverageSummary.batchReport.plannedSourceIntakeRows = 0;

    expect(validateSourceCurationRegistries(registries).errors).toEqual([]);

    registries.candidateReviewGroupDecisions.decisions[0].status = "accepted";
    registries.candidateReviewGroupDecisions.decisions[0].sourceUrl = "https://example.com/unsafe";
    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(expect.arrayContaining([
      `candidate-review-group-decisions: ${catalog[0].id}:review-group invalid status accepted`,
      `candidate-review-group-decisions: ${catalog[0].id}:review-group cannot accept sources without a validated source URL`,
      `candidate-review-group-decisions: ${catalog[0].id}:review-group must not carry accepted source ids or source URLs`,
    ]));
  });

  it("validates batch review group decision recommendations without allowing accepted source data", () => {
    const registries = validRegistries();
    registries.candidateReviewGroups[0].status = "conflict";
    registries.candidateReviewGroups[0].reviewAction = "resolve-conflict-before-import";
    registries.candidateReviewQueue[0].status = "conflict";
    registries.candidateReviewQueue[0].statusReason = "source-mismatch";
    const sourceGroupFingerprint = getCandidateReviewGroupFingerprint(registries.candidateReviewGroups[0]);
    registries.candidateReviewGroupDecisionRecommendations.decisions.push({
      groupId: `${catalog[0].id}:review-group`,
      catalogId: catalog[0].id,
      sourceGroupFingerprint,
      status: "conflict",
      reason: "batch-recommend-source-mismatch-conflict",
      reviewedAt: "2026-06-01",
      reviewedBy: "batch-policy",
      recommendationRule: "generated-conflict-review-group",
      sourceGroupStatus: "conflict",
    });
    registries.coverageSummary.candidateReviewQueueByStatus = [{value: "conflict", count: 1}];
    registries.coverageSummary.candidateReviewGroupsByStatus = [{value: "conflict", count: 1}];
    registries.coverageSummary.candidateReviewGroupDecisionRecommendationEntries = 1;
    registries.coverageSummary.batchReport.candidateReviewStatusCounts = [{value: "conflict", count: 1}];
    registries.coverageSummary.batchReport.recommendedReviewGroupDecisions = 1;
    registries.candidateReviewBatchPlan.summary.activeGroupCount = 0;
    registries.candidateReviewBatchPlan.summary.packetCount = 0;
    registries.candidateReviewBatchPlan.summary.plannedGroupCount = 0;
    registries.candidateReviewBatchPlan.summary.plannedCandidateCount = 0;
    registries.candidateReviewBatchPlan.packets = [];
    registries.sourceIntakeTemplate.summary.activeGroupCount = 0;
    registries.sourceIntakeTemplate.summary.packetCount = 0;
    registries.sourceIntakeTemplate.summary.templateRowCount = 0;
    registries.sourceIntakeTemplate.summary.plannedCandidateCount = 0;
    registries.sourceIntakeTemplate.packets = [];
    registries.coverageSummary.candidateReviewBatchPlanEntries = 0;
    registries.coverageSummary.sourceIntakeTemplatePacketEntries = 0;
    registries.coverageSummary.sourceIntakeTemplateRowEntries = 0;
    registries.coverageSummary.batchReport.plannedReviewPackets = 0;
    registries.coverageSummary.batchReport.plannedReviewGroups = 0;
    registries.coverageSummary.batchReport.plannedSourceIntakePackets = 0;
    registries.coverageSummary.batchReport.plannedSourceIntakeRows = 0;

    expect(validateSourceCurationRegistries(registries).errors).toEqual([]);

    registries.candidateReviewGroupDecisionRecommendations.decisions[0].status = "accepted";
    registries.candidateReviewGroupDecisionRecommendations.decisions[0].sourceUrl = "https://example.com/unsafe";
    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(expect.arrayContaining([
      `candidate-review-group-decision-recommendations: ${catalog[0].id}:review-group invalid status accepted`,
      `candidate-review-group-decision-recommendations: ${catalog[0].id}:review-group cannot recommend accepted without a validated source URL`,
      `candidate-review-group-decision-recommendations: ${catalog[0].id}:review-group must not carry accepted source ids or source URLs`,
    ]));
  });

  it("allows review-only candidates to carry needs-context confidence without widening auto-attached confidence", () => {
    const registries = validRegistries();
    const candidate = registries.candidateReviewQueue[0];
    candidate.reviewConfidenceLevel = "needs-context";

    expect(validateSourceCurationRegistries(registries).errors).not.toContain(
      `candidate-review-queue: ${candidate.candidateId} has invalid reviewConfidenceLevel`,
    );

    registries.autoAttached.references[0].confidenceLevel = "needs-context";
    expect(validateSourceCurationRegistries(registries).errors).toContain(
      "auto-attached-references: youtube-test has invalid confidenceLevel",
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
        "coverage-summary: batchReport.validationGates must include catalog-id",
        "coverage-summary: batchReport.validationGates must include accepted-identity-dedupe",
      ]),
    );
  });

  it("rejects coverage matrix drift from summary and review queue counts", () => {
    const registries = validRegistries();
    registries.coverageMatrix.summary.missingCuratedEntries = 2;
    registries.coverageMatrix.catalogDimensions.makam[0].missingCuratedEntries = 2;
    registries.coverageMatrix.candidateDimensions.profileId[0].candidateReviewQueueEntries = 2;

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(expect.arrayContaining([
      "coverage-matrix: summary.missingCuratedEntries 2 does not match 1",
      "coverage-matrix: catalogDimensions.makam Hicazkar curated plus missing must equal total",
      "coverage-matrix: catalogDimensions.makam missingCuratedEntries drift",
      "coverage-matrix: candidateDimensions.profileId youtube needs-review plus conflict must equal candidates",
      "coverage-matrix: candidateDimensions.profileId candidateReviewQueueEntries drift",
    ]));
  });

  it("rejects batch reports that do not declare the full batch-first lifecycle and accepted-only policy", () => {
    const registries = validRegistries();
    registries.coverageSummary.batchReport.flow = ["ingest", "validate"];
    registries.coverageSummary.batchReport.autoAttachPolicy = "attach confident candidates";
    registries.coverageSummary.batchReport.duplicateAcceptedIdentityPolicy = "best effort";
    registries.coverageSummary.batchReport.validationGates = ["catalog-id", "candidate-review-only"];

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "coverage-summary: batchReport.flow must include normalize",
        "coverage-summary: batchReport.flow must include safe-auto-attach-accepted-only",
        "coverage-summary: batchReport.validationGates must include accepted-identity-dedupe",
        "coverage-summary: batchReport.validationGates must include metadata-strategy-profile-drift",
        "coverage-summary: batchReport.validationGates must include coverage-matrix-drift",
        "coverage-summary: batchReport.validationGates must include dedupe-report-drift",
        "coverage-summary: batchReport.autoAttachPolicy must document accepted-only auto-attach",
        "coverage-summary: batchReport.duplicateAcceptedIdentityPolicy must document duplicate accepted URL protection",
      ]),
    );
  });

  it("rejects source intake templates that prefill metadata evidence fields", () => {
    const registries = validRegistries();
    const row = registries.sourceIntakeTemplate.packets[0].rows[0];
    row.sourceFields.schemaName = "Prefilled title";
    row.sourceFields.oembedTitle = "Prefilled oEmbed title";

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(expect.arrayContaining([
      `source-intake-template: source-intake-packet-0001 ${catalog[0].id} sourceFields.schemaName must be blank`,
      `source-intake-template: source-intake-packet-0001 ${catalog[0].id} sourceFields.oembedTitle must be blank`,
    ]));
  });

  it("rejects dedupe report drift from generated queues and summary", () => {
    const registries = validRegistries();
    registries.dedupeReport.summary.candidateReviewQueueEntries = 2;
    registries.dedupeReport.summary.duplicateRows = 1;
    registries.coverageSummary.batchReport.duplicateRowsAfterDedupe = 1;

    const result = validateSourceCurationRegistries(registries);

    expect(result.errors).toEqual(expect.arrayContaining([
      "dedupe-report: summary.candidateReviewQueueEntries 2 does not match 1",
      "dedupe-report: summary.duplicateRows 1 does not match 0",
      "dedupe-report: duplicateRows must be 0 before auto-attach",
    ]));
  });
});

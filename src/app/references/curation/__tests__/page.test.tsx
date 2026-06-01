import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ReferencesCurationDashboard} from "@/features/references/ReferencesCurationDashboard";

vi.mock("@/components/layout/UnifiedLayout", () => ({
  UnifiedLayout: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

const catalogId = "ussak--ilahi--duyek--dostun_senden--ali_rifat_cagatay";
const stateFixture = {
  coverage: {
    totalCatalogEntries: 3000,
    curatedReferenceEntries: 22,
    missingCuratedEntries: 2978,
    candidateReviewQueueEntries: 14890,
    candidateReviewQueueJson: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json",
    candidateReviewGroupDecisionRecommendationEntries: 1,
    candidateReviewGroupDecisionRecommendationsJson: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
    candidateReviewBatchPlanEntries: 119,
    candidateReviewBatchPlanJson: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-batch-plan.json",
    sourceIntakeTemplatePacketEntries: 119,
    sourceIntakeTemplateRowEntries: 2973,
    sourceIntakeTemplateJson: "output/external-reference-coverage/symbtr-curated-reference-source-intake-template.json",
    coverageMatrixEntries: 24,
    coverageMatrixJson: "output/external-reference-coverage/symbtr-curated-reference-coverage-matrix.json",
    dedupeReportEntries: 0,
    dedupeReportJson: "output/external-reference-coverage/symbtr-curated-reference-dedupe-report.json",
    cleanedDuplicateRows: 0,
    duplicateRowsAfterDedupe: 0,
    batchReport: {
      processedCatalogEntries: 3000,
      curatedBeforeBulkCandidates: 15,
      newlyAcceptedCatalogEntries: 7,
      missingAfterBatch: 2978,
      deferredMissingEntries: 5,
      generatedReviewCandidates: 14890,
      recommendedReviewGroupDecisions: 1,
      plannedReviewPackets: 119,
      plannedReviewGroups: 2973,
      plannedSourceIntakePackets: 119,
      plannedSourceIntakeRows: 2973,
      validationGates: ["candidate-review-group-decision-recommendation-drift", "candidate-review-batch-plan-drift", "source-intake-template-drift", "dedupe-report-drift"],
    },
  },
  curation: {
    summary: {
      autoAttachedCount: 1,
      removedCount: 0,
      conflictCount: 0,
      feedbackEventCount: 0,
      manualCorrectionCount: 0,
      researchSourceProfileCount: 5,
      matcherVersion: "external-source-map-v1",
      statsGeneratedAt: "2026-05-10T12:00:00.000Z",
    },
    autoAttachedReferences: [
      {
        catalogId,
        sourceId: "divanmakam-example",
        profileId: "divanmakam",
        catalog: {
          id: catalogId,
          makam: "Ussak",
          form: "İlahi",
          usul: "Duyek",
          title: "Dostun Senden",
          composer: "Ali Rifat Cagatay",
          formats: ["txt", "mid", "xml", "mu2", "pdf"],
        },
        source: {
          title: "divanmakam-example",
          provider: "score",
          url: "https://divanmakam.com/forum/example.1/",
        },
        status: "auto-attached",
        confidenceScore: 0.82,
        confidenceLevel: "high",
        matchReasons: ["title:token-match"],
        conflicts: [],
      },
    ],
    candidateManifest: {
      artifactPath: "src/data/references/external-reference-bulk-candidates.json",
      candidateCount: 2,
      acceptedCount: 1,
      needsReviewCount: 1,
      rejectedCount: 0,
      conflictCount: 0,
    },
    candidateReviewGroups: [
      {
        groupId: `${catalogId}:review-group`,
        catalogId,
        status: "needs-review",
        reviewAction: "review-provider-candidates",
        candidateCount: 1,
        profileCount: 1,
        profiles: ["divanmakam"],
        providers: ["score"],
        confidenceLevels: ["medium"],
        highestReviewConfidenceScore: 85,
        makam: "Ussak",
        form: "İlahi",
        usul: "Duyek",
        title: "Dostun Senden",
        composer: "Ali Rifat Cagatay",
        priorityGroup: "pdf-and-musicxml",
      },
    ],
    candidateReviewGroupManifest: {
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json",
      groupCount: 2978,
      visibleGroupCount: 1,
    },
    candidateReviewGroupDecisionManifest: {
      artifactPath: "src/data/references/candidate-review-group-decisions.json",
      decisionCount: 0,
    },
    candidateReviewGroupDecisionRecommendationManifest: {
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
      decisionCount: 1,
      policyVersion: "candidate-review-group-decision-recommendations-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
      summary: {recommendedDecisionCount: 1},
    },
    candidateReviewBatchPlanManifest: {
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-batch-plan.json",
      packetCount: 119,
      plannedGroupCount: 2973,
      plannedCandidateCount: 14865,
      packetSize: 25,
      policyVersion: "candidate-review-batch-plan-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
    },
    sourceIntakeTemplateManifest: {
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-source-intake-template.json",
      packetCount: 119,
      templateRowCount: 2973,
      plannedCandidateCount: 14865,
      packetSize: 25,
      policyVersion: "candidate-review-source-intake-template-v1",
      generatedAt: "2026-06-01T00:00:00.000Z",
      targetScript: "npm run import:external-references -- --input <json>",
    },
    sourceIntakeAcceptedImportDryRunManifest: {
      artifactPath: "output/external-reference-coverage/source-intake-accepted-import-dry-run.json",
      input: "src/data/references/external-reference-bulk-candidates.json",
      generatedAt: "2026-06-01T00:00:00.000Z",
      dryRun: true,
      acceptedCandidateCount: 7,
      httpsAcceptedCount: 7,
      evidenceCompleteCount: 7,
      dryRunAddedCandidateCount: 0,
      dryRunSkippedDuplicateCount: 7,
      dryRunOutputCandidateCount: 7,
      validationGateCount: 6,
      validationErrorCount: 0,
      targetScript: "npm run verify:external-source-intake",
    },
    symbtrLayoutVerificationManifest: {
      summaryPath: "output/symbtr-layout-review/layout-verification-summary.json",
      candidateEntries: 1,
      verificationEntries: 0,
      verifiedEntries: 0,
      verifiedMeasureBoxes: 0,
      unresolvedCandidateEntries: 1,
      candidateStatus: "unreviewed-candidates-only",
      promotionPolicy: "Only human-reviewed or visual-regression-approved PDF measure boxes may be promoted from pdf-vector-candidate to verified.",
      fingerprintAlgorithm: "sha256:symbtr-layout-candidate-geometry-v1",
      reviewTemplatePath: "output/symbtr-layout-review/layout-verification-review-template.json",
      reviewTemplateEntryCount: 1,
      reviewTemplateCandidateRows: 49,
      reviewBatchPlanPath: "output/symbtr-layout-review/layout-verification-review-batch-plan.json",
      reviewBatchPacketCount: 10,
      reviewBatchCandidateRows: 49,
      emptyImportDryRunPath: "output/symbtr-layout-review/layout-verification-empty-import-dry-run.json",
      emptyImportTemplatePath: "output/symbtr-layout-review/layout-verification-empty-import-template.json",
      emptyImportDryRunInputEntries: 0,
      emptyImportDryRunVerifiedMeasureBoxes: 0,
      targetScript: "npm run import:symbtr-measure-verification -- --input <json>",
      emptyImportDryRunScript: "npm run verify:symbtr-layout-review-import",
      validationErrorCount: 0,
    },
    candidateReviewGroupPage: {
      offset: 0,
      limit: 1,
      returnedCount: 1,
      filteredTotal: 2978,
      totalRows: 2978,
      previousOffset: null,
      nextOffset: 1,
    },
    candidateReviewGroupFacets: {
      statuses: [{value: "needs-review", count: 2977}, {value: "conflict", count: 1}],
      composers: [{value: "Ali Rifat Cagatay", count: 1}],
      priorityGroups: [{value: "pdf-and-musicxml", count: 2978}],
    },
    candidateReviewQueue: [
      {
        candidateId: `${catalogId}:divanmakam:search`,
        catalogId,
        status: "needs-review",
        statusReason: "provider-profile-search-candidate",
        profileId: "divanmakam",
        profileLabel: "DîvânMakam",
        provider: "score",
        reviewConfidenceScore: 85,
        reviewConfidenceLevel: "medium",
        scoreReasons: ["profile-trust:0.85", "catalog-field:usul"],
        queryFields: ["makam", "form", "usul", "title", "composer"],
        searchQuery: "Ussak İlahi Dostun Senden Ali Rifat Cagatay nota",
        searchUrl: "https://duckduckgo.com/?q=Dostun",
        makam: "Ussak",
        form: "İlahi",
        usul: "Duyek",
        title: "Dostun Senden",
        composer: "Ali Rifat Cagatay",
      },
    ],
    candidateReviewPage: {
      offset: 0,
      limit: 1,
      returnedCount: 1,
      filteredTotal: 2,
      totalRows: 14890,
      previousOffset: null,
      nextOffset: 1,
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json",
    },
    candidateReviewFacets: {
      statuses: [{value: "needs-review", count: 11908}, {value: "conflict", count: 4}],
      profileIds: [{value: "divanmakam", count: 2978}, {value: "youtube", count: 2978}, {value: "internet-archive", count: 2978}],
      providers: [{value: "score", count: 8934}, {value: "youtube", count: 2978}, {value: "archive", count: 2978}],
      confidenceLevels: [{value: "medium", count: 2978}],
      composers: [{value: "Ali Rifat Cagatay", count: 2978}],
    },
    backlogNextBatch: [
      {
        catalogId,
        makam: "Ussak",
        form: "İlahi",
        usul: "Duyek",
        title: "Dostun Senden",
        composer: "Ali Rifat Cagatay",
        availableFormats: "txt|mid|xml|mu2|pdf",
        priorityGroup: "pdf-and-musicxml",
        curationPriorityScore: -72,
        scoreSearchUrl: "https://duckduckgo.com/?q=Dostun+Senden+nota",
        scoreSourceHintUrls: "https://duckduckgo.com/?q=Dostun+Senden+site%3Aneyzen.com+nota",
        recordingSearchUrl: "https://www.youtube.com/results?search_query=Dostun+Senden",
      },
    ],
    backlogPage: {
      scope: "missing",
      offset: 0,
      limit: 1,
      returnedCount: 1,
      filteredTotal: 2,
      totalRows: 3,
      totalMissing: 2,
      activeQueueCount: 2,
      deferredCount: 0,
      previousOffset: null,
      nextOffset: 1,
    },
    backlogFacets: {
      makams: [{value: "Ussak", count: 1}],
      forms: [{value: "İlahi", count: 1}],
      usuls: [{value: "Duyek", count: 1}],
      composers: [{value: "Ali Rifat Cagatay", count: 1}],
      priorityGroups: [{value: "pdf-and-musicxml", count: 1}],
    },
    feedbackEvents: [],
    sourceQualityStats: [
      {
        profileId: "divanmakam",
        acceptedCount: 1,
        removedCount: 0,
        deletedCount: 0,
        correctedCount: 0,
        mismatchCount: 0,
        embedSuccessCount: 0,
        embedFailureCount: 0,
      },
    ],
  },
};

function mockFetch() {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      const result = body.action === "candidate-export"
        ? {
            summary: {candidateCount: 2},
            manifest: {
              version: 1,
              candidates: [
                {
                  catalogId,
                  status: "needs-review",
                  checkedAt: "2026-05-10",
                  source: {id: "review-example"},
                },
              ],
            },
          }
        : body.action === "candidate-review-export"
          ? {
              summary: {exportedCount: 1},
              manifest: {
                version: 1,
                type: "candidate-review-queue-export",
                candidates: stateFixture.curation.candidateReviewQueue,
              },
            }
          : body.action === "candidate-review-group-export"
            ? {
                summary: {exportedCount: 1},
                manifest: {
                  version: 1,
                  type: "candidate-review-group-export",
                  groups: stateFixture.curation.candidateReviewGroups,
                },
              }
          : body.action === "candidate-review-group-decision-import"
            ? {dryRun: body.dryRun, outputDecisionCount: 1, addedDecisionCount: 1}
          : body.action === "candidate-review-group-decision-recommendation-export"
            ? {
                summary: {exportedCount: 1},
                manifest: {
                  version: 1,
                  type: "candidate-review-group-decision-recommendation-export",
                  decisions: [
                    {
                      groupId: `${catalogId}:review-group`,
                      catalogId,
                      status: "deferred",
                      reason: "batch-recommend-existing-curation-deferred",
                      reviewedAt: "2026-06-01",
                      reviewedBy: "batch-policy",
                      recommendationRule: "existing-curation-decision-deferred-from-next-batch",
                    },
                  ],
                },
              }
          : body.action === "candidate-review-group-decision-template-export"
            ? {
                summary: {exportedCount: 1},
                manifest: {
                  version: 1,
                  type: "candidate-review-group-decision-template",
                  decisions: [
                    {
                      groupId: `${catalogId}:review-group`,
                      catalogId,
                      status: body.candidateReviewGroupDecisionTemplate.status,
                      reason: body.candidateReviewGroupDecisionTemplate.reason,
                      reviewedAt: body.candidateReviewGroupDecisionTemplate.reviewedAt,
                      reviewedBy: "local-operator",
                    },
                  ],
                },
              }
          : body.action === "candidate-import"
            ? {dryRun: true, addedCandidateCount: 1, skippedDuplicateCount: 0}
            : {feedbackEvents: 1};

      return new Response(
        JSON.stringify({
          action: body.action,
          result,
          state: stateFixture,
        }),
        {status: 200, headers: {"Content-Type": "application/json"}},
      );
    }

    return new Response(JSON.stringify(stateFixture), {
      status: 200,
      headers: {"Content-Type": "application/json"},
    });
  });
}

describe("ReferencesCurationPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads curation state and records row feedback", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferencesCurationDashboard />);

    await screen.findByRole("heading", {name: "Kaynak kürasyonu"});
    fireEvent.change(screen.getByLabelText("Ops token"), {
      target: {value: "secret-token"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Yenile"}));

    await screen.findAllByText(catalogId);
    expect(screen.getByText("divanmakam-example")).toBeDefined();
    expect(screen.getAllByText("divanmakam").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dostun Senden").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", {name: "Sıradaki kaynak backlog batch listesi"})).toBeDefined();
    expect(screen.getByRole("heading", {name: "Aday manifest import/export"})).toBeDefined();
    expect(screen.getByRole("heading", {name: "Artifact izleme"})).toBeDefined();
    expect(screen.getByLabelText("Artifact ara")).toBeDefined();
    expect(screen.getByLabelText("Artifact kategori")).toBeDefined();
    expect(screen.getByLabelText("Artifact durum")).toBeDefined();
    expect(screen.getByText("Coverage summary")).toBeDefined();
    expect(screen.getByText("PDF empty import dry-run")).toBeDefined();
    expect(screen.getByText("Research source profiles")).toBeDefined();
    expect(screen.getAllByText(/artifact · batch pipeline/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", {name: "Aday review grupları"})).toBeDefined();
    expect(screen.getByRole("heading", {name: "Aday review queue"})).toBeDefined();
    expect(screen.getByLabelText("Besteci")).toBeDefined();
    expect(screen.getByLabelText("Silme")).toBeDefined();
    expect(screen.getAllByText("src/data/references/external-reference-bulk-candidates.json").length).toBeGreaterThan(0);
    expect(screen.getAllByText("output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/symbtr-curated-reference-coverage-matrix\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/24 kırılım/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/symbtr-curated-reference-dedupe-report\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 duplicate/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/candidate-review-group-decisions\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/candidate-review-group-decision-recommendations\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/candidate-review-batch-plan\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/source-intake-template\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/source-intake-accepted-import-dry-run\.json/).length).toBeGreaterThan(0);
    expect(screen.getByText(/2\.973 boş kaynak satırı/)).toBeDefined();
    expect(screen.getByText("Source intake accepted dry-run")).toBeDefined();
    expect(screen.getAllByText(/7 accepted/).length).toBeGreaterThan(0);
    expect(screen.getByText(/7 HTTPS/)).toBeDefined();
    expect(screen.getAllByText(/npm run verify:external-source-intake/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/119 paket/).length).toBeGreaterThan(0);
    expect(screen.getByText("PDF layout doğrulama")).toBeDefined();
    expect(screen.getAllByText(/layout-verification-summary\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/layout-verification-review-template\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/layout-verification-review-batch-plan\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/layout-verification-empty-import-dry-run\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/layout-verification-empty-import-template\.json/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/npm run verify:symbtr-layout-review-import/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 hata/).length).toBeGreaterThan(0);
    expect(screen.getByText("review-provider-candidates")).toBeDefined();
    expect(screen.getByLabelText("Grup durum")).toBeDefined();
    expect(screen.getByLabelText("Karar durum")).toBeDefined();
    expect(screen.getByLabelText("Karar tarihi")).toBeDefined();
    expect(screen.getByLabelText("Review grup karar nedeni")).toBeDefined();
    expect(screen.getByRole("link", {name: "Aday ara"}).getAttribute("href")).toContain("duckduckgo.com");
    expect(screen.getByRole("link", {name: "YouTube"}).getAttribute("href")).toContain("youtube.com");

    fireEvent.change(screen.getByLabelText("Artifact kategori"), {target: {value: "Validation"}});
    expect(screen.getAllByText(/2 gösteriliyor/).length).toBeGreaterThan(0);
    expect(screen.getByText("Accepted source dry-run")).toBeDefined();
    expect(screen.getByText("PDF empty import dry-run")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Artifact durum"), {target: {value: "dry-run"}});
    expect(screen.getAllByText(/2 gösteriliyor/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Artifact ara"), {target: {value: "source-intake"}});
    expect(screen.getByText("Accepted source dry-run")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Artifact ara"), {target: {value: ""}});
    fireEvent.change(screen.getByLabelText("Artifact durum"), {target: {value: "all"}});
    fireEvent.change(screen.getByLabelText("Artifact kategori"), {target: {value: "all"}});

    fireEvent.change(screen.getByLabelText("Besteci"), {target: {value: "Ali Rifat Cagatay"}});
    fireEvent.change(screen.getByLabelText("Grup durum"), {target: {value: "conflict"}});
    fireEvent.click(screen.getByRole("button", {name: "Grup dışa aktar"}));
    await screen.findByDisplayValue(/candidate-review-group-export/);
    const groupExportCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "candidate-review-group-export"
    ));
    expect(JSON.parse(String(groupExportCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "candidate-review-group-export",
        candidateReviewGroupQuery: expect.objectContaining({
          status: "conflict",
          composer: "Ali Rifat Cagatay",
        }),
      }),
    );

    fireEvent.click(screen.getByRole("button", {name: "Karar önerisi"}));
    await screen.findByDisplayValue(/candidate-review-group-decision-recommendation-export/);
    const groupDecisionRecommendationCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "candidate-review-group-decision-recommendation-export"
    ));
    expect(JSON.parse(String(groupDecisionRecommendationCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "candidate-review-group-decision-recommendation-export",
        candidateReviewGroupQuery: expect.objectContaining({
          status: "conflict",
          composer: "Ali Rifat Cagatay",
        }),
      }),
    );

    fireEvent.change(screen.getByLabelText("Karar durum"), {target: {value: "deferred"}});
    fireEvent.change(screen.getByLabelText("Review grup karar nedeni"), {target: {value: "batch-defer-low-confidence-provider-set"}});
    fireEvent.click(screen.getByRole("button", {name: "Karar şablonu"}));
    await screen.findByDisplayValue(/candidate-review-group-decision-template/);
    const groupDecisionTemplateCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "candidate-review-group-decision-template-export"
    ));
    expect(JSON.parse(String(groupDecisionTemplateCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "candidate-review-group-decision-template-export",
        candidateReviewGroupDecisionTemplate: expect.objectContaining({
          status: "deferred",
          reason: "batch-defer-low-confidence-provider-set",
          reviewedAt: "2026-06-01",
        }),
      }),
    );

    fireEvent.change(screen.getByLabelText("Review grup karar JSON"), {
      target: {
        value: JSON.stringify({
          version: 1,
          decisions: [
            {
              groupId: `${catalogId}:review-group`,
              catalogId,
              status: "rejected",
              reason: "batch-reviewed-no-safe-source",
              reviewedAt: "2026-06-01",
              reviewedBy: "local-operator",
            },
          ],
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", {name: "Karar içe aktar"}));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "candidate-review-group-decision-import"
    ))).toBe(true));
    const groupDecisionImportCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "candidate-review-group-decision-import"
    ));
    expect(JSON.parse(String(groupDecisionImportCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "candidate-review-group-decision-import",
        dryRun: true,
        candidateReviewGroupDecisionManifestText: expect.stringContaining("batch-reviewed-no-safe-source"),
      }),
    );

    fireEvent.change(screen.getByLabelText("Aday profil"), {target: {value: "youtube"}});
    fireEvent.click(screen.getByRole("button", {name: "Queue dışa aktar"}));
    await screen.findByDisplayValue(/candidate-review-queue-export/);
    const reviewExportCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "candidate-review-export"
    ));
    expect(JSON.parse(String(reviewExportCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "candidate-review-export",
        candidateReviewQuery: expect.objectContaining({
          profileId: "youtube",
          composer: "Ali Rifat Cagatay",
        }),
      }),
    );

    fireEvent.click(screen.getByRole("button", {name: "Manifesti dışa aktar"}));
    await screen.findByDisplayValue(/review-example/);
    fireEvent.click(screen.getByRole("button", {name: "Manifesti içe aktar"}));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/external-references",
      expect.objectContaining({method: "POST"}),
    ));
    const importPostCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "candidate-import"
    ));
    expect(JSON.parse(String(importPostCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "candidate-import",
        dryRun: true,
        candidateManifestText: expect.stringContaining("review-example"),
      }),
    );

    fireEvent.change(screen.getByLabelText("Makam"), {target: {value: "Ussak"}});
    expect(screen.getAllByText(catalogId).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/external-references\?/),
      expect.objectContaining({
        headers: {"x-external-reference-ops-token": "secret-token"},
      }),
    );

    fireEvent.click(screen.getByRole("button", {name: "Sonraki"}));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("backlogOffset=1"),
      expect.objectContaining({
        headers: {"x-external-reference-ops-token": "secret-token"},
      }),
    ));

    fireEvent.click(screen.getByRole("button", {name: "Aday sonraki"}));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("candidateOffset=1"),
      expect.objectContaining({
        headers: {"x-external-reference-ops-token": "secret-token"},
      }),
    ));

    fireEvent.click(screen.getByRole("button", {name: "Grup sonraki"}));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("groupOffset=1"),
      expect.objectContaining({
        headers: {"x-external-reference-ops-token": "secret-token"},
      }),
    ));

    fireEvent.click(screen.getByLabelText("Satırı seç divanmakam-example"));
    fireEvent.click(screen.getByRole("button", {name: "Toplu kaldır"}));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/external-references",
      expect.objectContaining({method: "POST"}),
    ));
    const bulkPostCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "curation-feedback-batch"
    ));
    expect(JSON.parse(String(bulkPostCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "curation-feedback-batch",
        feedbackEvents: [
          expect.objectContaining({
            catalogId,
            sourceId: "divanmakam-example",
            eventType: "user-removed",
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", {name: "Kaldır"}));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/external-references",
      expect.objectContaining({method: "POST"}),
    ));

    const postCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      JSON.parse(String(init.body)).action === "curation-feedback"
    ));
    expect(postCall?.[1]?.headers).toEqual(expect.objectContaining({
      "x-external-reference-ops-token": "secret-token",
    }));
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "curation-feedback",
        feedback: expect.objectContaining({
          catalogId,
          sourceId: "divanmakam-example",
          eventType: "user-removed",
        }),
      }),
    );
  }, 15000);

  it("renders the server-provided read-only batch snapshot before an ops token is entered", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReferencesCurationDashboard
        initialState={stateFixture}
        initialMessage="Read-only batch snapshot yüklendi. Yazma, import/export ve yenileme operasyonları ops token ister."
      />,
    );

    await screen.findByRole("heading", {name: "Kaynak kürasyonu"});

    expect(screen.getByText(/Read-only batch snapshot/)).toBeDefined();
    expect(screen.getByText("2.978")).toBeDefined();
    expect(screen.getByText(/14\.890 queue/)).toBeDefined();
    expect(screen.getAllByText(catalogId).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", {name: "Aday review grupları"})).toBeDefined();
    expect(screen.getByRole("heading", {name: "Sıradaki kaynak backlog batch listesi"})).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

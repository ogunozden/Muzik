import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import ReferencesCurationPage from "../page";

vi.mock("@/components/layout/UnifiedLayout", () => ({
  UnifiedLayout: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

const catalogId = "ussak--ilahi--duyek--dostun_senden--ali_rifat_cagatay";
const stateFixture = {
  coverage: {
    totalCatalogEntries: 3000,
    curatedReferenceEntries: 22,
    missingCuratedEntries: 2978,
    candidateReviewQueueEntries: 11912,
    candidateReviewQueueJson: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json",
  },
  curation: {
    summary: {
      autoAttachedCount: 1,
      removedCount: 0,
      conflictCount: 0,
      feedbackEventCount: 0,
      manualCorrectionCount: 0,
      researchSourceProfileCount: 3,
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
      totalRows: 11912,
      previousOffset: null,
      nextOffset: 1,
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json",
    },
    candidateReviewFacets: {
      statuses: [{value: "needs-review", count: 11908}, {value: "conflict", count: 4}],
      profileIds: [{value: "divanmakam", count: 2978}, {value: "youtube", count: 2978}],
      providers: [{value: "score", count: 8934}, {value: "youtube", count: 2978}],
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

    render(<ReferencesCurationPage />);

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
    expect(screen.getByRole("heading", {name: "Aday review queue"})).toBeDefined();
    expect(screen.getByLabelText("Besteci")).toBeDefined();
    expect(screen.getByLabelText("Silme")).toBeDefined();
    expect(screen.getByText("src/data/references/external-reference-bulk-candidates.json")).toBeDefined();
    expect(screen.getAllByText("output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", {name: "Aday ara"}).getAttribute("href")).toContain("duckduckgo.com");
    expect(screen.getByRole("link", {name: "YouTube"}).getAttribute("href")).toContain("youtube.com");

    fireEvent.change(screen.getByLabelText("Besteci"), {target: {value: "Ali Rifat Cagatay"}});
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
  });
});

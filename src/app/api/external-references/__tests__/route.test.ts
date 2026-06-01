import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {execFile} from "node:child_process";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {GET, POST} from "../route";

const CATALOG_ID = "ussak--ilahi--duyek--dostun_senden--ali_rifat_cagatay";

const childProcessMock = vi.hoisted(() => ({
  execFile: vi.fn(),
}));
const fsPromisesMock = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  unlink: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:child_process", () => ({
  default: childProcessMock,
  ...childProcessMock,
}));

vi.mock("node:fs/promises", () => ({
  default: fsPromisesMock,
  ...fsPromisesMock,
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();

  return {
    ...actual,
    randomUUID: () => "ui-test-input",
  };
});

const inboxFixture = {
  sources: [
    {
      id: "divanmakam-example",
      provider: "score",
      url: "https://divanmakam.com/forum/example.1/",
      title: "Example",
      checkedAt: "2026-05-10",
    },
  ],
};

const mappingFixture = {
  generatedAt: "2026-05-10T12:00:00.000Z",
  summary: {
    sourceCount: 1,
    acceptedCount: 1,
    needsReviewCount: 0,
    rejectedCount: 0,
  },
  mappings: [
    {
      inboxId: "divanmakam-example",
      catalogId: CATALOG_ID,
      status: "accepted",
      confidenceScore: 180,
      confidenceGap: 40,
      candidate: {
        source: {
          id: "divanmakam-example",
          title: "Example Source",
          url: "https://divanmakam.com/forum/example.1/",
          provider: "score",
        },
      },
    },
  ],
};

const coverageFixture = {
  totalCatalogEntries: 3000,
  curatedReferenceEntries: 22,
  missingCuratedEntries: 2978,
  acceptedBulkCandidateEntries: 7,
  candidateReviewQueueEntries: 14890,
  candidateReviewQueueJson: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json",
  candidateReviewGroupEntries: 2978,
  candidateReviewGroupsJson: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json",
  candidateReviewGroupDecisionRecommendationEntries: 1,
  candidateReviewGroupDecisionRecommendationsJson: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
  coverageMatrixEntries: 24,
  coverageMatrixJson: "output/external-reference-coverage/symbtr-curated-reference-coverage-matrix.json",
};
const autoAttachedFixture = {
  version: 1,
  matcherVersion: "external-source-map-v1",
  references: [
    {
      catalogId: CATALOG_ID,
      sourceId: "divanmakam-example",
      profileId: "divanmakam",
      status: "auto-attached",
      rank: 1,
      confidenceScore: 0.82,
      confidenceLevel: "high",
      matchReasons: ["title:token-match"],
      conflicts: [],
      attachedAt: "2026-05-10",
      matcherVersion: "external-source-map-v1",
    },
  ],
};
const feedbackFixture = {version: 1, events: []};
const manualCorrectionsFixture = {
  version: 1,
  corrections: [
    {
      catalogId: CATALOG_ID,
      sourceId: "divanmakam-example",
      correctTitle: "Corrected title",
      updatedAt: "2026-05-10",
    },
  ],
};
const researchProfilesFixture = {
  version: 1,
  profiles: [{id: "divanmakam", label: "DîvânMakam"}],
};
const embedStatesFixture = {version: 1, states: []};
const qualityStatsFixture = {
  version: 1,
  generatedAt: "2026-05-10T12:00:00.000Z",
  stats: [
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
};
const bulkCandidatesFixture = {
  version: 1,
  candidates: [
    {
      catalogId: CATALOG_ID,
      status: "accepted",
      checkedAt: "2026-05-10",
      source: {
        id: "divanmakam-example",
        provider: "score",
        url: "https://divanmakam.com/forum/example.1/",
      },
    },
    {
      catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
      status: "conflict",
      checkedAt: "2026-05-10",
      source: {
        id: "conflict-example",
      },
    },
  ],
};
const nextBatchFixture = [
  {
    catalogId: CATALOG_ID,
    makam: "Ussak",
    form: "İlahi",
    usul: "Duyek",
    title: "Dostun Senden",
    composer: "Ali Rifat Cagatay",
    availableFormats: "txt|mid|xml|mu2|pdf",
    hasPdf: true,
    hasMusicXml: true,
    hasTxt: true,
    priorityGroup: "pdf-and-musicxml",
    curationPriorityScore: -72,
    scoreSearchUrl: "https://duckduckgo.com/?q=Dostun+Senden+nota",
    scoreSourceHintUrls: "https://duckduckgo.com/?q=Dostun+Senden+site%3Aneyzen.com+nota",
    recordingSearchUrl: "https://www.youtube.com/results?search_query=Dostun+Senden",
  },
];
const backlogFixture = [
  nextBatchFixture[0],
  {
    catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
    makam: "Rast",
    form: "Şarkı",
    usul: "Sofyan",
    title: "İkinci Eser",
    composer: "İkinci Besteci",
    availableFormats: "txt|mid|xml|mu2|pdf",
    hasPdf: true,
    hasMusicXml: true,
    hasTxt: true,
    hasCuratedReference: false,
    missingCuratedReference: true,
    deferredFromNextBatch: false,
    priorityGroup: "pdf-and-musicxml",
    curationPriorityScore: -54,
    scoreSearchUrl: "https://duckduckgo.com/?q=Ikinci+Eser+nota",
    scoreSourceHintUrls: "https://duckduckgo.com/?q=Ikinci+Eser+site%3Aneyzen.com+nota",
    recordingSearchUrl: "https://www.youtube.com/results?search_query=Ikinci+Eser",
  },
  {
    catalogId: "hicaz--ilahi--duyek--deferred--besteci",
    makam: "Hicaz",
    form: "İlahi",
    usul: "Duyek",
    title: "Deferred",
    composer: "Besteci",
    hasCuratedReference: false,
    missingCuratedReference: true,
    curationDecisionStatus: "needs-disambiguation",
    deferredFromNextBatch: true,
    priorityGroup: "pdf-and-musicxml",
    curationPriorityScore: -50,
  },
];
const candidateReviewQueueFixture = [
  {
    candidateId: `${CATALOG_ID}:divanmakam:search`,
    catalogId: CATALOG_ID,
    status: "needs-review",
    statusReason: "provider-profile-search-candidate",
    profileId: "divanmakam",
    profileLabel: "DîvânMakam",
    provider: "score",
    trustWeight: 0.85,
    reviewConfidenceScore: 85,
    reviewConfidenceLevel: "medium",
    searchQuery: "Ussak İlahi Dostun Senden Ali Rifat Cagatay nota",
    searchUrl: "https://duckduckgo.com/?q=site%3Adivanmakam.com%2Fforum%2F+Dostun",
    makam: "Ussak",
    form: "İlahi",
    usul: "Duyek",
    title: "Dostun Senden",
    composer: "Ali Rifat Cagatay",
    priorityGroup: "pdf-and-musicxml",
  },
  {
    candidateId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci:youtube:search",
    catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
    status: "conflict",
    profileId: "youtube",
    profileLabel: "YouTube",
    provider: "youtube",
    trustWeight: 0.65,
    reviewConfidenceScore: 45,
    reviewConfidenceLevel: "needs-context",
    searchQuery: "Rast Şarkı İkinci Eser İkinci Besteci icra kayıt",
    searchUrl: "https://www.youtube.com/results?search_query=Ikinci",
    makam: "Rast",
    form: "Şarkı",
    usul: "Sofyan",
    title: "İkinci Eser",
    composer: "İkinci Besteci",
    priorityGroup: "pdf-and-musicxml",
    curationDecisionStatus: "source-mismatch",
  },
];
const candidateReviewGroupsFixture = [
  {
    groupId: `${CATALOG_ID}:review-group`,
    catalogId: CATALOG_ID,
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
  {
    groupId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci:review-group",
    catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
    status: "conflict",
    reviewAction: "resolve-conflict-before-import",
    candidateCount: 1,
    profileCount: 1,
    profiles: ["youtube"],
    providers: ["youtube"],
    confidenceLevels: ["needs-context"],
    highestReviewConfidenceScore: 45,
    makam: "Rast",
    form: "Şarkı",
    usul: "Sofyan",
    title: "İkinci Eser",
    composer: "İkinci Besteci",
    priorityGroup: "pdf-and-musicxml",
  },
];
const candidateReviewGroupDecisionsFixture = {
  version: 1,
  decisions: [
    {
      groupId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci:review-group",
      catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
      status: "conflict",
      reason: "batch-reviewed-source-mismatch",
      reviewedAt: "2026-06-01",
      reviewedBy: "local-operator",
    },
  ],
};
const candidateReviewGroupDecisionRecommendationsFixture = {
  version: 1,
  type: "candidate-review-group-decision-recommendations",
  policyVersion: "candidate-review-group-decision-recommendations-v1",
  generatedAt: "2026-06-01T00:00:00.000Z",
  summary: {
    totalGroups: 2,
    recommendedDecisionCount: 1,
  },
  decisions: [
    {
      groupId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci:review-group",
      catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
      status: "conflict",
      reason: "batch-recommend-source-mismatch-conflict",
      reviewedAt: "2026-06-01",
      reviewedBy: "batch-policy",
      recommendationRule: "generated-conflict-review-group",
      sourceGroupStatus: "conflict",
      highestReviewConfidenceScore: 45,
      candidateCount: 1,
      profileCount: 1,
      makam: "Rast",
      form: "Şarkı",
      usul: "Sofyan",
      title: "İkinci Eser",
      composer: "İkinci Besteci",
      priorityGroup: "pdf-and-musicxml",
    },
  ],
};
const OPS_TOKEN_HEADER = "x-external-reference-ops-token";

function authedRequest(url: string, init: RequestInit = {}): Request {
  vi.stubEnv("EXTERNAL_REFERENCE_OPERATIONS_TOKEN", "secret-token");
  const headers = new Headers(init.headers);
  headers.set(OPS_TOKEN_HEADER, "secret-token");
  return new Request(url, {
    ...init,
    headers,
  });
}

function mockJsonFiles() {
  vi.mocked(readFile).mockImplementation(async (file) => {
    const filePath = String(file);

    if (filePath.includes("external-source-inbox.json")) {
      return JSON.stringify(inboxFixture);
    }

    if (filePath.includes("mapped-external-reference-candidates.json")) {
      return JSON.stringify(mappingFixture);
    }

    if (filePath.includes("summary.json")) {
      return JSON.stringify(coverageFixture);
    }

    if (filePath.includes("auto-attached-references.json")) {
      return JSON.stringify(autoAttachedFixture);
    }

    if (filePath.includes("source-feedback-events.json")) {
      return JSON.stringify(feedbackFixture);
    }

    if (filePath.includes("manual-source-corrections.json")) {
      return JSON.stringify(manualCorrectionsFixture);
    }

    if (filePath.includes("research-source-profiles.json")) {
      return JSON.stringify(researchProfilesFixture);
    }

    if (filePath.includes("embed-states.json")) {
      return JSON.stringify(embedStatesFixture);
    }

    if (filePath.includes("source-quality-stats.generated.json")) {
      return JSON.stringify(qualityStatsFixture);
    }

    if (filePath.includes("external-reference-bulk-candidates.json")) {
      return JSON.stringify(bulkCandidatesFixture);
    }

    if (filePath.includes("candidate-review-group-decisions.json")) {
      return JSON.stringify(candidateReviewGroupDecisionsFixture);
    }

    if (filePath.includes("candidate-review-group-decision-recommendations.json")) {
      return JSON.stringify(candidateReviewGroupDecisionRecommendationsFixture);
    }

    if (filePath.includes("symbtr-curated-reference-backlog.json")) {
      return JSON.stringify(backlogFixture);
    }

    if (filePath.includes("symbtr-curated-reference-candidate-review-queue.json")) {
      return JSON.stringify(candidateReviewQueueFixture);
    }

    if (filePath.includes("symbtr-curated-reference-candidate-review-groups.json")) {
      return JSON.stringify(candidateReviewGroupsFixture);
    }

    if (filePath.includes("symbtr-curated-reference-next-batch.json")) {
      return JSON.stringify(nextBatchFixture);
    }

    throw Object.assign(new Error("missing"), {code: "ENOENT"});
  });
}

describe("/api/external-references route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJsonFiles();
    vi.mocked(execFile).mockImplementation(((...callArgs: unknown[]) => {
      const callback = callArgs[3] as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, JSON.stringify({addedCount: 1, skippedDuplicateCount: 0}), "");
      return undefined;
    }) as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns inbox, mapping and coverage state for the operations UI", async () => {
    const response = await GET(authedRequest("http://localhost/api/external-references"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.inbox.sourceCount).toBe(1);
    expect(body.mapping.summary.acceptedCount).toBe(1);
    expect(body.coverage.missingCuratedEntries).toBe(2978);
    expect(body.coverage.coverageMatrixJson).toBe("output/external-reference-coverage/symbtr-curated-reference-coverage-matrix.json");
    expect(body.coverage.coverageMatrixEntries).toBe(24);
    expect(body.curation.summary.autoAttachedCount).toBe(1);
    expect(body.curation.summary.sourceQualityStatCount).toBe(1);
    expect(body.curation.autoAttachedReferences[0].source.url).toBe("https://divanmakam.com/forum/example.1/");
    expect(body.curation.autoAttachedReferences[0].catalog.title).toBe("Dostun Senden");
    expect(body.curation.autoAttachedReferences[0].manualCorrection.correctTitle).toBe("Corrected title");
    expect(body.curation.candidateManifest).toEqual(expect.objectContaining({
      candidateCount: 2,
      acceptedCount: 1,
      conflictCount: 1,
    }));
    expect(body.curation.backlogNextBatch[0].catalogId).toBe(CATALOG_ID);
    expect(body.curation.candidateReviewQueue[0].candidateId).toBe(`${CATALOG_ID}:divanmakam:search`);
    expect(body.curation.candidateReviewGroups[0]).toEqual(expect.objectContaining({
      groupId: `${CATALOG_ID}:review-group`,
      candidateCount: 1,
      reviewAction: "review-provider-candidates",
    }));
    expect(body.curation.candidateReviewGroupManifest).toEqual(expect.objectContaining({
      groupCount: 2,
      visibleGroupCount: 2,
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json",
    }));
    expect(body.curation.candidateReviewGroupDecisionManifest).toEqual(expect.objectContaining({
      decisionCount: 1,
      artifactPath: "src/data/references/candidate-review-group-decisions.json",
    }));
    expect(body.curation.candidateReviewGroupDecisionRecommendationManifest).toEqual(expect.objectContaining({
      decisionCount: 1,
      artifactPath: "output/external-reference-coverage/symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
      policyVersion: "candidate-review-group-decision-recommendations-v1",
    }));
    expect(body.curation.candidateReviewGroupPage).toEqual(expect.objectContaining({
      returnedCount: 2,
      filteredTotal: 2,
      totalRows: 2,
    }));
    expect(body.curation.candidateReviewGroupFacets.statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({value: "needs-review", count: 1}),
      expect.objectContaining({value: "conflict", count: 1}),
    ]));
    expect(body.curation.candidateReviewPage).toEqual(expect.objectContaining({
      returnedCount: 2,
      filteredTotal: 2,
      totalRows: 2,
    }));
    expect(body.curation.candidateReviewFacets.profileIds).toEqual(expect.arrayContaining([
      expect.objectContaining({value: "divanmakam", count: 1}),
      expect.objectContaining({value: "youtube", count: 1}),
    ]));
    expect(body.curation.candidateReviewFacets.composers).toEqual(expect.arrayContaining([
      expect.objectContaining({value: "Ali Rifat Cagatay", count: 1}),
      expect.objectContaining({value: "İkinci Besteci", count: 1}),
    ]));
    expect(body.curation.backlogNextBatch[0].priorityGroup).toBe("pdf-and-musicxml");
    expect(body.curation.backlogPage.filteredTotal).toBe(3);
    expect(body.curation.backlogPage.totalMissing).toBe(3);
    expect(body.curation.backlogFacets.makams).toEqual(expect.arrayContaining([
      expect.objectContaining({value: "Ussak", count: 1}),
      expect.objectContaining({value: "Rast", count: 1}),
    ]));
    expect(body.curation.backlogFacets.composers).toEqual(expect.arrayContaining([
      expect.objectContaining({value: "Ali Rifat Cagatay", count: 1}),
    ]));
  });

  it("paginates and filters the full backlog queue from query params", async () => {
    const response = await GET(authedRequest("http://localhost/api/external-references?backlogLimit=1&backlogOffset=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.curation.backlogNextBatch).toHaveLength(1);
    expect(body.curation.backlogNextBatch[0].catalogId).toBe("rast--sarki--sofyan--ikinci_eser--ikinci_besteci");
    expect(body.curation.backlogPage).toEqual(expect.objectContaining({
      offset: 1,
      limit: 1,
      returnedCount: 1,
      filteredTotal: 3,
      previousOffset: 0,
      nextOffset: 2,
    }));
  });

  it("paginates and filters the candidate review queue from query params", async () => {
    const response = await GET(authedRequest("http://localhost/api/external-references?candidateLimit=1&candidateOffset=1&candidateStatus=conflict"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.curation.candidateReviewQueue).toHaveLength(1);
    expect(body.curation.candidateReviewQueue[0].profileId).toBe("youtube");
    expect(body.curation.candidateReviewPage).toEqual(expect.objectContaining({
      offset: 0,
      limit: 1,
      returnedCount: 1,
      filteredTotal: 1,
      totalRows: 2,
      previousOffset: null,
      nextOffset: null,
    }));
  });

  it("paginates and filters candidate review groups from query params", async () => {
    const response = await GET(authedRequest("http://localhost/api/external-references?groupLimit=1&groupOffset=1&groupStatus=conflict"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.curation.candidateReviewGroups).toHaveLength(1);
    expect(body.curation.candidateReviewGroups[0]).toEqual(expect.objectContaining({
      status: "conflict",
      reviewAction: "resolve-conflict-before-import",
    }));
    expect(body.curation.candidateReviewGroupPage).toEqual(expect.objectContaining({
      offset: 0,
      limit: 1,
      returnedCount: 1,
      filteredTotal: 1,
      totalRows: 2,
      previousOffset: null,
      nextOffset: null,
    }));
  });

  it("filters backlog and candidate review queues by composer facet", async () => {
    const response = await GET(authedRequest("http://localhost/api/external-references?composer=İkinci%20Besteci&candidateComposer=İkinci%20Besteci"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.curation.backlogNextBatch.map((row: {composer?: string}) => row.composer)).toEqual(["İkinci Besteci"]);
    expect(body.curation.candidateReviewQueue.map((row: {composer?: string}) => row.composer)).toEqual(["İkinci Besteci"]);
  });

  it("stages a single source through the fixed stage script", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "stage",
        source: {
          url: "https://divanmakam.com/forum/example.1/",
          title: "Example",
          makam: "Uşşak",
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];

    expect(response.status).toBe(200);
    expect(body.action).toBe("stage");
    expect(args).toContain("scripts/stage-external-sources.mjs");
    expect(args).toContain("--url");
    expect(args).toContain("https://divanmakam.com/forum/example.1/");
    expect(args).toContain("--makam");
    expect(args).toContain("Uşşak");
  });

  it("stages pasted bulk text through a temporary project file", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "stage",
        bulkText: "https://example.com/source",
      }),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];

    expect(response.status).toBe(200);
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("ui-input"), {recursive: true});
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("ui-input"), "https://example.com/source");
    expect(unlink).toHaveBeenCalledWith(expect.stringContaining("ui-input"));
    expect(args).toContain("--input");
    expect(args[args.indexOf("--input") + 1]).toMatch(/^output\/external-reference-coverage\/ui-input\/.+\.txt$/);
  });

  it("runs map without accepting arbitrary command input", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "map"}),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];

    expect(response.status).toBe(200);
    expect(args).toEqual(["scripts/map-external-source-inbox.mjs"]);
  });

  it("exports the current bulk candidate manifest through the fixed API action", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "candidate-export"}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.summary).toEqual(expect.objectContaining({
      candidateCount: 2,
      acceptedCount: 1,
      conflictCount: 1,
    }));
    expect(body.result.manifest.candidates).toHaveLength(2);
    expect(execFile).not.toHaveBeenCalled();
  });

  it("exports filtered candidate review queue rows without shelling out", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "candidate-review-export",
        candidateReviewQuery: {
          status: "conflict",
          profileId: "youtube",
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.summary).toEqual(expect.objectContaining({
      totalRows: 2,
      exportedCount: 1,
      filters: expect.objectContaining({
        status: "conflict",
        profileId: "youtube",
      }),
    }));
    expect(body.result.manifest).toEqual(expect.objectContaining({
      type: "candidate-review-queue-export",
      candidates: [expect.objectContaining({profileId: "youtube", status: "conflict"})],
    }));
    expect(execFile).not.toHaveBeenCalled();
  });

  it("exports filtered candidate review groups without shelling out", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "candidate-review-group-export",
        candidateReviewGroupQuery: {
          status: "conflict",
          composer: "İkinci Besteci",
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.summary).toEqual(expect.objectContaining({
      totalRows: 2,
      exportedCount: 1,
      filters: expect.objectContaining({
        status: "conflict",
        composer: "İkinci Besteci",
      }),
    }));
    expect(body.result.manifest).toEqual(expect.objectContaining({
      type: "candidate-review-group-export",
      groups: [expect.objectContaining({status: "conflict", composer: "İkinci Besteci"})],
    }));
    expect(execFile).not.toHaveBeenCalled();
  });

  it("exports filtered candidate review group decision templates without accepted source data", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "candidate-review-group-decision-template-export",
        candidateReviewGroupQuery: {
          status: "conflict",
          composer: "İkinci Besteci",
        },
        candidateReviewGroupDecisionTemplate: {
          status: "rejected",
          reason: "batch-reviewed-no-safe-source",
          reviewedAt: "2026-06-01",
          reviewedBy: "local-operator",
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.summary).toEqual(expect.objectContaining({
      totalRows: 2,
      exportedCount: 1,
      decisionStatus: "rejected",
      filters: expect.objectContaining({
        status: "conflict",
        composer: "İkinci Besteci",
      }),
    }));
    expect(body.result.manifest).toEqual(expect.objectContaining({
      type: "candidate-review-group-decision-template",
      decisions: [
        expect.not.objectContaining({
          sourceId: expect.anything(),
          sourceUrl: expect.anything(),
          url: expect.anything(),
        }),
      ],
    }));
    expect(body.result.manifest.decisions[0]).toEqual(expect.objectContaining({
      groupId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci:review-group",
      catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
      status: "rejected",
      reason: "batch-reviewed-no-safe-source",
      reviewedAt: "2026-06-01",
      reviewedBy: "local-operator",
    }));
    expect(execFile).not.toHaveBeenCalled();
  });

  it("exports filtered candidate review group decision recommendations without accepted source data", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "candidate-review-group-decision-recommendation-export",
        candidateReviewGroupQuery: {
          status: "conflict",
          composer: "İkinci Besteci",
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.summary).toEqual(expect.objectContaining({
      totalRows: 1,
      exportedCount: 1,
      policyVersion: "candidate-review-group-decision-recommendations-v1",
      filters: expect.objectContaining({
        status: "conflict",
        composer: "İkinci Besteci",
      }),
    }));
    expect(body.result.manifest).toEqual(expect.objectContaining({
      type: "candidate-review-group-decision-recommendation-export",
      decisions: [
        expect.objectContaining({
          catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
          status: "conflict",
          reason: "batch-recommend-source-mismatch-conflict",
          recommendationRule: "generated-conflict-review-group",
        }),
      ],
    }));
    expect(body.result.manifest.decisions[0]).toEqual(expect.not.objectContaining({
      sourceId: expect.anything(),
      sourceUrl: expect.anything(),
      url: expect.anything(),
    }));
    expect(execFile).not.toHaveBeenCalled();
  });

  it("rejects unsafe candidate review group decision template statuses", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "candidate-review-group-decision-template-export",
        candidateReviewGroupDecisionTemplate: {
          status: "accepted",
          reason: "unsafe",
          reviewedAt: "2026-06-01",
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("rejected");
    expect(execFile).not.toHaveBeenCalled();
  });

  it("imports a candidate manifest through a temporary project file", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "candidate-import",
        dryRun: true,
        candidateManifestText: JSON.stringify({
          candidates: [
            {
              catalogId: CATALOG_ID,
              status: "needs-review",
              checkedAt: "2026-05-10",
              source: {id: "review-example"},
            },
          ],
        }),
      }),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];
    const [, writtenPayload] = vi.mocked(writeFile).mock.calls[0];

    expect(response.status).toBe(200);
    expect(JSON.parse(String(writtenPayload)).candidates[0]).toEqual(expect.objectContaining({
      status: "needs-review",
    }));
    expect(args).toEqual([
      "scripts/import-external-reference-candidates.mjs",
      "--input",
      expect.stringMatching(/^output\/external-reference-coverage\/ui-input\/.+\.json$/),
      "--dry-run",
    ]);
    expect(unlink).toHaveBeenCalledWith(expect.stringContaining("ui-input"));
  });

  it("imports candidate review group decisions through a fixed batch script", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "candidate-review-group-decision-import",
        dryRun: false,
        candidateReviewGroupDecisionManifestText: JSON.stringify({
          version: 1,
          decisions: [
            {
              groupId: `${CATALOG_ID}:review-group`,
              catalogId: CATALOG_ID,
              status: "rejected",
              reason: "batch-reviewed-no-safe-source",
              reviewedAt: "2026-06-01",
              reviewedBy: "local-operator",
            },
          ],
        }),
      }),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];
    const [, writtenPayload] = vi.mocked(writeFile).mock.calls[0];

    expect(response.status).toBe(200);
    expect(JSON.parse(String(writtenPayload)).decisions[0]).toEqual(expect.objectContaining({
      status: "rejected",
      reason: "batch-reviewed-no-safe-source",
    }));
    expect(args).toEqual([
      "scripts/import-candidate-review-group-decisions.mjs",
      "--input",
      expect.stringMatching(/^output\/external-reference-coverage\/ui-input\/.+\.json$/),
      "--write",
    ]);
  });

  it("rejects malformed candidate manifest JSON before writing a temp input file", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "candidate-import", candidateManifestText: "{not-json"}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("geçerli JSON");
    expect(writeFile).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
  });

  it("runs curation auto-attach through the fixed curation script", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "curation-auto-attach"}),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];

    expect(response.status).toBe(200);
    expect(args).toEqual(["scripts/manage-source-curation.mjs", "auto-attach", "--write"]);
  });

  it("writes curation feedback payloads through a temporary project file", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "curation-feedback",
        feedback: {
          catalogId: CATALOG_ID,
          sourceId: "divanmakam-example",
          eventType: "user-removed",
          reason: "wrong-piece",
        },
      }),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];
    const [, writtenPayload] = vi.mocked(writeFile).mock.calls[0];

    expect(response.status).toBe(200);
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("ui-input"), expect.stringContaining("user-removed"));
    expect(JSON.parse(String(writtenPayload))).toEqual({
      feedback: expect.objectContaining({
        sourceId: "divanmakam-example",
        eventType: "user-removed",
      }),
    });
    expect(unlink).toHaveBeenCalledWith(expect.stringContaining("ui-input"));
    expect(args).toEqual([
      "scripts/manage-source-curation.mjs",
      "feedback",
      "--input",
      expect.stringMatching(/^output\/external-reference-coverage\/ui-input\/.+\.json$/),
    ]);
  });

  it("writes curation feedback batches through one temporary project file", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "curation-feedback-batch",
        feedbackEvents: [
          {
            catalogId: CATALOG_ID,
            sourceId: "divanmakam-example",
            eventType: "user-approved",
            reason: "bulk-pass",
          },
        ],
      }),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];
    const [, writtenPayload] = vi.mocked(writeFile).mock.calls[0];

    expect(response.status).toBe(200);
    expect(JSON.parse(String(writtenPayload))).toEqual({
      feedbackEvents: [
        expect.objectContaining({
          sourceId: "divanmakam-example",
          eventType: "user-approved",
        }),
      ],
    });
    expect(args).toEqual([
      "scripts/manage-source-curation.mjs",
      "feedback-batch",
      "--input",
      expect.stringMatching(/^output\/external-reference-coverage\/ui-input\/.+\.json$/),
    ]);
  });

  it("rejects curation feedback without a structured payload", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "curation-feedback"}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Feedback");
    expect(execFile).not.toHaveBeenCalled();
  });

  it("rejects curation feedback batches without a non-empty array", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "curation-feedback-batch", feedbackEvents: []}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Toplu feedback");
    expect(execFile).not.toHaveBeenCalled();
  });

  it("writes curation manual correction payloads through the fixed script", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "curation-manual-correction",
        manualCorrection: {
          catalogId: CATALOG_ID,
          sourceId: "divanmakam-example",
          correctTitle: "Corrected title",
        },
      }),
    });

    const response = await POST(request);
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];
    const [, writtenPayload] = vi.mocked(writeFile).mock.calls[0];

    expect(response.status).toBe(200);
    expect(JSON.parse(String(writtenPayload))).toEqual({
      manualCorrection: expect.objectContaining({
        sourceId: "divanmakam-example",
        correctTitle: "Corrected title",
      }),
    });
    expect(args).toEqual([
      "scripts/manage-source-curation.mjs",
      "manual-correction",
      "--input",
      expect.stringMatching(/^output\/external-reference-coverage\/ui-input\/.+\.json$/),
    ]);
  });

  it("requires a token by default even on localhost", async () => {
    const response = await GET(new Request("http://localhost/api/external-references"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("token");
    expect(body.error).toContain("EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL");
  });

  it("rejects malformed JSON bodies without running an operation", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: "{not-json",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("JSON");
    expect(execFile).not.toHaveBeenCalled();
  });

  it("requires the configured operations token before exposing state", async () => {
    vi.stubEnv("EXTERNAL_REFERENCE_OPERATIONS_TOKEN", "secret-token");

    const response = await GET(new Request("http://localhost/api/external-references"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("token");
  });

  it("accepts the configured operations token", async () => {
    const response = await GET(authedRequest("http://localhost/api/external-references"));

    expect(response.status).toBe(200);
  });

  it("rejects tokenless operations from non-loopback hosts even when unsafe local mode is enabled", async () => {
    vi.stubEnv("EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL", "true");

    const response = await GET(new Request("http://192.168.1.13:4000/api/external-references"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("token");
  });

  it("accepts IPv6 loopback without a token only in explicit unsafe local mode", async () => {
    vi.stubEnv("EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL", "true");

    const response = await GET(new Request("http://[::1]:4000/api/external-references"));

    expect(response.status).toBe(200);
  });

  it("rejects oversized bulk text before writing a temp input file", async () => {
    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({
        action: "stage",
        bulkText: "x".repeat(100_001),
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error).toContain("Toplu kaynak metni");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects concurrent mutating operations", async () => {
    const finishFirstOperationRef: {
      current?: (error: Error | null, stdout: string, stderr: string) => void;
    } = {};
    vi.mocked(execFile).mockImplementationOnce(((...callArgs: unknown[]) => {
      finishFirstOperationRef.current = callArgs[3] as (
        error: Error | null,
        stdout: string,
        stderr: string,
      ) => void;
      return undefined;
    }) as never);

    const request = authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "map"}),
    });
    const firstOperation = POST(request);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondResponse = await POST(authedRequest("http://localhost/api/external-references", {
      method: "POST",
      body: JSON.stringify({action: "sync"}),
    }));
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(409);
    expect(secondBody.error).toContain("devam ediyor");

    if (!finishFirstOperationRef.current) {
      throw new Error("Expected first operation callback to be captured.");
    }
    finishFirstOperationRef.current(null, JSON.stringify({acceptedCount: 1}), "");
    await firstOperation;
  });
});

import {describe, expect, it} from "vitest";
import {buildSourceTerminalDecisions} from "../stage-source-terminal-decisions.mjs";

function cacheEntry(catalogId, providerProfileId, status, extra = {}) {
  return {
    catalogId,
    providerProfileId,
    status,
    statusReason: extra.statusReason ?? "test",
    resultCount: extra.resultCount ?? 0,
    best: extra.best,
  };
}

describe("source terminal decision staging", () => {
  it("stages terminal decisions only after all providers have evidence for a group", () => {
    const payload = buildSourceTerminalDecisions({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageData: {providerProfileIds: ["internet-archive", "divanmakam"]},
      cacheData: {
        entries: {
          "complete:ia": cacheEntry("complete", "internet-archive", "rejected"),
          "complete:dm": cacheEntry("complete", "divanmakam", "rejected"),
          "partial:ia": cacheEntry("partial", "internet-archive", "rejected"),
        },
      },
    });

    expect(payload.summary.processedCatalogGroupCount).toBe(2);
    expect(payload.summary.terminalDecisionGroupCount).toBe(1);
    expect(payload.entries).toEqual([
      expect.objectContaining({
        catalogId: "complete",
        status: "verified-unavailable",
        directAutoAttach: false,
        mediaDownload: false,
      }),
    ]);
  });

  it("keeps ambiguous provider evidence as disputed rather than accepted", () => {
    const payload = buildSourceTerminalDecisions({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageData: {providerProfileIds: ["internet-archive", "divanmakam"]},
      cacheData: {
        entries: {
          "ambiguous:ia": cacheEntry("ambiguous", "internet-archive", "needs-review", {resultCount: 3}),
          "ambiguous:dm": cacheEntry("ambiguous", "divanmakam", "rejected"),
        },
      },
    });

    expect(payload.summary.statusCounts).toEqual({disputed: 1});
    expect(payload.entries[0]).toEqual(expect.objectContaining({
      catalogId: "ambiguous",
      status: "disputed",
      directAutoAttach: false,
      mediaDownload: false,
    }));
  });

  it("keeps accepted-ready evidence disputed until import validation passes", () => {
    const payload = buildSourceTerminalDecisions({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageData: {providerProfileIds: ["internet-archive"]},
      cacheData: {
        entries: {
          "accepted:ia": cacheEntry("accepted", "internet-archive", "accepted-ready", {
            best: {sourceUrl: "https://archive.org/details/example"},
          }),
        },
      },
    });

    expect(payload.summary.statusCounts).toEqual({disputed: 1});
    expect(payload.entries[0]).toEqual(expect.objectContaining({
      catalogId: "accepted",
      status: "disputed",
      sourceUrl: "https://archive.org/details/example",
      importValidationRequired: true,
      directAutoAttach: false,
      mediaDownload: false,
    }));
  });

  it("uses deterministic provider coverage as virtual evidence for IA-only batches", () => {
    const payload = buildSourceTerminalDecisions({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageData: {
        providerProfileIds: ["internet-archive", "divanmakam"],
        byProvider: [
          {
            providerProfileId: "divanmakam",
            remainingGroupCount: 0,
            deterministicDeferredGroupCount: 2978,
          },
        ],
      },
      policyData: {
        providers: [
          {id: "internet-archive", enabled: true},
          {id: "divanmakam", enabled: true},
        ],
      },
      cacheData: {
        entries: {
          "ia-only:ia": cacheEntry("ia-only", "internet-archive", "rejected"),
        },
      },
    });

    expect(payload.summary.terminalDecisionGroupCount).toBe(1);
    expect(payload.entries[0]).toEqual(expect.objectContaining({
      catalogId: "ia-only",
      status: "verified-unavailable",
      providerResultCount: 2,
    }));
    expect(payload.entries[0].providerStatuses).toContainEqual(expect.objectContaining({
      providerProfileId: "divanmakam",
      statusReason: "deterministic-provider-classified-without-accepted-evidence",
    }));
  });

  it("uses policy provider ids when an IA-only run overwrites coverage provider ids", () => {
    const payload = buildSourceTerminalDecisions({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageData: {
        providerProfileIds: ["internet-archive"],
      },
      policyData: {
        providers: [
          {id: "internet-archive", enabled: true},
          {id: "divanmakam", enabled: true},
          {id: "youtube-oembed", enabled: true},
        ],
      },
      cacheData: {
        entries: {
          "ia-only:ia": cacheEntry("ia-only", "internet-archive", "rejected"),
        },
      },
    });

    expect(payload.summary.providerCount).toBe(3);
    expect(payload.summary.terminalDecisionGroupCount).toBe(1);
    expect(payload.entries[0].providerResultCount).toBe(3);
  });

  it("keeps groups without terminal provider evidence in the deferred review queue", () => {
    const payload = buildSourceTerminalDecisions({
      generatedAt: "2026-06-04T00:00:00.000Z",
      coverageData: {providerProfileIds: ["internet-archive"]},
      cacheData: {
        entries: {
          "complete:ia": cacheEntry("complete", "internet-archive", "rejected"),
        },
      },
      reviewGroupsData: [
        {catalogId: "complete"},
        {catalogId: "still-open"},
      ],
    });

    expect(payload.summary.terminalDecisionGroupCount).toBe(2);
    expect(payload.summary.statusCounts).toEqual({
      "verified-unavailable": 1,
      deferred: 1,
    });
    expect(payload.entries).toContainEqual(expect.objectContaining({
      catalogId: "still-open",
      status: "deferred",
      directAutoAttach: false,
      mediaDownload: false,
    }));
  });
});

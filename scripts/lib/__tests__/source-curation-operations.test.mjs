import {mkdtempSync, mkdirSync, writeFileSync, readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  generateAutoAttachedReferences,
  generateSourceQualityStats,
  getCurationState,
  recordSourceFeedback,
  recordSourceFeedbackBatch,
  summarizeCurationState,
  upsertEmbedState,
  upsertManualSourceCorrection,
} from "../source-curation-operations.mjs";

const catalogId = "hicazkar--pesrev--duyek--test--besteci";

function writeJson(root, relativePath, value) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createRoot({
  mappings = [
    {
      catalogId,
      status: "accepted",
      confidenceScore: 180,
      candidate: {
        source: {
          id: "youtube-test-recording",
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=test",
          title: "Test kayıt",
        },
      },
      alternatives: [
        {
          reasons: ["title:token-match"],
          mismatches: [],
        },
      ],
    },
  ],
  autoAttachedReferences = [],
} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-source-curation-ops-"));
  writeJson(root, "src/data/symbtr/catalog.generated.json", {
    entries: [{id: catalogId}],
  });
  writeJson(root, "src/data/references/auto-attached-references.json", {
    version: 1,
    matcherVersion: "test",
    references: autoAttachedReferences,
  });
  writeJson(root, "src/data/references/source-feedback-events.json", {version: 1, events: []});
  writeJson(root, "src/data/references/manual-source-corrections.json", {version: 1, corrections: []});
  writeJson(root, "src/data/references/research-source-profiles.json", {
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
  });
  writeJson(root, "src/data/references/embed-states.json", {version: 1, states: []});
  writeJson(root, "src/data/references/source-quality-stats.generated.json", {
    version: 1,
    generatedAt: null,
    stats: [],
  });
  writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {version: 1, candidates: []});
  writeJson(root, "output/external-reference-coverage/mapped-external-reference-candidates.json", {
    version: 1,
    mappings,
  });
  return root;
}

describe("source curation operations", () => {
  it("generates auto-attached references from mapping output", () => {
    const root = createRoot();
    const summary = generateAutoAttachedReferences({root, write: true});
    const state = getCurationState(root);

    expect(summary.generatedCount).toBe(1);
    expect(state.summary.autoAttachedCount).toBe(1);
    expect(summarizeCurationState(root)).toEqual(expect.objectContaining({
      autoAttachedCount: 1,
      autoAttachedReferences: 1,
      sourceQualityStats: 0,
    }));
    expect(state.autoAttachedReferences[0]).toEqual(
      expect.objectContaining({
        catalogId,
        sourceId: "youtube-test-recording",
        profileId: "youtube",
        status: "auto-attached",
        source: expect.objectContaining({url: "https://www.youtube.com/watch?v=test"}),
      }),
    );
  });

  it("classifies source quality stats from the source profile instead of source id text", () => {
    const root = createRoot({
      mappings: [
        {
          catalogId,
          status: "accepted",
          confidenceScore: 180,
          candidate: {
            source: {
              id: "neutral-score-id",
              provider: "youtube",
              url: "https://www.youtube.com/watch?v=neutral",
              title: "Neutral kayıt",
            },
          },
          alternatives: [
            {
              reasons: ["title:token-match"],
              mismatches: [],
            },
          ],
        },
      ],
    });

    generateAutoAttachedReferences({root, write: true});
    const stats = generateSourceQualityStats({root, write: true});
    const autoAttached = JSON.parse(readFileSync(path.join(root, "src/data/references/auto-attached-references.json"), "utf8"));

    expect(autoAttached.references[0]).toEqual(expect.objectContaining({
      sourceId: "neutral-score-id",
      profileId: "youtube",
    }));
    expect(stats.stats).toContainEqual(expect.objectContaining({
      profileId: "youtube",
      acceptedCount: 1,
    }));
    expect(stats.stats).not.toContainEqual(expect.objectContaining({
      profileId: "external",
      acceptedCount: 1,
    }));
  });

  it("skips needs-review mappings and prunes stale auto-attached conflicts", () => {
    const root = createRoot({
      mappings: [
        {
          catalogId,
          status: "needs-review",
          confidenceScore: 220,
          candidate: {
            source: {
              id: "youtube-conflict-recording",
              provider: "youtube",
              url: "https://www.youtube.com/watch?v=conflict",
              title: "Conflict kayıt",
            },
          },
          alternatives: [
            {
              reasons: ["title:token-match"],
              mismatches: ["usul:Düyek != sofyan"],
            },
          ],
        },
      ],
      autoAttachedReferences: [
        {
          catalogId,
          sourceId: "youtube-conflict-recording",
          status: "auto-attached",
          rank: 1,
          confidenceScore: 1,
          confidenceLevel: "conflict",
          matchReasons: ["mapping:needs-review"],
          conflicts: ["usul:Düyek != sofyan"],
          attachedAt: "2026-05-10",
          matcherVersion: "external-source-map-v1",
        },
      ],
    });

    const summary = generateAutoAttachedReferences({root, write: true});
    const state = getCurationState(root);

    expect(summary.generatedCount).toBe(0);
    expect(summary.prunedAutoAttachedCount).toBe(1);
    expect(state.summary.autoAttachedCount).toBe(0);
  });

  it("records feedback, updates reference status and generates stats", () => {
    const root = createRoot();
    generateAutoAttachedReferences({root, write: true});
    recordSourceFeedback({
      root,
      feedback: {
        eventId: "event-one",
        catalogId,
        sourceId: "youtube-test-recording",
        eventType: "user-removed",
        reason: "wrong-piece",
        createdAt: "2026-05-10",
        createdBy: "local-user",
      },
    });
    upsertManualSourceCorrection({
      root,
      correction: {
        catalogId,
        sourceId: "youtube-test-recording",
        correctTitle: "Corrected",
        updatedAt: "2026-05-10",
      },
    });
    const stats = generateSourceQualityStats({root, write: true});
    const autoAttached = JSON.parse(readFileSync(path.join(root, "src/data/references/auto-attached-references.json"), "utf8"));

    expect(autoAttached.references[0].status).toBe("user-removed");
    expect(stats.stats).toContainEqual(expect.objectContaining({
      profileId: "youtube",
      removedCount: 1,
    }));
  });

  it("records batch feedback and validates the full manifest once", () => {
    const root = createRoot({
      mappings: [
        {
          catalogId,
          status: "accepted",
          confidenceScore: 180,
          candidate: {
            source: {
              id: "youtube-test-recording",
              provider: "youtube",
              url: "https://www.youtube.com/watch?v=test",
              title: "Test kayıt",
            },
          },
          alternatives: [{reasons: ["title:token-match"], mismatches: []}],
        },
        {
          catalogId,
          status: "accepted",
          confidenceScore: 175,
          candidate: {
            source: {
              id: "youtube-second-recording",
              provider: "youtube",
              url: "https://www.youtube.com/watch?v=second",
              title: "Second kayıt",
            },
          },
          alternatives: [{reasons: ["title:token-match"], mismatches: []}],
        },
      ],
    });
    generateAutoAttachedReferences({root, write: true});

    const result = recordSourceFeedbackBatch({
      root,
      feedbackEvents: [
        {
          eventId: "event-batch-one",
          catalogId,
          sourceId: "youtube-test-recording",
          eventType: "user-approved",
          reason: "bulk-pass",
          createdAt: "2026-05-10",
          createdBy: "local-user",
        },
        {
          eventId: "event-batch-two",
          catalogId,
          sourceId: "youtube-second-recording",
          eventType: "user-removed",
          reason: "bulk-pass",
          createdAt: "2026-05-10",
          createdBy: "local-user",
        },
      ],
    });
    const autoAttached = JSON.parse(readFileSync(path.join(root, "src/data/references/auto-attached-references.json"), "utf8"));

    expect(result.eventCount).toBe(2);
    expect(autoAttached.references).toEqual(expect.arrayContaining([
      expect.objectContaining({sourceId: "youtube-test-recording", status: "user-approved"}),
      expect.objectContaining({sourceId: "youtube-second-recording", status: "user-removed"}),
    ]));
  });

  it("rejects orphan feedback, manual corrections and embed states", () => {
    const root = createRoot();
    generateAutoAttachedReferences({root, write: true});

    expect(() =>
      recordSourceFeedback({
        root,
        feedback: {
          eventId: "event-orphan",
          catalogId,
          sourceId: "missing-source",
          eventType: "user-removed",
          reason: "wrong-piece",
          createdAt: "2026-05-10",
          createdBy: "local-user",
        },
      }),
    ).toThrow("does not reference an auto-attached source");

    expect(() =>
      upsertManualSourceCorrection({
        root,
        correction: {
          catalogId,
          sourceId: "missing-source",
          correctTitle: "Wrong",
          updatedAt: "2026-05-10",
        },
      }),
    ).toThrow("does not reference an auto-attached source");

    expect(() =>
      upsertEmbedState({
        root,
        embedState: {
          sourceId: "missing-source",
          embedType: "youtube",
          canEmbed: true,
          fallbackUrl: "https://www.youtube.com/watch?v=test",
        },
      }),
    ).toThrow("does not reference an auto-attached source");
  });
});

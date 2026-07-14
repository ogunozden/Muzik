import {describe, expect, it} from "vitest";
import {
  buildSourceSuggestionEvent,
  normalizeGroundedSuggestion,
  validateSourceSuggestionManifest,
} from "../lib/source-suggestion-model.mjs";

const profiles = [
  {
    id: "example-score",
    label: "Example Score",
    baseUrl: "https://scores.example.com",
    provider: "score",
  },
];

describe("source suggestion model", () => {
  it("downgrades LLM accepted output to auto-suggested and blocks direct attach", () => {
    const suggestion = normalizeGroundedSuggestion({
      catalogId: "hicazkar--pesrev--duyek--test--besteci",
      suggestion: {
        url: "https://scores.example.com/piece",
        status: "accepted",
        title: "Test Peşrev",
        confidence: "high",
      },
      profiles,
      metadata: {title: "Test Peşrev", metadataSignals: ["html:title"]},
    });

    expect(suggestion.status).toBe("auto-suggested");
    expect(suggestion.acceptedEligible).toBe(false);
    expect(suggestion.directAutoAttach).toBe(false);
    expect(suggestion.mediaDownload).toBe(false);
    expect(suggestion.weakLabelOnly).toBe(true);
    expect(suggestion.evidence.profileMatch.verified).toBe(true);
  });

  it("defers unknown-provider suggestions until provider profile validation exists", () => {
    const suggestion = normalizeGroundedSuggestion({
      catalogId: "hicazkar--pesrev--duyek--test--besteci",
      suggestion: {
        url: "https://unknown.example.net/piece",
        status: "auto-suggested",
      },
      profiles,
    });

    expect(suggestion.status).toBe("deferred");
    expect(suggestion.validationErrors).toContain("no research source profile matched the URL host");
  });

  it("keeps invalid URLs rejected without making them importable", () => {
    const suggestion = normalizeGroundedSuggestion({
      catalogId: "hicazkar--pesrev--duyek--test--besteci",
      suggestion: {
        url: "http://scores.example.com/piece",
        status: "auto-suggested",
      },
      profiles,
    });
    const event = buildSourceSuggestionEvent({
      catalogId: suggestion.catalogId,
      sourceId: suggestion.sourceId,
      eventType: "source_suggested",
    });
    const manifest = {
      version: 1,
      type: "gemini-grounded-source-suggestions",
      suggestions: [suggestion],
      events: [event],
    };

    expect(suggestion.status).toBe("rejected");
    expect(suggestion.acceptedEligible).toBe(false);
    expect(validateSourceSuggestionManifest(manifest).errors).toEqual([]);
  });

  it("rejects suggestion manifests that try to auto attach", () => {
    const suggestion = normalizeGroundedSuggestion({
      catalogId: "hicazkar--pesrev--duyek--test--besteci",
      suggestion: {
        url: "https://scores.example.com/piece",
        status: "auto-suggested",
      },
      profiles,
    });
    suggestion.directAutoAttach = true;

    expect(validateSourceSuggestionManifest({
      version: 1,
      type: "gemini-grounded-source-suggestions",
      suggestions: [suggestion],
      events: [],
    }).errors).toContain(`source-suggestions: ${suggestion.sourceId} directAutoAttach must be false`);
  });
});

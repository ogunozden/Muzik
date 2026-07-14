import {describe, expect, it} from "vitest";
import {
  SOURCE_SUGGESTION_SYSTEM_PROMPT,
  buildGroundedSourcePrompt,
  extractSuggestionsFromGroundingMetadata,
  extractSuggestionsFromParsed,
  resolveGroundingRedirectSuggestion,
} from "../suggest-external-sources-gemini.mjs";

describe("Gemini grounded source suggestion helpers", () => {
  it("prompts for suggestions without accepted or media download output", () => {
    const prompt = buildGroundedSourcePrompt({
      catalogId: "hicazkar--pesrev--duyek--test--besteci",
      title: "Test Peşrev",
      makam: "Hicazkar",
      form: "Peşrev",
      usul: "Düyek",
      composer: "Besteci",
      priorityGroup: "pdf-and-musicxml",
      status: "needs-review",
      candidateCount: 5,
      profiles: ["youtube", "internet-archive"],
    });

    expect(SOURCE_SUGGESTION_SYSTEM_PROMPT).toContain("Never return status \"accepted\"");
    expect(SOURCE_SUGGESTION_SYSTEM_PROMPT).toContain("Do not request or imply media/PDF/audio/video download");
    expect(prompt).toContain("Search leads are suggestions only");
    expect(prompt).toContain("hicazkar--pesrev--duyek--test--besteci");
  });

  it("extracts suggestions from supported JSON response shapes", () => {
    expect(extractSuggestionsFromParsed([{url: "https://example.com"}])).toHaveLength(1);
    expect(extractSuggestionsFromParsed({suggestions: [{url: "https://example.com"}]})).toHaveLength(1);
    expect(extractSuggestionsFromParsed({sources: [{url: "https://example.com"}]})).toHaveLength(1);
    expect(extractSuggestionsFromParsed({items: []})).toEqual([]);
  });

  it("falls back to Google grounding chunks when Gemini omits JSON suggestions", () => {
    const suggestions = extractSuggestionsFromGroundingMetadata({
      groundingChunks: [
        {web: {uri: "https://archive.org/details/example", title: "Archive example"}},
        {web: {uri: "http://insecure.example", title: "Ignored"}},
      ],
    });

    expect(suggestions).toEqual([
      expect.objectContaining({
        url: "https://archive.org/details/example",
        title: "Archive example",
        status: "deferred",
        confidence: "low",
        conflicts: ["llm-json-missing"],
      }),
    ]);
  });

  it("resolves Google grounding redirect URLs without fetching final page content", async () => {
    const resolved = await resolveGroundingRedirectSuggestion(
      {
        url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/example",
        sourceProvider: "vertexaisearch.cloud.google.com",
      },
      async () => ({
        headers: {
          get: (name) => name === "location" ? "https://dilbeyti.com/besteler/38" : null,
        },
      }),
    );

    expect(resolved).toEqual(expect.objectContaining({
      url: "https://dilbeyti.com/besteler/38",
      sourceProvider: "dilbeyti.com",
      groundingRedirectUrl: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/example",
    }));
  });
});

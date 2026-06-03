import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { tokenCoverage, scoreOembedTitle, findYouTubeUrl } from "../youtube-oembed-verifier.mjs";

describe("youtube-oembed-verifier", () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: "Hicazkâr Peşrev - Tanburi Büyük Osman Bey",
        author_name: "Tanburi Büyük Osman Bey",
        provider_name: "YouTube",
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tokenCoverage computes correct coverage", () => {
    expect(tokenCoverage("test", "this is a test")).toBe(1);
    expect(tokenCoverage("hello world", "hello there")).toBe(0.5);
    expect(tokenCoverage("", "anything")).toBe(0);
    expect(tokenCoverage("x y z", "a b c")).toBe(0);
  });

  it("scoreOembedTitle matches title in oembed data", () => {
    const group = { title: "Great Song", composer: "John Smith", makam: "rast", usul: "duyek", form: "sarki" };
    const oembedData = {
      title: "Great Song - John Smith",
      author_name: "John Smith",
      provider_name: "YouTube",
    };
    const result = scoreOembedTitle(group, oembedData);
    expect(result.score).toBeGreaterThan(30);
    expect(result.titleCoverage).toBeGreaterThan(0);
    expect(result.composerCoverage).toBeGreaterThan(0);
  });

  it("findYouTubeUrl returns null when no URL in inbox", () => {
    const group = { catalogId: "nonexistent--form--usul--title--composer" };
    const url = findYouTubeUrl(group, null);
    expect(url).toBeNull();
  });
});

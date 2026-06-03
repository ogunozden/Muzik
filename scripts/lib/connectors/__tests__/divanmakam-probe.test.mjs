import { describe, expect, it, vi } from "vitest";
import { tokenCoverage, scoreKnownSitePage, searchDivanMakam } from "../divanmakam-probe.mjs";

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<a class="result__a" href="https://divanmakam.com/forum/example.12345/">Example</a>'),
        title: vi.fn().mockResolvedValue("Test Title - Muhayyer"),
        $eval: vi.fn().mockImplementation((sel) => {
          if (sel.includes('og:title')) return Promise.resolve("Test Title - Muhayyer");
          if (sel.includes('og:description')) return Promise.resolve("Test Description");
          return Promise.resolve("body text");
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("divanmakam-probe", () => {
  it("tokenCoverage computes correct coverage", () => {
    expect(tokenCoverage("test", "this is a test")).toBe(1);
    expect(tokenCoverage("hello world", "hello there")).toBe(0.5);
    expect(tokenCoverage("", "anything")).toBe(0);
    expect(tokenCoverage("x y z", "a b c")).toBe(0);
  });

  it("scoreKnownSitePage returns completeEvidence for perfect match", () => {
    const group = { title: "Test Title", composer: "Muhayyer", makam: "muhayyer", usul: "duyek", form: "ilahi" };
    const probe = { text: "Test Title - Muhayyer muhayyer duyek ilahi", url: "https://divanmakam.com/1" };
    const result = scoreKnownSitePage(group, probe);
    expect(result.score).toBeGreaterThan(50);
    expect(result.completeEvidence).toBe(true);
  });

  it("searchDivanMakam returns divanmakam URLs", async () => {
    const links = await searchDivanMakam("Muhayyer İlahi", 5000);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toContain('divanmakam.com');
    }
  });
});

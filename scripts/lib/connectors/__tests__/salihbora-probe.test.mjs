import { describe, expect, it, vi } from "vitest";
import { tokenCoverage, scoreKnownSitePage, searchSalihBora } from "../salihbora-probe.mjs";

vi.mock('playwright', () => ({ chromium: { launch: vi.fn() } }));

describe("salihbora probe", () => {
  it("tokenCoverage computes correct coverage", () => {
    expect(tokenCoverage("Allah Emrin", "Ussak Ilahi Allah Emrin Tutalim Zekai Dede")).toBe(1);
    expect(tokenCoverage("Allah Emrin Tutalim", "Ussak Ilahi Allah Emrin Zekai Dede")).toBe(2 / 3);
    expect(tokenCoverage("Bilinmeyen Eser", "Ussak Ilahi Allah Emrin Tutalim")).toBe(0);
    expect(tokenCoverage("Zekai Dede", "Zekai Dede bestesi")).toBe(1);
    expect(tokenCoverage("", "some text")).toBe(0);
    expect(tokenCoverage("test", "")).toBe(0);
    expect(tokenCoverage("Allah Emrin Tutalim", "Allah emrin tutalim notasi")).toBe(1);
  });

  it("scoreKnownSitePage returns completeEvidence for full match", () => {
    const group = {
      title: "Allah Emrin",
      composer: "Zekai Dede",
      makam: "Ussak",
      usul: "Duyek",
      form: "Ilahi",
    };
    const probe = {
      url: "https://www.salihbora.com/nota/allah-emrin-tutalim",
      htmlTitle: "Allah Emrin Tutalim - Zekai Dede - Salih Bora",
      bodyText: "Ussak Ilahi Duyek usulunde Allah Emrin Tutalim bestesi Zekai Dede",
      text: "Allah Emrin Tutalim - Zekai Dede - Salih Bora Ussak Ilahi Duyek usulunde Allah Emrin Tutalim bestesi Zekai Dede",
    };

    const result = scoreKnownSitePage(group, probe);

    expect(result.titleCoverage).toBeGreaterThanOrEqual(0.9);
    expect(result.composerCoverage).toBeGreaterThanOrEqual(0.75);
    expect(result.completeEvidence).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("search filters for salihbora.com URLs only", async () => {
    const { chromium } = await import("playwright");
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue(`
        <html>
          <body>
            <a class="result__a" href="https://www.salihbora.com/nota/allah-emrin">Allah Emrin</a>
            <a class="result__a" href="https://divanmakam.com/forum/nota/allah-emrin">DivanMakam</a>
            <a class="result__a" href="https://www.salihbora.com/nota/ussak-ilahi">Ussak Ilahi</a>
            <a class="result__a" href="https://example.com/nota">Example</a>
          </body>
        </html>
      `),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue(mockBrowser);

    const links = await searchSalihBora('site:salihbora.com "Allah Emrin"', 8000);

    expect(links).toEqual([
      "https://www.salihbora.com/nota/allah-emrin",
      "https://www.salihbora.com/nota/ussak-ilahi",
    ]);
    expect(links.every(link => link.includes("salihbora.com"))).toBe(true);
  });
});

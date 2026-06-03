import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPage, mockBrowser } = vi.hoisted(() => {
  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue("Rast Pesrev - Tanburi Cemil Bey | OGM Materyal"),
    $eval: vi.fn().mockResolvedValue("Rast Pesrev Tanburi Cemil Bey OGM Materyal Egitim Bilisim Agi"),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue('<html><body><a class="result__a" href="https://ogmmateryal.eba.gov.tr/rast-pesrev">link</a></body></html>'),
  };
  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { mockPage: page, mockBrowser: browser };
});

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

import { tokenCoverage, scoreKnownSitePage, probePage } from "../ogm-materyal-probe.mjs";
import { chromium } from "playwright";

beforeEach(() => {
  vi.clearAllMocks();
  const mockedLaunch = vi.mocked(chromium.launch);
  mockedLaunch.mockResolvedValue(mockBrowser);
  mockPage.title.mockResolvedValue("Rast Pesrev - Tanburi Cemil Bey | OGM Materyal");
  mockPage.$eval.mockResolvedValue("Rast Pesrev Tanburi Cemil Bey OGM Materyal Egitim Bilisim Agi");
  mockBrowser.newPage.mockResolvedValue(mockPage);
  mockBrowser.close.mockResolvedValue(undefined);
});

describe("ogm-materyal-probe", () => {
  describe("tokenCoverage", () => {
    it("computes correct coverage", () => {
      expect(tokenCoverage("Rast Pesrev", "Rast Pesrev Tanburi Cemil Bey notalar")).toBe(1);
      expect(tokenCoverage("Tanburi Cemil Bey", "Rast Pesrev Tanburi Cemil Bey notalar")).toBe(1);
      expect(tokenCoverage("Hicaz", "Rast Pesrev Tanburi Cemil Bey notalar")).toBe(0);
      expect(tokenCoverage("Rast Pesrev Tanburi", "Rast Pesrev Tanburi Cemil Bey notalar")).toBe(1);
      expect(tokenCoverage("", "anything")).toBe(0);
      expect(tokenCoverage("test", "")).toBe(0);
      expect(tokenCoverage(null, "anything")).toBe(0);
      expect(tokenCoverage("Rast Pesrev", null)).toBe(0);
    });
  });

  describe("scoreKnownSitePage", () => {
    it("returns completeEvidence for perfect match", () => {
      const group = {
        title: "Rast Pesrev",
        composer: "Tanburi Cemil Bey",
        makam: "Rast",
        usul: "Duyek",
        form: "Pesrev",
      };
      const probe = {
        url: "https://ogmmateryal.eba.gov.tr/rast-pesrev",
        htmlTitle: "Rast Pesrev - Tanburi Cemil Bey | OGM Materyal",
        text: "Rast Pesrev Tanburi Cemil Bey Rast Duyek Pesrev OGM Materyal Egitim Bilisim Agi",
      };
      const result = scoreKnownSitePage(group, probe);
      expect(result.score).toBe(100);
      expect(result.completeEvidence).toBe(true);
      expect(result.titleCoverage).toBe(1);
      expect(result.composerCoverage).toBe(1);
      expect(result.makamCoverage).toBe(1);
      expect(result.usulCoverage).toBe(1);
      expect(result.formCoverage).toBe(1);
    });
  });

  describe("probePage", () => {
    it("extracts title from OGM page HTML", async () => {
      mockPage.title.mockResolvedValue("Rast Pesrev - Tanburi Cemil Bey | OGM Materyal");
      mockPage.$eval.mockResolvedValue("Rast Pesrev Tanburi Cemil Bey OGM Materyal");

      const result = await probePage("https://ogmmateryal.eba.gov.tr/rast-pesrev", 8000);

      expect(result.url).toBe("https://ogmmateryal.eba.gov.tr/rast-pesrev");
      expect(result.htmlTitle).toBe("Rast Pesrev - Tanburi Cemil Bey | OGM Materyal");
      expect(result.text).toContain("Rast Pesrev");
      expect(result.text).toContain("Tanburi Cemil Bey");
      expect(result.text).toContain("OGM Materyal");
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});

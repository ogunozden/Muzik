import {describe, expect, it} from "vitest";
import {
  clamp,
  clampBpm,
  estimateScorePageIndex,
  estimateScorePageProgress,
  formatBeatLabel,
  formatCatalogSegment,
  formatFrequency,
  formatTime,
  getPlaybackEventPosition,
  isHttpUrl,
  makeLayerId,
  makeVisualPieceSignature,
  MAX_BPM,
  MIN_BPM,
  repeatNotesForLoop,
  wrapPlaybackPosition,
} from "../follow-helpers";

describe("follow-helpers", () => {
  describe("repeatNotesForLoop", () => {
    it("bolge notalarini bolge suresi kadar ofsetlenmis kopyalarla tekrar eder", () => {
      const notes = [
        {startTime: 1, id: "a"},
        {startTime: 1.5, id: "b"},
      ];
      const repeated = repeatNotesForLoop(notes, 1, 2, 7);

      // (7 - 1) / 2 = 3 tekrar; her nota 0, 2, 4 ofsetli olarak cikar.
      expect(repeated).toHaveLength(6);
      // flatMap once notalari, sonra kopyalari uretir: her nota 0, 2, 4 ofsetli.
      expect(repeated.map((note) => note.startTime)).toEqual([1, 3, 5, 1.5, 3.5, 5.5]);
      expect(repeated[2]).toMatchObject({id: "a"});
      expect(repeated[3]).toMatchObject({id: "b"});
    });

    it("gecersiz bolge girdisinde notalari oldugu gibi dondurur", () => {
      const notes = [{startTime: 0, id: "a"}];
      expect(repeatNotesForLoop(notes, 0, 0, 5)).toEqual(notes);
      expect(repeatNotesForLoop([], 0, 2, 5)).toEqual([]);
    });
  });

  describe("wrapPlaybackPosition", () => {
    it("bolge icindeki konumu korur, disindakini bolgeye sarar", () => {
      expect(wrapPlaybackPosition(1.5, 1, 2)).toBeCloseTo(1.5);
      expect(wrapPlaybackPosition(4.2, 1, 2)).toBeCloseTo(2.2);
      expect(wrapPlaybackPosition(5, 1, 2)).toBeCloseTo(1);
    });

    it("bolge oncesi konumu degistirmez; gecersiz bolgede ham degeri dondurur", () => {
      expect(wrapPlaybackPosition(0.5, 1, 2)).toBeCloseTo(0.5);
      expect(wrapPlaybackPosition(3, 1, 0)).toBeCloseTo(3);
    });
  });

  describe("clampBpm", () => {
    it("clamps below minimum to MIN_BPM", () => {
      expect(clampBpm(10)).toBe(MIN_BPM);
    });

    it("clamps above maximum to MAX_BPM", () => {
      expect(clampBpm(999)).toBe(MAX_BPM);
    });

    it("returns the fallback when value is not finite", () => {
      expect(clampBpm(Number.NaN, 96)).toBe(96);
    });

    it("rounds an in-range value", () => {
      expect(clampBpm(95.4)).toBe(95);
    });
  });

  describe("clamp", () => {
    it("bounds a value within the range", () => {
      expect(clamp(5, 0, 3)).toBe(3);
      expect(clamp(-1, 0, 3)).toBe(0);
      expect(clamp(2, 0, 3)).toBe(2);
    });
  });

  describe("isHttpUrl", () => {
    it("accepts http and https", () => {
      expect(isHttpUrl("https://example.com")).toBe(true);
      expect(isHttpUrl("http://example.com")).toBe(true);
    });

    it("rejects empty, non-url and other schemes", () => {
      expect(isHttpUrl("")).toBe(false);
      expect(isHttpUrl("not a url")).toBe(false);
      expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    });
  });

  describe("formatTime", () => {
    it("formats minutes and zero-padded seconds", () => {
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(65)).toBe("1:05");
      expect(formatTime(600)).toBe("10:00");
    });
  });

  describe("formatFrequency", () => {
    it("returns Hazır for falsy values", () => {
      expect(formatFrequency(null)).toBe("Hazır");
      expect(formatFrequency(0)).toBe("Hazır");
    });

    it("formats a frequency with two decimals", () => {
      expect(formatFrequency(440)).toBe("440.00 Hz");
    });
  });

  describe("formatBeatLabel", () => {
    it("keeps integers plain and rounds fractionals to one decimal", () => {
      expect(formatBeatLabel(4)).toBe("4");
      expect(formatBeatLabel(4.5)).toBe("4.5");
    });
  });

  describe("formatCatalogSegment", () => {
    it("title-cases underscore/space separated segments (tr locale)", () => {
      expect(formatCatalogSegment("aldanma_dunya")).toBe("Aldanma Dunya");
    });
  });

  describe("getPlaybackEventPosition", () => {
    it("returns -1 when there are no events", () => {
      expect(getPlaybackEventPosition(0, -1, 50)).toBe(-1);
    });

    it("uses the explicit current position when provided", () => {
      expect(getPlaybackEventPosition(10, 3, 0)).toBe(3);
    });

    it("estimates from progress when no explicit position", () => {
      expect(getPlaybackEventPosition(10, -1, 50)).toBe(5);
    });
  });

  describe("estimateScorePageIndex", () => {
    it("returns -1 when there are no pages", () => {
      expect(estimateScorePageIndex(0, 100, 50)).toBe(-1);
    });

    it("maps the current beat into a page index", () => {
      expect(estimateScorePageIndex(4, 100, 75)).toBe(3);
      expect(estimateScorePageIndex(4, 100, 0)).toBe(0);
    });
  });

  describe("estimateScorePageProgress", () => {
    it("returns 0 for invalid inputs", () => {
      expect(estimateScorePageProgress(0, 100, 50, 0)).toBe(0);
    });

    it("returns page-local progress percentage", () => {
      expect(estimateScorePageProgress(4, 100, 25, 0)).toBeCloseTo(100, 5);
    });
  });

  describe("makeLayerId", () => {
    it("returns the base id when unused", () => {
      expect(makeLayerId("ney", new Set())).toBe("ney");
    });

    it("suffixes to avoid collisions", () => {
      expect(makeLayerId("ney", new Set(["ney"]))).toBe("ney-2");
      expect(makeLayerId("ney", new Set(["ney", "ney-2"]))).toBe("ney-3");
    });
  });

  describe("makeVisualPieceSignature", () => {
    it("is order-independent over the image set", () => {
      const imagesA = [
        {name: "b.png", size: 2, type: "image/png", url: "blob:b"},
        {name: "a.png", size: 1, type: "image/png", url: "blob:a"},
      ];
      const imagesB = [
        {name: "a.png", size: 1, type: "image/png", url: "blob:a"},
        {name: "b.png", size: 2, type: "image/png", url: "blob:b"},
      ];
      expect(makeVisualPieceSignature("Rast", imagesA)).toBe(makeVisualPieceSignature("Rast", imagesB));
    });
  });
});

import {describe, expect, it} from "vitest";
import {
  createSourcesFromCliOptions,
  extractUrlsFromText,
  normalizeIncomingSource,
  parseCliOptions,
  parseSourceInput,
  stageExternalSources,
} from "../external-source-intake.mjs";
import {mkdtempSync, mkdirSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

describe("external source intake", () => {
  it("extracts HTTPS source URLs from pasted text", () => {
    const urls = extractUrlsFromText(`
      DîvânMakam: https://divanmakam.com/forum/foo.12345/.
      YouTube: https://youtu.be/NwbNZN75bR8)
    `);

    expect(urls).toEqual(["https://divanmakam.com/forum/foo.12345/", "https://youtu.be/NwbNZN75bR8"]);
  });

  it("turns CLI flags into a catalog-aware source", () => {
    const options = parseCliOptions([
      "--url",
      "https://divanmakam.com/forum/toprakta-yatacak.35720/",
      "--title",
      "Toprakta Yatacak Teni Tenim Var",
      "--makam",
      "Muhayyer",
      "--form",
      "İlahi",
      "--usul",
      "Düyek",
      "--composer",
      "Dede Efendi",
      "--checked-at",
      "2026-05-10",
    ]);

    expect(createSourcesFromCliOptions(options)).toEqual([
      expect.objectContaining({
        url: "https://divanmakam.com/forum/toprakta-yatacak.35720/",
        title: "Toprakta Yatacak Teni Tenim Var",
        checkedAt: "2026-05-10",
        observed: {
          makam: "Muhayyer",
          form: "İlahi",
          usul: "Düyek",
          composer: "Dede Efendi",
        },
      }),
    ]);
  });

  it("normalizes providers and YouTube URL identity inputs", () => {
    expect(
      normalizeIncomingSource({
        url: "https://www.youtube.com/watch?v=NwbNZN75bR8&t=12s",
        checkedAt: "2026-05-10",
      }),
    ).toEqual(
      expect.objectContaining({
        provider: "youtube",
        sourceProvider: "youtube.com",
        checkedAt: "2026-05-10",
      }),
    );
  });

  it("parses CSV source batches", () => {
    const sources = parseSourceInput(
      [
        "url,title,makam,form,usul,composer,checked_at",
        "https://example.com/score,Example Title,Uşşak,İlahi,Düyek,Zekai Dede,2026-05-10",
      ].join("\n"),
      "sources.csv",
    );

    expect(sources).toEqual([
      {
        url: "https://example.com/score",
        title: "Example Title",
        checkedAt: "2026-05-10",
        observed: {
          makam: "Uşşak",
          form: "İlahi",
          usul: "Düyek",
          composer: "Zekai Dede",
        },
      },
    ]);
  });

  it("stages new sources and skips normalized duplicates", () => {
    const root = mkdtempSync(path.join(tmpdir(), "muzik-external-source-intake-"));
    mkdirSync(path.join(root, "src", "data", "references"), {recursive: true});
    writeFileSync(
      path.join(root, "src", "data", "references", "external-source-inbox.json"),
      `${JSON.stringify({
        version: 1,
        sources: [
          {
            id: "youtube-existing",
            provider: "youtube",
            url: "https://youtu.be/NwbNZN75bR8",
            checkedAt: "2026-05-10",
          },
        ],
      })}\n`,
    );

    const summary = stageExternalSources({
      root,
      cliSources: [
        {
          url: "https://www.youtube.com/watch?v=NwbNZN75bR8&t=12s",
          checkedAt: "2026-05-10",
        },
        {
          url: "https://divanmakam.com/forum/example.1/",
          title: "Example",
          checkedAt: "2026-05-10",
        },
      ],
    });

    expect(summary).toEqual(
      expect.objectContaining({
        incomingCount: 2,
        addedCount: 1,
        skippedDuplicateCount: 1,
        outputSourceCount: 2,
      }),
    );
  });
});

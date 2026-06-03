import {describe, expect, it} from "vitest";
import {
  createSourcesFromCliOptions,
  extractUrlsFromText,
  normalizeIncomingSource,
  parseCliOptions,
  parseSourceInput,
  stageExternalSources,
} from "../external-source-intake.mjs";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
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
      "--lyricist",
      "Yunus Emre",
      "--lyrics",
      "Toprakta yatacak teni tenim var",
      "--html-title",
      "Toprakta Yatacak Teni Tenim Var - DîvânMakam",
      "--oembed-title",
      "Toprakta Yatacak Teni Tenim Var",
      "--oembed-author",
      "Dede Efendi",
      "--schema-name",
      "Toprakta Yatacak Teni Tenim Var",
      "--schema-composer",
      "Dede Efendi",
      "--schema-lyricist",
      "Yunus Emre",
      "--metadata-signal",
      "html:og-title",
      "--metadata-signal",
      "youtube:oembed-title",
      "--oembed-verified",
      "--author",
      "Dede Efendi",
      "--thumbnail-url",
      "https://i.ytimg.com/vi/NwbNZN75bR8/hqdefault.jpg",
      "--checked-at",
      "2026-05-10",
    ]);

    expect(createSourcesFromCliOptions(options)).toEqual([
      expect.objectContaining({
        url: "https://divanmakam.com/forum/toprakta-yatacak.35720/",
        title: "Toprakta Yatacak Teni Tenim Var",
        checkedAt: "2026-05-10",
        author: "Dede Efendi",
        thumbnailUrl: "https://i.ytimg.com/vi/NwbNZN75bR8/hqdefault.jpg",
        oembedVerified: true,
        metadata: {
          htmlTitle: "Toprakta Yatacak Teni Tenim Var - DîvânMakam",
          oembedTitle: "Toprakta Yatacak Teni Tenim Var",
          oembedAuthor: "Dede Efendi",
          schemaName: "Toprakta Yatacak Teni Tenim Var",
          schemaComposer: "Dede Efendi",
          schemaLyricist: "Yunus Emre",
          signals: ["html:og-title", "youtube:oembed-title"],
        },
        observed: {
          makam: "Muhayyer",
          form: "İlahi",
          usul: "Düyek",
          composer: "Dede Efendi",
          lyricist: "Yunus Emre",
          lyrics: "Toprakta yatacak teni tenim var",
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

  it("preserves structured metadata through source normalization", () => {
    expect(
      normalizeIncomingSource({
        url: "https://www.youtube.com/watch?v=NwbNZN75bR8",
        checkedAt: "2026-05-10",
        oembedVerified: true,
        metadata: {
          htmlTitle: "Allah Emrin Tutalım",
          htmlDescription: "",
          oembedTitle: "Allah Emrin Tutalım Zekai Dede",
          oembedAuthor: "Zekai Dede",
          schemaName: "Allah Emrin Tutalım",
          schemaComposer: "Zekai Dede",
          signals: ["html:og-title", "", "youtube:oembed-author"],
        },
      }),
    ).toEqual(
      expect.objectContaining({
        provider: "youtube",
        oembedVerified: true,
        metadata: {
          htmlTitle: "Allah Emrin Tutalım",
          oembedTitle: "Allah Emrin Tutalım Zekai Dede",
          oembedAuthor: "Zekai Dede",
          schemaName: "Allah Emrin Tutalım",
          schemaComposer: "Zekai Dede",
          signals: ["html:og-title", "youtube:oembed-author"],
        },
      }),
    );
  });

  it("parses CSV source batches", () => {
    const sources = parseSourceInput(
      [
        "url,title,makam,form,usul,composer,checked_at,html_title,oembed_title,oembed_author,schema_name,schema_composer,metadata_signals,oembed_verified",
        "https://example.com/score,Example Title,Uşşak,İlahi,Düyek,Zekai Dede,2026-05-10,Example HTML Title,Example oEmbed Title,Zekai Dede,Example Schema Title,Zekai Dede,html:title;schema:name,true",
      ].join("\n"),
      "sources.csv",
    );

    expect(sources).toEqual([
      {
        url: "https://example.com/score",
        title: "Example Title",
        checkedAt: "2026-05-10",
        oembedVerified: true,
        metadata: {
          htmlTitle: "Example HTML Title",
          oembedTitle: "Example oEmbed Title",
          oembedAuthor: "Zekai Dede",
          schemaName: "Example Schema Title",
          schemaComposer: "Zekai Dede",
          signals: ["html:title", "schema:name"],
        },
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
          catalogId: "test-catalog-id",
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

  it("normalizeIncomingSource adds status:'staged'", () => {
    const source = normalizeIncomingSource({
      url: "https://divanmakam.com/forum/example.1/",
      catalogId: "test-catalog-id",
      title: "Example",
      checkedAt: "2026-05-10",
    });

    expect(source).toEqual(
      expect.objectContaining({
        provider: "score",
        status: "staged",
      }),
    );
  });

  it("stageExternalSources reads and writes {version,sources} envelope", () => {
    const root = mkdtempSync(path.join(tmpdir(), "muzik-external-source-intake-env-"));
    mkdirSync(path.join(root, "src", "data", "references"), {recursive: true});
    const inboxPath = path.join(root, "src", "data", "references", "external-source-inbox.json");

    writeFileSync(
      inboxPath,
      JSON.stringify([
        {
          id: "bare-array-source",
          provider: "score",
          url: "https://example.com/bare-array",
          checkedAt: "2026-05-10",
        },
      ]),
    );

    stageExternalSources({
      root,
      cliSources: [
        {
          url: "https://divanmakam.com/forum/new-example.1/",
          catalogId: "new-test-catalog",
          title: "New Example",
          checkedAt: "2026-05-10",
        },
      ],
    });

    const written = JSON.parse(readFileSync(inboxPath, "utf8"));
    expect(written).toEqual(
      expect.objectContaining({
        version: 1,
        sources: expect.arrayContaining([
          expect.objectContaining({id: "bare-array-source"}),
          expect.objectContaining({title: "New Example"}),
        ]),
      }),
    );
  });

  it("id format compatibility with discovery agent", () => {
    const root = mkdtempSync(path.join(tmpdir(), "muzik-external-source-intake-disc-"));
    mkdirSync(path.join(root, "src", "data", "references"), {recursive: true});
    const inboxPath = path.join(root, "src", "data", "references", "external-source-inbox.json");

    writeFileSync(
      inboxPath,
      JSON.stringify({
        version: 1,
        sources: [
          {
            id: "test-entry-1:divanmakam:1749000000000",
            catalogId: "test-entry-1",
            sourceUrl: "https://divanmakam.com/forum/auto-discovered.12345/",
            sourceTitle: "Auto Discovered Title",
            provider: "divanmakam",
            status: "pending",
            submittedAt: "2026-06-03T00:00:00.000Z",
            notes: "auto-discovered via divanmakam",
          },
        ],
      }),
    );

    const summary = stageExternalSources({
      root,
      cliSources: [
        {
          url: "https://divanmakam.com/forum/new-score.99999/",
          catalogId: "another-catalog-id",
          title: "New Score",
          checkedAt: "2026-06-03",
        },
      ],
    });

    const written = JSON.parse(readFileSync(inboxPath, "utf8"));

    const migrated = written.sources.find((s) => s.id === "test-entry-1:divanmakam:1749000000000");
    expect(migrated).toBeDefined();
    expect(migrated.url).toBe("https://divanmakam.com/forum/auto-discovered.12345/");
    expect(migrated.title).toBe("Auto Discovered Title");
    expect(summary.addedCount).toBe(1);
    expect(written.sources).toHaveLength(2);
  });
});

import {describe, expect, it} from "vitest";
import {
  inferProvider,
  mapInboxSource,
  normalizeText,
  scoreCatalogEntry,
} from "../external-source-matcher.mjs";

const catalogEntries = [
  {
    id: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
    makam: "Ussak",
    form: "İlahi",
    usul: "Duyek",
    title: "Allah Emrin Tutalım",
    composer: "Zekai Dede",
    lyricist: "Yunus Emre",
  },
  {
    id: "rast--sarki--sofyan--baska_eser--diger_besteci",
    makam: "Rast",
    form: "Sarki",
    usul: "Sofyan",
    title: "Başka Eser",
    composer: "Diğer Besteci",
  },
];

describe("external source matcher", () => {
  it("normalizes Turkish text consistently for catalog matching", () => {
    expect(normalizeText("Uşşak İlâhî - Düyek")).toBe("ussak ilahi duyek");
  });

  it("accepts an explicit catalog id when metadata agrees", () => {
    const source = {
      id: "ogm-allah-emrin",
      catalogId: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
      provider: "score",
      url: "https://ogmmateryal.eba.gov.tr/example",
      title: "Allah Emrin Tutalım",
      checkedAt: "2026-05-10",
      observed: {
        title: "Allah Emrin Tutalım",
        makam: "Uşşak",
        form: "İlahi",
        usul: "Düyek",
        composer: "Zekai Dede",
      },
    };

    const mapping = mapInboxSource(source, catalogEntries);

    expect(mapping.status).toBe("accepted");
    expect(mapping.catalogId).toBe(source.catalogId);
    expect(mapping.alternatives[0]).toEqual(
      expect.objectContaining({
        catalogId: source.catalogId,
        reasons: expect.arrayContaining(["makam:exact", "form:exact", "usul:exact", "title:token-match", "composer:token-match"]),
      }),
    );
  });

  it("keeps metadata conflicts in review even when the title overlaps", () => {
    const source = {
      id: "conflicted-source",
      provider: "score",
      url: "https://example.com/allah-emrin",
      title: "Allah Emrin Tutalım",
      checkedAt: "2026-05-10",
      observed: {
        title: "Allah Emrin Tutalım",
        makam: "Rast",
        form: "İlahi",
        usul: "Düyek",
        composer: "Zekai Dede",
      },
    };

    const mapping = mapInboxSource(source, catalogEntries);

    expect(mapping.status).toBe("needs-review");
    expect(mapping.reason).toContain("Catalog metadata mismatch");
    expect(mapping.alternatives[0].mismatches).toEqual(["makam:Rast != Ussak"]);
  });

  it("infers provider when UI submits provider auto", () => {
    expect(inferProvider({provider: "auto", url: "https://youtu.be/NwbNZN75bR8"})).toBe("youtube");
    expect(inferProvider({provider: "auto", url: "https://github.com/MTG/SymbTr"})).toBe("github");
    expect(inferProvider({provider: "auto", url: "https://divanmakam.com/forum/example"})).toBe("score");
  });

  it("scores title, composer and core metadata as explainable evidence", () => {
    const score = scoreCatalogEntry(
      {
        url: "https://example.com",
        title: "Allah Emrin Tutalım Rahmetine Batalım",
        observed: {
          makam: "Uşşak",
          form: "İlahi",
          usul: "Düyek",
          composer: "Zekai Dede",
          lyricist: "Yunus Emre",
          lyrics: "Allah emrin tutalım rahmetine batalım",
        },
      },
      catalogEntries[0],
    );

    expect(score.score).toBeGreaterThanOrEqual(190);
    expect(score.mismatches).toEqual([]);
    expect(score.reasons).toEqual(expect.arrayContaining([
      "title:token-match",
      "composer:token-match",
      "lyricist:token-match",
      "lyrics:title-token-match",
    ]));
  });

  it("uses HTML and oEmbed metadata as structured scoring evidence", () => {
    const score = scoreCatalogEntry(
      {
        url: "https://www.youtube.com/watch?v=test",
        sourceProvider: "youtube.com",
        metadata: {
          htmlTitle: "Allah Emrin Tutalım - Uşşak İlahi",
          oembedTitle: "Allah Emrin Tutalım Zekai Dede",
          oembedAuthor: "Zekai Dede",
          oembedProvider: "YouTube",
          signals: ["html:og-title", "youtube:oembed-title", "youtube:oembed-author"],
        },
      },
      catalogEntries[0],
    );

    expect(score.score).toBeGreaterThanOrEqual(120);
    expect(score.reasons).toEqual(expect.arrayContaining([
      "metadata-title:token-match",
      "metadata-author:token-match",
      "metadata-signal:html:og-title",
      "metadata-signal:youtube:oembed-title",
    ]));
  });

  it("uses schema.org music metadata as structured scoring evidence", () => {
    const score = scoreCatalogEntry(
      {
        url: "https://example.com/schema-score",
        metadata: {
          schemaName: "Allah Emrin Tutalım",
          schemaComposer: "Zekai Dede",
          schemaLyricist: "Yunus Emre",
          schemaLyrics: "Allah emrin tutalım rahmetine batalım",
          signals: ["schema:musiccomposition", "schema:composer", "schema:lyrics"],
        },
      },
      catalogEntries[0],
    );

    expect(score.score).toBeGreaterThanOrEqual(100);
    expect(score.reasons).toEqual(expect.arrayContaining([
      "schema-title:token-match",
      "schema-composer:token-match",
      "schema-lyricist:token-match",
      "schema-lyrics:token-match",
      "metadata-signal:schema:musiccomposition",
    ]));
  });
});

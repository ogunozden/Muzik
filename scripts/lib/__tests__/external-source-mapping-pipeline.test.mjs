import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  enrichExternalSource,
  mergeAcceptedCandidates,
  runExternalSourceMappingPipeline,
} from "../external-source-mapping-pipeline.mjs";

const catalogEntry = {
  id: "ussak--ilahi--duyek--allah_emrin--zekai_dede",
  makam: "Ussak",
  form: "İlahi",
  usul: "Duyek",
  title: "Allah Emrin Tutalım",
  composer: "Zekai Dede",
  lyricist: "Yunus Emre",
};

function writeJson(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createMappingRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-external-source-mapping-"));
  writeJson(root, "src/data/symbtr/catalog.generated.json", {entries: [catalogEntry]});
  writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {version: 1, candidates: []});
  writeJson(root, "src/data/references/external-source-inbox.json", {
    version: 1,
    sources: [
      {
        id: "ogm-allah-emrin",
        catalogId: catalogEntry.id,
        provider: "score",
        url: "https://ogmmateryal.eba.gov.tr/example",
        title: "Allah Emrin Tutalım",
        checkedAt: "2026-05-10",
        observed: {
          makam: "Uşşak",
          form: "İlahi",
          usul: "Düyek",
          composer: "Zekai Dede",
        },
      },
    ],
  });
  return root;
}

describe("external source mapping pipeline", () => {
  it("enriches HTML and YouTube metadata without losing provenance signals", async () => {
    const fetchImpl = async (url) => {
      if (String(url).includes("youtube.com/oembed")) {
        return {
          ok: true,
          json: async () => ({
            title: "Allah Emrin Tutalım Zekai Dede",
            author_name: "Zekai Dede",
            provider_name: "YouTube",
            thumbnail_url: "https://i.ytimg.com/vi/test/default.jpg",
          }),
        };
      }

      return {
        ok: true,
        headers: new Headers({"content-type": "text/html"}),
        text: async () => `
          <html>
            <head>
              <meta property="og:title" content="Allah Emrin Tutalım">
              <meta name="description" content="Uşşak ilahi notası">
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "MusicComposition",
                  "name": "Allah Emrin Tutalım",
                  "composer": {"name": "Zekai Dede"},
                  "lyricist": {"name": "Yunus Emre"}
                }
              </script>
            </head>
          </html>
        `,
      };
    };

    const enriched = await enrichExternalSource(
      {
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=test",
        checkedAt: "2026-05-10",
      },
      {fetchPageMetadataEnabled: true, verifyYoutubeOembed: true, fetchImpl},
    );

    expect(enriched).toEqual(expect.objectContaining({
      oembedVerified: true,
      verification: "oembed",
      title: "Allah Emrin Tutalım",
      author: "Zekai Dede",
    }));
    expect(enriched.metadata.signals).toEqual(expect.arrayContaining([
      "html:og-title",
      "html:description",
      "schema:musiccomposition",
      "schema:composer",
      "youtube:oembed-title",
      "youtube:oembed-author",
    ]));
    expect(enriched.metadata).toEqual(expect.objectContaining({
      schemaName: "Allah Emrin Tutalım",
      schemaComposer: "Zekai Dede",
      schemaLyricist: "Yunus Emre",
    }));
  });

  it("merges only new accepted candidates by catalog source id or accepted URL identity", () => {
    const existing = [
      {
        catalogId: catalogEntry.id,
        status: "accepted",
        source: {
          id: "youtube-existing",
          provider: "youtube",
          url: "https://youtu.be/NwbNZN75bR8",
        },
      },
    ];
    const incoming = [
      {
        catalogId: catalogEntry.id,
        status: "accepted",
        source: {
          id: "youtube-duplicate-url",
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=NwbNZN75bR8&t=12",
        },
      },
      {
        catalogId: "rast--sarki--sofyan--baska_eser--diger_besteci",
        status: "accepted",
        source: {
          id: "score-new",
          provider: "score",
          url: "https://example.com/score-new",
        },
      },
      {
        catalogId: catalogEntry.id,
        status: "needs-review",
        source: {
          id: "review-only",
          provider: "score",
          url: "https://example.com/review-only",
        },
      },
    ];

    const result = mergeAcceptedCandidates(existing, incoming);

    expect(result.added).toHaveLength(1);
    expect(result.skipped).toHaveLength(2);
    expect(result.merged.map((candidate) => candidate.source.id)).toEqual(["youtube-existing", "score-new"]);
  });

  it("runs the batch mapping pipeline and writes accepted-only output artifacts", async () => {
    const root = createMappingRoot();
    const summary = await runExternalSourceMappingPipeline({root, shouldWrite: true});

    expect(summary).toEqual(expect.objectContaining({
      sourceCount: 1,
      acceptedCount: 1,
      addedCandidateCount: 1,
      wroteBulkManifest: true,
    }));

    const output = JSON.parse(
      readFileSync(path.join(root, "output/external-reference-coverage/mapped-external-reference-candidates.json"), "utf8"),
    );
    const bulkManifest = JSON.parse(
      readFileSync(path.join(root, "src/data/references/external-reference-bulk-candidates.json"), "utf8"),
    );

    expect(output.candidates).toHaveLength(1);
    expect(bulkManifest.candidates).toEqual([
      expect.objectContaining({
        catalogId: catalogEntry.id,
        status: "accepted",
      }),
    ]);
  });
});

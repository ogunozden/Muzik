import {describe, expect, it} from "vitest";
import {extractHtmlMetadata} from "../external-metadata-fetch.mjs";

describe("external metadata fetch", () => {
  it("extracts title, description, author and signal provenance from HTML", () => {
    const metadata = extractHtmlMetadata(`
      <html>
        <head>
          <title>Fallback Title</title>
          <meta property="og:title" content="Uşşak İlahi Allah Emrin Tutalım">
          <meta name="description" content="Zekai Dede notası">
          <meta name="author" content="Zekai Dede">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "MusicComposition",
              "name": "Allah Emrin Tutalım",
              "composer": {"@type": "Person", "name": "Zekai Dede"},
              "lyricist": {"@type": "Person", "name": "Yunus Emre"},
              "lyrics": {"@type": "CreativeWork", "text": "Allah emrin tutalım rahmetine batalım"}
            }
          </script>
        </head>
      </html>
    `);

    expect(metadata).toEqual(expect.objectContaining({
      title: "Uşşak İlahi Allah Emrin Tutalım",
      description: "Zekai Dede notası",
      author: "Zekai Dede",
      schemaName: "Allah Emrin Tutalım",
      schemaComposer: "Zekai Dede",
      schemaLyricist: "Yunus Emre",
      schemaLyrics: "Allah emrin tutalım rahmetine batalım",
      metadataSignals: expect.arrayContaining([
        "html:og-title",
        "html:description",
        "html:author",
        "schema:musiccomposition",
        "schema:name",
        "schema:composer",
        "schema:lyricist",
        "schema:lyrics",
      ]),
    }));
  });
});
